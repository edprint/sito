"""
render_checks.py — verifiche visive e ispezione del GLB della bottiglia.

Uso (dalla radice del repo):
  blender --background --python scripts/blender/render_checks.py -- --out DIR [--fast] [--glb PATH]

Importa public/bottiglia-edprint.glb (quindi verifica ciò che è stato
DAVVERO esportato, Draco incluso) e produce in DIR:
  front.png    render frontale ortografico (workbench, sfondo trasparente)
  overlay.png  front + curva del profilo di riferimento (verde) e bordi
               misurati (rossi): le deviazioni della silhouette si vedono
               subito; stampa anche deviazione media/max in px e mm
  radente.png  luce radente laterale: leggibilità delle scanalature   (no --fast)
  tilt35.png   bottiglia inclinata di 35° su un piano: origine alla base (no --fast)
  bocca.png    ravvicinato del labbro/anello della bocca              (no --fast)
Stampa inoltre l'ispezione del GLB: estensioni, mesh, triangoli, peso.
"""

import json
import math
import os
import struct
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_bottiglia as bb  # solo per i parametri (main() è protetto)

_REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

# camera frontale ortografica: scala e risoluzione (mappatura px <-> metri)
ORTHO_SCALE = 0.30
RES = 1000


def argomenti():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_renders")
    if "--out" in argv:
        out = os.path.abspath(argv[argv.index("--out") + 1])
    glb = os.path.join(_REPO, "public", "bottiglia-edprint.glb")
    if "--glb" in argv:
        glb = os.path.abspath(argv[argv.index("--glb") + 1])
    return out, glb, "--fast" in argv


def ispeziona_glb(percorso):
    with open(percorso, "rb") as f:
        data = f.read()
    magic, _ver, _length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF", "non è un GLB"
    clen, _ctype = struct.unpack_from("<I4s", data, 12)
    js = json.loads(data[20:20 + clen])
    info = dict(
        peso_kb=round(len(data) / 1024.0, 1),
        estensioni=js.get("extensionsUsed", []),
        mesh=[m.get("name") for m in js.get("meshes", [])],
        materiali=[m.get("name") for m in js.get("materials", [])],
        nodi=[n.get("name") for n in js.get("nodes", [])],
        camere=len(js.get("cameras", [])),
        immagini=len(js.get("images", [])),
    )
    print("GLB:" + repr(info))
    return info


def scena_vuota():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    return sc


def _mira(oggetto, punto):
    d = Vector(punto) - oggetto.location
    oggetto.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def _camera(loc, mira, lens=None, orto=None):
    cam = bpy.data.cameras.new("cam")
    if orto:
        cam.type = "ORTHO"
        cam.ortho_scale = orto
    if lens:
        cam.lens = lens
    ob = bpy.data.objects.new("cam", cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    _mira(ob, mira)
    bpy.context.scene.camera = ob
    return ob


def _sole(direzione, energia, angolo=2.0):
    lt = bpy.data.lights.new("sun", type="SUN")
    lt.energy = energia
    lt.angle = math.radians(angolo)
    ob = bpy.data.objects.new("sun", lt)
    bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = Vector(direzione).to_track_quat("-Z", "Y").to_euler()
    return ob


def _mondo(grigio):
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (grigio, grigio, grigio, 1)
    bpy.context.scene.world = w


def _render(percorso, w=RES, h=RES):
    sc = bpy.context.scene
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.filepath = percorso
    bpy.ops.render.render(write_still=True)


def _cycles(samples=48):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.film_transparent = False


def _workbench_flat():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.render.film_transparent = True
    sh = sc.display.shading
    sh.light = "FLAT"
    sh.color_type = "SINGLE"
    sh.single_color = (1.0, 0.42, 0.25)


def _leggi_png(percorso):
    img = bpy.data.images.load(percorso)
    w, h = img.size
    arr = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(arr)
    bpy.data.images.remove(img)
    return arr.reshape(h, w, 4)  # riga 0 = bordo BASSO dell'immagine


def _scrivi_png(percorso, arr):
    h, w = arr.shape[:2]
    img = bpy.data.images.new("out", width=w, height=h, alpha=True)
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.filepath_raw = percorso
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def _px_x(x_m):
    return (x_m / ORTHO_SCALE + 0.5) * RES
def _px_v(z_m):
    return ((z_m - bb.ALTEZZA / 2) / ORTHO_SCALE + 0.5) * RES


def overlay_profilo(front_png, out_png):
    """Sovrappone al render frontale la curva del profilo di riferimento
    (verde) e i bordi misurati della silhouette (rosso); stampa le deviazioni."""
    rgba = _leggi_png(front_png)
    h, w = rgba.shape[:2]
    alpha = rgba[..., 3]

    # composito su bianco
    out = np.ones_like(rgba)
    a = alpha[..., None]
    out[..., :3] = rgba[..., :3] * a + 1.0 * (1 - a)
    out[..., 3] = 1.0

    # curva di riferimento (spline del PROFILO, entrambi i lati) in verde
    denso = bb.profilo_denso(bb.PROFILO, per_segmento=400)
    rif_per_riga = {}
    for r, z in denso:
        v = _px_v(z * bb.ALTEZZA)
        vi = int(round(v))
        if 0 <= vi < h:
            rif_per_riga[vi] = max(rif_per_riga.get(vi, 0.0), r * bb.ALTEZZA)
        for segno in (-1, 1):
            u = int(round(_px_x(segno * r * bb.ALTEZZA)))
            if 0 <= u < w and 0 <= vi < h:
                out[vi, u, :] = (0.0, 0.65, 0.0, 1.0)
                if u + 1 < w:
                    out[vi, u + 1, :] = (0.0, 0.65, 0.0, 1.0)

    # bordi misurati della silhouette (rosso, una riga ogni 3) + deviazioni
    dev = []
    mask = alpha > 0.5
    for v in range(h):
        cols = np.flatnonzero(mask[v])
        if cols.size == 0:
            continue
        sx, dx = cols[0], cols[-1]
        if v % 3 == 0:
            out[v, sx, :] = (0.85, 0.0, 0.0, 1.0)
            out[v, dx, :] = (0.85, 0.0, 0.0, 1.0)
        if v in rif_per_riga:
            mezza_mis = ((dx - sx) / 2.0) / RES * ORTHO_SCALE
            dev.append(abs(mezza_mis - rif_per_riga[v]))
    _scrivi_png(out_png, out)

    if dev:
        dev = np.array(dev) * 1000.0  # mm
        mm_px = ORTHO_SCALE / RES * 1000.0
        print("DEVIAZIONE_SILHOUETTE: media %.2f mm, max %.2f mm (1 px = %.2f mm)"
              % (dev.mean(), dev.max(), mm_px))
    _misura_proporzioni(mask)


def _misura_proporzioni(mask):
    """Proporzioni della silhouette misurate dal render, da confrontare con
    quelle del logo: H/D, quota della pancia, collo, labbro, base."""
    righe = np.flatnonzero(mask.any(axis=1))
    if righe.size == 0:
        return
    fondo, cima = righe[0], righe[-1]          # riga 0 = bordo basso
    h_px = cima - fondo + 1
    larghezze = mask.sum(axis=1).astype(float)  # px pieni per riga

    def largh(z_lo, z_hi):
        a = fondo + int(z_lo * h_px)
        b = fondo + int(z_hi * h_px)
        return larghezze[a:b + 1]

    d_max = larghezze.max()
    # quota pancia: punto medio del plateau (righe entro lo 0.3% del massimo),
    # robusto quando il profilo è quasi piatto attorno al massimo
    plateau = np.flatnonzero(larghezze >= d_max * 0.997)
    z_pancia = (plateau.mean() - fondo) / h_px
    collo = largh(0.60, 0.90).min()
    labbro = largh(0.92, 1.00).max()
    base = largh(0.0, 0.01).max()
    print("PROPORZIONI: H/D=%.2f  pancia=%.0f%%h  collo/D=%.0f%%  "
          "labbro/collo=%.2f  base/D=%.0f%%"
          % (h_px / d_max, z_pancia * 100, collo / d_max * 100,
             labbro / collo, base / d_max * 100))


def main():
    out_dir, glb, veloce = argomenti()
    os.makedirs(out_dir, exist_ok=True)

    ispeziona_glb(glb)

    scena_vuota()
    bpy.ops.import_scene.gltf(filepath=glb)
    mesh_obj = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    mesh_obj.data.calc_loop_triangles()
    print("IMPORT: mesh=%r triangoli=%d dimensioni=%s"
          % (mesh_obj.data.name, len(mesh_obj.data.loop_triangles),
             [round(v, 4) for v in mesh_obj.dimensions]))

    H = bb.ALTEZZA

    # ---- 1) frontale ortografico + overlay --------------------------------
    _workbench_flat()
    cam = _camera((0, -1.0, H / 2), (0, 0, H / 2), orto=ORTHO_SCALE)
    front = os.path.join(out_dir, "front.png")
    _render(front)
    overlay_profilo(front, os.path.join(out_dir, "overlay.png"))

    if veloce:
        print("FATTO (fast):", out_dir)
        return

    # ---- 2) luce radente laterale ------------------------------------------
    _cycles(48)
    _mondo(0.03)
    sole = _sole((-1.0, -0.22, -0.16), 5.0, angolo=1.0)
    riemp = _sole((0.2, -1.0, -0.35), 0.25, angolo=8.0)
    cam.data.type = "PERSP"
    cam.data.lens = 60
    cam.location = (0.02, -0.62, 0.125)
    _mira(cam, (0, 0, 0.118))
    _render(os.path.join(out_dir, "radente.png"), w=850, h=1000)

    # ---- 3) inclinata di 35° su un piano -----------------------------------
    for o in (sole, riemp):
        bpy.data.objects.remove(o)
    _mondo(0.35)
    _sole((-0.5, -0.4, -1.0), 3.0, angolo=15.0)
    piano_mesh = bpy.data.meshes.new("piano")
    piano_mesh.from_pydata([(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [], [(0, 1, 2, 3)])
    piano = bpy.data.objects.new("piano", piano_mesh)
    bpy.context.scene.collection.objects.link(piano)
    mesh_obj.rotation_euler = (0, math.radians(35), 0)
    cam.location = (0.10, -0.60, 0.20)
    cam.data.lens = 50
    _mira(cam, (0.07, 0, 0.10))
    _render(os.path.join(out_dir, "tilt35.png"))
    mesh_obj.rotation_euler = (0, 0, 0)
    bpy.data.objects.remove(piano)

    # ---- 4) ravvicinato della bocca ----------------------------------------
    _mondo(0.25)
    _sole((-0.6, -0.5, -0.8), 3.5, angolo=5.0)
    cam.location = (0.085, -0.14, 0.315)
    cam.data.lens = 85
    _mira(cam, (0, 0, 0.243))
    _render(os.path.join(out_dir, "bocca.png"))

    print("FATTO:", out_dir)


if __name__ == "__main__":
    main()

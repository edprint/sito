# build_bottiglia.py
# Genera la bottiglia del logo edprint come asset GLB per il web (Three.js).
# Uso:  blender --background --python build_bottiglia.py
# Il profilo qui sotto e' MISURATO dal contorno del logo (raddrizzato di 10 gradi):
# NON modificarlo. Tutta la geometria e' costruita proceduralmente, vertice per
# vertice: nessun ricalco, nessuna interpretazione.

import bpy
import bmesh
import math
import numpy as np
import os

# ----------------------------- PARAMETRI -------------------------------------
HEIGHT       = 0.25          # altezza totale (m)
H_over_D     = 2.127         # MISURATO da extract_profile.py su public/assets/Bottiglia.png
R_MAX        = HEIGHT / (2 * H_over_D)   # raggio massimo risultante (~0.0676)

SEGMENTS     = 96            # segmenti radiali
RINGS        = 260           # anelli verticali (addensati nella zona scanalature)

ORANGE_HEX   = "#FF5B2E"     # arancio brand: --accent "arancio stampa" (styles.css)
ROUGHNESS    = 0.65          # superficie OPACA (matte)

# Grana leggera della superficie: normal map GENERATA (deterministica, senza
# cuciture) e applicata con poca intensita'. Esporta in glTF come normalTexture.
GRANA_RES    = 512           # lato in px della texture generata
GRANA_SEED   = 7             # seme del rumore (build riproducibile)
GRANA_FORZA  = 0.15          # intensita' della normal map (leggera, sottotraccia)
GRANA_PNG    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "grana_normale.png")

# Scanalature a onda: bordi superiori delle 4 bande, MISURATI dal PNG con
# extract_profile.py (fit  quota(θ) = zc + amp·sin(θ+fase)  sul fronte visibile)
GROOVES      = [(0.127, 0.073, 1.14),   # bordo giallo/grigio
                (0.281, 0.075, 5.82),   # bordo magenta/giallo
                (0.369, 0.044, 4.87),   # bordo ciano/magenta
                (0.394, 0.075, 2.92)]   # pelo superiore del ciano
GROOVE_WIDTH = 0.018         # semi-larghezza del solco, in frazione dell'altezza
GROOVE_DEPTH = 0.012         # profondita' del solco, in frazione di R_MAX

OUT_GLB      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "bottiglia-edprint.glb")
PREVIEW_PNG  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview_frontale.png")
RENDER_PREVIEW = True

# --------------------- PROFILO MISURATO DAL LOGO ------------------------------
# (z, r) normalizzati: z=0 base, z=1 sommita'; r in frazione di R_MAX.
# ESTRATTO AUTOMATICAMENTE da public/assets/Bottiglia.png con
# scripts/blender/extract_profile.py (contorno campionato riga per riga
# perpendicolarmente all'asse; inclinazione misurata nel PNG: 9.24 gradi).
# Il fondo e' arrotondato e la sommita' chiusa a calotta, come nel disegno.
PROFILE = [
    (0.000, 0.073),  # centro del fondo arrotondato
    (0.022, 0.605),
    (0.044, 0.736),
    (0.066, 0.788),
    (0.088, 0.830),
    (0.110, 0.867),
    (0.132, 0.900),
    (0.154, 0.929),
    (0.176, 0.952),
    (0.198, 0.971),
    (0.220, 0.985),
    (0.242, 0.995),
    (0.264, 0.999),
    (0.275, 1.000),  # pancia massima
    (0.286, 0.999),
    (0.308, 0.995),
    (0.330, 0.986),
    (0.352, 0.973),
    (0.374, 0.956),
    (0.396, 0.935),
    (0.418, 0.912),
    (0.440, 0.885),
    (0.462, 0.856),
    (0.484, 0.826),
    (0.506, 0.794),
    (0.528, 0.761),
    (0.550, 0.728),
    (0.572, 0.696),
    (0.594, 0.664),
    (0.616, 0.633),
    (0.638, 0.603),
    (0.660, 0.576),
    (0.682, 0.551),
    (0.704, 0.528),
    (0.726, 0.508),
    (0.748, 0.491),
    (0.770, 0.476),
    (0.792, 0.465),
    (0.814, 0.457),
    (0.836, 0.452),
    (0.841, 0.451),  # punto piu' stretto del collo
    (0.858, 0.483),
    (0.880, 0.503),
    (0.900, 0.518),
    (0.908, 0.523),
    (0.916, 0.529),
    (0.924, 0.535),
    (0.932, 0.542),
    (0.940, 0.547),
    (0.943, 0.547),  # massimo del collarino
    (0.948, 0.547),
    (0.956, 0.539),
    (0.964, 0.522),
    (0.972, 0.495),
    (0.980, 0.452),
    (0.988, 0.381),
    (0.996, 0.247),
    (1.000, 0.000),  # sommita' CHIUSA (apice)
]

# ------------------ INTERPOLAZIONE MONOTONA (no overshoot) --------------------
# Fritsch-Carlson: cubica che passa per i punti senza oscillazioni tra di essi.
def monotone_cubic(xs, ys):
    xs = np.asarray(xs, float); ys = np.asarray(ys, float)
    h = np.diff(xs); d = np.diff(ys) / h
    m = np.zeros(len(xs))
    m[1:-1] = np.where(np.sign(d[:-1]) * np.sign(d[1:]) > 0,
                       2.0 / (1.0 / np.where(d[:-1] == 0, 1e-12, d[:-1]) +
                              1.0 / np.where(d[1:] == 0, 1e-12, d[1:])), 0.0)
    m[0] = d[0]; m[-1] = d[-1]
    def f(x):
        x = np.clip(x, xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, x) - 1, 0, len(xs) - 2)
        t = (x - xs[i]) / h[i]
        h00 = (1 + 2 * t) * (1 - t) ** 2; h10 = t * (1 - t) ** 2
        h01 = t ** 2 * (3 - 2 * t);       h11 = t ** 2 * (t - 1)
        return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]
    return f

# ----------------------- DISTRIBUZIONE DEGLI ANELLI ---------------------------
# 65% degli anelli nella fascia delle scanalature (z 0.08-0.60), il resto fuori.
def ring_levels(n):
    n_dense = int(n * 0.65)
    n_low   = max(2, int(n * 0.06))
    n_high  = n - n_dense - n_low
    a = np.linspace(0.0, 0.08, n_low, endpoint=False)
    b = np.linspace(0.08, 0.60, n_dense, endpoint=False)
    c = np.linspace(0.60, 1.0, n_high)
    z = np.concatenate([a, b, c])
    z[-1] = 1.0
    return z

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)

# ------------------------------- GRANA ----------------------------------------
def genera_grana():
    """Normal map di grana leggera: rumore lisciato (blur con wrap: la texture
    e' senza cuciture), deterministica via GRANA_SEED. Salvata in GRANA_PNG e
    incorporata nel GLB dall'exporter come normalTexture."""
    n = GRANA_RES
    rng = np.random.default_rng(GRANA_SEED)
    h = rng.standard_normal((n, n)).astype(np.float32)
    for _ in range(3):
        h = (np.roll(h, 1, 0) + h + np.roll(h, -1, 0)) / 3.0
        h = (np.roll(h, 1, 1) + h + np.roll(h, -1, 1)) / 3.0
    h /= max(float(np.abs(h).max()), 1e-6)
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2.0
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2.0
    nrm = np.stack([-gx * 2.5, -gy * 2.5, np.ones_like(h)], axis=-1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    rgba = np.concatenate([nrm * 0.5 + 0.5, np.ones((n, n, 1), np.float32)], axis=-1)
    img = bpy.data.images.new("grana_normale", n, n, alpha=True)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = GRANA_PNG
    img.file_format = 'PNG'
    img.save()
    img.colorspace_settings.name = 'Non-Color'   # e' una normal map, non colore
    return img


# ------------------------------- COSTRUZIONE ----------------------------------
def build():
    # scena pulita
    bpy.ops.wm.read_factory_settings(use_empty=True)

    zs_ctrl = [p[0] for p in PROFILE]; rs_ctrl = [p[1] for p in PROFILE]
    radius_at = monotone_cubic(zs_ctrl, rs_ctrl)

    zlv = ring_levels(RINGS)
    verts = []
    apex_index = None

    for zi, zn in enumerate(zlv):
        r_base = float(radius_at(zn)) * R_MAX
        if zn >= 0.9999:                       # apice: un solo vertice
            apex_index = len(verts)
            verts.append((0.0, 0.0, HEIGHT))
            continue
        for s in range(SEGMENTS):
            th = 2 * math.pi * s / SEGMENTS
            r = r_base
            # scanalature: solco inciso, il centro del solco ondula con theta
            for (zc, amp, ph) in GROOVES:
                zc_th = zc + amp * math.sin(th + ph)
                dist = abs(zn - zc_th)
                if dist < GROOVE_WIDTH:
                    fall = 1.0 - smoothstep(0.0, GROOVE_WIDTH, np.array([dist]))[0]
                    r -= GROOVE_DEPTH * R_MAX * fall
            verts.append((r * math.cos(th), r * math.sin(th), zn * HEIGHT))

    n_rings_open = len(zlv) - 1                # anelli reali (senza l'apice)
    faces = []
    def vid(ring, seg): return ring * SEGMENTS + (seg % SEGMENTS)

    for ri in range(n_rings_open - 1):
        for s in range(SEGMENTS):
            faces.append((vid(ri, s), vid(ri, s + 1), vid(ri + 1, s + 1), vid(ri + 1, s)))
    # chiusura apice (sommita' chiusa: nessuna vista dell'interno)
    last = n_rings_open - 1
    for s in range(SEGMENTS):
        faces.append((vid(last, s), vid(last, s + 1), apex_index))
    # chiusura base
    base_center = len(verts); verts.append((0.0, 0.0, 0.0))
    for s in range(SEGMENTS):
        faces.append((vid(0, s + 1), vid(0, s), base_center))

    mesh = bpy.data.meshes.new("Bottiglia")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()

    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh); bm.free()

    for p in mesh.polygons: p.use_smooth = True

    # UV cilindriche (u = angolo/2π, v = quota): servono alla grana
    uv = mesh.uv_layers.new(name="UVMap")
    n_verts_anelli = n_rings_open * SEGMENTS
    for poly in mesh.polygons:
        us, vs_ = [], []
        for li in range(poly.loop_start, poly.loop_start + poly.loop_total):
            vi = mesh.loops[li].vertex_index
            if vi < n_verts_anelli:
                us.append((vi % SEGMENTS) / SEGMENTS)
                vs_.append(float(zlv[vi // SEGMENTS]))
            else:                                  # apice o centro base
                us.append(None)
                vs_.append(1.0 if vi == apex_index else 0.0)
        noti = [u for u in us if u is not None]
        if max(noti) - min(noti) > 0.5:            # facce sulla cucitura u=0/1
            us = [None if u is None else (u + 1.0 if u < 0.5 else u) for u in us]
            noti = [u for u in us if u is not None]
        media = sum(noti) / len(noti)
        for k, li in enumerate(range(poly.loop_start, poly.loop_start + poly.loop_total)):
            uv.data[li].uv = (us[k] if us[k] is not None else media, vs_[k])

    obj = bpy.data.objects.new("Bottiglia", mesh)
    bpy.context.scene.collection.objects.link(obj)

    # materiale: arancio brand OPACO, colore pieno + leggera grana (normal map)
    def _lin(c8):                                  # sRGB 0-255 -> lineare
        c = c8 / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    hx = ORANGE_HEX.lstrip('#')
    col = tuple(_lin(int(hx[i:i + 2], 16)) for i in (0, 2, 4)) + (1.0,)
    mat = bpy.data.materials.new("Arancio"); mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = ROUGHNESS
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = genera_grana()
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = GRANA_FORZA
    nt.links.new(tex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    obj.data.materials.append(mat)
    return obj

def render_preview(obj):
    scn = bpy.context.scene
    cam_data = bpy.data.cameras.new("cam"); cam_data.type = 'ORTHO'
    cam_data.ortho_scale = HEIGHT * 1.25
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (0, -1.0, HEIGHT / 2); cam.rotation_euler = (math.pi / 2, 0, 0)
    scn.collection.objects.link(cam); scn.camera = cam
    sun_d = bpy.data.lights.new("sun", 'SUN'); sun_d.energy = 3.0
    sun = bpy.data.objects.new("sun", sun_d)
    sun.rotation_euler = (math.radians(60), 0, math.radians(30))
    scn.collection.objects.link(sun)
    # Blender 5.x: EEVEE Next ha ripreso l'id storico 'BLENDER_EEVEE';
    # 'BLENDER_EEVEE_NEXT' esisteva solo nelle 4.x
    try:
        scn.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        scn.render.engine = 'BLENDER_EEVEE'
    scn.render.resolution_x = 700; scn.render.resolution_y = 1100
    scn.render.filepath = PREVIEW_PNG
    try:
        bpy.ops.render.render(write_still=True)
        print("PREVIEW:", PREVIEW_PNG)
    except Exception as e:
        print("Preview non riuscita (non bloccante):", e)
    # rimuovi camera e luce: NON devono finire nel GLB
    bpy.data.objects.remove(cam, do_unlink=True)
    bpy.data.objects.remove(sun, do_unlink=True)

def export_glb(obj):
    out = os.path.abspath(OUT_GLB)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    kwargs = dict(filepath=out, export_format='GLB', use_selection=True)
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_draco_mesh_compression_enable=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)   # fallback senza Draco
    print("EXPORT:", out)

if __name__ == "__main__":
    obj = build()
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    print(f"TRIANGOLI: {tris}  (target 30-60k)")
    if RENDER_PREVIEW:
        render_preview(obj)
    export_glb(obj)

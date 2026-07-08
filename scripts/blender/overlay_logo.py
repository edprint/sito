"""
overlay_logo.py — confronto quantitativo GLB ↔ logo (public/assets/Bottiglia.png).

Uso:  blender --background --python scripts/blender/overlay_logo.py -- [--out DIR]

Produce in DIR (default: scratch accanto allo script):
  overlay_raddrizzata.png   silhouette del logo (grigio, raddrizzata) con sopra
                            il contorno del render del GLB (rosso): le deviazioni
                            si vedono subito, alla stessa scala
  confronto_affiancato.png  PNG originale (inclinato) | render del GLB inclinato
                            dello stesso angolo misurato
Stampa la deviazione per riga |r_render − r_logo|: media/max in % del diametro
e in mm (bottiglia alta 0.25 m).
"""

import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_profile as ep

_REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
GLB = os.path.join(_REPO, "public", "bottiglia-edprint.glb")
HEIGHT = 0.25


def argomenti():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_renders")
    if "--out" in argv:
        out = os.path.abspath(argv[argv.index("--out") + 1])
    os.makedirs(out, exist_ok=True)
    return out


def render_glb(percorso_png, tilt_rad=0.0, shading="SINGLE", res=(1000, 2000), scala=0.28):
    """Render ortografico frontale del GLB (sfondo trasparente). Ritorna l'array."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.film_transparent = True
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    if shading == "SINGLE":
        sh.light = "FLAT"
        sh.color_type = "SINGLE"
        sh.single_color = (1.0, 0.42, 0.25)
    else:
        sh.light = "STUDIO"
        sh.color_type = "MATERIAL"

    bpy.ops.import_scene.gltf(filepath=GLB)
    obj = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    obj.rotation_euler = (0.0, tilt_rad, 0.0)

    cam_d = bpy.data.cameras.new("cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = scala
    cam = bpy.data.objects.new("cam", cam_d)
    cam.location = (HEIGHT * math.sin(tilt_rad) / 2, -1.0, HEIGHT / 2)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam

    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = percorso_png
    bpy.ops.render.render(write_still=True)
    return ep.carica_immagine(percorso_png)


def mezze_larghezze(mask):
    righe = np.flatnonzero(mask.any(axis=1))
    r0, r1 = righe[0], righe[-1]
    mezza, zs = [], []
    for y in righe:
        c = np.flatnonzero(mask[y])
        mezza.append((c[-1] - c[0]) / 2.0)
        zs.append((y - r0) / float(r1 - r0))
    return np.array(zs), np.array(mezza)


def _salva(percorso, canvas):
    h, w = canvas.shape[:2]
    img = bpy.data.images.new("out", width=w, height=h, alpha=True)
    img.pixels.foreach_set(canvas.astype(np.float32).ravel())
    img.filepath_raw = percorso
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def _ridimensiona(arr, nh, nw):
    h, w = arr.shape[:2]
    yi = (np.arange(nh) * h / nh).astype(int)
    xi = (np.arange(nw) * w / nw).astype(int)
    return arr[yi][:, xi]


def main():
    out = argomenti()

    # misura del logo (stesse funzioni dell'estrattore: nessuna doppia verita')
    px, mask_logo, tilt, centro, prof = ep.misura()

    # ---- metriche nel sistema raddrizzato --------------------------------
    rgba = render_glb(os.path.join(out, "_front_glb.png"))
    mask_r = rgba[..., 3] > 0.5
    z_r, mz_r = mezze_larghezze(mask_r)
    rr_n = mz_r / mz_r.max()

    zg = np.linspace(0.003, 0.997, 700)
    rl = np.interp(zg, prof["z"], prof["r"])
    rr = np.interp(zg, z_r, rr_n)
    diff_D = np.abs(rr - rl) / 2.0                      # frazione del diametro
    mm = diff_D * (HEIGHT / (prof["H_px"] / prof["D_px"])) * 1000.0
    hd_render = (z_r.size - 1) / (2.0 * mz_r.max()) * (mask_r.shape[0] / mask_r.shape[0])
    righe_r = np.flatnonzero(mask_r.any(axis=1))
    hd_render = (righe_r[-1] - righe_r[0]) / (2.0 * mz_r.max())
    print("H_OVER_D: logo=%.3f  render=%.3f" % (prof["H_px"] / prof["D_px"], hd_render))
    print("DEVIAZIONE: media %.2f%%D (%.2f mm)  max %.2f%%D (%.2f mm)"
          % (diff_D.mean() * 100, mm.mean(), diff_D.max() * 100, mm.max()))

    # ---- overlay raddrizzato: logo grigio + contorno render rosso --------
    W, H = 900, 1800
    Rpx = 380.0
    canvas = np.ones((H, W, 4), dtype=np.float32)
    mid = W // 2
    for y in range(H):
        z = y / (H - 1.0)
        a = int(mid - np.interp(z, zg, rl) * Rpx)
        b = int(mid + np.interp(z, zg, rl) * Rpx)
        canvas[y, a:b + 1, :3] = 0.84
        for segno in (-1, 1):
            u = int(round(mid + segno * np.interp(z, zg, rr) * Rpx))
            canvas[y, max(u - 1, 0):min(u + 1, W - 1), :3] = (0.80, 0.05, 0.05)
    _salva(os.path.join(out, "overlay_raddrizzata.png"), canvas)

    # ---- affiancato: PNG originale | render inclinato come il logo -------
    ds = _ridimensiona(px, 1500, 1500)
    sinistra = np.ones((1500, 1500, 4), dtype=np.float32)
    a = ds[..., 3:4]
    sinistra[..., :3] = ds[..., :3] * a + 1.0 * (1 - a)

    shaded = render_glb(os.path.join(out, "_tilt_glb.png"), tilt_rad=tilt,
                        shading="STUDIO", res=(1500, 1500), scala=0.40)
    mr = shaded[..., 3] > 0.5
    ys, xs = np.nonzero(mr)
    ritaglio = shaded[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    # scala il render alla stessa altezza-bottiglia del pannello sinistro
    m_ds = _ridimensiona(mask_logo.astype(np.float32), 1500, 1500) > 0.5
    yl, xl = np.nonzero(m_ds)
    f = (yl.max() - yl.min()) / float(ritaglio.shape[0])
    rit = _ridimensiona(ritaglio, max(int(ritaglio.shape[0] * f), 2),
                        max(int(ritaglio.shape[1] * f), 2))
    destra = np.ones((1500, 1500, 4), dtype=np.float32)
    y0 = int(yl.min())
    x0 = int((xl.min() + xl.max()) / 2 - rit.shape[1] / 2)
    y1 = min(y0 + rit.shape[0], 1500)
    x1 = min(x0 + rit.shape[1], 1500)
    pezzo = rit[:y1 - y0, :x1 - x0]
    al = pezzo[..., 3:4]
    destra[y0:y1, x0:x1, :3] = pezzo[..., :3] * al + destra[y0:y1, x0:x1, :3] * (1 - al)

    div = np.zeros((1500, 20, 4), dtype=np.float32)
    div[..., 3] = 1.0
    _salva(os.path.join(out, "confronto_affiancato.png"),
           np.concatenate([sinistra, div, destra], axis=1))

    print("FATTO:", out)


if __name__ == "__main__":
    main()

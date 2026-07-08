"""
extract_profile.py — misura il contorno della bottiglia da public/assets/Bottiglia.png.

Uso:  blender --background --python scripts/blender/extract_profile.py

Procedura (nessuna interpretazione a occhio):
  1. maschera della bottiglia (alpha, oppure "inchiostro" = non-bianco);
  2. stima dell'asse: retta ai minimi quadrati sui punti medi delle righe
     (la bottiglia nel PNG è inclinata: l'angolo viene MISURATO, non assunto);
  3. raddrizzamento del solo point-cloud (l'immagine non viene toccata);
  4. mezza-larghezza per riga perpendicolare all'asse → tabella (z, r/r_max);
  5. fit sinusoidale dei bordi superiori delle 4 bande (ciano, magenta,
     giallo, grigio) nel modello dei solchi di build_bottiglia.py:
     quota(θ) = zc + amp·sin(θ + fase).

Stampa la tabella PROFILE, H_over_D e GROOVES pronti da incollare in
build_bottiglia.py. Le funzioni sono importabili (overlay_logo.py le riusa).
"""

import math
import os

import bpy
import numpy as np

_REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
IMG = os.path.join(_REPO, "public", "assets", "Bottiglia.png")


def carica_immagine(percorso=IMG):
    """Ritorna l'immagine come array (h, w, 4) float32; riga 0 = bordo BASSO."""
    img = bpy.data.images.load(percorso)
    w, h = img.size
    arr = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(arr)
    bpy.data.images.remove(img)
    return arr.reshape(h, w, 4)


def maschera_bottiglia(px):
    """True dove c'è bottiglia: alpha se presente, altrimenti non-bianco."""
    alpha = px[..., 3]
    if alpha.min() < 0.5:
        return alpha > 0.5
    return (px[..., :3] < 0.94).any(axis=-1)


def stima_asse(mask):
    """Inclinazione dell'asse (rad, positiva = cima verso destra) e centro."""
    righe = np.flatnonzero(mask.any(axis=1))
    r0, r1 = righe[0], righe[-1]
    span = r1 - r0
    sel = righe[(righe > r0 + 0.10 * span) & (righe < r0 + 0.88 * span)]
    mids = np.array([
        (np.flatnonzero(mask[y])[[0, -1]].mean(), y) for y in sel
    ])
    a, _b = np.polyfit(mids[:, 1], mids[:, 0], 1)   # x = a*y + b
    return math.atan(a), (float(mids[:, 0].mean()), float(mids[:, 1].mean()))


def raddrizza_punti(ys, xs, tilt, centro):
    """Ruota il point-cloud di +tilt attorno al centro: l'asse diventa verticale."""
    cx, cy = centro
    c, s = math.cos(tilt), math.sin(tilt)
    x = xs - cx
    y = ys - cy
    return (x * s + y * c + cy), (x * c - y * s + cx)   # (y_raddrizzato, x_raddrizzato)


def _liscia(v, k=5):
    ker = np.ones(k) / k
    return np.convolve(np.pad(v, k // 2, mode="edge"), ker, mode="valid")


def profilo_misurato(mask, tilt, centro):
    """Mezza-larghezza per riga nel sistema raddrizzato.
    Ritorna dict con z (0..1), r (frazione di r_max), H_px, D_px, mid_px, y0."""
    ys, xs = np.nonzero(mask)
    yr, xr = raddrizza_punti(ys.astype(float), xs.astype(float), tilt, centro)
    yb = np.round(yr).astype(int)
    y0, y1 = yb.min(), yb.max()
    n = y1 - y0 + 1
    sx = np.full(n, np.inf)
    dx = np.full(n, -np.inf)
    np.minimum.at(sx, yb - y0, xr)
    np.maximum.at(dx, yb - y0, xr)
    mezza = _liscia((dx - sx) / 2.0)
    mid = _liscia((dx + sx) / 2.0)
    r_max = float(mezza.max())
    return dict(
        z=np.arange(n) / (n - 1.0),
        r=mezza / r_max,
        mid=mid,
        H_px=float(n - 1),
        D_px=2.0 * r_max,
        y0=int(y0),
    )


def tabella_profilo(prof, passo=0.022, passo_alto=0.008):
    """Campiona (z, r) per la tabella PROFILE: passo fitto sopra z=0.90 e
    punti forzati sugli estremi locali (pancia, gola, collarino)."""
    z, r = prof["z"], prof["r"]
    st = list(np.arange(0.0, 0.90, passo)) + list(np.arange(0.90, 0.999, passo_alto))
    # estremi locali misurati
    st.append(z[int(np.argmax(r))])                                  # pancia massima
    alto = (z > 0.55) & (z < 0.92)
    st.append(z[np.flatnonzero(alto)[np.argmin(r[alto])]])           # gola del collo
    cima = z > 0.90
    st.append(z[np.flatnonzero(cima)[np.argmax(r[cima])]])           # massimo collarino
    st = sorted(set(round(s, 3) for s in st))
    tab = [(s, round(float(np.interp(s, z, r)), 3)) for s in st]
    tab.append((1.0, 0.0))                                           # apice chiuso
    return tab


def _erodi(m, n=3):
    """Erosione 4-connessa: elimina gli aloni antialias sottili (es. il grigio
    di transizione lungo il tratto nero, che inquinerebbe la banda grigia)."""
    for _ in range(n):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    return m


def _maschere_colori(px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    sat = px[..., :3].max(-1) - px[..., :3].min(-1)
    return {
        "ciano":   (b > 0.55) & (r < 0.35) & (g > 0.30),
        "magenta": (r > 0.55) & (g < 0.35) & (b > 0.20) & (b < 0.75),
        "giallo":  (r > 0.65) & (g > 0.55) & (b < 0.35),
        "grigio":  (sat < 0.12) & (r > 0.15) & (r < 0.62),
    }


def onde_misurate(px, prof, tilt, centro):
    """Fit del bordo SUPERIORE di ogni banda nel modello dei solchi:
    quota(θ) = zc + amp·sin(θ + fase), θ = angolo mesh (fronte: x = r·cosθ, y<0).
    LSQ lineare su  quota = zc + A·sin(θ) + B·cos(θ)."""
    out = []
    for nome, m in _maschere_colori(px).items():
        ys, xs = np.nonzero(_erodi(m))
        if ys.size < 500:
            continue
        yr, xr = raddrizza_punti(ys.astype(float), xs.astype(float), tilt, centro)
        cb = np.round(xr).astype(int)
        c0, c1 = cb.min(), cb.max()
        top = np.full(c1 - c0 + 1, -np.inf)
        np.maximum.at(top, cb - c0, yr)
        cols = np.flatnonzero(np.isfinite(top))
        z_b = (top[cols] - prof["y0"]) / prof["H_px"]                # quota del bordo
        x_px = cols + c0
        mid_b = np.interp(z_b, prof["z"], prof["mid"])
        r_loc = np.interp(z_b, prof["z"], prof["r"]) * prof["D_px"] / 2.0
        xn = (x_px - mid_b) / np.maximum(r_loc, 1e-6)
        ok = np.abs(xn) < 0.90                                       # via i bordi al vetro
        if ok.sum() < 60:
            continue
        xn, z_b = xn[ok], z_b[ok]
        # fronte visibile: θ = 2π − arccos(xn)  →  sinθ = −√(1−xn²), cosθ = xn.
        # Base CENTRATA (−√(1−x²) è quasi costante su |x|<0.9 e collineare con
        # l'intercetta: senza centratura zc e amp divergono) e ampiezza limitata:
        # il retro non è osservabile, si sceglie la rappresentazione minima.
        s = -np.sqrt(1 - xn ** 2)
        sm, xm = float(s.mean()), float(xn.mean())
        Amat = np.column_stack([np.ones_like(xn), s - sm, xn - xm])
        (c0, A, B), *_ = np.linalg.lstsq(Amat, z_b, rcond=None)
        amp = math.hypot(A, B)
        if amp > 0.075:
            A, B = A * 0.075 / amp, B * 0.075 / amp
            amp = 0.075
        zc = float(c0 - A * sm - B * xm)
        out.append((nome, round(zc, 3), round(float(amp), 3),
                    round(float(math.atan2(B, A)) % (2 * math.pi), 2)))
    return sorted(out, key=lambda t: t[1])


def misura(percorso=IMG):
    px = carica_immagine(percorso)
    mask = maschera_bottiglia(px)
    tilt, centro = stima_asse(mask)
    prof = profilo_misurato(mask, tilt, centro)
    return px, mask, tilt, centro, prof


if __name__ == "__main__":
    px, mask, tilt, centro, prof = misura()
    hd = prof["H_px"] / prof["D_px"]
    print("TILT_GRADI: %.2f" % math.degrees(tilt))
    print("H_OVER_D: %.3f" % hd)
    print("PROFILE = [")
    for z, r in tabella_profilo(prof):
        print("    (%.3f, %.3f)," % (z, r))
    print("]")
    print("# GROOVES misurate (nome, zc, amp, fase):")
    for nome, zc, amp, fase in onde_misurate(px, prof, tilt, centro):
        print("    (%.3f, %.3f, %.2f),   # %s" % (zc, amp, fase, nome))

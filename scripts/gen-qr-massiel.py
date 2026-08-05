#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Genera el QR con la URL de atribución de Massiel + logo SynapTech al centro.
Salida:
  - massiel-qr.png              (512x512, para tarjetas/impresión)
  - massiel-qr-lockscreen.png   (1170x2532, fondo oscuro con texto, wallpaper iPhone)

Uso:
  python scripts/gen-qr-massiel.py
"""
import os
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://crea.synaptechspa.cl/?ref=massiel'
LOGO_PATH = os.path.join(ROOT, 'synaptech', 'ig.png')

# ── 1. QR 512x512 con logo al centro ─────────────────────────────
qr = qrcode.QRCode(
    version=None,
    error_correction=ERROR_CORRECT_H,  # ~30% redundancia → aguanta el logo
    box_size=20,
    border=2,
)
qr.add_data(URL)
qr.make(fit=True)

qr_img = qr.make_image(fill_color=(6, 6, 11), back_color='white').convert('RGB')

# Escalar a 1024 primero para calidad del downscale luego
qr_img = qr_img.resize((1024, 1024), Image.LANCZOS)

logo = Image.open(LOGO_PATH).convert('RGBA')
# Logo ~22% del ancho del QR (deja margen seguro con correction H)
logo_size = int(1024 * 0.22)
logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

# Fondo blanco redondeado detrás del logo para que "respire" contra el patrón QR
pad = 24
badge_size = logo_size + pad * 2
badge = Image.new('RGBA', (badge_size, badge_size), (0, 0, 0, 0))
mask = Image.new('L', (badge_size, badge_size), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    [(0, 0), (badge_size, badge_size)], radius=32, fill=255
)
bg = Image.new('RGBA', (badge_size, badge_size), (255, 255, 255, 255))
badge.paste(bg, (0, 0), mask)
badge.paste(logo, (pad, pad), logo)

# Pegar badge al centro
bx = (1024 - badge_size) // 2
by = (1024 - badge_size) // 2
qr_img.paste(badge, (bx, by), badge)

# Downscale final a 512
final = qr_img.resize((512, 512), Image.LANCZOS)
final.save(os.path.join(ROOT, 'massiel-qr.png'), 'PNG', optimize=True)
print('OK massiel-qr.png (512x512)')

# ── 2. Versión lockscreen iPhone (1170x2532) ─────────────────────
W, H = 1170, 2532
lock = Image.new('RGB', (W, H), (6, 6, 11))
draw = ImageDraw.Draw(lock)

# Blob de color arriba (púrpura SynapTech + verde acento) — simplificado
for r in range(400, 0, -20):
    alpha = int(60 * (r / 400))
    color = (139, 124, 246, alpha)
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).ellipse(
        [W // 2 - r, 400 - r, W // 2 + r, 400 + r], fill=color
    )
    lock = Image.alpha_composite(lock.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(lock)

# QR grande al medio
qr_big = final.resize((900, 900), Image.LANCZOS)
lock.paste(qr_big, ((W - 900) // 2, (H - 900) // 2 - 100))

# Texto: intentar cargar una tipografía; fallback a default
def cargar_fuente(size):
    for name in ('C:\\Windows\\Fonts\\segoeuib.ttf',
                 'C:\\Windows\\Fonts\\arialbd.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

f_titulo   = cargar_fuente(78)
f_subtit   = cargar_fuente(44)
f_footer   = cargar_fuente(38)

titulo = 'Escanea con la cámara'
sub    = 'Tu agenda lista en 2 minutos'
footer = 'crea.synaptechspa.cl'
me     = '— Massiel'

y = (H // 2) + 400
for texto, fuente, color in [
    (titulo, f_titulo, (244, 243, 249)),
    (sub,    f_subtit, (162, 159, 181)),
]:
    bbox = draw.textbbox((0, 0), texto, font=fuente)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) // 2, y), texto, font=fuente, fill=color)
    y += (bbox[3] - bbox[1]) + 24

y = H - 340
for texto, fuente, color in [
    (footer, f_footer, (198, 249, 78)),
    (me,     f_footer, (162, 159, 181)),
]:
    bbox = draw.textbbox((0, 0), texto, font=fuente)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) // 2, y), texto, font=fuente, fill=color)
    y += (bbox[3] - bbox[1]) + 20

lock.save(os.path.join(ROOT, 'massiel-qr-lockscreen.png'), 'PNG', optimize=True)
print('OK massiel-qr-lockscreen.png (1170x2532)')

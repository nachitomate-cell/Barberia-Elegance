# Guía de Uso de la App (PDF para barberías)

Genera el manual en PDF que se entrega a cada barbería, con todo lo que incluye
la aplicación: la **Agenda**, el **Panel de Gestión Interna**, el **Club de
Fidelidad** y una guía de **cómo instalar la app en los clientes**. El documento
incluye espacios reservados (placeholders) para pegar capturas de pantalla de
referencia de cada barbería.

## Archivos
- `contenido_guia.py` — todo el texto del manual, organizado por secciones.
- `generar_guia_pdf.py` — arma el PDF con el diseño de marca.

## Requisitos
```bash
pip install fpdf2 pillow
```

## Cómo generarlo
```bash
python3 generar_guia_pdf.py
```
Genera **dos versiones**:
- `Guia-App-Barberia.pdf` (raíz del repo) — **con placeholders**. Es el máster que
  descarga el dueño para personalizar la guía de cada local con sus propias capturas.
- `gestion-interna/guia-app.pdf` — **sin placeholders**. Es la versión limpia que se
  ve desde el panel (botón "Guía de la App"), igual para todos los locales.

## Personalizar por barbería
- La portada usa un ornamento dorado neutral (sin logo), para que sirva a cualquier local.
- Edita textos y precios de ejemplo en `contenido_guia.py`.

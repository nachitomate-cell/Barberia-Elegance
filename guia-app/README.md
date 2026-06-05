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
El resultado se guarda en la raíz del repo como `Guia-App-Barberia.pdf`.

## Personalizar por barbería
- El logo de la portada se toma de `../logo.jpg`. Reemplázalo por el de cada local.
- Edita textos y precios de ejemplo en `contenido_guia.py`.

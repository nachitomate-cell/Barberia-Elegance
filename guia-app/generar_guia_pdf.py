# -*- coding: utf-8 -*-
"""
Generador de la Guia de Uso de la App (manual por barberia).
Produce un PDF profesional con: Agenda, Panel de Gestion Interna,
Club de Fidelidad e Instalacion de la app para clientes.
Incluye placeholders para imagenes de referencia.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fpdf import FPDF

# ---------------------------------------------------------------------------
# Paleta de marca
# ---------------------------------------------------------------------------
GOLD      = (197, 161, 74)    # dorado elegante
GOLD_SOFT = (224, 200, 140)
INK       = (26, 26, 26)      # casi negro
GRAY      = (90, 90, 90)
LIGHT     = (245, 243, 238)   # fondo suave
LINE      = (210, 205, 195)
WHITE     = (255, 255, 255)
PLACEHOLDER_BG = (248, 246, 240)

FONT = "DejaVu"
SERIF = "Gloock"

# Numeracion de secciones para la portada / indice
SECTIONS = []  # se llena al construir


class Guide(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(18, 20, 18)
        # Fuentes Unicode
        self.add_font(FONT, "",  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        self.add_font(FONT, "B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        self.add_font(SERIF, "", "/mnt/skills/examples/canvas-design/canvas-fonts/Gloock-Regular.ttf")
        self.current_section = ""
        self.special_pages = set()   # paginas sin cabecera/pie (portada y divisores)

    def _visible_page(self):
        before = len([p for p in self.special_pages if p <= self.page_no()])
        return self.page_no() - before

    # ----- cabecera / pie -------------------------------------------------
    def header(self):
        if self.page_no() in self.special_pages:
            return
        self.set_font(FONT, "", 7.5)
        self.set_text_color(*GRAY)
        self.set_y(10)
        self.cell(0, 5, "Guia de Uso de la App  ·  Barberia", align="L")
        self.set_text_color(*GOLD)
        self.cell(0, 5, self.current_section.upper(), align="R")
        self.set_draw_color(*GOLD)
        self.set_line_width(0.4)
        self.line(18, 17, 192, 17)
        self.set_y(24)

    def footer(self):
        if self.page_no() in self.special_pages:
            return
        self.set_y(-14)
        self.set_draw_color(*LINE)
        self.set_line_width(0.2)
        self.line(18, self.get_y(), 192, self.get_y())
        self.set_y(-12)
        self.set_font(FONT, "", 7.5)
        self.set_text_color(*GRAY)
        self.cell(0, 5, "SynapTech  ·  Manual de la aplicacion", align="L")
        self.cell(0, 5, f"Pagina {self._visible_page()}", align="R")

    # ----- bloques de contenido ------------------------------------------
    def ensure(self, h):
        if self.get_y() + h > self.h - self.b_margin:
            self.add_page()

    def section_divider(self, number, title, subtitle):
        """Pagina divisoria de seccion a pantalla completa."""
        self.add_page()
        self.special_pages.add(self.page_no())
        self.set_fill_color(*INK)
        self.rect(0, 0, 210, 297, "F")
        # banda dorada
        self.set_fill_color(*GOLD)
        self.rect(0, 110, 210, 0.8, "F")
        self.rect(0, 150, 210, 0.8, "F")
        # numero
        self.set_y(118)
        self.set_font(SERIF, "", 13)
        self.set_text_color(*GOLD)
        self.cell(0, 8, f"SECCION {number}", align="C")
        # titulo
        self.set_y(126)
        self.set_font(SERIF, "", 30)
        self.set_text_color(*WHITE)
        self.multi_cell(0, 13, title, align="C")
        # subtitulo
        self.set_y(157)
        self.set_font(FONT, "", 11)
        self.set_text_color(*GOLD_SOFT)
        self.multi_cell(0, 6, subtitle, align="C")

    def h2(self, text):
        self.ensure(20)
        self.ln(3)
        self.set_font(SERIF, "", 17)
        self.set_text_color(*INK)
        self.multi_cell(0, 9, text)
        y = self.get_y() + 1
        self.set_draw_color(*GOLD)
        self.set_line_width(0.6)
        self.line(18, y, 40, y)
        self.ln(4)

    def h3(self, text):
        self.ensure(14)
        self.ln(1.5)
        self.set_font(FONT, "B", 11.5)
        self.set_text_color(*GOLD if False else INK)
        # marca dorada a la izquierda
        x0 = self.get_x()
        y0 = self.get_y()
        self.set_fill_color(*GOLD)
        self.rect(x0, y0 + 1, 1.6, 4.6, "F")
        self.set_x(x0 + 4)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6.5, text)
        self.ln(1.5)

    def para(self, text):
        self.ensure(8)
        self.set_font(FONT, "", 10)
        self.set_text_color(55, 55, 55)
        self.multi_cell(0, 5.4, text)
        self.ln(1.5)

    def bullets(self, items):
        self.set_font(FONT, "", 10)
        for it in items:
            self.ensure(7)
            self.set_text_color(*GOLD)
            self.set_font(FONT, "B", 10)
            x = self.get_x()
            self.cell(5, 5.2, "•")
            self.set_font(FONT, "", 10)
            self.set_text_color(55, 55, 55)
            # soporte para "negrita: resto"
            self.set_x(x + 5)
            if "::" in it:
                head, rest = it.split("::", 1)
                self.set_font(FONT, "B", 10)
                self.set_text_color(35, 35, 35)
                hw = self.get_string_width(head + " ")
                self.cell(hw, 5.2, head)
                self.set_font(FONT, "", 10)
                self.set_text_color(55, 55, 55)
                self.multi_cell(0, 5.2, rest.strip())
            else:
                self.multi_cell(0, 5.2, it)
            self.ln(0.6)
        self.ln(1.5)

    def steps(self, items):
        self.set_font(FONT, "", 10)
        for i, it in enumerate(items, 1):
            self.ensure(8)
            y0 = self.get_y()
            x0 = self.get_x()
            self.set_fill_color(*GOLD)
            self.set_text_color(*WHITE)
            self.set_font(FONT, "B", 9)
            self.ellipse(x0, y0 + 0.3, 5.6, 5.6, "F")
            self.set_xy(x0, y0 + 0.8)
            self.cell(5.6, 4.6, str(i), align="C")
            self.set_xy(x0 + 8.5, y0)
            self.set_font(FONT, "", 10)
            self.set_text_color(55, 55, 55)
            self.multi_cell(0, 5.4, it)
            self.ln(1.4)
        self.ln(1.2)

    def callout(self, title, text):
        self.ensure(20)
        self.set_font(FONT, "", 9.5)
        # medir alto aprox
        x0, y0 = 18, self.get_y()
        w = 174
        self.set_xy(x0 + 6, y0 + 4)
        self.set_fill_color(*LIGHT)
        # calcular alto haciendo un dry-run con split_only
        self.set_font(FONT, "", 9.5)
        lines = self.multi_cell(w - 12, 5, text, dry_run=True, output="LINES")
        h = 11 + len(lines) * 5
        self.set_fill_color(252, 249, 242)
        self.set_draw_color(*GOLD)
        self.set_line_width(0.3)
        self.rect(x0, y0, w, h, "DF")
        self.set_fill_color(*GOLD)
        self.rect(x0, y0, 1.8, h, "F")
        self.set_xy(x0 + 6, y0 + 3.5)
        self.set_font(FONT, "B", 9.5)
        self.set_text_color(*GOLD)
        self.cell(0, 5, title)
        self.set_xy(x0 + 6, y0 + 9)
        self.set_font(FONT, "", 9.5)
        self.set_text_color(70, 70, 70)
        self.multi_cell(w - 12, 5, text)
        self.set_y(y0 + h + 4)

    def placeholder(self, caption, height=58):
        self.ensure(height + 6)
        x0, y0 = 18, self.get_y()
        w = 174
        self.set_fill_color(*PLACEHOLDER_BG)
        self.set_draw_color(*GOLD)
        self.set_line_width(0.4)
        # marco con guiones simulado: rect normal
        self.rect(x0, y0, w, height, "DF")
        # icono camara (dibujado simple)
        cx = x0 + w / 2
        self.set_draw_color(*GOLD)
        self.set_line_width(0.6)
        self.set_fill_color(*WHITE)
        bw, bh = 24, 16
        bx, by = cx - bw / 2, y0 + height / 2 - bh / 2 - 4
        self.rect(bx, by, bw, bh, "D")
        self.ellipse(cx - 5, by + bh / 2 - 5, 10, 10, "D")
        self.rect(bx + 4, by - 2.5, 7, 3, "D")
        # texto
        self.set_xy(x0, by + bh + 1)
        self.set_font(FONT, "B", 9)
        self.set_text_color(*GOLD)
        self.cell(w, 5, "ESPACIO PARA IMAGEN DE REFERENCIA", align="C")
        self.set_xy(x0, by + bh + 6)
        self.set_font(FONT, "", 8.5)
        self.set_text_color(120, 120, 120)
        self.cell(w, 4.5, caption, align="C")
        self.set_y(y0 + height + 4)

    def spacer(self, h=2):
        self.ln(h)


# ---------------------------------------------------------------------------
# Render de un arbol de bloques
# ---------------------------------------------------------------------------
def render_blocks(pdf, blocks):
    for b in blocks:
        t = b[0]
        if t == "h2":
            pdf.h2(b[1])
        elif t == "h3":
            pdf.h3(b[1])
        elif t == "para":
            pdf.para(b[1])
        elif t == "bullets":
            pdf.bullets(b[1])
        elif t == "steps":
            pdf.steps(b[1])
        elif t == "callout":
            pdf.callout(b[1], b[2])
        elif t == "ph":
            pdf.placeholder(b[1], b[2] if len(b) > 2 else 58)
        elif t == "spacer":
            pdf.spacer(b[1] if len(b) > 1 else 2)


# ===========================================================================
#  CONTENIDO
# ===========================================================================
from contenido_guia import SECCIONES, COVER  # noqa: E402


def build():
    pdf = Guide()

    # ---------------- PORTADA ----------------
    pdf.add_page()
    pdf.special_pages.add(pdf.page_no())
    pdf.set_fill_color(*INK)
    pdf.rect(0, 0, 210, 297, "F")
    # marco dorado
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.8)
    pdf.rect(12, 12, 186, 273, "D")
    pdf.set_line_width(0.3)
    pdf.rect(14.5, 14.5, 181, 268, "D")
    # ornamento dorado (genérico, sin logo de ninguna barbería)
    def ornamento(y):
        cx = 105
        pdf.set_draw_color(*GOLD)
        pdf.set_line_width(0.5)
        pdf.line(cx - 30, y, cx - 6, y)
        pdf.line(cx + 6, y, cx + 30, y)
        pdf.set_fill_color(*GOLD)
        pdf.polygon([(cx, y - 2.2), (cx + 2.2, y), (cx, y + 2.2), (cx - 2.2, y)],
                    style="F")

    ornamento(82)
    pdf.set_y(108)
    pdf.set_font(SERIF, "", 13)
    pdf.set_text_color(*GOLD)
    pdf.cell(0, 8, "MANUAL DE USO DE LA APLICACION", align="C")
    pdf.ln(12)
    pdf.set_font(SERIF, "", 42)
    pdf.set_text_color(*WHITE)
    pdf.cell(0, 18, "Guia de la App", align="C")
    pdf.ln(22)
    pdf.set_font(SERIF, "", 22)
    pdf.set_text_color(*GOLD_SOFT)
    pdf.cell(0, 12, "para tu Barberia", align="C")
    pdf.ln(24)
    # banda
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.5)
    pdf.line(55, pdf.get_y(), 155, pdf.get_y())
    pdf.ln(9)
    pdf.set_font(FONT, "", 11)
    pdf.set_text_color(210, 205, 195)
    pdf.multi_cell(0, 6,
        "Todo lo que tu aplicacion puede hacer: la Agenda de turnos,\n"
        "el Panel de Gestion Interna, el Club de Fidelidad y como\n"
        "instalar la app en el celular de tus clientes.",
        align="C")
    pdf.set_y(255)
    pdf.set_font(FONT, "", 9)
    pdf.set_text_color(150, 145, 135)
    pdf.cell(0, 5, "Documento entregado de forma individual a cada barberia", align="C")
    pdf.ln(5)
    pdf.set_font(FONT, "B", 9)
    pdf.set_text_color(*GOLD)
    pdf.cell(0, 5, "Desarrollado por SynapTech", align="C")

    # ---------------- INDICE ----------------
    pdf.add_page()
    pdf.set_font(SERIF, "", 26)
    pdf.set_text_color(*INK)
    pdf.cell(0, 14, "Contenido", align="L")
    pdf.ln(18)
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.6)
    pdf.line(18, pdf.get_y(), 45, pdf.get_y())
    pdf.ln(8)
    for i, sec in enumerate(SECCIONES, 1):
        pdf.set_font(SERIF, "", 15)
        pdf.set_text_color(*GOLD)
        pdf.cell(12, 10, f"{i:02d}")
        pdf.set_font(FONT, "B", 13)
        pdf.set_text_color(*INK)
        pdf.cell(0, 10, sec["titulo"])
        pdf.ln(9)
        pdf.set_x(30)
        pdf.set_font(FONT, "", 9.5)
        pdf.set_text_color(*GRAY)
        pdf.multi_cell(0, 5, sec["resumen"])
        pdf.ln(4)
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.2)
        pdf.line(18, pdf.get_y(), 192, pdf.get_y())
        pdf.ln(5)

    # ---------------- SECCIONES ----------------
    for i, sec in enumerate(SECCIONES, 1):
        pdf.current_section = sec["titulo"]
        pdf.section_divider(i, sec["titulo"], sec["subtitulo"])
        pdf.add_page()
        render_blocks(pdf, sec["bloques"])

    # ---------------- CIERRE ----------------
    pdf.current_section = "Soporte"
    pdf.add_page()
    pdf.ln(40)
    pdf.set_font(SERIF, "", 22)
    pdf.set_text_color(*INK)
    pdf.cell(0, 12, "Estamos para ayudarte", align="C")
    pdf.ln(16)
    pdf.set_font(FONT, "", 10.5)
    pdf.set_text_color(70, 70, 70)
    pdf.multi_cell(0, 6,
        "Esta guia resume las funciones principales de tu aplicacion. La app se\n"
        "actualiza constantemente con mejoras, por lo que algunas pantallas pueden\n"
        "verse ligeramente distintas. Ante cualquier duda, nuestro equipo de soporte\n"
        "esta disponible para acompanarte.",
        align="C")
    pdf.ln(10)
    pdf.callout("Soporte tecnico SynapTech",
        "WhatsApp de soporte: +56 9 8356 8212   ·   Escribenos cuando lo necesites: "
        "te ayudamos con la configuracion, el uso diario y cualquier consulta sobre la app.")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Guia-App-Barberia.pdf")
    out = os.path.normpath(out)
    pdf.output(out)
    print("OK ->", out)


if __name__ == "__main__":
    build()

# Tahta klavye kısayolları (beyaz tahta modu, file://, Electron'suz).
# Tahta klasöründen: python3 tahta-testi/kisayol.py
#
# Kanıtladığı iddialar (2026-10-08 gece denetimi, KP-7):
#   * Kısayollar düz tuş: Cmd/Ctrl+C çizimi silmiyor (overlay'de 'clear'
#     senkronuyla bütün ekranları siliyordu), Cmd+E silgiyi açmıyor,
#   * Cmd+Shift+Z bir çizgi daha geri almıyor; Cmd+Z tek çizgi geri alıyor,
#   * düz C hâlâ temizliyor, düz E hâlâ silgi.
import os, sys
from playwright.sync_api import sync_playwright

TAHTA = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))   # Tahta/
SAYFA = "file://" + os.path.join(TAHTA, "index.html")
SONUC = []
def kontrol(ad, kosul, ek=""):
    SONUC.append((ad, bool(kosul)))
    print(("PASS" if kosul else "FAIL"), "-", ad, ("· " + str(ek)) if ek and not kosul else "")

with sync_playwright() as p:
    b = p.chromium.launch()
    s = b.new_page(viewport={"width": 800, "height": 600})
    hatalar = []
    s.on("pageerror", lambda e: hatalar.append(str(e)))
    s.goto(SAYFA)
    def ciz():
        s.mouse.move(100, 100); s.mouse.down()
        for i in range(20): s.mouse.move(100 + i * 10, 100 + i * 5)
        s.mouse.up()
    n = lambda: s.evaluate("strokes.length")
    ciz(); ciz()
    kontrol("iki çizgi çizildi", n() == 2, n())
    s.keyboard.press("Meta+c")
    kontrol("Cmd+C çizimi silmiyor", n() == 2, n())
    s.keyboard.press("Control+c")
    kontrol("Ctrl+C çizimi silmiyor", n() == 2, n())
    s.keyboard.press("Meta+Shift+z")
    kontrol("Cmd+Shift+Z geri almıyor", n() == 2, n())
    s.keyboard.press("Meta+z")
    kontrol("Cmd+Z tek çizgi geri alıyor", n() == 1, n())
    s.keyboard.press("Meta+e")
    kontrol("Cmd+E silgiyi açmıyor", s.evaluate("eraserOn") is False)
    s.keyboard.press("e")
    kontrol("düz E silgiyi açıyor", s.evaluate("eraserOn") is True)
    s.keyboard.press("e")
    s.keyboard.press("c")
    kontrol("düz C temizliyor", n() == 0, n())
    kontrol("sayfa hatası yok", not hatalar, hatalar[:2])
    b.close()

kalan = [a for a, o in SONUC if not o]
print(f"\n{len(SONUC) - len(kalan)}/{len(SONUC)} geçti")
sys.exit(1 if kalan else 0)

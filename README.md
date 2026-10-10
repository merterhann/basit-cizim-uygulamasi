<p align="center"><img src="build/icon.png" width="128" alt=""></p>

# Basit Çizim Uygulaması

macOS ekranının üstüne çizim yapmak için şeffaf katman. Canlı yayında, ekran
kaydında ya da sunumda mevcut ekranın üstüne çizerek anlatırsın; kapatınca her
şey silinir.

Eğitim verenler, canlı yayın yapanlar ve sunum yapanlar için: minimal, kafa
karıştırmayan, saniyesinde açılıp kapanan bir ekran üstü kalem. Baştan sona
[Claude Code](https://claude.com/claude-code) ile yapıldı.

*English below.*

- Ekranda araç çubuğu yok: çizim alanını kapatmaz, tıklamayı yemez.
- Hıza göre incelen, kalem hissi veren çizgi.
- Çoklu ekran: her ekranda çalışır, imleç hangi ekrandaysa orada çizersin.
- Dock'ta ikon yok, arka planda kısayol bekler; açılışta kendiliğinden başlar.

## Kurulum

1. [Releases](https://github.com/merterhann/basit-cizim-uygulamasi/releases) sayfasından
   `Basit-Cizim-Uygulamasi-mac-arm64.zip` dosyasını indir, aç, `Basit Çizim Uygulaması.app`'i **Uygulamalar**
   klasörüne sürükle.
2. Uygulama Apple'a kayıtlı bir geliştirici hesabıyla imzalı değil, bu yüzden
   ilk açılışta macOS "doğrulanamadı" der. **Bitti**'ye bas, sonra
   **Sistem Ayarları → Gizlilik ve Güvenlik** sayfasının altındaki
   **Yine de Aç**'a tıkla. Ya da Terminal'de tek satır:
   ```bash
   xattr -dr com.apple.quarantine "/Applications/Basit Çizim Uygulaması.app"
   ```
3. Çift tıkla. Pencere açılmaz; uygulama arka planda kısayolu bekler.

Yalnız Apple Silicon (M1 ve sonrası) Mac'ler için paketlenmiştir. Intel Mac'te
aşağıdaki "Kaynaktan derle" adımlarını izle.

## Kullanım

| Kısayol | Ne yapar |
|--|--|
| `Ctrl+Option+Cmd+Shift+9` | Çizimi aç / kapat (kapatınca her şey silinir) |
| `Ctrl+Option+Cmd+Shift+8` | Silgi aç / kapat |
| `E` ya da `8` | Silgi aç / kapat |
| `[` `]` | Kalem kalınlığı |
| `C` | Temizle |
| `Cmd+Z` | Geri al |
| `B` | Zemin: şeffaf → beyaz → siyah |
| `Esc` | Kapat ve sil |

Dört tuşlu kısayollar bilerek seçildi: hiçbir uygulamayla çakışmaz, klavyeden
yanlışlıkla basılmaz. Asıl kullanım bunları **mouse yan tuşlarına** atamaktır.
Örneğin Logitech Options+ ile yan tuşa "Keystroke" atayıp
`Ctrl+Option+Cmd+Shift+9` girersin; tek tuşla çizim açılır.

Kalem kırmızıdır; renk paleti bilerek yok.

## Kaynaktan derle

Node.js 18+ gerekir.

```bash
git clone https://github.com/merterhann/basit-cizim-uygulamasi.git
cd basit-cizim-uygulamasi
npm install
npm start          # geliştirirken
npm run dist       # dist/mac-arm64/BasitCizim.app
```

Çizgi hissini değiştirmek için `index.html` en üstündeki `TUNING` nesnesine
bak: `base` (kalınlık), `vMax` (en ince hız), `thinning` (hız etkisi),
`streamline` (akıcılık).

---

## English

A transparent drawing overlay for macOS. Draw on top of your screen while
teaching, streaming, recording or presenting; everything is wiped when you
close it. Minimal, instant to open and close, nothing to configure. Built
entirely with [Claude Code](https://claude.com/claude-code).

- No on-screen toolbar: nothing covers your content or steals clicks.
- Velocity-based stroke width that feels like a real pen.
- Multi-monitor: works on every display, you draw wherever the cursor is.
- No Dock icon; it waits for the hotkey in the background and starts at login.

### Install

1. Download `Basit-Cizim-Uygulamasi-mac-arm64.zip` from
   [Releases](https://github.com/merterhann/basit-cizim-uygulamasi/releases), unzip it and drag
   `Basit Çizim Uygulaması.app` into **Applications**.
2. The app is not signed with an Apple Developer ID, so macOS says it cannot
   be verified on first launch. Click **Done**, then **System Settings →
   Privacy & Security → Open Anyway**. Or run one line in Terminal:
   ```bash
   xattr -dr com.apple.quarantine "/Applications/Basit Çizim Uygulaması.app"
   ```
3. Double-click it. No window opens; the app waits for the hotkey.

The release is built for Apple Silicon (M1 and later). On Intel Macs, build
from source.

### Shortcuts

| Shortcut | Action |
|--|--|
| `Ctrl+Option+Cmd+Shift+9` | Toggle the overlay (closing clears it) |
| `Ctrl+Option+Cmd+Shift+8` | Toggle eraser |
| `E` or `8` | Toggle eraser |
| `[` `]` | Pen size |
| `C` | Clear |
| `Cmd+Z` | Undo |
| `B` | Background: transparent → white → black |
| `Esc` | Close and clear |

The four-modifier hotkeys never clash with other apps. They are meant to be
mapped to **mouse side buttons** (e.g. a "Keystroke" action in Logitech
Options+), so one button opens the overlay.

### Build from source

Requires Node.js 18+.

```bash
git clone https://github.com/merterhann/basit-cizim-uygulamasi.git
cd basit-cizim-uygulamasi
npm install
npm start          # development
npm run dist       # dist/mac-arm64/BasitCizim.app
```

Tweak the pen feel with the `TUNING` object at the top of `index.html`.

## Lisans / License

[MIT](LICENSE)

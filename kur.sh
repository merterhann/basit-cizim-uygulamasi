#!/bin/bash
# Basit Çizim Uygulaması — tek satırlık kurulum
#   curl -fsSL https://raw.githubusercontent.com/merterhann/basit-cizim-uygulamasi/main/kur.sh | bash
# En son sürümü indirir, Uygulamalar'a koyar (varsa eskisini değiştirir), açar.
set -euo pipefail

AD="Basit Çizim Uygulaması"
URL="https://github.com/merterhann/basit-cizim-uygulamasi/releases/latest/download/Basit-Cizim-Uygulamasi-mac-arm64.zip"

hata() { printf '\n✗ %s\n\n' "$1" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || hata "Bu uygulama yalnız macOS'ta çalışır."
# Rosetta altındaki Terminal x86_64 der; donanıma bak
[ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ] \
  || hata "Bu sürüm M1 ve sonrası (Apple Silicon) Mac'ler için. Intel Mac'te kaynaktan derle: github.com/merterhann/basit-cizim-uygulamasi"

# Uygulamalar klasörüne yazılamıyorsa kullanıcının kendi Uygulamalar klasörü
HEDEF="/Applications"
if [ ! -w "$HEDEF" ]; then HEDEF="$HOME/Applications"; mkdir -p "$HEDEF"; fi

GECICI="$(mktemp -d)"
trap 'rm -rf "$GECICI"' EXIT

echo "→ İndiriliyor…"
curl -fL --progress-bar "$URL" -o "$GECICI/uygulama.zip" || hata "İndirilemedi. İnternet bağlantını kontrol edip tekrar dene."
ditto -x -k "$GECICI/uygulama.zip" "$GECICI" || hata "İndirilen dosya açılamadı. Tekrar dene."
[ -d "$GECICI/$AD.app" ] || hata "İndirilen dosyada uygulama bulunamadı."

# Açık eski sürüm varsa kapat, sonra değiştir
pkill -x BasitCizim 2>/dev/null || true
rm -rf "$HEDEF/$AD.app"
echo "→ $HEDEF klasörüne kuruluyor…"
ditto "$GECICI/$AD.app" "$HEDEF/$AD.app"
xattr -dr com.apple.quarantine "$HEDEF/$AD.app" 2>/dev/null || true

open "$HEDEF/$AD.app"

cat <<'BITTI'

✓ Kuruldu ve açıldı. Ekranda pencere yok, arka planda bekliyor.

  Ctrl+Option+Cmd+Shift+9   çizimi aç / kapat (kapatınca silinir)
  Ctrl+Option+Cmd+Shift+8   silgi
  Mouse yan tuşuna bu kısayolu atarsan tek tuşla açılır.

BITTI

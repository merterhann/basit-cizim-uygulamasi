const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

let wins = [];
let visible = false;

// ── Kısayol ayarı: kullanıcının ayar klasöründe, güncellemede silinmez ───────
const VARSAYILAN_KISAYOL = "Control+Alt+Command+Shift+9";
const ayarYolu = () => path.join(app.getPath("userData"), "ayarlar.json");
function ayarOku() {
  try { return JSON.parse(fs.readFileSync(ayarYolu(), "utf8")) || {}; } catch { return {}; }
}
// geçici dosyaya yaz + yeniden adlandır: yarıda kesilirse eski ayar bozulmaz
function ayarYaz(a) {
  fs.mkdirSync(path.dirname(ayarYolu()), { recursive: true });
  const gecici = ayarYolu() + ".tmp";
  fs.writeFileSync(gecici, JSON.stringify(a, null, 2));
  fs.renameSync(gecici, ayarYolu());
}
let kisayol = VARSAYILAN_KISAYOL;
let kisayolEtkin = false;   // kısayol gerçekten kayıtlı mı

// Geçerli kısayolu bırakıp yenisini dener; olmazsa eskisine döner.
function kisayolKaydet(yeni) {
  const eski = kisayol;
  globalShortcut.unregisterAll();
  let ok = false;
  try { ok = globalShortcut.register(yeni, toggle); } catch { ok = false; }
  if (!ok) {
    // kısayol penceresi açıkken eskisi kapalı kalır; pencere kapanınca geri gelir
    if (!ayarPenceresi) {
      try { kisayolEtkin = globalShortcut.register(eski, toggle); } catch { kisayolEtkin = false; }
    }
    return false;
  }
  kisayol = yeni;
  kisayolEtkin = true;
  return true;
}

function makeWindow(bounds) {
  const w = new BrowserWindow({
    x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    show: false,
    fullscreenable: false,
    // panel = NSNonactivatingPanel: uygulama frontmost olmadan da (çoklu ekran /
    // ayrı Space'lerde) fare olayı ve key durumu alır → özel imleç her ekranda çizilir.
    type: "panel",
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  w.setAlwaysOnTop(true, "screen-saver");
  w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  kilitle(w);
  w.loadFile("index.html");
  return w;
}

// yalnız kendi sayfası: sürüklenen dosya/link açılmaz, yeni pencere açılmaz
function kilitle(w) {
  w.webContents.on("will-navigate", (e) => e.preventDefault());
  w.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

function build() {
  wins = screen.getAllDisplays().map((d) => makeWindow(d.bounds));
}

function broadcast(channel) {
  for (const w of wins) if (!w.isDestroyed()) w.webContents.send(channel);
}

// pencere ↔ ekran eşleşmesi: pencere merkezini içeren ekran
function displayForWin(w) {
  const b = w.getBounds();
  return screen.getDisplayNearestPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
}

function showAll() {
  syncBounds();
  for (const w of wins) {
    if (w.isDestroyed()) continue;
    w.showInactive();
    w.setAlwaysOnTop(true, "screen-saver");
  }
  visible = true;
  followDisplayId = null;
  startCursorFollow();
}

function hideAll() {
  stopCursorFollow();
  broadcast("clear");   // her kapanışta temiz sayfa
  for (const w of wins) if (!w.isDestroyed()) w.hide();
  visible = false;
}

// macOS: key olmayan / aktif olmayan uygulamanın penceresi mouseMoved olayı almaz,
// dolayısıyla özel imleç çizilmez ve renderer'daki focus-follow tetiklenemez.
// Çözüm: main sürecinden global imleç konumunu izle, imleç hangi ekrana geçerse
// o pencereyi key + uygulamayı aktif yap.
let cursorPoll = null;
let followDisplayId = null;
function startCursorFollow() {
  stopCursorFollow();
  cursorPoll = setInterval(() => {
    if (!visible) return;
    const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    if (d.id === followDisplayId) return;
    followDisplayId = d.id;
    const w = wins.find((x) => !x.isDestroyed() && displayForWin(x).id === d.id);
    if (w && !w.isFocused()) w.focus();
  }, 150);
}
function stopCursorFollow() { clearInterval(cursorPoll); cursorPoll = null; }

function toggle() {
  if (!wins.length) return;
  if (visible) hideAll();
  else showAll();
}

// ekranların yerleşimi/çözünürlüğü değişti — pencereleri destroy etmeden yeniden konumla
function syncBounds() {
  const ds = screen.getAllDisplays();
  if (ds.length !== wins.length) { rebuild(); return; }
  wins.forEach((w, i) => { if (!w.isDestroyed() && ds[i]) w.setBounds(ds[i].bounds); });
}

// ekran sayısı değişti — pencere kümesini baştan kur
let rebuilding = false;
function rebuild() {
  if (rebuilding) return;
  rebuilding = true;
  const old = wins;
  build();
  for (const w of old) if (!w.isDestroyed()) w.destroy();
  if (visible) showAll();
  rebuilding = false;
}

// ── Menü çubuğu ────────────────────────────────────────────────────────────
let tray = null;
function menuKur() {
  if (!tray) return;
  // Menüden çizim açılmaz (Mert, 2026-10-10): çizim yalnız kısayolla. Geçerli
  // kısayol "Kısayolu değiştir…" yanında görünür, unutulmasın.
  tray.setContextMenu(Menu.buildFromTemplate([
    // kısayol kaydedilemediyse (sistem ayırmış ya da ayar bozuk) sessizce çalışmaz kalmasın.
    // Not: macOS başka uygulamanın aynı kısayolu almasını engellemiyor, onu algılayamayız.
    ...(kisayolEtkin ? [] : [{ label: "⚠︎ Kısayol çalışmıyor. Değiştir…", click: kisayolPenceresi },
      { type: "separator" }]),
    { label: "Kısayolu değiştir…", accelerator: kisayolEtkin ? kisayol : undefined,
      registerAccelerator: false, click: kisayolPenceresi },
    { type: "separator" },
    { label: "Çık", click: () => app.quit() },
  ]));
}

let ayarPenceresi = null;
function kisayolPenceresi() {
  if (ayarPenceresi && !ayarPenceresi.isDestroyed()) { ayarPenceresi.focus(); return; }
  if (visible) hideAll();
  // pencere açıkken genel kısayol kapalı: basılan tuş birleşimi pencereye gelsin
  globalShortcut.unregisterAll();
  ayarPenceresi = new BrowserWindow({
    width: 420, height: 300, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, title: "Kısayol", show: false,
    webPreferences: { preload: path.join(__dirname, "kisayol-preload.js") },
  });
  kilitle(ayarPenceresi);
  ayarPenceresi.loadFile("kisayol.html");
  ayarPenceresi.once("ready-to-show", () => {
    app.focus({ steal: true });
    ayarPenceresi.show();
  });
  ayarPenceresi.on("closed", () => {
    ayarPenceresi = null;
    if (!globalShortcut.isRegistered(kisayol)) kisayolKaydet(kisayol);
    menuKur();
  });
}

let metricsTimer = null;

app.whenReady().then(() => {
  if (app.dock) app.dock.hide();
  // Varsayılan uygulama menüsü yok: ⌘Q/⌘W kısayol kaydını yutuyor, ⌘R çizimi
  // yeniliyor, ⌥⌘I geliştirici araçlarını açıyordu. Çıkış menü çubuğundan.
  Menu.setApplicationMenu(null);
  // Yalnız paketli .app girişte açılsın; `npm start` geliştirme sırasında
  // çıplak Electron ikilisini giriş öğesi olarak kaydediyordu.
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });

  build();

  screen.on("display-added", rebuild);
  screen.on("display-removed", rebuild);
  screen.on("display-metrics-changed", () => {
    clearTimeout(metricsTimer);
    metricsTimer = setTimeout(syncBounds, 300);
  });

  // imleç hangi ekrandaysa o pencere key olsun — macOS özel CSS imleci yalnızca
  // key pencerede çizilir; renderer imleç hareketinde bunu tetikler (throttle'lı).
  ipcMain.on("focusme", (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w && !w.isDestroyed() && !w.isFocused()) {
      app.focus({ steal: true });
      w.focus();
    }
  });

  // araç durumu senkronu — main sadece relay, durum tutmaz
  ipcMain.on("sync", (e, msg) => {
    for (const w of wins) {
      if (!w.isDestroyed() && w.webContents.id !== e.sender.id) w.webContents.send("sync-in", msg);
    }
  });

  ipcMain.on("hide", () => { if (visible) toggle(); });

  // kısayol penceresi
  ipcMain.handle("kisayol-oku", () => ({ kisayol, varsayilan: VARSAYILAN_KISAYOL }));
  ipcMain.handle("kisayol-kaydet", (_, yeni) => {
    if (typeof yeni !== "string" || !yeni || yeni.length > 80) return { ok: false };
    if (!kisayolKaydet(yeni)) return { ok: false };
    ayarYaz({ ...ayarOku(), kisayol: yeni });
    menuKur();
    if (ayarPenceresi && !ayarPenceresi.isDestroyed()) ayarPenceresi.close();
    return { ok: true };
  });
  ipcMain.on("kisayol-kapat", () => { if (ayarPenceresi && !ayarPenceresi.isDestroyed()) ayarPenceresi.close(); });

  // kayıtlı kısayol; kaydedilemezse (başka uygulama almış) varsayılana düş
  const kayitli = ayarOku().kisayol;
  if (!(kayitli && kisayolKaydet(kayitli))) kisayolKaydet(VARSAYILAN_KISAYOL);

  const ikon = nativeImage.createFromPath(path.join(__dirname, "tray", "trayTemplate.png"));
  ikon.setTemplateImage(true);
  tray = new Tray(ikon);
  tray.setToolTip("Basit Çizim Uygulaması");
  menuKur();
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", (e) => e.preventDefault());  // arka planda kal

const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const path = require("path");

let wins = [];
let visible = false;

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
  // yalnız kendi sayfası: sürüklenen dosya/link açılmaz, yeni pencere açılmaz
  w.webContents.on("will-navigate", (e) => e.preventDefault());
  w.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  w.loadFile("index.html");
  return w;
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

let metricsTimer = null;

app.whenReady().then(() => {
  if (app.dock) app.dock.hide();
  // Yalnız paketli .app girişte açılsın; `npm start` geliştirme sırasında
  // çıplak Electron ikilisini giriş öğesi olarak kaydediyordu.
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });

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

  // hyper kombinasyonlar — hiçbir uygulamaya çakışmaz, mouse yan tuşlarına atanır
  globalShortcut.register("Control+Alt+Command+Shift+9", toggle);
  globalShortcut.register("Control+Alt+Command+Shift+8", () => {
    if (visible) broadcast("toggle-eraser");
  });

  ipcMain.on("hide", () => { if (visible) toggle(); });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", (e) => e.preventDefault());  // arka planda kal

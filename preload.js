const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  hide: () => ipcRenderer.send("hide"),
  onClear: (fn) => ipcRenderer.on("clear", fn),
  onToggleEraser: (fn) => ipcRenderer.on("toggle-eraser", fn),
  sync: (msg) => ipcRenderer.send("sync", msg),
  onSync: (fn) => ipcRenderer.on("sync-in", (_, msg) => fn(msg)),
  focusMe: () => ipcRenderer.send("focusme"),
});

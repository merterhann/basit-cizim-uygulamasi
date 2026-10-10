const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kisayolAPI", {
  oku: () => ipcRenderer.invoke("kisayol-oku"),
  kaydet: (k) => ipcRenderer.invoke("kisayol-kaydet", k),
  kapat: () => ipcRenderer.send("kisayol-kapat"),
});

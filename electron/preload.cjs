const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("leadpilotDesktop", {
  storeGet: (key) => ipcRenderer.invoke("store:get", key),
  storeSet: (key, value) => ipcRenderer.invoke("store:set", key, value),
  storeDelete: (key) => ipcRenderer.invoke("store:delete", key),
  getOpenAIStatus: () => ipcRenderer.invoke("openai:status"),
  setOpenAIKey: (apiKey) => ipcRenderer.invoke("openai:set-key", apiKey),
  deleteOpenAIKey: () => ipcRenderer.invoke("openai:delete-key"),
  askOpenAI: (payload) => ipcRenderer.invoke("openai:ask", payload),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  setAutostart: (enabled) => ipcRenderer.invoke("app:autostart", enabled),
});

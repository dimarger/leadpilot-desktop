const { app, BrowserWindow, ipcMain, Menu, nativeImage, safeStorage, Tray } = require("electron");
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

let mainWindow = null;
let tray = null;
let database = null;
let quitting = false;

function openDatabase() {
  if (database) return database;
  const filename = path.join(app.getPath("userData"), "leadpilot.sqlite");
  database = new DatabaseSync(filename);
  database.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)");
  return database;
}

function getSetting(key) {
  const row = openDatabase().prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

function setSetting(key, value) {
  openDatabase().prepare("INSERT INTO settings(key, value, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(key, JSON.stringify(value), Date.now());
  return true;
}

function deleteSetting(key) {
  openDatabase().prepare("DELETE FROM settings WHERE key = ?").run(key);
  return true;
}

function encryptedApiKey() {
  const saved = getSetting("openai-api-key");
  if (!saved || typeof saved !== "string" || !safeStorage.isEncryptionAvailable()) return "";
  try { return safeStorage.decryptString(Buffer.from(saved, "base64")); } catch { return ""; }
}

function keyHint(key) {
  return key.length > 10 ? `${key.slice(0, 7)}…${key.slice(-4)}` : null;
}

async function validateOpenAIKey(apiKey) {
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) throw new Error("Неверный формат API-ключа OpenAI");
  const response = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(response.status === 401 ? "OpenAI отклонил ключ" : "Не удалось проверить ключ OpenAI");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    backgroundColor: "#f5f5f3",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "dist", "favicon.svg"));
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip("LeadPilot AI");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Открыть LeadPilot", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: "separator" },
    { label: "Выйти", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
}

ipcMain.handle("store:get", (_event, key) => getSetting(String(key).slice(0, 120)));
ipcMain.handle("store:set", (_event, key, value) => setSetting(String(key).slice(0, 120), value));
ipcMain.handle("store:delete", (_event, key) => deleteSetting(String(key).slice(0, 120)));
ipcMain.handle("openai:status", () => {
  const key = encryptedApiKey();
  return { configured: Boolean(key), hint: keyHint(key), model: "gpt-5.6-luna" };
});
ipcMain.handle("openai:set-key", async (_event, rawKey) => {
  const apiKey = String(rawKey || "").trim();
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows не предоставил защищённое хранилище ключей");
  await validateOpenAIKey(apiKey);
  setSetting("openai-api-key", safeStorage.encryptString(apiKey).toString("base64"));
  return { configured: true, hint: keyHint(apiKey), model: "gpt-5.6-luna" };
});
ipcMain.handle("openai:delete-key", () => deleteSetting("openai-api-key"));
ipcMain.handle("openai:ask", async (_event, payload) => {
  const apiKey = encryptedApiKey();
  if (!apiKey) throw new Error("OpenAI не подключён");
  const model = "gpt-5.6-luna";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, instructions: String(payload?.instructions || ""), input: String(payload?.input || ""), max_output_tokens: 500 }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "OpenAI не ответил");
  const text = data.output_text || (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text).join("\n");
  return { text, model };
});
ipcMain.handle("app:info", () => ({ version: app.getVersion(), platform: process.platform, autostart: app.getLoginItemSettings().openAtLogin }));
ipcMain.handle("app:autostart", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return app.getLoginItemSettings().openAtLogin;
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on("second-instance", () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(() => { openDatabase(); createWindow(); createTray(); });
  app.on("activate", () => { if (!mainWindow) createWindow(); else mainWindow.show(); });
  app.on("before-quit", () => { quitting = true; });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") mainWindow = null; });
}

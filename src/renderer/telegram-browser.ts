"use client";

import { Buffer } from "buffer";

const SESSION_KEY = "leadpilot-telegram-session";
const APP_KEY = "leadpilot-telegram-app";
const ACCOUNT_IDS = ["1", "2"] as const;

export type BrowserTelegramAccountId = typeof ACCOUNT_IDS[number];

export type BrowserTelegramAccount = {
  id: BrowserTelegramAccountId;
  label: string;
  username: string;
  phone: string;
};

export type BrowserTelegramDialogFolder = {
  id: number;
  title: string;
};

export type BrowserTelegramDialog = {
  id: string;
  accountId: BrowserTelegramAccountId;
  accountLabel: string;
  title: string;
  initials: string;
  unread: number;
  lastMessage: string;
  date: number;
  kind: "private" | "bot" | "group" | "channel";
  archived: boolean;
  folders: BrowserTelegramDialogFolder[];
  entity: unknown;
};

export type BrowserTelegramMessage = {
  id: string;
  text: string;
  outgoing: boolean;
  date: number;
};

export type BrowserTelegramCandidate = {
  id: string;
  accountId: BrowserTelegramAccountId;
  accountLabel: string;
  chatId: string;
  chatTitle: string;
  text: string;
  date: number;
  senderId: string;
  senderName: string;
  senderUsername: string;
  canMessage: boolean;
  senderEntity: unknown;
};

export function classifyBrowserTelegramDialog(entityValue: unknown): BrowserTelegramDialog["kind"] {
  const entity = (entityValue && typeof entityValue === "object" ? entityValue : {}) as Record<string, unknown>;
  if (entity.bot) return "bot";
  if (entity.broadcast) return "channel";
  if (entity.megagroup || entity.title) return "group";
  return "private";
}

type TelegramClientLike = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  checkAuthorization(): Promise<boolean>;
  invoke(request: unknown): Promise<unknown>;
  getMe(): Promise<unknown>;
  signInUser(credentials: { apiId: number; apiHash: string }, params: Record<string, unknown>): Promise<unknown>;
  signInUserWithQrCode(credentials: { apiId: number; apiHash: string }, params: Record<string, unknown>): Promise<unknown>;
  getDialogs(params: { limit?: number; folder?: number; archived?: boolean }): Promise<Array<Record<string, unknown>>>;
  getMessages(entity: unknown, params: { limit: number; offsetId?: number }): Promise<Array<Record<string, unknown>>>;
  getEntity(entityLike: unknown): Promise<unknown>;
  sendMessage(entity: unknown, params: { message: string }): Promise<Record<string, unknown>>;
  session: { save(): string };
};

type TelegramDialogSnapshot = {
  dialog: Record<string, unknown>;
  archived: boolean;
};

type TelegramDialogFolderRule = BrowserTelegramDialogFolder & {
  contacts: boolean;
  nonContacts: boolean;
  groups: boolean;
  broadcasts: boolean;
  bots: boolean;
  excludeMuted: boolean;
  excludeRead: boolean;
  excludeArchived: boolean;
  includedPeers: Set<string>;
  includedPeerValues: unknown[];
  excludedPeers: Set<string>;
};

type StoredTelegramApp = {
  apiId: number;
  apiHash: string;
  label?: string;
  username?: string;
  phone?: string;
};

const clients = new Map<BrowserTelegramAccountId, TelegramClientLike>();

function accountSessionKey(accountId: BrowserTelegramAccountId) {
  return `${SESSION_KEY}-${accountId}`;
}

function accountAppKey(accountId: BrowserTelegramAccountId) {
  return `${APP_KEY}-${accountId}`;
}

function migrateLegacyAccount() {
  const storage = browserStorage();
  if (storage.getItem(accountSessionKey("1")) || storage.getItem(accountAppKey("1"))) return;
  const legacySession = storage.getItem(SESSION_KEY);
  const legacyApp = storage.getItem(APP_KEY);
  if (!legacySession || !legacyApp) return;
  storage.setItem(accountSessionKey("1"), legacySession);
  storage.setItem(accountAppKey("1"), legacyApp);
}

function readStoredApp(accountId: BrowserTelegramAccountId) {
  try {
    const raw = browserStorage().getItem(accountAppKey(accountId));
    return raw ? JSON.parse(raw) as StoredTelegramApp : null;
  } catch { return null; }
}

function browserStorage() {
  if (typeof window === "undefined") throw new Error("Браузерный режим доступен только на устройстве пользователя");
  return window.localStorage;
}

async function makeClient(apiId: number, apiHash: string, session = "") {
  if (typeof globalThis !== "undefined" && !(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer) {
    (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;
  }
  // Load GramJS through one browser chunk. Importing both the package root and
  // its sessions subpath in parallel creates a circular ESM chunk in Vite,
  // which Safari reports as `Cannot access 'default' before initialization`.
  const { TelegramClient, sessions } = await import("telegram");
  const { StringSession } = sessions;
  return new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 4,
    useWSS: true,
    autoReconnect: true,
    requestRetries: 3,
    timeout: 12,
    deviceModel: "Mobile browser",
    systemVersion: "Web",
    appVersion: "LeadPilot 0.1",
  }) as unknown as TelegramClientLike;
}

export async function prepareBrowserTelegram() {
  if (typeof globalThis !== "undefined" && !(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer) {
    (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;
  }
  await import("telegram");
}

export function getBrowserTelegramAccounts(): BrowserTelegramAccount[] {
  try {
    migrateLegacyAccount();
    const storage = browserStorage();
    return ACCOUNT_IDS.flatMap((id) => {
      const app = readStoredApp(id);
      if (!app || !storage.getItem(accountSessionKey(id))) return [];
      return [{
        id,
        label: app.label || (app.username ? `@${app.username}` : `Telegram ${id}`),
        username: app.username ? `@${app.username}` : "",
        phone: app.phone || "",
      }];
    });
  } catch { return []; }
}

export function getAvailableBrowserTelegramAccountId(): BrowserTelegramAccountId | null {
  const connected = new Set(getBrowserTelegramAccounts().map((account) => account.id));
  return ACCOUNT_IDS.find((id) => !connected.has(id)) || null;
}

export function hasBrowserTelegramSession(accountId?: BrowserTelegramAccountId) {
  try {
    migrateLegacyAccount();
    if (accountId) return Boolean(browserStorage().getItem(accountSessionKey(accountId)) && browserStorage().getItem(accountAppKey(accountId)));
    return ACCOUNT_IDS.some((id) => Boolean(browserStorage().getItem(accountSessionKey(id)) && browserStorage().getItem(accountAppKey(id))));
  }
  catch { return false; }
}

export async function restoreBrowserTelegram(accountId: BrowserTelegramAccountId = "1") {
  migrateLegacyAccount();
  const cached = clients.get(accountId);
  if (cached && await cached.checkAuthorization()) return cached;
  const storage = browserStorage();
  const session = storage.getItem(accountSessionKey(accountId));
  const rawApp = storage.getItem(accountAppKey(accountId));
  if (!session || !rawApp) return null;
  const app = JSON.parse(rawApp) as StoredTelegramApp;
  const active = await makeClient(app.apiId, app.apiHash, session);
  clients.set(accountId, active);
  await active.connect();
  if (!await active.checkAuthorization()) {
    await clearBrowserTelegram(accountId);
    return null;
  }
  return active;
}

export async function loginBrowserTelegram(options: {
  accountId?: BrowserTelegramAccountId;
  apiId: number;
  apiHash: string;
  phone: string;
  getCode: (viaApp: boolean) => Promise<string>;
  getPassword: (hint?: string) => Promise<string>;
  onError: (message: string) => void;
}) {
  const accountId = options.accountId || getAvailableBrowserTelegramAccountId();
  if (!accountId) throw new Error("Уже подключены два Telegram-аккаунта");
  const active = await makeClient(options.apiId, options.apiHash);
  clients.set(accountId, active);
  await active.connect();
  const signedIn = await active.signInUser({ apiId: options.apiId, apiHash: options.apiHash }, {
    phoneNumber: options.phone,
    phoneCode: async (viaApp?: boolean) => options.getCode(Boolean(viaApp)),
    password: options.getPassword,
    onError: (reason: Error) => {
      options.onError(telegramErrorMessage(reason));
      return true;
    },
  });
  if (!await active.checkAuthorization()) throw new Error("Telegram не подтвердил вход");
  await saveAuthorizedBrowserTelegramAccount(active, accountId, options.apiId, options.apiHash, signedIn, options.phone);
  return accountId;
}

export async function loginBrowserTelegramWithQr(options: {
  accountId?: BrowserTelegramAccountId;
  apiId: number;
  apiHash: string;
  onQrCode: (loginUrl: string, expires: number) => Promise<void> | void;
  getPassword: (hint?: string) => Promise<string>;
  onError: (message: string) => void;
}) {
  const accountId = options.accountId || getAvailableBrowserTelegramAccountId();
  if (!accountId) throw new Error("Уже подключены два Telegram-аккаунта");
  const active = await makeClient(options.apiId, options.apiHash);
  clients.set(accountId, active);
  await active.connect();
  const signedIn = await active.signInUserWithQrCode({ apiId: options.apiId, apiHash: options.apiHash }, {
    qrCode: async (code: { token: Buffer; expires: number }) => {
      const token = code.token.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      await options.onQrCode(`tg://login?token=${token}`, Number(code.expires || 0));
    },
    password: options.getPassword,
    onError: (reason: Error) => {
      options.onError(telegramErrorMessage(reason));
      return true;
    },
  });
  if (!await active.checkAuthorization()) throw new Error("Telegram не подтвердил вход по QR-коду");
  await saveAuthorizedBrowserTelegramAccount(active, accountId, options.apiId, options.apiHash, signedIn, "");
  return accountId;
}

async function saveAuthorizedBrowserTelegramAccount(active: TelegramClientLike, accountId: BrowserTelegramAccountId, apiId: number, apiHash: string, signedIn: unknown, phone: string) {
  let profile = (signedIn && typeof signedIn === "object" ? signedIn : {}) as Record<string, unknown>;
  if (!profile.firstName && !profile.username) {
    try {
      const me = await active.getMe();
      profile = (me && typeof me === "object" ? me : {}) as Record<string, unknown>;
    } catch { /* Account metadata is optional. */ }
  }
  const username = String(profile.username || "").trim();
  const displayName = [profile.firstName, profile.lastName].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
  const label = displayName || (username ? `@${username}` : `Telegram ${accountId}`);
  browserStorage().setItem(accountSessionKey(accountId), active.session.save());
  browserStorage().setItem(accountAppKey(accountId), JSON.stringify({
    apiId,
    apiHash,
    label,
    username,
    phone: maskPhone(phone),
  } satisfies StoredTelegramApp));
  window.dispatchEvent(new Event("leadpilot-telegram-connected"));
}

export async function cancelBrowserTelegramLogin(accountId: BrowserTelegramAccountId) {
  if (hasBrowserTelegramSession(accountId)) return;
  const active = clients.get(accountId);
  clients.delete(accountId);
  try { await active?.disconnect(); } catch { /* best effort */ }
}

export async function clearBrowserTelegram(accountId: BrowserTelegramAccountId = "1") {
  const active = clients.get(accountId);
  try { await active?.disconnect(); } catch { /* best effort */ }
  clients.delete(accountId);
  const storage = browserStorage();
  storage.removeItem(accountSessionKey(accountId));
  storage.removeItem(accountAppKey(accountId));
  if (accountId === "1") {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(APP_KEY);
  }
  window.dispatchEvent(new Event("leadpilot-telegram-disconnected"));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function peerPart(value: unknown) {
  if (value === undefined || value === null) return "";
  const normalized = String(value);
  return normalized === "[object Object]" ? "" : normalized;
}

function telegramPeerKey(value: unknown): string {
  const peer = asRecord(value);
  const className = String(peer.className || peer.classType || "");
  const userId = peerPart(peer.userId);
  if (userId) return `user:${userId}`;
  const chatId = peerPart(peer.chatId);
  if (chatId) return `chat:${chatId}`;
  const channelId = peerPart(peer.channelId);
  if (channelId) return `channel:${channelId}`;

  const id = peerPart(peer.id);
  if (!id) return "";
  if (/channel/i.test(className) || peer.broadcast || peer.megagroup) return `channel:${id}`;
  if (/chat/i.test(className) || peer.title) return `chat:${id}`;
  if (/user/i.test(className) || peer.firstName || peer.lastName || peer.username) return `user:${id}`;
  return "";
}

function dialogPeerKey(dialog: Record<string, unknown>) {
  return telegramPeerKey(dialog.inputEntity) || telegramPeerKey(dialog.entity);
}

function folderTitle(value: unknown, fallbackId: number) {
  const title = asRecord(value);
  const text = typeof title.text === "string" ? title.text : typeof value === "string" ? value : "";
  return text.trim() || `Папка ${fallbackId}`;
}

function peerSet(value: unknown) {
  const peers = Array.isArray(value) ? value : [];
  return new Set(peers.map(telegramPeerKey).filter(Boolean));
}

async function getTelegramDialogFolderRules(active: TelegramClientLike): Promise<TelegramDialogFolderRule[]> {
  try {
    const { Api } = await import("telegram");
    const response = asRecord(await active.invoke(new Api.messages.GetDialogFilters()));
    const filters = Array.isArray(response.filters) ? response.filters : [];
    return filters.flatMap((value) => {
      const filter = asRecord(value);
      const id = Number(filter.id);
      if (!Number.isFinite(id) || id <= 0 || String(filter.className || "") === "DialogFilterDefault") return [];
      const includedPeerValues = [...(Array.isArray(filter.pinnedPeers) ? filter.pinnedPeers : []), ...(Array.isArray(filter.includePeers) ? filter.includePeers : [])];
      const includedPeers = peerSet(includedPeerValues);
      return [{
        id,
        title: folderTitle(filter.title, id),
        contacts: Boolean(filter.contacts),
        nonContacts: Boolean(filter.nonContacts),
        groups: Boolean(filter.groups),
        broadcasts: Boolean(filter.broadcasts),
        bots: Boolean(filter.bots),
        excludeMuted: Boolean(filter.excludeMuted),
        excludeRead: Boolean(filter.excludeRead),
        excludeArchived: Boolean(filter.excludeArchived),
        includedPeers,
        includedPeerValues,
        excludedPeers: peerSet(filter.excludePeers),
      }];
    });
  } catch {
    // Folder metadata is optional. Main chats and archive remain available.
    return [];
  }
}

function dialogIsMuted(dialog: Record<string, unknown>) {
  const rawDialog = asRecord(dialog.dialog);
  const settings = asRecord(rawDialog.notifySettings);
  const muteUntil = Number(settings.muteUntil || 0);
  return muteUntil > Math.floor(Date.now() / 1000);
}

function dialogMatchesFolder(snapshot: TelegramDialogSnapshot, rule: TelegramDialogFolderRule) {
  const key = dialogPeerKey(snapshot.dialog);
  if (key && rule.includedPeers.has(key)) return true;
  if (key && rule.excludedPeers.has(key)) return false;
  if (rule.excludeArchived && snapshot.archived) return false;
  if (rule.excludeRead && Number(snapshot.dialog.unreadCount || 0) === 0) return false;
  if (rule.excludeMuted && dialogIsMuted(snapshot.dialog)) return false;

  const entity = asRecord(snapshot.dialog.entity);
  const kind = classifyBrowserTelegramDialog(entity);
  if (kind === "bot") return rule.bots;
  if (kind === "channel") return rule.broadcasts;
  if (kind === "group") return rule.groups;
  const isContact = Boolean(entity.contact || entity.mutualContact);
  return isContact ? rule.contacts : rule.nonContacts;
}

function telegramEntityTitle(value: unknown) {
  const entity = asRecord(value);
  const personName = [entity.firstName, entity.lastName].map((part) => String(part || "").trim()).filter(Boolean).join(" ");
  return String(entity.title || personName || entity.username || "Диалог");
}

async function getExplicitFolderDialogSnapshots(active: TelegramClientLike, rules: TelegramDialogFolderRule[], knownKeys: Set<string>) {
  const peerByKey = new Map<string, unknown>();
  for (const rule of rules) {
    for (const peer of rule.includedPeerValues) {
      const key = telegramPeerKey(peer);
      if (key && !knownKeys.has(key) && !peerByKey.has(key)) peerByKey.set(key, peer);
    }
  }
  const missingPeers = Array.from(peerByKey.entries());
  if (!missingPeers.length) return [] as TelegramDialogSnapshot[];

  const { Api } = await import("telegram");
  const snapshots: TelegramDialogSnapshot[] = [];
  for (let offset = 0; offset < missingPeers.length; offset += 100) {
    const batch = missingPeers.slice(offset, offset + 100);
    try {
      const response = asRecord(await active.invoke(new Api.messages.GetPeerDialogs({ peers: batch.map(([, peer]) => new Api.InputDialogPeer({ peer: peer as never })) })));
      const dialogs = Array.isArray(response.dialogs) ? response.dialogs.map(asRecord) : [];
      const messages = Array.isArray(response.messages) ? response.messages.map(asRecord) : [];
      const entities = [...(Array.isArray(response.users) ? response.users : []), ...(Array.isArray(response.chats) ? response.chats : [])];
      const entityByKey = new Map(entities.map((entity) => [telegramPeerKey(entity), entity] as const));

      for (const rawDialog of dialogs) {
        const key = telegramPeerKey(rawDialog.peer);
        const inputEntity = peerByKey.get(key);
        const entity = entityByKey.get(key);
        if (!key || !inputEntity || !entity) continue;
        const topMessageId = Number(rawDialog.topMessage || 0);
        const message = messages.find((candidate) => Number(candidate.id || 0) === topMessageId && (!candidate.peerId || telegramPeerKey(candidate.peerId) === key));
        snapshots.push({
          archived: Number(rawDialog.folderId) === 1,
          dialog: {
            dialog: rawDialog,
            entity,
            inputEntity,
            id: key,
            title: telegramEntityTitle(entity),
            message,
            unreadCount: Number(rawDialog.unreadCount || 0),
            folderId: rawDialog.folderId,
            archived: Number(rawDialog.folderId) === 1,
          },
        });
      }
    } catch { /* A large or inaccessible folder must not hide already loaded chats. */ }
  }
  return snapshots;
}

export async function getBrowserTelegramDialogs(limit = 60, accountId: BrowserTelegramAccountId = "1"): Promise<BrowserTelegramDialog[]> {
  const active = await restoreBrowserTelegram(accountId);
  if (!active) return [];
  const account = getBrowserTelegramAccounts().find((item) => item.id === accountId);
  const accountLabel = account?.label || `Telegram ${accountId}`;
  const mainDialogs = await active.getDialogs({ limit, archived: false });
  let archivedDialogs: Array<Record<string, unknown>> = [];
  try { archivedDialogs = await active.getDialogs({ limit, archived: true }); }
  catch { /* Keep main chats available if Telegram temporarily rejects the archive request. */ }
  const folderRules = await getTelegramDialogFolderRules(active);
  const snapshots = new Map<string, TelegramDialogSnapshot>();
  for (const [items, archived] of [[mainDialogs, false], [archivedDialogs, true]] as const) {
    for (const dialog of items) {
      const entity = asRecord(dialog.entity);
      const rawId = String(dialog.id ?? entity.id ?? dialog.title ?? snapshots.size);
      const key = dialogPeerKey(dialog) || rawId;
      if (!snapshots.has(key)) snapshots.set(key, { dialog, archived });
    }
  }
  for (const snapshot of await getExplicitFolderDialogSnapshots(active, folderRules, new Set(snapshots.keys()))) {
    const key = dialogPeerKey(snapshot.dialog) || String(snapshot.dialog.id || snapshots.size);
    if (!snapshots.has(key)) snapshots.set(key, snapshot);
  }

  return Array.from(snapshots.values()).map((snapshot) => {
    const dialog = snapshot.dialog;
    const entity = dialog.entity as Record<string, unknown> | undefined;
    const title = String(dialog.title || entity?.firstName || entity?.title || entity?.username || "Диалог");
    const message = dialog.message as Record<string, unknown> | undefined;
    const rawId = String(dialog.id ?? entity?.id ?? title);
    const archived = snapshot.archived || Boolean(dialog.archived) || Number(dialog.folderId) === 1;
    const normalizedSnapshot = archived === snapshot.archived ? snapshot : { ...snapshot, archived };
    return {
      id: `${accountId}:${rawId}`,
      accountId,
      accountLabel,
      title,
      initials: title.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TG",
      unread: Number(dialog.unreadCount || 0),
      lastMessage: String(message?.message || "Нет текстовых сообщений"),
      date: Number(message?.date || 0),
      kind: classifyBrowserTelegramDialog(entity),
      archived,
      folders: folderRules.filter((rule) => dialogMatchesFolder(normalizedSnapshot, rule)).map(({ id, title: folderName }) => ({ id, title: folderName })),
      entity,
    };
  }).sort((left, right) => right.date - left.date);
}

async function withBrowserTelegramTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer = 0;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => { timer = window.setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function getBrowserTelegramCandidates(dialog: BrowserTelegramDialog, limit = 40, options?: { shouldInclude?: (text: string, date: number) => boolean }): Promise<BrowserTelegramCandidate[]> {
  const active = await restoreBrowserTelegram(dialog.accountId);
  if (!active) return [];
  const client = active;
  const messages = await withBrowserTelegramTimeout(client.getMessages(dialog.entity, { limit }), 12_000, `Telegram не ответил при чтении «${dialog.title}»`);
  const candidates: BrowserTelegramCandidate[] = [];
  const entityCache = new Map<string, unknown>();

  async function resolveEntity(entityLike: unknown, cacheKey: string) {
    if (entityCache.has(cacheKey)) return entityCache.get(cacheKey);
    const entity = await withBrowserTelegramTimeout(client.getEntity(entityLike), 6_000, "Telegram долго загружает автора сообщения");
    entityCache.set(cacheKey, entity);
    return entity;
  }

  for (const message of messages) {
    const text = String(message.message || "").trim();
    if (!text || message.out) continue;
    const date = Number(message.date || 0);
    if (options?.shouldInclude && !options.shouldInclude(text, date)) continue;

    const senderLike = message.senderId || message.fromId;
    let senderEntity = message.sender;
    if (!senderEntity && senderLike && (dialog.kind === "group" || dialog.kind === "private")) {
      const senderKey = telegramPeerKey(senderLike) || peerPart(senderLike) || String(senderLike);
      try { senderEntity = await resolveEntity(senderLike, senderKey); }
      catch { senderEntity = null; }
    }
    let sender = (senderEntity && typeof senderEntity === "object" ? senderEntity : {}) as Record<string, unknown>;
    let firstName = String(sender.firstName || "").trim();
    let lastName = String(sender.lastName || "").trim();
    let username = String(sender.username || "").trim();
    const postAuthor = String(message.postAuthor || "").trim();
    let isHuman = Boolean(firstName || lastName || username) && !sender.bot && !sender.deleted && !sender.broadcast && !sender.megagroup;

    // Vacancy channels usually publish posts on behalf of the channel, but
    // include a recruiter/contact username in the text. Resolve only a clearly
    // labelled contact (or the sole username in a vacancy-shaped post) so the
    // scanner does not message an unrelated mention.
    if (!isHuman) {
      const contactUsername = vacancyContactUsername(text);
      if (contactUsername) {
        try {
          const contactEntity = await resolveEntity(`@${contactUsername}`, `username:${contactUsername.toLowerCase()}`);
          const contact = (contactEntity && typeof contactEntity === "object" ? contactEntity : {}) as Record<string, unknown>;
          if (!contact.deleted && !contact.broadcast && !contact.megagroup) {
            senderEntity = contactEntity;
            sender = contact;
            firstName = String(contact.firstName || "").trim();
            lastName = String(contact.lastName || "").trim();
            username = String(contact.username || contactUsername).trim();
            isHuman = true;
          }
        } catch { /* Keep the vacancy visible even when its contact cannot be resolved. */ }
      }
    }

    const senderName = [firstName, lastName].filter(Boolean).join(" ") || (username ? `@${username}` : postAuthor || "Автор скрыт");
    const senderId = String(sender.id || (username ? `username:${username}` : senderLike) || `${dialog.id}:${message.id || text.slice(0, 24)}`);

    candidates.push({
      id: String(message.id || crypto.randomUUID()),
      accountId: dialog.accountId,
      accountLabel: dialog.accountLabel,
      chatId: dialog.id,
      chatTitle: dialog.title,
      text,
      date,
      senderId,
      senderName,
      senderUsername: username,
      canMessage: isHuman,
      senderEntity: isHuman ? senderEntity : null,
    });
  }

  return candidates;
}

function vacancyContactUsername(text: string) {
  const labelled = text.match(/(?:отклик(?:аться|нуться|и)?|писать|пишите|резюме|портфолио|контакт(?:ы)?|связ(?:аться|ь)|в\s+лс|в\s+личку)[^@\n]{0,70}@([a-z][a-z0-9_]{4,31})/iu)
    || text.match(/(?:отклик(?:аться|нуться|и)?|писать|пишите|резюме|портфолио|контакт(?:ы)?|связ(?:аться|ь))[^\n]{0,90}t\.me\/([a-z][a-z0-9_]{4,31})/iu);
  if (labelled?.[1]) return labelled[1];

  const looksLikeVacancy = /(?:#?ваканси|ищем[^.!?\n]{0,80}в\s+команд|обязанност|требовани|условия|зарплат|тестовое\s+задание)/iu.test(text);
  if (!looksLikeVacancy) return "";
  const mentions = Array.from(text.matchAll(/(?:@|t\.me\/)([a-z][a-z0-9_]{4,31})/giu), (match) => match[1].toLowerCase());
  return new Set(mentions).size === 1 ? mentions[0] : "";
}

export async function getBrowserTelegramMessages(entity: unknown, limit = 80, offsetId = 0, accountId: BrowserTelegramAccountId = "1"): Promise<BrowserTelegramMessage[]> {
  const active = await restoreBrowserTelegram(accountId);
  if (!active) return [];
  const messages = await active.getMessages(entity, { limit, ...(offsetId > 0 ? { offsetId } : {}) });
  return [...messages].reverse().map((message) => ({
    id: String(message.id || crypto.randomUUID()),
    text: String(message.message || ""),
    outgoing: Boolean(message.out),
    date: Number(message.date || 0),
  })).filter((message) => message.text);
}

export async function sendBrowserTelegramMessage(entity: unknown, text: string, accountId: BrowserTelegramAccountId = "1") {
  const active = await restoreBrowserTelegram(accountId);
  if (!active) throw new Error("Telegram-сессия не найдена");
  return active.sendMessage(entity, { message: text });
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `••• ${digits.slice(-4)}` : "";
}

function telegramErrorMessage(reason: unknown) {
  const raw = reason instanceof Error ? reason.message : String(reason);
  if (/PHONE_NUMBER_INVALID/i.test(raw)) return "Telegram не принял номер. Проверьте код страны и цифры.";
  if (/PHONE_CODE_(INVALID|EMPTY)/i.test(raw)) return "Неверный код подтверждения.";
  if (/PHONE_CODE_EXPIRED/i.test(raw)) return "Код истёк. Начните вход заново.";
  if (/PASSWORD_HASH_INVALID/i.test(raw)) return "Неверный пароль двухэтапной защиты.";
  if (/FLOOD_WAIT/i.test(raw)) return "Telegram временно ограничил частые попытки. Попробуйте позже.";
  if (/API_ID_INVALID/i.test(raw)) return "Неверные api_id или api_hash.";
  if (/AUTH_TOKEN_EXPIRED/i.test(raw)) return "QR-код истёк. LeadPilot уже создаёт новый.";
  if (/AUTH_TOKEN_INVALID/i.test(raw)) return "Telegram отклонил QR-код. Попробуйте отсканировать новый.";
  return raw || "Не удалось подключиться к Telegram";
}

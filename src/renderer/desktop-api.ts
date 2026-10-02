import { analyzeLeadLocally, answerLocally } from "./local-ai";
import { buildSalesSdrPrompt } from "./sales-sdr";

type JsonRecord = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function bodyOf(init?: RequestInit) {
  if (typeof init?.body !== "string" || !init.body) return {} as JsonRecord;
  try { return JSON.parse(init.body) as JsonRecord; } catch { return {} as JsonRecord; }
}

const browserDemoDesktop: NonNullable<Window["leadpilotDesktop"]> = {
  async storeGet<T>(key: string) {
    const value = window.localStorage.getItem(`leadpilot-demo:${key}`);
    if (!value) return null;
    try { return JSON.parse(value) as T; } catch { return null; }
  },
  async storeSet(key, value) {
    window.localStorage.setItem(`leadpilot-demo:${key}`, JSON.stringify(value));
    return true;
  },
  async storeDelete(key) {
    window.localStorage.removeItem(`leadpilot-demo:${key}`);
    return true;
  },
  async getOpenAIStatus() { return { configured: false, hint: null, model: "web-demo" }; },
  async setOpenAIKey() { throw new Error("OpenAI API доступен только в desktop-версии"); },
  async deleteOpenAIKey() { return true; },
  async askOpenAI() { throw new Error("OpenAI API доступен только в desktop-версии"); },
  async getAppInfo() { return { version: "web-demo", platform: "browser", autostart: false }; },
  async setAutostart() { return false; },
};

function desktop() {
  return window.leadpilotDesktop ?? browserDemoDesktop;
}

async function getArray<T>(key: string): Promise<T[]> {
  const value = await desktop().storeGet<T[]>(key);
  return Array.isArray(value) ? value : [];
}

async function localAdminSnapshot() {
  const activity = await getArray<Record<string, unknown>>("activity");
  const keys = await getArray<Record<string, unknown>>("license-keys");
  return {
    metrics: { users: 1, activeSubscriptions: 1, unusedKeys: keys.filter((item) => item.state === "available").length, banned: 0, eventsToday: activity.length },
    keys,
    users: [{ email: "admin@leadpilot.local", expiresAt: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000, plan: "desktop-admin", status: "active", isTrial: false, bannedReason: null, updatedAt: new Date().toISOString() }],
    activity,
  };
}

async function routeApi(pathname: string, method: string, init?: RequestInit) {
  const body = bodyOf(init);

  if (pathname === "/api/agents") {
    if (method === "GET") return json({ agents: await getArray("agents") });
    if (method === "POST") {
      const agents = await getArray<JsonRecord>("agents");
      const agent = { ...body, id: Date.now() };
      await desktop().storeSet("agents", [agent, ...agents]);
      return json({ agent }, 201);
    }
  }

  if (pathname === "/api/activity" && method === "POST") {
    const activity = await getArray<JsonRecord>("activity");
    const event = { id: Date.now(), email: "admin@leadpilot.local", companyName: String(body.companyName || "LeadPilot"), eventType: String(body.eventType || "event"), agentName: body.agentName || null, details: body.details || null, createdAt: new Date().toISOString() };
    await desktop().storeSet("activity", [event, ...activity].slice(0, 1000));
    return json({ ok: true });
  }

  if (pathname === "/api/applicant-profile") {
    if (method === "GET") {
      const profile = await desktop().storeGet("applicant-profile");
      return json({ profile: profile || { displayName: "Дмитрий", roleTitle: "Копирайтер", experience: "Коммерческие тексты, посты, сценарии, лендинги и email-рассылки.", portfolioUrl: "" } });
    }
    if (method === "PUT") {
      await desktop().storeSet("applicant-profile", body);
      return json({ profile: body });
    }
  }

  if (pathname === "/api/agent/match" && method === "POST") {
    const agent = (body.agent || {}) as Parameters<typeof analyzeLeadLocally>[0];
    const candidate = (body.candidate || {}) as Parameters<typeof analyzeLeadLocally>[1];
    const applicant = (body.applicant || {}) as Parameters<typeof analyzeLeadLocally>[2];
    return json(analyzeLeadLocally(agent, candidate, applicant, body.applicationEnabled !== false));
  }

  if (pathname === "/api/agent/test" && method === "POST") {
    const agent = (body.agent || {}) as Parameters<typeof answerLocally>[0];
    const messages = Array.isArray(body.messages) ? body.messages as Parameters<typeof answerLocally>[1] : [];
    const status = await desktop().getOpenAIStatus();
    if (status.configured) {
      try {
        const input = messages.map((item) => `${item.role === "assistant" ? "Менеджер" : "Клиент"}: ${item.content || ""}`).join("\n");
        const result = await desktop().askOpenAI({ instructions: buildSalesSdrPrompt(agent), input });
        return json({ answer: result.text, model: result.model, engine: "cloud" });
      } catch { /* The local model remains a safe fallback. */ }
    }
    return json(answerLocally(agent, messages));
  }

  if (pathname === "/api/admin/ai") {
    if (method === "GET") return json(await desktop().getOpenAIStatus());
    if (method === "POST") {
      try { return json(await desktop().setOpenAIKey(String(body.apiKey || ""))); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "Не удалось подключить OpenAI" }, 400); }
    }
    if (method === "DELETE") {
      await desktop().deleteOpenAIKey();
      return json({ configured: false });
    }
  }

  if (pathname === "/api/admin") {
    if (method === "GET") return json(await localAdminSnapshot());
    if (method === "POST") {
      if (body.action === "create_key") {
        const keys = await getArray<JsonRecord>("license-keys");
        const durationDays = [7, 30, 90].includes(Number(body.durationDays)) ? Number(body.durationDays) : 30;
        const rawKey = `LP${durationDays}-${crypto.randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase().match(/.{1,4}/g)?.join("-")}`;
        await desktop().storeSet("license-keys", [{ id: Date.now(), durationDays, state: "available", redeemedBy: null, redeemedAt: null, createdAt: new Date().toISOString() }, ...keys]);
        return json({ rawKey, snapshot: await localAdminSnapshot() });
      }
      return json({ snapshot: await localAdminSnapshot() });
    }
  }

  if (pathname === "/api/telegram/session" && method === "GET") return json({ configured: false, connected: false });
  if (pathname === "/api/telegram/chats" && method === "POST") return json({ ok: false, error: "Используйте подключённый desktop Telegram" }, 409);
  return json({ error: `Локальный маршрут ${pathname} пока не реализован` }, 404);
}

export async function installDesktopApiAdapter() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, window.location.href);
    if (url.pathname.startsWith("/api/")) return routeApi(url.pathname, String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase(), init);
    return originalFetch(input, init);
  };
}

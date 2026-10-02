"use client";

import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserTelegramAccount,
  BrowserTelegramAccountId,
  BrowserTelegramDialog,
  BrowserTelegramCandidate,
  BrowserTelegramMessage,
  cancelBrowserTelegramLogin,
  clearBrowserTelegram,
  getAvailableBrowserTelegramAccountId,
  getBrowserTelegramAccounts,
  getBrowserTelegramCandidates,
  getBrowserTelegramDialogs,
  getBrowserTelegramMessages,
  hasBrowserTelegramSession,
  loginBrowserTelegram,
  loginBrowserTelegramWithQr,
  prepareBrowserTelegram,
  restoreBrowserTelegram,
  sendBrowserTelegramMessage,
} from "./telegram-browser";
import { isClientAcquisitionAgent } from "./local-ai";

type View = "overview" | "leads" | "chats" | "analytics" | "profile" | "settings" | "admin";
type Modal = "lead" | "agent" | "agent-test" | "plans" | "recovery" | "telegram-connect" | null;
type LeadStatus = "new" | "contacted" | "qualified";
type PipelineStage = "found" | "contacted" | "replied" | "interested" | "call" | "deal" | "rejected";
type Theme = "dark" | "light" | "system";
type IconName = "home" | "users" | "user" | "chat" | "settings" | "bell" | "plus" | "pause" | "play" | "arrow" | "search" | "filter" | "chevron" | "close" | "send" | "back" | "check" | "more" | "star" | "briefcase" | "logout" | "eye" | "clock" | "trend" | "target" | "bolt" | "inbox" | "calendar" | "palette" | "telegram" | "shield" | "refresh" | "link" | "sun" | "moon" | "monitor" | "crown" | "key" | "ban" | "card" | "building" | "activity" | "copy";

type Lead = {
  id: number;
  initials: string;
  name: string;
  request: string;
  source: "Telegram" | "LinkedIn" | "Email";
  channel: string;
  time: string;
  score: number;
  tone: string;
  status: LeadStatus;
  stage: PipelineStage;
  saved: boolean;
};

type AgentProfile = {
  id?: number;
  name: string;
  goal: string;
  source: string;
  language: string;
  company: string;
  services: string;
  knowledge: string;
  tone: string;
  instructions: string;
  keywords: string;
  exclusions: string;
  firstMessage: string;
};

type ApplicantProfile = {
  displayName: string;
  roleTitle: string;
  experience: string;
  portfolioUrl: string;
};

const defaultApplicantProfile: ApplicantProfile = {
  displayName: "Дмитрий",
  roleTitle: "Копирайтер",
  experience: "Коммерческие тексты, посты, сценарии, лендинги и email-рассылки. Умею подстраиваться под Tone of Voice и работать с разными нишами.",
  portfolioUrl: "",
};

const defaultAgents: AgentProfile[] = [
  { id: -1, name: "Lead Hunter", goal: "Отвечать на вопросы и квалифицировать потенциальных клиентов", source: "Telegram", language: "ru", company: "LeadPilot Studio", services: "Разработка сайтов, настройка рекламы и лидогенерация для малого бизнеса.", knowledge: "Первичная консультация бесплатная. Проекты начинаются после короткого брифа. Точную стоимость и сроки подтверждает менеджер после уточнения задачи.", tone: "дружелюбный, уверенный, без давления", instructions: "Пойми задачу по сообщению и в первом ответе предложи короткий звонок на 10–15 минут. Не обещай неизвестные цены и сроки.", keywords: "нужен сайт\nищу агентство\nнужен маркетолог", exclusions: "бесплатно", firstMessage: "Здравствуйте! Увидел ваш запрос — похоже, мы можем помочь. Предлагаю короткий звонок на 10–15 минут, там всё обсудим. Когда вам удобно?" },
  { id: -2, name: "Поиск маркетологов", goal: "Квалифицировать запросы на маркетинговые услуги", source: "Telegram", language: "ru", company: "LeadPilot Studio", services: "Стратегия, контент-маркетинг, рекламные кампании и аналитика.", knowledge: "Работаем с малым бизнесом и онлайн-проектами. Формат и бюджет определяются после брифа.", tone: "деловой и спокойный", instructions: "Задавай не больше одного вопроса за сообщение и сразу предлагай короткий созвон.", keywords: "ищу маркетолога\nнужна реклама", exclusions: "стажировка", firstMessage: "Добрый день! Увидел ваш запрос по маркетингу. Предлагаю созвониться на 10–15 минут и обсудить задачу — когда вам удобно?" },
  { id: -3, name: "Поиск SMM специалистов", goal: "Отвечать на запросы по продвижению в соцсетях", source: "Telegram", language: "ru", company: "LeadPilot Studio", services: "SMM-стратегия, контент-план, оформление и ведение социальных сетей.", knowledge: "Сначала проводится короткий разбор проекта. Коммерческое предложение готовит менеджер.", tone: "живой и профессиональный", instructions: "Не используй канцелярит и длинные списки. В первом сообщении предложи короткий звонок.", keywords: "ищу smm\nведение соцсетей", exclusions: "бесплатно", firstMessage: "Здравствуйте! Увидел ваш запрос по SMM. Давайте созвонимся на 10–15 минут и всё обсудим — когда вам удобно?" },
];

const initialLeads: Lead[] = [
  { id: 1, initials: "АК", name: "Анна Коваль", request: "Ищет SMM-агентство для нового проекта", source: "Telegram", channel: "Marketing HUB", time: "2 мин", score: 94, tone: "plum", status: "new", stage: "found", saved: true },
  { id: 2, initials: "МР", name: "Максим Романов", request: "Нужен лендинг под запуск продукта", source: "Telegram", channel: "Digital вакансии", time: "18 мин", score: 87, tone: "blue", status: "contacted", stage: "replied", saved: false },
  { id: 3, initials: "ДС", name: "Денис Соколов", request: "Ищет команду для настройки отдела продаж", source: "LinkedIn", channel: "B2B founders", time: "41 мин", score: 79, tone: "amber", status: "qualified", stage: "interested", saved: false },
  { id: 4, initials: "ИЛ", name: "Ирина Левина", request: "Требуется дизайн и разработка сайта", source: "Email", channel: "Входящий запрос", time: "1 ч", score: 91, tone: "rose", status: "new", stage: "contacted", saved: true },
  { id: 5, initials: "ОВ", name: "Олег Власов", request: "Нужен подрядчик по лидогенерации", source: "LinkedIn", channel: "SaaS Network", time: "2 ч", score: 83, tone: "green", status: "contacted", stage: "call", saved: false },
  { id: 6, initials: "ЕС", name: "Елена Смирнова", request: "Ищет специалиста для продвижения", source: "Telegram", channel: "Маркетинг без воды", time: "3 ч", score: 72, tone: "slate", status: "new", stage: "deal", saved: false },
];

const baseNav: { id: View; label: string; icon: IconName }[] = [
  { id: "overview", label: "Главная", icon: "home" },
  { id: "leads", label: "Клиенты", icon: "users" },
  { id: "chats", label: "Чаты", icon: "chat" },
  { id: "analytics", label: "Статистика", icon: "trend" },
  { id: "profile", label: "Личный кабинет", icon: "user" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

const statusLabel: Record<LeadStatus, string> = { new: "Новый", contacted: "Связались", qualified: "Подходит" };

export default function DashboardClient({ userName, userEmail, subscriptionExpiresAt, subscriptionPlan, isTrial, isAdmin, signOutPath }: { userName: string; userEmail: string; subscriptionExpiresAt: string; subscriptionPlan: string; isTrial: boolean; isAdmin: boolean; signOutPath: string }) {
  const [view, setView] = useState<View>("overview");
  const [running, setRunning] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedLead, setSelectedLead] = useState<Lead>(initialLeads[0]);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [agents, setAgents] = useState<AgentProfile[]>(defaultAgents);
  const [activeAgent, setActiveAgent] = useState("Lead Hunter");
  const [testAgent, setTestAgent] = useState<AgentProfile>(defaultAgents[0]);
  const [leads, setLeads] = useState(initialLeads);
  const [theme, setTheme] = useState<Theme>("dark");
  const nav = useMemo(() => isAdmin ? [...baseNav, { id: "admin" as View, label: "Админ-панель", icon: "crown" as IconName }] : baseNav, [isAdmin]);
  const mobileNav = useMemo(() => nav.filter((item) => ["overview", "leads", "chats", "analytics", isAdmin ? "admin" : "profile"].includes(item.id)), [nav, isAdmin]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("leadpilot-theme") as Theme | null;
    const nextTheme = savedTheme && ["dark", "light", "system"].includes(savedTheme) ? savedTheme : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { agents?: AgentProfile[] };
      if (!cancelled && data.agents?.length) {
        setAgents((current) => [...data.agents!, ...current.filter((agent) => !data.agents!.some((saved) => saved.name === agent.name))]);
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  function applyTheme(nextTheme: Theme) {
    const resolved = nextTheme === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : nextTheme;
    document.documentElement.dataset.theme = resolved;
  }

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem("leadpilot-theme", nextTheme);
    applyTheme(nextTheme);
    flash(nextTheme === "light" ? "Светлая тема включена" : nextTheme === "dark" ? "Тёмная тема включена" : "Используется системная тема");
  }

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  }

  function openLead(lead: Lead) {
    setSelectedLead(lead);
    setModal("lead");
    void recordEvent("lead_opened", activeAgent, `${lead.name}: ${lead.request}`);
  }

  async function recordEvent(eventType: string, agentName?: string, details?: string) {
    try {
      await fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyName: userName, eventType, agentName, details }) });
    } catch { /* Activity logging must never block the interface. */ }
  }

  function go(viewName: View) {
    setView(viewName);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }

  function toggleSaved(id: number) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, saved: !lead.saved } : lead));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Основное меню">{nav.map((item) => <button key={item.id} onClick={() => go(item.id)} className={view === item.id ? "active" : ""}><Icon name={item.icon} /><span>{item.label}</span>{item.id === "chats" && <em>4</em>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="usage"><div><span>{isAdmin ? "Режим администратора" : "Лимит сообщений"}</span><b>{isAdmin ? "Без ограничений" : "1 247 / 2 000"}</b></div>{!isAdmin && <div className="usage-track"><i /></div>}<button onClick={() => isAdmin ? go("admin") : setModal("plans")}>{isAdmin ? "Админ-панель" : `Доступ до ${subscriptionExpiresAt}`} <Icon name="arrow" /></button></div>
          <div className="profile-wrap"><button className="profile" onClick={() => setProfileOpen(!profileOpen)}><Avatar initials={getInitials(userName)} tone="slate" /><span><strong>{userName}</strong><small>{userEmail}</small></span><Icon name="more" /></button>{profileOpen && <div className="popover profile-menu"><button onClick={() => { go("profile"); flash("Личный кабинет открыт"); }}><Icon name="user" /> Личный кабинет</button>{isAdmin && <button onClick={() => go("admin")}><Icon name="crown" /> Админ-панель</button>}<button onClick={() => { window.location.href = signOutPath; }}><Icon name="logout" /> Выйти</button></div>}</div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="page-heading"><h1>{nav.find((n) => n.id === view)?.label}</h1><p>{view === "overview" ? "Обзор твоих агентов и активности" : pageSubtitle(view)}</p></div>
          <div className="header-actions">
            <button className="date-pill" onClick={() => flash("Открыт календарь активности")}><span>04 / 08 / 2026</span><Icon name="calendar" /></button>
            <div className="notification-wrap"><button className="icon-button" aria-label="Уведомления" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}><Icon name="bell" /><i /></button>{notificationsOpen && <Notifications close={() => setNotificationsOpen(false)} flash={flash} />}</div>
          </div>
        </header>

        <div className="view-enter" key={view}>
          {view === "overview" && <Overview agents={agents} activeAgent={activeAgent} setActiveAgent={setActiveAgent} running={running} setRunning={setRunning} leads={leads} openLead={openLead} go={go} openAgent={() => setModal("agent")} openAgentTest={(agent) => { setTestAgent(agent); setModal("agent-test"); }} onActivity={recordEvent} />}
          {view === "leads" && <LeadsPage leads={leads} openLead={openLead} toggleSaved={toggleSaved} flash={flash} onActivity={recordEvent} />}
          {view === "chats" && <ChatsPage leads={leads} agents={agents} activeAgentName={activeAgent} isAdmin={isAdmin} flash={flash} onActivity={recordEvent} openTelegramConnect={() => setModal("telegram-connect")} />}
          {view === "analytics" && <AnalyticsPage leads={leads} flash={flash} />}
          {view === "profile" && <ProfilePage userName={userName} userEmail={userEmail} subscriptionExpiresAt={subscriptionExpiresAt} subscriptionPlan={subscriptionPlan} isTrial={isTrial} isAdmin={isAdmin} openPlans={() => setModal("plans")} flash={flash} />}
          {view === "settings" && <SettingsPage activeAgent={activeAgent} flash={flash} theme={theme} setTheme={changeTheme} onActivity={recordEvent} openTelegramConnect={() => setModal("telegram-connect")} />}
          {view === "admin" && isAdmin && <AdminPage flash={flash} />}
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Мобильное меню">{mobileNav.map((item) => <button key={item.id} onClick={() => go(item.id)} className={view === item.id ? "active" : ""}><Icon name={item.icon} /><small>{item.id === "profile" ? "Кабинет" : item.id === "admin" ? "Админ" : item.label}</small>{item.id === "chats" && <em>4</em>}</button>)}</nav>
      {toast && <Toast text={toast} />}
      {modal === "lead" && <LeadModal lead={selectedLead} close={() => setModal(null)} chat={() => { setModal(null); setView("chats"); }} toggleSaved={() => { toggleSaved(selectedLead.id); setSelectedLead((lead) => ({ ...lead, saved: !lead.saved })); }} />}
      {modal === "agent" && <AgentModal close={() => setModal(null)} create={(agent) => { setAgents((current) => [agent, ...current]); setActiveAgent(agent.name); setTestAgent(agent); setModal("agent-test"); void fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(agent) }); void recordEvent("agent_created", agent.name, "Создан новый ИИ-агент"); flash(`Агент «${agent.name}» создан — проверьте его ответ`); }} />}
      {modal === "agent-test" && <AgentTestModal agent={testAgent} close={() => setModal(null)} />}
      {modal === "plans" && <PlansModal close={() => setModal(null)} select={(plan) => { setModal(null); void recordEvent("plan_interest", undefined, plan); flash(`Тариф ${plan} выбран — подключение оплаты добавим следующим этапом`); }} />}
      {modal === "telegram-connect" && <TelegramConnectModal close={() => setModal(null)} flash={flash} />}
    </main>
  );
}

function pageSubtitle(view: View) {
  if (view === "leads") return "Находите сильные запросы и управляйте их статусами.";
  if (view === "chats") return "Продолжайте диалоги, которые начал агент.";
  if (view === "analytics") return "Конверсия, источники и результат каждого агента.";
  if (view === "profile") return "Профиль компании, тариф и безопасность аккаунта.";
  if (view === "admin") return "Управление доступом, подписками и активностью компаний.";
  return "Настройте поиск, ответы и ограничения агента.";
}

function Brand() { return <div className="brand" aria-label="LeadPilot"><span className="brand-mark" aria-hidden="true"><Icon name="target" /></span><span className="brand-wordmark">LeadPilot</span></div>; }

function Overview({ agents, activeAgent, setActiveAgent, running, setRunning, leads, openLead, go, openAgent, openAgentTest, onActivity }: { agents: AgentProfile[]; activeAgent: string; setActiveAgent: (s: string) => void; running: boolean; setRunning: (v: boolean) => void; leads: Lead[]; openLead: (l: Lead) => void; go: (v: View) => void; openAgent: () => void; openAgentTest: (agent: AgentProfile) => void; onActivity: (eventType: string, agentName?: string, details?: string) => Promise<void> }) {
  const [secondaryAgents, setSecondaryAgents] = useState([true, false]);
  const visibleAgents = agents.slice(0, 6);
  const agentRows = visibleAgents.map((agent, index) => ({
    profile: agent,
    name: agent.name,
    chats: index === 0 ? 54 : index === 1 ? 37 : index === 2 ? 17 : 0,
    messages: index === 0 ? 129 : index === 1 ? 98 : index === 2 ? 45 : 0,
    clients: index === 0 ? 7 : index === 1 ? 6 : index === 2 ? 2 : 0,
    active: index === 0 ? running : secondaryAgents[index - 1] ?? false,
  }));

  function toggleAgent(index: number) {
    const nextActive = !agentRows[index].active;
    void onActivity(nextActive ? "agent_started" : "agent_paused", agentRows[index].name, nextActive ? "Агент запущен" : "Агент поставлен на паузу");
    if (index === 0) return setRunning(!running);
    setSecondaryAgents((current) => Array.from({ length: Math.max(current.length, index) }, (_, itemIndex) => itemIndex === index - 1 ? !(current[itemIndex] ?? false) : (current[itemIndex] ?? false)));
  }

  return <div className="dashboard">
    <section className="command-deck stagger-1">
      <div className="command-copy"><span className="command-index">LIVE / 04 AUG</span><h2>Поиск идёт.<br /><em>Спрос уже найден.</em></h2><p>Три агента следят за 42 источниками и передают сильные запросы команде.</p></div>
      <div className="command-status"><span className={running ? "live-orbit active" : "live-orbit"}><i /><b>{running ? "ON" : "OFF"}</b></span><div className="command-status-copy"><small>ОСНОВНОЙ КОНТУР</small><strong>{running ? "В работе" : "На паузе"}</strong><p>{running ? "Следующая проверка через 00:24" : "Поиск временно остановлен"}</p></div><button className={running ? "secondary" : "primary"} onClick={() => { setRunning(!running); void onActivity(running ? "agent_paused" : "agent_started", activeAgent); }}><Icon name={running ? "pause" : "play"} />{running ? "Пауза" : "Запустить"}</button></div>
    </section>

    <section className="metrics metrics-four stagger-1"><Metric icon="users" label="Активных агентов" value={String(agentRows.filter((agent) => agent.active).length)} change="+1 за сегодня" /><Metric icon="chat" label="Всего чатов" value="128" change="+32 за сегодня" /><Metric icon="send" label="Сообщений отправлено" value="347" change="+74 за сегодня" /><Metric icon="target" label="Новых клиентов" value="18" change="+5 за сегодня" /></section>

    <section className="agents-board surface stagger-2">
      <div className="section-title"><div><h2>Мои агенты</h2><p>Управляй поиском и нагрузкой каждого агента</p></div><button className="primary compact-primary" onClick={openAgent}><Icon name="plus" /> Создать агента</button></div>
      <div className="agents-table">{agentRows.map((agent, index) => <article className="agent-row" key={`${agent.name}-${index}`}>
        <span className={`agent-symbol ${agent.active ? "is-running" : ""}`}>{agent.active ? <Icon name="users" /> : <Icon name="pause" />}<i /></span>
        <button className="agent-name" onClick={() => setActiveAgent(agent.name)}><strong>{agent.name}</strong><small className={agent.active ? "online" : "paused"}>{agent.active ? "Активен" : "Пауза"}</small></button>
        <span className="agent-count"><small>Чатов</small><b>{agent.chats}</b></span>
        <span className="agent-count"><small>Сообщений</small><b>{agent.messages}</b></span>
        <span className="agent-count"><small>Новых клиентов</small><b>{agent.clients}</b></span>
        <button className="agent-test-button" onClick={() => openAgentTest(agent.profile)}><Icon name="chat" /> Тест ИИ</button>
        <button className={`switch-control ${agent.active ? "on" : ""}`} aria-label={agent.active ? "Поставить агента на паузу" : "Запустить агента"} onClick={() => toggleAgent(index)}><i /></button>
        <button className="row-menu" aria-label="Меню агента" onClick={() => setActiveAgent(agent.name)}><Icon name="more" /></button>
      </article>)}</div>
    </section>

    <section className="recent surface stagger-3"><div className="section-title"><div><h2>Последняя активность</h2><p>Свежие события по всем агентам</p></div><button className="text-button" onClick={() => go("leads")}>Смотреть все <Icon name="arrow" /></button></div><div className="lead-table">{leads.slice(0, 3).map((lead) => <button className="lead-row" key={lead.id} onClick={() => openLead(lead)}><Avatar initials={lead.initials} tone={lead.tone} /><span className="lead-name"><strong>{lead.name}</strong><small>{lead.source} · {lead.channel}</small></span><span className="lead-request">{lead.request}</span><span className={`status-chip ${lead.status}`}>{statusLabel[lead.status]}</span><span className="match-score"><b>{lead.score}%</b><i><em style={{ width: `${lead.score}%` }} /></i></span><time>{lead.time}</time><Icon name="chevron" /></button>)}</div></section>
  </div>;
}

function Metric({ icon, label, value, change }: { icon: IconName; label: string; value: string; change: string }) { return <article className="metric surface"><div className="metric-head"><span><Icon name={icon} /></span><b>{label}</b></div><strong>{value}</strong><p><i>{change}</i></p></article>; }

const pipelineStages: { id: PipelineStage; label: string; short: string }[] = [
  { id: "found", label: "Найден", short: "Найден" },
  { id: "contacted", label: "Написали", short: "Написали" },
  { id: "replied", label: "Ответил", short: "Ответил" },
  { id: "interested", label: "Заинтересован", short: "Интерес" },
  { id: "call", label: "Созвон", short: "Созвон" },
  { id: "deal", label: "Сделка", short: "Сделка" },
  { id: "rejected", label: "Отказ", short: "Отказ" },
];

function LeadsPage({ leads, openLead, toggleSaved, flash, onActivity }: { leads: Lead[]; openLead: (l: Lead) => void; toggleSaved: (id: number) => void; flash: (message: string) => void; onActivity: (eventType: string, agentName?: string, details?: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [source, setSource] = useState("all");
  const [score, setScore] = useState("0");
  const [sort, setSort] = useState("score");
  const [savedOnly, setSavedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<"list" | "pipeline">("list");
  const [stages, setStages] = useState<Record<number, PipelineStage>>(() => Object.fromEntries(leads.map((lead) => [lead.id, lead.stage])));

  const filtered = useMemo(() => {
    const result = leads.filter((lead) => {
      const text = `${lead.name} ${lead.request} ${lead.channel}`.toLowerCase();
      return text.includes(query.toLowerCase()) && (status === "all" || lead.status === status) && (source === "all" || lead.source === source) && lead.score >= Number(score) && (!savedOnly || lead.saved);
    });
    return [...result].sort((a, b) => sort === "score" ? b.score - a.score : sort === "new" ? a.id - b.id : a.name.localeCompare(b.name));
  }, [leads, query, status, source, score, sort, savedOnly]);

  function reset() { setQuery(""); setStatus("all"); setSource("all"); setScore("0"); setSort("score"); setSavedOnly(false); }

  function moveLead(lead: Lead, direction: -1 | 1) {
    const current = stages[lead.id] || lead.stage;
    const index = pipelineStages.findIndex((stage) => stage.id === current);
    const next = pipelineStages[Math.max(0, Math.min(pipelineStages.length - 1, index + direction))];
    if (!next || next.id === current) return;
    setStages((value) => ({ ...value, [lead.id]: next.id }));
    void onActivity("lead_stage_changed", lead.name, `${pipelineStages[index].label} → ${next.label}`);
    flash(`${lead.name}: этап «${next.label}»`);
  }

  function exportCsv() {
    const rows = [["Имя", "Запрос", "Источник", "Канал", "Совпадение", "Этап"], ...filtered.map((lead) => [lead.name, lead.request, lead.source, lead.channel, `${lead.score}%`, pipelineStages.find((stage) => stage.id === (stages[lead.id] || lead.stage))?.label || "Найден"])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "leadpilot-clients.csv"; anchor.click(); URL.revokeObjectURL(url);
    flash("Список клиентов скачан");
  }

  return <div className="leads-page">
    <section className="filter-bar surface"><div className="search-field"><Icon name="search" /><input aria-label="Поиск лидов" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Имя, запрос или канал" />{query && <button aria-label="Очистить поиск" onClick={() => setQuery("")}><Icon name="close" /></button>}</div><button className={`secondary mobile-filter ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" /> Фильтры</button><div className={`desktop-filters ${filtersOpen ? "show" : ""}`}><Select value={source} setValue={setSource} label="Источник" options={[{ value: "all", label: "Все источники" }, { value: "Telegram", label: "Telegram" }, { value: "LinkedIn", label: "LinkedIn" }, { value: "Email", label: "Email" }]} /><Select value={score} setValue={setScore} label="Совпадение" options={[{ value: "0", label: "Любое совпадение" }, { value: "80", label: "От 80%" }, { value: "90", label: "От 90%" }]} /><Select value={sort} setValue={setSort} label="Сортировка" options={[{ value: "score", label: "Сначала точные" }, { value: "new", label: "Сначала новые" }, { value: "name", label: "По имени" }]} /></div></section>
    <section className="lead-tabs"><div className="segmented status-tabs">{(["all", "new", "contacted", "qualified"] as const).map((item) => <button key={item} onClick={() => setStatus(item)} className={status === item ? "active" : ""}>{item === "all" ? "Все" : statusLabel[item]}<span>{item === "all" ? leads.length : leads.filter((l) => l.status === item).length}</span></button>)}</div><label className="saved-toggle"><input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} /><Icon name="star" /> Сохранённые</label></section>
    <div className="results-head"><span>Найдено: <b>{filtered.length}</b></span><div className="lead-view-actions">{(query || status !== "all" || source !== "all" || score !== "0" || savedOnly) && <button className="text-button" onClick={reset}>Сбросить</button>}<button className="secondary export-button" onClick={exportCsv}><Icon name="inbox" /> CSV</button><div className="view-toggle"><button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")}><Icon name="users" /> Список</button><button className={layout === "pipeline" ? "active" : ""} onClick={() => setLayout("pipeline")}><Icon name="trend" /> Воронка</button></div></div></div>
    {filtered.length && layout === "list" ? <section className="lead-grid">{filtered.map((lead, index) => <article className="lead-card surface" key={lead.id} style={{ animationDelay: `${index * 45}ms` }}><div className="lead-card-top"><Avatar initials={lead.initials} tone={lead.tone} /><span><strong>{lead.name}</strong><small>{lead.source} · {lead.channel}</small></span><button aria-label={lead.saved ? "Убрать из сохранённых" : "Сохранить лид"} className={lead.saved ? "saved" : ""} onClick={() => toggleSaved(lead.id)}><Icon name="star" /></button></div><p>{lead.request}</p><div className="lead-meta"><span className={`status-chip ${lead.status}`}>{pipelineStages.find((stage) => stage.id === (stages[lead.id] || lead.stage))?.label}</span><span className="score-pill">{lead.score}% совпадение</span><time>{lead.time}</time></div><div className="lead-card-actions"><button aria-label="Предыдущий этап" onClick={() => moveLead(lead, -1)}><Icon name="back" /></button><button className="card-action" onClick={() => openLead(lead)}>Открыть <Icon name="arrow" /></button><button aria-label="Следующий этап" onClick={() => moveLead(lead, 1)}><Icon name="arrow" /></button></div></article>)}</section> : null}
    {filtered.length && layout === "pipeline" ? <section className="pipeline-board">{pipelineStages.map((stage) => { const items = filtered.filter((lead) => (stages[lead.id] || lead.stage) === stage.id); return <div className={`pipeline-column stage-${stage.id}`} key={stage.id}><header><span><i />{stage.label}</span><b>{items.length}</b></header><div>{items.map((lead) => <article className="pipeline-card surface" key={lead.id}><button className="pipeline-main" onClick={() => openLead(lead)}><span><Avatar initials={lead.initials} tone={lead.tone} /><b>{lead.name}</b></span><p>{lead.request}</p><small>{lead.source} · {lead.score}%</small></button><footer><button disabled={stage.id === "found"} onClick={() => moveLead(lead, -1)}><Icon name="back" /></button><span>{stage.short}</span><button disabled={stage.id === "rejected"} onClick={() => moveLead(lead, 1)}><Icon name="arrow" /></button></footer></article>)}</div></div>; })}</section> : null}
    {!filtered.length && <EmptyState reset={reset} />}
    {layout === "list" && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}><Icon name="back" /></button><span>Страница {page} из 3</span><button onClick={() => setPage(Math.min(3, page + 1))}><Icon name="arrow" /></button></div>}
  </div>;
}

function AnalyticsPage({ leads, flash }: { leads: Lead[]; flash: (message: string) => void }) {
  const [period, setPeriod] = useState("7");
  const multipliers: Record<string, number> = { "7": 1, "30": 3.7, "90": 9.2 };
  const factor = multipliers[period];
  const funnel = [{ label: "Найдено", value: Math.round(432 * factor), width: 100 }, { label: "Начат диалог", value: Math.round(286 * factor), width: 72 }, { label: "Получен ответ", value: Math.round(168 * factor), width: 51 }, { label: "Заинтересованы", value: Math.round(71 * factor), width: 31 }, { label: "Сделки", value: Math.round(24 * factor), width: 18 }];
  return <div className="analytics-page"><section className="analytics-toolbar surface"><div><b>Результаты за период</b><span>Обновлено только что</span></div><div className="period-switch">{["7", "30", "90"].map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item} дней</button>)}</div><button className="secondary" onClick={() => flash("Отчёт подготовлен к скачиванию")}><Icon name="inbox" /> Отчёт</button></section><section className="metrics metrics-four"><Metric icon="chat" label="Найдено запросов" value={String(Math.round(432 * factor))} change="+19% к прошлому периоду" /><Metric icon="send" label="Ответов получено" value={String(Math.round(168 * factor))} change="+27% к прошлому периоду" /><Metric icon="target" label="Новых клиентов" value={String(Math.round(56 * factor))} change="+33% к прошлому периоду" /><Metric icon="trend" label="Конверсия" value="13.0%" change="+4.1% к прошлому периоду" /></section><div className="analytics-grid"><section className="surface chart-card"><div className="section-title"><div><h2>Активность поиска</h2><p>Найденные запросы по дням</p></div><span className="live-badge"><i /> Рост 19%</span></div><div className="line-chart"><div className="chart-grid"><i /><i /><i /><i /></div><svg viewBox="0 0 600 190" preserveAspectRatio="none" aria-label="График активности"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path className="chart-area" d="M0 165 L85 112 L170 121 L255 76 L340 134 L425 70 L510 49 L600 19 L600 190 L0 190 Z"/><path className="chart-line" d="M0 165 L85 112 L170 121 L255 76 L340 134 L425 70 L510 49 L600 19"/></svg><div className="chart-days"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div></div></section><section className="surface funnel-card"><div className="section-title"><div><h2>Воронка продаж</h2><p>От найденного запроса до сделки</p></div></div><div className="funnel-list">{funnel.map((item) => <div key={item.label}><span><b>{item.label}</b><em>{item.value}</em></span><i><b style={{ width: `${item.width}%` }} /></i></div>)}</div></section></div><section className="surface source-card"><div className="section-title"><div><h2>Источники и агенты</h2><p>Кто приносит больше сильных клиентов</p></div></div><div className="source-grid"><article><span className="source-icon telegram"><Icon name="telegram" /></span><div><b>Telegram</b><small>{leads.filter((lead) => lead.source === "Telegram").length} активных лидов</small></div><strong>58%</strong><i><b style={{ width: "58%" }} /></i></article><article><span className="source-icon linkedin">in</span><div><b>LinkedIn</b><small>{leads.filter((lead) => lead.source === "LinkedIn").length} активных лида</small></div><strong>29%</strong><i><b style={{ width: "29%" }} /></i></article><article><span className="source-icon email"><Icon name="inbox" /></span><div><b>Email</b><small>{leads.filter((lead) => lead.source === "Email").length} активный лид</small></div><strong>13%</strong><i><b style={{ width: "13%" }} /></i></article></div></section></div>;
}

function Select({ value, setValue, label, options }: { value: string; setValue: (value: string) => void; label: string; options: { value: string; label: string }[] }) { return <label className="select-wrap"><span>{label}</span><select value={value} onChange={(e) => setValue(e.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Icon name="chevron" /></label>; }

function EmptyState({ reset }: { reset: () => void }) { return <section className="empty surface"><span><Icon name="search" /></span><h3>Лиды не найдены</h3><p>Попробуйте изменить запрос или убрать часть фильтров.</p><button className="secondary" onClick={reset}>Сбросить фильтры</button></section>; }

type ChatWorkspaceMode = "dialogs" | "scanner";
type TelegramDialogAccountFilter = "all" | BrowserTelegramAccountId;
type TelegramSourceLocationFilter = "all" | "main" | "archive" | `folder:${BrowserTelegramAccountId}:${number}`;
type ScannerConfig = {
  agentName: string;
  accountAgentNames: Record<string, string>;
  selectedDialogIds: string[];
  scanAllSources: boolean;
  threshold: number;
  dailyLimit: number;
  autoSend: boolean;
  running: boolean;
  applicationEnabled: boolean;
};
type MatchResponse = { match: boolean; score: number; reason: string; firstMessage: string; kind?: "client" | "vacancy"; error?: string; model?: string; engine?: "local" | "cloud" };
type ScannerResult = {
  key: string;
  candidate: BrowserTelegramCandidate;
  agentName: string;
  accountLabel: string;
  score: number;
  reason: string;
  firstMessage: string;
  kind: "client" | "vacancy";
  status: "ready" | "sent" | "rejected" | "unreachable" | "skipped" | "error";
  issue?: { title: string; explanation: string; action: string };
};

function explainDeliveryIssue(reason: unknown): { status: "skipped" | "error"; title: string; explanation: string; action: string } {
  const raw = reason instanceof Error ? reason.message : String(reason || "");
  if (/уже писали|последние 30 дней/i.test(raw)) return { status: "skipped", title: "Повторный отклик остановлен", explanation: "Этому контакту уже отправляли сообщение за последние 30 дней.", action: "Ничего делать не нужно: LeadPilot защищает аккаунт от дублей." };
  if (/дневной лимит/i.test(raw)) return { status: "skipped", title: "Дневной лимит исчерпан", explanation: raw, action: "Дождитесь следующего дня или увеличьте лимит в настройках агента." };
  if (/Could not find the input entity|PeerUser|INPUT_USER/i.test(raw)) return { status: "error", title: "Telegram не открыл личный чат", explanation: "Пост доступен, но Telegram не передал данные, необходимые для отправки сообщения этому автору.", action: "Откройте профиль автора из исходного чата и начните диалог вручную; после этого агент сможет писать." };
  if (/USER_PRIVACY_RESTRICTED|privacy|скрыт профиль/i.test(raw)) return { status: "error", title: "Личные сообщения закрыты", explanation: "Настройки приватности автора не разрешают написать ему первым.", action: "Используйте контакт из текста вакансии или ответьте в исходном чате." };
  if (/FLOOD_WAIT|PEER_FLOOD|Too many requests/i.test(raw)) return { status: "error", title: "Telegram ограничил отправку", explanation: "Аккаунт временно достиг безопасного лимита Telegram.", action: "Остановите автоотправку и повторите позже, не повышая темп." };
  if (/AUTH_KEY|SESSION_(?:REVOKED|EXPIRED)|сессия не найдена/i.test(raw)) return { status: "error", title: "Сессия Telegram недоступна", explanation: "Подключение этого Telegram-аккаунта истекло или было отозвано.", action: "Переподключите аккаунт через QR-код в настройках." };
  if (/network|timeout|timed out|fetch/i.test(raw)) return { status: "error", title: "Нет ответа от сети", explanation: "Telegram не подтвердил отправку за отведённое время.", action: "Проверьте соединение и нажмите «Отправить» ещё раз." };
  return { status: "error", title: "Сообщение не отправлено", explanation: raw || "Telegram не подтвердил отправку сообщения.", action: "Попробуйте повторить отправку или откройте исходный чат." };
}

type ScannerWorkItem = {
  candidate: BrowserTelegramCandidate;
  agent: AgentProfile;
};

const SCANNER_CONFIG_KEY = "leadpilot-scanner-config-v1";
const SCANNER_SEEN_KEY = "leadpilot-scanner-seen-v5";
const SCANNER_CONTACTED_KEY = "leadpilot-scanner-contacted-v1";
const SCANNER_DAILY_KEY = "leadpilot-scanner-daily-v1";
const SCANNER_ALL_CURSOR_KEY = "leadpilot-scanner-all-cursor-v1";

function ChatsPage({ leads, agents, activeAgentName, isAdmin, flash, onActivity, openTelegramConnect }: { leads: Lead[]; agents: AgentProfile[]; activeAgentName: string; isAdmin: boolean; flash: (s: string) => void; onActivity: (eventType: string, agentName?: string, details?: string) => Promise<void>; openTelegramConnect: () => void }) {
  const [workspaceMode, setWorkspaceMode] = useState<ChatWorkspaceMode>("dialogs");
  const [selected, setSelected] = useState(0);
  const [mobileChat, setMobileChat] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [gatewayReady, setGatewayReady] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [telegramAccounts, setTelegramAccounts] = useState<BrowserTelegramAccount[]>([]);
  const [dialogs, setDialogs] = useState<BrowserTelegramDialog[]>([]);
  const [telegramMessages, setTelegramMessages] = useState<BrowserTelegramMessage[]>([]);
  const [accountFilter, setAccountFilter] = useState<TelegramDialogAccountFilter>("all");
  const [dialogLoadErrors, setDialogLoadErrors] = useState<Partial<Record<BrowserTelegramAccountId, string>>>({});
  const [loadingChats, setLoadingChats] = useState(false);
  const [sending, setSending] = useState(false);
  const accountFilterRef = useRef<TelegramDialogAccountFilter>("all");
  const selectedDialogIdRef = useRef("");

  const loadDialogs = useCallback(async () => {
    setLoadingChats(true);
    try {
      const connected = getBrowserTelegramAccounts();
      setTelegramAccounts(connected);
      setBrowserReady(connected.length > 0);
      const dialogGroups: BrowserTelegramDialog[][] = [];
      const failures: Partial<Record<BrowserTelegramAccountId, string>> = {};
      for (const account of connected) {
        try { dialogGroups.push(await getBrowserTelegramDialogs(60, account.id)); }
        catch (reason) { failures[account.id] = reason instanceof Error ? reason.message : "Не удалось загрузить диалоги"; }
      }
      setDialogLoadErrors(failures);
      const connectedIds = new Set(connected.map((account) => account.id));
      let currentFilter = accountFilterRef.current;
      if (currentFilter !== "all" && !connectedIds.has(currentFilter)) {
        currentFilter = "all";
        accountFilterRef.current = "all";
        setAccountFilter("all");
      }
      const items = dialogGroups.flat().sort((left, right) => right.date - left.date);
      setDialogs(items);
      let nextIndex = items.findIndex((item) => item.id === selectedDialogIdRef.current && (currentFilter === "all" || item.accountId === currentFilter));
      if (nextIndex < 0) nextIndex = items.findIndex((item) => currentFilter === "all" || item.accountId === currentFilter);
      setSelected(nextIndex);
      if (nextIndex >= 0) {
        selectedDialogIdRef.current = items[nextIndex].id;
        setTelegramMessages(await getBrowserTelegramMessages(items[nextIndex].entity, 80, 0, items[nextIndex].accountId));
      } else {
        selectedDialogIdRef.current = "";
        setTelegramMessages([]);
      }
      const failedIds = connected.filter((account) => failures[account.id]).map((account) => `Telegram ${account.id}`);
      if (failedIds.length) flash(`${failedIds.join(" и ")} ${failedIds.length > 1 ? "не загрузились" : "не загрузился"}. Нажмите «Обновить» для повторной попытки.`);
    } catch (reason) {
      flash(reason instanceof Error ? reason.message : "Не удалось загрузить диалоги Telegram");
    } finally { setLoadingChats(false); }
  }, [flash]);

  useEffect(() => {
    void fetch("/api/telegram/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setGatewayReady(Boolean(data.configured && data.connected)))
      .catch(() => setGatewayReady(false));
    const refresh = () => {
      const connected = getBrowserTelegramAccounts();
      const available = connected.length > 0 && hasBrowserTelegramSession();
      setTelegramAccounts(connected);
      setBrowserReady(available);
      if (available) void loadDialogs();
    };
    refresh();
    window.addEventListener("leadpilot-telegram-connected", refresh);
    window.addEventListener("leadpilot-telegram-disconnected", refresh);
    return () => {
      window.removeEventListener("leadpilot-telegram-connected", refresh);
      window.removeEventListener("leadpilot-telegram-disconnected", refresh);
    };
  }, [loadDialogs]);

  useEffect(() => {
    if (!browserReady || workspaceMode !== "scanner") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadDialogs();
    }, 4 * 60_000);
    return () => window.clearInterval(timer);
  }, [browserReady, loadDialogs, workspaceMode]);

  async function selectDialog(index: number) {
    const nextDialog = dialogs[index];
    if (!nextDialog) return;
    selectedDialogIdRef.current = nextDialog.id;
    setSelected(index); setMobileChat(true); setLoadingChats(true);
    try { setTelegramMessages(await getBrowserTelegramMessages(nextDialog.entity, 80, 0, nextDialog.accountId)); }
    catch { flash("Не удалось открыть историю этого диалога"); }
    finally { setLoadingChats(false); }
  }

  function changeAccountFilter(nextFilter: TelegramDialogAccountFilter) {
    accountFilterRef.current = nextFilter;
    setAccountFilter(nextFilter);
    const currentDialog = dialogs[selected];
    if (currentDialog && (nextFilter === "all" || currentDialog.accountId === nextFilter)) return;
    const nextIndex = dialogs.findIndex((item) => nextFilter === "all" || item.accountId === nextFilter);
    if (nextIndex >= 0) void selectDialog(nextIndex);
    else {
      selectedDialogIdRef.current = "";
      setSelected(-1);
      setTelegramMessages([]);
      setMobileChat(false);
    }
  }

  async function loadOlderMessages() {
    if (!dialog || !telegramMessages.length) return;
    setLoadingChats(true);
    try {
      const older = await getBrowserTelegramMessages(dialog.entity, 80, Number(telegramMessages[0].id), dialog.accountId);
      setTelegramMessages((current) => [...older.filter((item) => !current.some((existing) => existing.id === item.id)), ...current]);
      if (!older.length) flash("Это начало истории диалога");
    } catch { flash("Не удалось загрузить более старые сообщения"); }
    finally { setLoadingChats(false); }
  }

  const live = gatewayReady || browserReady;
  const accountDialogs = dialogs.filter((dialogItem) => accountFilter === "all" || dialogItem.accountId === accountFilter);
  const visibleDialogs = accountDialogs.filter((dialogItem) => dialogItem.title.toLowerCase().includes(query.toLowerCase()));
  const visible = leads.filter((leadItem) => leadItem.name.toLowerCase().includes(query.toLowerCase()));
  const lead = leads[selected] || leads[0];
  const selectedDialog = selected >= 0 ? dialogs[selected] : undefined;
  const dialog = selectedDialog && (accountFilter === "all" || selectedDialog.accountId === accountFilter) ? selectedDialog : undefined;
  const failedAccounts = telegramAccounts.filter((account) => dialogLoadErrors[account.id] && (accountFilter === "all" || account.id === accountFilter));
  const accountFilterLabel = accountFilter === "all" ? "обоих Telegram-аккаунтов" : `Telegram ${accountFilter}`;

  async function send() {
    if (!draft.trim()) return;
    const message = draft.trim();
    if (browserReady && dialog) {
      setSending(true);
      try {
        await sendBrowserTelegramMessage(dialog.entity, message, dialog.accountId);
        setTelegramMessages((current) => [...current, { id: `local-${Date.now()}`, text: message, outgoing: true, date: Math.floor(Date.now() / 1000) }]);
        setDraft("");
        void onActivity("message_sent", dialog.title, message);
      } catch (reason) { flash(reason instanceof Error ? reason.message : "Telegram не принял сообщение"); }
      finally { setSending(false); }
      return;
    }
    if (!gatewayReady) {
      setSent((current) => [...current, message]);
      setDraft("");
      flash("Демо: сообщение показано в интерфейсе, но не отправлено в Telegram");
      return;
    }
    const response = await fetch("/api/telegram/chats", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: String(lead.id), text: message }) });
    if (!response.ok) return flash("Telegram не принял сообщение — проверьте подключение");
    setSent((current) => [...current, message]); setDraft(""); void onActivity("message_sent", lead.name, message);
  }

  return <div className="chats-stack">
    <section className={`telegram-mode-strip ${live ? "is-live" : "is-demo"}`}><span><Icon name="telegram" /></span><div><small>{browserReady ? "TELEGRAM / МУЛЬТИАККАУНТ" : gatewayReady ? "TELEGRAM / LIVE" : "TELEGRAM / ДЕМО-РЕЖИМ"}</small><b>{browserReady ? (telegramAccounts.length > 1 ? "Telegram 1 и Telegram 2 подключены · выберите аккаунт ниже" : `Telegram ${telegramAccounts[0]?.id || "1"} подключён · можно добавить второй аккаунт`) : gatewayReady ? "Аккаунт подключён — сообщения отправляются в Telegram" : "Здесь пока показаны тестовые диалоги"}</b></div><div className="telegram-strip-actions">{browserReady && telegramAccounts.length < 2 && <button className="primary" onClick={openTelegramConnect}><Icon name="plus" /> Добавить второй</button>}{browserReady && <button className="secondary" onClick={() => void loadDialogs()} disabled={loadingChats}><Icon name="refresh" /> {loadingChats ? "Загрузка…" : "Обновить"}</button>}{!browserReady && !gatewayReady && <button className="primary" onClick={openTelegramConnect}>Подключить аккаунт <Icon name="arrow" /></button>}</div></section>
    <div className="chat-workspace-tabs" role="tablist" aria-label="Режим работы с Telegram"><button role="tab" aria-selected={workspaceMode === "dialogs"} className={workspaceMode === "dialogs" ? "active" : ""} onClick={() => setWorkspaceMode("dialogs")}><Icon name="chat" /> Переписки</button><button role="tab" aria-selected={workspaceMode === "scanner"} className={workspaceMode === "scanner" ? "active" : ""} onClick={() => setWorkspaceMode("scanner")}><Icon name="target" /> Автопоиск <em>NEW</em></button></div>
    {workspaceMode === "scanner" ? <LeadScannerPanel dialogs={dialogs} telegramAccounts={telegramAccounts} browserReady={browserReady} agents={agents} activeAgentName={activeAgentName} isAdmin={isAdmin} flash={flash} onActivity={onActivity} openTelegramConnect={openTelegramConnect} /> : <section className={`chats-page surface ${mobileChat ? "show-chat" : ""}`}>
      <aside className="chat-list">{browserReady && <div className="chat-account-switcher" role="tablist" aria-label="Переписки Telegram-аккаунта"><button role="tab" aria-selected={accountFilter === "all"} className={accountFilter === "all" ? "active" : ""} onClick={() => changeAccountFilter("all")}><span>Все<small>Оба аккаунта</small></span><b>{dialogs.length}</b></button>{telegramAccounts.map((account) => <button role="tab" aria-selected={accountFilter === account.id} className={`${accountFilter === account.id ? "active" : ""} ${dialogLoadErrors[account.id] ? "has-error" : ""}`} onClick={() => changeAccountFilter(account.id)} title={account.label} key={account.id}><span>TG {account.id}<small>{account.username || account.phone || account.label}</small></span><b>{dialogs.filter((item) => item.accountId === account.id).length}</b></button>)}</div>}{failedAccounts.length > 0 && <div className="chat-account-error"><Icon name="activity" /><span><b>Не загрузился {failedAccounts.map((account) => `TG ${account.id}`).join(" и ")}</b><small>Сессия сохранена. Попробуйте загрузить ещё раз.</small></span><button type="button" aria-label="Повторить загрузку" onClick={() => void loadDialogs()}><Icon name="refresh" /></button></div>}<div className="chat-search"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Поиск: ${accountFilterLabel}`} /></div><div className="chat-filter"><span>Диалогов <b>{browserReady ? accountDialogs.length : visible.length}</b></span><span>Непрочитано <b>{browserReady ? accountDialogs.reduce((sum, item) => sum + item.unread, 0) : 4}</b></span></div>{browserReady ? <>{visibleDialogs.map((item) => { const originalIndex = dialogs.findIndex((dialogItem) => dialogItem.id === item.id); return <button onClick={() => void selectDialog(originalIndex)} className={selected === originalIndex ? "selected" : ""} key={item.id}><Avatar initials={item.initials} tone={item.accountId === "1" ? "blue" : "plum"} /><span><strong>{item.title}<em className={`dialog-account-tag account-${item.accountId}`}>TG {item.accountId}</em>{(item.archived || item.folders[0]) && <em className="dialog-location-tag">{item.archived ? "Архив" : item.folders[0].title}</em>}</strong><small>{item.lastMessage}</small></span><time>{item.unread ? `${item.unread} новых` : ""}</time>{item.unread > 0 && <i />}</button>; })}{!visibleDialogs.length && <div className="chat-list-empty"><Icon name="chat" /><b>{query ? "Ничего не найдено" : accountFilter === "all" ? "Нет доступных диалогов" : `Нет диалогов в Telegram ${accountFilter}`}</b><small>{failedAccounts.length ? "Нажмите обновить и проверьте подключение аккаунта." : query ? "Измените запрос поиска." : "Нажмите «Обновить», чтобы загрузить свежие переписки."}</small></div>}</> : visible.map((item) => { const originalIndex = leads.findIndex((leadItem) => leadItem.id === item.id); return <button onClick={() => { setSelected(originalIndex); setMobileChat(true); }} className={selected === originalIndex ? "selected" : ""} key={item.id}><Avatar initials={item.initials} tone={item.tone} /><span><strong>{item.name}</strong><small>{originalIndex === 0 ? "Да, давайте обсудим подробнее" : "Спасибо, посмотрю предложение"}</small></span><time>{originalIndex + 2} мин</time>{originalIndex < 2 && <i />}</button>; })}</aside>
      <div className="conversation">{browserReady && !dialog ? <div className="conversation-empty"><span><Icon name="chat" /></span><small>TELEGRAM / {accountFilter === "all" ? "ВСЕ АККАУНТЫ" : `АККАУНТ ${accountFilter}`}</small><h3>Выберите переписку</h3><p>{failedAccounts.length ? "Диалоги этого аккаунта пока не загрузились. Нажмите «Обновить» и попробуйте снова." : `В ${accountFilterLabel} пока нет доступных диалогов.`}</p><button className="secondary" onClick={() => void loadDialogs()} disabled={loadingChats}><Icon name="refresh" /> {loadingChats ? "Загружаем…" : "Обновить диалоги"}</button></div> : <><div className="conversation-head"><button className="back-chat" aria-label="Назад к диалогам" onClick={() => setMobileChat(false)}><Icon name="back" /></button><Avatar initials={browserReady && dialog ? dialog.initials : lead.initials} tone={browserReady && dialog?.accountId === "2" ? "plum" : browserReady ? "blue" : lead.tone} /><div><strong>{browserReady && dialog ? dialog.title : lead.name}</strong><small><i /> {browserReady && dialog ? `Telegram ${dialog.accountId} · ${dialog.accountLabel}` : "в сети"}</small></div><button aria-label="Действия диалога" onClick={() => flash("Меню диалога открыто")}><Icon name="more" /></button></div><div className="messages">{browserReady && telegramMessages.length > 0 && <button className="load-history" type="button" onClick={() => void loadOlderMessages()} disabled={loadingChats}><Icon name="refresh" /> Загрузить предыдущие сообщения</button>}<div className="day-divider">{browserReady && dialog ? `История · Telegram ${dialog.accountId}` : "История Telegram"}</div>{browserReady ? (loadingChats && !telegramMessages.length ? <div className="telegram-inline-loading"><Icon name="refresh" /> Загружаем сообщения…</div> : telegramMessages.map((message) => <p className={message.outgoing ? "user sent" : "bot"} key={message.id}>{message.text}{message.outgoing && <small>{dialog ? `отправлено через TG ${dialog.accountId}` : "Telegram"}</small>}</p>)) : <><p className="bot">Здравствуйте! Увидел ваш запрос: «{lead.request}». Мы помогаем компаниям находить клиентов и обрабатывать первые ответы.</p><p className="user">Да, актуально. Расскажите, как это работает?</p><p className="bot">Можем показать короткое демо и подобрать сценарий под вашу команду. Удобно созвониться завтра?</p>{sent.map((message, index) => <p className="user sent" key={index}>{message}<small>{gatewayReady ? "доставлено" : "демо · не отправлено"}</small></p>)}</>}</div><form className="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><button type="button" aria-label="Добавить файл" onClick={() => flash("В тестовом режиме доступен только текст")}><Icon name="plus" /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={browserReady && dialog ? `Сообщение от Telegram ${dialog.accountId}…` : "Напишите сообщение..."} disabled={sending || (browserReady && !dialog)} /><button type="submit" className="send" aria-label="Отправить" disabled={sending || !draft.trim()}><Icon name="send" /></button></form></>}</div>
    </section>}
  </div>;
}

function LeadScannerPanel({ dialogs, telegramAccounts, browserReady, agents, activeAgentName, isAdmin, flash, onActivity, openTelegramConnect }: { dialogs: BrowserTelegramDialog[]; telegramAccounts: BrowserTelegramAccount[]; browserReady: boolean; agents: AgentProfile[]; activeAgentName: string; isAdmin: boolean; flash: (s: string) => void; onActivity: (eventType: string, agentName?: string, details?: string) => Promise<void>; openTelegramConnect: () => void }) {
  const secondAgentName = agents.find((item) => item.name !== activeAgentName)?.name || activeAgentName;
  const [config, setConfig] = useState<ScannerConfig>({ agentName: activeAgentName, accountAgentNames: { "1": activeAgentName, "2": secondAgentName }, selectedDialogIds: [], scanAllSources: false, threshold: 85, dailyLimit: 5, autoSend: false, running: false, applicationEnabled: true });
  const [hydrated, setHydrated] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceAccountFilter, setSourceAccountFilter] = useState<TelegramDialogAccountFilter>("all");
  const [sourceLocationFilter, setSourceLocationFilter] = useState<TelegramSourceLocationFilter>("all");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [applicant, setApplicant] = useState<ApplicantProfile>(defaultApplicantProfile);
  const [applicantDraft, setApplicantDraft] = useState<ApplicantProfile>(defaultApplicantProfile);
  const [editingApplicant, setEditingApplicant] = useState(false);
  const [savingApplicant, setSavingApplicant] = useState(false);
  const scanLock = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SCANNER_CONFIG_KEY) || "null") as Partial<ScannerConfig> | null;
      if (saved) setConfig((current) => {
        const legacyName = saved.agentName || activeAgentName;
        return {
          ...current,
          ...saved,
          running: false,
          agentName: legacyName,
          accountAgentNames: {
            ...current.accountAgentNames,
            ...(saved.accountAgentNames || {}),
            "1": saved.accountAgentNames?.["1"] || legacyName,
          },
        };
      });
    } catch { /* Invalid local settings are ignored. */ }
    setHydrated(true);
  }, [activeAgentName]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/applicant-profile", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { profile?: ApplicantProfile };
      if (!cancelled && data.profile) {
        setApplicant(data.profile);
        setApplicantDraft(data.profile);
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SCANNER_CONFIG_KEY, JSON.stringify(config));
  }, [config, hydrated]);

  const sourceDialogs = useMemo(() => dialogs.filter((dialog) => dialog.kind !== "private"), [dialogs]);
  const accountSourceDialogs = useMemo(() => sourceDialogs.filter((dialog) => sourceAccountFilter === "all" || dialog.accountId === sourceAccountFilter), [sourceAccountFilter, sourceDialogs]);
  const sourceFolderOptions = useMemo(() => {
    const options = new Map<TelegramSourceLocationFilter, { value: TelegramSourceLocationFilter; label: string; count: number }>();
    for (const dialog of accountSourceDialogs) {
      for (const folder of dialog.folders) {
        const value = `folder:${dialog.accountId}:${folder.id}` as TelegramSourceLocationFilter;
        const existing = options.get(value);
        if (existing) existing.count += 1;
        else options.set(value, { value, label: `${sourceAccountFilter === "all" ? `TG ${dialog.accountId} · ` : ""}${folder.title}`, count: 1 });
      }
    }
    return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label, "ru"));
  }, [accountSourceDialogs, sourceAccountFilter]);
  const locatedSourceDialogs = useMemo(() => accountSourceDialogs.filter((dialog) => {
    if (sourceLocationFilter === "all") return true;
    if (sourceLocationFilter === "main") return !dialog.archived;
    if (sourceLocationFilter === "archive") return dialog.archived;
    const [, accountId, folderId] = sourceLocationFilter.split(":");
    return dialog.accountId === accountId && dialog.folders.some((folder) => folder.id === Number(folderId));
  }), [accountSourceDialogs, sourceLocationFilter]);
  const visibleSources = useMemo(() => locatedSourceDialogs.filter((dialog) => dialog.title.toLowerCase().includes(sourceQuery.toLowerCase())), [locatedSourceDialogs, sourceQuery]);
  const agentForAccount = useCallback((accountId: BrowserTelegramAccountId) => {
    const assignedName = config.accountAgentNames[accountId] || (accountId === "1" ? config.agentName : "");
    return agents.find((item) => item.name === assignedName) || agents[0];
  }, [agents, config.accountAgentNames, config.agentName]);
  const assignedAgents = useMemo(() => telegramAccounts.map((account) => agentForAccount(account.id)).filter(Boolean) as AgentProfile[], [agentForAccount, telegramAccounts]);
  const primaryAgent = assignedAgents[0] || agents[0];
  const keywords = useMemo(() => Array.from(new Set(assignedAgents.flatMap((item) => splitPhrases(item.keywords)))), [assignedAgents]);
  const selectedSources = useMemo(() => sourceDialogs.filter((dialog) => config.selectedDialogIds.includes(dialog.id)), [sourceDialogs, config.selectedDialogIds]);
  const effectiveSourceCount = config.scanAllSources ? sourceDialogs.length : selectedSources.length;
  const sourceAccountFilterLabel = sourceAccountFilter === "all" ? "обоих аккаунтов" : `Telegram ${sourceAccountFilter}`;
  const sourceLocationFilterLabel = sourceLocationFilter === "all" ? "всех разделов" : sourceLocationFilter === "main" ? "основных чатов" : sourceLocationFilter === "archive" ? "архива" : sourceFolderOptions.find((option) => option.value === sourceLocationFilter)?.label || "выбранной папки";

  useEffect(() => {
    if (sourceLocationFilter.startsWith("folder:") && !sourceFolderOptions.some((option) => option.value === sourceLocationFilter)) setSourceLocationFilter("all");
  }, [sourceFolderOptions, sourceLocationFilter]);

  function changeSourceAccountFilter(nextFilter: TelegramDialogAccountFilter) {
    setSourceAccountFilter(nextFilter);
    setSourceQuery("");
    if (sourceLocationFilter.startsWith("folder:")) setSourceLocationFilter("all");
  }

  async function saveApplicant(event: FormEvent) {
    event.preventDefault();
    setSavingApplicant(true);
    try {
      const response = await fetch("/api/applicant-profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(applicantDraft),
      });
      const data = await response.json().catch(() => null) as { profile?: ApplicantProfile; error?: string } | null;
      if (!response.ok || !data?.profile) throw new Error(data?.error || "Не удалось сохранить профиль");
      setApplicant(data.profile);
      setApplicantDraft(data.profile);
      setEditingApplicant(false);
      window.localStorage.removeItem(SCANNER_SEEN_KEY);
      setResults([]);
      flash("Профиль сохранён — нажмите «Проверить сейчас» для новых откликов");
      void onActivity("applicant_profile_saved", primaryAgent?.name, "Обновлён профиль для откликов на вакансии");
    } catch (reason) {
      flash(reason instanceof Error ? reason.message : "Не удалось сохранить профиль");
    } finally { setSavingApplicant(false); }
  }

  const deliver = useCallback(async (candidate: BrowserTelegramCandidate, text: string, agentName: string) => {
    if (!candidate.canMessage || !candidate.senderEntity) throw new Error("У автора скрыт профиль — написать в личку нельзя");
    const contacted = readRecord(SCANNER_CONTACTED_KEY);
    const previous = Number(contacted[candidate.senderId] || 0);
    if (previous && Date.now() - previous < 30 * 24 * 60 * 60 * 1000) throw new Error("Этому человеку уже писали за последние 30 дней");
    const daily = readDailyCounter();
    if (!isAdmin && daily.count >= config.dailyLimit) throw new Error(`Дневной лимит ${config.dailyLimit} сообщений уже использован`);
    const recipient = candidate.senderUsername ? `@${candidate.senderUsername.replace(/^@/, "")}` : candidate.senderEntity;
    await sendBrowserTelegramMessage(recipient, text, candidate.accountId);
    contacted[candidate.senderId] = Date.now();
    window.localStorage.setItem(SCANNER_CONTACTED_KEY, JSON.stringify(contacted));
    writeDailyCounter(daily.count + 1);
    void onActivity("scanner_message_sent", agentName, `${candidate.senderName} · ${candidate.chatTitle}`);
  }, [config.dailyLimit, isAdmin, onActivity]);

  const runScan = useCallback(async (quiet = false) => {
    if (scanLock.current) return;
    if (!browserReady) { if (!quiet) flash("Сначала подключите Telegram"); return; }
    if (!agents.length) { if (!quiet) flash("Сначала создайте ИИ-агента"); return; }
    if (!effectiveSourceCount) { if (!quiet) flash(config.scanAllSources ? "В Telegram пока нет доступных групп, каналов или ботов" : "Выберите хотя бы один чат, канал или бот"); return; }
    const scanSources = config.scanAllSources ? automaticSourceBatch(sourceDialogs) : selectedSources;

    scanLock.current = true;
    setScanning(true);
    setScanProgress(`${config.scanAllSources ? "Автообход" : "Читаю источники"} 0/${scanSources.length}`);
    const seen = new Set(readStringArray(SCANNER_SEEN_KEY));
    let checked = 0;
    let matched = 0;
    let sentCount = 0;
    let loadedSources = 0;
    let sourceFailures = 0;
    let providerError = "";
    const nextResults: ScannerResult[] = [];

    try {
      const pool: ScannerWorkItem[] = [];
      const nowSeconds = Date.now() / 1000;
      for (const source of scanSources) {
        const sourceAgent = agentForAccount(source.accountId);
        if (!sourceAgent) continue;
        const sourceKeywords = splitPhrases(sourceAgent.keywords);
        const vacancyKeywords = applicantVacancyKeywords(applicant);
        let candidates: BrowserTelegramCandidate[] = [];
        try {
          candidates = await getBrowserTelegramCandidates(source, 30, {
            shouldInclude: (text, date) => {
              const promotionProspect = isSelfPromotionText(text) && isClientAcquisitionAgent(sourceAgent);
              const vacancy = config.applicationEnabled && isVacancyText(text);
              const ageSeconds = date ? Math.max(0, nowSeconds - date) : Number.POSITIVE_INFINITY;
              if (vacancy && ageSeconds >= 5 * 24 * 60 * 60) return false;
              if (!vacancy && date && ageSeconds >= 48 * 60 * 60) return false;
              const relevantKeywords = vacancy ? vacancyKeywords : sourceKeywords;
              return promotionProspect || !relevantKeywords.length || semanticKeywordHits(text, relevantKeywords).length > 0;
            },
          });
        } catch { sourceFailures += 1; }
        loadedSources += 1;
        setScanProgress(`${config.scanAllSources ? "Автообход" : "Читаю источники"} ${loadedSources}/${scanSources.length}`);
        for (const candidate of candidates) {
          const vacancy = isVacancyText(candidate.text);
          const ageSeconds = candidate.date ? Math.max(0, nowSeconds - candidate.date) : Number.POSITIVE_INFINITY;
          if (vacancy && ageSeconds >= 5 * 24 * 60 * 60) continue;
          if (!vacancy && candidate.date && ageSeconds >= 48 * 60 * 60) continue;
          pool.push({ candidate, agent: sourceAgent });
        }
      }
      pool.sort((left, right) => right.candidate.date - left.candidate.date);

      for (const item of pool) {
        if (checked >= 10 || providerError) break;
        const { candidate, agent: candidateAgent } = item;
        const key = `${candidate.accountId}:${candidateAgent.id ?? candidateAgent.name}:${candidate.chatId}:${candidate.id}`;
        if (seen.has(key)) continue;
        const normalized = candidate.text.toLocaleLowerCase();
        const vacancyCandidate = config.applicationEnabled && isVacancyText(candidate.text);
        const promotionProspect = isSelfPromotionText(candidate.text) && isClientAcquisitionAgent(candidateAgent);
        const candidateKeywords = vacancyCandidate ? applicantVacancyKeywords(applicant) : splitPhrases(candidateAgent.keywords);
        const candidateExclusions = vacancyCandidate ? [] : splitPhrases(candidateAgent.exclusions);
        const blocked = candidateExclusions.some((phrase) => {
          const normalizedPhrase = phrase.toLocaleLowerCase().replace(/ё/g, "е").trim();
          if (vacancyCandidate && ["вакансия", "вакансии", "работа", "требуется", "ищем сотрудника"].includes(normalizedPhrase)) return false;
          return normalizedPhrase ? normalized.replace(/ё/g, "е").includes(normalizedPhrase) : false;
        });
        if (blocked) { seen.add(key); continue; }
        const keywordHits = semanticKeywordHits(candidate.text, candidateKeywords);
        if (candidateKeywords.length && !keywordHits.length && !promotionProspect) { seen.add(key); continue; }

        checked += 1;
        setScanProgress(`Создаю отклики ${checked}/10`);
        const response = await fetch("/api/agent/match", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agent: candidateAgent, applicant, applicationEnabled: config.applicationEnabled, candidate: { text: candidate.text, senderName: candidate.senderName, chatTitle: candidate.chatTitle, keywordHits } }),
        });
        const analysis = await response.json().catch(() => null) as MatchResponse | null;
        if (!response.ok || !analysis) {
          providerError = friendlyAiError(analysis?.error);
          nextResults.push({ key, candidate, agentName: candidateAgent.name, accountLabel: candidate.accountLabel, score: 0, reason: providerError, firstMessage: "", kind: vacancyCandidate ? "vacancy" : "client", status: "error" });
          break;
        }

        seen.add(key);
        const isMatch = analysis.match && analysis.score >= config.threshold;
        if (!isMatch) {
          nextResults.push({ key, candidate, agentName: candidateAgent.name, accountLabel: candidate.accountLabel, score: analysis.score, reason: analysis.reason, firstMessage: "", kind: analysis.kind || (vacancyCandidate ? "vacancy" : "client"), status: "rejected" });
          continue;
        }

        matched += 1;
        let status: ScannerResult["status"] = candidate.canMessage ? "ready" : "unreachable";
        const portfolioMissing = analysis.kind === "vacancy" && !applicant.portfolioUrl;
        if (config.autoSend && candidate.canMessage && analysis.firstMessage && !portfolioMissing) {
          try {
            await deliver(candidate, analysis.firstMessage, candidateAgent.name);
            status = "sent";
            sentCount += 1;
          } catch (reason) {
            const issue = explainDeliveryIssue(reason);
            status = issue.status;
            analysis.reason = issue.explanation;
            nextResults.push({ key, candidate, agentName: candidateAgent.name, accountLabel: candidate.accountLabel, score: analysis.score, reason: analysis.reason, firstMessage: analysis.firstMessage, kind: analysis.kind || (vacancyCandidate ? "vacancy" : "client"), status, issue });
            continue;
          }
        }
        nextResults.push({ key, candidate, agentName: candidateAgent.name, accountLabel: candidate.accountLabel, score: analysis.score, reason: portfolioMissing ? `${analysis.reason}. Добавьте ссылку на портфолио перед отправкой` : analysis.reason, firstMessage: analysis.firstMessage, kind: analysis.kind || (vacancyCandidate ? "vacancy" : "client"), status });
      }

      window.localStorage.setItem(SCANNER_SEEN_KEY, JSON.stringify(Array.from(seen).slice(-1000)));
      setResults((current) => [...nextResults, ...current.filter((item) => !nextResults.some((next) => next.key === item.key))].slice(0, 30));
      if (!quiet) {
        if (providerError) flash(providerError);
        else if (!checked && sourceFailures) flash(`Telegram не успел загрузить ${sourceFailures} из ${scanSources.length} источников — нажмите «Проверить сейчас» ещё раз`);
        else if (!checked) flash("Новых сообщений с ключевыми словами пока нет");
        else flash(`Проверено: ${checked} · подходит: ${matched}${sentCount ? ` · отправлено: ${sentCount}` : ""}${config.scanAllSources ? ` · следующий обход продолжит остальные ${Math.max(0, sourceDialogs.length - scanSources.length)}` : ""}`);
      }
      const activeNames = Array.from(new Set(scanSources.map((source) => agentForAccount(source.accountId)?.name).filter(Boolean))).join(" + ");
      void onActivity("scanner_run", activeNames || primaryAgent?.name, `${config.scanAllSources ? `Автообход ${scanSources.length}/${sourceDialogs.length}; ` : ""}проверено ${checked}, совпадений ${matched}, отправлено ${sentCount}`);
    } catch (reason) {
      if (!quiet) flash(reason instanceof Error ? reason.message : "Не удалось проверить выбранные источники");
    } finally {
      scanLock.current = false;
      setScanning(false);
      setScanProgress("");
    }
  }, [agentForAccount, agents.length, applicant, browserReady, config.applicationEnabled, config.autoSend, config.scanAllSources, config.threshold, deliver, effectiveSourceCount, flash, onActivity, primaryAgent, selectedSources, sourceDialogs]);

  useEffect(() => {
    if (!config.running || !browserReady || !effectiveSourceCount) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void runScan(true);
    }, 90_000);
    return () => window.clearInterval(timer);
  }, [browserReady, config.running, effectiveSourceCount, runScan]);

  async function sendResult(result: ScannerResult) {
    if (!result.firstMessage) return;
    if (result.kind === "vacancy" && !applicant.portfolioUrl) {
      setEditingApplicant(true);
      flash("Сначала добавьте ссылку на портфолио");
      return;
    }
    setResults((current) => current.map((item) => item.key === result.key ? { ...item, status: "ready" } : item));
    try {
      await deliver(result.candidate, result.firstMessage, result.agentName);
      setResults((current) => current.map((item) => item.key === result.key ? { ...item, status: "sent" } : item));
      flash(`Сообщение отправлено: ${result.candidate.senderName}`);
    } catch (reason) {
      const issue = explainDeliveryIssue(reason);
      setResults((current) => current.map((item) => item.key === result.key ? { ...item, status: issue.status, reason: issue.explanation, issue } : item));
      flash(issue.title);
    }
  }

  async function copyResult(result: ScannerResult) {
    if (!result.firstMessage) return;
    if (result.kind === "vacancy" && !applicant.portfolioUrl) {
      setEditingApplicant(true);
      flash("Сначала добавьте ссылку на портфолио");
      return;
    }
    try {
      await navigator.clipboard.writeText(result.firstMessage);
      flash("Отклик скопирован — можно отправить вручную");
    } catch { flash("Не удалось скопировать отклик в этом браузере"); }
  }

  function toggleSource(dialogId: string) {
    setConfig((current) => {
      const validIds = current.selectedDialogIds.filter((id) => sourceDialogs.some((dialog) => dialog.id === id));
      const selected = validIds.includes(dialogId);
      if (!selected && validIds.length >= 12) { flash("Для теста можно выбрать до 12 источников"); return { ...current, selectedDialogIds: validIds }; }
      return { ...current, selectedDialogIds: selected ? validIds.filter((id) => id !== dialogId) : [...validIds, dialogId] };
    });
  }

  function toggleAutoSend() {
    if (!config.autoSend && config.applicationEnabled && !applicant.portfolioUrl) {
      setEditingApplicant(true);
      flash("Для автооткликов сначала добавьте ссылку на портфолио");
      return;
    }
    if (!config.autoSend && !window.confirm("LeadPilot сможет отправлять первое сообщение автоматически от вашего Telegram. Включить автоотправку?")) return;
    setConfig((current) => ({ ...current, autoSend: !current.autoSend }));
  }

  function toggleRunning() {
    if (!browserReady) return openTelegramConnect();
    if (!effectiveSourceCount) return flash(config.scanAllSources ? "В Telegram пока нет доступных источников" : "Сначала выберите чаты, каналы или боты");
    setConfig((current) => ({ ...current, running: !current.running }));
    if (!config.running) void runScan(false);
  }

  return <section className="lead-scanner surface">
    <header className="scanner-hero"><span className={`scanner-orbit ${config.running ? "running" : ""}`}><Icon name="target" /></span><div><small>LEAD RADAR / 2 TELEGRAM-АККАУНТА</small><h2>Два Mini AI ищут каждый в своей нише</h2><p>{config.scanAllSources ? `ИИ сам обходит все ${sourceDialogs.length} доступных источников — выбирать чаты не нужно.` : "Каждый Telegram-аккаунт получает своего агента, свои ключевые фразы и свои источники."}</p></div><div className="scanner-hero-status"><span className="mini-ai-badge"><Icon name="bolt" /> MINI AI V4 · БЕЗ API</span><span className={`scanner-state ${config.running ? "on" : ""}`}><i />{config.running ? "РАБОТАЮТ" : "ОСТАНОВЛЕНЫ"}</span></div></header>
    {!browserReady && <div className="scanner-connect"><Icon name="telegram" /><div><b>Подключите Telegram для выбора источников</b><p>После подключения здесь появятся ваши группы, каналы и боты.</p></div><button className="primary" onClick={openTelegramConnect}>Подключить</button></div>}
    <div className="scanner-grid">
      <aside className="scanner-settings">
        <div className="scanner-block account-agent-map"><div className="scanner-block-head"><span>АККАУНТЫ → ИИ-АГЕНТЫ</span><em>{telegramAccounts.length}/2</em></div><div className="account-agent-list">{telegramAccounts.length ? telegramAccounts.map((account) => { const assigned = agentForAccount(account.id); return <label key={account.id}><span><b>Telegram {account.id}</b><small>{account.label}</small></span><select value={assigned?.name || ""} onChange={(event) => setConfig((current) => ({ ...current, agentName: account.id === "1" ? event.target.value : current.agentName, accountAgentNames: { ...current.accountAgentNames, [account.id]: event.target.value } }))}>{agents.map((item) => <option key={item.id ?? item.name} value={item.name}>{item.name}</option>)}</select><em>{splitPhrases(assigned?.keywords).slice(0, 3).join(" · ") || "Ниша определяется профилем агента"}</em></label>; }) : <div className="source-empty">Подключите Telegram — здесь появятся два независимых назначения.</div>}</div>{telegramAccounts.length === 1 && <button type="button" className="add-account-inline" onClick={openTelegramConnect}><Icon name="plus" /> Подключить аккаунт 2</button>}</div>
        <div className="scanner-block"><div className="scanner-block-head"><span>КЛЮЧЕВЫЕ ФРАЗЫ</span><em>{keywords.length}</em></div><div className="keyword-cloud">{keywords.length ? keywords.slice(0, 8).map((keyword) => <b key={keyword}>{keyword}</b>) : <small>Фразы не указаны — ИИ проверит смысл сообщений без предварительного фильтра.</small>}</div></div>
        <div className={`applicant-card ${config.applicationEnabled ? "enabled" : ""}`}><button type="button" className="applicant-toggle" onClick={() => setConfig((current) => ({ ...current, applicationEnabled: !current.applicationEnabled }))}><span><small>ВАКАНСИИ</small><b>Делать отклики</b></span><i className={config.applicationEnabled ? "on" : ""}><em /></i></button>{config.applicationEnabled && (editingApplicant ? <form className="applicant-form" onSubmit={saveApplicant}><label>Имя<input value={applicantDraft.displayName} onChange={(event) => setApplicantDraft((current) => ({ ...current, displayName: event.target.value }))} required /></label><label>Позиционирование<input value={applicantDraft.roleTitle} onChange={(event) => setApplicantDraft((current) => ({ ...current, roleTitle: event.target.value }))} placeholder="Копирайтер" required /></label><label>Опыт и сильные стороны<textarea value={applicantDraft.experience} onChange={(event) => setApplicantDraft((current) => ({ ...current, experience: event.target.value }))} placeholder="Только реальные навыки и форматы работ" required /></label><label>Ссылка на Google Docs с портфолио<input type="url" inputMode="url" value={applicantDraft.portfolioUrl} onChange={(event) => setApplicantDraft((current) => ({ ...current, portfolioUrl: event.target.value }))} placeholder="https://docs.google.com/document/d/..." /></label><div className="applicant-form-actions"><button type="button" onClick={() => { setApplicantDraft(applicant); setEditingApplicant(false); }}>Отмена</button><button className="primary" disabled={savingApplicant}>{savingApplicant ? "Сохраняем…" : "Сохранить"}</button></div></form> : <div className="applicant-summary"><span><b>{applicant.displayName} · {applicant.roleTitle}</b><small>{applicant.portfolioUrl ? "Портфолио подключено" : "Добавьте портфолио перед отправкой"}</small></span><button type="button" onClick={() => setEditingApplicant(true)}><Icon name="settings" /> Изменить</button></div>)}</div>
        <div className="scanner-block source-picker">
          <div className="scanner-block-head"><span>ИСТОЧНИКИ ДЛЯ ПОИСКА</span><em>{config.scanAllSources ? `ИИ · ${sourceDialogs.length}` : `${selectedSources.length}/12`}</em></div>
          <button type="button" className={`scan-all-sources ${config.scanAllSources ? "active" : ""}`} disabled={!browserReady || scanning} onClick={() => setConfig((current) => ({ ...current, scanAllSources: !current.scanAllSources, running: false }))}>
            <span><Icon name="target" /></span><b><small>АВТОВЫБОР ИИ</small>{config.scanAllSources ? "Анализировать все чаты" : "Включить анализ всех чатов"}<em>{config.scanAllSources ? "Ручной выбор не нужен" : "Каналы, группы, боты, архив и папки"}</em></b><i className={config.scanAllSources ? "on" : ""}><em /></i>
          </button>
          {config.scanAllSources && <div className="scan-all-summary"><Icon name="bolt" /><span><b>{sourceDialogs.length} источников под контролем</b><small>TG 1: {sourceDialogs.filter((dialog) => dialog.accountId === "1").length} · TG 2: {sourceDialogs.filter((dialog) => dialog.accountId === "2").length} · архив: {sourceDialogs.filter((dialog) => dialog.archived).length}</small><em>ИИ проверяет по 30 источников за цикл: сначала самые активные, затем по очереди все остальные.</em></span></div>}
          {browserReady && !config.scanAllSources && <div className="source-account-switcher" role="tablist" aria-label="Источники Telegram-аккаунта">
            <button type="button" role="tab" aria-selected={sourceAccountFilter === "all"} className={sourceAccountFilter === "all" ? "active" : ""} onClick={() => changeSourceAccountFilter("all")}><span>Все<small>Оба TG</small></span><b>{selectedSources.length}/{sourceDialogs.length}</b></button>
            {telegramAccounts.map((account) => {
              const accountSources = sourceDialogs.filter((dialog) => dialog.accountId === account.id);
              const selectedCount = accountSources.filter((dialog) => config.selectedDialogIds.includes(dialog.id)).length;
              return <button type="button" role="tab" aria-selected={sourceAccountFilter === account.id} className={sourceAccountFilter === account.id ? "active" : ""} onClick={() => changeSourceAccountFilter(account.id)} title={account.label} key={account.id}><span>TG {account.id}<small>{account.username || account.phone || account.label}</small></span><b>{selectedCount}/{accountSources.length}</b></button>;
            })}
          </div>}
          {browserReady && !config.scanAllSources && <label className="source-location-filter">
            <Icon name="inbox" />
            <span><small>РАЗДЕЛ TELEGRAM</small><select value={sourceLocationFilter} onChange={(event) => { setSourceLocationFilter(event.target.value as TelegramSourceLocationFilter); setSourceQuery(""); }} aria-label="Раздел Telegram">
              <option value="all">Все папки и архив ({accountSourceDialogs.length})</option>
              <option value="main">Основные чаты ({accountSourceDialogs.filter((dialog) => !dialog.archived).length})</option>
              <option value="archive">Архив ({accountSourceDialogs.filter((dialog) => dialog.archived).length})</option>
              {sourceFolderOptions.map((option) => <option value={option.value} key={option.value}>{option.label} ({option.count})</option>)}
            </select></span>
            <Icon name="chevron" />
          </label>}
          {!config.scanAllSources && <div className="source-search"><Icon name="search" /><input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder={`Найти: ${sourceAccountFilterLabel} · ${sourceLocationFilterLabel}`} /></div>}
          {!config.scanAllSources && <div className="source-list">{visibleSources.length ? visibleSources.map((dialog) => {
            const location = [dialog.archived ? "архив" : "основные", ...dialog.folders.slice(0, 2).map((folder) => `папка «${folder.title}»`)].join(" · ");
            return <label key={dialog.id} className={config.selectedDialogIds.includes(dialog.id) ? "selected" : ""}><input type="checkbox" checked={config.selectedDialogIds.includes(dialog.id)} onChange={() => toggleSource(dialog.id)} /><span className={`source-kind ${dialog.kind}`}><Icon name={dialog.kind === "channel" ? "telegram" : dialog.kind === "bot" ? "bolt" : "chat"} /></span><b>{dialog.title}<small>TG {dialog.accountId} · {location} · {agentForAccount(dialog.accountId)?.name || "агент не выбран"} · {dialog.kind === "channel" ? "канал" : dialog.kind === "bot" ? "бот" : "группа"}</small></b><i><Icon name="check" /></i></label>;
          }) : <div className="source-empty">{browserReady ? (sourceQuery ? "По этому запросу ничего не найдено" : `В разделе «${sourceLocationFilterLabel}» у ${sourceAccountFilterLabel} нет доступных групп, каналов или ботов`) : "Список появится после подключения"}</div>}</div>}
        </div>
      </aside>
      <div className="scanner-main">
        <section className="scanner-controls"><div className="control-copy"><small>РЕЖИМ ОТПРАВКИ</small><b>{config.autoSend ? "Писать автоматически" : "Сначала показать мне"}</b><p>{config.autoSend ? "После проверки Mini AI сообщение сразу уйдёт человеку." : "Совпадения появятся ниже — отправку подтверждаете вы."}</p></div><button className={`switch-control scanner-switch ${config.autoSend ? "on" : ""}`} aria-label="Переключить автоматическую отправку" onClick={toggleAutoSend}><i /></button><label><span>Точность Mini AI</span><select value={config.threshold} onChange={(event) => setConfig((current) => ({ ...current, threshold: Number(event.target.value) }))}><option value={75}>от 75%</option><option value={85}>от 85%</option><option value={90}>от 90%</option><option value={95}>от 95%</option></select></label>{isAdmin ? <div className="admin-limit-note"><span>Лимит в день</span><b>Без ограничений</b></div> : <label><span>Лимит в день</span><select value={config.dailyLimit} onChange={(event) => setConfig((current) => ({ ...current, dailyLimit: Number(event.target.value) }))}><option value={1}>1 сообщение</option><option value={3}>3 сообщения</option><option value={5}>5 сообщений</option><option value={10}>10 сообщений</option></select></label>}</section>
        <div className="vacancy-freshness"><Icon name="clock" /><span><small>СОРТИРОВКА ВАКАНСИЙ</small><b>Сначала новые · только младше 5 дней</b></span><em>5+ ДНЕЙ — ПРОПУСК</em></div>
        <section className="call-preview application-preview"><span><Icon name="briefcase" /></span><div><small>СЦЕНАРИЙ ДЛЯ ВАКАНСИИ</small><p><b>Добрый день! Меня зовут {applicant.displayName || "Дмитрий"}, я {applicant.roleTitle || "копирайтер"} с опытом. Увидел вашу вакансию. ИИ добавит только релевантный опыт из профиля и ссылку на портфолио.</b></p><em>{applicant.portfolioUrl ? "Google Docs будет прикреплён к каждому отклику" : "Ссылка пока не добавлена — автоотправка вакансий заблокирована"}</em></div></section>
        <div className="scanner-actions"><p><Icon name="monitor" /> {config.scanAllSources ? "ИИ по очереди обходит все источники, пока открыт этот раздел." : "На телефоне автопоиск работает, пока открыт этот раздел."}</p><button className="secondary" onClick={() => void runScan(false)} disabled={scanning || !browserReady}><Icon name="refresh" /> {scanning ? scanProgress || "Анализируем…" : "Проверить сейчас"}</button><button className={config.running ? "secondary danger-text" : "primary"} onClick={toggleRunning} disabled={scanning && !config.running}><Icon name={config.running ? "pause" : "play"} /> {config.running ? "Остановить" : "Запустить агента"}</button></div>
        <section className="scanner-results"><div className="scanner-results-head"><div><small>НАЙДЕННЫЕ ЛИДЫ И ВАКАНСИИ</small><b>{results.filter((item) => item.status !== "rejected").length} подходящих · новые сверху</b></div>{results.length > 0 && <button onClick={() => setResults([])}>Очистить</button>}</div>{results.length ? <div className="scanner-result-list">{results.map((result) => <article className={`scanner-result ${result.status} ${result.kind}`} key={result.key}><div className="result-score"><b>{result.score}%</b><i><em style={{ width: `${result.score}%` }} /></i></div><div className="result-copy"><span><b>{result.candidate.senderName}</b><small>{result.candidate.chatTitle} · {formatTelegramAge(result.candidate.date)}</small><em className="agent-route-badge">TG {result.candidate.accountId} → {result.agentName}</em>{result.kind === "vacancy" && <em className="vacancy-badge">ВАКАНСИЯ</em>}</span><blockquote>{result.candidate.text}</blockquote>{result.issue ? <div className={`result-issue ${result.status}`}><b>{result.issue.title}</b><p>{result.issue.explanation}</p><small>ЧТО ДЕЛАТЬ · {result.issue.action}</small></div> : <p>{result.reason}</p>}{result.firstMessage && result.status !== "rejected" && <div className="result-message"><small>{result.kind === "vacancy" ? "ОТКЛИК НА ВАКАНСИЮ" : "ПРЕДЛОЖЕНИЕ LEADPILOT"} · {result.accountLabel}</small>{result.firstMessage}</div>}</div><div className="result-action">{result.status === "ready" && <button className="primary" onClick={() => void sendResult(result)}>{result.kind === "vacancy" ? "Откликнуться" : "Отправить"}</button>}{result.status === "sent" && <span className="result-badge sent"><Icon name="check" /> Отправлено</span>}{result.status === "rejected" && <span className="result-badge muted">Не подходит</span>}{result.status === "skipped" && <span className="result-badge skipped">Пропущено</span>}{result.status === "unreachable" && <><button className="secondary copy-result" onClick={() => void copyResult(result)}><Icon name="copy" /> Скопировать</button><span className="result-badge muted">Нет контакта</span></>}{result.status === "error" && <span className="result-badge error">Не отправлено</span>}</div></article>)}</div> : <div className="scanner-empty"><span><Icon name="target" /></span><h3>Здесь появятся совпадения</h3><p>{config.scanAllSources ? "Нажмите «Проверить сейчас» — ИИ сам выберет первую партию чатов. Следующие циклы автоматически проверят остальные." : "Выберите источники и нажмите «Проверить сейчас»."} Вакансии возрастом 5 дней и старше автоматически отбрасываются.</p></div>}</section>
      </div>
    </div>
  </section>;
}

function splitPhrases(value?: string) {
  return String(value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function applicantVacancyKeywords(profile: ApplicantProfile) {
  const role = profile.roleTitle.toLocaleLowerCase().replace(/ё/g, "е").trim();
  const keywords = new Set([profile.roleTitle.trim(), ...(role.match(/[\p{L}\p{N}]+/gu) || []).filter((word) => word.length >= 4)]);
  const synonymGroups: Array<[RegExp, string[]]> = [
    [/(?:копирайтер|редактор|райтер|автор|сценарист|контент)/u, ["копирайтер", "редактор", "райтер", "автор текстов", "сценарист", "контент-райтер", "content writer"]],
    [/(?:smm|смм|соцсет|контент-менедж)/u, ["SMM", "СММ", "контент-менеджер", "социальные сети"]],
    [/(?:маркетолог|маркетинг)/u, ["маркетолог", "маркетинг", "digital marketing"]],
    [/(?:дизайнер|дизайн)/u, ["дизайнер", "дизайн", "UX", "UI"]],
    [/(?:разработчик|программист|developer)/u, ["разработчик", "программист", "developer"]],
  ];
  for (const [pattern, synonyms] of synonymGroups) {
    if (pattern.test(role)) synonyms.forEach((keyword) => keywords.add(keyword));
  }
  return Array.from(keywords).filter(Boolean);
}

function automaticSourceBatch(sources: BrowserTelegramDialog[], batchSize = 30) {
  const ordered = [...sources].sort((left, right) => right.date - left.date);
  if (ordered.length <= batchSize) return ordered;
  const newestCount = Math.min(6, Math.floor(batchSize / 3));
  const newest = ordered.slice(0, newestCount);
  const rotating = ordered.slice(newestCount);
  const rotatingCount = batchSize - newestCount;
  const savedCursor = Number(window.localStorage.getItem(SCANNER_ALL_CURSOR_KEY) || 0);
  const start = Number.isFinite(savedCursor) && savedCursor >= 0 ? savedCursor % rotating.length : 0;
  const cycle = Array.from({ length: Math.min(rotatingCount, rotating.length) }, (_, index) => rotating[(start + index) % rotating.length]);
  window.localStorage.setItem(SCANNER_ALL_CURSOR_KEY, String((start + cycle.length) % rotating.length));
  return [...newest, ...cycle];
}

function isVacancyText(value: string) {
  const text = value.toLocaleLowerCase().replace(/ё/g, "е");
  if (/(?:#?ваканси|\bvacanc(?:y|ies)\b|ищем[^.!?\n]{0,80}в\s+команд|требуется[^.!?\n]{0,80}в\s+команд|открыт[а-я\s]{0,18}(?:позици|набор))/u.test(text)) return true;
  if (/(?:ищем|нужен|нужна|требуется)\s+[^.!?\n]{0,70}(?:копирайтер|редактор|райтер|автор|сценарист|smm|маркетолог|переводчик|журналист)/u.test(text)) return true;
  const hints = [/(?:обязанност|требовани)/u, /(?:условия|занятост|удаленн)/u, /(?:зарплат|оплат|ставк)/u, /(?:резюме|отклик|тестовое\s+задание)/u];
  return hints.filter((pattern) => pattern.test(text)).length >= 2;
}

function isSelfPromotionText(value: string) {
  const text = value.toLocaleLowerCase().replace(/ё/g, "е");
  const seeksSomeone = /(?:ищ(?:у|ем)|нуж(?:ен|на|ны)|требу(?:ется|ются))\s+(?:опытн(?:ый|ая|ые)\s+)?(?:специалист|подрядчик|исполнитель|команд|агентств|копирайтер|редактор|дизайнер|маркетолог|разработчик|таргетолог|smm|смм|автор|сценарист)/u.test(text);
  if (seeksSomeone || isVacancyText(text)) return false;
  const personalOffer = /(?:^|[.!?]\s*)(?:я|мы)\s+(?:опытн(?:ый|ая|ые)\s+)?(?:веб[- ]?)?(?:копирайтер|редактор|дизайнер|маркетолог|разработчик|таргетолог|smm|смм|фрилансер)(?:\s|[,.!?]|$)|(?:я|мы)\s+(?:представляю|представляем|развиваю|развиваем)\s+(?:маркетинговое|креативное|digital|диджитал)?\s*агентство|(?:работаю|являюсь|занимаюсь)\s+(?:в\s+)?(?:маркетинг|дизайн|разработк|копирайт|smm|смм)|(?:маркетолог|копирайтер|редактор|дизайнер|разработчик|таргетолог|smm|смм)\s+(?:с\s+опытом|ищет\s+(?:работу|проекты|заказы)|готов\s+к\s+(?:работе|проектам))|(?:предлагаю|оказываю)\s+(?:свои\s+)?услуг|(?:беру|возьму)\s+(?:новые\s+)?(?:проекты|заказы)|(?:помогаю|поможем)\s+(?:бизнесу|компаниям|брендам|экспертам)\s+(?:с|в)|ищу\s+(?:работу|заказы|клиентов)|мо[её]\s+портфолио/u.test(text);
  const serviceAdvertisement = /(?:разработк[а-я]*|создани[ея]|дизайн|продвижени[ея]|настройк[а-я]*)[\s\S]{0,180}(?:под\s+ключ|помогу\s+(?:реализовать|запустить|создать)|на\s+заказ)/u.test(text);
  return personalOffer || serviceAdvertisement;
}

function formatTelegramAge(timestamp: number) {
  if (!timestamp) return "дата неизвестна";
  const minutes = Math.max(0, Math.floor((Date.now() / 1000 - timestamp) / 60));
  if (minutes < 60) return minutes < 2 ? "только что" : `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} дн`;
}

function semanticKeywordHits(text: string, phrases: string[]) {
  const normalizedText = text.toLocaleLowerCase().replace(/ё/g, "е");
  const textTokens = normalizedText.match(/[\p{L}\p{N}]+/gu) || [];
  const intentWords = new Set(["ищу", "ищем", "нужен", "нужна", "нужно", "требуется", "кто", "может", "для", "мне", "нам", "шукаю", "потрібен", "потрібна", "szukam", "potrzebuję", "looking", "need"]);
  const stem = (value: string) => value.length > 5 ? value.replace(/(иями|ями|ами|ого|ему|ому|ыми|ими|ая|яя|ое|ее|ые|ие|ый|ий|ой|ам|ям|ах|ях|ов|ев|ы|и|а|я|у|ю|е|о)$/u, "") : value;
  const stems = textTokens.filter((token) => token.length >= 3 && !intentWords.has(token)).map(stem);
  return phrases.filter((phrase) => {
    const normalizedPhrase = phrase.toLocaleLowerCase().replace(/ё/g, "е");
    if (normalizedText.includes(normalizedPhrase)) return true;
    const subject = (normalizedPhrase.match(/[\p{L}\p{N}]+/gu) || []).filter((token) => token.length >= 3 && !intentWords.has(token)).map(stem);
    return subject.some((token) => stems.some((candidate) => candidate === token || (candidate.length >= 5 && token.length >= 5 && (candidate.startsWith(token) || token.startsWith(candidate)))));
  });
}

function readStringArray(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function readRecord(key: string): Record<string, number> {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number> : {};
  } catch { return {}; }
}

function readDailyCounter() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const value = JSON.parse(window.localStorage.getItem(SCANNER_DAILY_KEY) || "null") as { date?: string; count?: number } | null;
    return value?.date === today ? { date: today, count: Math.max(0, Number(value.count) || 0) } : { date: today, count: 0 };
  } catch { return { date: today, count: 0 }; }
}

function writeDailyCounter(count: number) {
  window.localStorage.setItem(SCANNER_DAILY_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count }));
}

function friendlyAiError(message?: string) {
  const value = String(message || "ИИ временно недоступен");
  if (/credit|balance|quota|billing|429/i.test(value)) return "ИИ не запущен: на API нет доступного баланса";
  if (/подключена|configured|api key/i.test(value)) return "ИИ-модель ещё не подключена в настройках";
  return value.slice(0, 180);
}

type SettingsTab = "agent" | "templates" | "telegram" | "appearance" | "notifications";
type AccountState = "healthy" | "limited" | "offline" | "unknown" | "checking";

type TelegramAccount = {
  id: number;
  name: string;
  username: string;
  phone: string;
  state: AccountState;
  checked: string;
  details: string;
};

function browserTelegramAccountRow(account: BrowserTelegramAccount): TelegramAccount {
  return {
    id: Number(account.id),
    name: `Telegram ${account.id} · ${account.label}`,
    username: account.username || "профиль без username",
    phone: account.phone || "номер скрыт",
    state: "healthy",
    checked: "при открытии",
    details: "Сессия подключена на этом устройстве",
  };
}

function SettingsPage({ activeAgent, flash, theme, setTheme, onActivity, openTelegramConnect }: { activeAgent: string; flash: (s: string) => void; theme: Theme; setTheme: (theme: Theme) => void; onActivity: (eventType: string, agentName?: string, details?: string) => Promise<void>; openTelegramConnect: () => void }) {
  const [autoReply, setAutoReply] = useState(true);
  const [weekends, setWeekends] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("agent");
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [notifyLeads, setNotifyLeads] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [templates, setTemplates] = useState([
    { id: 1, name: "Первое касание", text: "Здравствуйте! Увидел ваш запрос. Можем помочь — хотите, коротко расскажу как?", active: true },
    { id: 2, name: "Повтор через сутки", text: "Добрый день! Возвращаюсь к вашему запросу. Он ещё актуален?", active: true },
    { id: 3, name: "Предложение созвона", text: "Можем обсудить задачу за 15 минут. Какое время вам удобно?", active: false },
  ]);
  const [templateName, setTemplateName] = useState("");
  const [templateText, setTemplateText] = useState("");
  function save(e: FormEvent) { e.preventDefault(); setSaved(true); void onActivity("settings_saved", activeAgent, "Обновлены настройки поиска и ответов"); flash("Настройки сохранены"); window.setTimeout(() => setSaved(false), 1800); }

  useEffect(() => {
    const syncAccounts = () => setAccounts(getBrowserTelegramAccounts().map(browserTelegramAccountRow));
    syncAccounts();
    window.addEventListener("leadpilot-telegram-connected", syncAccounts);
    window.addEventListener("leadpilot-telegram-disconnected", syncAccounts);
    return () => {
      window.removeEventListener("leadpilot-telegram-connected", syncAccounts);
      window.removeEventListener("leadpilot-telegram-disconnected", syncAccounts);
    };
  }, []);

  async function checkOne(id: number) {
    setAccounts((current) => current.map((account) => account.id === id ? { ...account, state: "checking", details: "Запрашиваем статус у @SpamBot…" } : account));
    try {
      const active = await restoreBrowserTelegram(String(id) as BrowserTelegramAccountId);
      setAccounts((current) => current.map((account) => account.id === id ? { ...account, state: active ? "healthy" : "offline", details: active ? "Сессия активна · ограничения проверяйте через @SpamBot" : "Сессия требует повторного входа", checked: "только что" } : account));
      flash(active ? "Telegram-сессия активна" : "Telegram требует повторного входа");
    } catch {
      setAccounts((current) => current.map((account) => account.id === id ? { ...account, state: "offline", details: "Не удалось подтвердить сессию", checked: "только что" } : account));
      flash("Не удалось проверить Telegram-сессию");
    }
  }

  async function checkAll() {
    setAccounts((current) => current.map((account) => account.state === "offline" ? account : { ...account, state: "checking", details: "Запрашиваем статус у @SpamBot…" }));
    await Promise.all(accounts.map((account) => checkOne(account.id)));
  }

  async function disconnectAccount(id: number) {
    if (!window.confirm(`Отключить Telegram ${id} на этом устройстве?`)) return;
    await clearBrowserTelegram(String(id) as BrowserTelegramAccountId);
    flash(`Telegram ${id} отключён`);
  }

  function addTemplate(event: FormEvent) {
    event.preventDefault();
    if (!templateName.trim() || !templateText.trim()) return;
    setTemplates((current) => [...current, { id: Date.now(), name: templateName.trim(), text: templateText.trim(), active: true }]);
    setTemplateName(""); setTemplateText(""); flash("Шаблон сообщения добавлен");
  }

  return <div className="settings-layout"><aside className="settings-nav surface"><button type="button" className={tab === "agent" ? "active" : ""} onClick={() => setTab("agent")}><Icon name="bolt" /> Агент</button><button type="button" className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}><Icon name="chat" /> Шаблоны</button><button type="button" className={tab === "telegram" ? "active" : ""} onClick={() => setTab("telegram")}><Icon name="telegram" /> Telegram-аккаунты</button><button type="button" className={tab === "appearance" ? "active" : ""} onClick={() => setTab("appearance")}><Icon name="palette" /> Оформление</button><button type="button" className={tab === "notifications" ? "active" : ""} onClick={() => setTab("notifications")}><Icon name="bell" /> Уведомления</button></aside>
    {tab === "agent" && <form className="settings-card surface" onSubmit={save}><div className="settings-head"><div><h2>Поиск и ответы</h2><p>Как агент ищет запросы и начинает диалог.</p></div><span className="agent-badge"><i /> {activeAgent}</span></div><div className="form-grid"><label>Название агента<input defaultValue={activeAgent} /></label><label>Язык общения<select defaultValue="ru"><option value="ru">Русский</option><option value="en">English</option><option value="pl">Polski</option></select></label></div><label>Ключевые фразы<textarea defaultValue="ищу дизайнера&#10;нужен сайт&#10;ищу агентство" /><small>Каждая фраза — с новой строки</small></label><div className="settings-divider" /><Toggle checked={autoReply} setChecked={setAutoReply} title="Автоматический первый ответ" description="Агент отправит подготовленное сообщение после безопасной паузы" /><Toggle checked={weekends} setChecked={setWeekends} title="Работать по выходным" description="Поиск продолжится в субботу и воскресенье" /><div className="form-grid"><label>Пауза перед ответом<select defaultValue="45"><option value="30">30 секунд</option><option value="45">45 секунд</option><option value="60">1 минута</option></select></label><label>Лимит в день<input type="number" defaultValue="80" min="1" max="200" /></label></div><label>Первое сообщение<textarea defaultValue="Здравствуйте! Увидел ваш запрос. Можем помочь решить эту задачу — хотите, коротко расскажу как?" /></label><div className="settings-actions"><button type="button" className="secondary" onClick={() => flash("Изменения отменены")}>Отменить</button><button className="primary" type="submit">{saved ? <><Icon name="check" /> Сохранено</> : "Сохранить изменения"}</button></div></form>}
    {tab === "templates" && <section className="settings-card templates-panel surface"><div className="settings-head"><div><h2>Шаблоны сообщений</h2><p>Готовые ответы для разных этапов общения с клиентом.</p></div><span className="agent-badge">{templates.filter((item) => item.active).length} активны</span></div><div className="template-list">{templates.map((template) => <article className="template-row" key={template.id}><span className="feature-icon"><Icon name="chat" /></span><div><b>{template.name}</b><p>{template.text}</p></div><button className={`switch-control ${template.active ? "on" : ""}`} onClick={() => setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, active: !item.active } : item))}><i /></button><button className="row-menu danger" aria-label="Удалить шаблон" onClick={() => { setTemplates((current) => current.filter((item) => item.id !== template.id)); flash("Шаблон удалён"); }}><Icon name="close" /></button></article>)}</div><form className="template-form" onSubmit={addTemplate}><h3>Новый шаблон</h3><label>Название<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Например: После созвона" /></label><label>Текст<textarea value={templateText} onChange={(event) => setTemplateText(event.target.value)} placeholder="Сообщение клиенту…" /></label><button className="primary" type="submit" disabled={!templateName.trim() || !templateText.trim()}><Icon name="plus" /> Добавить шаблон</button></form></section>}
    {tab === "telegram" && <section className="settings-card accounts-panel surface"><div className="settings-head"><div><h2>Telegram-аккаунты</h2><p>До двух отдельных аккаунтов для двух ниш и двух ИИ-агентов.</p></div><div className="settings-head-actions">{accounts.length > 0 && <button className="secondary" type="button" onClick={() => void checkAll()}><Icon name="refresh" /> Проверить</button>}{accounts.length < 2 && <button className="primary" type="button" onClick={openTelegramConnect}><Icon name="plus" /> {accounts.length ? "Добавить второй" : "Подключить"}</button>}</div></div><div className="telegram-security-banner"><span><Icon name="shield" /></span><div><small>РЕЖИМ / ДВА MTProto-ВХОДА</small><b>Каждая сессия работает отдельно</b><p>Источники, история и отправка привязаны к правильному аккаунту. В автопоиске каждому назначается свой ИИ-агент.</p></div></div><div className="official-check"><span><Icon name="shield" /></span><div><b>Проверка ограничений — только через официальный @SpamBot</b><p>Никаких тестовых сообщений случайным людям.</p></div><a href="https://t.me/spambot" target="_blank" rel="noreferrer">Открыть бота <Icon name="link" /></a></div><div className="account-summary"><span><b>{accounts.length}/2</b> подключено</span><span><b>{accounts.filter((a) => a.state === "healthy").length}</b> активны</span><span><b>{2 - accounts.length}</b> свободно</span><span><b>2</b> ИИ-ниши</span></div>{accounts.length ? <div className="accounts-list">{accounts.map((account) => <article className="account-row" key={account.id}><span className="tg-avatar"><Icon name="telegram" /></span><div className="account-main"><strong>{account.name}</strong><small>{account.username} · {account.phone}</small></div><AccountStatus state={account.state} /><div className="account-detail"><span>{account.details}</span><small>В автопоиске: Telegram {account.id} → свой ИИ-агент</small></div><div className="account-row-actions"><button type="button" className="secondary compact" disabled={account.state === "checking"} onClick={() => void checkOne(account.id)}><Icon name="refresh" /> {account.state === "checking" ? "Проверяем" : "Проверить"}</button><button type="button" className="secondary compact danger-text" onClick={() => void disconnectAccount(account.id)}>Отключить</button></div></article>)}</div> : <div className="telegram-empty"><span><Icon name="telegram" /></span><small>НЕТ ПОДКЛЮЧЁННЫХ СЕССИЙ</small><h3>Подключите первый из двух аккаунтов</h3><p>После синхронизации в разделе «Чаты» появятся диалоги, а в «Автопоиске» — назначение отдельного ИИ-агента.</p><button className="primary" type="button" onClick={openTelegramConnect}><Icon name="plus" /> Подключить Telegram 1</button></div>}<p className="demo-note">Номер, код подтверждения и пароль 2FA вводятся только в защищённой форме. Не отправляйте их в чат поддержки.</p></section>}
    {tab === "appearance" && <section className="settings-card surface"><div className="settings-head"><div><h2>Оформление</h2><p>Выберите комфортный режим для работы днём и ночью.</p></div></div><div className="theme-grid"><ThemeCard id="light" selected={theme === "light"} name="Светлая" description="Мягкий светлый фон" icon="sun" onClick={() => setTheme("light")} /><ThemeCard id="dark" selected={theme === "dark"} name="Тёмная" description="Меньше света вечером" icon="moon" onClick={() => setTheme("dark")} /><ThemeCard id="system" selected={theme === "system"} name="Системная" description="Как на устройстве" icon="monitor" onClick={() => setTheme("system")} /></div><div className="appearance-preview"><div className="preview-sidebar"><i /><i /><i /></div><div className="preview-content"><span /><b /><div><i /><i /><i /></div></div></div><div className="comfort-card"><Icon name="eye" /><div><b>Комфорт для глаз</b><p>Контраст текста и фона снижен до спокойного рабочего уровня, но остаётся читаемым.</p></div></div></section>}
    {tab === "notifications" && <section className="settings-card surface"><div className="settings-head"><div><h2>Уведомления</h2><p>Какие события должны привлекать ваше внимание.</p></div></div><Toggle checked={notifyLeads} setChecked={setNotifyLeads} title="Новые лиды от 85%" description="Сообщать только о сильных совпадениях" /><Toggle checked={notifyReplies} setChecked={setNotifyReplies} title="Ответы в диалогах" description="Когда клиент отвечает агенту" /><Toggle checked={dailySummary} setChecked={setDailySummary} title="Ежедневная сводка" description="Короткий отчёт каждый день в 19:00" /><div className="settings-actions"><button type="button" className="primary" onClick={() => flash("Настройки уведомлений сохранены")}>Сохранить</button></div></section>}
  </div>;
}

type AdminTab = "overview" | "users" | "keys" | "ai" | "activity";
type AdminSnapshot = {
  metrics: { users: number; activeSubscriptions: number; unusedKeys: number; banned: number; eventsToday: number };
  keys: Array<{ id: number; durationDays: number; state: "available" | "used"; redeemedBy: string | null; redeemedAt: string | null; createdAt: string }>;
  users: Array<{ email: string; expiresAt: number; plan: string; status: string; isTrial: boolean; bannedReason: string | null; updatedAt: string }>;
  activity: Array<{ id: number; email: string; companyName: string; eventType: string; agentName: string | null; details: string | null; createdAt: string }>;
};

function ProfilePage({ userName, userEmail, subscriptionExpiresAt, subscriptionPlan, isTrial, isAdmin, openPlans, flash }: { userName: string; userEmail: string; subscriptionExpiresAt: string; subscriptionPlan: string; isTrial: boolean; isAdmin: boolean; openPlans: () => void; flash: (message: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState(userName);
  const [telegram, setTelegram] = useState("@dmitry_manager");
  const [members, setMembers] = useState([{ id: 1, name: "Дмитрий", email: userEmail, role: "Владелец" }, { id: 2, name: "Анна", email: "anna@company.io", role: "Менеджер" }]);
  const [inviteEmail, setInviteEmail] = useState("");
  const planLabel = isAdmin ? "Admin" : isTrial ? "Пробный" : subscriptionPlan === "key" ? "По ключу" : subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1);
  function saveProfile(event: FormEvent) { event.preventDefault(); setEditing(false); flash("Профиль компании сохранён"); }
  return <div className="profile-page">
    <section className="profile-hero surface"><div className="profile-identity"><Avatar initials={getInitials(company)} tone="green" large /><div><span className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h2>{company}</h2><p>{userEmail}</p></div></div><span className={`plan-badge ${isTrial ? "trial" : ""}`}><Icon name={isAdmin ? "crown" : "card"} /> {planLabel}</span></section>
    <div className="profile-grid">
      <form className="profile-card surface" onSubmit={saveProfile}><div className="card-heading"><span className="feature-icon"><Icon name="building" /></span><div><h3>Данные компании</h3><p>Информация владельца рабочего пространства</p></div><button type="button" className="text-button" onClick={() => setEditing(!editing)}>{editing ? "Отмена" : "Изменить"}</button></div><label>Название компании<input value={company} onChange={(event) => setCompany(event.target.value)} disabled={!editing} /></label><label>Email владельца<input value={userEmail} disabled /></label><label>Telegram<input value={telegram} onChange={(event) => setTelegram(event.target.value)} disabled={!editing} /></label>{editing && <button className="primary" type="submit"><Icon name="check" /> Сохранить</button>}</form>
      <section className="profile-card surface"><div className="card-heading"><span className="feature-icon"><Icon name="card" /></span><div><h3>{isAdmin ? "Доступ администратора" : "Подписка"}</h3><p>{isAdmin ? "Полный доступ без внутренних лимитов LeadPilot" : "Тариф, лимиты и срок действия"}</p></div></div><div className="subscription-summary"><span><small>Текущий тариф</small><b>{planLabel}</b></span><span><small>Доступ до</small><b>{isAdmin ? "Без ограничений" : subscriptionExpiresAt}</b></span><span><small>Сообщения</small><b>{isAdmin ? "Без ограничений" : "1 247 / 2 000"}</b></span></div>{!isAdmin && <div className="subscription-progress"><i /></div>}<button className="primary wide" onClick={isAdmin ? () => flash("Администраторский доступ активен") : openPlans}><Icon name="crown" /> {isAdmin ? "Доступ активен" : "Управлять подпиской"}</button></section>
      <section className="profile-card surface"><div className="card-heading"><span className="feature-icon"><Icon name="shield" /></span><div><h3>Безопасность</h3><p>Доступ и активные подключения</p></div></div><div className="security-list"><button onClick={() => flash("История входов открыта")}><Icon name="activity" /><span><b>История входов</b><small>Последний вход сегодня</small></span><Icon name="chevron" /></button><button onClick={() => flash("Подключённые устройства проверены")}><Icon name="monitor" /><span><b>Устройства</b><small>1 активное устройство</small></span><Icon name="chevron" /></button><button onClick={() => flash("Настройки уведомлений открыты")}><Icon name="bell" /><span><b>Защитные уведомления</b><small>Включены</small></span><Icon name="chevron" /></button></div></section>
      <section className="profile-card surface"><div className="card-heading"><span className="feature-icon"><Icon name="telegram" /></span><div><h3>Подключения</h3><p>Сервисы рабочего пространства</p></div></div><div className="connection-row"><span className="tg-avatar"><Icon name="telegram" /></span><div><b>Telegram</b><small>До 2 аккаунтов · отдельный ИИ-агент для каждого</small></div><span className="status-chip qualified">Доступно</span></div><button className="secondary wide" onClick={() => flash("Откройте Настройки → Telegram-аккаунты")}><Icon name="settings" /> Управлять аккаунтами</button></section>
      <section className="profile-card team-card surface"><div className="card-heading"><span className="feature-icon"><Icon name="users" /></span><div><h3>Команда</h3><p>Роли и доступ сотрудников</p></div><span className="member-count">{members.length}</span></div><div className="member-list">{members.map((member) => <div className="member-row" key={member.id}><Avatar initials={getInitials(member.name)} tone={member.id === 1 ? "green" : "blue"} /><span><b>{member.name}</b><small>{member.email}</small></span><em>{member.role}</em>{member.id !== 1 && <button aria-label="Удалить сотрудника" onClick={() => { setMembers((current) => current.filter((item) => item.id !== member.id)); flash("Сотрудник удалён из команды"); }}><Icon name="close" /></button>}</div>)}</div><form className="invite-form" onSubmit={(event) => { event.preventDefault(); if (!inviteEmail.trim()) return; setMembers((current) => [...current, { id: Date.now(), name: inviteEmail.split("@")[0], email: inviteEmail, role: "Оператор" }]); setInviteEmail(""); flash("Приглашение добавлено"); }}><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Email сотрудника" /><button className="primary" type="submit" disabled={!inviteEmail.trim()}><Icon name="plus" /> Добавить</button></form></section>
    </div>
  </div>;
}

function AdminPage({ flash }: { flash: (message: string) => void }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyDays, setKeyDays] = useState(30);
  const [generatedKey, setGeneratedKey] = useState("");
  const [busy, setBusy] = useState("");

  async function loadAdmin() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const result = await response.json() as AdminSnapshot & { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить админ-панель");
      setSnapshot(result);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadAdmin(); }, []);

  async function adminAction(action: string, payload: Record<string, unknown> = {}) {
    setBusy(`${action}-${String(payload.email ?? "")}`); setError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json() as { error?: string; rawKey?: string; snapshot?: AdminSnapshot };
      if (!response.ok) throw new Error(result.error || "Действие не выполнено");
      if (result.rawKey) { setGeneratedKey(result.rawKey); flash("Новый ключ создан"); }
      if (result.snapshot) setSnapshot(result.snapshot);
      else await loadAdmin();
      if (action !== "create_key") flash(action === "ban" ? "Пользователь заблокирован" : action === "unban" ? "Блокировка снята" : action === "trial" ? "Пробный доступ выдан" : "Подписка продлена");
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Действие не выполнено"); }
    finally { setBusy(""); }
  }

  if (loading && !snapshot) return <section className="admin-loading surface"><span className="admin-spinner" /><h2>Загружаем админ-панель</h2><p>Ключи, подписки и активность компаний</p></section>;
  if (!snapshot) return <section className="admin-loading surface"><span className="feature-icon danger"><Icon name="ban" /></span><h2>Не удалось открыть админ-панель</h2><p>{error}</p><button className="secondary" onClick={loadAdmin}><Icon name="refresh" /> Повторить</button></section>;

  const companyRows = snapshot.users.map((user) => ({ ...user, events: snapshot.activity.filter((event) => event.email === user.email).length, lastEvent: snapshot.activity.find((event) => event.email === user.email) }));
  return <div className="admin-page">
    <section className="admin-banner surface"><span className="admin-crown"><Icon name="crown" /></span><div><span className="eyebrow">ТОЛЬКО ДЛЯ ВЛАДЕЛЬЦА</span><h2>Центр управления LeadPilot</h2><p>Контролируй доступ, подписки и работу компаний в одном месте.</p></div><button className="secondary" onClick={loadAdmin} disabled={loading}><Icon name="refresh" /> Обновить</button></section>
    <nav className="admin-tabs surface">{([{ id: "overview", label: "Обзор", icon: "activity" }, { id: "users", label: "Компании", icon: "building" }, { id: "keys", label: "Ключи", icon: "key" }, { id: "ai", label: "Настройки ИИ", icon: "bolt" }, { id: "activity", label: "Активность", icon: "eye" }] as { id: AdminTab; label: string; icon: IconName }[]).map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><Icon name={item.icon} /> {item.label}</button>)}</nav>
    {error && <div className="admin-error"><Icon name="ban" /> {error}</div>}
    {tab === "overview" && <><section className="admin-ai-callout surface"><span className="admin-ai-mark"><Icon name="bolt" /></span><div><small>MINI AI / АКТИВЕН БЕСПЛАТНО</small><h3>Локальная модель уже работает</h3><p>LeadPilot Mini оценивает запросы, пишет первое сообщение и отвечает на базовые вопросы без API-ключа. Облачный ИИ остаётся необязательным улучшением.</p></div><button className="primary" onClick={() => setTab("ai")}><Icon name="settings" /> Настройки моделей</button></section><section className="admin-metrics"><AdminMetric icon="building" label="Компаний" value={snapshot.metrics.users} /><AdminMetric icon="card" label="Активных подписок" value={snapshot.metrics.activeSubscriptions} /><AdminMetric icon="key" label="Свободных ключей" value={snapshot.metrics.unusedKeys} /><AdminMetric icon="ban" label="Заблокировано" value={snapshot.metrics.banned} danger /><AdminMetric icon="activity" label="Событий сегодня" value={snapshot.metrics.eventsToday} /></section><section className="admin-columns"><div className="surface admin-panel"><div className="panel-heading"><div><h3>Компании в работе</h3><p>Последняя активность пользователей</p></div><button className="text-button" onClick={() => setTab("users")}>Все компании <Icon name="arrow" /></button></div>{companyRows.slice(0, 5).map((company) => <div className="company-row" key={company.email}><Avatar initials={getInitials(company.email)} tone={company.bannedReason ? "rose" : "green"} /><span><b>{company.email}</b><small>{company.lastEvent ? eventLabel(company.lastEvent.eventType) : "Активность ещё не записана"}</small></span><em className={company.bannedReason ? "danger" : "online"}>{company.bannedReason ? "Бан" : company.expiresAt > Date.now() ? "Активна" : "Истекла"}</em></div>)}</div><div className="surface admin-panel"><div className="panel-heading"><div><h3>Последние события</h3><p>Что делают агенты компаний</p></div><button className="text-button" onClick={() => setTab("activity")}>Журнал <Icon name="arrow" /></button></div>{snapshot.activity.slice(0, 6).map((event) => <ActivityRow key={event.id} event={event} />)}</div></section></>}
    {tab === "users" && <section className="surface admin-table-panel"><div className="panel-heading"><div><h3>Компании и подписки</h3><p>Продление, пробный доступ и блокировки</p></div></div><div className="admin-table users-table"><div className="admin-table-head"><span>Компания</span><span>Тариф</span><span>Доступ</span><span>Статус</span><span>Действия</span></div>{companyRows.map((user) => <div className="admin-table-row" key={user.email}><span className="admin-user"><Avatar initials={getInitials(user.email)} tone="slate" /><span><b>{user.email}</b><small>{user.events} событий</small></span></span><span><b>{user.isTrial ? "Пробный" : user.plan}</b><small>{user.isTrial ? "4 дня" : "Подписка"}</small></span><span><b>{formatDate(user.expiresAt)}</b><small>{user.expiresAt > Date.now() ? "активен" : "истёк"}</small></span><span><em className={`admin-status ${user.bannedReason ? "banned" : user.expiresAt > Date.now() ? "active" : "expired"}`}>{user.bannedReason ? "Заблокирован" : user.expiresAt > Date.now() ? "Активен" : "Истёк"}</em></span><span className="admin-actions"><button title="Продлить на 30 дней" onClick={() => adminAction("extend", { email: user.email, days: 30, plan: "pro" })} disabled={Boolean(busy)}><Icon name="card" /></button>{user.isTrial ? null : <button title="Выдать пробные 4 дня" onClick={() => adminAction("trial", { email: user.email })} disabled={Boolean(busy)}><Icon name="clock" /></button>}{user.bannedReason ? <button title="Разблокировать" className="success" onClick={() => adminAction("unban", { email: user.email })} disabled={Boolean(busy)}><Icon name="shield" /></button> : <button title="Заблокировать" className="danger" onClick={() => adminAction("ban", { email: user.email, reason: "Ручная блокировка администратором" })} disabled={Boolean(busy)}><Icon name="ban" /></button>}</span></div>)}</div></section>}
    {tab === "keys" && <section className="surface admin-table-panel"><div className="panel-heading key-heading"><div><h3>Ключи доступа</h3><p>Открытый ключ показывается только один раз после создания</p></div><div className="key-create"><select value={keyDays} onChange={(event) => setKeyDays(Number(event.target.value))}><option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option></select><button className="primary" onClick={() => adminAction("create_key", { durationDays: keyDays })} disabled={Boolean(busy)}><Icon name="plus" /> Создать ключ</button></div></div>{generatedKey && <div className="generated-key"><span><Icon name="key" /></span><div><small>НОВЫЙ КЛЮЧ — СОХРАНИ СЕЙЧАС</small><b>{generatedKey}</b></div><button onClick={() => { void navigator.clipboard.writeText(generatedKey); flash("Ключ скопирован"); }}><Icon name="copy" /> Копировать</button></div>}<div className="admin-table keys-table"><div className="admin-table-head"><span>ID</span><span>Срок</span><span>Статус</span><span>Активирован</span><span>Создан</span></div>{snapshot.keys.map((key) => <div className="admin-table-row" key={key.id}><span><b>KEY-{String(key.id).padStart(4, "0")}</b></span><span>{key.durationDays} дней</span><span><em className={`admin-status ${key.state === "used" ? "expired" : "active"}`}>{key.state === "used" ? "Использован" : "Свободен"}</em></span><span><b>{key.redeemedBy || "—"}</b><small>{key.redeemedAt ? formatDateString(key.redeemedAt) : "не активирован"}</small></span><span>{formatDateString(key.createdAt)}</span></div>)}</div></section>}
    {tab === "ai" && <AiSettingsPanel flash={flash} />}
    {tab === "activity" && <section className="surface admin-table-panel"><div className="panel-heading"><div><h3>Журнал активности</h3><p>Действия компаний и их агентов</p></div><span className="live-badge"><i /> Обновляется</span></div><div className="activity-list">{snapshot.activity.length ? snapshot.activity.map((event) => <ActivityRow key={event.id} event={event} detailed />) : <div className="empty-admin"><Icon name="activity" /><p>События появятся, когда компании начнут работать с агентами.</p></div>}</div></section>}
  </div>;
}

function AiSettingsPanel({ flash }: { flash: (message: string) => void }) {
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{ configured: boolean; hint: string | null; model: string; source?: string }>({ configured: false, hint: null, model: "gpt-5.6-luna" });

  async function loadStatus() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/ai", { cache: "no-store" });
      const data = await response.json() as typeof status & { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось проверить подключение");
      setStatus(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось проверить подключение"); }
    finally { setBusy(false); }
  }

  useEffect(() => { void loadStatus(); }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    if (!apiKey.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey }) });
      const data = await response.json() as typeof status & { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось подключить OpenAI");
      setStatus(data); setApiKey(""); setVisible(false); flash("Облачный ИИ подключён");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось подключить OpenAI"); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    if (busy || !window.confirm("Отключить облачный ИИ от LeadPilot?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/ai", { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось отключить ключ");
      setStatus((current) => ({ ...current, configured: false, hint: null })); flash("OpenAI отключён");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось отключить ключ"); }
    finally { setBusy(false); }
  }

  return <section className="surface ai-settings-panel">
    <div className="ai-settings-hero"><span className="ai-settings-glyph"><Icon name="bolt" /></span><div><small>LEADPILOT MINI / ЛОКАЛЬНАЯ МОДЕЛЬ АКТИВНА</small><h3>Облачный ИИ — необязательное улучшение</h3><p>Бесплатная Mini AI уже работает без ключа. OpenAI можно подключить позже для более свободных и сложных диалогов.</p></div><span className={`ai-provider-status ${status.configured ? "connected" : ""}`}><i />{busy ? "Проверяем" : status.configured ? "OpenAI подключён" : "Mini AI работает"}</span></div>
    <div className="ai-settings-grid"><div className="ai-provider-card"><span><small>МОДЕЛЬ</small><b>{status.model}</b></span><span><small>КЛЮЧ</small><b>{status.configured ? status.hint || "подключён" : "не добавлен"}</b></span><span><small>ХРАНЕНИЕ</small><b>Зашифровано на сервере</b></span></div><div className="ai-security-copy"><Icon name="shield" /><div><b>Ключ не показывается повторно</b><p>Он не сохраняется в браузере и используется только сервером для запросов к OpenAI.</p></div></div></div>
    <form className="ai-key-form" onSubmit={connect}><label>Секретный API-ключ OpenAI<div className="ai-key-input"><input type={visible ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-proj-…" autoComplete="off" autoCapitalize="none" spellCheck={false} /><button type="button" aria-label={visible ? "Скрыть ключ" : "Показать ключ"} onClick={() => setVisible(!visible)}><Icon name="eye" /></button></div><small>Вставьте ключ полностью. Перед сохранением LeadPilot выполнит один короткий тестовый запрос.</small></label>{error && <div className="admin-error"><Icon name="ban" /> {error}</div>}<div className="ai-key-actions">{status.configured && <button className="secondary danger-text" type="button" onClick={disconnect} disabled={busy}>Отключить</button>}<button className="primary" type="submit" disabled={busy || !apiKey.trim()}><Icon name={status.configured ? "refresh" : "link"} /> {busy ? "Проверяем…" : status.configured ? "Заменить ключ" : "Подключить OpenAI"}</button></div></form>
    <p className="ai-billing-note"><Icon name="card" /> Оплата API идёт отдельно в аккаунте OpenAI. Без добавленного баланса ключ может не пройти проверку.</p>
  </section>;
}

function AdminMetric({ icon, label, value, danger = false }: { icon: IconName; label: string; value: number; danger?: boolean }) { return <article className={`admin-metric surface ${danger ? "danger" : ""}`}><span><Icon name={icon} /></span><div><small>{label}</small><b>{value}</b></div></article>; }

function ActivityRow({ event, detailed = false }: { event: AdminSnapshot["activity"][number]; detailed?: boolean }) { return <article className={`activity-row ${detailed ? "detailed" : ""}`}><span className="event-icon"><Icon name={eventIcon(event.eventType)} /></span><span><b>{event.companyName}</b><small>{eventLabel(event.eventType)}{event.agentName ? ` · ${event.agentName}` : ""}</small>{detailed && event.details && <p>{event.details}</p>}</span><time>{formatDateString(event.createdAt)}</time></article>; }
function eventIcon(type: string): IconName { if (type.includes("agent")) return "bolt"; if (type === "lead_opened") return "target"; if (type === "message_sent") return "send"; if (type === "settings_saved") return "settings"; return "activity"; }
function eventLabel(type: string) { const labels: Record<string, string> = { agent_started: "Запустила агента", agent_paused: "Поставила агента на паузу", agent_created: "Создала агента", lead_opened: "Открыла найденного клиента", message_sent: "Отправила сообщение", settings_saved: "Изменила настройки", plan_interest: "Выбрала тариф" }; return labels[type] || type; }
function formatDate(value: number) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(value); }
function formatDateString(value: string) { const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date); }

function AccountStatus({ state }: { state: AccountState }) {
  const labels: Record<AccountState, string> = { healthy: "Без ограничений", limited: "Есть ограничения", offline: "Сессия недоступна", unknown: "Не проверен", checking: "Проверяется" };
  return <span className={`account-status ${state}`}><i />{labels[state]}</span>;
}

function ThemeCard({ id, selected, name, description, icon, onClick }: { id: Theme; selected: boolean; name: string; description: string; icon: IconName; onClick: () => void }) {
  return <button type="button" className={`theme-card ${id} ${selected ? "selected" : ""}`} onClick={onClick}><span className="theme-swatch"><i /><i /><i /></span><span className="theme-copy"><b><Icon name={icon} /> {name}</b><small>{description}</small></span><em>{selected && <Icon name="check" />}</em></button>;
}

function Toggle({ checked, setChecked, title, description }: { checked: boolean; setChecked: (v: boolean) => void; title: string; description: string }) { return <button className="toggle-row" type="button" onClick={() => setChecked(!checked)}><span><strong>{title}</strong><small>{description}</small></span><i className={checked ? "on" : ""}><em /></i></button>; }

function Notifications({ close, flash }: { close: () => void; flash: (s: string) => void }) { return <div className="popover notifications"><div><strong>Уведомления</strong><button onClick={() => flash("Все отмечены прочитанными")}>Прочитать все</button></div><button onClick={() => { close(); flash("Открыт новый лид"); }}><span className="notice-icon green"><Icon name="users" /></span><span><b>Новый лид с совпадением 94%</b><small>Анна ищет SMM-агентство · 2 мин</small></span><i /></button><button onClick={() => { close(); flash("Открыт диалог"); }}><span className="notice-icon blue"><Icon name="chat" /></span><span><b>Максим ответил на сообщение</b><small>«Да, давайте обсудим...» · 18 мин</small></span><i /></button><button onClick={() => { close(); flash("Лимит сообщений проверен"); }}><span className="notice-icon amber"><Icon name="bolt" /></span><span><b>Использовано 62% лимита</b><small>Осталось 753 сообщения</small></span></button></div>; }

function LeadModal({ lead, close, chat, toggleSaved }: { lead: Lead; close: () => void; chat: () => void; toggleSaved: () => void }) { return <ModalShell close={close}><div className="lead-modal-head"><Avatar initials={lead.initials} tone={lead.tone} large /><div><h2>{lead.name}</h2><p>{lead.source} · {lead.channel}</p></div><button className={lead.saved ? "saved" : ""} aria-label="Сохранить" onClick={toggleSaved}><Icon name="star" /></button></div><div className="lead-score"><span><Icon name="target" /></span><div><b>{lead.score}% совпадение</b><p>Запрос хорошо подходит под услуги агента</p></div></div><blockquote>{lead.request}. Рассматривает предложения и готов обсудить условия сотрудничества.</blockquote><div className="lead-details"><span><small>Статус</small><b className={`status-chip ${lead.status}`}>{statusLabel[lead.status]}</b></span><span><small>Найден</small><b>{lead.time} назад</b></span><span><small>Источник</small><b>{lead.source}</b></span></div><div className="modal-actions"><button className="secondary" onClick={close}>Закрыть</button><button className="primary" onClick={chat}>Открыть диалог <Icon name="arrow" /></button></div></ModalShell>; }

function AgentModal({ close, create }: { close: () => void; create: (agent: AgentProfile) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("AI-менеджер новых клиентов");
  const [goal, setGoal] = useState("Отвечать на вопросы и квалифицировать потенциальных клиентов");
  const [source, setSource] = useState("Telegram");
  const [language, setLanguage] = useState("ru");
  const [company, setCompany] = useState("Моя компания");
  const [services, setServices] = useState("Разработка сайтов и продвижение бизнеса");
  const [knowledge, setKnowledge] = useState("Первичная консультация бесплатная. Точную стоимость и сроки рассчитывает менеджер после уточнения задачи.");
  const [tone, setTone] = useState("дружелюбный, уверенный, без давления");
  const [instructions, setInstructions] = useState("Пойми задачу по сообщению. Не выдумывай цены и сроки. В первом сообщении предложи короткий звонок на 10–15 минут.");
  const [keywords, setKeywords] = useState("нужен сайт\nищу агентство\nнужен маркетолог");
  const [exclusions, setExclusions] = useState("бесплатно");
  const [message, setMessage] = useState("Здравствуйте! Увидел ваш запрос — похоже, мы можем помочь. Предлагаю короткий звонок на 10–15 минут, там всё обсудим. Когда вам удобно?");
  const steps = ["Роль", "Знания", "Поиск", "Поведение", "Запуск"];
  const profile: AgentProfile = { name: name.trim() || "Новый ИИ-агент", goal, source, language, company, services, knowledge, tone, instructions, keywords, exclusions, firstMessage: message };

  function finish(event: FormEvent) {
    event.preventDefault();
    if (step < steps.length - 1) return setStep((value) => value + 1);
    create(profile);
  }

  return <ModalShell close={close} wide><div className="modal-title ai-modal-title"><span><Icon name="bolt" /></span><div><small>LEADPILOT / AI CORE</small><h2>Создать ИИ-агента</h2><p>Не шаблон: агент понимает вопросы, контекст и отвечает по знаниям компании.</p></div></div><div className="wizard-steps wizard-five">{steps.map((label, index) => <button type="button" key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => index <= step && setStep(index)}><span>{index < step ? <Icon name="check" /> : index + 1}</span><b>{label}</b></button>)}</div><form onSubmit={finish} className="modal-form agent-wizard">
    {step === 0 && <div className="wizard-pane"><label>Название агента<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Роль и основная задача<textarea value={goal} onChange={(event) => setGoal(event.target.value)} required /><small>Например: отвечать на вопросы и передавать менеджеру заинтересованных клиентов.</small></label><div className="form-grid"><label>Источник<select value={source} onChange={(event) => setSource(event.target.value)}><option>Telegram</option><option>LinkedIn</option><option>Email</option></select></label><label>Основной язык<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="ru">Русский</option><option value="en">English</option><option value="pl">Polski</option><option value="uk">Українська</option></select></label></div></div>}
    {step === 1 && <div className="wizard-pane"><label>Название компании<input value={company} onChange={(event) => setCompany(event.target.value)} required /></label><label>Услуги и предложение<textarea value={services} onChange={(event) => setServices(event.target.value)} required /><small>Что продаёте, кому помогаете и с какими задачами.</small></label><label>База знаний<textarea className="knowledge-area" value={knowledge} onChange={(event) => setKnowledge(event.target.value)} /><small>Факты, цены, сроки, условия, география, частые вопросы. Если факта здесь нет — агент не должен его придумывать.</small></label></div>}
    {step === 2 && <div className="wizard-pane"><label>Ключевые фразы<textarea value={keywords} onChange={(event) => setKeywords(event.target.value)} /><small>Каждая фраза с новой строки</small></label><label>Исключить запросы<textarea value={exclusions} onChange={(event) => setExclusions(event.target.value)} /><small>Агент пропустит сообщения с этими словами</small></label><div className="wizard-tip"><Icon name="target" /><span><b>ИИ анализирует смысл целиком</b>Ключевые слова помогают найти сообщение, но решение принимается по контексту запроса.</span></div></div>}
    {step === 3 && <div className="wizard-pane"><label>Стиль общения<input value={tone} onChange={(event) => setTone(event.target.value)} /><small>Например: коротко, спокойно, профессионально, без навязчивости.</small></label><label>Правила агента<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} /><small>Что он обязан делать, чего не должен обещать и когда передавать диалог человеку.</small></label><label>Первое сообщение со звонком<textarea value={message} onChange={(event) => setMessage(event.target.value)} /><small>При автопоиске ИИ персонализирует текст, но обязательно сразу предложит короткий созвон.</small></label></div>}
    {step === 4 && <div className="wizard-pane"><div className="wizard-summary ai-summary"><span className="agent-symbol is-running"><Icon name="bolt" /><i /></span><div><small>AI PROFILE / ГОТОВ</small><h3>{profile.name}</h3><p>{profile.company} · {profile.source} · язык {profile.language.toUpperCase()}</p></div></div><div className="ai-capabilities"><span><Icon name="chat" /><b>Понимает вопросы</b><small>Определяет смысл, а не ищет готовую фразу</small></span><span><Icon name="activity" /><b>Помнит контекст</b><small>Учитывает предыдущие сообщения диалога</small></span><span><Icon name="shield" /><b>Не выдумывает</b><small>Опирается на заполненную базу знаний</small></span></div><p className="ai-launch-note"><Icon name="check" /> После создания автоматически откроется тестовый чат. Сообщения из теста не отправляются в Telegram.</p></div>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={() => step ? setStep((value) => value - 1) : close()}>{step ? "Назад" : "Отмена"}</button><button className="primary" type="submit">{step === 4 ? <><Icon name="chat" /> Создать и проверить</> : <>Далее <Icon name="arrow" /></>}</button></div>
  </form></ModalShell>;
}

type AgentTestMessage = { role: "user" | "assistant"; content: string };

function AgentTestModal({ agent, close }: { agent: AgentProfile; close: () => void }) {
  const [messages, setMessages] = useState<AgentTestMessage[]>([{ role: "assistant", content: `Я — бесплатная локальная модель LeadPilot Mini. Задайте базовый вопрос как потенциальный клиент компании «${agent.company}».` }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("LeadPilot Mini v4");

  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    const nextMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(nextMessages); setDraft(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/agent/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent, messages: nextMessages.slice(1) }) });
      const data = await response.json() as { answer?: string; error?: string; code?: string; model?: string; engine?: "local" | "cloud" };
      if (!response.ok || !data.answer) throw new Error(data.error || "Агент не смог ответить");
      if (data.model) setModel(data.model);
      setMessages((current) => [...current, { role: "assistant", content: data.answer! }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Агент не смог ответить");
    } finally { setBusy(false); }
  }

  return <ModalShell close={close} wide><div className="agent-test-head"><span className="agent-symbol is-running"><Icon name="bolt" /><i /></span><div><small>TEST LAB / LOCAL MINI AI</small><h2>{agent.name}</h2><p>{agent.company} · ответы по локальной базе знаний · ничего не отправляется в Telegram</p></div><span className="ai-online"><i /> {model.toUpperCase()} · БЕСПЛАТНО</span></div><div className="agent-test-layout"><aside><small>КОНТЕКСТ АГЕНТА</small><dl><div><dt>Задача</dt><dd>{agent.goal}</dd></div><div><dt>Услуги</dt><dd>{agent.services}</dd></div><div><dt>Стиль</dt><dd>{agent.tone}</dd></div></dl><div className="test-safe"><Icon name="shield" /><span><b>Без API и платежей</b><small>Тестовые сообщения обрабатываются собственной Mini AI.</small></span></div></aside><section className="agent-test-chat"><div className="test-messages">{messages.map((message, index) => <article className={message.role} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "Вы"}</span><p>{message.content}</p></article>)}{busy && <article className="assistant thinking"><span>AI</span><p><i /><i /><i /></p></article>}</div>{error && <div className="agent-test-error"><Icon name="activity" /><span><b>Ответ пока недоступен</b><small>{error}</small></span></div>}<form className="agent-test-composer" onSubmit={ask}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Например: сколько стоит разработка сайта?" maxLength={2000} autoFocus /><button className="primary" disabled={busy || !draft.trim()} aria-label="Отправить вопрос"><Icon name="send" /></button></form><div className="test-suggestions"><button type="button" onClick={() => setDraft("Сколько стоит ваша услуга?")}>Сколько стоит?</button><button type="button" onClick={() => setDraft("Какие сроки выполнения?")}>Какие сроки?</button><button type="button" onClick={() => setDraft("Чем вы можете помочь моему бизнесу?")}>Чем поможете?</button></div></section></div><div className="modal-actions"><button className="secondary" onClick={close}>Закрыть тест</button></div></ModalShell>;
}

type TelegramConnectStep = "loading" | "credentials" | "method" | "phone" | "code" | "qr" | "password" | "sync" | "done" | "full";

function TelegramConnectModal({ close, flash }: { close: () => void; flash: (s: string) => void }) {
  const [step, setStep] = useState<TelegramConnectStep>("loading");
  const [accountId, setAccountId] = useState<BrowserTelegramAccountId | null>(null);
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeViaApp, setCodeViaApp] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoginUrl, setQrLoginUrl] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState(0);
  const [qrClock, setQrClock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const codeResolver = useRef<((value: string) => void) | null>(null);
  const passwordResolver = useRef<((value: string) => void) | null>(null);
  const loginFinished = useRef(false);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const availableId = getAvailableBrowserTelegramAccountId();
      if (!availableId) {
        setStep("full");
        return;
      }
      setAccountId(availableId);
      try {
        await prepareBrowserTelegram();
        const active = await restoreBrowserTelegram(availableId);
        setStep(active ? "done" : "credentials");
      } catch (reason) {
        const details = reason instanceof Error ? reason.message : String(reason || "неизвестная ошибка");
        console.error("Telegram browser module failed to load", reason);
        setError(`Не удалось запустить Telegram в браузере: ${details}`);
        setStep("credentials");
      }
    });
  }, []);

  useEffect(() => {
    if (step !== "qr") return;
    const timer = window.setInterval(() => setQrClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => () => {
    if (accountId && !loginFinished.current) void cancelBrowserTelegramLogin(accountId);
  }, [accountId]);

  async function startLogin() {
    if (!accountId) return setError("Уже подключены два Telegram-аккаунта");
    const numericId = Number(apiId);
    if (!Number.isInteger(numericId) || numericId <= 0 || apiHash.trim().length < 20) return setError("Проверьте api_id и api_hash");
    setBusy(true); setError("");
    void loginBrowserTelegram({
      accountId,
      apiId: numericId,
      apiHash: apiHash.trim(),
      phone: phone.trim(),
      getCode: (viaApp) => {
        setCodeViaApp(viaApp);
        setStep("code"); setBusy(false);
        return new Promise<string>((resolve) => { codeResolver.current = resolve; });
      },
      getPassword: (hint) => {
        setError(hint ? `Подсказка Telegram: ${hint}` : "");
        setStep("password"); setBusy(false);
        return new Promise<string>((resolve) => { passwordResolver.current = resolve; });
      },
      onError: (message) => setError(message),
    }).then(() => {
      loginFinished.current = true;
      setStep("sync"); setBusy(false);
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Не удалось выполнить вход");
      setStep("credentials"); setBusy(false);
    });
  }

  function startQrLogin() {
    if (!accountId) return setError("Уже подключены два Telegram-аккаунта");
    const numericId = Number(apiId);
    if (!Number.isInteger(numericId) || numericId <= 0 || apiHash.trim().length < 20) return setError("Проверьте api_id и api_hash");
    setStep("qr"); setBusy(true); setError(""); setQrDataUrl(""); setQrLoginUrl("");
    void loginBrowserTelegramWithQr({
      accountId,
      apiId: numericId,
      apiHash: apiHash.trim(),
      onQrCode: async (loginUrl, expires) => {
        const qr = await import("qrcode");
        const imageUrl = await qr.toDataURL(loginUrl, { width: 300, margin: 2, errorCorrectionLevel: "M", color: { dark: "#11140d", light: "#ffffff" } });
        setQrLoginUrl(loginUrl);
        setQrDataUrl(imageUrl);
        setQrExpiresAt(expires > 1_000_000_000_000 ? Math.floor(expires / 1000) : expires);
        setQrClock(Date.now());
        setBusy(false);
      },
      getPassword: (hint) => {
        setError(hint ? `Подсказка Telegram: ${hint}` : "");
        setStep("password"); setBusy(false);
        return new Promise<string>((resolve) => { passwordResolver.current = resolve; });
      },
      onError: (message) => setError(message),
    }).then(() => {
      loginFinished.current = true;
      setStep("sync"); setBusy(false);
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Не удалось выполнить вход по QR-коду");
      setStep("method"); setBusy(false);
    });
  }

  async function syncDialogs() {
    if (!accountId) return;
    setBusy(true); setError("");
    try {
      await getBrowserTelegramDialogs(20, accountId);
      setStep("done");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить диалоги"); }
    finally { setBusy(false); }
  }

  const stages = ["API", "Способ", "Подтверждение", "История"];
  const stageIndex = step === "credentials" ? 0 : step === "method" || step === "phone" ? 1 : step === "code" || step === "qr" || step === "password" ? 2 : step === "sync" || step === "done" ? 3 : -1;
  const qrSecondsLeft = qrExpiresAt && qrClock ? Math.max(0, qrExpiresAt - Math.floor(qrClock / 1000)) : 0;

  return <ModalShell close={close} wide><div className="telegram-modal-title"><span><Icon name="telegram" /></span><div><small>LEADPILOT / TELEGRAM {accountId || "1–2"}</small><h2>{step === "full" ? "Два аккаунта уже подключены" : `Подключить Telegram ${accountId || ""}`}</h2><p>Отдельная сессия · отдельные источники · отдельный ИИ-агент</p></div></div>
    <div className="telegram-connect-steps">{stages.map((name, index) => <span className={index === stageIndex ? "active" : index < stageIndex ? "done" : ""} key={name}><i>{index < stageIndex ? <Icon name="check" /> : index + 1}</i><b>{name}</b></span>)}</div>
    {step === "loading" && <div className="telegram-loading"><Icon name="refresh" /><p>Проверяем сохранённый вход…</p></div>}
    {step === "full" && <div className="telegram-done"><span><Icon name="check" /></span><small>ЛИМИТ ПОДКЛЮЧЕНИЙ ЗАПОЛНЕН</small><h3>Telegram 1 и Telegram 2 готовы</h3><p>Перейдите в «Автопоиск», чтобы назначить каждому аккаунту своего ИИ-агента и нишу.</p><div className="modal-actions"><button className="primary" onClick={close}>Готово</button></div></div>}
    {step === "credentials" && <form className="modal-form telegram-login-form" onSubmit={(event) => { event.preventDefault(); setError(""); setStep("method"); }}><div className="browser-test-banner"><Icon name="monitor" /><div><b>Одноразовая настройка</b><p>Откройте <a href="https://my.telegram.org/apps" target="_blank" rel="noreferrer">my.telegram.org/apps</a>, создайте приложение и скопируйте два значения. Это бесплатно.</p></div></div><label>api_id<input inputMode="numeric" value={apiId} onChange={(event) => setApiId(event.target.value.replace(/\D/g, ""))} placeholder="Например: 12345678" required /></label><label>api_hash<input value={apiHash} onChange={(event) => setApiHash(event.target.value.trim())} placeholder="32 символа" autoCapitalize="none" autoCorrect="off" spellCheck={false} required /></label><div className="privacy-line"><Icon name="shield" /><p>Данные приложения и Telegram-сессия сохраняются только в браузере этого телефона.</p></div>{error && <p className="telegram-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Отмена</button><button className="primary" disabled={!apiId || apiHash.length < 20}>Дальше <Icon name="arrow" /></button></div></form>}
    {step === "method" && <div className="telegram-method"><small>СПОСОБ ПОДТВЕРЖДЕНИЯ</small><h3>Как войти в Telegram {accountId}?</h3><p>QR-вход не требует SMS или кода из сообщения и обычно работает быстрее.</p><div className="telegram-method-grid"><button type="button" className="recommended" onClick={startQrLogin}><em>РЕКОМЕНДУЕМ</em><span><Icon name="monitor" /></span><b>По QR-коду</b><small>Отсканируйте камерой Telegram или откройте ссылку на этом устройстве.</small><i><Icon name="arrow" /></i></button><button type="button" onClick={() => { setError(""); setStep("phone"); }}><span><Icon name="key" /></span><b>По номеру и коду</b><small>Обычный вход через номер телефона и сообщение от Telegram.</small><i><Icon name="arrow" /></i></button></div>{error && <p className="telegram-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => setStep("credentials")}>Назад</button></div></div>}
    {step === "phone" && <form className="modal-form telegram-login-form" onSubmit={(event) => { event.preventDefault(); void startLogin(); }}><label>Номер Telegram<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+380 00 000 00 00" required /></label><div className="privacy-line"><Icon name="shield" /><p><b>Telegram сам выберет способ доставки:</b> сообщение в приложение или SMS. Код не отправляется на сервер LeadPilot.</p></div>{error && <p className="telegram-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => setStep("method")}>Назад</button><button className="primary" disabled={busy || phone.replace(/\D/g, "").length < 8}>{busy ? "Подключаемся…" : <>Получить код <Icon name="arrow" /></>}</button></div></form>}
    {step === "code" && <form className="modal-form telegram-login-form" onSubmit={(event) => { event.preventDefault(); setBusy(true); codeResolver.current?.(code); codeResolver.current = null; }}><label>Код подтверждения<input className="telegram-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="00000" required autoFocus /></label><p className="form-hint">{codeViaApp === false ? "Telegram отправил код по SMS." : "Telegram отправил код в официальный служебный чат в приложении — проверьте все устройства, где открыт аккаунт."} Никому его не пересылайте.</p>{error && <p className="telegram-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => window.location.reload()}>Начать заново</button><button className="primary" disabled={busy || code.length < 5}>{busy ? "Проверяем…" : "Продолжить"}</button></div></form>}
    {step === "qr" && <div className="telegram-qr-login"><small>SECURE QR LOGIN</small><h3>Подтвердите вход в Telegram</h3><p>Откройте Telegram → <b>Настройки</b> → <b>Устройства</b> → <b>Подключить устройство</b> и отсканируйте код.</p><div className={`telegram-qr-frame ${qrDataUrl ? "ready" : "loading"}`}>{qrDataUrl ? <span className="telegram-qr-code" role="img" aria-label="QR-код для входа в Telegram" style={{ backgroundImage: `url(${qrDataUrl})` }} /> : <><Icon name="refresh" /><b>Создаём защищённый QR-код…</b></>}</div><div className="telegram-qr-status"><span><i />Ожидаем подтверждение в Telegram</span><small>{qrDataUrl ? (qrSecondsLeft > 0 ? `Код обновится через ${qrSecondsLeft} сек.` : "Обновляем QR-код…") : "Подключаемся…"}</small></div>{qrLoginUrl && <a className="primary telegram-open-link" href={qrLoginUrl}>Открыть в Telegram <Icon name="arrow" /></a>}<p className="telegram-same-device">Если Telegram открыт на этом же планшете или телефоне, нажмите кнопку выше и подтвердите вход в приложении.</p><div className="privacy-line"><Icon name="shield" /><p>QR-код создаётся локально в этой вкладке. Токен входа не сохраняется на сервере LeadPilot.</p></div>{error && <p className="telegram-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => window.location.reload()}>Начать заново</button></div></div>}
    {step === "password" && <form className="modal-form telegram-login-form" onSubmit={(event) => { event.preventDefault(); setBusy(true); passwordResolver.current?.(password); passwordResolver.current = null; }}><label>Пароль двухэтапной защиты<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label><div className="privacy-line"><Icon name="key" /><p>Пароль используется только внутри вкладки и нигде не сохраняется.</p></div>{error && <p className="telegram-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => window.location.reload()}>Начать заново</button><button className="primary" disabled={busy || !password}>{busy ? "Проверяем…" : "Подключить"}</button></div></form>}
    {step === "sync" && <div className="telegram-sync"><span><Icon name="refresh" /></span><small>СИНХРОНИЗАЦИЯ / TELEGRAM {accountId}</small><h3>Загрузить диалоги</h3><p>LeadPilot загрузит основные чаты, архив и ваши папки, а затем привяжет каждый источник к ИИ-агенту этого аккаунта.</p>{error && <p className="telegram-error">{error}</p>}<button className="primary" disabled={busy} onClick={() => void syncDialogs()}>{busy ? "Загружаем…" : <>Открыть диалоги <Icon name="arrow" /></>}</button></div>}
    {step === "done" && <div className="telegram-done"><span><Icon name="check" /></span><small>TELEGRAM {accountId} ПОДКЛЮЧЁН НА ЭТОМ ТЕЛЕФОНЕ</small><h3>Аккаунт готов к автопоиску</h3><p>В «Автопоиске» назначьте отдельного ИИ-агента и выберите источники из основных чатов, архива или папок Telegram.</p><div className="modal-actions"><button className="secondary danger-text" onClick={() => accountId && void clearBrowserTelegram(accountId).then(() => { setStep("credentials"); flash(`Telegram ${accountId} отключён от этого телефона`); })}>Выйти из Telegram</button><button className="primary" onClick={() => { close(); flash(`Telegram ${accountId} подключён — настройте его агента в автопоиске`); }}>Открыть чаты</button></div></div>}
  </ModalShell>;
}

function PlansModal({ close, select }: { close: () => void; select: (plan: string) => void }) { return <ModalShell close={close} wide><div className="modal-title"><span><Icon name="briefcase" /></span><div><h2>Выберите тариф</h2><p>Для демо оплата не списывается.</p></div></div><div className="plans"><button onClick={() => select("Start")}><span>START</span><b>$149<small>/мес</small></b><p>1 агент · 500 сообщений</p></button><button className="recommended" onClick={() => select("Pro")}><em>ТЕКУЩИЙ</em><span>PRO</span><b>$399<small>/мес</small></b><p>5 агентов · 2 000 сообщений</p></button><button onClick={() => select("Business")}><span>BUSINESS</span><b>$699<small>/мес</small></b><p>15 агентов · 10 000 сообщений</p></button></div></ModalShell>; }

function RecoveryModal({ close, flash }: { close: () => void; flash: (s: string) => void }) { const [email, setEmail] = useState("demo@leadpilot.ai"); return <ModalShell close={close}><div className="modal-title"><span><Icon name="inbox" /></span><div><h2>Восстановить доступ</h2><p>Отправим инструкцию на указанный email.</p></div></div><form className="modal-form" onSubmit={(e) => { e.preventDefault(); close(); flash(`Письмо отправлено на ${email}`); }}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Отмена</button><button type="submit" className="primary">Отправить письмо</button></div></form></ModalShell>; }

function ModalShell({ children, close, wide = false }: { children: ReactNode; close: () => void; wide?: boolean }) { return <div className="modal-backdrop" onMouseDown={close}><section className={`modal ${wide ? "modal-wide" : ""}`} onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" aria-label="Закрыть" onClick={close}><Icon name="close" /></button>{children}</section></div>; }

function Avatar({ initials, tone, large = false }: { initials: string; tone: string; large?: boolean }) { return <span className={`avatar ${tone} ${large ? "large" : ""}`}>{initials}</span>; }
function getInitials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LP"; }
function Toast({ text }: { text: string }) { return <div className="toast"><span><Icon name="check" /></span>{text}</div>; }

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3v-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.02A1.7 1.7 0 0 0 10 3.07V3h4v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.02A1.7 1.7 0 0 0 20.93 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>, pause: <><path d="M9 5v14M15 5v14"/></>, play: <path d="m8 5 11 7-11 7Z"/>, arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, filter: <path d="M4 5h16M7 12h10M10 19h4"/>, chevron: <path d="m9 6 6 6-6 6"/>, close: <path d="M6 6l12 12M18 6 6 18"/>, send: <path d="m3 3 18 9-18 9 4-9Zm4 9h14"/>, back: <><path d="M19 12H5M11 18l-6-6 6-6"/></>, check: <path d="m5 12 4 4L19 6"/>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>, star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>, briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>, logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>, eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, trend: <><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>, target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>, bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7Z"/>, inbox: <><path d="M4 4h16v14H4Z"/><path d="M4 13h4l2 3h4l2-3h4"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    palette: <><circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/><path d="M14 17c-1 0-2-.7-2-1.6 0-.8.7-1.4 1.6-1.4H16a2 2 0 0 1 0 4Z"/></>, telegram: <><path d="m21 4-4 16-6-5-4 3 1-5 9-6-11 5-4-2Z"/><path d="m11 15 2-2"/></>, shield: <><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>, refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2L20 12M4 12l2.4 5a7 7 0 0 0 11.5-2"/></>, link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1"/></>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>, moon: <path d="M21 13a8 8 0 1 1-10-10 6 6 0 0 0 10 10Z"/>, monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5Z"/><path d="M5 21h14"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l3 3M17 6l2 2"/></>,
    ban: <><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
    building: <><path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"/></>,
    activity: <><path d="M3 12h4l2-6 4 12 2-6h6"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

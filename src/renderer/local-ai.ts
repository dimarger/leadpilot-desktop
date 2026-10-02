const MODEL_NAME = "LeadPilot Mini v4";

export type LocalAgentProfile = {
  name?: string;
  goal?: string;
  language?: string;
  company?: string;
  services?: string;
  knowledge?: string;
  tone?: string;
  instructions?: string;
  keywords?: string;
  exclusions?: string;
  firstMessage?: string;
};

export type LocalCandidate = {
  text?: string;
  senderName?: string;
  chatTitle?: string;
  keywordHits?: string[];
};

export type LocalApplicantProfile = {
  displayName?: string;
  roleTitle?: string;
  experience?: string;
  portfolioUrl?: string;
};

export type LocalChatMessage = {
  role?: "user" | "assistant";
  content?: string;
};

export type LocalMatchResult = {
  match: boolean;
  score: number;
  reason: string;
  firstMessage: string;
  kind: "client" | "vacancy";
  model: string;
  engine: "local";
};

type Language = "ru" | "uk" | "pl" | "en";

const BUYING_INTENT = [
  /ищ(?:у|ем|ет|ут)/u, /нуж(?:ен|на|но|ны)/u, /требу(?:ется|ются|ем)/u,
  /посоветуйте/u, /порекомендуйте/u, /кто\s+(?:может|сможет|делает)/u,
  /шука(?:ю|ємо|є)/u, /потріб(?:ен|на|но|ні)/u, /порадьте/u,
  /\bszukam\b/u, /\bpotrzebuj(?:ę|emy|e)\b/u, /\bkogo\s+polecacie\b/u,
  /\b(?:i|we)\s+(?:need|are looking for|want to hire)\b/u, /\blooking\s+for\b/u,
];

const SUPPLY_INTENT = [
  /предлага(?:ю|ем)\s+(?:свои\s+)?услуг/u, /оказыва(?:ю|ем)\s+услуг/u,
  /я\s+(?:веб[- ]?)?(?:копирайтер|дизайнер|маркетолог|разработчик|таргетолог|smm)(?:\s|[,.!?]|$)/u,
  /(?:^|[.!?]\s*)(?:я|мы)\s+(?:опытн(?:ый|ая|ые)\s+)?(?:веб[- ]?)?(?:копирайтер|редактор|дизайнер|маркетолог|разработчик|таргетолог|smm|смм|фрилансер)(?:\s|[,.!?]|$)/u,
  /(?:я|мы)\s+(?:представляю|представляем|развиваю|развиваем)\s+(?:маркетинговое|креативное|digital|диджитал)?\s*агентство/u,
  /(?:работаю|являюсь|занимаюсь)\s+(?:в\s+)?(?:маркетинг|дизайн|разработк|копирайт|smm|смм)/u,
  /(?:маркетолог|копирайтер|редактор|дизайнер|разработчик|таргетолог|smm|смм)\s+(?:с\s+опытом|ищет\s+(?:работу|проекты|заказы)|готов\s+к\s+(?:работе|проектам))/u,
  /(?:беру|возьму)\s+(?:новые\s+)?(?:проекты|заказы)|открыт[аы]?\s+к\s+(?:новым\s+)?(?:проектам|заказам|предложениям)/u,
  /(?:помогаю|поможем)\s+(?:бизнесу|компаниям|брендам|экспертам)\s+(?:с|в)/u,
  /(?:разработк[а-я]*|создани[ея]|дизайн|продвижени[ея]|настройк[а-я]*)[\s\S]{0,180}(?:под\s+ключ|помогу\s+(?:реализовать|запустить|создать)|на\s+заказ)/u,
  /мо[её] портфолио/u, /ищу\s+(?:работу|заказы|клиентов)/u, /открыт[аы]?\s+к\s+(?:работе|заказам)/u,
  /пропоную\s+послуг/u, /\bszukam\s+(?:pracy|zleceń|klientów)\b/u,
  /\bjestem\s+(?:marketingowcem|copywriterem|projektantem|programistą)\b/u,
  /\bi\s+(?:am\s+(?:a\s+)?(?:marketer|copywriter|designer|developer)|offer|provide)\b/u, /\bavailable\s+for\s+(?:work|projects)\b/u,
];

const EXPLICIT_DEMAND = [
  /(?:ищ(?:у|ем)|нуж(?:ен|на|ны)|требу(?:ется|ются))\s+(?:опытн(?:ый|ая|ые)\s+)?(?:специалист|подрядчик|исполнитель|команд|агентств|копирайтер|редактор|дизайнер|маркетолог|разработчик|таргетолог|smm|смм|автор|сценарист)/u,
  /(?:кто\s+(?:может|сможет|занимается|делает)|посоветуйте|порекомендуйте)\s+[^.!?\n]{0,80}/u,
  /(?:шука(?:ю|ємо)|потріб(?:ен|на|ні))\s+(?:фахів|підряд|команд|агентств|копірайтер|дизайнер|маркетолог|розробник)/u,
  /\b(?:szukam|potrzebuj(?:ę|emy))\s+(?:specjalist|agencj|copywriter|projektant|marketingow|programist)/u,
  /\b(?:looking\s+for|need|want\s+to\s+hire)\s+(?:an?\s+)?(?:specialist|contractor|agency|copywriter|designer|marketer|developer)/u,
];

const SERVICE_QUESTION = /(?:сколько\s+стоит|какая\s+цена|можете\s+(?:сделать|помочь)|занимаетесь\s+ли|как\s+заказать|вартість|скільки\s+коштує|ile\s+kosztuje|can\s+you\s+help|how\s+much)/u;

const NOISE_INTENT = [
  /курс(?:ы|а)?/u, /обучени[ея]/u, /вебинар/u, /новост[ьи]/u,
  /дайджест/u, /розыгрыш/u, /скидка\s+на\s+курс/u, /подписывайтесь/u,
  /\bfree\s+(?:course|webinar)\b/u, /\bnewsletter\b/u,
];

const VACANCY_STRONG = [
  /#ваканси/u, /\bваканси(?:я|и|ю|ей)\b/u, /\bvacanc(?:y|ies)\b/u,
  /ищ(?:ем|ут)\s+[^.!?\n]{0,80}\s+в\s+команд/u, /требу(?:ется|ются)\s+[^.!?\n]{0,80}\s+в\s+команд/u,
  /открыт[а-я\s]{0,18}(?:позици|набор)/u, /на\s+собеседовани/u,
];

const VACANCY_HINTS = [
  /обязанност/u, /требовани/u, /услови[яе]/u, /занятост/u, /удал[её]нн/u,
  /зарплат/u, /оплат[аыу]/u, /ставк[аеи]/u, /тестов(?:ое|ого)\s+задани/u,
  /присылайте\s+(?:резюме|портфолио|отклик)/u, /отклик(?:аться|нуться|и)/u,
  /резюме/u, /hr\b/u, /remote\b/u, /full[ -]?time/u, /part[ -]?time/u,
];

const JOB_ROLES = [
  "копирайтер", "редактор", "контент-райтер", "content writer", "автор", "сценарист",
  "smm", "контент-менеджер", "маркетолог", "seo-копирайтер", "переводчик", "журналист",
];

const VACANCY_EXCLUSION_WORDS = new Set(["вакансия", "вакансии", "работа", "требуется", "ищем сотрудника"]);

const BUYER_WORDS = ["мне", "нам", "наш", "проект", "команд", "бизнес", "компани", "бренд", "запуск", "задач", "my", "our", "project", "company", "business", "projekt", "firma", "potrzeb"];
const DETAIL_WORDS = ["бюджет", "срок", "дедлайн", "оплата", "цена", "стоимость", "zł", "грн", "руб", "$", "budget", "deadline", "price", "termin", "budżet"];
const STOP_WORDS = new Set(["ищу", "ищем", "нужен", "нужна", "нужно", "требуется", "кто", "может", "нам", "мне", "для", "под", "или", "the", "for", "need", "looking", "szukam", "potrzebuję", "potrzebujemy", "шукаю", "потрібен", "потрібна"]);

function clean(value: unknown, max = 4000) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function normalize(value: unknown) {
  return clean(value).toLocaleLowerCase().replace(/ё/g, "е");
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function splitPhrases(value: unknown) {
  const raw = typeof value === "string" ? value.slice(0, 6000) : "";
  return raw.split(/\n|,/).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function tokens(value: unknown) {
  return normalize(value).match(/[\p{L}\p{N}$€₴₽]+/gu) || [];
}

function stem(token: string) {
  if (token.length <= 5) return token;
  return token
    .replace(/(иями|ями|ами|ого|ему|ому|ыми|ими|ая|яя|ое|ее|ые|ие|ый|ий|ой|ам|ям|ах|ях|ов|ев|ы|и|а|я|у|ю|е|о)$/u, "")
    .replace(/(ing|ers|ies|ed|es|s)$/u, "")
    .replace(/(ami|ach|ego|emu|owie|ów|ie|y|a|u)$/u, "");
}

function meaningfulTokens(value: unknown) {
  return tokens(value).filter((token) => token.length >= 3 && !STOP_WORDS.has(token)).map(stem);
}

function overlap(left: unknown, right: unknown) {
  const a = new Set(meaningfulTokens(left));
  const b = new Set(meaningfulTokens(right));
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) {
    if ([...b].some((other) => other === token || (token.length >= 5 && other.length >= 5 && (other.startsWith(token) || token.startsWith(other))))) common += 1;
  }
  return Math.min(1, common / Math.max(1, Math.min(a.size, b.size)));
}

function phraseSignal(text: string, phrases: string[]) {
  if (!phrases.length) return 0;
  let strongest = 0;
  for (const phrase of phrases) {
    const normalizedPhrase = normalize(phrase);
    if (normalizedPhrase && text.includes(normalizedPhrase)) strongest = 1;
    else strongest = Math.max(strongest, overlap(text, normalizedPhrase));
  }
  return strongest;
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function containsAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

/**
 * A tiny two-layer neural scorer. The input is a compact semantic feature
 * vector and the weights are bundled with LeadPilot, so inference never calls
 * an outside model or API.
 */
function neuralLeadProbability(features: number[]) {
  const [keyword, service, intent, buyer, details, question, supply, noise, excluded, tooShort] = features;
  const demandNeuron = sigmoid(-2.55 + 2.25 * keyword + 1.9 * service + 2.45 * intent + 0.85 * buyer + 0.45 * details + 0.35 * question);
  const riskNeuron = sigmoid(-3.1 + 4.6 * supply + 3.2 * noise + 5.2 * excluded + 1.25 * tooShort);
  const relevanceNeuron = sigmoid(-2.25 + 3.0 * keyword + 2.25 * service + 0.75 * intent);
  return sigmoid(-3.55 + 4.45 * demandNeuron + 2.15 * relevanceNeuron - 4.65 * riskNeuron + 0.4 * details);
}

function detectLanguage(value: string, fallback?: string): Language {
  const text = normalize(value);
  if (/[іїєґ]/u.test(text) || /(?:потріб|шука|зручн|будь ласка)/u.test(text)) return "uk";
  if (/[ąćęłńóśźż]/u.test(text) || /\b(?:szukam|potrzebuj|proszę|firma|cena|termin)\b/u.test(text)) return "pl";
  if (!/[а-я]/u.test(text) && /[a-z]/u.test(text)) return "en";
  return fallback === "uk" || fallback === "pl" || fallback === "en" ? fallback : "ru";
}

function safeName(value: unknown) {
  const full = clean(value, 80).replace(/^@/, "");
  if (!full || /автор скрыт|unknown/i.test(full)) return "";
  const first = full.split(/\s+/)[0].replace(/[^\p{L}'’-]/gu, "");
  return first.length >= 2 && first.length <= 25 ? first : "";
}

function isVacancy(value: string) {
  if (matchesAny(value, VACANCY_STRONG)) return true;
  const hintCount = VACANCY_HINTS.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
  const asksForRole = /(?:ищ(?:ем|ут)|нуж(?:ен|на)|требу(?:ется|ются))\s+[^.!?\n]{0,70}(?:копирайтер|редактор|райтер|автор|сценарист|smm|маркетолог|переводчик|журналист)/u.test(value);
  return asksForRole || hintCount >= 2;
}

export type InboundIntent = "vacancy" | "client_request" | "promotion_prospect" | "self_promotion" | "noise" | "discussion";

export function isClientAcquisitionAgent(agent: LocalAgentProfile) {
  const profile = normalize([agent.name, agent.goal, agent.services, agent.knowledge, agent.instructions].filter(Boolean).join(" "));
  return /(?:leadpilot|lead\s*hunter|лидогенерац|поиск[а-я\s-]{0,18}клиент|привлеч[а-я]{0,12}\s+клиент|нов(?:ые|ых)\s+клиент|продвижени[ея]\s+(?:услуг|бизнес)|outreach|client acquisition)/u.test(profile);
}

export function classifyInboundIntent(value: unknown, applicationEnabled = true): InboundIntent {
  const text = normalize(value);
  if (!text) return "discussion";
  const explicitDemand = matchesAny(text, EXPLICIT_DEMAND) || SERVICE_QUESTION.test(text);
  if (applicationEnabled && isVacancy(text)) return "vacancy";
  if (matchesAny(text, SUPPLY_INTENT) && !explicitDemand) return "self_promotion";
  if (matchesAny(text, NOISE_INTENT) && !explicitDemand) return "noise";
  if (explicitDemand || matchesAny(text, BUYING_INTENT)) return "client_request";
  return "discussion";
}

function vacancyRole(candidate: LocalCandidate, agent: LocalAgentProfile) {
  const text = normalize(candidate.text);
  const explicit = JOB_ROLES.find((role) => text.includes(role));
  if (explicit) return explicit;
  const hit = (Array.isArray(candidate.keywordHits) ? candidate.keywordHits : []).find((item) => clean(item));
  return clean(hit, 60) || splitPhrases(agent.keywords)[0] || clean(agent.name, 60) || "специалиста";
}

function validPortfolioUrl(value: unknown) {
  const raw = clean(value, 1000);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? raw : "";
  } catch { return ""; }
}

function vacancyExperience(agent: LocalAgentProfile, applicant: LocalApplicantProfile, vacancyText: string) {
  void agent;
  const facts = sentences(clean(applicant.experience, 2500));
  const vacancyTokens = meaningfulTokens(vacancyText);
  const ranked = facts.map((sentence, index) => {
    const factTokens = meaningfulTokens(sentence);
    const shared = vacancyTokens.reduce((sum, token) => sum + (factTokens.some((item) => item === token || (item.length >= 5 && token.length >= 5 && (item.startsWith(token) || token.startsWith(item)))) ? 1 : 0), 0);
    return { sentence: compact(sentence, 220), score: shared * 2 - index * 0.01 };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score);
  if (ranked.length) return asSentence(ranked[0].sentence);
  return asSentence(clean(applicant.experience, 280));
}

function vacancyApplication(agent: LocalAgentProfile, candidate: LocalCandidate, applicant: LocalApplicantProfile, language: Language) {
  const name = clean(applicant.displayName, 80) || "Дмитрий";
  const title = clean(applicant.roleTitle, 100) || "копирайтер";
  const role = vacancyRole(candidate, agent);
  const experience = vacancyExperience(agent, applicant, clean(candidate.text, 4000));
  const portfolio = validPortfolioUrl(applicant.portfolioUrl);

  if (language === "uk") return compact(`Добрий день! Мене звати ${name}, я ${title} з досвідом. Побачив вашу вакансію «${role}». ${experience ? `Для ваших задач релевантний мій досвід: ${experience} ` : ""}Готовий обговорити формат роботи та, за потреби, виконати тестове завдання.${portfolio ? ` Портфоліо: ${portfolio}` : ""}`, 900);
  if (language === "pl") return compact(`Dzień dobry! Mam na imię ${name} i jestem ${title} z doświadczeniem. Zobaczyłem ofertę „${role}”. ${experience ? `Moje istotne doświadczenie: ${experience} ` : ""}Chętnie omówię współpracę i w razie potrzeby wykonam zadanie testowe.${portfolio ? ` Portfolio: ${portfolio}` : ""}`, 900);
  if (language === "en") return compact(`Hello! My name is ${name}, and I’m an experienced ${title}. I saw your ${role} opening. ${experience ? `Relevant experience: ${experience} ` : ""}I’d be glad to discuss the role and complete a test assignment if needed.${portfolio ? ` Portfolio: ${portfolio}` : ""}`, 900);
  return compact(`Добрый день! Меня зовут ${name}, я ${title} с опытом. Увидел вашу вакансию «${role}». ${experience ? `Для ваших задач особенно релевантен мой опыт: ${experience} ` : ""}Готов обсудить формат работы и при необходимости выполнить тестовое задание.${portfolio ? ` Портфолио: ${portfolio}` : ""}`, 900);
}

function topicFrom(candidate: LocalCandidate, agent: LocalAgentProfile) {
  const hit = (Array.isArray(candidate.keywordHits) ? candidate.keywordHits : []).find(Boolean);
  const source = hit || clean(candidate.text, 180) || splitPhrases(agent.keywords)[0] || clean(agent.services, 120);
  const excerpt = clean(source, 120)
    .replace(/^(?:здравствуйте|добрый день|привет)[,!.\s-]*/iu, "")
    .replace(/[.!?].*$/u, "")
    .replace(/https?:\/\/\S+/giu, "")
    .trim();
  return excerpt.slice(0, 72) || "вашей задаче";
}

function firstMessage(agent: LocalAgentProfile, candidate: LocalCandidate, language: Language) {
  const name = safeName(candidate.senderName);
  const topic = topicFrom(candidate, agent);
  const company = clean(agent.company, 80);
  if (language === "uk") return `Вітаю${name ? `, ${name}` : ""}! Побачив ваш запит: «${topic}». Схоже, ${company ? `команда «${company}» може` : "ми можемо"} допомогти. Пропоную короткий дзвінок на 10–15 хвилин, щоб обговорити деталі — коли вам зручно?`;
  if (language === "pl") return `Dzień dobry${name ? `, ${name}` : ""}! Widziałem zapytanie: „${topic}”. Wygląda na to, że ${company ? `zespół „${company}” może` : "możemy"} pomóc. Proponuję krótką rozmowę 10–15 minut — kiedy będzie wygodnie?`;
  if (language === "en") return `Hi${name ? ` ${name}` : ""}! I saw your request about ${topic}. It looks like ${company || "we"} may be able to help. Could we have a quick 10–15 minute call to discuss the details? What time works for you?`;
  return `Здравствуйте${name ? `, ${name}` : ""}! Увидел ваш запрос: «${topic}». Похоже, ${company ? `команда «${company}» может` : "мы можем"} помочь. Предлагаю короткий звонок на 10–15 минут, чтобы обсудить детали — когда вам удобно?`;
}

function providerLabel(value: unknown, language: Language) {
  const text = normalize(value);
  const roles: Array<[RegExp, Record<Language, string>]> = [
    [/(?:маркетингов|digital|диджитал)[а-я\s-]{0,18}агентств|агентство\s+(?:маркетинг|продвиж)/u, { ru: "маркетинговое агентство", uk: "маркетингову агенцію", pl: "agencję marketingową", en: "marketing agency" }],
    [/(?:веб[- ]?)?дизайнер|веб[- ]?дизайн|ux\s*\/\s*ui|дизайн[а-я\s]{0,20}сайт/u, { ru: "услуги веб-дизайна", uk: "послуги вебдизайну", pl: "usługi webdesignu", en: "web design services" }],
    [/(?:smm|смм)[- ]?специалист/u, { ru: "услуги SMM", uk: "послуги SMM", pl: "usługi SMM", en: "SMM services" }],
    [/маркетолог|таргетолог/u, { ru: "маркетинговые услуги", uk: "маркетингові послуги", pl: "usługi marketingowe", en: "marketing services" }],
    [/копирайтер|редактор|контент/u, { ru: "услуги по работе с контентом", uk: "послуги з контенту", pl: "usługi contentowe", en: "content services" }],
    [/разработчик|программист|developer/u, { ru: "услуги разработки", uk: "послуги розробки", pl: "usługi programistyczne", en: "development services" }],
  ];
  return roles.find(([pattern]) => pattern.test(text))?.[1][language] || ({ ru: "свои профессиональные услуги", uk: "свої професійні послуги", pl: "swoje usługi", en: "your professional services" } as Record<Language, string>)[language];
}

function promotionMessage(candidate: LocalCandidate, language: Language) {
  const name = safeName(candidate.senderName);
  const role = providerLabel(candidate.text, language);
  if (language === "uk") return `Вітаю${name ? `, ${name}` : ""}! Побачив, що ви розвиваєте ${role}. LeadPilot допомагає фахівцям та агенціям знаходити потенційних клієнтів у Telegram і починати перші діалоги. Показати коротке демо?`;
  if (language === "pl") return `Dzień dobry${name ? `, ${name}` : ""}! Widzę, że rozwijasz ${role}. LeadPilot pomaga specjalistom i agencjom znajdować potencjalnych klientów na Telegramie i rozpoczynać pierwsze rozmowy. Pokazać krótkie demo?`;
  if (language === "en") return `Hi${name ? ` ${name}` : ""}! I saw that you are growing ${role}. LeadPilot helps specialists and agencies find potential clients in Telegram and start the first conversations. Would you like a quick demo?`;
  return `Здравствуйте${name ? `, ${name}` : ""}! Увидел, что вы развиваете ${role}. LeadPilot помогает специалистам и агентствам находить потенциальных клиентов в Telegram и начинать первые диалоги. Показать короткое демо?`;
}

export function analyzeLeadLocally(agent: LocalAgentProfile, candidate: LocalCandidate, applicant: LocalApplicantProfile = {}, applicationEnabled = true): LocalMatchResult {
  const text = normalize(candidate.text);
  const inboundIntent = classifyInboundIntent(text, applicationEnabled);
  const vacancy = inboundIntent === "vacancy";
  const promotionProspect = inboundIntent === "self_promotion" && isClientAcquisitionAgent(agent);
  const keywords = splitPhrases(agent.keywords);
  const profileKeywords = vacancy ? [clean(applicant.roleTitle, 100)].filter(Boolean) : keywords;
  const exclusions = vacancy ? [] : splitPhrases(agent.exclusions);
  const suppliedHits = Array.isArray(candidate.keywordHits) ? candidate.keywordHits.filter(Boolean) : [];
  const keyword = Math.max(phraseSignal(text, profileKeywords), phraseSignal(text, suppliedHits));
  const serviceContext = vacancy ? `${clean(applicant.roleTitle)} ${clean(applicant.experience)}` : `${clean(agent.services)} ${clean(agent.goal)}`;
  const service = Math.max(keyword, overlap(text, serviceContext));
  const intent = inboundIntent === "client_request" || vacancy ? 1 : /[?!]/u.test(text) ? 0.25 : 0;
  const buyer = containsAny(text, BUYER_WORDS) ? 1 : 0;
  const details = containsAny(text, DETAIL_WORDS) ? 1 : 0;
  const question = /[?]/u.test(text) || /(?:сколько|как|когда|кого|\bwhere\b|\bhow\b|\bwhen\b|\bile\b|\bjak\b|\bkiedy\b)/u.test(text) ? 1 : 0;
  const supply = inboundIntent === "self_promotion" && !promotionProspect ? 1 : 0;
  const noiseSignal = matchesAny(text, NOISE_INTENT);
  const noise = noiseSignal ? (intent >= 1 ? 0.25 : 1) : 0;
  const excluded = exclusions.some((phrase) => {
    const normalizedPhrase = normalize(phrase);
    if (vacancy && VACANCY_EXCLUSION_WORDS.has(normalizedPhrase)) return false;
    return normalizedPhrase ? phraseSignal(text, [normalizedPhrase]) >= 0.75 : false;
  }) ? 1 : 0;
  const tooShort = tokens(text).length < 3 ? 1 : 0;
  const probability = promotionProspect
    ? Math.min(0.97, 0.86 + 0.06 * Math.max(keyword, service))
    : vacancy
    ? sigmoid(-1.35 + 2.9 * keyword + 2.15 * service + 1.45 * details - 3.8 * excluded - 2.2 * noise)
    : neuralLeadProbability([keyword, service, intent, buyer, details, question, supply, noise, excluded, tooShort]);
  const score = Math.max(1, Math.min(99, Math.round(probability * 100)));
  const match = vacancy
    ? score >= 58 && !excluded && noise < 1 && Math.max(keyword, service) >= 0.22
    : promotionProspect
      ? score >= 58 && !excluded && noise < 1
      : inboundIntent === "client_request" && score >= 58 && !excluded && supply < 1 && noise < 1 && Math.max(keyword, service) >= 0.22;

  let reason = "Слабое совпадение с услугами агента";
  if (excluded) reason = "Найдено исключающее слово из настроек агента";
  else if (vacancy && match) reason = `Вакансия «${vacancyRole(candidate, agent)}» совпадает с опытом и ключевыми фразами`;
  else if (vacancy) reason = "Это вакансия, но требования слабо совпадают с профилем кандидата";
  else if (promotionProspect) reason = "Специалист продвигает свои услуги и является целевой аудиторией LeadPilot — ему можно предложить поиск клиентов";
  else if (supply) reason = "Автор рассказывает о себе или предлагает свои услуги, но агент не настроен на продвижение LeadPilot";
  else if (noise >= 1) reason = "Похоже на рекламу, обучение или информационный пост";
  else if (inboundIntent === "discussion") reason = "Есть упоминание профессии или услуги, но нет запроса на исполнителя и нет вакансии";
  else if (match && intent >= 1 && keyword >= 0.75) reason = "Явный запрос на услугу и сильное совпадение с ключевыми фразами";
  else if (match && intent >= 1) reason = "Автор явно ищет исполнителя; задача совпадает с услугами агента";
  else if (match) reason = "Смысл сообщения совпадает с услугами агента, но запрос стоит проверить";

  const language = detectLanguage(text, agent.language);
  return {
    match,
    score,
    reason,
    firstMessage: match ? (vacancy ? vacancyApplication(agent, candidate, applicant, language) : promotionProspect ? promotionMessage(candidate, language) : firstMessage(agent, candidate, language)) : "",
    kind: vacancy ? "vacancy" : "client",
    model: MODEL_NAME,
    engine: "local",
  };
}

function sentences(value: unknown) {
  return clean(value, 6000).split(/(?<=[.!?])\s+|\n+/u).map((item) => item.trim()).filter(Boolean);
}

function relevantFacts(agent: LocalAgentProfile, pattern: RegExp) {
  return sentences(agent.knowledge).filter((sentence) => pattern.test(normalize(sentence))).slice(0, 2);
}

type DialogIntent = "price" | "timeline" | "availability" | "process" | "services" | "objection" | "affirmation" | "greeting" | "details" | "unknown";

const INTENT_PATTERNS: Record<Exclude<DialogIntent, "unknown">, RegExp> = {
  price: /(?:цен|стоим|сколько|поч[её]м|бюджет|прайс|вартіст|скільки|cena|koszt|ile koszt|price|cost|how much)/u,
  timeline: /(?:срок|когда (?:будет )?готов|сколько времени|дедлайн|термін|коли (?:буде )?готов|termin|jak długo|deadline|timeline|how long)/u,
  availability: /(?:когда (?:будет )?удобно|когда можете|время созвон|сегодня|завтра|вечером|утром|зручн|дзвін|kiedy|rozmow|call|available|availability)/u,
  process: /(?:как.{0,30}(?:работает|строится работа)|как вы работаете|что дальше|процесс|этап|с чего начина|що робите|як працю|jak to działa|process|how does|how it works)/u,
  services: /(?:что (?:вы )?делаете|чем поможете|какие услуги|что умеете|послуги|що робите|usługi|czym się|services|what do you do)/u,
  objection: /(?:дорого|не уверен|подумаю|не надо|не интересно|уже нашли|есть исполнитель|too expensive|not interested|za drogo|не впевнен)/u,
  affirmation: /^(?:да|ага|хорошо|ок(?:ей)?|подходит|договорились|конечно|так|yes|sure|okay|dobrze|так|гаразд)[!.,\s]*$/u,
  greeting: /^(?:привет|здравств|добрый|вітаю|привіт|dzień dobry|cześć|hello|hi)(?:\s|[!,.]|$)/u,
  details: /(?:нужен|нужна|нужно|хочу|задача|проект|сайт|текст|дизайн|реклама|бот|канал|need|want|project|potrzeb)/u,
};

function scoreIntent(text: string, key: Exclude<DialogIntent, "unknown">) {
  const match = text.match(INTENT_PATTERNS[key]);
  if (!match) return 0;
  const exactBonus = key === "affirmation" || key === "greeting" ? 2 : 0;
  return 1 + exactBonus + Math.min(1, (match[0]?.length || 0) / 20);
}

function detectIntent(text: string, previousUserText: string): DialogIntent {
  const ranked = (Object.keys(INTENT_PATTERNS) as Array<Exclude<DialogIntent, "unknown">>)
    .map((key) => ({ key, score: scoreIntent(text, key) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.key === "affirmation" && /(?:созвон|время|когда|call|kiedy)/u.test(previousUserText)) return "availability";
  return ranked[0]?.key || "unknown";
}

function rankedFacts(agent: LocalAgentProfile, query: string, intent: DialogIntent) {
  const intentPatterns: Partial<Record<DialogIntent, RegExp>> = {
    price: /(?:цен|стоим|оплат|бюджет|прайс|грн|руб|доллар|злот|\$|€|₴|₽|вартіст|cena|koszt|price|cost)/u,
    timeline: /(?:срок|дн|недел|месяц|час|дедлайн|термін|тиж|termin|dzień|tydzień|deadline|day|week|month)/u,
    availability: /(?:пн|вт|ср|чт|пт|сб|вс|будн|выходн|час|время|график|сьогодні|завтра|monday|friday|poniedział|piątek)/u,
    process: /(?:этап|процесс|сначала|затем|после|бриф|созвон|анал|узгод|process|stage|brief)/u,
    services: /(?:услуг|делаем|помога|разработ|созда|напис|продвиж|послуг|service|offer)/u,
  };
  const queryTokens = meaningfulTokens(query);
  return sentences(`${clean(agent.services, 2500)}\n${clean(agent.knowledge, 6000)}`)
    .map((sentence, index) => {
      const sentenceText = normalize(sentence);
      const semantic = queryTokens.reduce((sum, token) => sum + (meaningfulTokens(sentenceText).some((item) => item === token || (item.length > 4 && (item.startsWith(token) || token.startsWith(item)))) ? 1 : 0), 0);
      const intentBonus = intentPatterns[intent]?.test(sentenceText) ? 2.5 : 0;
      return { sentence: asSentence(sentence), score: semantic + intentBonus - index * 0.01 };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.sentence);
}

function previousUserMessage(history: LocalChatMessage[]) {
  const users = history.filter((message) => message.role === "user").map((message) => normalize(message.content));
  return users.at(-2) || "";
}

function knownProjectContext(history: LocalChatMessage[]) {
  return history.filter((message) => message.role === "user").slice(-4, -1).map((message) => clean(message.content, 300)).join(" ");
}

function choose(seed: string, variants: string[]) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return variants[hash % variants.length];
}

function callPrompt(language: Language) {
  if (language === "uk") return "Можемо обговорити деталі на короткому дзвінку 10–15 хвилин. Коли вам зручно?";
  if (language === "pl") return "Możemy omówić szczegóły podczas krótkiej rozmowy 10–15 minut. Kiedy będzie wygodnie?";
  if (language === "en") return "We can cover the details in a quick 10–15 minute call. What time works for you?";
  return "Можем обсудить детали на коротком звонке 10–15 минут. Когда вам удобно?";
}

function noExactFact(language: Language, subject: "price" | "time") {
  if (language === "uk") return subject === "price" ? "Точна вартість у базі не вказана: вона залежить від завдання й обсягу." : "Точний термін у базі не вказаний: він залежить від обсягу завдання.";
  if (language === "pl") return subject === "price" ? "Dokładna cena nie jest podana w bazie; zależy od zakresu zadania." : "Dokładny termin nie jest podany w bazie; zależy od zakresu zadania.";
  if (language === "en") return subject === "price" ? "The knowledge base does not contain an exact price; it depends on the scope." : "The knowledge base does not contain an exact timeline; it depends on the scope.";
  return subject === "price" ? "Точная стоимость в базе не указана: она зависит от задачи и объёма." : "Точный срок в базе не указан: он зависит от объёма задачи.";
}

function compact(value: string, max = 360) {
  return clean(value, max).replace(/\s+([,.!?])/g, "$1");
}

function asSentence(value: string) {
  const text = compact(value, 420);
  return text && !/[.!?]$/u.test(text) ? `${text}.` : text;
}

export function answerLocally(agent: LocalAgentProfile, messages: LocalChatMessage[]) {
  const history = messages.filter((message) => clean(message.content)).slice(-10);
  const question = clean(history.at(-1)?.content, 2000);
  const text = normalize(question);
  const language = detectLanguage(text, agent.language);
  const intent = detectIntent(text, previousUserMessage(history));
  const company = clean(agent.company, 100) || "компания";
  const facts = rankedFacts(agent, `${knownProjectContext(history)} ${question}`, intent);
  const hasProjectDetails = meaningfulTokens(knownProjectContext(history)).length >= 3 || intent === "details";
  let answer: string;

  if (intent === "price") {
    answer = facts.length ? `${facts.join(" ")} ${hasProjectDetails ? callPrompt(language) : "Чтобы сориентировать точнее, что именно нужно сделать и в каком объёме?"}` : `${noExactFact(language, "price")} Что именно нужно сделать и в каком объёме?`;
  } else if (intent === "timeline") {
    answer = facts.length ? `${facts.join(" ")} ${hasProjectDetails ? callPrompt(language) : "Подскажите объём задачи и желаемую дату запуска — тогда срок можно оценить точнее."}` : `${noExactFact(language, "time")} Какой объём задачи и к какой дате нужен результат?`;
  } else if (intent === "availability") {
    answer = `${facts.length ? `${facts.join(" ")} ` : ""}${callPrompt(language)}`;
  } else if (intent === "process") {
    const process = facts.length ? facts.join(" ") : "Сначала уточняем задачу и ожидаемый результат, затем оцениваем объём и предлагаем подходящий формат работы.";
    answer = `${process} ${hasProjectDetails ? callPrompt(language) : "Расскажите в двух словах, какая у вас задача?"}`;
  } else if (intent === "services") {
    answer = `${facts.length ? facts.join(" ") : asSentence(agent.services || "Помогаем с задачами, указанными в профиле агента.")} А какая задача сейчас стоит у вас?`;
  } else if (intent === "objection") {
    answer = choose(text, ["Понимаю. Не буду уговаривать. Если скажете, что именно не подошло — цена, сроки или формат — отвечу по существу.", "Понял вас. Чтобы не тратить ваше время: вопрос в бюджете, сроках или сама услуга уже неактуальна?"]);
  } else if (intent === "affirmation") {
    answer = /(?:созвон|время|когда|call|kiedy)/u.test(previousUserMessage(history)) ? callPrompt(language) : "Отлично. Тогда уточните, пожалуйста, саму задачу и желаемый результат — после этого смогу ответить предметно.";
  } else if (intent === "greeting" && tokens(text).length <= 5) {
    if (language === "uk") answer = `Вітаю! Я локальний помічник ${company}. Коротко відповім про послуги, вартість і строки. Що вас цікавить?`;
    else if (language === "pl") answer = `Dzień dobry! Jestem lokalnym asystentem ${company}. Mogę krótko odpowiedzieć o usługach, cenie i terminach. Co Państwa interesuje?`;
    else if (language === "en") answer = `Hi! I’m ${company}'s local assistant. I can answer basic questions about services, pricing, and timing. What would you like to know?`;
    else answer = `Здравствуйте! Я ИИ-помощник ${company}. Могу разобраться в задаче, ответить по услугам, цене и срокам. Что вам нужно?`;
  } else if (facts.length) {
    answer = `${facts.join(" ")} ${hasProjectDetails ? "Если хотите, можем перейти к короткому созвону и обсудить детали." : "Это похоже на вашу задачу или речь о чём-то другом?"}`;
  } else if (intent === "details") {
    const deadlineKnown = /(?:сегодня|завтра|к концу|до \d|на этой|на следующ|дн|недел|месяц|срок|дедлайн|deadline|week|month)/u.test(text);
    const resultKnown = /(?:чтобы|для (?:продаж|запуска|курса|бизнеса|магазина)|увелич|получ|запуст|продат|привлеч)/u.test(text);
    const clarification = !resultKnown ? "Какой результат должен дать этот проект?" : !deadlineKnown ? "К какой дате нужен результат?" : "Есть ориентир по объёму или бюджету?";
    answer = `Понял: ${asSentence(compact(question, 180))} ${clarification}`;
  } else {
    if (language === "uk") answer = "Не хочу відповідати навмання. Уточніть, будь ласка: вас цікавить ціна, строк, процес роботи чи конкретна послуга?";
    else if (language === "pl") answer = "Nie chcę zgadywać. Czy chodzi o cenę, termin, sposób pracy czy konkretną usługę?";
    else if (language === "en") answer = "I don’t want to guess. Are you asking about pricing, timing, the process, or a specific service?";
    else answer = "Не хочу отвечать наугад. Уточните, пожалуйста: вас интересует цена, срок, процесс работы или конкретная услуга?";
  }

  return { answer: compact(answer, 900), model: MODEL_NAME, engine: "local" as const };
}

export function getLocalModelName() {
  return MODEL_NAME;
}

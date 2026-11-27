import { KnowledgeChunk, KnowledgeCitation } from '@/lib/knowledge/knowledgeRetrieval';

export type AiProviderName = 'groq' | 'openrouter';

// Verified live models from Groq /models & OpenRouter /models (:free) checks
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_GROQ_FAST_MODEL = 'openai/gpt-oss-20b';
export const DEFAULT_OPENROUTER_FREE_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
export const DEFAULT_OPENROUTER_BACKUP_FREE_MODEL = 'openrouter/free';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROVIDER_TIMEOUT_MS = 25_000;
const OPENROUTER_FREE_DAILY_LIMIT = 50; // Observed on account /auth/key

export const UNVERIFIED_FALLBACK_MESSAGE =
  'I could not verify this information from the currently available ChittorTech knowledge sources. Please consult the relevant official BIS, NABL or ISO documentation.';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResponsePayload {
  answer: string;
  citations: KnowledgeCitation[];
  suggestedFollowUps: string[];
  status:
    | 'local_answered'
    | 'needs_ai_approval'
    | 'ai_assisted'
    | 'answered'
    | 'insufficient_sources'
    | 'clarification_needed';
  provider: AiProviderName | 'local-database' | 'deterministic-guard';
  model: string;
  isExternalAi?: boolean;
  failoverUsed: boolean;
  failoverReason?: string;
  latencyMs: number;
  groundedSourceCount: number;
}

export interface ProviderHealthSnapshot {
  provider: AiProviderName;
  configured: boolean;
  model: string;
  fastModel?: string;
  status: 'healthy' | 'cooldown' | 'unconfigured';
  cooldownUntil: number | null;
  consecutiveFailures: number;
  lastErrorCode: string | null;
  totalRequests: number;
  totalSuccesses: number;
  totalFailovers: number;
  dailyRequests: { date: string; count: number; limit?: number };
  lastLatencyMs: number | null;
}

interface InternalProviderState {
  status: 'healthy' | 'cooldown';
  cooldownUntil: number | null;
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastErrorCode: string | null;
  totalRequests: number;
  totalSuccesses: number;
  totalFailovers: number;
  dailyDate: string;
  dailyCount: number;
  lastLatencyMs: number | null;
}

declare global {
  var __chittortechAiProviderHealth: Record<AiProviderName, InternalProviderState> | undefined;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialProviderState(): InternalProviderState {
  return {
    status: 'healthy',
    cooldownUntil: null,
    consecutiveFailures: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorCode: null,
    totalRequests: 0,
    totalSuccesses: 0,
    totalFailovers: 0,
    dailyDate: todayKey(),
    dailyCount: 0,
    lastLatencyMs: null,
  };
}

function getHealthStore(): Record<AiProviderName, InternalProviderState> {
  if (!globalThis.__chittortechAiProviderHealth) {
    globalThis.__chittortechAiProviderHealth = {
      groq: createInitialProviderState(),
      openrouter: createInitialProviderState(),
    };
  }
  const today = todayKey();
  for (const p of ['groq', 'openrouter'] as AiProviderName[]) {
    if (globalThis.__chittortechAiProviderHealth[p].dailyDate !== today) {
      globalThis.__chittortechAiProviderHealth[p].dailyDate = today;
      globalThis.__chittortechAiProviderHealth[p].dailyCount = 0;
    }
  }
  return globalThis.__chittortechAiProviderHealth;
}

export function resetProviderHealthForTest(): void {
  globalThis.__chittortechAiProviderHealth = {
    groq: createInitialProviderState(),
    openrouter: createInitialProviderState(),
  };
}

export class AiProviderError extends Error {
  provider: AiProviderName;
  statusCode: number;
  code: 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'UPSTREAM_ERROR';
  retryAfterSeconds?: number;

  constructor(
    provider: AiProviderName,
    message: string,
    statusCode: number,
    code: AiProviderError['code'],
    retryAfterSeconds?: number
  ) {
    super(message);
    this.provider = provider;
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getProviderOrder(): AiProviderName[] {
  const pref = (process.env.AI_PRIMARY_PROVIDER || 'groq').trim().toLowerCase();
  return pref === 'openrouter' ? ['openrouter', 'groq'] : ['groq', 'openrouter'];
}

export function isProviderConfigured(provider: AiProviderName): boolean {
  if (provider === 'groq') {
    const k = (process.env.GROQ_API_KEY || '').trim();
    return k.length > 0 && !k.includes('your-groq-api-key');
  }
  const k = (process.env.OPENROUTER_API_KEY || '').trim();
  return k.length > 0 && !k.includes('your-openrouter-api-key');
}

export function resolveOpenRouterModel(): { model: string; blockedPaid: boolean } {
  const configured = (process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_FREE_MODEL).trim();
  const allowPaid = process.env.ALLOW_PAID_AI_MODELS === 'true';
  if (!allowPaid && !configured.endsWith(':free') && configured !== 'openrouter/free') {
    return { model: DEFAULT_OPENROUTER_FREE_MODEL, blockedPaid: true };
  }
  return { model: configured || DEFAULT_OPENROUTER_FREE_MODEL, blockedPaid: false };
}

export function selectGroqModel(question: string, historyLen: number): string {
  const primaryModel = (process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim() || DEFAULT_GROQ_MODEL;
  const fastModel = (process.env.GROQ_FAST_MODEL || DEFAULT_GROQ_FAST_MODEL).trim() || DEFAULT_GROQ_FAST_MODEL;
  const wordCount = question.trim().split(/\s+/).length;
  const isComplex =
    historyLen > 0 ||
    wordCount > 14 ||
    /\b(compare|difference|vs|farak|farq|antar|clauses?|procedure|checklist|audit|non-?conformit|traceability)\b/i.test(
      question
    );
  return isComplex ? primaryModel : fastModel;
}

export function getDualProviderStatus(nowMs: number = Date.now()): {
  anyConfigured: boolean;
  primary: AiProviderName;
  providers: ProviderHealthSnapshot[];
} {
  const store = getHealthStore();
  const order = getProviderOrder();
  const groqModel = (process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim() || DEFAULT_GROQ_MODEL;
  const groqFast = (process.env.GROQ_FAST_MODEL || DEFAULT_GROQ_FAST_MODEL).trim() || DEFAULT_GROQ_FAST_MODEL;
  const orModel = resolveOpenRouterModel().model;

  const snapshots: ProviderHealthSnapshot[] = order.map((p) => {
    const configured = isProviderConfigured(p);
    const st = store[p];
    const inCooldown = Boolean(st.cooldownUntil && nowMs < st.cooldownUntil);
    if (st.cooldownUntil && nowMs >= st.cooldownUntil) {
      st.status = 'healthy';
      st.cooldownUntil = null;
    }
    return {
      provider: p,
      configured,
      model: p === 'groq' ? groqModel : orModel,
      fastModel: p === 'groq' ? groqFast : DEFAULT_OPENROUTER_BACKUP_FREE_MODEL,
      status: !configured ? 'unconfigured' : inCooldown ? 'cooldown' : 'healthy',
      cooldownUntil: inCooldown ? st.cooldownUntil : null,
      consecutiveFailures: st.consecutiveFailures,
      lastErrorCode: st.lastErrorCode,
      totalRequests: st.totalRequests,
      totalSuccesses: st.totalSuccesses,
      totalFailovers: st.totalFailovers,
      dailyRequests: {
        date: st.dailyDate,
        count: st.dailyCount,
        limit: p === 'openrouter' ? OPENROUTER_FREE_DAILY_LIMIT : undefined,
      },
      lastLatencyMs: st.lastLatencyMs,
    };
  });

  return {
    anyConfigured: snapshots.some((s) => s.configured),
    primary: order[0],
    providers: snapshots,
  };
}

function buildGroundedSystemPrompt(sources: KnowledgeChunk[]): string {
  const contextBlocks = sources
    .map((src) => {
      const metaParts = [
        `[${src.sourceId}] ${src.title}`,
        `Category: ${src.category}`,
        src.classification ? `Classification: ${src.classification}` : null,
        src.standardRef ? `Standard/Doc: ${src.standardRef}` : null,
        src.clauseNumber ? `Clause: ${src.clauseNumber}` : null,
        src.editionRevision ? `Edition/Revision: ${src.editionRevision}` : null,
        src.lastVerifiedDate ? `Last Verified: ${src.lastVerifiedDate}` : null,
        src.officialUrl ? `Official URL: ${src.officialUrl}` : null,
      ].filter(Boolean);

      return `${metaParts.join(' | ')}\n${src.content}`;
    })
    .join('\n\n---\n\n');

  return `You are the ChittorTech External AI-Assisted Knowledge Helper for cement & materials testing laboratories.
The user's question was NOT fully found in the local portal knowledge database, and the user explicitly approved consulting you as an external AI assistant.

STRICT COMPLIANCE & ACCURACY RULES (NON-NEGOTIABLE):
1. Label this clearly as **External AI-Assisted Guidance** — NEVER present your response as an official ChittorTech-approved standard, BIS gazette, or NABL mandate.
2. If any PARTIAL CHITTORTECH PORTAL SOURCES are provided below, ground your answer in them first and cite their Source IDs cleanly.
3. NEVER invent BIS standard numbers, ISO clause numbers, NABL document numbers, amendment dates, or exact statutory numeric limits you are not 100% certain of.
4. When discussing an official requirement not verified in the portal sources below, explicitly advise: *"Please verify the exact clause/edition on the official BIS, NABL, or ISO portal."*
5. NEVER reproduce copyrighted BIS or ISO standard texts in full.
6. Match the user's language (English, Hindi Devanagari, or clean Hindi/English for Hinglish). Preserve technical terms (LOI, LSF, Blaine, ISO/IEC 17025, NABL).
7. Format using clean Markdown headings (###), bullet points, and tables for comparisons. Do NOT use LaTeX syntax (no \\[, \\(, \\frac, \\text, etc.) — write formulas cleanly like "LOI (%) = ((W1 - W2) / (W1 - W0)) × 100".
8. Do NOT write a "Follow-up Questions" list inside "answerMarkdown" — place follow-ups ONLY inside the "suggestedFollowUps" JSON array.

Return valid JSON ONLY:
{
  "answerMarkdown": "Structured markdown answer starting with a concise AI-Assisted Guidance note",
  "citedSourceIds": ["SRC-1"],
  "suggestedFollowUps": ["Short follow-up 1", "Short follow-up 2"],
  "status": "ai_assisted"
}

PARTIAL PORTAL CONTEXT SOURCES (if any):
${contextBlocks || '(No direct matching local articles retrieved)'}`;
}

function clampHistory(history: ConversationTurn[]): ConversationTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (t): t is ConversationTurn =>
        Boolean(t) &&
        (t.role === 'user' || t.role === 'assistant') &&
        typeof t.content === 'string' &&
        t.content.trim().length > 0
    )
    .slice(-6)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, 700) }));
}

function toPublicCitation(chunk: KnowledgeChunk): KnowledgeCitation {
  return {
    sourceId: chunk.sourceId,
    title: chunk.title,
    category: chunk.category,
    standardRef: chunk.standardRef,
    clauseNumber: chunk.clauseNumber,
    editionRevision: chunk.editionRevision,
    officialUrl: chunk.officialUrl,
    lastVerifiedDate: chunk.lastVerifiedDate,
    classification: chunk.classification,
    sectionTarget: chunk.sectionTarget,
    testingSubTab: chunk.testingSubTab,
    topicId: chunk.topicId,
    excerpt: chunk.excerpt,
  };
}

function extractJsonObject(raw: string): any | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // continue
      }
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function sleepWithJitter(baseMs: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 200);
  await new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
}

async function callSingleProvider(params: {
  provider: AiProviderName;
  model: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<{
  rawContent: string;
  latencyMs: number;
  tokensUsed?: { prompt?: number; completion?: number; total?: number };
}> {
  const { provider, model, messages } = params;
  const apiKey =
    provider === 'groq'
      ? (process.env.GROQ_API_KEY || '').trim()
      : (process.env.OPENROUTER_API_KEY || '').trim();

  if (!apiKey) {
    throw new AiProviderError(provider, `${provider} API key missing`, 503, 'MISSING_API_KEY');
  }

  const endpoint = provider === 'groq' ? GROQ_CHAT_URL : OPENROUTER_CHAT_URL;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'https://lims.chittortech.in';
    headers['X-Title'] = 'ChittorTech QA Laboratory Management System';
  }

  const startedAt = Date.now();
  const payloadBody: Record<string, any> = {
    model,
    messages,
    temperature: 0.1,
  };
  if (provider === 'groq') {
    payloadBody.max_completion_tokens = 1800;
    // Note: reasoning model openai/gpt-oss-120b rejects strict response_format=json_object intermittently on Groq
    if (!model.includes('120b')) {
      payloadBody.response_format = { type: 'json_object' };
    }
  } else {
    payloadBody.max_tokens = 1400;
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadBody),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new AiProviderError(provider, `${provider} timed out`, 504, 'TIMEOUT');
    }
    throw new AiProviderError(provider, `${provider} network failure`, 503, 'UPSTREAM_ERROR');
  }

  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const upstreamMsg = String(errBody?.error?.message || `HTTP ${res.status}`).slice(0, 180);

    if (res.status === 401 || res.status === 403) {
      throw new AiProviderError(provider, `${provider} authentication failed`, res.status, 'INVALID_API_KEY');
    }
    if (res.status === 402 || /insufficient.*credit|quota.*exceeded/i.test(upstreamMsg)) {
      throw new AiProviderError(provider, `${provider} quota exhausted`, 429, 'QUOTA_EXCEEDED', 300);
    }
    if (res.status === 429) {
      const retryHdr = res.headers.get('retry-after');
      const retrySec = retryHdr && !isNaN(Number(retryHdr)) ? Math.ceil(Number(retryHdr)) : 45;
      throw new AiProviderError(provider, `${provider} rate limited`, 429, 'RATE_LIMITED', retrySec);
    }
    throw new AiProviderError(provider, `${provider} error (${upstreamMsg})`, res.status, 'UPSTREAM_ERROR');
  }

  const json = await res.json().catch(() => null);
  const rawContent = json?.choices?.[0]?.message?.content;
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new AiProviderError(provider, `${provider} empty response`, 502, 'UPSTREAM_ERROR');
  }

  return {
    rawContent,
    latencyMs,
    tokensUsed: json?.usage
      ? {
          prompt: json.usage.prompt_tokens,
          completion: json.usage.completion_tokens,
          total: json.usage.total_tokens,
        }
      : undefined,
  };
}

function recordProviderFailure(provider: AiProviderName, err: AiProviderError, nowMs = Date.now()): void {
  const store = getHealthStore();
  const st = store[provider];
  st.consecutiveFailures += 1;
  st.lastFailureAt = nowMs;
  st.lastErrorCode = err.code;
  st.status = 'cooldown';

  let cooldownMs = 30_000;
  if (err.code === 'INVALID_API_KEY') cooldownMs = 5 * 60_000;
  else if (err.code === 'QUOTA_EXCEEDED') cooldownMs = 5 * 60_000;
  else if (err.code === 'RATE_LIMITED') cooldownMs = (err.retryAfterSeconds || 45) * 1000;
  else if (st.consecutiveFailures >= 2) cooldownMs = Math.min(3 * 60_000, 30_000 * st.consecutiveFailures);

  st.cooldownUntil = nowMs + cooldownMs;
}

function recordProviderSuccess(
  provider: AiProviderName,
  latencyMs: number,
  nowMs = Date.now()
): void {
  const store = getHealthStore();
  const st = store[provider];
  st.status = 'healthy';
  st.cooldownUntil = null;
  st.consecutiveFailures = 0;
  st.lastSuccessAt = nowMs;
  st.lastErrorCode = null;
  st.totalSuccesses += 1;
  st.lastLatencyMs = latencyMs;
}

export async function generateGroundedDualProviderAnswer(params: {
  question: string;
  history: ConversationTurn[];
  sources: KnowledgeChunk[];
}): Promise<AssistantResponsePayload> {
  const statusSnapshot = getDualProviderStatus();
  if (!statusSnapshot.anyConfigured) {
    throw new AiProviderError(
      'groq',
      'AI Knowledge Assistant is not configured yet. Administrator action required: set GROQ_API_KEY or OPENROUTER_API_KEY in server environment variables.',
      503,
      'MISSING_API_KEY'
    );
  }

  const store = getHealthStore();
  const nowMs = Date.now();
  const order = getProviderOrder();

  const configuredOrder = order.filter((p) => isProviderConfigured(p));
  const readyProviders: AiProviderName[] = [];
  const cooledProviders: AiProviderName[] = [];

  for (const p of configuredOrder) {
    const st = store[p];
    const openRouterExhausted =
      p === 'openrouter' && st.dailyCount >= OPENROUTER_FREE_DAILY_LIMIT && !process.env.ALLOW_PAID_AI_MODELS;
    if (openRouterExhausted) continue;

    if (!st.cooldownUntil || nowMs >= st.cooldownUntil) {
      if (st.cooldownUntil && nowMs >= st.cooldownUntil) {
        st.status = 'healthy';
        st.cooldownUntil = null;
      }
      readyProviders.push(p);
    } else {
      cooledProviders.push(p);
    }
  }

  const attemptSequence = [...readyProviders, ...cooledProviders];
  if (attemptSequence.length === 0) {
    throw new AiProviderError(
      'openrouter',
      'Free daily AI provider quota has been reached. Knowledge Centre modules remain fully accessible directly.',
      429,
      'QUOTA_EXCEEDED',
      300
    );
  }

  const systemPrompt = buildGroundedSystemPrompt(params.sources);
  const safeHistory = clampHistory(params.history);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...safeHistory,
    { role: 'user', content: params.question.trim() },
  ];

  const primaryProvider = order[0];
  let failoverReason: string | undefined;
  let lastError: AiProviderError | null = null;

  if (attemptSequence[0] !== primaryProvider && isProviderConfigured(primaryProvider)) {
    failoverReason = `Primary provider (${primaryProvider}) in cooldown (${store[primaryProvider].lastErrorCode || 'temporarily unavailable'})`;
  }

  for (let idx = 0; idx < attemptSequence.length; idx++) {
    const provider = attemptSequence[idx];
    const st = store[provider];
    const modelsToTry =
      provider === 'groq'
        ? [selectGroqModel(params.question, safeHistory.length)]
        : [resolveOpenRouterModel().model, DEFAULT_OPENROUTER_BACKUP_FREE_MODEL].filter(
            (v, i, a) => Boolean(v) && a.indexOf(v) === i
          );

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const model = modelsToTry[mIdx];
      st.totalRequests += 1;
      st.dailyCount += 1;

      try {
        const res = await callSingleProvider({ provider, model, messages });
        recordProviderSuccess(provider, res.latencyMs);

        const failoverUsed = provider !== primaryProvider;
        if (failoverUsed) {
          store[primaryProvider].totalFailovers += 1;
        }

        console.info(
          `[AI-Knowledge-Router] provider=${provider} model=${model} status=200 latencyMs=${res.latencyMs} totalTokens=${res.tokensUsed?.total ?? 'na'} failover=${failoverUsed}`
        );

        const parsed = extractJsonObject(res.rawContent);
        const answerText =
          typeof parsed?.answerMarkdown === 'string' && parsed.answerMarkdown.trim()
            ? parsed.answerMarkdown.trim()
            : res.rawContent.trim();

        const statusVal: AssistantResponsePayload['status'] = 'ai_assisted';

        const sourceById = new Map(params.sources.map((s) => [s.sourceId.toUpperCase(), s]));
        const rawIds = Array.isArray(parsed?.citedSourceIds) ? parsed.citedSourceIds : [];
        const verifiedCitations: KnowledgeCitation[] = [];
        const seen = new Set<string>();
        for (const id of rawIds) {
          if (typeof id !== 'string') continue;
          const norm = id.trim().toUpperCase().replace(/^\[|\]$/g, '');
          if (seen.has(norm)) continue;
          const matched = sourceById.get(norm);
          if (matched) {
            seen.add(norm);
            verifiedCitations.push(toPublicCitation(matched));
          }
        }

        const followUps = Array.isArray(parsed?.suggestedFollowUps)
          ? parsed.suggestedFollowUps
              .filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
              .map((q: string) => q.trim().slice(0, 120))
              .slice(0, 3)
          : [];

        return {
          answer: answerText,
          citations: verifiedCitations,
          suggestedFollowUps: followUps,
          status: statusVal,
          provider,
          model,
          isExternalAi: true,
          failoverUsed,
          failoverReason: failoverUsed ? failoverReason : undefined,
          latencyMs: res.latencyMs,
          groundedSourceCount: params.sources.length,
        };
      } catch (err: any) {
        const providerErr =
          err instanceof AiProviderError
            ? err
            : new AiProviderError(provider, 'Unexpected provider error', 502, 'UPSTREAM_ERROR');

        lastError = providerErr;
        console.warn(
          `[AI-Knowledge-Router] provider=${provider} model=${model} failed code=${providerErr.code} status=${providerErr.statusCode}`
        );

        const hasMoreProviders = idx + 1 < attemptSequence.length;
        const hasMoreModelsSameProvider = mIdx + 1 < modelsToTry.length;

        if (!hasMoreProviders && !hasMoreModelsSameProvider && providerErr.code === 'TIMEOUT') {
          await sleepWithJitter(350);
          continue;
        }

        if (hasMoreModelsSameProvider && (providerErr.code === 'RATE_LIMITED' || providerErr.code === 'UPSTREAM_ERROR')) {
          continue;
        }

        recordProviderFailure(provider, providerErr);
        failoverReason = `${provider} unavailable (${providerErr.code})`;
        break;
      }
    }
  }

  throw (
    lastError ||
    new AiProviderError(
      'groq',
      'Both Groq and OpenRouter AI services are currently unavailable. Please try again shortly or browse Knowledge Centre sections directly.',
      503,
      'UPSTREAM_ERROR'
    )
  );
}

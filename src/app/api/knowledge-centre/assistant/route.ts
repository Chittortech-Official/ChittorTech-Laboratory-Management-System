import { NextResponse } from 'next/server';
import { requireAuthenticatedSession } from '@/lib/auth/session';
import { retrieveRelevantKnowledge } from '@/lib/knowledge/knowledgeRetrieval';
import {
  AiProviderError,
  ConversationTurn,
  generateGroundedDualProviderAnswer,
  getDualProviderStatus,
} from '@/lib/knowledge/groqAssistant';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const userRequestTimestamps = new Map<string, number[]>();

function checkUserRateLimit(userId: string, nowMs: number = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const existing = (userRequestTimestamps.get(userId) || []).filter(
    (ts) => nowMs - ts < RATE_LIMIT_WINDOW_MS
  );
  if (existing.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = existing[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (nowMs - oldest)) / 1000));
    userRequestTimestamps.set(userId, existing);
    return { allowed: false, retryAfterSeconds };
  }
  existing.push(nowMs);
  userRequestTimestamps.set(userId, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

// GET /api/knowledge-centre/assistant - Safe sanitized status & health of Groq + OpenRouter (never leaks keys)
export async function GET(request: Request) {
  const auth = requireAuthenticatedSession(request);
  if (!auth.ok) return auth.response;

  const status = getDualProviderStatus();
  const primarySnapshot = status.providers.find((p) => p.provider === status.primary);
  return NextResponse.json({
    success: true,
    configured: status.anyConfigured,
    primary: status.primary,
    model: primarySnapshot?.model || '',
    providers: status.providers,
  });
}

// POST /api/knowledge-centre/assistant - Strict Local-First Search + User-Approved External AI (Groq <-> OpenRouter)
export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const rawQuestion = typeof body?.question === 'string' ? body.question.trim() : '';
    const allowExternalAi = Boolean(body?.allowExternalAi);

    if (rawQuestion.length < 2) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', error: 'Please enter a valid question (minimum 2 characters).' },
        { status: 400 }
      );
    }

    if (rawQuestion.length > 1200) {
      return NextResponse.json(
        { success: false, code: 'INPUT_TOO_LONG', error: 'Question is too long (maximum 1,200 characters).' },
        { status: 400 }
      );
    }

    const rawHistory: ConversationTurn[] = Array.isArray(body?.history) ? body.history : [];
    const recentUserQuestions = rawHistory
      .filter((t) => t?.role === 'user' && typeof t?.content === 'string')
      .map((t) => t.content.trim())
      .filter(Boolean);

    // 1. ALWAYS search Knowledge Centre first (zero external AI tokens if matched)
    const retrieval = await retrieveRelevantKnowledge(rawQuestion, recentUserQuestions, 5);

    if (retrieval.sufficientLocalMatch && retrieval.localAnswerMarkdown) {
      const localCitations = retrieval.retrieved.slice(0, 4).map((c) => ({
        sourceId: c.sourceId,
        title: c.title,
        category: c.category,
        standardRef: c.standardRef,
        clauseNumber: c.clauseNumber,
        editionRevision: c.editionRevision,
        officialUrl: c.officialUrl,
        lastVerifiedDate: c.lastVerifiedDate,
        classification: c.classification,
        sectionTarget: c.sectionTarget,
        testingSubTab: c.testingSubTab,
        topicId: c.topicId,
        excerpt: c.excerpt,
      }));

      return NextResponse.json({
        success: true,
        status: 'local_answered',
        provider: 'local-database',
        model: 'portal-knowledge-index',
        isExternalAi: false,
        failoverUsed: false,
        latencyMs: 0,
        groundedSourceCount: localCitations.length,
        answer: retrieval.localAnswerMarkdown,
        citations: localCitations,
        suggestedFollowUps: [],
      });
    }

    // 2. Knowledge Centre did NOT have a sufficient match -> require permission unless already approved for this session
    if (!allowExternalAi) {
      return NextResponse.json({
        success: true,
        status: 'needs_ai_approval',
        provider: 'local-database',
        model: 'portal-knowledge-index',
        isExternalAi: false,
        failoverUsed: false,
        latencyMs: 0,
        groundedSourceCount: retrieval.retrieved.length,
        answer:
          "Sorry, this information is not currently available in the ChittorTech Knowledge Centre. Would you like to search for an answer using the external AI Assistant?",
        citations: [],
        suggestedFollowUps: [],
      });
    }

    // 2. User explicitly approved external AI -> rate limit + Groq primary / OpenRouter fallback
    const rate = checkUserRateLimit(auth.session.sub);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: 'RATE_LIMITED',
          error: `Too many external AI requests. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const status = getDualProviderStatus();
    if (!status.anyConfigured) {
      return NextResponse.json(
        {
          success: false,
          code: 'MISSING_API_KEY',
          error:
            'External AI Assistant is not configured yet. Administrator action required: set GROQ_API_KEY or OPENROUTER_API_KEY in server environment variables.',
        },
        { status: 503 }
      );
    }

    const result = await generateGroundedDualProviderAnswer({
      question: rawQuestion,
      history: rawHistory,
      sources: retrieval.retrieved,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    if (err instanceof AiProviderError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code,
          error: err.message,
          retryAfterSeconds: err.retryAfterSeconds,
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'ASSISTANT_ERROR',
        error: 'Both AI providers are temporarily unavailable. All Knowledge Centre articles remain accessible directly.',
      },
      { status: 500 }
    );
  }
}

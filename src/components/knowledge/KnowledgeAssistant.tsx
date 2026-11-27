'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Trash2,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { KnowledgeCitation } from '@/lib/knowledge/knowledgeRetrieval';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: KnowledgeCitation[];
  suggestedFollowUps?: string[];
  status?:
    | 'local_answered'
    | 'needs_ai_approval'
    | 'ai_assisted'
    | 'answered'
    | 'insufficient_sources'
    | 'clarification_needed';
  provider?: string;
  model?: string;
  isExternalAi?: boolean;
  failoverUsed?: boolean;
  pendingQuestion?: string;
  approvalResolved?: 'approved' | 'cancelled';
  timestamp: string;
  error?: string;
}

interface KnowledgeAssistantProps {
  onOpenSource: (citation: KnowledgeCitation) => void;
}

const SUGGESTED_QUESTIONS: string[] = [
  'What are the major requirements of ISO/IEC 17025 for laboratory equipment calibration?',
  'Explain the difference between NABL accreditation and BIS certification.',
  'What records should a cement laboratory maintain for quality assurance?',
  'Explain the procedure for determining Loss on Ignition (LOI).',
  'What is the importance of calibration traceability?',
  'Explain the quality control requirements for cement testing.',
  'What is the difference between verification and calibration?',
  'How should laboratory non-conformities be documented?',
];

/**
 * Converts accidental raw LaTeX expressions into clean, readable laboratory text.
 */
function cleanReadableFormatting(text: string): string {
  let cleaned = text.trim();
  // Safety net: unwrap partial JSON wrapper if upstream response was truncated mid-stream
  const jsonStart = cleaned.match(/^```(?:json)?\s*\{\s*"answerMarkdown"\s*:\s*"/i) ||
    cleaned.match(/^\{\s*"answerMarkdown"\s*:\s*"/i);
  if (jsonStart) {
    cleaned = cleaned.slice(jsonStart[0].length);
    const nextIdx = cleaned.search(/"\s*,\s*"(?:citedSourceIds|suggestedFollowUps|status)"/i);
    if (nextIdx !== -1) cleaned = cleaned.slice(0, nextIdx);
    else cleaned = cleaned.replace(/"\s*\}\s*```?\s*$/, '');
    cleaned = cleaned
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  return cleaned
    .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1) / ($2)')
    .replace(/\\times/g, '×')
    .replace(/\\pm/g, '±')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\%/g, '%')
    .replace(/([A-Za-z])_\{([A-Za-z0-9]+)\}/g, '$1$2')
    .replace(/【SRC-\d+】|\[SRC-\d+\]/g, '')
    .replace(/\s{2,}/g, ' ');
}

/**
 * Renders inline bold (**text**), italic (*text*), and inline code (`code`) safely.
 */
function renderInlineTokens(rawText: string): React.ReactNode[] {
  const text = cleanReadableFormatting(rawText);
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#0F172A]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-[#334155]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[12px] text-[#0F172A] border border-[#E2E8F0]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Lightweight, XSS-safe Markdown block renderer supporting headings, blockquotes, dividers, lists, and tables.
 */
function StructuredMarkdown({ content }: { content: string }) {
  const lines = cleanReadableFormatting(content).replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-[#E2E8F0]" />);
      i++;
      continue;
    }

    // Blockquote note
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <div
          key={`bq-${i}`}
          className="my-2 rounded-lg border-l-4 border-[#2563EB] bg-[#F5F8FC] px-3.5 py-2.5 text-[13px] text-[#1E293B] leading-relaxed"
        >
          {renderInlineTokens(quoteLines.join(' '))}
        </div>
      );
      continue;
    }

    // Markdown table block
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\|\s*[:\-]+\s*(\|\s*[:\-]+\s*)+\|?$/.test(lines[i + 1].trim())
    ) {
      const parseRow = (rowStr: string) =>
        rowStr
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      elements.push(
        <div key={`tbl-${i}`} className="my-3 overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#F5F8FC] border-b border-[#E2E8F0] text-[#0F172A]">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-3 py-2 font-bold whitespace-nowrap">
                    {renderInlineTokens(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F8FAFC]">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-[#1E293B] align-top">
                      {renderInlineTokens(r[cIdx] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      elements.push(
        <h4
          key={`h-${i}`}
          className={`font-bold text-[#0F172A] mt-3.5 first:mt-0 mb-1.5 ${
            level <= 3 ? 'text-[15px]' : 'text-[13.5px]'
          }`}
        >
          {renderInlineTokens(headingText)}
        </h4>
      );
      i++;
      continue;
    }

    // Bulleted list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 ml-5 list-disc space-y-1.5 text-[13px] text-[#1E293B] leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 ml-5 list-decimal space-y-1.5 text-[13px] text-[#1E293B] leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (style standalone formula lines cleanly)
    const cleanLine = cleanReadableFormatting(trimmed);
    const isFormula = /=\s*.*(\/|×|\+)/.test(cleanLine) && cleanLine.length < 110;
    elements.push(
      isFormula ? (
        <div
          key={`p-${i}`}
          className="my-2 rounded-lg border border-[#D6E8FF] bg-[#F5F8FC] px-3.5 py-2 font-mono text-[13px] font-semibold text-[#1E293B]"
        >
          {cleanLine}
        </div>
      ) : (
        <p key={`p-${i}`} className="text-[13px] text-[#1E293B] leading-relaxed my-1.5 first:mt-0 last:mb-0">
          {renderInlineTokens(trimmed)}
        </p>
      )
    );
    i++;
  }

  return <div className="space-y-0.5 text-[#1E293B]">{elements}</div>;
}

const AI_SESSION_APPROVAL_KEY = 'chittortech_ai_session_approved';

export const KnowledgeAssistant: React.FC<KnowledgeAssistantProps> = ({ onOpenSource }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'local' | 'external' | 'smart'>('local');
  const [aiSessionApproved, setAiSessionApproved] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    checked: boolean;
    configured: boolean;
    model: string;
  }>({ checked: false, configured: true, model: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(AI_SESSION_APPROVAL_KEY) === '1') {
        setAiSessionApproved(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/knowledge-centre/assistant', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setConfigStatus({
          checked: true,
          configured: Boolean(data.configured),
          model: data.model || '',
        });
      })
      .catch(() => {
        if (active) {
          setConfigStatus((prev) => ({ ...prev, checked: true }));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (
    overrideQuestion?: string,
    options?: { allowExternalAi?: boolean; approvalMsgId?: string }
  ) => {
    const questionText = (overrideQuestion ?? input).trim();
    if (!questionText || isLoading) return;

    const allowExternalAi = Boolean(options?.allowExternalAi) || aiSessionApproved;
    setApiError(null);
    if (!overrideQuestion) setInput('');

    // Once approved, remember AI permission for the rest of this session so we never re-prompt
    if (options?.allowExternalAi) {
      setAiSessionApproved(true);
      try {
        sessionStorage.setItem(AI_SESSION_APPROVAL_KEY, '1');
      } catch {
        // ignore storage errors
      }
    }

    // Mark the approval bubble resolved immediately if triggered from Yes, Ask AI
    if (options?.approvalMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === options.approvalMsgId ? { ...m, approvalResolved: 'approved' } : m
        )
      );
    }

    const activeHistory = messages
      .filter((m) => !m.error && m.status !== 'needs_ai_approval')
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    if (!options?.approvalMsgId) {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: questionText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
    }

    setLoadingMode(
      options?.allowExternalAi ? 'external' : aiSessionApproved ? 'smart' : 'local'
    );
    setIsLoading(true);

    try {
      const res = await fetch('/api/knowledge-centre/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          question: questionText,
          history: activeHistory,
          allowExternalAi,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errText =
          data.error ||
          'The AI Knowledge Assistant is temporarily unavailable. You can still browse all Knowledge Centre sections directly.';
        setApiError(errText);
        if (data.code === 'MISSING_API_KEY') {
          setConfigStatus((prev) => ({ ...prev, checked: true, configured: false }));
        }
        // Preserve user's question in input box on failure so they never lose it
        if (!overrideQuestion) {
          setInput(questionText);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: errText,
            error: data.code || 'ERROR',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: Array.isArray(data.citations) ? data.citations : [],
        suggestedFollowUps: Array.isArray(data.suggestedFollowUps) ? data.suggestedFollowUps : [],
        status: data.status,
        provider: data.provider,
        model: data.model,
        isExternalAi: Boolean(data.isExternalAi),
        failoverUsed: Boolean(data.failoverUsed),
        pendingQuestion: data.status === 'needs_ai_approval' ? questionText : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      if (!overrideQuestion) {
        setInput(questionText);
      }
      const fallbackErr =
        'Network error while contacting the AI Knowledge Assistant. Your question has been preserved below, and all Knowledge Centre articles remain accessible.';
      setApiError(fallbackErr);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: fallbackErr,
          error: 'NETWORK_ERROR',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineExternalAi = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              approvalResolved: 'cancelled',
            }
          : m
      )
    );
  };

  const handleClear = () => {
    setMessages([]);
    setApiError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
              AI Compliance &amp; QA Desk
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-2.5 py-0.5 text-[10px] font-bold text-[#2563EB]">
              <ShieldCheck className="w-3 h-3" />
              Verified Knowledge Grounded
            </span>
            {configStatus.checked && configStatus.configured && configStatus.model && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
                <CheckCircle2 className="w-3 h-3" />
                Active ({configStatus.model})
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-[#334155]">
            AI Knowledge &amp; Compliance Assistant
          </h3>
          <p className="text-xs text-[#64748B] max-w-3xl">
            Ask questions on BIS cement standards, NABL accreditation, ISO/IEC 17025 clauses, laboratory testing procedures, calculations, equipment calibration, or glossary terms in English, Hindi, or Hinglish.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:border-red-300 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Conversation</span>
            </button>
          )}
        </div>
      </div>

      {/* Missing API Key Administrator Configuration Notice */}
      {configStatus.checked && !configStatus.configured && (
        <div className="rounded-xl border border-amber-200 bg-[#FEF3C7] p-4 flex items-start gap-3 text-xs text-[#92400E]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <div className="space-y-1">
            <p className="font-bold">Administrator Configuration Required: GROQ_API_KEY Not Set</p>
            <p>
              The AI Knowledge Assistant requires the server-side <code className="font-mono bg-white/80 px-1.5 py-0.5 rounded">GROQ_API_KEY</code> environment variable to generate responses. All BIS, NABL, ISO/IEC 17025, testing guides, checklists, and glossary sections in the Knowledge Centre remain fully operational.
            </p>
          </div>
        </div>
      )}

      {/* Main Enterprise Chat Container */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Session Notice Strip */}
        <div className="bg-[#F5F8FC] border-b border-[#E2E8F0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span>
              Answers are verified against ChittorTech&apos;s Knowledge Centre first.{' '}
              {aiSessionApproved
                ? 'AI fallback is enabled for this session.'
                : 'External AI is consulted only when you choose to ask it.'}
            </span>
          </div>
          {aiSessionApproved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 text-[10px] font-semibold text-[#15803D]">
              <CheckCircle2 className="w-3 h-3" />
              AI Enabled for Session
            </span>
          )}
        </div>

        {/* Conversation Feed */}
        <div className="p-4 sm:p-6 space-y-5 min-h-[380px] max-h-[600px] overflow-y-auto bg-[#FAFCFF]">
          {/* Welcome Card (when empty or before messages) */}
          {messages.length === 0 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#D6E8FF] bg-[#EAF3FF]/50 p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Welcome to ChittorTech AI Knowledge &amp; Compliance Desk</span>
                </div>
                <p className="text-xs text-[#334155] leading-relaxed">
                  I answer laboratory and compliance queries using ChittorTech&apos;s verified <strong>BIS Standards</strong>, <strong>NABL Accreditation Guides</strong>, <strong>ISO/IEC 17025:2017 Clauses</strong>, <strong>Testing Methods &amp; Calculations</strong>, <strong>Compliance Mappings</strong>, <strong>Published Knowledge Articles</strong>, and <strong>Technical Glossary</strong> — distinguishing official requirements from practical guidance and displaying clickable source citations below every answer.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0F9D92]" />
                  <span>Suggested Compliance &amp; Laboratory Questions</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleSend(q)}
                      className="text-left rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs font-medium text-[#334155] hover:border-[#2563EB] hover:bg-[#F5F8FC] transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Session Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`rounded-xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'max-w-2xl bg-[#2563EB] text-white text-sm leading-relaxed shadow-2xs'
                    : msg.error
                    ? 'w-full border border-red-200 bg-red-50/70 text-red-900'
                    : 'w-full border border-[#E2E8F0] bg-white text-[#1E293B] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      msg.role === 'user'
                        ? 'text-blue-100'
                        : msg.error
                        ? 'text-red-700'
                        : 'text-[#0F9D92]'
                    }`}
                  >
                    {msg.role === 'user'
                      ? 'Your Question'
                      : msg.error
                      ? 'Assistant Notice'
                      : msg.status === 'needs_ai_approval'
                      ? 'Not Found in Knowledge Centre'
                      : msg.isExternalAi
                      ? msg.failoverUsed
                        ? 'AI-Assisted Guidance (OpenRouter)'
                        : 'AI-Assisted Guidance (Groq)'
                      : msg.status === 'insufficient_sources'
                      ? 'Verification Boundary Notice'
                      : msg.status === 'clarification_needed'
                      ? 'Clarification Requested'
                      : 'Verified ChittorTech Knowledge Centre'}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-[#64748B]'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.isExternalAi && msg.provider
                      ? `${msg.provider === 'groq' ? 'Groq' : msg.provider === 'openrouter' ? 'OpenRouter' : msg.provider} · ${msg.timestamp}`
                      : msg.timestamp}
                  </span>
                </div>

                {msg.role === 'assistant' && msg.isExternalAi && (
                  <div className="mb-2.5 rounded-lg border border-amber-200 bg-[#FEF3C7]/70 px-3 py-2 text-[11px] text-[#92400E] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                    <span>
                      <strong>AI-Assisted Guidance:</strong> Generated externally via{' '}
                      <span className="font-mono font-semibold">{msg.provider}</span> ({msg.model}). This is not an official ChittorTech-approved BIS, NABL, or ISO standard — verify statutory requirements directly on official portals.
                    </span>
                  </div>
                )}

                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : msg.error ? (
                  <div className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <p>{msg.content}</p>
                  </div>
                ) : (
                  <StructuredMarkdown content={msg.content} />
                )}

                {/* User Approval Gate when Local Portal DB lacks the answer */}
                {msg.role === 'assistant' && msg.status === 'needs_ai_approval' && msg.pendingQuestion && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                    {!msg.approvalResolved ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            void handleSend(msg.pendingQuestion, {
                              allowExternalAi: true,
                              approvalMsgId: msg.id,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <span>Yes, Ask AI</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleDeclineExternalAi(msg.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          <span>No, Cancel</span>
                        </button>
                      </div>
                    ) : msg.approvalResolved === 'cancelled' ? (
                      <p className="text-[11px] font-medium text-[#64748B]">
                        Cancelled — no external AI API request was made.
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-[#2563EB]">
                        Approved — external AI consultation requested.
                      </p>
                    )}
                  </div>
                )}

                {/* Traceable Citations */}
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      Supporting Sources &amp; Traceable Citations ({msg.citations.length})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {msg.citations.map((cit) => (
                        <div
                          key={cit.sourceId}
                          className="rounded-lg border border-[#E2E8F0] bg-[#F5F8FC] p-3 text-[11px] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#2563EB]">{cit.sourceId}</span>
                            <span className="rounded bg-white px-2 py-0.5 border border-[#E2E8F0] text-[10px] font-semibold text-[#334155]">
                              {cit.category}
                            </span>
                          </div>

                          <div className="font-bold text-[#334155] leading-snug">{cit.title}</div>

                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#64748B]">
                            {cit.standardRef && (
                              <span>
                                <strong>Ref:</strong> {cit.standardRef}
                              </span>
                            )}
                            {cit.clauseNumber && (
                              <span>
                                <strong>Clause:</strong> {cit.clauseNumber}
                              </span>
                            )}
                            {cit.editionRevision && (
                              <span>
                                <strong>Edition:</strong> {cit.editionRevision}
                              </span>
                            )}
                            {cit.lastVerifiedDate && (
                              <span>
                                <strong>Verified:</strong> {cit.lastVerifiedDate}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => onOpenSource(cit)}
                              className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:underline"
                            >
                              <span>Open in Knowledge Centre</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            {cit.officialUrl && (
                              <a
                                href={cit.officialUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-[#0F9D92] hover:underline"
                              >
                                <span>Official Source</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-Ups */}
                {msg.role === 'assistant' && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mr-1">
                      Follow-up:
                    </span>
                    {msg.suggestedFollowUps.map((fq) => (
                      <button
                        key={fq}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleSend(fq)}
                        className="rounded-md border border-[#D6E8FF] bg-[#EAF3FF]/70 px-2.5 py-1 text-[11px] font-medium text-[#2563EB] hover:bg-[#D6E8FF] transition-colors disabled:opacity-50"
                      >
                        {fq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading / Thinking Indicator */}
          {isLoading && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3.5 max-w-md flex items-center gap-3 text-xs text-[#334155] shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] shrink-0" />
              <span>
                {loadingMode === 'external'
                  ? 'Consulting external AI Assistant...'
                  : loadingMode === 'smart'
                  ? 'Checking Knowledge Centre & AI Assistant...'
                  : 'Searching ChittorTech Knowledge Centre...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="border-t border-[#E2E8F0] bg-white p-3.5 sm:p-4 space-y-2">
          {apiError && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
              <span>{apiError}</span>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1200}
              disabled={isLoading}
              placeholder="Ask about ISO/IEC 17025, NABL, BIS cement standards, LOI, LSF, calibration traceability, or ask in Hindi / Hinglish..."
              className="flex-1 resize-none rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || input.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 sm:h-[62px] text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#64748B]">
            <span>Press Enter to send · Shift+Enter for new line</span>
            <span>{input.length} / 1200</span>
          </div>
        </div>
      </div>
    </div>
  );
};

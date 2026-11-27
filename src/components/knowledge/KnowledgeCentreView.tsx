'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen,
  Search,
  Award,
  ShieldCheck,
  FlaskConical,
  GraduationCap,
  ClipboardCheck,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  STANDARD_REFERENCES,
  ISO_17025_TOPICS,
  COMPLIANCE_MAPPINGS,
  NABL_PROCESS_STEPS,
  SEED_KNOWLEDGE_ARTICLES,
  OFFICIAL_REFERENCES,
} from '@/lib/knowledge/standardsAndCompliance';
import {
  CHEMICAL_TOPICS,
  CALCULATION_TOPICS,
  MECHANICAL_TOPICS,
  COAL_TOPICS,
  INSTRUMENT_TOPICS,
} from '@/lib/knowledge/testingKnowledge';
import {
  GLOSSARY_ENTRIES,
  LEARNING_PATHS,
  CHECKLIST_TEMPLATES,
} from '@/lib/knowledge/learningAndChecklists';
import {
  BisModuleView,
  NablModuleView,
  IsoModuleView,
  TestingKnowledgeModuleView,
  LearningModuleView,
  ChecklistsModuleView,
} from './KnowledgeSubModules';
import { KnowledgeAssistant } from './KnowledgeAssistant';
import type { KnowledgeCitation } from '@/lib/knowledge/knowledgeRetrieval';

type KnowledgeSection =
  | 'home'
  | 'bis'
  | 'nabl'
  | 'iso'
  | 'testing'
  | 'learning'
  | 'checklists'
  | 'glossary'
  | 'mapping'
  | 'assistant';

interface KnowledgeCentreViewProps {
  userId: string;
  userName: string;
  userRole?: string;
}

export const KnowledgeCentreView: React.FC<KnowledgeCentreViewProps> = ({
  userId,
  userName,
  userRole = 'qa_engineer',
}) => {
  const [section, setSection] = useState<KnowledgeSection>('home');
  const [testingPreset, setTestingPreset] = useState<{
    subTab: 'chemical' | 'calculations' | 'mechanical' | 'coal' | 'instruments';
    topicId?: string;
  }>({ subTab: 'chemical' });

  const [globalQuery, setGlobalQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchFilter, setSearchFilter] = useState<string>('All');
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [glossaryLetter, setGlossaryLetter] = useState<string>('All');

  const [migrationRequired, setMigrationRequired] = useState(false);
  const [dbArticles, setDbArticles] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<any[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadKnowledgeData = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge-centre?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMigrationRequired(Boolean(data.migrationRequired));
        setDbArticles(data.articles || []);
        setRevisions(data.revisions || []);
        setQuizAttempts(data.quizAttempts || []);
        setChecklistResponses(data.checklistResponses || []);
        const keys = new Set<string>();
        for (const p of data.userProgress || []) {
          if (p.completed) keys.add(p.item_key);
        }
        setCompletedKeys(keys);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    loadKnowledgeData();
  }, [loadKnowledgeData]);

  const handleToggleProgress = async (itemType: 'learning_topic' | 'nabl_step', itemKey: string) => {
    const next = !completedKeys.has(itemKey);
    setCompletedKeys((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(itemKey);
      else copy.delete(itemKey);
      return copy;
    });
    await fetch('/api/knowledge-centre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_progress', userId, itemType, itemKey, completed: next }),
    });
  };

  // Real Content Counts & Learning Progress
  const stats = useMemo(() => {
    const publishedDb = dbArticles.filter((a) => a.content_status === 'Published').length;
    const testingCount =
      CHEMICAL_TOPICS.length +
      CALCULATION_TOPICS.length +
      MECHANICAL_TOPICS.length +
      COAL_TOPICS.length +
      INSTRUMENT_TOPICS.length;
    const totalLearningTopics = LEARNING_PATHS.reduce((acc, p) => acc + p.topics.length, 0);
    const completedLearningCount = LEARNING_PATHS.reduce(
      (acc, p) => acc + p.topics.filter((t) => completedKeys.has(t.key)).length,
      0
    );
    const learningPercent =
      totalLearningTopics > 0 ? Math.round((completedLearningCount / totalLearningTopics) * 100) : 0;

    return {
      totalPublished:
        SEED_KNOWLEDGE_ARTICLES.length +
        publishedDb +
        testingCount +
        ISO_17025_TOPICS.length +
        NABL_PROCESS_STEPS.length,
      bisRefs: STANDARD_REFERENCES.filter((s) => s.authority === 'BIS').length,
      nablRefs: STANDARD_REFERENCES.filter((s) => s.authority === 'NABL').length,
      isoTopics: ISO_17025_TOPICS.length,
      testingCount,
      totalLearningTopics,
      completedLearningCount,
      learningPercent,
    };
  }, [dbArticles, completedKeys]);

  // Global Search Index
  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return [];

    type SearchHit = {
      id: string;
      title: string;
      category: string;
      description: string;
      targetSection: KnowledgeSection;
      testingPreset?: { subTab: 'chemical' | 'calculations' | 'mechanical' | 'coal' | 'instruments'; topicId: string };
    };

    const pool: SearchHit[] = [
      ...STANDARD_REFERENCES.map((s) => ({
        id: s.id,
        title: `${s.standardNumber} — ${s.title}`,
        category: s.authority === 'BIS' ? 'BIS Standards' : s.authority === 'NABL' ? 'NABL' : 'ISO 17025',
        description: `${s.scopePurpose} (${s.relatedParameters})`,
        targetSection: (s.authority === 'BIS' ? 'bis' : s.authority === 'NABL' ? 'nabl' : 'iso') as KnowledgeSection,
      })),
      ...ISO_17025_TOPICS.map((t) => ({
        id: t.id,
        title: `${t.clauseNumber}: ${t.title}`,
        category: 'ISO 17025',
        description: t.simpleExplanation,
        targetSection: 'iso' as KnowledgeSection,
      })),
      ...CHEMICAL_TOPICS.map((t) => ({
        id: t.id,
        title: t.title,
        category: 'Testing Knowledge',
        description: `${t.definition} ${t.standards}`,
        targetSection: 'testing' as KnowledgeSection,
        testingPreset: { subTab: 'chemical' as const, topicId: t.id },
      })),
      ...CALCULATION_TOPICS.map((t) => ({
        id: t.id,
        title: t.title,
        category: 'Testing Knowledge',
        description: `${t.formula} — ${t.interpretation}`,
        targetSection: 'testing' as KnowledgeSection,
        testingPreset: { subTab: 'calculations' as const, topicId: t.id },
      })),
      ...MECHANICAL_TOPICS.map((t) => ({
        id: t.id,
        title: t.title,
        category: 'Testing Knowledge',
        description: `${t.purpose} (${t.equipment})`,
        targetSection: 'testing' as KnowledgeSection,
        testingPreset: { subTab: 'mechanical' as const, topicId: t.id },
      })),
      ...COAL_TOPICS.map((t) => ({
        id: t.id,
        title: t.title,
        category: 'Testing Knowledge',
        description: `${t.definition} ${t.kilnImportance}`,
        targetSection: 'testing' as KnowledgeSection,
        testingPreset: { subTab: 'coal' as const, topicId: t.id },
      })),
      ...INSTRUMENT_TOPICS.map((t) => ({
        id: t.id,
        title: t.name,
        category: 'Equipment',
        description: `${t.purpose} (${t.relatedMethods})`,
        targetSection: 'testing' as KnowledgeSection,
        testingPreset: { subTab: 'instruments' as const, topicId: t.id },
      })),
      ...CHECKLIST_TEMPLATES.map((c) => ({
        id: c.slug,
        title: c.title,
        category: 'Checklists',
        description: c.purpose,
        targetSection: 'checklists' as KnowledgeSection,
      })),
      ...GLOSSARY_ENTRIES.map((g) => ({
        id: `gl-${g.term}`,
        title: `${g.term} (${g.fullForm})`,
        category: 'Glossary',
        description: `${g.simpleMeaning} ${g.technicalExplanation}`,
        targetSection: 'glossary' as KnowledgeSection,
      })),
      ...dbArticles
        .filter((a) => a.content_status === 'Published')
        .map((a) => ({
          id: a.id,
          title: a.title,
          category: 'Learning',
          description: a.short_description,
          targetSection: 'home' as KnowledgeSection,
        })),
    ];

    return pool.filter((item) => {
      const matchesFilter = searchFilter === 'All' || item.category === searchFilter;
      if (!matchesFilter) return false;
      return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
  }, [globalQuery, searchFilter, dbArticles]);

  const openTestingTopic = (
    subTab: 'chemical' | 'calculations' | 'mechanical' | 'coal' | 'instruments',
    topicId?: string
  ) => {
    setTestingPreset({ subTab, topicId });
    setSection('testing');
    setSearchFocused(false);
  };

  const sectionLabels: Record<KnowledgeSection, string> = {
    home: 'Overview',
    bis: 'BIS Standards & Cement Testing',
    nabl: 'NABL Accreditation Guide',
    iso: 'ISO/IEC 17025 Guide',
    testing: 'Laboratory Testing Knowledge',
    learning: 'Technician Learning Centre',
    checklists: 'Quality Assurance Checklists',
    glossary: 'Technical Glossary',
    mapping: 'Compliance Reference Mapping',
    assistant: 'AI Knowledge & Compliance Assistant',
  };

  const handleOpenCitationSource = (citation: KnowledgeCitation) => {
    if (citation.sectionTarget === 'testing' && citation.testingSubTab) {
      openTestingTopic(citation.testingSubTab, citation.topicId);
    } else if (citation.sectionTarget && citation.sectionTarget !== 'assistant') {
      setSection(citation.sectionTarget);
    }
  };

  return (
    <div className="w-full space-y-8 pb-8">
      {/* Subtle Top Breadcrumb Bar (visible on sub-pages) */}
      {section !== 'home' && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <button
              type="button"
              onClick={() => setSection('home')}
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Knowledge &amp; Compliance Centre</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-[#334155]">{sectionLabels[section]}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSection('assistant')}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                section === 'assistant'
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'border-[#D6E8FF] bg-[#EAF3FF] text-[#2563EB] hover:bg-[#D6E8FF]'
              }`}
            >
              AI Assistant
            </button>
            <button type="button" onClick={() => setSection('glossary')} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:border-[#2563EB]">
              Glossary
            </button>
            <button type="button" onClick={() => setSection('mapping')} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:border-[#2563EB]">
              Compliance Mapping
            </button>
          </div>
        </div>
      )}

      {migrationRequired && (
        <div className="rounded-lg border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-xs text-[#B45309] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Run <code className="font-mono bg-white/70 px-1 rounded">supabase/knowledge_centre_migration.sql</code> in Supabase SQL Editor to enable saving quizzes, checklists, and custom articles.
          </span>
        </div>
      )}

      {/* =====================================================================
          LANDING PAGE — EDITORIAL KNOWLEDGE ARCHITECTURE
          ===================================================================== */}
      {section === 'home' && (
        <div className="space-y-10">
          {/* 1. Editorial Hero + Dominant Search */}
          <section className="pt-2 pb-4 border-b border-[#E2E8F0] space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="max-w-3xl space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">
                  CHITTORTECH KNOWLEDGE &amp; COMPLIANCE
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#334155]">
                  Knowledge &amp; Compliance Centre
                </h1>
                <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                  Technical knowledge, laboratory standards and quality guidance for modern cement laboratories.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setSection('assistant')}
                  className="px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 font-semibold text-white transition-colors"
                >
                  AI Compliance Assistant
                </button>
                <button type="button" onClick={() => setSection('glossary')} className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white font-semibold text-[#334155] hover:border-[#2563EB]">
                  Technical Glossary
                </button>
                <button type="button" onClick={() => setSection('mapping')} className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white font-semibold text-[#334155] hover:border-[#2563EB]">
                  Compliance Mapping
                </button>
              </div>
            </div>

            {/* Dominant Search Box with Intelligent Overlay */}
            <div ref={searchWrapperRef} className="relative max-w-4xl">
              <div className="relative">
                <Search className="w-5 h-5 text-[#64748B] absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={globalQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => {
                    setGlobalQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  placeholder="Search standards, testing methods, parameters, equipment..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-12 pr-4 py-3.5 text-sm text-[#334155] shadow-xs focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 focus:outline-none"
                />
              </div>

              {/* Search Suggestions */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <span className="font-medium">Try:</span>
                {['Blaine', 'LSF', 'ISO 17025', 'NABL', 'XRF', 'Free Lime'].map((term, idx) => (
                  <React.Fragment key={term}>
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalQuery(term);
                        setSearchFocused(true);
                      }}
                      className="font-semibold text-[#2563EB] hover:underline"
                    >
                      {term}
                    </button>
                    {idx < 5 && <span className="text-[#CBD5E1]">·</span>}
                  </React.Fragment>
                ))}
              </div>

              {/* Search Overlay Dropdown */}
              {searchFocused && (
                <div className="absolute left-0 right-0 top-14 z-30 rounded-xl border border-[#E2E8F0] bg-white shadow-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E8F0] pb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mr-1">Search across:</span>
                    {['All', 'BIS Standards', 'NABL', 'ISO 17025', 'Testing Knowledge', 'Equipment', 'Glossary', 'Checklists'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSearchFilter(cat)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          searchFilter === cat ? 'bg-[#D6E8FF] text-[#2563EB]' : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#334155]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {!globalQuery.trim() ? (
                    <p className="text-xs text-[#64748B] py-3">
                      Start typing to search across {stats.totalPublished} technical topics, BIS/NABL standards, ISO 17025 clauses, and {GLOSSARY_ENTRIES.length} glossary terms.
                    </p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-[#64748B] py-4 text-center">
                      No matching technical references found for &ldquo;{globalQuery}&rdquo;.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0]">
                      {searchResults.slice(0, 12).map((hit) => (
                        <button
                          key={hit.id}
                          type="button"
                          onClick={() => {
                            if (hit.testingPreset) {
                              openTestingTopic(hit.testingPreset.subTab, hit.testingPreset.topicId);
                            } else {
                              setSection(hit.targetSection);
                              setSearchFocused(false);
                            }
                          }}
                          className="w-full text-left py-2.5 px-2 hover:bg-[#F5F8FC] rounded-lg flex items-center justify-between gap-3 transition-colors"
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92]">{hit.category}</span>
                            <div className="text-xs font-bold text-[#334155]">{hit.title}</div>
                            <p className="text-[11px] text-[#64748B] line-clamp-1">{hit.description}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 2. Level 1 Featured Knowledge Area + Popular Topics */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] p-7 flex flex-col justify-between gap-6">
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F9D92]">Featured Knowledge Base</span>
                <h2 className="text-2xl font-bold text-[#334155]">Cement Laboratory Knowledge</h2>
                <p className="text-sm text-[#64748B] leading-relaxed max-w-2xl">
                  Explore chemical analysis, physical testing, mechanical testing, coal analysis, equipment knowledge and practical laboratory guidance — structured as technical documentation for everyday bench reference.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0]">
                <span className="text-xs text-[#64748B]">
                  {stats.testingCount} technical articles across 5 laboratory disciplines
                </span>
                <button
                  type="button"
                  onClick={() => openTestingTopic('chemical', CHEMICAL_TOPICS[0].id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  <span>Explore Testing Knowledge</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">Popular Topics</h3>
                <div className="divide-y divide-[#E2E8F0]">
                  {[
                    { label: 'XRF Analysis', subTab: 'instruments' as const, id: 'inst-xrf' },
                    { label: 'Blaine Fineness', subTab: 'mechanical' as const, id: 'mech-blaine' },
                    { label: 'Free Lime', subTab: 'chemical' as const, id: 'chem-fl' },
                    { label: 'LSF (Lime Saturation Factor)', subTab: 'calculations' as const, id: 'calc-lsf' },
                    { label: 'Compressive Strength', subTab: 'mechanical' as const, id: 'mech-cs' },
                  ].map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => openTestingTopic(topic.subTab, topic.id)}
                      className="w-full py-2.5 text-left text-xs font-semibold text-[#334155] hover:text-[#2563EB] flex items-center justify-between group transition-colors"
                    >
                      <span>{topic.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Level 2 Structured Navigation: Explore Knowledge & Compliance */}
          <section className="space-y-5">
            <div className="flex items-baseline justify-between border-b border-[#E2E8F0] pb-2">
              <h2 className="text-lg font-bold text-[#334155]">Explore Knowledge &amp; Compliance</h2>
              <span className="text-xs text-[#64748B]">{stats.totalPublished} verified topics</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Primary areas */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Primary Areas</h3>
                <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                  {[
                    {
                      id: 'bis' as KnowledgeSection,
                      icon: <BookOpen className="w-4 h-4 text-[#2563EB]" />,
                      title: 'BIS Standards & Cement Testing',
                      desc: 'Indian standards, cement testing references and technical methods.',
                      meta: `${stats.bisRefs} Standards`,
                    },
                    {
                      id: 'nabl' as KnowledgeSection,
                      icon: <Award className="w-4 h-4 text-[#0F9D92]" />,
                      title: 'NABL Accreditation',
                      desc: 'Accreditation guidance, documentation and assessment preparation.',
                      meta: `12-Step Guide`,
                    },
                    {
                      id: 'iso' as KnowledgeSection,
                      icon: <ShieldCheck className="w-4 h-4 text-[#2563EB]" />,
                      title: 'ISO/IEC 17025',
                      desc: 'Practical interpretation of laboratory competence requirements.',
                      meta: `Clauses 4–8`,
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className="w-full text-left p-4 hover:bg-[#F5F8FC] transition-colors flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-[#EAF3FF] shrink-0">{item.icon}</div>
                        <div>
                          <div className="text-sm font-bold text-[#334155] group-hover:text-[#2563EB]">{item.title}</div>
                          <p className="text-xs text-[#64748B] mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <span className="text-[11px] font-semibold text-[#64748B]">{item.meta}</span>
                        <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical learning */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Technical Learning</h3>
                <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                  {[
                    {
                      id: 'testing' as KnowledgeSection,
                      icon: <FlaskConical className="w-4 h-4 text-[#15803D]" />,
                      title: 'Laboratory Testing',
                      desc: 'Chemical, physical, mechanical and coal testing knowledge.',
                      meta: `${stats.testingCount} Guides`,
                    },
                    {
                      id: 'learning' as KnowledgeSection,
                      icon: <GraduationCap className="w-4 h-4 text-[#B45309]" />,
                      title: 'Technician Learning',
                      desc: 'Practical learning paths, instruments and technical fundamentals.',
                      meta: `${stats.totalLearningTopics} Topics`,
                    },
                    {
                      id: 'checklists' as KnowledgeSection,
                      icon: <ClipboardCheck className="w-4 h-4 text-[#0F9D92]" />,
                      title: 'Quality Assurance',
                      desc: 'Checklists, quality practices and operational guidance.',
                      meta: `${CHECKLIST_TEMPLATES.length} Checklists`,
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className="w-full text-left p-4 hover:bg-[#F5F8FC] transition-colors flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] shrink-0">{item.icon}</div>
                        <div>
                          <div className="text-sm font-bold text-[#334155] group-hover:text-[#2563EB]">{item.title}</div>
                          <p className="text-xs text-[#64748B] mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <span className="text-[11px] font-semibold text-[#64748B]">{item.meta}</span>
                        <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Level 3 Supporting Areas: Continue/Start Learning | Quick Reference | Recently Updated */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2 border-t border-[#E2E8F0]">
            {/* Continue Learning / Start Learning (Real Progress Only) */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                {stats.completedLearningCount > 0 ? 'Continue Learning' : 'Start Learning'}
              </h3>
              {stats.completedLearningCount > 0 ? (
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
                  <div className="text-sm font-bold text-[#334155]">Technician &amp; Quality Learning Paths</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Progress</span>
                      <span className="font-bold text-[#2563EB]">{stats.learningPercent}% completed</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#EAF3FF] overflow-hidden">
                      <div className="h-full bg-[#2563EB] transition-all" style={{ width: `${stats.learningPercent}%` }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('learning')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0] bg-white rounded-xl border border-[#E2E8F0] px-4">
                  {[
                    { label: 'Cement Laboratory Fundamentals', action: () => setSection('learning') },
                    { label: 'XRF Analysis', action: () => openTestingTopic('instruments', 'inst-xrf') },
                    { label: 'ISO/IEC 17025 Basics', action: () => setSection('iso') },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="w-full py-3 text-left text-xs font-semibold text-[#334155] hover:text-[#2563EB] flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Reference */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Quick Reference</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-1">
                {[
                  { label: 'BIS Standards', action: () => setSection('bis') },
                  { label: 'NABL Documents', action: () => setSection('nabl') },
                  { label: 'ISO/IEC 17025', action: () => setSection('iso') },
                  { label: 'Technical Glossary', action: () => setSection('glossary') },
                  { label: 'Testing Parameters', action: () => openTestingTopic('chemical', CHEMICAL_TOPICS[0].id) },
                  { label: 'Laboratory Equipment', action: () => openTestingTopic('instruments', INSTRUMENT_TOPICS[0].id) },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={q.action}
                    className="py-2 text-left font-semibold text-[#334155] hover:text-[#2563EB] border-b border-[#E2E8F0] flex items-center justify-between"
                  >
                    <span>{q.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                  </button>
                ))}
              </div>
              <div className="pt-2 space-y-1 text-[11px] text-[#64748B]">
                <div className="font-semibold text-[#334155]">Official Portals:</div>
                <div className="flex flex-wrap gap-3">
                  {OFFICIAL_REFERENCES.map((r) => (
                    <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2563EB] hover:underline">
                      <span>{r.name.split(' ')[0]}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Recently Updated (Actual DB dates or verified seed dates — never fabricated) */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Recently Updated</h3>
              <div className="divide-y divide-[#E2E8F0]">
                {dbArticles.slice(0, 2).map((art) => (
                  <div key={art.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-[#334155]">{art.title}</div>
                      <div className="text-[11px] text-[#64748B]">
                        Updated {String(art.updated_at).slice(0, 10)} • {art.subcategory}
                      </div>
                    </div>
                  </div>
                ))}
                {SEED_KNOWLEDGE_ARTICLES.slice(0, dbArticles.length > 0 ? 1 : 3).map((art) => (
                  <div key={art.articleCode} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-[#334155]">{art.title}</div>
                      <div className="text-[11px] text-[#64748B]">
                        Verified {art.lastVerifiedDate} • {art.subcategory}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection(art.categorySlug === 'bis' ? 'bis' : 'nabl')}
                      className="text-[#2563EB] font-semibold shrink-0 hover:underline"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SUB-SECTIONS */}
      {section === 'assistant' && (
        <KnowledgeAssistant onOpenSource={handleOpenCitationSource} />
      )}
      {section === 'bis' && <BisModuleView />}
      {section === 'nabl' && (
        <NablModuleView
          completedSteps={completedKeys}
          onToggleStep={(id) => handleToggleProgress('nabl_step', id)}
        />
      )}
      {section === 'iso' && <IsoModuleView />}
      {section === 'testing' && (
        <TestingKnowledgeModuleView
          key={`${testingPreset.subTab}:${testingPreset.topicId || ''}`}
          initialSubTab={testingPreset.subTab}
          initialTopicId={testingPreset.topicId}
        />
      )}
      {section === 'learning' && (
        <LearningModuleView
          userId={userId}
          completedTopics={completedKeys}
          onToggleTopic={(key) => handleToggleProgress('learning_topic', key)}
          quizAttempts={quizAttempts}
          onRefresh={loadKnowledgeData}
        />
      )}
      {section === 'checklists' && (
        <ChecklistsModuleView
          userId={userId}
          userName={userName}
          savedResponses={checklistResponses}
          onRefresh={loadKnowledgeData}
        />
      )}

      {/* TECHNICAL GLOSSARY (Editorial Dictionary List) */}
      {section === 'glossary' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F9D92]">Laboratory Dictionary</span>
              <h3 className="text-2xl font-bold text-[#334155]">Technical Glossary ({GLOSSARY_ENTRIES.length} Terms)</h3>
            </div>
            <input
              value={glossaryQuery}
              onChange={(e) => setGlossaryQuery(e.target.value)}
              placeholder="Search LOI, LSF, Blaine, CAPA..."
              className="w-full sm:w-72 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['All', 'A', 'B', 'C', 'G', 'I', 'L', 'M', 'N', 'P', 'S', 'T', 'U', 'V', 'X'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setGlossaryLetter(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  glossaryLetter === l ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
            {GLOSSARY_ENTRIES.filter((g) => {
              const q = glossaryQuery.trim().toLowerCase();
              const matchQ = !q || g.term.toLowerCase().includes(q) || g.fullForm.toLowerCase().includes(q) || g.simpleMeaning.toLowerCase().includes(q);
              const matchL = glossaryLetter === 'All' || g.term.toUpperCase().startsWith(glossaryLetter);
              return matchQ && matchL;
            }).map((g) => (
              <div key={g.term} className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
                <div className="lg:col-span-3">
                  <div className="font-bold text-[#2563EB] text-sm">{g.term}</div>
                  <div className="font-semibold text-[#334155]">{g.fullForm}</div>
                </div>
                <div className="lg:col-span-6 space-y-1">
                  <div className="font-medium text-[#334155]">{g.simpleMeaning}</div>
                  <p className="text-[#64748B] leading-relaxed">{g.technicalExplanation}</p>
                </div>
                <div className="lg:col-span-3 text-[11px] text-[#0F9D92] lg:text-right">
                  <strong>Example:</strong> {g.practicalExample}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLIANCE REFERENCE MAPPING */}
      {section === 'mapping' && (
        <div className="space-y-4">
          <div className="border-b border-[#E2E8F0] pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Traceability Matrix</span>
            <h3 className="text-2xl font-bold text-[#334155]">Compliance Reference Mapping</h3>
            <p className="text-xs text-[#64748B] mt-1">
              Connects laboratory activities with verified ISO/IEC 17025:2017 &amp; NABL clauses. Applicability depends on each lab’s accredited scope.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F8FC] text-[#334155] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4 font-bold">Laboratory Activity</th>
                  <th className="py-3 px-4 font-bold">Reference &amp; Clause</th>
                  <th className="py-3 px-4 font-bold">Requirement Summary</th>
                  <th className="py-3 px-4 font-bold">Required Evidence / Records</th>
                  <th className="py-3 px-4 font-bold">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {COMPLIANCE_MAPPINGS.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F5F8FC]/60">
                    <td className="py-3.5 px-4 font-semibold text-[#334155]">{m.laboratoryActivity}</td>
                    <td className="py-3.5 px-4 font-mono text-[#2563EB] font-semibold whitespace-nowrap">{m.referenceDocument}<br />{m.clauseSection}</td>
                    <td className="py-3.5 px-4 text-[#64748B]">{m.requirementSummary}<div className="text-[11px] text-[#334155] mt-0.5">{m.applicabilityNotes}</div></td>
                    <td className="py-3.5 px-4 text-[#334155]">{m.relatedRecords}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B] whitespace-nowrap">{m.lastVerifiedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

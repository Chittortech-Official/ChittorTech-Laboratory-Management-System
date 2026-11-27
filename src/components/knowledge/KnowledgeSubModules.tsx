'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Award,
  Search,
  FlaskConical,
  Hammer,
  Flame,
  Calculator,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import {
  STANDARD_REFERENCES,
  ISO_17025_TOPICS,
  NABL_PROCESS_STEPS,
  SEED_KNOWLEDGE_ARTICLES,
} from '@/lib/knowledge/standardsAndCompliance';
import {
  CHEMICAL_TOPICS,
  CALCULATION_TOPICS,
  MECHANICAL_TOPICS,
  COAL_TOPICS,
  INSTRUMENT_TOPICS,
} from '@/lib/knowledge/testingKnowledge';
import {
  LEARNING_PATHS,
  QUIZ_QUESTIONS,
  CHECKLIST_TEMPLATES,
} from '@/lib/knowledge/learningAndChecklists';

/* ============================================================================
   MODULE A: BIS STANDARDS & CEMENT TESTING (Category Filter + Enterprise Table)
   ============================================================================ */
export const BisModuleView: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const bisStandards = STANDARD_REFERENCES.filter((s) => s.authority === 'BIS');
  const bisArticles = SEED_KNOWLEDGE_ARTICLES.filter((a) => a.categorySlug === 'bis');

  const categories = [
    'All',
    'Cement Product Specification',
    'Physical & Mechanical Testing',
    'Chemical Testing',
    'Instrumental Chemical Analysis',
    'Coal & Fuel Testing',
  ];

  const q = filter.trim().toLowerCase();
  const visible = bisStandards.filter((s) => {
    const matchCat = categoryFilter === 'All' || s.subjectCategory === categoryFilter;
    if (!matchCat) return false;
    return (
      !q ||
      s.standardNumber.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.subjectCategory.toLowerCase().includes(q) ||
      s.relatedParameters.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="max-w-2xl space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Indian Standards Reference</span>
          <h3 className="text-2xl font-bold text-[#334155]">BIS Standards &amp; Cement Testing</h3>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Verified Bureau of Indian Standards references for OPC, PPC, PSC, chemical oxides, physical/mechanical testing, XRF spectrometry, and coal analysis.
          </p>
        </div>
        <a
          href="https://www.bis.gov.in/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:border-[#2563EB] transition-colors shrink-0"
        >
          <span>Official BIS Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#D6E8FF] text-[#2563EB]'
                  : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#334155]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter IS 269, IS 4031, XRF..."
            className="w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 py-2 text-xs text-[#334155] focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      {/* Enterprise Reference Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F8FC] text-[#334155] border-b border-[#E2E8F0]">
            <tr>
              <th className="py-3.5 px-4 font-bold">Standard</th>
              <th className="py-3.5 px-4 font-bold">Title &amp; Scope</th>
              <th className="py-3.5 px-4 font-bold">Category &amp; Material</th>
              <th className="py-3.5 px-4 font-bold">Parameters &amp; Methods</th>
              <th className="py-3.5 px-4 font-bold">Status / Verified</th>
              <th className="py-3.5 px-4 font-bold text-right">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {visible.map((std) => (
              <tr key={std.id} className="hover:bg-[#F5F8FC]/60 transition-colors">
                <td className="py-4 px-4 font-mono font-bold text-[#2563EB] whitespace-nowrap align-top">
                  {std.standardNumber}
                  <div className="text-[10px] font-sans font-normal text-[#64748B] mt-1">{std.editionInfo}</div>
                </td>
                <td className="py-4 px-4 align-top max-w-sm">
                  <div className="font-semibold text-[#334155]">{std.title}</div>
                  <p className="text-[#64748B] mt-1 leading-relaxed">{std.scopePurpose}</p>
                </td>
                <td className="py-4 px-4 align-top text-[#334155]">
                  <div className="font-medium">{std.subjectCategory}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">{std.applicableMaterial}</div>
                </td>
                <td className="py-4 px-4 align-top text-[#64748B] max-w-xs">
                  <div className="text-[#334155]">{std.relatedParameters}</div>
                  <div className="text-[11px] mt-1">{std.relatedMethods}</div>
                </td>
                <td className="py-4 px-4 align-top whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                    {std.verificationStatus} • {std.status}
                  </span>
                  <div className="text-[10px] font-semibold text-[#2563EB] mt-1">{std.classification}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Verified {std.lastVerifiedDate}</div>
                </td>
                <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                  <a href={std.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2563EB] font-semibold hover:underline">
                    <span>BIS</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editorial Compliance Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {bisArticles.map((art) => (
          <div key={art.articleCode} className="border-l-2 border-[#2563EB] pl-4 py-1 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92]">{art.subcategory}</span>
            <h4 className="text-sm font-bold text-[#334155]">{art.title}</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">{art.detailedContent}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-[#FEF3C7]/70 px-4 py-3 text-xs text-[#B45309] flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>ChittorTech provides educational guidance only and never issues official BIS certificates or product licences.</span>
      </div>
    </div>
  );
};

/* ============================================================================
   MODULE B: NABL ACCREDITATION GUIDE (Horizontal Stage Flow + Document Table)
   ============================================================================ */
export const NablModuleView: React.FC<{
  completedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
}> = ({ completedSteps, onToggleStep }) => {
  const [selectedStep, setSelectedStep] = useState(NABL_PROCESS_STEPS[0]);
  const nablDocs = STANDARD_REFERENCES.filter((s) => s.authority === 'NABL');
  const nablArticles = SEED_KNOWLEDGE_ARTICLES.filter((a) => a.categorySlug === 'nabl');

  const stages = [
    { name: 'Understand', range: 'Steps 1–2' },
    { name: 'Prepare', range: 'Step 3' },
    { name: 'Document', range: 'Step 4' },
    { name: 'Implement', range: 'Steps 5–8' },
    { name: 'Assess', range: 'Steps 9–11' },
    { name: 'Improve', range: 'Step 12' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="max-w-2xl space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F9D92]">Accreditation Roadmap</span>
          <h3 className="text-2xl font-bold text-[#334155]">NABL Accreditation Guide</h3>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Structured preparation guidance aligned with NABL 100A, 100B, 120, 131 and ISO/IEC 17025:2017. Educational guidance only — does not guarantee accreditation.
          </p>
        </div>
        <a
          href="https://nabl-india.org/nabl-documents/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:border-[#2563EB] shrink-0"
        >
          <span>NABL Documents Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Horizontal 6-Stage Process Flow (ChittorTech's Practical Learning Framework) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2.5 overflow-x-auto">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase tracking-wider text-[#64748B]">
            ChittorTech&apos;s Practical Learning Framework
          </span>
          <span className="text-[#64748B]">Simplified educational roadmap (not an official NABL-mandated sequence)</span>
        </div>
        <div className="flex items-center justify-between min-w-[640px] gap-2">
          {stages.map((st, idx) => (
            <React.Fragment key={st.name}>
              <div className="flex-1 text-center px-3 py-2 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <div className="text-xs font-bold text-[#334155]">{st.name}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">{st.range}</div>
              </div>
              {idx < stages.length - 1 && <ArrowRight className="w-4 h-4 text-[#64748B] shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 12-Step Interactive Documentation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-xl border border-[#E2E8F0] p-6">
        <div className="lg:col-span-5 space-y-1 border-r-0 lg:border-r border-[#E2E8F0] lg:pr-4 max-h-[440px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E8F0]">
            <span className="text-xs font-bold text-[#334155]">12-Step Process</span>
            <span className="text-[11px] font-semibold text-[#0F9D92]">
              {NABL_PROCESS_STEPS.filter((s) => completedSteps.has(s.id)).length} / 12 Reviewed
            </span>
          </div>
          {NABL_PROCESS_STEPS.map((step) => {
            const active = selectedStep.id === step.id;
            const done = completedSteps.has(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setSelectedStep(step)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                  active ? 'bg-[#EAF3FF] text-[#2563EB] font-bold' : 'text-[#334155] hover:bg-[#F5F8FC]'
                }`}
              >
                <span className="truncate">{step.step}. {step.title}</span>
                {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Step {selectedStep.step} of 12</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedStep.classification === 'Official Requirement'
                  ? 'bg-[#EAF3FF] text-[#2563EB]'
                  : 'bg-[#FEF3C7] text-[#B45309]'
              }`}>
                {selectedStep.classification}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleStep(selectedStep.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                completedSteps.has(selectedStep.id)
                  ? 'bg-[#DCFCE7] text-[#15803D] border-emerald-300'
                  : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#2563EB]'
              }`}
            >
              {completedSteps.has(selectedStep.id) ? 'Reviewed ✓' : 'Mark as Reviewed'}
            </button>
          </div>
          <h4 className="text-lg font-bold text-[#334155]">{selectedStep.title}</h4>
          <p className="text-sm font-medium text-[#334155]">{selectedStep.summary}</p>
          <p className="text-xs text-[#64748B] leading-relaxed">{selectedStep.detailedGuidance}</p>
          <div className="border-t border-[#E2E8F0] pt-3 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#334155]">Key Required Evidence: </span>
              <span className="text-[#0F9D92] font-semibold">{selectedStep.keyEvidence}</span>
            </div>
            <a href={selectedStep.officialReference} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2563EB] font-semibold hover:underline">
              <span>Official Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* NABL Documentation Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F8FC] text-[#334155] border-b border-[#E2E8F0]">
            <tr>
              <th className="py-3 px-4 font-bold">Document</th>
              <th className="py-3 px-4 font-bold">Title &amp; Purpose</th>
              <th className="py-3 px-4 font-bold">Edition / Verified</th>
              <th className="py-3 px-4 font-bold text-right">Official Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {nablDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-[#F5F8FC]/60">
                <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] whitespace-nowrap">{doc.standardNumber}</td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-[#334155]">{doc.title}</div>
                  <div className="text-[#64748B] mt-0.5">{doc.scopePurpose}</div>
                </td>
                <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">{doc.editionInfo} • {doc.lastVerifiedDate}</td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <a href={doc.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2563EB] font-semibold hover:underline">
                    <span>NABL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nablArticles.map((art) => (
          <div key={art.articleCode} className="border-l-2 border-[#0F9D92] pl-4 py-1 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92]">{art.subcategory}</span>
            <h4 className="text-sm font-bold text-[#334155]">{art.title}</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">{art.detailedContent}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
   MODULE C: ISO/IEC 17025 GUIDE (Clause Progression + Documentation Reader)
   ============================================================================ */
export const IsoModuleView: React.FC = () => {
  const [selected, setSelected] = useState(ISO_17025_TOPICS[0]);

  const clauseGroups = [
    { key: 'Clause 4', label: '4 General' },
    { key: 'Clause 5', label: '5 Structure' },
    { key: 'Clause 6', label: '6 Resources' },
    { key: 'Clause 7', label: '7 Process' },
    { key: 'Clause 8', label: '8 Management System' },
  ];

  const jumpToClauseGroup = (prefix: string) => {
    const match = ISO_17025_TOPICS.find((t) => t.clauseNumber.startsWith(prefix));
    if (match) setSelected(match);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="max-w-2xl space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">International Competence Standard</span>
          <h3 className="text-2xl font-bold text-[#334155]">ISO/IEC 17025:2017 Knowledge Centre</h3>
          <p className="text-sm text-[#64748B]">
            Practical educational interpretation for cement laboratories (does not reproduce copyrighted ISO standard text).
          </p>
        </div>
        <a
          href="https://www.iso.org/standard/17025"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:border-[#2563EB] shrink-0"
        >
          <span>ISO 17025 Official</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Clause Progression Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex flex-wrap items-center gap-2">
        {clauseGroups.map((cg, idx) => {
          const isGroupActive = selected.clauseNumber.startsWith(cg.key);
          return (
            <React.Fragment key={cg.key}>
              <button
                type="button"
                onClick={() => jumpToClauseGroup(cg.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isGroupActive ? 'bg-[#D6E8FF] text-[#2563EB]' : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#334155]'
                }`}
              >
                {cg.label}
              </button>
              {idx < clauseGroups.length - 1 && <span className="text-[#CBD5E1]">→</span>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-1 max-h-[560px] overflow-y-auto pr-1">
          {ISO_17025_TOPICS.map((topic) => {
            const active = selected.id === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelected(topic)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition-colors border-l-2 ${
                  active
                    ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold shadow-2xs'
                    : 'border-transparent text-[#334155] hover:bg-white/70'
                }`}
              >
                <div className="text-[10px] uppercase opacity-75">{topic.clauseNumber}</div>
                <div className="mt-0.5">{topic.title}</div>
              </button>
            );
          })}
        </div>

        <article className="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 space-y-5 text-sm">
          <div className="border-b border-[#E2E8F0] pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F9D92]">
              {selected.clauseGroup} • {selected.clauseNumber}
            </span>
            <h3 className="text-xl font-bold text-[#334155] mt-1">{selected.title}</h3>
          </div>

          <section className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Simple Explanation</h4>
            <p className="text-[#334155] leading-relaxed">{selected.simpleExplanation}</p>
          </section>

          <section className="space-y-1.5 border-l-2 border-[#2563EB] pl-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">Why It Matters</h4>
            <p className="text-[#334155] leading-relaxed">{selected.whyItMatters}</p>
          </section>

          <section className="space-y-1.5 border-l-2 border-[#0F9D92] pl-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F9D92]">Practical Laboratory Example</h4>
            <p className="text-[#334155] leading-relaxed">{selected.practicalExample}</p>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0] text-xs">
            <div><span className="text-[#64748B] block">Relevant Records</span><strong className="text-[#334155]">{selected.relevantRecords}</strong></div>
            <div><span className="text-[#64748B] block">Responsible Role</span><strong className="text-[#334155]">{selected.responsibleRole}</strong></div>
            <div><span className="text-[#64748B] block">Related Lab Activity</span><strong className="text-[#334155]">{selected.relatedActivity}</strong></div>
            <div><span className="text-[#64748B] block">Related ChittorTech Module</span><strong className="text-[#2563EB]">{selected.relatedModule}</strong></div>
          </div>
        </article>
      </div>
    </div>
  );
};

/* ============================================================================
   MODULE D: LABORATORY TESTING KNOWLEDGE (3-Column Documentation Layout + Sticky TOC)
   ============================================================================ */
export const TestingKnowledgeModuleView: React.FC<{
  initialSubTab?: 'chemical' | 'calculations' | 'mechanical' | 'coal' | 'instruments';
  initialTopicId?: string;
}> = ({ initialSubTab = 'chemical', initialTopicId }) => {
  const [subTab, setSubTab] = useState<'chemical' | 'calculations' | 'mechanical' | 'coal' | 'instruments'>(initialSubTab);
  const [selectedId, setSelectedId] = useState<string>(initialTopicId || CHEMICAL_TOPICS[0].id);

  const switchSubTab = (t: typeof subTab) => {
    setSubTab(t);
    if (t === 'chemical') setSelectedId(CHEMICAL_TOPICS[0].id);
    if (t === 'calculations') setSelectedId(CALCULATION_TOPICS[0].id);
    if (t === 'mechanical') setSelectedId(MECHANICAL_TOPICS[0].id);
    if (t === 'coal') setSelectedId(COAL_TOPICS[0].id);
    if (t === 'instruments') setSelectedId(INSTRUMENT_TOPICS[0].id);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-4">
        {[
          { id: 'chemical', label: `Chemical Analysis (${CHEMICAL_TOPICS.length})`, icon: <FlaskConical className="w-4 h-4" /> },
          { id: 'calculations', label: `Calculations (${CALCULATION_TOPICS.length})`, icon: <Calculator className="w-4 h-4" /> },
          { id: 'mechanical', label: `Mechanical & Physical (${MECHANICAL_TOPICS.length})`, icon: <Hammer className="w-4 h-4" /> },
          { id: 'coal', label: `Coal Analysis (${COAL_TOPICS.length})`, icon: <Flame className="w-4 h-4" /> },
          { id: 'instruments', label: `Instruments (${INSTRUMENT_TOPICS.length})`, icon: <Cpu className="w-4 h-4" /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchSubTab(item.id as typeof subTab)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              subTab === item.id
                ? 'bg-[#D6E8FF] text-[#2563EB]'
                : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#334155]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 3-Column Documentation Layout: Left Topic List | Center Reading Area | Right Sticky TOC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation */}
        <aside className="lg:col-span-3 space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {subTab === 'chemical' && CHEMICAL_TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs border-l-2 transition-colors ${selectedId === t.id ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold' : 'border-transparent text-[#334155] hover:bg-white/70'}`}>
              {t.title}
            </button>
          ))}
          {subTab === 'calculations' && CALCULATION_TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs border-l-2 transition-colors ${selectedId === t.id ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold' : 'border-transparent text-[#334155] hover:bg-white/70'}`}>
              {t.title}
            </button>
          ))}
          {subTab === 'mechanical' && MECHANICAL_TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs border-l-2 transition-colors ${selectedId === t.id ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold' : 'border-transparent text-[#334155] hover:bg-white/70'}`}>
              {t.title}
            </button>
          ))}
          {subTab === 'coal' && COAL_TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs border-l-2 transition-colors ${selectedId === t.id ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold' : 'border-transparent text-[#334155] hover:bg-white/70'}`}>
              {t.title}
            </button>
          ))}
          {subTab === 'instruments' && INSTRUMENT_TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs border-l-2 transition-colors ${selectedId === t.id ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold' : 'border-transparent text-[#334155] hover:bg-white/70'}`}>
              {t.name}
            </button>
          ))}
        </aside>

        {/* Center Editorial Reading Area */}
        <article className="lg:col-span-9 xl:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-[#334155]">
          {subTab === 'chemical' && (() => {
            const t = CHEMICAL_TOPICS.find((x) => x.id === selectedId) || CHEMICAL_TOPICS[0];
            return (
              <>
                <header className="border-b border-[#E2E8F0] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F9D92]">Chemical Testing</span>
                  <h3 className="text-2xl font-bold text-[#334155] mt-1">{t.title}</h3>
                  <p className="text-sm text-[#64748B] mt-1.5">{t.definition}</p>
                </header>
                <section id="sec-overview" className="space-y-1">
                  <h4 className="text-sm font-bold text-[#334155]">Why It Matters</h4>
                  <p className="text-[#64748B]">{t.purpose} {t.importance}</p>
                </section>
                <section id="sec-principle" className="space-y-1">
                  <h4 className="text-sm font-bold text-[#334155]">Testing Principle &amp; Method</h4>
                  <p className="text-[#64748B]">{t.principle} ({t.method})</p>
                </section>
                <section id="sec-equipment" className="space-y-1">
                  <h4 className="text-sm font-bold text-[#334155]">Equipment &amp; Sample Preparation</h4>
                  <p className="text-[#64748B]">{t.equipment}</p>
                  <p className="text-[#64748B] text-xs">{t.samplePrep}</p>
                </section>
                <section id="sec-interpretation" className="space-y-1">
                  <h4 className="text-sm font-bold text-[#334155]">Result Interpretation</h4>
                  <p className="text-[#64748B]">{t.interpretation}</p>
                </section>
                <section id="sec-errors" className="border-l-2 border-amber-400 pl-4 py-1 space-y-1">
                  <h4 className="text-sm font-bold text-[#B45309]">Common Testing Errors</h4>
                  <p className="text-xs text-[#64748B]">{t.commonMistakes}</p>
                </section>
                <section id="sec-references" className="pt-3 border-t border-[#E2E8F0] text-xs text-[#2563EB] font-semibold">
                  Related Standards: {t.standards}
                </section>
              </>
            );
          })()}

          {subTab === 'calculations' && (() => {
            const t = CALCULATION_TOPICS.find((x) => x.id === selectedId) || CALCULATION_TOPICS[0];
            return (
              <>
                <header className="border-b border-[#E2E8F0] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Chemical Calculation</span>
                  <h3 className="text-2xl font-bold text-[#334155] mt-1">{t.title}</h3>
                </header>
                <section id="sec-overview" className="rounded-lg bg-[#EAF3FF] border border-[#D6E8FF] p-4 font-mono text-xs text-[#2563EB] font-bold">
                  {t.formula}
                </section>
                <section id="sec-principle" className="space-y-1">
                  <h4 className="text-sm font-bold text-[#334155]">Variables &amp; Units ({t.units})</h4>
                  <p className="text-xs text-[#64748B]">{t.variables}</p>
                </section>
                <section id="sec-equipment" className="rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] p-4 text-xs space-y-1.5">
                  <h4 className="font-bold text-[#334155]">Worked Numerical Example</h4>
                  <p className="text-[#64748B]">{t.workedExample}</p>
                  <p className="font-mono text-[#334155]">{t.steps}</p>
                </section>
                <section id="sec-interpretation" className="space-y-1">
                  <h4 className="text-sm font-bold text-[#334155]">Interpretation &amp; Limitations</h4>
                  <p className="text-xs text-[#64748B]">{t.interpretation}</p>
                  <p className="text-xs text-[#64748B]">{t.limitations}</p>
                </section>
                <section id="sec-references" className="pt-3 border-t border-[#E2E8F0] text-xs text-[#0F9D92] font-semibold">
                  Technical Reference: {t.reference}
                </section>
              </>
            );
          })()}

          {subTab === 'mechanical' && (() => {
            const t = MECHANICAL_TOPICS.find((x) => x.id === selectedId) || MECHANICAL_TOPICS[0];
            return (
              <>
                <header className="border-b border-[#E2E8F0] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F9D92]">Mechanical &amp; Physical Testing</span>
                  <h3 className="text-2xl font-bold text-[#334155] mt-1">{t.title}</h3>
                  <p className="text-sm text-[#64748B] mt-1">{t.purpose}</p>
                </header>
                <section id="sec-principle" className="space-y-1"><h4 className="text-sm font-bold">Principle</h4><p className="text-xs text-[#64748B]">{t.principle}</p></section>
                <section id="sec-equipment" className="space-y-1"><h4 className="text-sm font-bold">Equipment</h4><p className="text-xs text-[#64748B]">{t.equipment}</p></section>
                <section id="sec-procedure" className="space-y-1"><h4 className="text-sm font-bold">Method Overview</h4><p className="text-xs text-[#64748B]">{t.methodOverview}</p></section>
                <section id="sec-interpretation" className="space-y-1"><h4 className="text-sm font-bold">Result Interpretation</h4><p className="text-xs text-[#64748B]">{t.interpretation}</p></section>
                <section id="sec-references" className="pt-3 border-t border-[#E2E8F0] text-xs text-[#2563EB] font-semibold">Reference: {t.reference}</section>
              </>
            );
          })()}

          {subTab === 'coal' && (() => {
            const t = COAL_TOPICS.find((x) => x.id === selectedId) || COAL_TOPICS[0];
            return (
              <>
                <header className="border-b border-[#E2E8F0] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">Coal Analysis</span>
                  <h3 className="text-2xl font-bold text-[#334155] mt-1">{t.title}</h3>
                </header>
                <section id="sec-overview"><p className="text-xs text-[#64748B]">{t.definition}</p></section>
                <section id="sec-principle" className="rounded-lg bg-[#EAF3FF] border border-[#D6E8FF] p-3 font-mono text-xs text-[#2563EB] font-bold">{t.formulaNote}</section>
                <section id="sec-interpretation"><h4 className="text-sm font-bold">Kiln &amp; Process Importance</h4><p className="text-xs text-[#64748B] mt-1">{t.kilnImportance}</p></section>
                <section id="sec-references" className="pt-3 border-t border-[#E2E8F0] text-xs text-[#0F9D92] font-semibold">Reference: {t.reference}</section>
              </>
            );
          })()}

          {subTab === 'instruments' && (() => {
            const t = INSTRUMENT_TOPICS.find((x) => x.id === selectedId) || INSTRUMENT_TOPICS[0];
            return (
              <>
                <header className="border-b border-[#E2E8F0] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Instrument Knowledge</span>
                  <h3 className="text-2xl font-bold text-[#334155] mt-1">{t.name}</h3>
                  <p className="text-sm text-[#64748B] mt-1">{t.purpose}</p>
                </header>
                <section id="sec-principle" className="space-y-1"><h4 className="text-sm font-bold">Working Principle &amp; Components</h4><p className="text-xs text-[#64748B]">{t.principle} — {t.components}</p></section>
                <section id="sec-procedure" className="space-y-1"><h4 className="text-sm font-bold">Operating Overview &amp; Routine Checks</h4><p className="text-xs text-[#64748B]">{t.operatingOverview} | Routine: {t.routineChecks}</p></section>
                <section id="sec-equipment" className="space-y-1"><h4 className="text-sm font-bold">Calibration &amp; Maintenance</h4><p className="text-xs text-[#64748B]">{t.calibrationNotes} | {t.maintenanceNotes}</p></section>
                <section id="sec-errors" className="border-l-2 border-amber-400 pl-4 py-1 space-y-1"><h4 className="text-sm font-bold text-[#B45309]">Safety &amp; Common Errors</h4><p className="text-xs text-[#64748B]">{t.safetyPrecautions} | Errors: {t.commonErrors}</p></section>
                <section id="sec-references" className="pt-3 border-t border-[#E2E8F0] text-xs text-[#2563EB] font-semibold">Related Methods: {t.relatedMethods}</section>
              </>
            );
          })()}
        </article>

        {/* Right Sticky Table of Contents */}
        <aside className="hidden xl:block xl:col-span-2 sticky top-24 space-y-2 text-xs pl-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">On this page</div>
          <nav className="space-y-1.5 border-l border-[#E2E8F0] pl-3 text-[#64748B]">
            <a href="#sec-overview" className="block hover:text-[#2563EB]">Overview</a>
            <a href="#sec-principle" className="block hover:text-[#2563EB]">Principle</a>
            <a href="#sec-equipment" className="block hover:text-[#2563EB]">Equipment</a>
            <a href="#sec-procedure" className="block hover:text-[#2563EB]">Method / Procedure</a>
            <a href="#sec-interpretation" className="block hover:text-[#2563EB]">Interpretation</a>
            <a href="#sec-errors" className="block hover:text-[#2563EB]">Common Errors</a>
            <a href="#sec-references" className="block hover:text-[#2563EB]">References</a>
          </nav>
        </aside>
      </div>
    </div>
  );
};

/* ============================================================================
   MODULE E: TECHNICIAN LEARNING CENTRE & QUIZZES
   ============================================================================ */
export const LearningModuleView: React.FC<{
  userId: string;
  completedTopics: Set<string>;
  onToggleTopic: (key: string) => void;
  quizAttempts: any[];
  onRefresh: () => void;
}> = ({ userId, completedTopics, onToggleTopic, quizAttempts, onRefresh }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const handleSubmitQuiz = async () => {
    setSavingQuiz(true);
    const score = QUIZ_QUESTIONS.reduce((acc, q) => (answers[q.id] === q.correctIndex ? acc + 1 : acc), 0);
    setSubmitted(true);
    try {
      await fetch('/api/knowledge-centre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_quiz_attempt',
          userId,
          topicSlug: 'cement-qa-foundation',
          score,
          totalQuestions: QUIZ_QUESTIONS.length,
          answers: QUIZ_QUESTIONS.map((q) => ({ id: q.id, selected: answers[q.id] ?? null, correct: q.correctIndex })),
        }),
      });
      onRefresh();
    } finally {
      setSavingQuiz(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-l-2 border-[#2563EB] pl-4 py-1 text-xs text-[#64748B]">
        <strong className="text-[#334155]">Educational Notice:</strong> Actual laboratory procedures must follow your approved laboratory SOP, standard test method, and OEM instrument manual. Quiz completion is for self-learning only and does not constitute an official training certificate or competency approval.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {LEARNING_PATHS.map((path) => {
          const doneCount = path.topics.filter((t) => completedTopics.has(t.key)).length;
          return (
            <div key={path.slug} className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92]">
                  {path.trackType}{path.targetRole ? ` • ${path.targetRole}` : ''}
                </span>
                <span className="text-xs font-bold text-[#2563EB]">{doneCount}/{path.topics.length} Completed</span>
              </div>
              <h4 className="text-sm font-bold text-[#334155]">{path.title}</h4>
              <p className="text-xs text-[#64748B]">{path.description}</p>
              <div className="divide-y divide-[#E2E8F0] pt-1">
                {path.topics.map((topic) => {
                  const checked = completedTopics.has(topic.key);
                  return (
                    <label key={topic.key} className="flex items-start gap-2.5 py-2.5 cursor-pointer text-xs">
                      <input type="checkbox" checked={checked} onChange={() => onToggleTopic(topic.key)} className="mt-0.5 rounded border-slate-300" />
                      <div>
                        <div className={`font-semibold ${checked ? 'line-through text-[#64748B]' : 'text-[#334155]'}`}>{topic.title}</div>
                        <div className="text-[11px] text-[#64748B]">{topic.summary}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Knowledge Assessment Quiz */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#334155]">Knowledge Assessment Quiz</h3>
            <p className="text-xs text-[#64748B]">Verify your understanding of cement chemistry, physical tests, and ISO/IEC 17025.</p>
          </div>
          {quizAttempts.length > 0 && (
            <span className="text-xs font-semibold text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-full">
              Last Saved Score: {quizAttempts[0].score}/{quizAttempts[0].total_questions}
            </span>
          )}
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {QUIZ_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="py-4 space-y-2.5 text-xs">
              <div className="font-bold text-[#334155]">{idx + 1}. {q.question}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, optIdx) => {
                  const selected = answers[q.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                      }}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                        selected ? 'bg-[#D6E8FF] border-[#2563EB] text-[#2563EB] font-semibold' : 'bg-[#F5F8FC] border-[#E2E8F0] text-[#334155]'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div className={`p-2.5 rounded-lg text-[11px] ${answers[q.id] === q.correctIndex ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
                  <strong>{answers[q.id] === q.correctIndex ? 'Correct:' : 'Explanation:'}</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={savingQuiz}
          onClick={handleSubmitQuiz}
          className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold"
        >
          {savingQuiz ? 'Saving Attempt...' : 'Submit & Check Answers'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
   MODULE F: QUALITY ASSURANCE CHECKLISTS
   ============================================================================ */
export const ChecklistsModuleView: React.FC<{
  userId: string;
  userName: string;
  savedResponses: any[];
  onRefresh: () => void;
}> = ({ userId, userName, savedResponses, onRefresh }) => {
  const [selectedSlug, setSelectedSlug] = useState(CHECKLIST_TEMPLATES[0].slug);
  const template = CHECKLIST_TEMPLATES.find((c) => c.slug === selectedSlug) || CHECKLIST_TEMPLATES[0];

  const [itemStates, setItemStates] = useState<Record<number, 'Yes' | 'No' | 'Not Applicable'>>({});
  const [responsiblePerson, setResponsiblePerson] = useState(userName || 'QA Chemist');
  const [completionDate, setCompletionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reviewStatus, setReviewStatus] = useState<'Draft' | 'Completed' | 'Reviewed'>('Completed');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const items = template.items.map((text, idx) => ({
        item: text,
        answer: itemStates[idx] || 'Yes',
      }));
      const res = await fetch('/api/knowledge-centre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_checklist',
          userId,
          checklistSlug: template.slug,
          checklistTitle: template.title,
          responsiblePerson,
          completionDate,
          reviewStatus,
          items,
          remarks,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedMsg(`Saved "${template.title}" to database.`);
        setRemarks('');
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-l-2 border-amber-400 pl-4 py-1 text-xs text-[#B45309]">
        <strong>Operational Guidance Notice:</strong> These checklists represent ChittorTech operational QA guidance and are not automatically mandated NABL or BIS regulatory checklists.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-1 max-h-[540px] overflow-y-auto pr-1">
          {CHECKLIST_TEMPLATES.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                setSelectedSlug(c.slug);
                setItemStates({});
                setSavedMsg(null);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border-l-2 text-xs transition-colors ${
                selectedSlug === c.slug
                  ? 'bg-white border-[#2563EB] text-[#2563EB] font-bold'
                  : 'border-transparent text-[#334155] hover:bg-white/70'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveChecklist} className="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4 text-xs">
          <div className="border-b border-[#E2E8F0] pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F9D92]">{template.guidanceType} • {template.applicableActivity}</span>
            <h3 className="text-lg font-bold text-[#334155] mt-0.5">{template.title}</h3>
            <p className="text-[#64748B] mt-1">{template.purpose}</p>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {template.items.map((itemText, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[#334155] font-medium">{idx + 1}. {itemText}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(['Yes', 'No', 'Not Applicable'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setItemStates((prev) => ({ ...prev, [idx]: opt }))}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${
                        (itemStates[idx] || 'Yes') === opt
                          ? opt === 'Yes'
                            ? 'bg-[#DCFCE7] text-[#15803D] border-emerald-300'
                            : opt === 'No'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                          : 'bg-white text-[#64748B] border-[#E2E8F0]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="font-semibold text-[#334155] block mb-1">Responsible Person</label>
              <input required value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2" />
            </div>
            <div>
              <label className="font-semibold text-[#334155] block mb-1">Completion Date</label>
              <input required type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2" />
            </div>
            <div>
              <label className="font-semibold text-[#334155] block mb-1">Review Status</label>
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as any)} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 bg-white">
                <option value="Draft">Draft</option>
                <option value="Completed">Completed</option>
                <option value="Reviewed">Reviewed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#334155] block mb-1">Remarks</label>
            <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional checklist observations..." className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 resize-none" />
          </div>

          {savedMsg && <div className="rounded-lg bg-[#DCFCE7] text-[#15803D] p-2.5 font-semibold">{savedMsg}</div>}

          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-bold">
            {saving ? 'Saving Checklist...' : 'Save Checklist Record'}
          </button>
        </form>
      </div>

      {savedResponses.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-2 text-xs">
          <h4 className="font-bold text-[#334155]">Saved Checklist History</h4>
          <div className="divide-y divide-[#E2E8F0]">
            {savedResponses.slice(0, 8).map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#334155]">{r.checklist_title}</span>
                  <span className="text-[#64748B] ml-2">by {r.responsible_person} on {r.completion_date}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">{r.review_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

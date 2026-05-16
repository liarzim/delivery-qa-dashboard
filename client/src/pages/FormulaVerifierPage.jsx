import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { runAllVerifications } from '../utils/clientVerifier';
import SectionHeader from '../components/SectionHeader';
import {
  FlaskConical, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, ShieldCheck,
} from 'lucide-react';

// ── Colour helpers ─────────────────────────────────────────────────────────────
const PASS_COLOR  = '#54E075';
const FAIL_COLOR  = '#F36059';
const WARN_COLOR  = '#F9BD33';

const passStyle  = { color: PASS_COLOR };
const failStyle  = { color: FAIL_COLOR };

// ── Small badge ───────────────────────────────────────────────────────────────
function StatusBadge({ pass }) {
  return pass
    ? <span className="badge-green" style={{ fontSize: '0.65rem' }}>PASS</span>
    : <span className="badge-red"   style={{ fontSize: '0.65rem' }}>FAIL</span>;
}

// ── Category chip ─────────────────────────────────────────────────────────────
const CAT_COLORS = {
  Delivery: { bg: 'rgba(20,65,245,0.15)',  text: '#93C5FD' },
  QA:       { bg: 'rgba(84,224,117,0.15)', text: '#54E075' },
  Logic:    { bg: 'rgba(249,189,51,0.15)', text: '#F9BD33' },
  Utility:  { bg: 'rgba(237,240,254,0.1)', text: 'rgba(237,240,254,0.6)' },
};
function CatChip({ category }) {
  const s = CAT_COLORS[category] || CAT_COLORS.Utility;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      backgroundColor: s.bg, color: s.text,
    }}>{category}</span>
  );
}

// ── Expandable unit-test row ──────────────────────────────────────────────────
function TestRow({ test }) {
  const [open, setOpen] = useState(!test.pass);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backgroundColor: test.pass ? 'transparent' : 'rgba(243,96,89,0.04)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', textAlign: 'start', background: 'none', border: 'none',
          cursor: 'pointer', color: '#EDF0FE',
        }}
      >
        {test.pass
          ? <CheckCircle2 size={16} style={passStyle} />
          : <XCircle      size={16} style={failStyle} />}
        <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{test.name}</span>
        <CatChip category={test.category} />
        <code style={{ fontSize: '0.7rem', color: 'rgba(237,240,254,0.4)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {test.formula}
        </code>
        <span style={{ fontSize: '0.7rem', color: 'rgba(237,240,254,0.35)', width: 60, textAlign: 'end' }}>
          {test.caseCount} cases
        </span>
        <Chevron size={14} style={{ color: 'rgba(237,240,254,0.3)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ padding: '0 16px 12px 44px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ color: 'rgba(237,240,254,0.4)' }}>
                {['Inputs', 'Expected', 'Actual', 'Status'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'start', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(test.cases || []).map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '4px 8px', color: 'rgba(237,240,254,0.65)', fontFamily: 'monospace' }}>
                    {c.inputs ?? JSON.stringify(c).slice(0, 60)}
                  </td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: PASS_COLOR }}>
                    {JSON.stringify(c.expected)}
                  </td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: c.pass ? PASS_COLOR : FAIL_COLOR }}>
                    {JSON.stringify(c.actual)}
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <StatusBadge pass={c.pass} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {test.error && (
            <p style={{ color: FAIL_COLOR, fontSize: '0.75rem', marginTop: 6 }}>
              Error: {test.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live check row ────────────────────────────────────────────────────────────
function LiveRow({ check }) {
  const [open, setOpen] = useState(!check.pass);
  const Chevron = open ? ChevronUp : ChevronDown;
  let parsed;
  try { parsed = JSON.parse(check.value); } catch { parsed = check.value; }

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backgroundColor: check.pass ? 'transparent' : 'rgba(243,96,89,0.04)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', textAlign: 'start', background: 'none', border: 'none',
          cursor: 'pointer', color: '#EDF0FE',
        }}
      >
        {check.pass
          ? <CheckCircle2 size={16} style={passStyle} />
          : <XCircle      size={16} style={failStyle} />}
        <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500 }}>{check.name}</span>
        <CatChip category={check.category} />
        <Chevron size={14} style={{ color: 'rgba(237,240,254,0.3)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ padding: '4px 16px 12px 44px', fontSize: '0.75rem', color: 'rgba(237,240,254,0.6)' }}>
          <div style={{ marginBottom: 4 }}>
            <strong style={{ color: 'rgba(237,240,254,0.45)' }}>Formula: </strong>
            <code>{check.formula}</code>
          </div>
          <div>
            <strong style={{ color: 'rgba(237,240,254,0.45)' }}>Data: </strong>
            <code style={{ color: check.pass ? PASS_COLOR : FAIL_COLOR }}>
              {typeof parsed === 'object' ? JSON.stringify(parsed) : check.value}
            </code>
          </div>
          {check.note && (
            <p style={{ marginTop: 4, color: WARN_COLOR }}>{check.note}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary banner ────────────────────────────────────────────────────────────
function SummaryBanner({ summary }) {
  const allPass = summary.allPass;
  const Icon    = allPass ? ShieldCheck : AlertTriangle;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', borderRadius: 12,
      backgroundColor: allPass ? 'rgba(84,224,117,0.08)' : 'rgba(243,96,89,0.1)',
      border: `1px solid ${allPass ? 'rgba(84,224,117,0.3)' : 'rgba(243,96,89,0.35)'}`,
    }}>
      <Icon size={22} style={{ color: allPass ? PASS_COLOR : FAIL_COLOR, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: allPass ? PASS_COLOR : FAIL_COLOR }}>
          {allPass ? 'All tests passed' : 'Some tests failed'}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(237,240,254,0.5)', marginTop: 2 }}>
          Unit tests: {summary.unitTests.passed}/{summary.unitTests.total} passed
          {summary.liveChecks.total > 0 && (
            <>  ·  Live checks: {summary.liveChecks.passed}/{summary.liveChecks.total} passed</>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FormulaVerifierPage() {
  const { t } = useLanguage();
  const { delivery, qa } = useData();
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);

  const run = () => {
    setLoading(true);
    // Use setTimeout so the spinner renders before the synchronous work blocks
    setTimeout(() => {
      try {
        const data = runAllVerifications(delivery, qa);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 30);
  };

  // Group unit tests by category
  const grouped = results
    ? Object.entries(
        results.unitTests.reduce((acc, test) => {
          (acc[test.category] = acc[test.category] || []).push(test);
          return acc;
        }, {})
      )
    : [];

  const failedLive = results?.liveChecks?.filter(c => !c.pass) || [];
  const passedLive = results?.liveChecks?.filter(c => c.pass)  || [];

  return (
    <div className="max-w-4xl space-y-6">
      <SectionHeader
        title={t('verify_title')}
        subtitle={t('verify_subtitle')}
        action={
          <button
            onClick={run}
            disabled={loading}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> {t('verify_running')}</>
              : <><FlaskConical size={14} /> {t('verify_run')}</>}
          </button>
        }
      />

      {!delivery && !qa && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          backgroundColor: 'rgba(249,189,51,0.08)', border: '1px solid rgba(249,189,51,0.3)',
          color: WARN_COLOR, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={15} />
          No data loaded — unit tests will still run, but live checks require Excel files to be loaded first.
        </div>
      )}

      {!results && !loading && (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          border: '2px dashed rgba(120,150,255,0.2)', borderRadius: 14,
          color: 'rgba(237,240,254,0.3)',
        }}>
          <FlaskConical size={36} style={{ margin: '0 auto 12px' }} />
          <p className="text-sm">Click <strong>Run All Tests</strong> to verify every KPI formula</p>
        </div>
      )}

      {results && (
        <>
          {/* Summary */}
          <SummaryBanner summary={results.summary} />

          {/* Unit Tests */}
          <div style={{ backgroundColor: '#0F257A', border: '1px solid rgba(20,65,245,0.25)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#EDF0FE' }}>
                {t('verify_unit_tests')}
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'rgba(237,240,254,0.4)', marginInlineStart: 8 }}>
                  {results.unitTests.length} formulas · {results.unitTests.reduce((a, t) => a + t.caseCount, 0)} total cases
                </span>
              </h3>
            </div>
            {grouped.map(([cat, tests]) => (
              <div key={cat}>
                <div style={{ padding: '6px 16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(237,240,254,0.3)', textTransform: 'uppercase' }}>
                    {cat}
                  </p>
                </div>
                {tests.map(test => <TestRow key={test.id} test={test} />)}
              </div>
            ))}
          </div>

          {/* Live Data Checks */}
          <div style={{ backgroundColor: '#0F257A', border: '1px solid rgba(20,65,245,0.25)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#EDF0FE' }}>
                {t('verify_live_checks')}
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'rgba(237,240,254,0.4)', marginInlineStart: 8 }}>
                  {results.liveChecks.length} checks
                </span>
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(237,240,254,0.45)', marginTop: 4 }}>
                {t('verify_live_desc')}
              </p>
            </div>

            {results.summary.liveError && (
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={15} style={{ color: WARN_COLOR, flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', color: WARN_COLOR }}>
                  {results.summary.liveError}
                </p>
              </div>
            )}

            {results.liveChecks.length === 0 && !results.summary.liveError && (
              <div style={{ padding: '20px 16px', color: 'rgba(237,240,254,0.3)', fontSize: '0.8rem', textAlign: 'center' }}>
                {t('verify_no_data')}
              </div>
            )}

            {/* Failed checks first */}
            {failedLive.map(c => <LiveRow key={c.id} check={c} />)}
            {passedLive.map(c => <LiveRow key={c.id} check={c} />)}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * HighTechDashboard — clean enterprise / portal template.
 *
 * Design language (reference: government-portal / enterprise intranet):
 *  • Deep teal-navy header bar with logo accent
 *  • White cards on a cool-gray background
 *  • Left-border accent on each card (colour = threshold status)
 *  • Large, clean sans-serif KPI numbers — no glow, no neon
 *  • Flat progress strips with muted track
 *  • Status badges (pill shapes, not dots)
 *  • Compact data-dense rows for PI / squad breakdowns
 */
import React, { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { getTrafficLight } from '../utils/thresholds';
import {
  Target, Zap, Activity, Bug, TrendingUp,
  ChevronDown, ChevronUp, BarChart2,
} from 'lucide-react';

// ── Palette ────────────────────────────────────────────────────────────────────
const P = {
  // Backgrounds
  page:    '#EEF2F7',
  card:    '#FFFFFF',
  header:  '#1B3F6B',       // deep navy-teal
  headerB: '#14325A',       // slightly darker for sub-bar

  // Accents
  blue:    '#1D5FA8',
  blueL:   '#E8F0FB',
  teal:    '#0F7A82',
  tealL:   '#E6F5F6',

  // Status
  green:   '#167A45',
  greenL:  '#E6F6EE',
  greenB:  '#28A462',
  amber:   '#A05A00',
  amberL:  '#FFF3DC',
  amberB:  '#D97706',
  red:     '#9B1B20',
  redL:    '#FDECEA',
  redB:    '#DC2626',

  // Text
  text:    '#1A2332',
  sub:     '#4B5A6E',
  muted:   '#8494A8',
  border:  '#D6DDE8',
  divider: '#EBEff5',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function lightP(l) {
  if (l === 'green')  return { fg: P.greenB, bg: P.greenL, bar: P.greenB, border: '#B7E6CE' };
  if (l === 'yellow') return { fg: P.amberB, bg: P.amberL, bar: P.amberB, border: '#FDD89A' };
  return                     { fg: P.redB,   bg: P.redL,   bar: P.redB,   border: '#FBCAC7' };
}

// ── Status badge ───────────────────────────────────────────────────────────────
function Badge({ light, label }) {
  const c = lightP(light);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 99,
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
      backgroundColor: c.bg, color: c.fg,
      border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c.fg, flexShrink: 0 }} />
      {label || light.toUpperCase()}
    </span>
  );
}

// ── Flat progress bar ──────────────────────────────────────────────────────────
function FlatBar({ value, max = 100, light, height = 5 }) {
  const c = lightP(light || 'green');
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height, borderRadius: height, backgroundColor: P.divider, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: height,
        backgroundColor: c.bar,
        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

// ── KPI hero card ──────────────────────────────────────────────────────────────
function KpiHero({ label, value, unit = '%', icon: Icon, light, sub }) {
  const c = lightP(light || 'green');
  return (
    <div style={{
      flex: 1, minWidth: 0,
      backgroundColor: P.card,
      borderRadius: 10,
      border: `1px solid ${P.border}`,
      borderTop: `3px solid ${c.bar}`,
      padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            backgroundColor: c.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} style={{ color: c.fg }} />
          </div>
        )}
      </div>
      <div style={{
        fontSize: '2.4rem', fontWeight: 800, lineHeight: 1, color: P.text,
        letterSpacing: '-0.02em',
      }}>
        {value ?? '—'}
        {value != null && <span style={{ fontSize: '1.1rem', color: P.sub, fontWeight: 600, marginInlineStart: 2 }}>{unit}</span>}
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {sub && <span style={{ fontSize: '0.68rem', color: P.muted }}>{sub}</span>}
        {light && <Badge light={light} />}
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
function Card({ title, action, children, accent = P.blue }) {
  return (
    <div style={{
      backgroundColor: P.card,
      border: `1px solid ${P.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        padding: '13px 18px',
        borderBottom: `1px solid ${P.divider}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FAFBFD',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accent }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: P.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {title}
          </span>
        </div>
        {action}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

// ── PI tab row ─────────────────────────────────────────────────────────────────
function PITabs({ piList, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${P.border}`, marginBottom: 16 }}>
      {piList.map(pi => {
        const active = pi === selected;
        return (
          <button key={pi} onClick={() => onSelect(active ? null : pi)}
            style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: active ? 700 : 500,
              color: active ? P.blue : P.muted,
              backgroundColor: 'transparent',
              borderBottom: `2px solid ${active ? P.blue : 'transparent'}`,
              marginBottom: -1,
              transition: 'all 0.12s',
            }}
          >{pi}</button>
        );
      })}
    </div>
  );
}

// ── Delivery PI row ────────────────────────────────────────────────────────────
function DeliveryRow({ p, thr, isLast }) {
  const [open, setOpen] = useState(false);
  const l = getTrafficLight(p.committedRate, +thr.commitment_yellow || 80, +thr.commitment_red || 60, true);
  const c = lightP(l);
  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px solid ${P.divider}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 4px', cursor: 'pointer',
          borderLeft: `3px solid ${c.bar}`,
          paddingLeft: 12,
          backgroundColor: open ? P.blueL + '55' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: P.text, width: 80, flexShrink: 0 }}>{p.pi}</span>

        {/* Progress */}
        <div style={{ flex: 1 }}>
          <FlatBar value={p.committedRate} light={l} />
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Committed</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: c.fg }}>{p.committedRate}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: P.text }}>{p.overallRate}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Done</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: P.sub }}>{p.totalDone}/{p.totalFeatures}</div>
          </div>
          <Badge light={l} />
          {open ? <ChevronUp size={13} color={P.muted} /> : <ChevronDown size={13} color={P.muted} />}
        </div>
      </div>

      {/* Expanded row */}
      {open && (
        <div style={{
          padding: '10px 14px 14px 15px', backgroundColor: '#F8FAFD',
          borderTop: `1px solid ${P.divider}`,
        }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Uncommitted Rate',   val: `${p.uncommittedRate}%` },
              { label: 'Total Committed',    val: p.totalCommitted },
              { label: 'Committed Done',     val: p.committedDone },
              { label: 'Total Uncommitted',  val: p.totalUncommitted },
              { label: 'Uncommitted Done',   val: p.uncommittedDone },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: '0.6rem', color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: P.text }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── QA metric row ──────────────────────────────────────────────────────────────
function QaMetricRow({ label, value, detail, light, max = 100 }) {
  const c = lightP(light || 'green');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: `1px solid ${P.divider}`,
    }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: P.sub, width: 120, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <FlatBar value={value} max={max} light={light} height={6} />
      </div>
      <span style={{ fontSize: '0.72rem', color: P.muted, width: 70, textAlign: 'end', flexShrink: 0 }}>{detail}</span>
      <span style={{ fontSize: '1rem', fontWeight: 800, color: c.fg, width: 52, textAlign: 'end', flexShrink: 0 }}>
        {value}{max === 100 ? '%' : ''}
      </span>
      <div style={{ width: 72, flexShrink: 0 }}>
        <Badge light={light} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HighTechDashboard() {
  const { data: delivery } = useApi('/api/data/delivery');
  const { data: qa }       = useApi('/api/data/qa');
  const { data: settings } = useApi('/api/settings');

  const [selPI, setSelPI] = useState(null);

  const piList   = delivery?.piMetrics  || [];
  const qaList   = qa?.piMetrics        || [];
  const flowList = delivery?.flowMetrics || [];
  const dSum     = delivery?.summary    || {};
  const squads   = qa?.squadMetrics     || [];

  const activePIName = selPI ?? piList[piList.length - 1]?.pi;

  const dPI  = useMemo(() => piList.find(p  => p.pi === activePIName)  ?? piList[piList.length - 1],  [piList,  activePIName]);
  const qPI  = useMemo(() => qaList.find(p  => p.pi === activePIName)  ?? qaList[qaList.length - 1],  [qaList,  activePIName]);
  const fPI  = useMemo(() => flowList.find(p => p.pi === activePIName) ?? flowList[flowList.length - 1], [flowList, activePIName]);

  const thr = settings || {};

  const tCommitted  = getTrafficLight(dPI?.committedRate   || 0, +thr.commitment_yellow       || 80, +thr.commitment_red       || 60, true);
  const tOverall    = getTrafficLight(dPI?.overallRate     || 0, +thr.commitment_yellow       || 80, +thr.commitment_red       || 60, true);
  const tReopen     = getTrafficLight(qPI?.reopenPct       || 0, +thr.reopen_yellow           || 5,  +thr.reopen_red           || 10);
  const tRejected   = getTrafficLight(qPI?.rejectedPct     || 0, +thr.rejected_yellow         || 5,  +thr.rejected_red         || 10);
  const tEscaping   = getTrafficLight(qPI?.escapingPct     || 0, +thr.escaping_yellow         || 3,  +thr.escaping_red         || 7);
  const tReopenD    = getTrafficLight(qPI?.reopenDensity   || 0, +thr.reopen_density_yellow   || 2,  +thr.reopen_density_red   || 5);
  const tEscapingD  = getTrafficLight(qPI?.escapingDensity || 0, +thr.escaping_density_yellow || 2,  +thr.escaping_density_red || 5);
  const tRejectedD  = getTrafficLight(qPI?.rejectedDensity || 0, +thr.rejected_density_yellow || 2,  +thr.rejected_density_red || 5);

  if (!delivery || !qa) {
    return (
      <div style={{ minHeight: '100%', backgroundColor: P.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <BarChart2 size={40} color={P.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.85rem', color: P.muted, fontWeight: 600 }}>No data loaded</p>
          <p style={{ fontSize: '0.72rem', color: P.muted, marginTop: 4 }}>Load your Excel files to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: P.page, minHeight: '100%', color: P.text }}>

      {/* ── Portal header bar ──────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: P.header,
        borderRadius: 10,
        padding: '14px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}>
        {/* Left — title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
              QA &amp; Delivery Dashboard
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
              {activePIName ? `Showing PI: ${activePIName}` : 'All PIs — latest selected'}
            </div>
          </div>
        </div>

        {/* Right — summary badges */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { label: 'Committed', light: tCommitted },
            { label: 'QA Reopen', light: tReopen    },
            { label: 'Escaping',  light: tEscaping  },
          ].map(({ label, light }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                backgroundColor: lightP(light).bar,
              }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PI tabs ─────────────────────────────────────────────────────────── */}
      <PITabs
        piList={piList.map(p => p.pi)}
        selected={selPI}
        onSelect={setSelPI}
      />

      {/* ── Hero KPI row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <KpiHero
          label="Committed Rate"
          value={dPI?.committedRate ?? null}
          icon={Target} light={tCommitted}
          sub={`${dPI?.committedDone ?? 0} / ${dPI?.totalCommitted ?? 0} features`}
        />
        <KpiHero
          label="Overall Rate"
          value={dPI?.overallRate ?? null}
          icon={TrendingUp} light={tOverall}
          sub={`${dPI?.totalDone ?? 0} / ${dPI?.totalFeatures ?? 0} total`}
        />
        <KpiHero
          label="Avg Velocity"
          value={dSum.avgVelocity ?? null}
          unit="" icon={Zap}
          light={null}
          sub={`${dSum.totalThroughput ?? 0} items delivered`}
        />
        <KpiHero
          label="Throughput"
          value={fPI?.throughput ?? null}
          unit="" icon={Activity}
          light={null}
          sub={`Median flow: ${fPI?.medianFlowTime ?? 0} days`}
        />
        <KpiHero
          label="Total Bugs"
          value={qPI?.totalBugs ?? null}
          unit="" icon={Bug}
          light={null}
          sub={`${qPI?.closedBugs ?? 0} closed · capacity ${qPI?.capacity ?? 0}`}
        />
      </div>

      {/* ── Main panels ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14, marginBottom: 14 }}>

        {/* Delivery by PI */}
        <Card title="Delivery — PI Breakdown" accent={P.blue}
          action={
            <span style={{ fontSize: '0.65rem', color: P.muted, fontWeight: 600 }}>
              {piList.length} PI{piList.length !== 1 ? 's' : ''}
            </span>
          }
        >
          {piList.map((p, i) => (
            <DeliveryRow key={p.pi} p={p} thr={thr} isLast={i === piList.length - 1} />
          ))}
          {piList.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: P.muted, padding: '8px 0' }}>No delivery data available.</p>
          )}
        </Card>

        {/* QA metrics */}
        <Card title="QA Metrics" accent={P.teal}
          action={<span style={{ fontSize: '0.65rem', color: P.muted, fontWeight: 600 }}>{qPI?.pi}</span>}
        >
          {/* Percentages header */}
          <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: P.muted, marginBottom: 2 }}>
            Percentage Metrics
          </div>
          <QaMetricRow label="Reopen %"   value={qPI?.reopenPct   || 0} detail={`${qPI?.reopenCount   ?? 0} / ${qPI?.closedBugs ?? 0}`} light={tReopen}   />
          <QaMetricRow label="Rejected %"  value={qPI?.rejectedPct || 0} detail={`${qPI?.rejectedCount ?? 0} / ${qPI?.totalBugs  ?? 0}`} light={tRejected} />
          <QaMetricRow label="Escaping %"  value={qPI?.escapingPct || 0} detail={`${qPI?.escapingCritical ?? 0} crit.`}                  light={tEscaping} />

          {/* Density header */}
          <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: P.muted, marginTop: 16, marginBottom: 2 }}>
            Density Metrics (per capacity)
          </div>
          <QaMetricRow label="Reopen Density"   value={qPI?.reopenDensity   || 0} max={20} detail={`cap: ${qPI?.capacity ?? 0}`} light={tReopenD}   />
          <QaMetricRow label="Rejected Density"  value={qPI?.rejectedDensity || 0} max={20} detail=""                            light={tRejectedD} />
          <QaMetricRow label="Escaping Density"  value={qPI?.escapingDensity || 0} max={20} detail=""                            light={tEscapingD} />
        </Card>
      </div>

      {/* ── Squad breakdown ─────────────────────────────────────────────────── */}
      {squads.length > 0 && (
        <Card title="Squad Breakdown" accent={P.teal}
          action={<span style={{ fontSize: '0.65rem', color: P.muted, fontWeight: 600 }}>{squads.length} teams</span>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {squads.map(s => {
              const closedRate = s.totalBugs ? Math.round((s.closedBugs / s.totalBugs) * 100) : 0;
              const l = getTrafficLight(closedRate, 70, 50, true);
              const c = lightP(l);
              return (
                <div key={s.squad} style={{
                  padding: '13px 14px',
                  border: `1px solid ${P.border}`,
                  borderLeft: `3px solid ${c.bar}`,
                  borderRadius: 8,
                  backgroundColor: '#FAFBFD',
                }}>
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 700, color: P.sub,
                    marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.squad}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.7rem', fontWeight: 800, color: P.text, lineHeight: 1 }}>{s.totalBugs}</span>
                    <span style={{ fontSize: '0.68rem', color: P.muted }}>bugs</span>
                    <span style={{ marginInlineStart: 'auto', fontSize: '0.72rem', fontWeight: 700, color: c.fg }}>{closedRate}%</span>
                  </div>
                  <FlatBar value={closedRate} light={l} height={5} />
                  <div style={{ fontSize: '0.62rem', color: P.muted, marginTop: 5 }}>
                    {s.closedBugs} closed · {s.reopenCount ?? 0} reopened
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

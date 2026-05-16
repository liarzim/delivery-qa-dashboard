import React, { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import {
  Server, Database, Layers, GitBranch, Calculator, ShieldCheck,
  FileSpreadsheet, Users, BarChart3, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react';

const CARD = {
  backgroundColor: '#0F257A',
  border: '1px solid rgba(20,65,245,0.25)',
  borderRadius: '12px',
  padding: '20px',
};

const SECTION_TITLE = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#EDF0FE',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const SUB = { color: 'rgba(237,240,254,0.45)', fontSize: '0.8rem' };

const DIVIDER = { borderBottom: '1px solid rgba(20,65,245,0.15)', marginTop: 12, marginBottom: 12 };

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={CARD}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left mb-1"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(20,65,245,0.25)' }}>
          <Icon size={14} style={{ color: '#3F64F7' }} />
        </div>
        <span style={SECTION_TITLE}>{title}</span>
        <div className="ml-auto text-sigma-ice/40">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function FormulaBlock({ name, formula, description, inputs }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-sm font-bold text-sigma-ice mb-1">{name}</p>
      <div
        className="font-mono text-sm px-4 py-2.5 rounded-lg mb-2"
        style={{ backgroundColor: 'rgba(6,21,78,0.7)', border: '1px solid rgba(20,65,245,0.2)', color: '#27DBE4' }}
      >
        {formula}
      </div>
      {description && <p className="text-xs mb-1.5" style={SUB}>{description}</p>}
      {inputs && (
        <ul className="space-y-0.5">
          {inputs.map(([term, def]) => (
            <li key={term} className="text-xs flex gap-2">
              <span className="font-mono shrink-0" style={{ color: '#3F64F7' }}>{term}</span>
              <span style={SUB}>— {def}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TableRow({ cells, header }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(20,65,245,0.12)' }}>
      {cells.map((c, i) => (
        <td
          key={i}
          className={`px-3 py-2 text-xs ${header ? 'font-bold uppercase tracking-wider' : ''}`}
          style={header ? { color: 'rgba(237,240,254,0.35)' } : i === 0 ? { color: '#3F64F7', fontFamily: 'monospace' } : { color: 'rgba(237,240,254,0.75)' }}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}

function DocTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(20,65,245,0.2)' }}>
      <table className="w-full text-left">
        <thead style={{ backgroundColor: 'rgba(6,21,78,0.6)' }}>
          <TableRow cells={headers} header />
        </thead>
        <tbody>
          {rows.map((r, i) => <TableRow key={i} cells={r} />)}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ color, label }) {
  const colors = {
    blue:   { bg: 'rgba(20,65,245,0.2)',   text: '#3F64F7',  border: 'rgba(20,65,245,0.3)' },
    green:  { bg: 'rgba(84,224,117,0.15)', text: '#54E075',  border: 'rgba(84,224,117,0.3)' },
    yellow: { bg: 'rgba(249,189,51,0.15)', text: '#F9BD33',  border: 'rgba(249,189,51,0.3)' },
    red:    { bg: 'rgba(243,96,89,0.15)',  text: '#F36059',  border: 'rgba(243,96,89,0.3)' },
    teal:   { bg: 'rgba(39,219,228,0.15)', text: '#27DBE4',  border: 'rgba(39,219,228,0.3)' },
  };
  const c = colors[color] || colors.blue;
  return (
    <span
      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  );
}

export default function SystemDocsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <SectionHeader
        title="System Documentation"
        subtitle="Unified specification, architecture, and formula reference — Admin only"
      />

      {/* ── System Overview ─────────────────────────────────────────────── */}
      <Section icon={BarChart3} title="System Overview">
        <p className="text-sm text-sigma-ice/80 leading-relaxed mb-3">
          The <strong className="text-sigma-ice">QA &amp; Delivery Dashboard</strong> is a web-based management tool that aggregates
          data from Excel workbooks to produce real-time KPIs across delivery performance and QA quality for multiple squads and PIs (Program Increments).
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            ['Frontend', 'React 18 + Vite, Tailwind CSS, DnD Kit', 'blue'],
            ['Backend', 'Node.js + Express, SQLite (node:sqlite)', 'teal'],
            ['Auth', 'JWT (jsonwebtoken) + bcryptjs', 'green'],
          ].map(([name, desc, color]) => (
            <div
              key={name}
              className="rounded-lg px-4 py-3"
              style={{ backgroundColor: 'rgba(6,21,78,0.5)', border: '1px solid rgba(20,65,245,0.2)' }}
            >
              <Badge color={color} label={name} />
              <p className="text-xs mt-2" style={SUB}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Architecture ────────────────────────────────────────────────── */}
      <Section icon={Layers} title="Architecture & Data Flow">
        <div className="space-y-3 text-sm text-sigma-ice/80 leading-relaxed">
          <p>The system runs as two co-located processes (dev: Vite proxy to Express; prod: served via same origin):</p>
          <div style={DIVIDER} />
          <div className="font-mono text-xs rounded-lg px-4 py-3 space-y-1" style={{ backgroundColor: 'rgba(6,21,78,0.6)', border: '1px solid rgba(20,65,245,0.15)', color: '#EDF0FE' }}>
            <div><span style={{ color: '#27DBE4' }}>Browser</span> → <span style={{ color: '#3F64F7' }}>React (port 5173)</span> — Vite dev proxy</div>
            <div className="pl-6">→ <span style={{ color: '#3F64F7' }}>Express API (port 3001)</span></div>
            <div className="pl-12">→ <span style={{ color: '#F9BD33' }}>SQLite DB</span> <span style={{ color: 'rgba(237,240,254,0.4)' }}>(users, settings, layouts)</span></div>
            <div className="pl-12">→ <span style={{ color: '#F9BD33' }}>Excel files</span> <span style={{ color: 'rgba(237,240,254,0.4)' }}>(read-only, path from settings)</span></div>
          </div>
          <div style={DIVIDER} />
          <DocTable
            headers={['Layer', 'Technology', 'Purpose']}
            rows={[
              ['Client', 'React 18, Vite, Tailwind, Axios', 'SPA — renders dashboards, auth, settings'],
              ['Server', 'Express 4, Node.js ≥22', 'REST API — auth, data aggregation, settings'],
              ['Database', 'SQLite via node:sqlite (built-in)', 'Users, hashed passwords, layouts, settings'],
              ['Data source', 'XLSX (SheetJS) — read-only', 'Parses Delivery and QA workbooks from disk'],
              ['Auth', 'JWT (HS256), bcryptjs salted hash', 'Stateless session; role-based access control'],
            ]}
          />
        </div>
      </Section>

      {/* ── API Endpoints ───────────────────────────────────────────────── */}
      <Section icon={Server} title="API Endpoints" defaultOpen={false}>
        <DocTable
          headers={['Method', 'Path', 'Auth', 'Description']}
          rows={[
            ['POST', '/api/auth/login', 'Public', 'Returns JWT + user object'],
            ['GET', '/api/auth/me', 'Any', 'Validates token, returns current user'],
            ['GET', '/api/auth/users', 'Admin', 'List all users'],
            ['POST', '/api/auth/users', 'Admin', 'Create new user'],
            ['DELETE', '/api/auth/users/:id', 'Admin', 'Delete user by ID'],
            ['GET', '/api/settings', 'Any', 'Read all settings key-value pairs'],
            ['PUT', '/api/settings', 'Admin', 'Upsert settings'],
            ['GET', '/api/settings/select-folder', 'Admin', 'Opens Windows Explorer folder dialog, returns path'],
            ['GET', '/api/data/delivery', 'Any', 'Aggregated delivery metrics from Excel'],
            ['GET', '/api/data/qa', 'Any', 'Aggregated QA metrics from Excel'],
            ['GET', '/api/layout', 'Any', 'Per-user widget layout'],
            ['PUT', '/api/layout', 'Any', 'Save per-user widget layout'],
          ]}
        />
      </Section>

      {/* ── Database Schema ─────────────────────────────────────────────── */}
      <Section icon={Database} title="Database Schema" defaultOpen={false}>
        <div className="space-y-4">
          {[
            {
              table: 'users',
              cols: [['id', 'INTEGER PK AUTOINCREMENT'], ['username', 'TEXT UNIQUE NOT NULL'], ['password_hash', 'TEXT NOT NULL'], ['role', "TEXT — 'Admin' | 'Management'"], ['created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP']],
            },
            {
              table: 'user_layouts',
              cols: [['user_id', 'INTEGER PK → users(id) ON DELETE CASCADE'], ['layout_json', "TEXT — JSON array of widget IDs, e.g. [\"committed-rate\",\"reopen-pct\"]"], ['updated_at', 'DATETIME']],
            },
            {
              table: 'settings',
              cols: [['key', 'TEXT PK'], ['value', 'TEXT NOT NULL'], ['updated_at', 'DATETIME']],
            },
          ].map(({ table, cols }) => (
            <div key={table}>
              <p className="text-xs font-bold text-sigma-accent mb-2 font-mono">TABLE {table}</p>
              <DocTable
                headers={['Column', 'Type / Constraint']}
                rows={cols}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Excel Data Sources ──────────────────────────────────────────── */}
      <Section icon={FileSpreadsheet} title="Excel Data Sources">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-sigma-ice mb-2">delivery.xlsx</p>
            <DocTable
              headers={['Sheet', 'Required Columns', 'Notes']}
              rows={[
                ['Commitment Summary', 'PI, Commitment, Status', '"not committed" (case-insensitive) marks uncommitted rows; Status "done" marks completion'],
                ['FLOW', 'PI, Status, StartDate, EndDate', 'Status "done" = throughput; dates used for flow-time calculation'],
              ]}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-sigma-ice mb-2">qa_bugs.xlsx</p>
            <DocTable
              headers={['Sheet', 'Required Columns', 'Notes']}
              rows={[
                ['Bug Data', 'PI, Status, Resolution, Reopen Count, Priority/Severity, Squad/Team, Velocity', '"closed" status; "as designed" or "rejected" resolution = rejected bug'],
              ]}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-sigma-ice mb-2">qa_escaping.xlsx</p>
            <DocTable
              headers={['Sheet', 'Required Columns', 'Notes']}
              rows={[
                ['Escaping Defect', 'PI, Priority/Severity', 'Critical escaping defects from the previous PI are compared to current PI critical count'],
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ── KPI Formulas ────────────────────────────────────────────────── */}
      <Section icon={Calculator} title="KPI Formulas">
        <div className="grid grid-cols-1 gap-6">

          <div>
            <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>Delivery Metrics</p>
            <FormulaBlock
              name="Committed Completion Rate"
              formula="committedRate = (committedDone / totalCommitted) × 100"
              description="Percentage of committed features that reached 'done' status in the PI."
              inputs={[['committedDone', 'Features with Commitment ≠ "not committed" AND Status = "done"'], ['totalCommitted', 'Features with Commitment ≠ "not committed"']]}
            />
            <FormulaBlock
              name="Uncommitted Completion Rate"
              formula="uncommittedRate = (uncommittedDone / totalUncommitted) × 100"
              description="Completion rate for features that were explicitly not committed."
              inputs={[['uncommittedDone', 'Features with Commitment = "not committed" AND Status = "done"'], ['totalUncommitted', 'Features with Commitment = "not committed"']]}
            />
            <FormulaBlock
              name="Overall Completion Rate"
              formula="overallRate = (totalDone / totalFeatures) × 100"
              inputs={[['totalDone', 'All features with Status = "done"'], ['totalFeatures', 'All rows in the PI']]}
            />
            <FormulaBlock
              name="Throughput"
              formula="throughput = count(FLOW rows where Status = 'done')"
              description="Number of work items completed (FLOW sheet) per PI."
            />
            <FormulaBlock
              name="Average Flow Time"
              formula="avgFlowTime = mean(EndDate − StartDate) for done items  [days]"
              description="Mean lead time in calendar days for completed work items."
            />
            <FormulaBlock
              name="Average Velocity"
              formula="avgVelocity = totalThroughput / totalPIs  [items/PI]"
              description="Total throughput divided by number of PIs — a cross-PI average."
            />
          </div>

          <div style={DIVIDER} />

          <div>
            <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>QA Percentage Metrics</p>
            <FormulaBlock
              name="Reopen %"
              formula="reopenPct = (reopenCount / closedBugs) × 100"
              description="Ratio of reopened bugs to bugs that were closed in the PI."
              inputs={[['reopenCount', 'Bugs with Reopen Count > 0'], ['closedBugs', 'Bugs with Status = "closed"']]}
            />
            <FormulaBlock
              name="Rejected %"
              formula="rejectedPct = (rejectedCount / totalBugs) × 100"
              inputs={[['rejectedCount', 'Bugs with Resolution = "as designed" OR Status = "rejected"'], ['totalBugs', 'All bug rows in the PI']]}
            />
            <FormulaBlock
              name="Escaping %"
              formula="escapingPct = (escapingCritical_current / prevCriticalTotal) × 100"
              description="Critical bugs escaping to production in the current PI vs. critical bugs from the previous PI."
              inputs={[['escapingCritical_current', 'Critical rows in qa_escaping for the current PI'], ['prevCriticalTotal', 'Critical rows (or all rows) in qa_escaping for the previous PI']]}
            />
          </div>

          <div style={DIVIDER} />

          <div>
            <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>QA Density Metrics (per capacity unit)</p>
            <FormulaBlock
              name="Capacity"
              formula="capacity = velocity / 2.5"
              description="Estimated team capacity in story points, derived from velocity. Velocity is read from the Velocity column of the Bug Data sheet (first row fallback: 20)."
            />
            <FormulaBlock
              name="Reopen Density"
              formula="reopenDensity = (reopenCount / capacity) × 100"
            />
            <FormulaBlock
              name="Rejected Density"
              formula="rejectedDensity = (rejectedCount / capacity) × 100"
            />
            <FormulaBlock
              name="Escaping Density"
              formula="escapingDensity = (escapingCritical / capacity) × 100"
            />
          </div>

          <div style={DIVIDER} />

          <div>
            <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>Weighted Score</p>
            <FormulaBlock
              name="Weighted Score"
              formula="weightedScore = (committedRate × D%) + (qualityIndex × Q%)"
              description="Composite score combining delivery and quality. Weights D% and Q% must sum to 100 (configured in Settings)."
              inputs={[['D%', 'Delivery weight (default 60%)'], ['Q%', 'Quality weight (default 40%)'], ['qualityIndex', '100 − max(reopenPct, rejectedPct, escapingPct)  [approximate]']]}
            />
          </div>
        </div>
      </Section>

      {/* ── Threshold Logic ─────────────────────────────────────────────── */}
      <Section icon={AlertTriangle} title="Traffic Light Threshold Logic">
        <p className="text-sm text-sigma-ice/80 mb-4">
          All KPI cards display a colored status indicator. The direction (higher-is-better vs. lower-is-better) determines which side of the threshold triggers each color.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(6,21,78,0.5)', border: '1px solid rgba(20,65,245,0.2)' }}>
            <p className="text-xs font-bold text-sigma-ice mb-2">Lower-is-better (QA defects)</p>
            <div className="space-y-1 text-xs font-mono" style={{ color: 'rgba(237,240,254,0.7)' }}>
              <div><span className="text-sigma-green">Green</span>  → value ≤ yellowThreshold</div>
              <div><span className="text-sigma-yellow">Yellow</span> → yellowThreshold &lt; value ≤ redThreshold</div>
              <div><span className="text-sigma-red">Red</span>    → value &gt; redThreshold</div>
            </div>
          </div>
          <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(6,21,78,0.5)', border: '1px solid rgba(20,65,245,0.2)' }}>
            <p className="text-xs font-bold text-sigma-ice mb-2">Higher-is-better (delivery rates)</p>
            <div className="space-y-1 text-xs font-mono" style={{ color: 'rgba(237,240,254,0.7)' }}>
              <div><span className="text-sigma-green">Green</span>  → value ≥ yellowThreshold</div>
              <div><span className="text-sigma-yellow">Yellow</span> → redThreshold ≤ value &lt; yellowThreshold</div>
              <div><span className="text-sigma-red">Red</span>    → value &lt; redThreshold</div>
            </div>
          </div>
        </div>
        <DocTable
          headers={['Metric', 'Direction', 'Default Yellow', 'Default Red']}
          rows={[
            ['Committed Rate', 'Higher better', '≥ 80%', '< 60%'],
            ['Overall Rate', 'Higher better', '≥ 80%', '< 60%'],
            ['Reopen %', 'Lower better', '≤ 5%', '> 10%'],
            ['Rejected %', 'Lower better', '≤ 5%', '> 10%'],
            ['Escaping %', 'Lower better', '≤ 3%', '> 7%'],
            ['Reopen Density', 'Lower better', '≤ 2%', '> 5%'],
            ['Rejected Density', 'Lower better', '≤ 2%', '> 5%'],
            ['Escaping Density', 'Lower better', '≤ 2%', '> 5%'],
          ]}
        />
      </Section>

      {/* ── User Roles ──────────────────────────────────────────────────── */}
      <Section icon={Users} title="User Roles & Access Control">
        <DocTable
          headers={['Feature', 'Admin', 'Management']}
          rows={[
            ['View Overview dashboard', '✓', '✓'],
            ['View Delivery dashboard', '✓', '✓'],
            ['View QA dashboard', '✓', '✓'],
            ['Drag & customise widget layout', '✓', '✓'],
            ['View System Documentation', '✓', '✗'],
            ['Access Settings page', '✓', '✗'],
            ['Change data source paths', '✓', '✗'],
            ['Edit thresholds & weights', '✓', '✗'],
            ['Manage users (create / delete)', '✓', '✗'],
            ['PI Name Mapping', '✓', '✗'],
            ['Browse folder (Windows dialog)', '✓', '✗'],
          ]}
        />
        <p className="text-xs mt-3" style={SUB}>
          Role is stored in the SQLite <span className="font-mono text-sigma-accent">users</span> table and embedded in the JWT. All admin-only routes validate the role on the server via the <span className="font-mono text-sigma-accent">requireAdmin</span> middleware.
        </p>
      </Section>

      {/* ── Settings Reference ──────────────────────────────────────────── */}
      <Section icon={ShieldCheck} title="Settings Reference" defaultOpen={false}>
        <DocTable
          headers={['Key', 'Default', 'Description']}
          rows={[
            ['excel_path', 'server/sample-data', 'Absolute path to the folder containing all 3 Excel files'],
            ['delivery_file', 'delivery.xlsx', 'Delivery workbook filename'],
            ['qa_bug_file', 'qa_bugs.xlsx', 'Bug data workbook filename'],
            ['qa_escaping_file', 'qa_escaping.xlsx', 'Escaping defect workbook filename'],
            ['delivery_weight', '60', 'Delivery component weight in Weighted Score (%)'],
            ['quality_weight', '40', 'Quality component weight in Weighted Score (%)'],
            ['commitment_yellow', '80', 'Committed Rate yellow threshold (%)'],
            ['commitment_red', '60', 'Committed Rate red threshold (%)'],
            ['reopen_yellow', '5', 'Reopen % yellow threshold'],
            ['reopen_red', '10', 'Reopen % red threshold'],
            ['rejected_yellow', '5', 'Rejected % yellow threshold'],
            ['rejected_red', '10', 'Rejected % red threshold'],
            ['escaping_yellow', '3', 'Escaping % yellow threshold'],
            ['escaping_red', '7', 'Escaping % red threshold'],
            ['reopen_density_yellow', '2', 'Reopen Density yellow threshold'],
            ['reopen_density_red', '5', 'Reopen Density red threshold'],
            ['rejected_density_yellow', '2', 'Rejected Density yellow threshold'],
            ['rejected_density_red', '5', 'Rejected Density red threshold'],
            ['escaping_density_yellow', '2', 'Escaping Density yellow threshold'],
            ['escaping_density_red', '5', 'Escaping Density red threshold'],
            ['squad_visibility', '{}', 'JSON map of squad → visible (reserved for future filtering)'],
            ['pi_name_map', '{}', 'JSON map of raw PI keys → display names, e.g. {"PI-1":"Q1 2025"}'],
          ]}
        />
      </Section>
    </div>
  );
}

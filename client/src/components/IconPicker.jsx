/**
 * IconPicker — a palette grid of predefined Lucide icons.
 *
 * Props:
 *   value    {string|null}  — currently selected icon ID (e.g. "BarChart2")
 *   onChange {(id) => void} — called with the new icon ID when user picks one
 *   size     {'sm'|'md'}    — 'sm' = 8-column compact grid, 'md' = 6-column
 */
import React from 'react';
import {
  LayoutDashboard, BarChart2, BarChart3, PieChart, TrendingUp, Activity,
  Target, Gauge, Rocket, Trophy, FileText, ClipboardList, BookOpen,
  Code, Package, Database, Users, Briefcase, Shield, Globe, Map,
  Calendar, Clock, Star, Zap, Layers, Settings, FlaskConical,
  Truck, Bug, CheckCircle2, AlertTriangle, Boxes, Flame,
} from 'lucide-react';

// ── Master icon list ──────────────────────────────────────────────────────────
export const ICON_OPTIONS = [
  { id: 'LayoutDashboard', Icon: LayoutDashboard },
  { id: 'BarChart2',       Icon: BarChart2 },
  { id: 'BarChart3',       Icon: BarChart3 },
  { id: 'PieChart',        Icon: PieChart },
  { id: 'TrendingUp',      Icon: TrendingUp },
  { id: 'Activity',        Icon: Activity },
  { id: 'Target',          Icon: Target },
  { id: 'Gauge',           Icon: Gauge },
  { id: 'Rocket',          Icon: Rocket },
  { id: 'Trophy',          Icon: Trophy },
  { id: 'Flame',           Icon: Flame },
  { id: 'Star',            Icon: Star },
  { id: 'Zap',             Icon: Zap },
  { id: 'Shield',          Icon: Shield },
  { id: 'Globe',           Icon: Globe },
  { id: 'Map',             Icon: Map },
  { id: 'Layers',          Icon: Layers },
  { id: 'Boxes',           Icon: Boxes },
  { id: 'Package',         Icon: Package },
  { id: 'Database',        Icon: Database },
  { id: 'FileText',        Icon: FileText },
  { id: 'ClipboardList',   Icon: ClipboardList },
  { id: 'BookOpen',        Icon: BookOpen },
  { id: 'Code',            Icon: Code },
  { id: 'Users',           Icon: Users },
  { id: 'Briefcase',       Icon: Briefcase },
  { id: 'Calendar',        Icon: Calendar },
  { id: 'Clock',           Icon: Clock },
  { id: 'Settings',        Icon: Settings },
  { id: 'FlaskConical',    Icon: FlaskConical },
  { id: 'Truck',           Icon: Truck },
  { id: 'Bug',             Icon: Bug },
  { id: 'CheckCircle2',    Icon: CheckCircle2 },
  { id: 'AlertTriangle',   Icon: AlertTriangle },
];

/** Resolve a Lucide icon component from a string ID. Falls back to LayoutDashboard. */
export function resolveIcon(id) {
  return ICON_OPTIONS.find(o => o.id === id)?.Icon ?? LayoutDashboard;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function IconPicker({ value, onChange, size = 'sm' }) {
  const cols = size === 'md' ? 6 : 8;
  return (
    <div
      className={`grid gap-1 p-2 rounded-lg`}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        backgroundColor: 'rgba(20,65,245,0.06)',
        border: '1px solid var(--p-card-border, rgba(20,65,245,0.18))',
      }}
    >
      {ICON_OPTIONS.map(({ id, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={id}
            className="flex items-center justify-center rounded-md transition-all"
            style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: active ? 'var(--p-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--p-text-muted, rgba(237,240,254,0.5))',
              outline: active ? '2px solid var(--p-accent)' : 'none',
              outlineOffset: '1px',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'rgba(99,130,255,0.15)';
                e.currentTarget.style.color = 'var(--p-text, #EDF0FE)';
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--p-text-muted, rgba(237,240,254,0.5))';
              }
            }}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}

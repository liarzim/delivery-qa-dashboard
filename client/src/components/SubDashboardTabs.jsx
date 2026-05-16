/**
 * SubDashboardTabs
 * Shows child sub-dashboards as a horizontal tab bar at the top of a parent
 * dashboard (Overview, Delivery, or QA).  When a tab is active, it navigates
 * to the corresponding /sub/:id route; clicking the parent label navigates back
 * to the parent route.
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { store } from '../lib/store';
import { useLanguage } from '../context/LanguageContext';

export default function SubDashboardTabs({ parentId, parentPath, parentLabel }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const children = store.get('sub_dashboards', []).filter(d => d.parentId === parentId);
  if (children.length === 0) return null;

  const isParentActive = location.pathname === parentPath;

  return (
    <div
      className="flex items-center gap-1 mb-5 border-b"
      style={{ borderColor: 'rgba(20,65,245,0.2)' }}
    >
      {/* Parent tab */}
      <button
        onClick={() => navigate(parentPath)}
        className="relative pb-2.5 pt-1 px-4 text-sm font-medium transition-colors shrink-0"
        style={{
          color: isParentActive ? 'var(--p-accent)' : 'rgba(237,240,254,0.5)',
          borderBottom: isParentActive ? '2px solid var(--p-accent)' : '2px solid transparent',
          marginBottom: '-1px',
        }}
      >
        {parentLabel}
      </button>

      {/* Child tabs */}
      {children.map(d => {
        const label = lang === 'he' && d.name_he ? d.name_he : d.name_en;
        const path  = `/sub/${d.id}`;
        const isActive = location.pathname === path;
        return (
          <button
            key={d.id}
            onClick={() => navigate(path)}
            className="relative pb-2.5 pt-1 px-4 text-sm font-medium transition-colors shrink-0"
            style={{
              color: isActive ? 'var(--p-accent)' : 'rgba(237,240,254,0.5)',
              borderBottom: isActive ? '2px solid var(--p-accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

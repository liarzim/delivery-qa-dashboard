/**
 * AppShell — outer layout shell: sidebar + main content area.
 *
 * RTL: every direction is expressed with logical CSS properties
 * (border-inline-end, padding-inline-start, margin-inline-start, etc.) so the
 * sidebar correctly docks to the right side when dir="rtl" is active —
 * no JS conditionals needed.
 */
import React, { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useData } from '../context/DataContext';
import { useEditMode } from '../context/EditModeContext';
import { store } from '../lib/store';
import { resolveIcon } from './IconPicker';
import AddSubDashModal from './AddSubDashModal';
import {
  LayoutDashboard, Truck, Bug, Settings, LogOut,
  BarChart3, BookOpen, SlidersHorizontal,
  Globe, Layers, FlaskConical, RefreshCw, Menu, ChevronDown,
  Wrench, Plus, Pencil,
} from 'lucide-react';

// ── Nav link class helpers (logical-CSS only) ─────────────────────────────────
const navLinkClass = isActive =>
  `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'text-sigma-accent' : 'text-sigma-ice/60 hover:text-sigma-ice'
  }`;

const navLinkStyle = isActive => ({
  backgroundColor: isActive ? 'var(--p-nav-active)' : 'transparent',
});

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ to, label, icon: Icon, end, collapsed, indent = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => navLinkClass(isActive)}
      style={({ isActive }) => ({
        ...navLinkStyle(isActive),
        // Use paddingInlineStart so indentation flips in RTL automatically
        paddingInlineStart: indent ? (collapsed ? '10px' : '24px') : undefined,
      })}
    >
      <Icon size={indent ? 15 : 18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

// ── SidebarButton (non-link action) ──────────────────────────────────────────
function SidebarButton({ onClick, icon: Icon, label, collapsed, active }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        color: active ? 'var(--p-accent)' : 'var(--p-text-muted, rgba(237,240,254,0.6))',
        backgroundColor: active ? 'var(--p-nav-active)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'var(--p-nav-hover)';
          e.currentTarget.style.color = 'var(--p-text, #EDF0FE)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = active ? 'var(--p-nav-active)' : '';
        e.currentTarget.style.color = active ? 'var(--p-accent)' : 'var(--p-text-muted, rgba(237,240,254,0.6))';
      }}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

// ── SubGroup — collapsible group of child sub-dashboards ──────────────────────
function SubGroup({ parentLabel, parentTo, children, collapsed, lang }) {
  const location = useLocation();
  const isAnyChildActive = children.some(d => location.pathname === `/sub/${d.id}`);
  const [open, setOpen] = useState(isAnyChildActive);

  if (collapsed) {
    return (
      <>
        {children.map(d => {
          const label = lang === 'he' && d.name_he ? d.name_he : d.name_en;
          const Icon  = resolveIcon(d.icon);
          return <NavItem key={d.id} to={`/sub/${d.id}`} label={label} icon={Icon} collapsed={collapsed} />;
        })}
      </>
    );
  }

  return (
    <div>
      {/* Group header — parent label navigates; chevron toggles children */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
        style={{ color: 'var(--p-text-muted, rgba(237,240,254,0.5))' }}>
        <NavLink
          to={parentTo}
          end
          className={({ isActive }) =>
            `flex-1 flex items-center gap-2 text-xs font-semibold truncate transition-colors ${isActive ? 'text-sigma-accent' : ''}`
          }
          style={({ isActive }) => ({ color: isActive ? 'var(--p-accent)' : 'var(--p-text-muted, rgba(237,240,254,0.5))' })}
        >
          <span>{parentLabel}</span>
        </NavLink>
        <button
          onClick={() => setOpen(o => !o)}
          className="p-0.5 rounded transition-colors hover:text-sigma-ice"
          title={open ? 'Collapse' : 'Expand'}
        >
          <ChevronDown
            size={13}
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
          />
        </button>
      </div>

      {open && (
        /* Use logical border-inline-start + padding-inline-start so it mirrors in RTL */
        <div
          className="ms-2 ps-2"
          style={{ borderInlineStart: '1px solid var(--p-card-border, rgba(20,65,245,0.25))' }}
        >
          {children.map(d => {
            const label = lang === 'he' && d.name_he ? d.name_he : d.name_en;
            const Icon  = resolveIcon(d.icon);
            return <NavItem key={d.id} to={`/sub/${d.id}`} label={label} icon={Icon} collapsed={false} indent />;
          })}
        </div>
      )}
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell() {
  const { user, logout }                   = useAuth();
  const { t, toggleLang, lang }            = useLanguage();
  const { isOpen: bankOpen, toggle: toggleBank } = useWidgetBank();
  const { openLoader }                     = useData();
  const { editMode, toggleEditMode }       = useEditMode();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [collapsed, setCollapsed]   = useState(false);
  const [showModal, setShowModal]   = useState(false);

  // Sub-dashboards — live state so the sidebar reacts to additions
  const [subDashes, setSubDashes] = useState(() => store.get('sub_dashboards', []));

  const handleSubCreated = useCallback(() => {
    // Re-read from localStorage after the modal saves
    setSubDashes(store.get('sub_dashboards', []));
  }, []);

  // Group sub-dashboards by parentId
  const standaloneSubDashes = subDashes.filter(d => !d.parentId);
  const overviewChildren    = subDashes.filter(d => d.parentId === 'overview');
  const deliveryChildren    = subDashes.filter(d => d.parentId === 'delivery');
  const qaChildren          = subDashes.filter(d => d.parentId === 'qa');

  const handleLogout = () => { logout(); navigate('/login'); };
  // Show bank button on all main dashboard pages (not on settings/admin/builder pages)
  const NON_DASHBOARD_PATHS = ['/settings', '/preferences', '/widget-builder', '/system-docs', '/formula-verify', '/login'];
  const showBankButton = !NON_DASHBOARD_PATHS.some(p => location.pathname.startsWith(p));

  // ── Section label used inside nav ─────────────────────────────────────────
  const SectionLabel = ({ label }) =>
    !collapsed ? (
      <div className="px-2.5 pt-4 pb-1 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--p-text-faint, rgba(237,240,254,0.25))' }}>
          {label}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: 'var(--p-text-faint, rgba(237,240,254,0.3))' }}
          title={t('sub_modal_title')}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--p-nav-hover)'; e.currentTarget.style.color = 'var(--p-accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--p-text-faint, rgba(237,240,254,0.3))'; }}
        >
          <Plus size={13} />
        </button>
      </div>
    ) : null;

  return (
    <>
      {/* Quick-create modal */}
      {showModal && (
        <AddSubDashModal
          onClose={() => setShowModal(false)}
          onCreated={handleSubCreated}
        />
      )}

      {/*
        ── Root layout ────────────────────────────────────────────────────────
        Use `flex` only — direction is controlled entirely by dir="rtl" on <html>,
        which causes the first flex child (sidebar) to appear on the right in RTL.
        NO JS flex-direction conditional needed.
      */}
      <div className="h-screen overflow-hidden flex">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside
          className={`${collapsed ? 'w-16' : 'w-56'} flex flex-col transition-all duration-200 shrink-0 overflow-y-auto`}
          style={{
            background: 'var(--p-sidebar-bg, rgba(255,255,255,0.055))',
            backdropFilter: 'blur(16px)',
            /* Logical border: sits between sidebar and content in both LTR and RTL */
            borderInlineEnd: '1px solid var(--p-sidebar-border)',
          }}
        >
          {/* Logo + hamburger */}
          <div
            className="h-16 flex items-center px-3 gap-2 shrink-0"
            style={{ borderBottom: '1px solid var(--p-sidebar-border)' }}
          >
            <button
              onClick={() => setCollapsed(c => !c)}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ color: 'var(--p-accent)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--p-nav-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title={collapsed ? t('nav_expand') : t('nav_collapse')}
            >
              <Menu size={18} />
            </button>

            {!collapsed && (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--p-accent)' }}
                >
                  <BarChart3 size={14} className="text-white" />
                </div>
                <span className="font-semibold text-xs text-sigma-ice truncate">
                  {t('header_title')}
                </span>
              </>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">

            {/* ── DASHBOARDS section ── */}
            <SectionLabel label={t('nav_dashboards')} />

            {/* Overview — with optional sub-dashes */}
            {overviewChildren.length > 0 ? (
              <SubGroup parentLabel={t('nav_overview')} parentTo="/" children={overviewChildren} collapsed={collapsed} lang={lang} />
            ) : (
              <NavItem to="/" label={t('nav_overview')} icon={LayoutDashboard} end collapsed={collapsed} />
            )}

            {/* Delivery */}
            {deliveryChildren.length > 0 ? (
              <SubGroup parentLabel={t('nav_delivery')} parentTo="/delivery" children={deliveryChildren} collapsed={collapsed} lang={lang} />
            ) : (
              <NavItem to="/delivery" label={t('nav_delivery')} icon={Truck} collapsed={collapsed} />
            )}

            {/* QA */}
            {qaChildren.length > 0 ? (
              <SubGroup parentLabel={t('nav_qa')} parentTo="/qa" children={qaChildren} collapsed={collapsed} lang={lang} />
            ) : (
              <NavItem to="/qa" label={t('nav_qa')} icon={Bug} collapsed={collapsed} />
            )}

            {/* Widget bank toggle — only in sidebar on overview/sub-dash pages */}
            {showBankButton && (
              <SidebarButton onClick={toggleBank} icon={Layers} label={t('overview_widgets')} collapsed={collapsed} active={bankOpen} />
            )}

            {/* Widget Builder */}
            <NavItem to="/widget-builder" label={t('nav_widget_builder')} icon={Wrench} collapsed={collapsed} />

            {/* ── Standalone sub-dashboards (no parent) ── */}
            {standaloneSubDashes.length > 0 && (
              <>
                {!collapsed && (
                  <div className="px-2.5 pt-3 pb-1">
                    <p className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--p-text-faint, rgba(237,240,254,0.25))' }}>
                      {t('settings_sub_dashboards')}
                    </p>
                  </div>
                )}
                {standaloneSubDashes.map(d => {
                  const label = lang === 'he' && d.name_he ? d.name_he : d.name_en;
                  const Icon  = resolveIcon(d.icon);
                  return <NavItem key={d.id} to={`/sub/${d.id}`} label={label} icon={Icon} collapsed={collapsed} />;
                })}
              </>
            )}

            {/* ── Admin section ── */}
            {user?.role === 'Admin' && (
              <>
                {!collapsed && (
                  <div className="px-2.5 pt-4 pb-1">
                    <p className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--p-text-faint, rgba(237,240,254,0.25))' }}>
                      Admin
                    </p>
                  </div>
                )}
                <NavItem to="/system-docs"    label={t('nav_system_docs')}    icon={BookOpen}     collapsed={collapsed} />
                <NavItem to="/settings"       label={t('nav_settings')}       icon={Settings}     collapsed={collapsed} />
                <NavItem to="/formula-verify" label={t('nav_formula_verify')} icon={FlaskConical} collapsed={collapsed} />
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid var(--p-sidebar-border)' }}>
            {!collapsed && (
              <div className="px-2 py-1.5 mb-1">
                <p className="text-xs font-semibold text-sigma-ice truncate">{user?.username}</p>
                <span className={`text-xs ${user?.role === 'Admin' ? 'text-sigma-accent' : ''}`}
                  style={{ color: user?.role === 'Admin' ? 'var(--p-accent)' : 'var(--p-text-muted)' }}>
                  {user?.role}
                </span>
              </div>
            )}

            <NavItem to="/preferences" label={t('nav_preferences')} icon={SlidersHorizontal} collapsed={collapsed} />

            <SidebarButton
              onClick={toggleLang}
              icon={Globe}
              label={lang === 'en' ? 'EN → עב' : 'עב → EN'}
              collapsed={collapsed}
              active={false}
            />

            <SidebarButton
              onClick={openLoader}
              icon={RefreshCw}
              label={t('reload_data') || 'Reload Data'}
              collapsed={collapsed}
              active={false}
            />

            {user?.role === 'Admin' && (
              <SidebarButton
                onClick={toggleEditMode}
                icon={Pencil}
                label={editMode ? 'Exit Edit Mode' : 'Edit Titles'}
                collapsed={collapsed}
                active={editMode}
              />
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--p-text-muted, rgba(237,240,254,0.5))' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--p-text-muted, rgba(237,240,254,0.5))'; }}
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && t('nav_sign_out')}
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header
            className="h-16 flex items-center px-6 gap-4 shrink-0"
            style={{
              borderBottom: '1px solid var(--p-sidebar-border)',
              backgroundColor: 'var(--p-header-bg)',
            }}
          >
            <h1 className="text-sm font-medium" style={{ color: 'var(--p-text-muted)' }}>
              {t('header_title')}
            </h1>
            <div className="ms-auto flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--p-text-faint)' }}>
                {t('last_updated')} {new Date().toLocaleTimeString()}
              </span>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}

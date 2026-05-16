import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, PALETTES, CUSTOM_COLOR_DEFAULTS } from '../context/ThemeContext';
import SectionHeader from '../components/SectionHeader';
import { Check, Globe, Palette, Sliders } from 'lucide-react';

const cardStyle = {
  backgroundColor: 'var(--p-card-bg)',
  border: '1px solid var(--p-card-border)',
  borderRadius: '12px',
  padding: '20px',
};

// ── Preset palette card ───────────────────────────────────────────────────────
function PaletteCard({ palette, isActive, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isActive ? 'var(--p-accent)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'start',
        position: 'relative',
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute', top: 8, insetInlineEnd: 8,
          width: 20, height: 20, borderRadius: '50%',
          backgroundColor: 'var(--p-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={12} color="#fff" />
        </div>
      )}
      {/* Swatches — for 'custom' show a rainbow gradient preview */}
      {palette.id === 'custom' ? (
        <div style={{
          width: '100%', height: 28, borderRadius: 6, marginBottom: 12,
          background: 'linear-gradient(90deg,#f36059,#f9bd33,#54e075,#27dbe4,#7c3aed)',
        }} />
      ) : (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {palette.preview.map((color, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: color, boxShadow: `0 2px 8px ${color}55`,
            }} />
          ))}
        </div>
      )}
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#EDF0FE' }}>{label}</p>
    </button>
  );
}

// ── Single color-picker row ───────────────────────────────────────────────────
function ColorRow({ label, desc, colorKey, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <label
        htmlFor={`cp-${colorKey}`}
        style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          backgroundColor: value,
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: `0 0 14px ${value}66`,
          transition: 'box-shadow 0.2s',
        }} />
        {/* native color input is invisible but positioned over the swatch */}
        <input
          id={`cp-${colorKey}`}
          type="color"
          value={value}
          onChange={e => onChange(colorKey, e.target.value)}
          style={{
            position: 'absolute', inset: 0,
            opacity: 0, width: '100%', height: '100%',
            cursor: 'pointer', border: 'none', padding: 0,
          }}
        />
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#EDF0FE' }}>{label}</p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(237,240,254,0.45)', marginTop: 2 }}>{desc}</p>
      </div>
      <code style={{
        fontSize: '0.7rem', fontFamily: 'monospace',
        color: 'rgba(237,240,254,0.5)',
        background: 'rgba(255,255,255,0.07)',
        padding: '3px 7px', borderRadius: 5,
      }}>
        {value.toUpperCase()}
      </code>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PreferencesPage() {
  const { lang, toggleLang, t } = useLanguage();
  const { palette, setPalette, customColors, setCustomColors } = useTheme();

  // Local draft — only committed on "Apply"
  const [draft, setDraft] = useState(customColors);

  const handleColorChange = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

  const applyCustom = () => setCustomColors(draft);

  const resetDraft = () => {
    setDraft(CUSTOM_COLOR_DEFAULTS);
    setCustomColors(CUSTOM_COLOR_DEFAULTS);
  };

  const COLOR_FIELDS = [
    { key: 'primary',    label: t('prefs_color_primary'),    desc: t('prefs_color_primary_desc') },
    { key: 'secondary',  label: t('prefs_color_secondary'),  desc: t('prefs_color_secondary_desc') },
    { key: 'background', label: t('prefs_color_background'), desc: t('prefs_color_background_desc') },
    { key: 'success',    label: t('prefs_color_success'),    desc: t('prefs_color_success_desc') },
    { key: 'warning',    label: t('prefs_color_warning'),    desc: t('prefs_color_warning_desc') },
    { key: 'danger',     label: t('prefs_color_danger'),     desc: t('prefs_color_danger_desc') },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeader title={t('prefs_title')} subtitle={t('prefs_subtitle')} />

      {/* ── Language ─────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-5">
          <Globe size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EDF0FE' }}>{t('prefs_language')}</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'rgba(237,240,254,0.55)' }}>{t('prefs_language_desc')}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ code: 'en', label: 'English', flag: '🇺🇸' }, { code: 'he', label: 'עברית', flag: '🇮🇱' }].map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => { if (lang !== code) toggleLang(); }}
              style={{
                background: lang === code ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${lang === code ? 'var(--p-accent)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {lang === code && (
                <div style={{
                  position: 'absolute', top: 6, insetInlineEnd: 6,
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: 'var(--p-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={9} color="#fff" />
                </div>
              )}
              <span style={{ fontSize: '1.25rem' }}>{flag}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#EDF0FE' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Color Palette ────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-5">
          <Palette size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EDF0FE' }}>{t('prefs_color_palette')}</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: 'rgba(237,240,254,0.55)' }}>{t('prefs_palette_desc')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {PALETTES.map((p) => (
            <PaletteCard
              key={p.id}
              palette={p}
              isActive={palette === p.id}
              onClick={() => {
                if (p.id === 'custom') { applyCustom(); }
                setPalette(p.id);
              }}
              label={t(p.labelKey)}
            />
          ))}
        </div>
      </div>

      {/* ── Custom Color Editor ──────────────────────────────────────────── */}
      <div style={{ ...cardStyle, border: palette === 'custom' ? '1px solid var(--p-accent)' : '1px solid rgba(20,65,245,0.25)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Sliders size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EDF0FE' }}>{t('prefs_custom_palette')}</h3>
          {palette === 'custom' && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
              backgroundColor: 'var(--p-accent)', color: '#fff',
              padding: '2px 8px', borderRadius: 99, marginInlineStart: 4,
            }}>ACTIVE</span>
          )}
        </div>
        <p className="text-sm mb-5" style={{ color: 'rgba(237,240,254,0.55)' }}>{t('prefs_custom_palette_desc')}</p>

        <div>
          {COLOR_FIELDS.map(({ key, label, desc }) => (
            <ColorRow
              key={key}
              colorKey={key}
              label={label}
              desc={desc}
              value={draft[key] || CUSTOM_COLOR_DEFAULTS[key]}
              onChange={handleColorChange}
            />
          ))}
        </div>

        {/* Live mini-preview */}
        <div style={{
          marginTop: 20, padding: 16, borderRadius: 10,
          background: draft.background,
          border: `1px solid ${draft.primary}55`,
        }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(237,240,254,0.4)', marginBottom: 10 }}>
            {t('prefs_preview')}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: draft.primary, color: '#fff',
              padding: '4px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600,
            }}>Primary</span>
            <span style={{
              backgroundColor: draft.secondary, color: '#fff',
              padding: '4px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600,
            }}>Secondary</span>
            <span style={{
              backgroundColor: draft.success, color: '#fff',
              padding: '4px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600,
            }}>✓ Good</span>
            <span style={{
              backgroundColor: draft.warning, color: '#fff',
              padding: '4px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600,
            }}>⚠ Warn</span>
            <span style={{
              backgroundColor: draft.danger, color: '#fff',
              padding: '4px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600,
            }}>✕ Risk</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={applyCustom}
            className="btn-primary text-sm"
            style={{ flex: 1 }}
          >
            {t('prefs_apply_custom')}
          </button>
          <button
            onClick={resetDraft}
            className="btn-secondary text-sm"
          >
            {t('reset')}
          </button>
        </div>
      </div>
    </div>
  );
}

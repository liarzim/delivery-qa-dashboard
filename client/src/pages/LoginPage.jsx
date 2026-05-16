import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Eye, EyeOff, AlertCircle, Globe } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, toggleLang, lang } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || t('error_login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ color: 'rgba(237,240,254,0.5)', border: '1px solid rgba(120,150,255,0.2)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
          >
            <Globe size={13} />
            {lang === 'en' ? 'עברית' : 'English'}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--p-accent)', boxShadow: '0 8px 32px var(--p-accent-shadow)' }}
          >
            <BarChart3 size={30} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-sigma-ice">{t('login_title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(237,240,254,0.5)' }}>{t('login_subtitle')}</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ backgroundColor: 'rgba(243,96,89,0.12)', border: '1px solid rgba(243,96,89,0.3)', color: '#F36059' }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(237,240,254,0.6)' }}>
              {t('login_username')}
            </label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="sigma-input"
              placeholder={t('login_username_placeholder')}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(237,240,254,0.6)' }}>
              {t('login_password')}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="sigma-input pr-10"
                placeholder={t('login_password_placeholder')}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(237,240,254,0.4)' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? t('login_signing_in') : t('login_submit')}
          </button>
        </form>

      </div>
    </div>
  );
}

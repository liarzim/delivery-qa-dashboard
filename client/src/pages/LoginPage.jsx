import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Globe } from 'lucide-react';

// GitHub SVG mark (official icon)
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { toggleLang, lang } = useLanguage();

  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ color: 'rgba(237,240,254,0.5)', border: '1px solid rgba(120,150,255,0.2)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            <Globe size={13} />
            {lang === 'en' ? 'עברית' : 'English'}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--p-accent)', boxShadow: '0 8px 32px var(--p-accent-shadow)' }}>
            <BarChart3 size={30} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-sigma-ice">QA & Delivery Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(237,240,254,0.5)' }}>Sign in to your account</p>
        </div>

        <div className="card flex flex-col items-center gap-4 py-6">
          {!clientId ? (
            <div className="text-center text-sm" style={{ color: 'rgba(237,240,254,0.5)' }}>
              <p className="mb-1 font-semibold" style={{ color: '#F9BD33' }}>GitHub OAuth not configured</p>
              <p className="text-xs leading-relaxed">
                Set <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(20,65,245,0.2)' }}>VITE_GITHUB_CLIENT_ID</code>
                {' '}in your Netlify environment variables.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-center" style={{ color: 'rgba(237,240,254,0.5)' }}>
                Sign in with your GitHub account to access the dashboard.
              </p>
              <button
                onClick={login}
                className="flex items-center justify-center gap-3 w-full py-3 px-5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  backgroundColor: '#24292e',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#3a3f45'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#24292e'}
              >
                <GitHubIcon />
                Sign in with GitHub
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

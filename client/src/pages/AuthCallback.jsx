/**
 * AuthCallback — handles the GitHub OAuth redirect.
 * GitHub sends ?code=... here after the user authorises the app.
 * We exchange the code for an access token via our Netlify function,
 * then load the GitHub user profile and redirect to the dashboard.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3 } from 'lucide-react';

export default function AuthCallback() {
  const { handleToken } = useAuth();
  const navigate        = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');

    if (!code) {
      setError('No OAuth code received from GitHub.');
      return;
    }

    (async () => {
      try {
        // Exchange code for access token via Netlify function
        const res = await fetch('/.netlify/functions/github-oauth', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code }),
        });
        const data = await res.json();

        if (data.error || !data.access_token) {
          throw new Error(data.error_description || data.error || 'Token exchange failed');
        }

        await handleToken(data.access_token);
        navigate('/', { replace: true });
      } catch (e) {
        setError(e.message || 'Login failed. Please try again.');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--p-accent)', boxShadow: '0 8px 32px var(--p-accent-shadow)' }}>
        <BarChart3 size={26} className="text-white" />
      </div>

      {error ? (
        <div className="text-center">
          <p className="text-sm font-semibold mb-1" style={{ color: '#F36059' }}>{error}</p>
          <button onClick={() => navigate('/login')}
            className="text-xs mt-2 underline" style={{ color: 'rgba(237,240,254,0.5)' }}>
            Back to login
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(237,240,254,0.6)' }}>
          <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          Completing sign in…
        </div>
      )}
    </div>
  );
}

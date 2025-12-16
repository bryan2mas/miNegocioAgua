import React, { useEffect, useState } from 'react';

// Simple toast system using window events to avoid adding a provider
export function notifyToast(message, type = 'info', duration = 3000, action = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { id: Date.now(), message, type, duration, action } }));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const handler = (e) => {
      const t0 = e.detail;
      const duration = t0.duration || 3000;
      const t = { ...t0, duration, endsAt: Date.now() + duration };
      setToasts((s) => [...s, t]);
      setTimeout(() => {
        setToasts((s) => s.filter(i => i.id !== t.id));
      }, duration);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ position: 'fixed', right: '1rem', bottom: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {toasts.map(t => {
        const remainingMs = Math.max(0, t.endsAt - now);
        const pct = t.duration ? Math.max(0, Math.min(100, (remainingMs / t.duration) * 100)) : 0;
        const remainingSec = Math.ceil(remainingMs / 1000);
        return (
          <div key={t.id} style={{ minWidth: '12rem', padding: '0.5rem', borderRadius: '0.5rem', background: t.type === 'error' ? '#fee2e2' : '#eef2ff', color: t.type === 'error' ? '#991b1b' : '#1e3a8a', boxShadow: '0 6px 20px rgba(2,6,23,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>{t.message}</div>
              {t.action && (
                <button onClick={() => {
                  try { t.action.onClick && t.action.onClick(); } catch (err) { console.error(err); }
                  setToasts((s) => s.filter(i => i.id !== t.id));
                }} style={{ marginLeft: '0.5rem', background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: '700' }}>{t.action.label}</button>
              )}
            </div>
            <div style={{ height: 6, background: '#ffffff44', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#0369a1', transition: 'width 200ms linear' }} />
            </div>
            {t.action && <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#475569', marginTop: 6 }}>{remainingSec}s</div>}
          </div>
        );
      })}
    </div>
  );
}

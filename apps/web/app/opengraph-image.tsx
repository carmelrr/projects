import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Owl Performance — Coaching that scales with you';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'radial-gradient(60% 50% at 20% 0%, rgba(139,107,255,0.35), transparent 60%), radial-gradient(40% 40% at 90% 20%, rgba(255,181,71,0.25), transparent 60%), linear-gradient(135deg, #1a0f45 0%, #120a33 100%)',
          color: 'white',
          fontFamily: 'Inter, system-ui',
        }}
      >
        {/* Header: mark + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="64" height="64" viewBox="0 0 40 40">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#a78bff" />
                <stop offset="1" stopColor="#4e35c6" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="34" height="34" rx="10" fill="url(#g)" />
            <path d="M11 9 L15 14 L8 12 Z" fill="#e6dfff" />
            <path d="M29 9 L25 14 L32 12 Z" fill="#e6dfff" />
            <circle cx="14.5" cy="19" r="4.2" fill="white" />
            <circle cx="25.5" cy="19" r="4.2" fill="white" />
            <circle cx="14.5" cy="19.4" r="2" fill="#1d1348" />
            <circle cx="25.5" cy="19.4" r="2" fill="#1d1348" />
            <path d="M20 22.5 L22 26 L18 26 Z" fill="#ffb547" />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>
            Owl Performance
          </span>
        </div>

        {/* Main copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>
          <span
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 18,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            Coaching OS
          </span>
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            The coaching platform that watches over every client.
          </div>
          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.65)', maxWidth: 840 }}>
            Programs, check-ins, metrics and messaging — in one calm, focused workspace.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 20,
          }}
        >
          <span>owlperformance.app</span>
          <span>Start free · No credit card</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

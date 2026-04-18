import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'OWL Performance — Coaching that scales with you';

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), 'public/images/op-logo.png'));
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

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
        {/* Header: logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={logoBase64} width="64" height="64" style={{ borderRadius: 12 }} />
          <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>
            OWL Performance
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

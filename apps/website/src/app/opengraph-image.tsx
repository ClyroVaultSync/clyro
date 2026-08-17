import { ImageResponse } from 'next/og';
import { siteConfig } from '../lib/site-config';

/**
 * Generated at build time rather than shipped as a binary asset, so the card
 * can't drift out of sync with the site's copy and colours the way a hand-made
 * PNG would. Palette matches the tokens in globals.css.
 */
/** Required: ImageResponse's default font loading fails under the Node runtime
 * during static prerender ("Invalid URL"), so this route is rendered on demand. */
export const runtime = 'edge';
export const alt = 'Clyro — a local-first, zero-knowledge password manager';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#120d0c',
          color: '#f5f3f1'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '48px'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '20px',
              backgroundColor: '#8b5cf6',
              color: '#120d0c',
              fontSize: '48px',
              fontWeight: 700
            }}
          >
            C
          </div>
          <div style={{ fontSize: '52px', fontWeight: 700, letterSpacing: '-0.02em' }}>Clyro</div>
        </div>

        <div style={{ fontSize: '60px', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
          Your passwords, stored where you choose.
        </div>

        <div style={{ marginTop: '32px', fontSize: '30px', color: '#a39c97', lineHeight: 1.4 }}>
          {siteConfig.description}
        </div>
      </div>
    ),
    size
  );
}

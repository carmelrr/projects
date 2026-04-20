import type { Metadata } from 'next';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { BrandWatermark } from '@/components/brand/BrandWatermark';
import { MarketingNav } from './_components/MarketingNav';
import { MarketingFooter } from './_components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Owl Performance — Coaching that scales with you',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Fixed logo watermark — sits between body bg and content */}
      <BrandWatermark />

      <div className="relative z-[2] flex min-h-screen flex-col">
        <MarketingNav />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
      <noscript>
        <div className="p-4 text-center">
          <OwlLogo />
        </div>
      </noscript>
    </div>
  );
}

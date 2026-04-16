import type { Metadata } from 'next';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { MarketingNav } from './_components/MarketingNav';
import { MarketingFooter } from './_components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Owl Performance — Coaching that scales with you',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <noscript>
        <div className="p-4 text-center">
          <OwlLogo />
        </div>
      </noscript>
    </div>
  );
}

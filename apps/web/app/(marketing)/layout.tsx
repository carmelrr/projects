import type { Metadata } from 'next';
import Image from 'next/image';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { MarketingNav } from './_components/MarketingNav';
import { MarketingFooter } from './_components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Owl Performance — Coaching that scales with you',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Fixed logo watermark — sits between body bg and content */}
      <div className="pointer-events-none fixed inset-0 z-[1] flex items-center justify-center" aria-hidden="true">
        <Image
          src="/images/op-logo-transparent.png"
          alt=""
          width={800}
          height={800}
          className="size-[60vmin] max-w-[800px] opacity-[0.04] blur-[2px] dark:invert dark:opacity-[0.06]"
          priority
        />
      </div>

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

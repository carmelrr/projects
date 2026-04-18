import './globals.css';
import { Inter, Heebo, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { getDictionary, getLocale } from '@/lib/i18n/server';
import { dirOf } from '@/lib/i18n/config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  title: 'OWL Performance — Coaching that scales with you',
  description: 'The coaching platform that watches over every client.',
  icons: {
    icon: '/icon.png',
    apple: '/images/apple-touch-icon.png',
  },
  openGraph: {
    title: 'OWL Performance — Coaching that scales with you',
    description: 'The coaching platform that watches over every client.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OWL Performance',
    description: 'The coaching platform that watches over every client.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const dir = dirOf(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${heebo.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <Providers locale={locale} dict={dict}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

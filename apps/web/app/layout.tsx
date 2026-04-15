import './globals.css';
import { Providers } from '@/components/providers';

export const metadata = {
  title: 'Coaching App',
  description: 'Online coaching platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

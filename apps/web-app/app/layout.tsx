import type { Metadata } from 'next';
import { LegalDisclaimer } from '@/components/legal/LegalDisclaimer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alchemist',
  description: 'Alchemist — prompt → triad → Serum preset',
  openGraph: {
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <body className="relative flex min-h-screen flex-col bg-brand-bg text-gray-100 antialiased">
        <div className="flex-1">{children}</div>
        <LegalDisclaimer />
      </body>
    </html>
  );
}

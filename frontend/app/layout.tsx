import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Polymarket Mini - Farcaster',
  description: 'Trade prediction markets on Farcaster',
  openGraph: {
    title: 'Polymarket Mini',
    description: 'Trade prediction markets on Farcaster',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CryptoPredict - 15-Min Crypto Predictions',
  description: 'Predict BTC, ETH, SOL, XRP prices every 15 minutes on Farcaster',
  openGraph: {
    title: 'CryptoPredict',
    description: 'Predict crypto prices every 15 minutes. BTC • ETH • SOL • XRP',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
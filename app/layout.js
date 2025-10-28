import './globals.css';

export const metadata = {
  title: 'Polymarket Farcaster MiniApp',
  description: 'Trade on Polymarket via Farcaster',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


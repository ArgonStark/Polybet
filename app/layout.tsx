import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PrivyProvider } from '@privy-io/react-auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PolyBet - Farcaster Trading',
  description: 'Trade on Polymarket directly from Farcaster',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyProvider
          appId={privyAppId}
          config={{
            loginMethods: ['wallet', 'farcaster'],
            appearance: {
              theme: 'light',
              accentColor: '#671AE4',
            },
            embeddedWallets: {
              createOnLogin: 'all-users',
            },
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  )
}


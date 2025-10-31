'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { useState } from 'react';

// Configure Wagmi for Polygon
export const config = createConfig({
  chains: [polygon],
  connectors: [
    injected(),
    // Optional: Add WalletConnect
    // walletConnect({ projectId: 'YOUR_PROJECT_ID' }),
  ],
  transports: {
    [polygon.id]: http('https://polygon-rpc.com'),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
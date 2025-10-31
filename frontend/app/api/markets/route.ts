import { NextResponse } from 'next/server';
import { ClobClient } from '@polymarket/clob-client';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon

export async function GET() {
  try {
    console.log('[Markets API] Fetching markets using CLOB client...');

    // Create CLOB client (no auth needed for public data)
    // Parameters: host, chainId, signer (optional), creds (optional)
    const client = new ClobClient(HOST, CHAIN_ID);

    // Fetch simplified markets (returns {data: market[], next_cursor: string})
    const response = await client.getSimplifiedMarkets();

    console.log('[Markets API] Successfully fetched markets');

    // Return just the data array
    return NextResponse.json(response.data || [], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[Markets API] Exception:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch markets', details: String(error) },
      { status: 500 }
    );
  }
}

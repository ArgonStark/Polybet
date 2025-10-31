import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const closed = searchParams.get('closed') || 'false';
    const active = searchParams.get('active') || 'true';

    const url = `${GAMMA_API_URL}/events?limit=${limit}&offset=${offset}&closed=${closed}&active=${active}`;

    console.log('Fetching events from:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PolyBet/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Gamma API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Gamma API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

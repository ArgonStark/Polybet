import axios from 'axios';

// Use our Next.js API routes to avoid CORS issues
const API_BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

// SimplifiedMarket interface from CLOB client
export interface SimplifiedMarket {
  id: string; // condition_id
  question: string;
  end_date_iso: string;
  game_start_time?: string;
  market_slug?: string;
  min_incentive_size?: number;
  max_incentive_spread?: number;
  description?: string;
  outcomes?: string[];
  outcomePrices?: string[];
  volume?: string;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  new?: boolean;
  featured?: boolean;
  slug?: string;
}

export interface Market {
  condition_id: string;
  question_id: string;
  tokens: Token[];
  rewards: any;
  minimum_order_size: number;
  minimum_tick_size: number;
  description: string;
  category: string;
  end_date_iso: string;
  game_start_time: string;
  question: string;
  market_slug: string;
  min_incentive_size: number;
  max_incentive_spread: number;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  submitted_by: string;
  slug?: string;
}

export interface Token {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export interface MarketData {
  slug: string;
  crypto: 'BTC' | 'ETH' | 'SOL' | 'XRP';
  question: string;
  tokens: Token[];
  endTime: string;
  active: boolean;
}

/**
 * Fetch markets from Polymarket via our API route (uses CLOB client)
 */
export async function fetchMarkets(): Promise<SimplifiedMarket[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/markets`);
    return response.data;
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw error;
  }
}

/**
 * Fetch a specific market by condition_id
 */
export async function fetchMarketByConditionId(conditionId: string): Promise<SimplifiedMarket | null> {
  try {
    // Fetch all markets and filter
    const markets = await fetchMarkets();
    const market = markets.find(m => m.id === conditionId);
    return market || null;
  } catch (error) {
    console.error('Error fetching market:', error);
    throw error;
  }
}

/**
 * Search for crypto 15-minute up/down markets
 * These markets typically have slugs containing the crypto symbol and "updown"
 */
export async function fetchCrypto15MinMarkets(): Promise<MarketData[]> {
  try {
    console.log('🔍 Fetching crypto 15-minute markets...');

    // Fetch markets from our API route
    const markets = await fetchMarkets();

    console.log(`📊 Fetched ${markets.length} total markets`);

    // Filter for 15-minute crypto markets
    const cryptoMarkets = markets
      .filter((market) => {
        const slug = market.market_slug || market.slug || '';
        const question = market.question?.toLowerCase() || '';
        const description = market.description?.toLowerCase() || '';

        // Look for markets with 15m or 15-minute in the slug/question/description
        const is15Min = slug.includes('15m') ||
                       slug.includes('15-min') ||
                       question.includes('15 min') ||
                       question.includes('15-min') ||
                       description.includes('15 min') ||
                       description.includes('15-min');

        // Look for crypto symbols (BTC, ETH, SOL, XRP)
        const hasCrypto = ['btc', 'eth', 'sol', 'xrp'].some(crypto =>
          slug.toLowerCase().includes(crypto) ||
          question.includes(crypto) ||
          description.includes(crypto)
        );

        // Look for up/down pattern
        const hasUpDown = slug.includes('up') || slug.includes('down') ||
                         question.includes('up') || question.includes('down');

        const isActive = market.active !== false && market.closed !== true;

        return (is15Min || hasUpDown) && hasCrypto && isActive;
      })
      .map((market) => {
        // Determine which crypto this is
        const slug = (market.market_slug || market.slug || '').toLowerCase();
        const question = market.question?.toLowerCase() || '';

        let crypto: 'BTC' | 'ETH' | 'SOL' | 'XRP' = 'BTC';
        if (slug.includes('eth') || question.includes('eth')) crypto = 'ETH';
        else if (slug.includes('sol') || question.includes('sol')) crypto = 'SOL';
        else if (slug.includes('xrp') || question.includes('xrp')) crypto = 'XRP';

        // Get token prices from outcomes
        const tokens = market.outcomes && market.outcomePrices
          ? market.outcomes.map((outcome, idx) => ({
              token_id: `${market.id}-${idx}`,
              outcome,
              price: parseFloat(market.outcomePrices![idx] || '0.5'),
              winner: false,
            }))
          : [];

        return {
          slug: market.market_slug || market.slug || market.id,
          crypto,
          question: market.question,
          tokens,
          endTime: market.end_date_iso,
          active: market.active !== false,
        };
      });

    console.log(`✅ Found ${cryptoMarkets.length} crypto 15-minute markets`);

    return cryptoMarkets;
  } catch (error) {
    console.error('❌ Error fetching crypto 15min markets:', error);
    throw error;
  }
}

/**
 * Generate slug pattern for 15-minute crypto markets
 * Format: {crypto}-updown-15m-{timestamp}
 */
export function generateMarketSlug(
  crypto: 'btc' | 'eth' | 'sol' | 'xrp',
  timestamp: Date
): string {
  // Round to nearest 15 minutes
  const minutes = timestamp.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  timestamp.setMinutes(roundedMinutes, 0, 0);

  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getUTCDate()).padStart(2, '0');
  const hour = String(timestamp.getUTCHours()).padStart(2, '0');
  const minute = String(timestamp.getUTCMinutes()).padStart(2, '0');

  return `${crypto}-updown-15m-${year}${month}${day}-${hour}${minute}`;
}

/**
 * Search for market by slug pattern
 */
export async function searchMarketBySlug(slugPattern: string): Promise<SimplifiedMarket | null> {
  try {
    const markets = await fetchMarkets();

    const market = markets.find(m =>
      (m.market_slug && m.market_slug.includes(slugPattern)) ||
      (m.slug && m.slug.includes(slugPattern))
    );

    return market || null;
  } catch (error) {
    console.error('Error searching market by slug:', error);
    return null;
  }
}

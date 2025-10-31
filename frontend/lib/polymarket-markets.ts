import axios from 'axios';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

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
 * Fetch markets from Polymarket Gamma API
 */
export async function fetchMarkets(params?: {
  limit?: number;
  offset?: number;
  closed?: boolean;
  active?: boolean;
  archived?: boolean;
  order?: string;
  ascending?: boolean;
  tag?: string;
}): Promise<Market[]> {
  try {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.closed !== undefined) queryParams.append('closed', params.closed.toString());
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.archived !== undefined) queryParams.append('archived', params.archived.toString());
    if (params?.order) queryParams.append('order', params.order);
    if (params?.ascending !== undefined) queryParams.append('ascending', params.ascending.toString());
    if (params?.tag) queryParams.append('tag', params.tag);

    const response = await axios.get(`${GAMMA_API_URL}/markets?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw error;
  }
}

/**
 * Fetch a specific market by condition_id
 */
export async function fetchMarketByConditionId(conditionId: string): Promise<Market> {
  try {
    const response = await axios.get(`${GAMMA_API_URL}/markets/${conditionId}`);
    return response.data;
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
    // Fetch active markets with crypto tag or search in description
    const markets = await fetchMarkets({
      active: true,
      closed: false,
      limit: 100,
    });

    // Filter for 15-minute crypto markets
    const cryptoMarkets = markets
      .filter((market) => {
        const slug = market.market_slug || market.slug || '';
        const question = market.question.toLowerCase();
        const description = market.description?.toLowerCase() || '';

        // Look for markets with 15m or 15-minute in the slug/question/description
        const is15Min = slug.includes('15m') ||
                       question.includes('15') ||
                       description.includes('15');

        // Look for crypto symbols (BTC, ETH, SOL, XRP)
        const hasCrypto = ['btc', 'eth', 'sol', 'xrp'].some(crypto =>
          slug.includes(crypto) ||
          question.includes(crypto.toUpperCase()) ||
          description.includes(crypto)
        );

        return is15Min && hasCrypto && market.active;
      })
      .map((market) => {
        // Determine which crypto this is
        const slug = market.market_slug || market.slug || '';
        const question = market.question.toLowerCase();

        let crypto: 'BTC' | 'ETH' | 'SOL' | 'XRP' = 'BTC';
        if (slug.includes('eth') || question.includes('eth')) crypto = 'ETH';
        else if (slug.includes('sol') || question.includes('sol')) crypto = 'SOL';
        else if (slug.includes('xrp') || question.includes('xrp')) crypto = 'XRP';

        return {
          slug: market.market_slug || market.slug || market.condition_id,
          crypto,
          question: market.question,
          tokens: market.tokens,
          endTime: market.end_date_iso,
          active: market.active,
        };
      });

    return cryptoMarkets;
  } catch (error) {
    console.error('Error fetching crypto 15min markets:', error);
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
export async function searchMarketBySlug(slugPattern: string): Promise<Market | null> {
  try {
    const markets = await fetchMarkets({
      active: true,
      limit: 100,
    });

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

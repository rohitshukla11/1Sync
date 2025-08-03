/**
 * Token Configuration for Standard Assets
 * Defines standard tokens for Sepolia and Stellar networks
 */

export interface TokenConfig {
  symbol: string;
  name: string;
  address?: string; // For EVM tokens
  decimals: number;
  chain: 'ethereum' | 'stellar';
  network: 'testnet' | 'mainnet';
}

export const SEPOLIA_TOKENS: TokenConfig[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chain: 'ethereum',
    network: 'testnet'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    decimals: 6,
    chain: 'ethereum',
    network: 'testnet'
  }
];

export const STELLAR_TOKENS: TokenConfig[] = [
  {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    chain: 'stellar',
    network: 'testnet'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chain: 'stellar',
    network: 'testnet'
  }
];

export const ALL_TOKENS = [...SEPOLIA_TOKENS, ...STELLAR_TOKENS];

/**
 * Get token configuration by symbol and chain
 */
export function getTokenConfig(symbol: string, chain: 'ethereum' | 'stellar'): TokenConfig | undefined {
  return ALL_TOKENS.find(token => 
    token.symbol === symbol && token.chain === chain
  );
}

/**
 * Get token address for EVM tokens
 */
export function getTokenAddress(symbol: string, chain: 'ethereum' | 'stellar'): string | undefined {
  const token = getTokenConfig(symbol, chain);
  return token?.address;
}

/**
 * Validate if a token is supported
 */
export function isSupportedToken(symbol: string, chain: 'ethereum' | 'stellar'): boolean {
  return getTokenConfig(symbol, chain) !== undefined;
}

/**
 * Get all available tokens for a specific chain
 */
export function getTokensForChain(chain: 'ethereum' | 'stellar'): TokenConfig[] {
  return ALL_TOKENS.filter(token => token.chain === chain);
} 
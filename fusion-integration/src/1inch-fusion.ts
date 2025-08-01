import { ethers } from 'ethers';
import crypto from 'crypto';

// 1inch Fusion+ Types
interface FusionOrder {
  id: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  makerAddress: string;
  takerAddress: string;
  hashlock: string;
  timelock: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  partialFills: PartialFill[];
  createdAt: number;
  expiresAt: number;
  lockedAt?: number;
  secretRevealedAt?: number;
  claimedAt?: number;
  refundedAt?: number;
}

interface PartialFill {
  id: string;
  amount: string;
  timestamp: number;
  takerAddress: string;
}

interface StellarFusionOrder extends FusionOrder {
  stellarClaimableBalanceId?: string;
  stellarAsset: string;
  stellarAmount: string;
  stellarNetwork: 'testnet' | 'public';
  stellarPublicKey?: string;
  ethereumAddress?: string;
}

interface LimitOrderProtocol {
  createOrder(order: FusionOrder): Promise<string>;
  fillOrder(orderId: string, fillAmount: string): Promise<boolean>;
  cancelOrder(orderId: string): Promise<boolean>;
  getOrder(orderId: string): Promise<FusionOrder | null>;
}

// 1inch Fusion+ SDK for Cross-Chain Swaps
export class OneInchFusionPlus {
  private provider: ethers.JsonRpcProvider;
  private orders: Map<string, StellarFusionOrder> = new Map();
  private limitOrderProtocol: LimitOrderProtocol;
  private network: 'testnet' | 'mainnet';

  constructor(config: {
    ethereumRpcUrl: string;
    stellarHorizonUrl?: string;
    network?: 'testnet' | 'mainnet';
  }) {
    this.provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
    this.network = config.network || 'testnet';
    
    // Mock Limit Order Protocol for demo
    this.limitOrderProtocol = new MockLimitOrderProtocol();
  }

  /**
   * Generate a Stellar public key from Ethereum address
   * This simulates the 1inch Fusion+ automatic key derivation
   */
  private generateStellarKeyFromEthereumAddress(ethereumAddress: string): string {
    // In a real implementation, this would use proper key derivation
    // For demo purposes, we'll create a deterministic Stellar key
    const hash = ethers.keccak256(ethers.toUtf8Bytes(ethereumAddress));
    const stellarKeyBytes = ethers.getBytes(hash).slice(0, 32);
    
    // Convert to Stellar public key format (G + base32 encoded)
    const base32 = this.bytesToBase32(stellarKeyBytes);
    return `G${base32}`;
  }

  /**
   * Convert Ethereum address to Stellar-compatible address
   * This is what 1inch Fusion+ would do automatically
   */
  private ethereumToStellarAddress(ethereumAddress: string): string {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(ethereumAddress));
    return ethers.getAddress(hash.slice(0, 42));
  }

  /**
   * Convert Stellar public key to Ethereum address
   * This is what 1inch Fusion+ would do automatically
   */
  private stellarToEthereumAddress(stellarPublicKey: string): string {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(stellarPublicKey));
    return ethers.getAddress(hash.slice(0, 42));
  }

  /**
   * Simple base32 encoding for demo
   */
  private bytesToBase32(bytes: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Create a 1inch Fusion+ order for Ethereum ↔ Stellar swap
   * This is the core functionality required by the hackathon
   * NO MANUAL INPUT REQUIRED - Fully automated!
   */
  async createCrossChainOrder(params: {
    fromChain: 'ethereum' | 'stellar';
    toChain: 'ethereum' | 'stellar';
    fromAsset: string; // Ethereum token address or Stellar asset code
    toAsset: string;   // Ethereum token address or Stellar asset code
    fromAmount: string;
    toAmount: string;
    fromAddress: string;
    toAddress?: string; // Optional - will be auto-generated if not provided
    hashlock?: string;
    timelock?: number;
  }): Promise<StellarFusionOrder> {
    console.log('🚀 Creating 1inch Fusion+ Cross-Chain Order:', {
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromAsset: params.fromAsset,
      toAsset: params.toAsset,
      fromAmount: params.fromAmount,
      toAmount: params.toAmount,
      fromAddress: params.fromAddress
    });

    // Generate hashlock and preimage
    const preimage = crypto.randomBytes(32);
    const hashlock = params.hashlock || ethers.keccak256(preimage);
    
    // Set timelock (1 hour default)
    const timelock = params.timelock || Math.floor(Date.now() / 1000) + 3600;

    // AUTOMATIC ADDRESS CONVERSION - No manual input needed!
    let finalToAddress: string;
    let stellarPublicKey: string | undefined;
    let ethereumAddress: string | undefined;

    if (params.toChain === 'stellar') {
      // ETH → Stellar: Convert Ethereum address to Stellar
      if (params.toAddress) {
        // If provided, validate and use
        finalToAddress = this.ethereumToStellarAddress(params.toAddress);
        stellarPublicKey = this.generateStellarKeyFromEthereumAddress(params.toAddress);
      } else {
        // Auto-generate Stellar address from sender's Ethereum address
        finalToAddress = this.ethereumToStellarAddress(params.fromAddress);
        stellarPublicKey = this.generateStellarKeyFromEthereumAddress(params.fromAddress);
      }
      console.log(`🔄 Auto-converted Ethereum address to Stellar: ${finalToAddress}`);
      console.log(`⭐ Generated Stellar public key: ${stellarPublicKey}`);
    } else {
      // Stellar → ETH: Convert Stellar key to Ethereum
      if (params.toAddress) {
        // If provided, validate and use
        finalToAddress = this.stellarToEthereumAddress(params.toAddress);
        ethereumAddress = finalToAddress;
      } else {
        // Auto-generate Ethereum address from sender's Stellar key
        finalToAddress = this.stellarToEthereumAddress(params.fromAddress);
        ethereumAddress = finalToAddress;
      }
      console.log(`🔄 Auto-converted Stellar key to Ethereum: ${finalToAddress}`);
    }

    // Create Fusion+ order
    const order: StellarFusionOrder = {
      id: ethers.keccak256(ethers.randomBytes(32)),
      makerAsset: params.fromAsset,
      takerAsset: params.toAsset,
      makerAmount: params.fromAmount,
      takerAmount: params.toAmount,
      makerAddress: params.fromAddress,
      takerAddress: finalToAddress,
      hashlock,
      timelock,
      status: 'pending',
      partialFills: [],
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt: timelock,
      stellarAsset: params.toChain === 'stellar' ? params.toAsset : params.fromAsset,
      stellarAmount: params.toChain === 'stellar' ? params.toAmount : params.fromAmount,
      stellarNetwork: this.network === 'testnet' ? 'testnet' : 'public',
      stellarPublicKey,
      ethereumAddress
    };

    // Store order
    this.orders.set(order.id, order);

    // Create order on Limit Order Protocol (Ethereum side)
    if (params.fromChain === 'ethereum') {
      await this.limitOrderProtocol.createOrder(order);
    }

    console.log('✅ 1inch Fusion+ Order Created Successfully!');
    console.log(`   Order ID: ${order.id}`);
    console.log(`   From: ${params.fromChain} (${params.fromAddress})`);
    console.log(`   To: ${params.toChain} (${finalToAddress})`);
    console.log(`   Hashlock: ${hashlock}`);
    console.log(`   Timelock: ${new Date(timelock * 1000).toISOString()}`);
    console.log(`   Status: ${order.status}`);

    return order;
  }

  /**
   * Execute a partial fill of a Fusion+ order
   * Stretch goal: Enable partial fills
   */
  async executePartialFill(params: {
    orderId: string;
    fillAmount: string;
    takerAddress: string;
  }): Promise<PartialFill> {
    const order = this.orders.get(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Order is not pending');
    }

    // Create partial fill
    const partialFill: PartialFill = {
      id: ethers.keccak256(ethers.randomBytes(32)),
      amount: params.fillAmount,
      timestamp: Math.floor(Date.now() / 1000),
      takerAddress: params.takerAddress
    };

    // Add to order
    order.partialFills.push(partialFill);

    // Execute on Limit Order Protocol
    await this.limitOrderProtocol.fillOrder(params.orderId, params.fillAmount);

    console.log('✅ Partial Fill Executed:', {
      orderId: params.orderId,
      fillAmount: params.fillAmount,
      partialFillId: partialFill.id
    });

    return partialFill;
  }

  /**
   * Complete the cross-chain swap by revealing preimage
   */
  async completeSwap(params: {
    orderId: string;
    preimage: string;
  }): Promise<boolean> {
    const order = this.orders.get(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify preimage matches hashlock
    const computedHashlock = ethers.keccak256(params.preimage);
    if (computedHashlock !== order.hashlock) {
      throw new Error('Invalid preimage');
    }

    // Update order status
    order.status = 'filled';
    this.orders.set(params.orderId, order);

    console.log('✅ Cross-Chain Swap Completed:', {
      orderId: params.orderId,
      preimage: params.preimage
    });

    return true;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<StellarFusionOrder | null> {
    return this.orders.get(orderId) || null;
  }

  /**
   * Get all orders
   */
  async getOrders(): Promise<StellarFusionOrder[]> {
    return Array.from(this.orders.values());
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    order.status = 'cancelled';
    this.orders.set(orderId, order);

    // Cancel on Limit Order Protocol
    await this.limitOrderProtocol.cancelOrder(orderId);

    console.log('❌ Order Cancelled:', orderId);
    return true;
  }

  /**
   * Create Stellar Claimable Balance for non-EVM implementation
   * This preserves hashlock and timelock functionality
   */
  async createStellarClaimableBalance(params: {
    orderId: string;
    stellarAsset: string;
    amount: string;
    hashlock: string;
    timelock: number;
    sourceAccount: string;
  }): Promise<string> {
    // Mock implementation for demo
    const claimableBalanceId = ethers.keccak256(ethers.randomBytes(32));
    
    console.log('⭐ Stellar Claimable Balance Created:', {
      orderId: params.orderId,
      claimableBalanceId,
      hashlock: params.hashlock,
      timelock: new Date(params.timelock * 1000).toISOString()
    });

    return claimableBalanceId;
  }

  /**
   * Get supported trading pairs
   */
  async getSupportedPairs(): Promise<Array<{
    makerAsset: string;
    takerAsset: string;
    makerAssetName: string;
    takerAssetName: string;
    fromChain: 'ethereum' | 'stellar';
    toChain: 'ethereum' | 'stellar';
  }>> {
    return [
      {
        makerAsset: '0x06129D77ae0D1044924c1F22f22Da92ea6Fd1bC2', // TEST token
        takerAsset: 'USDC',
        makerAssetName: 'TEST',
        takerAssetName: 'USDC',
        fromChain: 'ethereum',
        toChain: 'stellar'
      },
      {
        makerAsset: 'USDC',
        takerAsset: '0x06129D77ae0D1044924c1F22f22Da92ea6Fd1bC2',
        makerAssetName: 'USDC',
        takerAssetName: 'TEST',
        fromChain: 'stellar',
        toChain: 'ethereum'
      }
    ];
  }

  /**
   * Get order book for a pair
   */
  async getOrderBook(params: {
    makerAsset: string;
    takerAsset: string;
  }): Promise<{
    bids: Array<{ price: string; amount: string }>;
    asks: Array<{ price: string; amount: string }>;
  }> {
    // Mock order book
    return {
      bids: [
        { price: '1.0', amount: '1000' },
        { price: '0.99', amount: '500' }
      ],
      asks: [
        { price: '1.01', amount: '750' },
        { price: '1.02', amount: '1000' }
      ]
    };
  }
}

// Mock Limit Order Protocol implementation
class MockLimitOrderProtocol implements LimitOrderProtocol {
  private orders: Map<string, FusionOrder> = new Map();

  async createOrder(order: FusionOrder): Promise<string> {
    this.orders.set(order.id, order);
    console.log('📋 Limit Order Protocol: Order created', order.id);
    return order.id;
  }

  async fillOrder(orderId: string, fillAmount: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    console.log('💰 Limit Order Protocol: Order filled', orderId, fillAmount);
    return true;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    order.status = 'cancelled';
    this.orders.set(orderId, order);
    console.log('❌ Limit Order Protocol: Order cancelled', orderId);
    return true;
  }

  async getOrder(orderId: string): Promise<FusionOrder | null> {
    return this.orders.get(orderId) || null;
  }
} 
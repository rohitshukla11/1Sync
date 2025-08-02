import { ethers } from 'ethers';
import axios from 'axios';
import crypto from 'crypto';
import { RealBlockchainIntegration } from './real-blockchain-integration';

// Configuration
const ONEINCH_API_BASE = 'https://api.1inch.dev';

interface HashlockedOrder {
  orderId: string;
  maker: string;
  taker?: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  hashlock: string;
  secret?: string;
  timelock: number;
  status: 'created' | 'filled' | 'escrowed' | 'funded' | 'claimed' | 'completed' | 'cancelled';
  evmEscrowAddress?: string;
  stellarClaimableBalanceId?: string;
  createdAt: number;
  updatedAt: number;
  // Add transaction tracking
  transactions?: {
    evmEscrowTx?: string;
    stellarClaimableBalanceTx?: string;
    stellarFundingTx?: string;
    stellarClaimTx?: string;
    evmClaimTx?: string;
  };
  explorerLinks?: {
    evmEscrow?: string;
    stellarClaimableBalance?: string;
    stellarFunding?: string;
    stellarClaim?: string;
    evmClaim?: string;
  };
  // Add real blockchain integration data
  stellarKeypair?: any;
  ethereumWallet?: { address: string; privateKey: string };
}

interface SwapFlowParams {
  maker: string;
  taker?: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string; // EVM token address or Stellar asset code
  takerAsset: string; // EVM token address or Stellar asset code
  fromChain: 'ethereum' | 'stellar';
  toChain: 'ethereum' | 'stellar';
  timelockDuration?: number;
}

/**
 * Hashlocked Stellar Resolver - Following exact hashlocked-cli flow
 * Implements complete atomic swap between EVM and Stellar with REAL blockchain transactions
 */
export class HashlockedStellarResolver {
  private provider: ethers.JsonRpcProvider;
  private oneInchApiKey: string;
  private network: 'testnet' | 'mainnet';
  private orders: Map<string, HashlockedOrder> = new Map();
  private blockchainIntegration: RealBlockchainIntegration;

  constructor(config: {
    ethereumRpcUrl: string;
    network: 'testnet' | 'mainnet';
    oneInchApiKey: string;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
    this.oneInchApiKey = config.oneInchApiKey;
    this.network = config.network;
    
    // Initialize real blockchain integration
    this.blockchainIntegration = new RealBlockchainIntegration({
      stellarNetwork: config.network,
      ethereumNetwork: config.network === 'testnet' ? 'sepolia' : 'mainnet',
      ethereumRpcUrl: config.ethereumRpcUrl
    });
  }

  /**
   * Step 1: MAKER creates order (following hashlocked-cli pattern)
   */
  async createOrder(params: SwapFlowParams): Promise<HashlockedOrder> {
    console.log('🚀 Step 1: MAKER creating order (hashlocked-cli pattern)...');
    
    // Generate secret and hashlock (following hashlocked-cli pattern)
    const secret = crypto.randomBytes(32);
    const secretHex = "0x" + secret.toString("hex");
    const hashlock = ethers.sha256(secretHex);
    
    // Set timelock (1 hour default)
    const timelock = Math.floor(Date.now() / 1000) + (params.timelockDuration || 3600);
    
    // Generate real blockchain accounts for this order
    const stellarKeypair = RealBlockchainIntegration.generateStellarKeypair();
    const ethereumWallet = RealBlockchainIntegration.generateEthereumWallet();
    
    const order: HashlockedOrder = {
      orderId: `order_${Date.now()}`,
      maker: params.maker,
      taker: params.taker,
      makingAmount: params.makingAmount,
      takingAmount: params.takingAmount,
      makerAsset: params.makerAsset,
      takerAsset: params.takerAsset,
      hashlock,
      secret: secretHex,
      timelock,
      status: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stellarKeypair,
      ethereumWallet
    };

    this.orders.set(order.orderId, order);

    console.log('✅ Order created successfully!');
    console.log(`   Order ID: ${order.orderId}`);
    console.log(`   Maker: ${params.maker}`);
    console.log(`   Making: ${params.makingAmount} ${params.makerAsset} (${params.fromChain})`);
    console.log(`   Taking: ${params.takingAmount} ${params.takerAsset} (${params.toChain})`);
    console.log(`   Hashlock: ${hashlock}`);
    console.log(`   Timelock: ${new Date(timelock * 1000).toISOString()}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   🌟 Stellar Account: ${stellarKeypair.publicKey()}`);
    console.log(`   🌟 Ethereum Account: ${ethereumWallet.address}`);

    return order;
  }

  /**
   * Step 2: TAKER fills order (creates Stellar claimable balance)
   */
  async fillOrder(orderId: string, taker: string): Promise<HashlockedOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    if (order.status !== 'created') {
      throw new Error(`Order ${orderId} is not in 'created' status`);
    }

    console.log(`🚀 TAKER filling order ${orderId}...`);
    console.log(`🚀 Step 2: TAKER filling order (creating REAL Stellar claimable balance)...`);

    try {
      // Create REAL Stellar claimable balance
      const result = await this.blockchainIntegration.createStellarClaimableBalance({
        sourceKeypair: order.stellarKeypair!,
        asset: order.takerAsset,
        amount: order.takingAmount,
        hashlock: order.hashlock,
        claimant: taker,
        timelock: order.timelock
      });

      // Get explorer links
      const explorerLinks = this.blockchainIntegration.getExplorerLinks(
        result.transactionHash, 
        result.claimableBalanceId
      );

      // Update order
      order.taker = taker;
      order.status = 'filled';
      order.updatedAt = Date.now();
      order.stellarClaimableBalanceId = result.claimableBalanceId;
      order.transactions = order.transactions || {};
      order.transactions.stellarClaimableBalanceTx = result.transactionHash;
      order.explorerLinks = order.explorerLinks || {};
      order.explorerLinks.stellarClaimableBalance = explorerLinks.stellar.claimableBalance || undefined;
      order.explorerLinks.stellarFunding = explorerLinks.stellar.transaction;

      console.log(`✅ Order filled successfully with REAL blockchain transaction!`);
      console.log(`   Taker: ${taker}`);
      console.log(`   Stellar Claimable Balance ID: ${result.claimableBalanceId}`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   🔗 Verify Claimable Balance: ${explorerLinks.stellar.claimableBalance}`);
      console.log(`   🔗 Verify Transaction: ${explorerLinks.stellar.transaction}`);
      console.log(`   Status: ${order.status}`);

      return order;
    } catch (error) {
      console.error(`❌ Error filling order: ${error}`);
      throw error;
    }
  }

  /**
   * Step 3: MAKER creates EVM escrow
   */
  async createEscrow(orderId: string): Promise<HashlockedOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    if (order.status !== 'filled') {
      throw new Error(`Order ${orderId} is not in 'filled' status`);
    }

    console.log(`🚀 MAKER creating REAL EVM escrow for order ${orderId}...`);
    console.log(`🚀 Step 3: MAKER creating REAL EVM escrow...`);

    try {
      // Create REAL EVM escrow
      const result = await this.blockchainIntegration.createEthereumEscrow({
        privateKey: order.ethereumWallet!.privateKey,
        amount: order.makingAmount,
        asset: order.makerAsset,
        hashlock: order.hashlock,
        timelock: order.timelock,
        beneficiary: order.taker!
      });

      // Get explorer links
      const explorerLinks = this.blockchainIntegration.getExplorerLinks(result.transactionHash);

      // Update order
      order.evmEscrowAddress = result.escrowAddress;
      order.status = 'escrowed';
      order.updatedAt = Date.now();
      order.transactions = order.transactions || {};
      order.transactions.evmEscrowTx = result.transactionHash;
      order.explorerLinks = order.explorerLinks || {};
      order.explorerLinks.evmEscrow = explorerLinks.ethereum.transaction;

      console.log(`✅ REAL EVM escrow created successfully!`);
      console.log(`   Escrow Address: ${result.escrowAddress}`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   🔗 Verify on Ethereum: ${explorerLinks.ethereum.transaction}`);
      console.log(`   Status: ${order.status}`);

      return order;
    } catch (error) {
      console.error(`❌ Error creating escrow: ${error}`);
      throw error;
    }
  }

  /**
   * Step 4: TAKER funds Stellar claimable balance
   */
  async fundStellar(orderId: string): Promise<HashlockedOrder> {
    console.log(`🚀 TAKER funding REAL Stellar for order ${orderId}...`);
    console.log(`🚀 Step 4: TAKER funding REAL Stellar claimable balance...`);
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'escrowed') {
      throw new Error(`Order ${orderId} is not in 'escrowed' status`);
    }

    try {
      // Fund REAL Stellar claimable balance
      const result = await this.blockchainIntegration.fundStellarClaimableBalance({
        sourceKeypair: order.stellarKeypair!,
        claimableBalanceId: order.stellarClaimableBalanceId!,
        asset: order.takerAsset,
        amount: order.takingAmount
      });

      // Get explorer links
      const explorerLinks = this.blockchainIntegration.getExplorerLinks(result.transactionHash);

      // Update order
      order.status = 'funded';
      order.updatedAt = Date.now();
      order.transactions = order.transactions || {};
      order.transactions.stellarFundingTx = result.transactionHash;
      order.explorerLinks = order.explorerLinks || {};
      order.explorerLinks.stellarFunding = explorerLinks.stellar.transaction;

      console.log(`✅ REAL Stellar claimable balance funded successfully!`);
      console.log(`   Amount: ${order.takingAmount} ${order.takerAsset}`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   🔗 Verify on Stellar: ${explorerLinks.stellar.transaction}`);
      console.log(`   Status: ${order.status}`);

      return order;
    } catch (error) {
      console.error(`❌ Error funding Stellar: ${error}`);
      throw error;
    }
  }

  /**
   * Step 5: MAKER claims Stellar (reveals secret)
   */
  async claimStellar(orderId: string): Promise<HashlockedOrder> {
    console.log(`🚀 MAKER claiming REAL Stellar for order ${orderId}...`);
    console.log(`🚀 Step 5: MAKER claiming REAL Stellar (revealing secret)...`);
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'funded') {
      throw new Error(`Order ${orderId} is not in 'funded' status`);
    }

    try {
      // Claim REAL Stellar with secret
      const result = await this.blockchainIntegration.claimStellarBalance({
        sourceKeypair: order.stellarKeypair!,
        claimableBalanceId: order.stellarClaimableBalanceId!,
        secret: order.secret!
      });

      // Get explorer links
      const explorerLinks = this.blockchainIntegration.getExplorerLinks(result.transactionHash);

      // Update order
      order.status = 'claimed';
      order.updatedAt = Date.now();
      order.transactions = order.transactions || {};
      order.transactions.stellarClaimTx = result.transactionHash;
      order.explorerLinks = order.explorerLinks || {};
      order.explorerLinks.stellarClaim = explorerLinks.stellar.transaction;

      console.log(`✅ REAL Stellar claimed successfully!`);
      console.log(`   Secret revealed: ${order.secret}`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   🔗 Verify on Stellar: ${explorerLinks.stellar.transaction}`);
      console.log(`   Status: ${order.status}`);

      return order;
    } catch (error) {
      console.error(`❌ Error claiming Stellar: ${error}`);
      throw error;
    }
  }

  /**
   * Step 6: TAKER claims EVM (using revealed secret)
   */
  async claimEVM(orderId: string): Promise<HashlockedOrder> {
    console.log(`🚀 TAKER claiming REAL EVM for order ${orderId}...`);
    console.log(`🚀 Step 6: TAKER claiming REAL EVM (using revealed secret)...`);
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'claimed') {
      throw new Error(`Order ${orderId} is not in 'claimed' status`);
    }

    if (!order.secret) {
      throw new Error(`Order ${orderId} has no secret`);
    }

    try {
      // Claim REAL EVM using secret
      const result = await this.blockchainIntegration.claimEthereumEscrow({
        privateKey: order.ethereumWallet!.privateKey,
        escrowAddress: order.evmEscrowAddress!,
        secret: order.secret
      });

      // Get explorer links
      const explorerLinks = this.blockchainIntegration.getExplorerLinks(result.transactionHash);

      // Update order
      order.status = 'completed';
      order.updatedAt = Date.now();
      order.transactions = order.transactions || {};
      order.transactions.evmClaimTx = result.transactionHash;
      order.explorerLinks = order.explorerLinks || {};
      order.explorerLinks.evmClaim = explorerLinks.ethereum.transaction;

      console.log(`✅ REAL EVM claimed successfully!`);
      console.log(`   Used secret: ${order.secret}`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   🔗 Verify on Ethereum: ${explorerLinks.ethereum.transaction}`);
      console.log(`   Status: ${order.status}`);
      console.log(`🎉 REAL Atomic swap completed successfully!`);

      return order;
    } catch (error) {
      console.error(`❌ Error claiming EVM: ${error}`);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): HashlockedOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders
   */
  getAllOrders(): HashlockedOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: HashlockedOrder['status']): HashlockedOrder[] {
    return this.getAllOrders().filter(order => order.status === status);
  }

  /**
   * Check if accounts have sufficient funds for real transactions
   */
  async checkOrderFunds(orderId: string): Promise<{ stellar: boolean; ethereum: boolean }> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return await this.blockchainIntegration.checkAccountBalances({
      stellarPublicKey: order.stellarKeypair!.publicKey(),
      ethereumAddress: order.ethereumWallet!.address
    });
  }
} 
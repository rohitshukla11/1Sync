import { ethers } from 'ethers';
import * as StellarSdk from 'stellar-sdk';
import { SwapUtils, SwapConfig } from './utils';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const config: SwapConfig = {
  ethRpcUrl: process.env.ETH_RPC_URL || 'http://localhost:8545',
  htlcAddress: process.env.HTLC_ADDRESS || '',
  erc20Address: process.env.ERC20_ADDRESS || '',
  stellarHorizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  stellarNetwork: (process.env.STELLAR_NETWORK as 'testnet' | 'public') || 'testnet'
};

// HTLC ABI for event monitoring
const HTLC_ABI = [
  'event NewSwap(bytes32 indexed swapId, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashlock, uint256 timelock)',
  'event Claimed(bytes32 indexed swapId, bytes32 preimage)',
  'event Refunded(bytes32 indexed swapId)',
  'function swaps(bytes32) external view returns (address sender, address receiver, uint256 amount, bytes32 hashlock, uint256 timelock, bool claimed, bool refunded, bytes32 preimage)'
];

interface SwapEvent {
  swapId: string;
  sender: string;
  receiver: string;
  amount: string;
  hashlock: string;
  timelock: number;
  eventType: 'NewSwap' | 'Claimed' | 'Refunded';
  preimage?: string;
  timestamp: number;
}

class SwapMonitor {
  private utils: SwapUtils;
  private ethProvider: ethers.JsonRpcProvider;
  private htlcContract: ethers.Contract;
  private stellarServer: StellarSdk.Server;
  private swapEvents: Map<string, SwapEvent> = new Map();
  private isMonitoring: boolean = false;

  constructor() {
    this.utils = new SwapUtils(config);
    this.ethProvider = new ethers.JsonRpcProvider(config.ethRpcUrl);
    this.htlcContract = new ethers.Contract(config.htlcAddress, HTLC_ABI, this.ethProvider);
    this.stellarServer = new StellarSdk.Server(config.stellarHorizonUrl);
  }

  /**
   * Start monitoring swap events
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  Monitoring is already running');
      return;
    }

    console.log('🚀 Starting swap event monitoring...');
    this.isMonitoring = true;

    // Monitor Ethereum HTLC events
    this.monitorETHEvents();
    
    // Monitor Stellar claimable balances
    this.monitorStellarEvents();
    
    // Start periodic status checks
    this.startPeriodicChecks();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    console.log('🛑 Stopping swap event monitoring...');
    this.isMonitoring = false;
  }

  /**
   * Monitor Ethereum HTLC events
   */
  private monitorETHEvents() {
    console.log('📡 Monitoring Ethereum HTLC events...');

    // Monitor NewSwap events
    this.htlcContract.on('NewSwap', (swapId, sender, receiver, amount, hashlock, timelock) => {
      const event: SwapEvent = {
        swapId,
        sender,
        receiver,
        amount: amount.toString(),
        hashlock,
        timelock: Number(timelock),
        eventType: 'NewSwap',
        timestamp: Date.now()
      };

      this.swapEvents.set(swapId, event);
      this.handleNewSwapEvent(event);
    });

    // Monitor Claimed events
    this.htlcContract.on('Claimed', (swapId, preimage) => {
      const event: SwapEvent = {
        swapId,
        sender: '',
        receiver: '',
        amount: '',
        hashlock: '',
        timelock: 0,
        eventType: 'Claimed',
        preimage,
        timestamp: Date.now()
      };

      this.handleClaimedEvent(event);
    });

    // Monitor Refunded events
    this.htlcContract.on('Refunded', (swapId) => {
      const event: SwapEvent = {
        swapId,
        sender: '',
        receiver: '',
        amount: '',
        hashlock: '',
        timelock: 0,
        eventType: 'Refunded',
        timestamp: Date.now()
      };

      this.handleRefundedEvent(event);
    });
  }

  /**
   * Monitor Stellar claimable balance events
   */
  private async monitorStellarEvents() {
    console.log('🌟 Monitoring Stellar claimable balance events...');
    
    // Poll for new claimable balances periodically
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        await this.checkStellarClaimableBalances();
      } catch (error) {
        console.error('❌ Error checking Stellar claimable balances:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check for new Stellar claimable balances
   */
  private async checkStellarClaimableBalances() {
    try {
      const claimableBalances = await this.stellarServer.claimableBalances().call();
      
      for (const balance of claimableBalances.records) {
        // Check if this is a new balance we haven't seen
        if (!this.swapEvents.has(balance.id)) {
          console.log(`🆕 New Stellar claimable balance detected: ${balance.id}`);
          this.handleNewStellarBalance(balance);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching Stellar claimable balances:', error);
    }
  }

  /**
   * Handle new swap event from Ethereum
   */
  private async handleNewSwapEvent(event: SwapEvent) {
    console.log('🆕 New ETH swap detected:');
    console.log(`  Swap ID: ${event.swapId}`);
    console.log(`  Sender: ${event.sender}`);
    console.log(`  Receiver: ${event.receiver}`);
    console.log(`  Amount: ${this.utils.formatAmount(event.amount)}`);
    console.log(`  Hashlock: ${event.hashlock}`);
    console.log(`  Timelock: ${new Date(event.timelock * 1000).toISOString()}`);
    
    // TODO: Trigger Stellar claimable balance creation
    // This would typically involve calling the relayer service
    console.log('📋 Queuing for Stellar claimable balance creation...');
  }

  /**
   * Handle claimed event from Ethereum
   */
  private async handleClaimedEvent(event: SwapEvent) {
    console.log('💰 ETH swap claimed:');
    console.log(`  Swap ID: ${event.swapId}`);
    console.log(`  Preimage: ${event.preimage}`);
    
    // TODO: Notify Stellar side about the claim
    console.log('📋 Notifying Stellar side about ETH claim...');
  }

  /**
   * Handle refunded event from Ethereum
   */
  private async handleRefundedEvent(event: SwapEvent) {
    console.log('↩️ ETH swap refunded:');
    console.log(`  Swap ID: ${event.swapId}`);
    
    // TODO: Handle refund on Stellar side
    console.log('📋 Processing refund on Stellar side...');
  }

  /**
   * Handle new Stellar claimable balance
   */
  private async handleNewStellarBalance(balance: any) {
    console.log('🆕 New Stellar claimable balance:');
    console.log(`  Balance ID: ${balance.id}`);
    console.log(`  Amount: ${balance.amount}`);
    console.log(`  Asset: ${balance.asset}`);
    
    // TODO: Create corresponding ETH HTLC
    console.log('📋 Queuing for ETH HTLC creation...');
  }

  /**
   * Start periodic status checks
   */
  private startPeriodicChecks() {
    console.log('⏰ Starting periodic status checks...');
    
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        await this.checkExpiredSwaps();
        await this.checkSwapStatuses();
      } catch (error) {
        console.error('❌ Error in periodic checks:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Check for expired swaps
   */
  private async checkExpiredSwaps() {
    const now = Math.floor(Date.now() / 1000);
    
    for (const [swapId, event] of this.swapEvents) {
      if (event.eventType === 'NewSwap' && event.timelock < now) {
        console.log(`⏰ Swap ${swapId} has expired`);
        
        // Check if it's been claimed or refunded
        try {
          const swap = await this.htlcContract.swaps(swapId);
          if (!swap.claimed && !swap.refunded) {
            console.log(`⚠️  Swap ${swapId} is expired but not completed`);
            // TODO: Trigger refund process
          }
        } catch (error) {
          console.error(`❌ Error checking swap ${swapId}:`, error);
        }
      }
    }
  }

  /**
   * Check status of all active swaps
   */
  private async checkSwapStatuses() {
    console.log(`📊 Checking status of ${this.swapEvents.size} swaps...`);
    
    for (const [swapId, event] of this.swapEvents) {
      if (event.eventType === 'NewSwap') {
        try {
          const swap = await this.htlcContract.swaps(swapId);
          const status = swap.claimed ? 'CLAIMED' : swap.refunded ? 'REFUNDED' : 'ACTIVE';
          console.log(`  ${swapId}: ${status}`);
        } catch (error) {
          console.error(`❌ Error checking swap ${swapId}:`, error);
        }
      }
    }
  }

  /**
   * Get all swap events
   */
  getSwapEvents(): SwapEvent[] {
    return Array.from(this.swapEvents.values());
  }

  /**
   * Get specific swap event
   */
  getSwapEvent(swapId: string): SwapEvent | undefined {
    return this.swapEvents.get(swapId);
  }

  /**
   * Get active swaps (not claimed or refunded)
   */
  async getActiveSwaps(): Promise<SwapEvent[]> {
    const activeSwaps: SwapEvent[] = [];
    
    for (const [swapId, event] of this.swapEvents) {
      if (event.eventType === 'NewSwap') {
        try {
          const swap = await this.htlcContract.swaps(swapId);
          if (!swap.claimed && !swap.refunded) {
            activeSwaps.push(event);
          }
        } catch (error) {
          console.error(`❌ Error checking swap ${swapId}:`, error);
        }
      }
    }
    
    return activeSwaps;
  }

  /**
   * Get swap statistics
   */
  async getSwapStatistics() {
    const totalSwaps = this.swapEvents.size;
    const activeSwaps = await this.getActiveSwaps();
    const claimedSwaps = this.swapEvents.values().filter(e => e.eventType === 'Claimed').length;
    const refundedSwaps = this.swapEvents.values().filter(e => e.eventType === 'Refunded').length;
    
    return {
      total: totalSwaps,
      active: activeSwaps.length,
      claimed: claimedSwaps,
      refunded: refundedSwaps
    };
  }
}

// Example usage
async function main() {
  const monitor = new SwapMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  // Start monitoring
  await monitor.startMonitoring();
  
  // Keep the process running
  console.log('🔄 Swap monitor is running. Press Ctrl+C to stop.');
}

if (require.main === module) {
  main().catch(console.error);
}

export { SwapMonitor }; 
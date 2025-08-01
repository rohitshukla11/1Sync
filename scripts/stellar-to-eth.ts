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

// HTLC ABI for Ethereum
const HTLC_ABI = [
  'function newSwap(address receiver, uint256 amount, bytes32 hashlock, uint256 timelock) external returns (bytes32 swapId)',
  'function claim(bytes32 swapId, bytes32 preimage) external',
  'function refund(bytes32 swapId) external',
  'function swaps(bytes32) external view returns (address sender, address receiver, uint256 amount, bytes32 hashlock, uint256 timelock, bool claimed, bool refunded, bytes32 preimage)',
  'event NewSwap(bytes32 indexed swapId, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashlock, uint256 timelock)',
  'event Claimed(bytes32 indexed swapId, bytes32 preimage)',
  'event Refunded(bytes32 indexed swapId)'
];

class StellarToETHSwap {
  private utils: SwapUtils;
  private ethProvider: ethers.JsonRpcProvider;
  private htlcContract: ethers.Contract;
  private stellarServer: StellarSdk.Server;

  constructor() {
    this.utils = new SwapUtils(config);
    this.ethProvider = new ethers.JsonRpcProvider(config.ethRpcUrl);
    this.htlcContract = new ethers.Contract(config.htlcAddress, HTLC_ABI, this.ethProvider);
    this.stellarServer = new StellarSdk.Server(config.stellarHorizonUrl);
  }

  /**
   * Step 1: Initiate Stellar to ETH swap
   */
  async initiateSwap(
    stellarSenderPrivateKey: string,
    ethReceiverAddress: string,
    stellarAmount: string,
    timelockDuration: number = 3600 // 1 hour default
  ) {
    console.log('🌟 Initiating Stellar to ETH swap...');
    
    try {
      // Create Stellar keypair
      const stellarKeypair = StellarSdk.Keypair.fromSecret(stellarSenderPrivateKey);
      const stellarAccount = await this.stellarServer.loadAccount(stellarKeypair.publicKey());
      
      // Generate preimage and hashlock
      const { preimage, hashlock } = this.utils.generatePreimage();
      
      // Calculate timelock
      const timelock = this.utils.calculateTimelock(timelockDuration);
      
      // Check Stellar balance
      const stellarBalance = await this.utils.getStellarBalance(stellarKeypair.publicKey());
      console.log(`📊 Stellar Balance: ${stellarBalance} XLM`);
      
      if (parseFloat(stellarBalance) < parseFloat(stellarAmount)) {
        throw new Error('Insufficient Stellar balance');
      }
      
      // Create claimable balance on Stellar
      console.log('📝 Creating claimable balance on Stellar...');
      const transaction = new StellarSdk.TransactionBuilder(stellarAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: config.stellarNetwork === 'testnet' 
          ? StellarSdk.Networks.TESTNET 
          : StellarSdk.Networks.PUBLIC
      })
        .addOperation(StellarSdk.Operation.createClaimableBalance({
          claimants: [
            new StellarSdk.Claimant(ethReceiverAddress, StellarSdk.Claimant.predicateHash(hashlock)),
            new StellarSdk.Claimant(stellarKeypair.publicKey(), StellarSdk.Claimant.predicateBeforeAbsoluteTime(timelock))
          ],
          asset: StellarSdk.Asset.native(),
          amount: stellarAmount
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(stellarKeypair);
      
      const result = await this.stellarServer.submitTransaction(transaction);
      console.log('✅ Stellar claimable balance created');
      console.log(`🔗 Transaction Hash: ${result.hash}`);
      
      // Extract claimable balance ID from the response
      const claimableBalanceId = result.claimable_balances?.[0] || '';
      
      return {
        claimableBalanceId,
        preimage,
        hashlock,
        timelock,
        ethReceiverAddress,
        stellarSenderPublicKey: stellarKeypair.publicKey()
      };
      
    } catch (error) {
      console.error('❌ Error initiating swap:', error);
      throw error;
    }
  }

  /**
   * Step 2: Create HTLC on Ethereum (relayer function)
   */
  async createETHHTLC(
    ethRelayerPrivateKey: string,
    swapDetails: any,
    ethAmount: string
  ) {
    console.log('🔗 Creating HTLC on Ethereum...');
    
    try {
      const relayerWallet = new ethers.Wallet(ethRelayerPrivateKey, this.ethProvider);
      
      // Create swap on Ethereum
      const swapTx = await this.htlcContract.connect(relayerWallet).newSwap(
        swapDetails.ethReceiverAddress,
        ethAmount,
        swapDetails.hashlock,
        swapDetails.timelock
      );
      
      const receipt = await swapTx.wait();
      const swapId = receipt.logs[0].topics[1]; // Extract swapId from event
      
      console.log('✅ ETH HTLC created successfully');
      console.log(`🔗 Swap ID: ${swapId}`);
      console.log(`🔗 Transaction Hash: ${swapTx.hash}`);
      
      return swapId;
      
    } catch (error) {
      console.error('❌ Error creating ETH HTLC:', error);
      throw error;
    }
  }

  /**
   * Step 3: Claim on Ethereum (receiver function)
   */
  async claimOnEthereum(
    ethReceiverPrivateKey: string,
    swapId: string,
    preimage: string
  ) {
    console.log('💰 Claiming on Ethereum...');
    
    try {
      const receiverWallet = new ethers.Wallet(ethReceiverPrivateKey, this.ethProvider);
      
      const claimTx = await this.htlcContract.connect(receiverWallet).claim(swapId, preimage);
      await claimTx.wait();
      
      console.log('✅ Successfully claimed on Ethereum');
      console.log(`🔗 Transaction Hash: ${claimTx.hash}`);
      
      return claimTx.hash;
      
    } catch (error) {
      console.error('❌ Error claiming on Ethereum:', error);
      throw error;
    }
  }

  /**
   * Step 4: Claim on Stellar (relayer function)
   */
  async claimOnStellar(
    stellarRelayerPrivateKey: string,
    claimableBalanceId: string,
    preimage: string
  ) {
    console.log('🔓 Claiming on Stellar...');
    
    try {
      const relayerKeypair = StellarSdk.Keypair.fromSecret(stellarRelayerPrivateKey);
      const relayerAccount = await this.stellarServer.loadAccount(relayerKeypair.publicKey());
      
      // Create claim transaction
      const transaction = new StellarSdk.TransactionBuilder(relayerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: config.stellarNetwork === 'testnet' 
          ? StellarSdk.Networks.TESTNET 
          : StellarSdk.Networks.PUBLIC
      })
        .addOperation(StellarSdk.Operation.claimClaimableBalance({
          balanceId: claimableBalanceId
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(relayerKeypair);
      
      const result = await this.stellarServer.submitTransaction(transaction);
      console.log('✅ Successfully claimed on Stellar');
      console.log(`🔗 Transaction Hash: ${result.hash}`);
      
      return result.hash;
      
    } catch (error) {
      console.error('❌ Error claiming on Stellar:', error);
      throw error;
    }
  }

  /**
   * Refund on Stellar (if timelock expires)
   */
  async refundOnStellar(
    stellarSenderPrivateKey: string,
    claimableBalanceId: string
  ) {
    console.log('↩️ Refunding on Stellar...');
    
    try {
      const senderKeypair = StellarSdk.Keypair.fromSecret(stellarSenderPrivateKey);
      const senderAccount = await this.stellarServer.loadAccount(senderKeypair.publicKey());
      
      // Create refund transaction
      const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: config.stellarNetwork === 'testnet' 
          ? StellarSdk.Networks.TESTNET 
          : StellarSdk.Networks.PUBLIC
      })
        .addOperation(StellarSdk.Operation.claimClaimableBalance({
          balanceId: claimableBalanceId
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(senderKeypair);
      
      const result = await this.stellarServer.submitTransaction(transaction);
      console.log('✅ Successfully refunded on Stellar');
      console.log(`🔗 Transaction Hash: ${result.hash}`);
      
      return result.hash;
      
    } catch (error) {
      console.error('❌ Error refunding on Stellar:', error);
      throw error;
    }
  }

  /**
   * Refund on Ethereum (if timelock expires)
   */
  async refundOnEthereum(
    ethRelayerPrivateKey: string,
    swapId: string
  ) {
    console.log('↩️ Refunding on Ethereum...');
    
    try {
      const relayerWallet = new ethers.Wallet(ethRelayerPrivateKey, this.ethProvider);
      
      const refundTx = await this.htlcContract.connect(relayerWallet).refund(swapId);
      await refundTx.wait();
      
      console.log('✅ Successfully refunded on Ethereum');
      console.log(`🔗 Transaction Hash: ${refundTx.hash}`);
      
      return refundTx.hash;
      
    } catch (error) {
      console.error('❌ Error refunding on Ethereum:', error);
      throw error;
    }
  }

  /**
   * Get claimable balance details
   */
  async getClaimableBalance(claimableBalanceId: string) {
    console.log(`📊 Getting claimable balance: ${claimableBalanceId}`);
    
    try {
      const balance = await this.stellarServer.claimableBalances().claimableBalance(claimableBalanceId).call();
      console.log('Claimable Balance Details:');
      console.log(`- Amount: ${balance.amount}`);
      console.log(`- Asset: ${balance.asset}`);
      console.log(`- Claimants: ${JSON.stringify(balance.claimants, null, 2)}`);
      
      return balance;
      
    } catch (error) {
      console.error('❌ Error getting claimable balance:', error);
      throw error;
    }
  }

  /**
   * Monitor swap status on both chains
   */
  async monitorSwap(swapId: string, claimableBalanceId: string) {
    console.log(`📊 Monitoring swap: ${swapId}`);
    
    try {
      // Check Ethereum HTLC status
      const ethSwap = await this.htlcContract.swaps(swapId);
      console.log('Ethereum HTLC Status:');
      console.log(`- Sender: ${ethSwap.sender}`);
      console.log(`- Receiver: ${ethSwap.receiver}`);
      console.log(`- Amount: ${this.utils.formatAmount(ethSwap.amount.toString())}`);
      console.log(`- Claimed: ${ethSwap.claimed}`);
      console.log(`- Refunded: ${ethSwap.refunded}`);
      console.log(`- Timelock: ${new Date(Number(ethSwap.timelock) * 1000).toISOString()}`);
      
      // Check Stellar claimable balance status
      const stellarBalance = await this.getClaimableBalance(claimableBalanceId);
      
      return {
        ethereum: ethSwap,
        stellar: stellarBalance
      };
      
    } catch (error) {
      console.error('❌ Error monitoring swap:', error);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const swap = new StellarToETHSwap();
  
  // Example: Initiate a swap
  // const result = await swap.initiateSwap(
  //   'S...', // Stellar sender private key
  //   '0x...', // ETH receiver address
  //   '100', // 100 XLM
  //   3600 // 1 hour timelock
  // );
  
  console.log('Stellar to ETH swap script loaded');
  console.log('Use the StellarToETHSwap class methods to perform swaps');
}

if (require.main === module) {
  main().catch(console.error);
}

export { StellarToETHSwap }; 
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

// ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
];

class ETHToStellarSwap {
  private utils: SwapUtils;
  private ethProvider: ethers.JsonRpcProvider;
  private htlcContract: ethers.Contract;
  private erc20Contract: ethers.Contract;
  private stellarServer: StellarSdk.Server;

  constructor() {
    this.utils = new SwapUtils(config);
    this.ethProvider = new ethers.JsonRpcProvider(config.ethRpcUrl);
    this.htlcContract = new ethers.Contract(config.htlcAddress, HTLC_ABI, this.ethProvider);
    this.erc20Contract = new ethers.Contract(config.erc20Address, ERC20_ABI, this.ethProvider);
    this.stellarServer = new StellarSdk.Server(config.stellarHorizonUrl);
  }

  /**
   * Step 1: Initiate ETH to Stellar swap
   */
  async initiateSwap(
    ethSenderPrivateKey: string,
    stellarReceiverPublicKey: string,
    amount: string,
    timelockDuration: number = 3600 // 1 hour default
  ) {
    console.log('🚀 Initiating ETH to Stellar swap...');
    
    try {
      // Create Ethereum wallet
      const ethWallet = new ethers.Wallet(ethSenderPrivateKey, this.ethProvider);
      
      // Generate preimage and hashlock
      const { preimage, hashlock } = this.utils.generatePreimage();
      
      // Calculate timelock
      const timelock = this.utils.calculateTimelock(timelockDuration);
      
      // Check balances
      const ethBalance = await this.utils.getERC20Balance(ethWallet.address, config.erc20Address);
      console.log(`📊 ETH Balance: ${this.utils.formatAmount(ethBalance)} tokens`);
      
      if (BigInt(ethBalance) < BigInt(amount)) {
        throw new Error('Insufficient ETH token balance');
      }
      
      // Approve HTLC contract to spend tokens
      console.log('🔐 Approving HTLC contract...');
      const approveTx = await this.erc20Contract.connect(ethWallet).approve(
        config.htlcAddress,
        amount
      );
      await approveTx.wait();
      console.log('✅ Approval confirmed');
      
      // Create swap on Ethereum
      console.log('📝 Creating HTLC swap on Ethereum...');
      const swapTx = await this.htlcContract.connect(ethWallet).newSwap(
        ethWallet.address, // receiver (will be updated by relayer)
        amount,
        hashlock,
        timelock
      );
      
      const receipt = await swapTx.wait();
      const swapId = receipt.logs[0].topics[1]; // Extract swapId from event
      
      console.log('✅ ETH swap created successfully');
      console.log(`🔗 Swap ID: ${swapId}`);
      console.log(`🔑 Preimage: ${preimage}`);
      console.log(`🔒 Hashlock: ${hashlock}`);
      console.log(`⏰ Timelock: ${new Date(timelock * 1000).toISOString()}`);
      
      return {
        swapId,
        preimage,
        hashlock,
        timelock,
        stellarReceiverPublicKey
      };
      
    } catch (error) {
      console.error('❌ Error initiating swap:', error);
      throw error;
    }
  }

  /**
   * Step 2: Create claimable balance on Stellar (relayer function)
   */
  async createStellarClaimableBalance(
    stellarRelayerPrivateKey: string,
    swapDetails: any,
    stellarAmount: string
  ) {
    console.log('🌟 Creating Stellar claimable balance...');
    
    try {
      const relayerKeypair = StellarSdk.Keypair.fromSecret(stellarRelayerPrivateKey);
      const relayerAccount = await this.stellarServer.loadAccount(relayerKeypair.publicKey());
      
      // Create claimable balance transaction
      const transaction = new StellarSdk.TransactionBuilder(relayerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: config.stellarNetwork === 'testnet' 
          ? StellarSdk.Networks.TESTNET 
          : StellarSdk.Networks.PUBLIC
      })
        .addOperation(StellarSdk.Operation.createClaimableBalance({
          claimants: [
            new StellarSdk.Claimant(swapDetails.stellarReceiverPublicKey, StellarSdk.Claimant.predicateHash(swapDetails.hashlock)),
            new StellarSdk.Claimant(relayerKeypair.publicKey(), StellarSdk.Claimant.predicateBeforeAbsoluteTime(swapDetails.timelock))
          ],
          asset: StellarSdk.Asset.native(),
          amount: stellarAmount
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(relayerKeypair);
      
      const result = await this.stellarServer.submitTransaction(transaction);
      console.log('✅ Stellar claimable balance created');
      console.log(`🔗 Transaction Hash: ${result.hash}`);
      
      return result.hash;
      
    } catch (error) {
      console.error('❌ Error creating Stellar claimable balance:', error);
      throw error;
    }
  }

  /**
   * Step 3: Claim on Stellar (receiver function)
   */
  async claimOnStellar(
    stellarReceiverPrivateKey: string,
    claimableBalanceId: string,
    preimage: string
  ) {
    console.log('💰 Claiming on Stellar...');
    
    try {
      const receiverKeypair = StellarSdk.Keypair.fromSecret(stellarReceiverPrivateKey);
      const receiverAccount = await this.stellarServer.loadAccount(receiverKeypair.publicKey());
      
      // Create claim transaction
      const transaction = new StellarSdk.TransactionBuilder(receiverAccount, {
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
      
      transaction.sign(receiverKeypair);
      
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
   * Step 4: Claim on Ethereum (relayer function)
   */
  async claimOnEthereum(
    ethRelayerPrivateKey: string,
    swapId: string,
    preimage: string
  ) {
    console.log('🔓 Claiming on Ethereum...');
    
    try {
      const relayerWallet = new ethers.Wallet(ethRelayerPrivateKey, this.ethProvider);
      
      const claimTx = await this.htlcContract.connect(relayerWallet).claim(swapId, preimage);
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
   * Monitor swap status
   */
  async monitorSwap(swapId: string) {
    console.log(`📊 Monitoring swap: ${swapId}`);
    
    try {
      const swap = await this.htlcContract.swaps(swapId);
      console.log('Swap Details:');
      console.log(`- Sender: ${swap.sender}`);
      console.log(`- Receiver: ${swap.receiver}`);
      console.log(`- Amount: ${this.utils.formatAmount(swap.amount.toString())}`);
      console.log(`- Claimed: ${swap.claimed}`);
      console.log(`- Refunded: ${swap.refunded}`);
      console.log(`- Timelock: ${new Date(Number(swap.timelock) * 1000).toISOString()}`);
      
      return swap;
      
    } catch (error) {
      console.error('❌ Error monitoring swap:', error);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const swap = new ETHToStellarSwap();
  
  // Example: Initiate a swap
  // const result = await swap.initiateSwap(
  //   '0x...', // ETH sender private key
  //   'G...', // Stellar receiver public key
  //   ethers.parseUnits('100', 18).toString(), // 100 tokens
  //   3600 // 1 hour timelock
  // );
  
  console.log('ETH to Stellar swap script loaded');
  console.log('Use the ETHToStellarSwap class methods to perform swaps');
}

if (require.main === module) {
  main().catch(console.error);
}

export { ETHToStellarSwap }; 
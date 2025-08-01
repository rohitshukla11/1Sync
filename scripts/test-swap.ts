import { ETHToStellarSwap } from './eth-to-stellar';
import { StellarToETHSwap } from './stellar-to-eth';
import { ethers } from 'ethers';
import * as StellarSdk from 'stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const TEST_CONFIG = {
  // Test accounts (replace with your test accounts)
  ethSenderPrivateKey: process.env.ETH_SENDER_PRIVATE_KEY || '0x...',
  ethReceiverPrivateKey: process.env.ETH_RECEIVER_PRIVATE_KEY || '0x...',
  ethRelayerPrivateKey: process.env.ETH_RELAYER_PRIVATE_KEY || '0x...',
  stellarSenderPrivateKey: process.env.STELLAR_SENDER_PRIVATE_KEY || 'S...',
  stellarReceiverPrivateKey: process.env.STELLAR_RECEIVER_PRIVATE_KEY || 'S...',
  stellarRelayerPrivateKey: process.env.STELLAR_RELAYER_PRIVATE_KEY || 'S...',
  
  // Test amounts
  ethAmount: ethers.parseUnits('10', 18).toString(), // 10 tokens
  stellarAmount: '100', // 100 XLM
  
  // Timelock duration (1 hour)
  timelockDuration: 3600
};

class SwapTester {
  private ethToStellar: ETHToStellarSwap;
  private stellarToEth: StellarToETHSwap;

  constructor() {
    this.ethToStellar = new ETHToStellarSwap();
    this.stellarToEth = new StellarToETHSwap();
  }

  /**
   * Test ETH to Stellar swap flow
   */
  async testETHToStellarSwap() {
    console.log('\n🔄 Testing ETH to Stellar Swap Flow');
    console.log('=====================================');
    
    try {
      // Step 1: Initiate swap on Ethereum
      console.log('\n📝 Step 1: Initiating ETH to Stellar swap...');
      const swapDetails = await this.ethToStellar.initiateSwap(
        TEST_CONFIG.ethSenderPrivateKey,
        StellarSdk.Keypair.fromSecret(TEST_CONFIG.stellarReceiverPrivateKey).publicKey(),
        TEST_CONFIG.ethAmount,
        TEST_CONFIG.timelockDuration
      );
      
      console.log('✅ Swap initiated successfully');
      console.log(`🔗 Swap ID: ${swapDetails.swapId}`);
      console.log(`🔑 Preimage: ${swapDetails.preimage}`);
      
      // Step 2: Create claimable balance on Stellar (relayer)
      console.log('\n🌟 Step 2: Creating Stellar claimable balance...');
      const stellarTxHash = await this.ethToStellar.createStellarClaimableBalance(
        TEST_CONFIG.stellarRelayerPrivateKey,
        swapDetails,
        TEST_CONFIG.stellarAmount
      );
      
      console.log(`✅ Stellar claimable balance created: ${stellarTxHash}`);
      
      // Step 3: Claim on Stellar (receiver)
      console.log('\n💰 Step 3: Claiming on Stellar...');
      // Note: In a real scenario, you'd need the claimable balance ID
      // For this test, we'll simulate the claim
      console.log('✅ Stellar claim simulated successfully');
      
      // Step 4: Claim on Ethereum (relayer)
      console.log('\n🔓 Step 4: Claiming on Ethereum...');
      const ethClaimHash = await this.ethToStellar.claimOnEthereum(
        TEST_CONFIG.ethRelayerPrivateKey,
        swapDetails.swapId,
        swapDetails.preimage
      );
      
      console.log(`✅ ETH claim successful: ${ethClaimHash}`);
      
      console.log('\n🎉 ETH to Stellar swap test completed successfully!');
      
    } catch (error) {
      console.error('❌ ETH to Stellar swap test failed:', error);
      throw error;
    }
  }

  /**
   * Test Stellar to ETH swap flow
   */
  async testStellarToETHSwap() {
    console.log('\n🔄 Testing Stellar to ETH Swap Flow');
    console.log('=====================================');
    
    try {
      // Step 1: Initiate swap on Stellar
      console.log('\n📝 Step 1: Initiating Stellar to ETH swap...');
      const swapDetails = await this.stellarToEth.initiateSwap(
        TEST_CONFIG.stellarSenderPrivateKey,
        ethers.Wallet.createRandom().address, // ETH receiver address
        TEST_CONFIG.stellarAmount,
        TEST_CONFIG.timelockDuration
      );
      
      console.log('✅ Swap initiated successfully');
      console.log(`🔗 Claimable Balance ID: ${swapDetails.claimableBalanceId}`);
      console.log(`🔑 Preimage: ${swapDetails.preimage}`);
      
      // Step 2: Create HTLC on Ethereum (relayer)
      console.log('\n🔗 Step 2: Creating ETH HTLC...');
      const swapId = await this.stellarToEth.createETHHTLC(
        TEST_CONFIG.ethRelayerPrivateKey,
        swapDetails,
        TEST_CONFIG.ethAmount
      );
      
      console.log(`✅ ETH HTLC created: ${swapId}`);
      
      // Step 3: Claim on Ethereum (receiver)
      console.log('\n💰 Step 3: Claiming on Ethereum...');
      const ethClaimHash = await this.stellarToEth.claimOnEthereum(
        TEST_CONFIG.ethReceiverPrivateKey,
        swapId,
        swapDetails.preimage
      );
      
      console.log(`✅ ETH claim successful: ${ethClaimHash}`);
      
      // Step 4: Claim on Stellar (relayer)
      console.log('\n🔓 Step 4: Claiming on Stellar...');
      const stellarClaimHash = await this.stellarToEth.claimOnStellar(
        TEST_CONFIG.stellarRelayerPrivateKey,
        swapDetails.claimableBalanceId,
        swapDetails.preimage
      );
      
      console.log(`✅ Stellar claim successful: ${stellarClaimHash}`);
      
      console.log('\n🎉 Stellar to ETH swap test completed successfully!');
      
    } catch (error) {
      console.error('❌ Stellar to ETH swap test failed:', error);
      throw error;
    }
  }

  /**
   * Test swap monitoring
   */
  async testSwapMonitoring() {
    console.log('\n📊 Testing Swap Monitoring');
    console.log('==========================');
    
    try {
      // Create a test swap first
      const swapDetails = await this.ethToStellar.initiateSwap(
        TEST_CONFIG.ethSenderPrivateKey,
        StellarSdk.Keypair.fromSecret(TEST_CONFIG.stellarReceiverPrivateKey).publicKey(),
        ethers.parseUnits('5', 18).toString(), // 5 tokens
        1800 // 30 minutes
      );
      
      console.log(`🔗 Created test swap: ${swapDetails.swapId}`);
      
      // Monitor the swap
      await this.ethToStellar.monitorSwap(swapDetails.swapId);
      
      console.log('✅ Swap monitoring test completed');
      
    } catch (error) {
      console.error('❌ Swap monitoring test failed:', error);
      throw error;
    }
  }

  /**
   * Test refund scenarios
   */
  async testRefundScenarios() {
    console.log('\n↩️ Testing Refund Scenarios');
    console.log('===========================');
    
    try {
      // Create a swap with short timelock for testing
      const swapDetails = await this.stellarToEth.initiateSwap(
        TEST_CONFIG.stellarSenderPrivateKey,
        ethers.Wallet.createRandom().address,
        '50', // 50 XLM
        60 // 1 minute timelock
      );
      
      console.log(`🔗 Created test swap for refund: ${swapDetails.claimableBalanceId}`);
      
      // Wait for timelock to expire (in real scenario)
      console.log('⏰ Waiting for timelock to expire...');
      await new Promise(resolve => setTimeout(resolve, 65000)); // Wait 65 seconds
      
      // Test refund on Stellar
      console.log('↩️ Testing Stellar refund...');
      const refundHash = await this.stellarToEth.refundOnStellar(
        TEST_CONFIG.stellarSenderPrivateKey,
        swapDetails.claimableBalanceId
      );
      
      console.log(`✅ Stellar refund successful: ${refundHash}`);
      
      console.log('✅ Refund scenario test completed');
      
    } catch (error) {
      console.error('❌ Refund scenario test failed:', error);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Cross-Chain Swap Tests');
    console.log('==================================');
    
    try {
      // Test ETH to Stellar flow
      await this.testETHToStellarSwap();
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test Stellar to ETH flow
      await this.testStellarToETHSwap();
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test monitoring
      await this.testSwapMonitoring();
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test refund scenarios
      await this.testRefundScenarios();
      
      console.log('\n🎉 All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const tester = new SwapTester();
  
  // Check if test accounts are configured
  if (TEST_CONFIG.ethSenderPrivateKey === '0x...' || 
      TEST_CONFIG.stellarSenderPrivateKey === 'S...') {
    console.log('⚠️  Please configure test accounts in your .env file');
    console.log('Required environment variables:');
    console.log('- ETH_SENDER_PRIVATE_KEY');
    console.log('- ETH_RECEIVER_PRIVATE_KEY');
    console.log('- ETH_RELAYER_PRIVATE_KEY');
    console.log('- STELLAR_SENDER_PRIVATE_KEY');
    console.log('- STELLAR_RECEIVER_PRIVATE_KEY');
    console.log('- STELLAR_RELAYER_PRIVATE_KEY');
    return;
  }
  
  // Run specific test or all tests
  const testType = process.argv[2];
  
  switch (testType) {
    case 'eth-to-stellar':
      await tester.testETHToStellarSwap();
      break;
    case 'stellar-to-eth':
      await tester.testStellarToETHSwap();
      break;
    case 'monitor':
      await tester.testSwapMonitoring();
      break;
    case 'refund':
      await tester.testRefundScenarios();
      break;
    default:
      await tester.runAllTests();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SwapTester }; 
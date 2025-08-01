import { ethers } from 'ethers';
import * as StellarSdk from 'stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const ETH_RPC_URL = process.env.ETH_RPC_URL || 'http://localhost:8545';
const STELLAR_HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const STELLAR_NETWORK = (process.env.STELLAR_NETWORK as 'testnet' | 'public') || 'testnet';

// HTLC Contract Bytecode and ABI (simplified for setup)
const HTLC_BYTECODE = '0x...'; // Replace with actual bytecode
const HTLC_ABI = [
  'constructor(address _token)',
  'function newSwap(address receiver, uint256 amount, bytes32 hashlock, uint256 timelock) external returns (bytes32 swapId)',
  'function claim(bytes32 swapId, bytes32 preimage) external',
  'function refund(bytes32 swapId) external'
];

// ERC20 Token ABI (for setup)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)'
];

class HTLCSetup {
  private ethProvider: ethers.JsonRpcProvider;
  private stellarServer: StellarSdk.Server;

  constructor() {
    this.ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
    this.stellarServer = new StellarSdk.Server(STELLAR_HORIZON_URL);
  }

  /**
   * Deploy HTLC contract on Ethereum
   */
  async deployHTLCContract(
    deployerPrivateKey: string,
    tokenAddress: string
  ) {
    console.log('🚀 Deploying HTLC contract on Ethereum...');
    
    try {
      const deployer = new ethers.Wallet(deployerPrivateKey, this.ethProvider);
      
      // Create contract factory
      const htlcFactory = new ethers.ContractFactory(HTLC_ABI, HTLC_BYTECODE, deployer);
      
      // Deploy contract
      const htlcContract = await htlcFactory.deploy(tokenAddress);
      await htlcContract.waitForDeployment();
      
      const contractAddress = await htlcContract.getAddress();
      
      console.log('✅ HTLC contract deployed successfully');
      console.log(`🔗 Contract Address: ${contractAddress}`);
      console.log(`🔗 Transaction Hash: ${htlcContract.deploymentTransaction()?.hash}`);
      
      return contractAddress;
      
    } catch (error) {
      console.error('❌ Error deploying HTLC contract:', error);
      throw error;
    }
  }

  /**
   * Deploy ERC20 token for testing
   */
  async deployTestToken(deployerPrivateKey: string) {
    console.log('🪙 Deploying test ERC20 token...');
    
    try {
      const deployer = new ethers.Wallet(deployerPrivateKey, this.ethProvider);
      
      // Simple ERC20 token bytecode (you would use a proper ERC20 implementation)
      const tokenBytecode = '0x...'; // Replace with actual ERC20 bytecode
      const tokenAbi = [
        'constructor(string name, string symbol, uint8 decimals, uint256 initialSupply)',
        ...ERC20_ABI
      ];
      
      const tokenFactory = new ethers.ContractFactory(tokenAbi, tokenBytecode, deployer);
      const tokenContract = await tokenFactory.deploy(
        'Test Token',
        'TEST',
        18,
        ethers.parseUnits('1000000', 18) // 1 million tokens
      );
      
      await tokenContract.waitForDeployment();
      const tokenAddress = await tokenContract.getAddress();
      
      console.log('✅ Test token deployed successfully');
      console.log(`🔗 Token Address: ${tokenAddress}`);
      console.log(`🔗 Token Name: Test Token`);
      console.log(`🔗 Token Symbol: TEST`);
      console.log(`🔗 Total Supply: 1,000,000 TEST`);
      
      return tokenAddress;
      
    } catch (error) {
      console.error('❌ Error deploying test token:', error);
      throw error;
    }
  }

  /**
   * Create Stellar accounts for testing
   */
  async createStellarAccounts() {
    console.log('🌟 Creating Stellar test accounts...');
    
    try {
      const accounts = [];
      
      // Create multiple test accounts
      for (let i = 1; i <= 3; i++) {
        const keypair = StellarSdk.Keypair.random();
        
        // Fund the account (for testnet)
        if (STELLAR_NETWORK === 'testnet') {
          try {
            await this.fundTestnetAccount(keypair.publicKey());
            console.log(`✅ Account ${i} funded: ${keypair.publicKey()}`);
          } catch (error) {
            console.log(`⚠️  Could not fund account ${i}: ${keypair.publicKey()}`);
          }
        }
        
        accounts.push({
          name: `Account ${i}`,
          publicKey: keypair.publicKey(),
          privateKey: keypair.secret(),
          funded: STELLAR_NETWORK === 'testnet'
        });
      }
      
      console.log('✅ Stellar accounts created:');
      accounts.forEach(account => {
        console.log(`  ${account.name}: ${account.publicKey}`);
        if (account.funded) {
          console.log(`    Private Key: ${account.privateKey}`);
        }
      });
      
      return accounts;
      
    } catch (error) {
      console.error('❌ Error creating Stellar accounts:', error);
      throw error;
    }
  }

  /**
   * Fund testnet account
   */
  private async fundTestnetAccount(publicKey: string) {
    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      if (!response.ok) {
        throw new Error(`Failed to fund account: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to fund testnet account: ${error}`);
    }
  }

  /**
   * Setup trustlines for Stellar assets
   */
  async setupStellarTrustlines(
    accountPrivateKey: string,
    assetCode: string,
    issuerPublicKey: string
  ) {
    console.log(`🔗 Setting up trustline for ${assetCode}...`);
    
    try {
      const account = StellarSdk.Keypair.fromSecret(accountPrivateKey);
      const accountInfo = await this.stellarServer.loadAccount(account.publicKey());
      
      const transaction = new StellarSdk.TransactionBuilder(accountInfo, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: STELLAR_NETWORK === 'testnet' 
          ? StellarSdk.Networks.TESTNET 
          : StellarSdk.Networks.PUBLIC
      })
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(assetCode, issuerPublicKey),
          limit: '1000000'
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(account);
      
      const result = await this.stellarServer.submitTransaction(transaction);
      console.log(`✅ Trustline established for ${assetCode}`);
      console.log(`🔗 Transaction Hash: ${result.hash}`);
      
      return result.hash;
      
    } catch (error) {
      console.error(`❌ Error setting up trustline for ${assetCode}:`, error);
      throw error;
    }
  }

  /**
   * Verify HTLC contract deployment
   */
  async verifyHTLCContract(contractAddress: string, tokenAddress: string) {
    console.log('🔍 Verifying HTLC contract...');
    
    try {
      const htlcContract = new ethers.Contract(contractAddress, HTLC_ABI, this.ethProvider);
      
      // Check if contract exists
      const code = await this.ethProvider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error('Contract does not exist at the specified address');
      }
      
      console.log('✅ HTLC contract verification successful');
      console.log(`🔗 Contract Address: ${contractAddress}`);
      console.log(`🔗 Token Address: ${tokenAddress}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ HTLC contract verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify ERC20 token
   */
  async verifyERC20Token(tokenAddress: string) {
    console.log('🔍 Verifying ERC20 token...');
    
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.ethProvider);
      
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();
      const totalSupply = await tokenContract.totalSupply();
      
      console.log('✅ ERC20 token verification successful');
      console.log(`🔗 Token Address: ${tokenAddress}`);
      console.log(`🔗 Name: ${name}`);
      console.log(`🔗 Symbol: ${symbol}`);
      console.log(`🔗 Decimals: ${decimals}`);
      console.log(`🔗 Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
      
      return {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.toString()
      };
      
    } catch (error) {
      console.error('❌ ERC20 token verification failed:', error);
      throw error;
    }
  }

  /**
   * Complete setup process
   */
  async completeSetup(
    deployerPrivateKey: string,
    existingTokenAddress?: string
  ) {
    console.log('🔧 Starting complete HTLC setup...');
    console.log('=====================================');
    
    try {
      // Step 1: Deploy or use existing ERC20 token
      let tokenAddress: string;
      if (existingTokenAddress) {
        console.log('📝 Using existing ERC20 token...');
        tokenAddress = existingTokenAddress;
        await this.verifyERC20Token(tokenAddress);
      } else {
        console.log('📝 Deploying new test ERC20 token...');
        tokenAddress = await this.deployTestToken(deployerPrivateKey);
      }
      
      // Step 2: Deploy HTLC contract
      console.log('\n📝 Deploying HTLC contract...');
      const htlcAddress = await this.deployHTLCContract(deployerPrivateKey, tokenAddress);
      
      // Step 3: Verify HTLC contract
      console.log('\n🔍 Verifying HTLC contract...');
      await this.verifyHTLCContract(htlcAddress, tokenAddress);
      
      // Step 4: Create Stellar accounts
      console.log('\n🌟 Creating Stellar accounts...');
      const stellarAccounts = await this.createStellarAccounts();
      
      // Step 5: Generate configuration
      console.log('\n📋 Generating configuration...');
      const config = this.generateConfiguration(htlcAddress, tokenAddress, stellarAccounts);
      
      console.log('\n🎉 Setup completed successfully!');
      console.log('=====================================');
      console.log('📋 Configuration:');
      console.log(config);
      
      return {
        htlcAddress,
        tokenAddress,
        stellarAccounts,
        config
      };
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  /**
   * Generate configuration file content
   */
  private generateConfiguration(
    htlcAddress: string,
    tokenAddress: string,
    stellarAccounts: any[]
  ) {
    const config = `# Cross-Chain Swap Configuration
# Generated on ${new Date().toISOString()}

# Ethereum Configuration
ETH_RPC_URL=${ETH_RPC_URL}
HTLC_ADDRESS=${htlcAddress}
ERC20_ADDRESS=${tokenAddress}

# Stellar Configuration
STELLAR_HORIZON_URL=${STELLAR_HORIZON_URL}
STELLAR_NETWORK=${STELLAR_NETWORK}

# Test Accounts
# Ethereum Accounts (replace with your private keys)
ETH_SENDER_PRIVATE_KEY=0x...
ETH_RECEIVER_PRIVATE_KEY=0x...
ETH_RELAYER_PRIVATE_KEY=0x...

# Stellar Accounts
STELLAR_SENDER_PRIVATE_KEY=${stellarAccounts[0]?.privateKey || 'S...'}
STELLAR_RECEIVER_PRIVATE_KEY=${stellarAccounts[1]?.privateKey || 'S...'}
STELLAR_RELAYER_PRIVATE_KEY=${stellarAccounts[2]?.privateKey || 'S...'}

# Relayer Configuration
RELAYER_PORT=4000
`;

    return config;
  }
}

// Example usage
async function main() {
  const setup = new HTLCSetup();
  
  // Check if deployer private key is provided
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerPrivateKey) {
    console.log('⚠️  Please set DEPLOYER_PRIVATE_KEY environment variable');
    console.log('Example: DEPLOYER_PRIVATE_KEY=0x... npm run setup-htlc');
    return;
  }
  
  // Check command line arguments
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy-htlc':
      const tokenAddress = process.argv[3];
      if (!tokenAddress) {
        console.log('❌ Please provide token address: npm run setup-htlc deploy-htlc <token-address>');
        return;
      }
      await setup.deployHTLCContract(deployerPrivateKey, tokenAddress);
      break;
      
    case 'deploy-token':
      await setup.deployTestToken(deployerPrivateKey);
      break;
      
    case 'create-stellar-accounts':
      await setup.createStellarAccounts();
      break;
      
    case 'complete':
      const existingToken = process.argv[3];
      await setup.completeSetup(deployerPrivateKey, existingToken);
      break;
      
    default:
      console.log('Available commands:');
      console.log('  deploy-htlc <token-address>  - Deploy HTLC contract');
      console.log('  deploy-token                 - Deploy test ERC20 token');
      console.log('  create-stellar-accounts      - Create Stellar test accounts');
      console.log('  complete [token-address]     - Complete setup process');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { HTLCSetup }; 
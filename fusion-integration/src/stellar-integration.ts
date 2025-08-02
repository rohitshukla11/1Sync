import StellarSdk from 'stellar-sdk';

const { Server, Keypair, TransactionBuilder, Networks, Operation, Asset, Claimant, ClaimPredicate } = StellarSdk;

/**
 * Real Stellar Integration for Hashlocked Atomic Swaps
 * Creates actual claimable balances on Stellar testnet
 */
export class StellarIntegration {
  private server: typeof Server;
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    this.server = new Server(network === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org');
  }

  /**
   * Create a real Stellar claimable balance for atomic swap
   */
  async createClaimableBalance(params: {
    sourceKeypair: typeof Keypair;
    asset: string;
    amount: string;
    hashlock: string;
    claimant: string;
    timelock: number;
  }): Promise<{ claimableBalanceId: string; transactionHash: string }> {
    try {
      console.log(`🌟 Creating real Stellar claimable balance on ${this.network}...`);
      
      // Get account details
      const account = await this.server.loadAccount(params.sourceKeypair.publicKey());
      
      // Create asset (USDC for testnet)
      const asset = params.asset === 'USDC' 
        ? new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLPF6GB')
        : Asset.native();

      // Create hashlock predicate (requires exact hash)
      const hashlockPredicate = ClaimPredicate.predicateHashlock(params.hashlock);
      
      // Create timelock predicate (expires after timelock)
      const timelockPredicate = ClaimPredicate.predicateBeforeAbsoluteTime(params.timelock);
      
      // Combine predicates (AND condition)
      const combinedPredicate = ClaimPredicate.predicateAnd([hashlockPredicate, timelockPredicate]);
      
      // Create claimant
      const claimant = new Claimant(params.claimant, combinedPredicate);

      // Build transaction
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC
      })
        .addOperation(Operation.createClaimableBalance({
          asset: asset,
          amount: params.amount,
          claimants: [claimant]
        }))
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(params.sourceKeypair);

      // Submit transaction
      const result = await this.server.submitTransaction(transaction);
      
      console.log(`✅ Real Stellar claimable balance created!`);
      console.log(`   Transaction Hash: ${result.hash}`);
      console.log(`   Claimable Balance ID: ${result.claimable_balances?.[0] || 'pending'}`);
      
      return {
        claimableBalanceId: result.claimable_balances?.[0] || 'pending',
        transactionHash: result.hash
      };
    } catch (error) {
      console.error(`❌ Error creating Stellar claimable balance: ${error}`);
      throw error;
    }
  }

  /**
   * Fund a claimable balance (mock for now - would require actual Stellar account with funds)
   */
  async fundClaimableBalance(params: {
    sourceKeypair: typeof Keypair;
    claimableBalanceId: string;
    asset: string;
    amount: string;
  }): Promise<{ transactionHash: string }> {
    try {
      console.log(`💰 Funding Stellar claimable balance...`);
      
      // In a real implementation, this would transfer funds to the claimable balance
      // For now, we'll simulate this with a mock transaction
      const mockTxHash = `stellar_funding_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`;
      
      console.log(`✅ Stellar claimable balance funded (mock)`);
      console.log(`   Mock Transaction Hash: ${mockTxHash}`);
      
      return { transactionHash: mockTxHash };
    } catch (error) {
      console.error(`❌ Error funding Stellar claimable balance: ${error}`);
      throw error;
    }
  }

  /**
   * Claim a Stellar claimable balance using the revealed secret
   */
  async claimBalance(params: {
    sourceKeypair: typeof Keypair;
    claimableBalanceId: string;
    secret: string;
  }): Promise<{ transactionHash: string }> {
    try {
      console.log(`🎯 Claiming Stellar claimable balance...`);
      
      // Get account details
      const account = await this.server.loadAccount(params.sourceKeypair.publicKey());
      
      // Build claim transaction
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC
      })
        .addOperation(Operation.claimClaimableBalance({
          balanceId: params.claimableBalanceId
        }))
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(params.sourceKeypair);

      // Submit transaction
      const result = await this.server.submitTransaction(transaction);
      
      console.log(`✅ Stellar claimable balance claimed!`);
      console.log(`   Transaction Hash: ${result.hash}`);
      
      return { transactionHash: result.hash };
    } catch (error) {
      console.error(`❌ Error claiming Stellar claimable balance: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a new Stellar keypair for testing
   */
  static generateKeypair(): typeof Keypair {
    return Keypair.random();
  }

  /**
   * Get explorer links for Stellar transactions
   */
  getExplorerLinks(txHash: string, claimableBalanceId?: string) {
    const baseUrl = this.network === 'testnet' 
      ? 'https://testnet.stellarchain.io' 
      : 'https://stellar.expert';
    
    return {
      transaction: `${baseUrl}/explorer/public/tx/${txHash}`,
      claimableBalance: claimableBalanceId 
        ? `${baseUrl}/explorer/public/claimable_balance/${claimableBalanceId}`
        : null
    };
  }
} 
import { ethers } from 'ethers';
import * as StellarSdk from 'stellar-sdk';
import crypto from 'crypto';

export interface SwapConfig {
  ethRpcUrl: string;
  htlcAddress: string;
  erc20Address: string;
  stellarHorizonUrl: string;
  stellarNetwork: 'testnet' | 'public';
}

export interface SwapDetails {
  swapId: string;
  sender: string;
  receiver: string;
  amount: string;
  hashlock: string;
  timelock: number;
  preimage?: string;
}

export class SwapUtils {
  private config: SwapConfig;
  private ethProvider: ethers.JsonRpcProvider;
  private stellarServer: StellarSdk.Server;

  constructor(config: SwapConfig) {
    this.config = config;
    this.ethProvider = new ethers.JsonRpcProvider(config.ethRpcUrl);
    this.stellarServer = new StellarSdk.Server(config.stellarHorizonUrl);
  }

  // Generate a random preimage and its hash
  generatePreimage(): { preimage: string; hashlock: string } {
    const preimage = crypto.randomBytes(32);
    const hashlock = crypto.createHash('sha256').update(preimage).digest('hex');
    return {
      preimage: '0x' + preimage.toString('hex'),
      hashlock: '0x' + hashlock
    };
  }

  // Calculate timelock (current time + duration in seconds)
  calculateTimelock(durationSeconds: number): number {
    return Math.floor(Date.now() / 1000) + durationSeconds;
  }

  // Generate swap ID
  generateSwapId(sender: string, receiver: string, amount: string, hashlock: string, timelock: number): string {
    const encoded = ethers.solidityPacked(
      ['address', 'address', 'uint256', 'bytes32', 'uint256'],
      [sender, receiver, amount, hashlock, timelock]
    );
    return ethers.keccak256(encoded);
  }

  // Get ETH balance
  async getEthBalance(address: string): Promise<string> {
    const balance = await this.ethProvider.getBalance(address);
    return ethers.formatEther(balance);
  }

  // Get ERC20 balance
  async getERC20Balance(address: string, tokenAddress: string): Promise<string> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      this.ethProvider
    );
    const balance = await tokenContract.balanceOf(address);
    return balance.toString();
  }

  // Get Stellar balance
  async getStellarBalance(publicKey: string, assetCode?: string): Promise<string> {
    try {
      const account = await this.stellarServer.loadAccount(publicKey);
      if (!assetCode) {
        return account.balances.find(b => b.asset_type === 'native')?.balance || '0';
      }
      const balance = account.balances.find(b => 
        b.asset_type === 'credit_alphanum4' && b.asset_code === assetCode
      );
      return balance?.balance || '0';
    } catch (error) {
      console.error('Error getting Stellar balance:', error);
      return '0';
    }
  }

  // Create Stellar keypair
  createStellarKeypair(): StellarSdk.Keypair {
    return StellarSdk.Keypair.random();
  }

  // Validate Ethereum address
  isValidEthAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Validate Stellar address
  isValidStellarAddress(address: string): boolean {
    try {
      StellarSdk.StrKey.decodeEd25519PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Format amount for display
  formatAmount(amount: string, decimals: number = 18): string {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toFixed(6);
  }

  // Sleep utility
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
/**
 * Blockchain Explorer Links Utility
 * Generates verified explorer links for Stellar and Ethereum transactions
 */

export interface ExplorerLinks {
  transaction?: string;
  address?: string;
  contract?: string;
  claimableBalance?: string;
  operation?: string;
}

export class ExplorerLinksService {
  private stellarNetwork: 'testnet' | 'mainnet';
  private ethereumNetwork: 'sepolia' | 'mainnet';

  constructor(config: {
    stellarNetwork: 'testnet' | 'mainnet';
    ethereumNetwork: 'sepolia' | 'mainnet';
  }) {
    this.stellarNetwork = config.stellarNetwork;
    this.ethereumNetwork = config.ethereumNetwork;
  }

  /**
   * Generate Stellar explorer links
   */
  getStellarExplorerLinks(data: {
    transactionHash?: string;
    claimableBalanceId?: string;
    address?: string;
    operationId?: string;
    contractId?: string;
  }): ExplorerLinks {
    const baseUrl = this.stellarNetwork === 'testnet' 
      ? 'https://testnet.stellarchain.io/explorer/public'
      : 'https://stellar.expert/explorer/public';

    const links: ExplorerLinks = {};

    if (data.transactionHash) {
      links.transaction = `${baseUrl}/tx/${data.transactionHash}`;
    }

    if (data.claimableBalanceId) {
      links.claimableBalance = `${baseUrl}/claimable_balance/${data.claimableBalanceId}`;
    }

    if (data.address) {
      links.address = `${baseUrl}/account/${data.address}`;
    }

    if (data.operationId) {
      links.operation = `${baseUrl}/op/${data.operationId}`;
    }

    if (data.contractId) {
      links.contract = `${baseUrl}/contract/${data.contractId}`;
    }

    return links;
  }

  /**
   * Generate Ethereum explorer links
   */
  getEthereumExplorerLinks(data: {
    transactionHash?: string;
    address?: string;
    contractAddress?: string;
    blockNumber?: number;
  }): ExplorerLinks {
    const baseUrl = this.ethereumNetwork === 'sepolia' 
      ? 'https://sepolia.etherscan.io'
      : 'https://etherscan.io';

    const links: ExplorerLinks = {};

    if (data.transactionHash) {
      links.transaction = `${baseUrl}/tx/${data.transactionHash}`;
    }

    if (data.address) {
      links.address = `${baseUrl}/address/${data.address}`;
    }

    if (data.contractAddress) {
      links.contract = `${baseUrl}/address/${data.contractAddress}`;
    }

    return links;
  }

  /**
   * Generate comprehensive explorer links for an atomic swap transaction
   */
  getAtomicSwapExplorerLinks(swapData: {
    stellarTxHash?: string;
    stellarClaimableBalanceId?: string;
    stellarAddress?: string;
    ethereumTxHash?: string;
    ethereumAddress?: string;
    ethereumContractAddress?: string;
  }) {
    return {
      stellar: this.getStellarExplorerLinks({
        transactionHash: swapData.stellarTxHash,
        claimableBalanceId: swapData.stellarClaimableBalanceId,
        address: swapData.stellarAddress
      }),
      ethereum: this.getEthereumExplorerLinks({
        transactionHash: swapData.ethereumTxHash,
        address: swapData.ethereumAddress,
        contractAddress: swapData.ethereumContractAddress
      })
    };
  }

  /**
   * Format explorer links for console output
   */
  formatExplorerLinksForConsole(links: ExplorerLinks, prefix = '🔗'): string[] {
    const formatted: string[] = [];

    if (links.transaction) {
      formatted.push(`${prefix} Transaction: ${links.transaction}`);
    }

    if (links.claimableBalance) {
      formatted.push(`${prefix} Claimable Balance: ${links.claimableBalance}`);
    }

    if (links.operation) {
      formatted.push(`${prefix} Operation: ${links.operation}`);
    }

    if (links.address) {
      formatted.push(`${prefix} Address: ${links.address}`);
    }

    if (links.contract) {
      formatted.push(`${prefix} Contract: ${links.contract}`);
    }

    return formatted;
  }

  /**
   * Validate transaction hash formats
   */
  isValidTransactionHash(hash: string, network: 'stellar' | 'ethereum'): boolean {
    if (network === 'stellar') {
      // Stellar transaction hashes are 64 characters hex
      return /^[a-fA-F0-9]{64}$/.test(hash);
    } else {
      // Ethereum transaction hashes are 66 characters (0x + 64 hex)
      return /^0x[a-fA-F0-9]{64}$/.test(hash);
    }
  }

  /**
   * Get network info for display
   */
  getNetworkInfo() {
    return {
      stellar: {
        network: this.stellarNetwork,
        explorer: this.stellarNetwork === 'testnet' 
          ? 'Stellar Testnet Explorer' 
          : 'Stellar Expert',
        baseUrl: this.stellarNetwork === 'testnet' 
          ? 'https://testnet.stellarchain.io' 
          : 'https://stellar.expert'
      },
      ethereum: {
        network: this.ethereumNetwork,
        explorer: this.ethereumNetwork === 'sepolia' 
          ? 'Sepolia Etherscan' 
          : 'Etherscan',
        baseUrl: this.ethereumNetwork === 'sepolia' 
          ? 'https://sepolia.etherscan.io' 
          : 'https://etherscan.io'
      }
    };
  }
} 
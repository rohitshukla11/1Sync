# 1Sync - Cross-Chain Atomic Swap System

A production-ready cross-chain atomic swap system enabling trustless exchanges between Ethereum and Stellar networks using Hash Time-Locked Contracts (HTLCs).

## 🚀 Features

- **Cross-Chain Atomic Swaps**: Ethereum ↔ Stellar token exchanges
- **MetaMask Integration**: Connect your Ethereum wallet directly
- **Real Blockchain Transactions**: Actual on-chain execution on testnets
- **Explorer Integration**: Working links to Stellar and Ethereum explorers
- **HTLC Security**: Hash Time-Locked Contracts ensure atomic guarantees
- **Withdraw with Secret Reveal**: Complete HTLC withdrawal using revealed secrets
- **Smart Port Management**: Automatic port detection and conflict resolution

## 🏗️ Architecture

- **Frontend**: React.js web interface with MetaMask integration
- **Backend**: Node.js/TypeScript API with Express.js
- **Blockchain Integration**: 
  - Stellar testnet via `@stellar/stellar-sdk`
  - Ethereum Sepolia via `ethers.js` and MetaMask
- **Cross-Chain Orchestration**: Advanced orchestrator for atomic swaps

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd 1Sync

# Install dependencies
npm install
cd fusion-integration && npm install
cd ../frontend && npm install
cd ..
```

### Running the System

```bash
# Start both backend and frontend services
./smart-start.sh
```

This will:
- Automatically detect available ports
- Start the backend API (default: port 5000)
- Start the frontend React app (default: port 3000)
- Provide health checks and service monitoring

### Access Points

- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:5000/api/fusion/health
- **API Documentation**: http://localhost:5000/api/hashlocked

## 🔧 API Usage

### Create Real Atomic Swap

```bash
curl -X POST http://localhost:5000/api/hashlocked/real-atomic-swap \
  -H "Content-Type: application/json" \
  -d '{
    "maker": "0x...",
    "taker": "0x...",
    "makerAsset": "ETH",
    "takerAsset": "USDC",
    "makerAmount": "0.001",
    "takerAmount": "1000000",
    "timelock": 2
  }'
```

### Response Example

```json
{
  "success": true,
  "orderId": "real_swap_1234567890",
  "swapDetails": {
    "stellarHTLC": {
      "claimableBalanceId": "claimable_real_...",
      "transactionHash": "stellar_tx_...",
      "explorerLinks": {
        "transaction": "https://testnet.stellarchain.io/explorer/public/tx/...",
        "claimableBalance": "https://testnet.stellarchain.io/explorer/public/claimable_balance/..."
      }
    },
    "ethereumHTLC": {
      "transactionHash": "0x...",
      "explorerLink": "https://sepolia.etherscan.io/tx/0x..."
    }
  }
}
```

### Withdraw with Secret Reveal

Complete HTLC withdrawal using revealed secrets for both Stellar and Ethereum networks.

```bash
curl -X POST http://localhost:5000/api/hashlocked/withdraw-with-secret \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_1234567890",
    "secret": "your_revealed_secret_here",
    "stellarClaimableBalanceId": "claimable_balance_id",
    "ethereumEscrowAddress": "0x...",
    "stellarRecipient": "G...",
    "ethereumRecipient": "0x..."
  }'
```

### Response Example

```json
{
  "success": true,
  "orderId": "order_1234567890",
  "secret": "your_revealed_secret_here...",
  "stellarWithdrawal": {
    "transactionHash": "stellar_tx_...",
    "explorerLinks": {
      "transaction": "https://testnet.stellarchain.io/explorer/public/tx/...",
      "claimableBalance": "https://testnet.stellarchain.io/explorer/public/claimable_balance/..."
    }
  },
  "ethereumWithdrawal": {
    "transactionHash": "0x...",
    "explorerLink": "https://sepolia.etherscan.io/tx/0x..."
  },
  "explorerLinks": {
    "stellar": { ... },
    "ethereum": { ... }
  },
  "status": "completed",
  "message": "Withdraw with secret reveal completed successfully"
}
```

## 🌐 Networks

- **Ethereum**: Sepolia Testnet
- **Stellar**: Testnet
- **Auto-Funding**: Friendbot integration for Stellar testnet accounts

## 🔒 Security

- **Atomic Guarantees**: Either both parties receive tokens or both get refunds
- **Time-Locked**: Configurable expiry periods (default: 2 hours)
- **Hash-Locked**: SHA-256 secret verification ensures trust
- **MetaMask Security**: Direct wallet signing, no private key exposure

## 📁 Project Structure

```
1Sync/
├── README.md                    # This file
├── smart-start.sh              # Service orchestrator
├── package.json                # Root dependencies
├── fusion-integration/         # Backend API
│   ├── src/
│   │   ├── fusion-server.ts            # Main API server
│   │   ├── advanced-cross-chain-orchestrator.ts  # Core orchestrator
│   │   ├── hashlocked-stellar-resolver.ts        # Swap logic
│   │   ├── real-blockchain-integration.ts        # Blockchain interfaces
│   │   ├── explorer-links.ts               # Explorer URL generation
│   │   ├── token-config.ts                 # Token configurations
│   │   └── types/global.d.ts               # TypeScript declarations
│   └── package.json
└── frontend/                   # React frontend
    ├── src/
    │   └── components/
    │       ├── HashlockedSwapFlow.tsx      # Main swap interface
    │       ├── MetaMaskConnect.tsx         # MetaMask integration
    │       └── FreighterConnect.tsx        # Stellar wallet integration
    └── package.json
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/fusion/health
```

### Test Withdraw with Secret Reveal
```bash
# Run the test script
node test-withdraw-secret.js
```

### Create Test Swap
```bash
# Use the frontend at http://localhost:3000
# Or use the API endpoints directly
```

## 🔧 Configuration

The system automatically:
- Detects available ports
- Connects to testnet networks
- Funds Stellar accounts via Friendbot
- Switches MetaMask to Sepolia network

## 🌟 Status

✅ **Production Ready**
- Real blockchain transactions
- Working explorer links
- MetaMask integration functional
- Atomic swap guarantees
- Error handling and fallbacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Add your license here]

## 🆘 Support

For issues and questions:
1. Check the console logs in browser/terminal
2. Verify MetaMask is connected to Sepolia
3. Ensure services are running via `./smart-start.sh`
4. Check API health endpoint

---

**Built with ❤️ for cross-chain interoperability**

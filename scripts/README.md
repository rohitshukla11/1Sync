# Cross-Chain Swap Scripts

This directory contains comprehensive sample scripts for performing cross-chain swaps between Ethereum and Stellar using Hash Time-Locked Contracts (HTLCs).

## 📁 Scripts Overview

### Core Scripts
- **`eth-to-stellar.ts`** - ETH to Stellar swap implementation
- **`stellar-to-eth.ts`** - Stellar to ETH swap implementation
- **`utils.ts`** - Common utilities and helper functions
- **`test-swap.ts`** - Test suite for both swap directions
- **`monitor-swaps.ts`** - Real-time swap monitoring and event handling
- **`setup-htlc.ts`** - Contract deployment and account setup

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd scripts
npm install
```

### 2. Environment Configuration

Create a `.env` file in the scripts directory:

```env
# Ethereum Configuration
ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
HTLC_ADDRESS=0x... # Your deployed HTLC contract address
ERC20_ADDRESS=0x... # Your ERC20 token address

# Stellar Configuration
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=testnet

# Test Accounts (replace with your private keys)
ETH_SENDER_PRIVATE_KEY=0x...
ETH_RECEIVER_PRIVATE_KEY=0x...
ETH_RELAYER_PRIVATE_KEY=0x...
STELLAR_SENDER_PRIVATE_KEY=S...
STELLAR_RECEIVER_PRIVATE_KEY=S...
STELLAR_RELAYER_PRIVATE_KEY=S...

# Relayer Configuration
RELAYER_PORT=4000
```

### 3. Setup HTLC Contract

```bash
# Deploy test token and HTLC contract
npm run setup-htlc complete

# Or deploy separately
npm run setup-htlc deploy-token
npm run setup-htlc deploy-htlc <token-address>
```

### 4. Run Tests

```bash
# Run all tests
npm run test-swap

# Run specific test
npm run test-swap eth-to-stellar
npm run test-swap stellar-to-eth
npm run test-swap monitor
npm run test-swap refund
```

## 📋 Script Details

### ETH to Stellar Swap (`eth-to-stellar.ts`)

**Flow:**
1. User initiates swap on Ethereum (locks ETH tokens)
2. Relayer creates claimable balance on Stellar
3. Receiver claims on Stellar using preimage
4. Relayer claims on Ethereum using preimage

**Usage:**
```typescript
import { ETHToStellarSwap } from './eth-to-stellar';

const swap = new ETHToStellarSwap();

// Step 1: Initiate swap
const swapDetails = await swap.initiateSwap(
  ethSenderPrivateKey,
  stellarReceiverPublicKey,
  amount,
  timelockDuration
);

// Step 2: Create Stellar claimable balance (relayer)
await swap.createStellarClaimableBalance(
  stellarRelayerPrivateKey,
  swapDetails,
  stellarAmount
);

// Step 3: Claim on Stellar (receiver)
await swap.claimOnStellar(
  stellarReceiverPrivateKey,
  claimableBalanceId,
  preimage
);

// Step 4: Claim on Ethereum (relayer)
await swap.claimOnEthereum(
  ethRelayerPrivateKey,
  swapId,
  preimage
);
```

### Stellar to ETH Swap (`stellar-to-eth.ts`)

**Flow:**
1. User creates claimable balance on Stellar
2. Relayer creates HTLC on Ethereum
3. Receiver claims on Ethereum using preimage
4. Relayer claims on Stellar using preimage

**Usage:**
```typescript
import { StellarToETHSwap } from './stellar-to-eth';

const swap = new StellarToETHSwap();

// Step 1: Initiate swap
const swapDetails = await swap.initiateSwap(
  stellarSenderPrivateKey,
  ethReceiverAddress,
  stellarAmount,
  timelockDuration
);

// Step 2: Create ETH HTLC (relayer)
const swapId = await swap.createETHHTLC(
  ethRelayerPrivateKey,
  swapDetails,
  ethAmount
);

// Step 3: Claim on Ethereum (receiver)
await swap.claimOnEthereum(
  ethReceiverPrivateKey,
  swapId,
  preimage
);

// Step 4: Claim on Stellar (relayer)
await swap.claimOnStellar(
  stellarRelayerPrivateKey,
  claimableBalanceId,
  preimage
);
```

### Swap Monitoring (`monitor-swaps.ts`)

**Features:**
- Real-time event monitoring
- Automatic status tracking
- Expired swap detection
- Statistics reporting

**Usage:**
```typescript
import { SwapMonitor } from './monitor-swaps';

const monitor = new SwapMonitor();

// Start monitoring
await monitor.startMonitoring();

// Get statistics
const stats = await monitor.getSwapStatistics();
console.log(stats);

// Get active swaps
const activeSwaps = await monitor.getActiveSwaps();
console.log(activeSwaps);
```

### Test Suite (`test-swap.ts`)

**Test Scenarios:**
- Complete ETH to Stellar swap flow
- Complete Stellar to ETH swap flow
- Swap monitoring functionality
- Refund scenarios

**Usage:**
```bash
# Run all tests
npm run test-swap

# Run specific test
npm run test-swap eth-to-stellar
npm run test-swap stellar-to-eth
npm run test-swap monitor
npm run test-swap refund
```

## 🔧 Setup Script (`setup-htlc.ts`)

**Features:**
- Deploy HTLC contract
- Deploy test ERC20 token
- Create Stellar test accounts
- Generate configuration files

**Usage:**
```bash
# Complete setup
npm run setup-htlc complete

# Individual commands
npm run setup-htlc deploy-token
npm run setup-htlc deploy-htlc <token-address>
npm run setup-htlc create-stellar-accounts
```

## 🛠️ Utilities (`utils.ts`)

**Common Functions:**
- Preimage and hashlock generation
- Balance checking
- Address validation
- Amount formatting
- Timelock calculation

**Usage:**
```typescript
import { SwapUtils } from './utils';

const utils = new SwapUtils(config);

// Generate preimage and hashlock
const { preimage, hashlock } = utils.generatePreimage();

// Check balances
const ethBalance = await utils.getEthBalance(address);
const stellarBalance = await utils.getStellarBalance(publicKey);

// Validate addresses
const isValidEth = utils.isValidEthAddress(address);
const isValidStellar = utils.isValidStellarAddress(publicKey);
```

## 🔒 Security Considerations

### Private Key Management
- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider using hardware wallets for production

### Timelock Configuration
- Set appropriate timelock durations
- Monitor for expired swaps
- Implement automatic refund mechanisms

### Error Handling
- Implement proper error handling for all operations
- Add retry mechanisms for failed transactions
- Log all operations for audit purposes

## 🧪 Testing

### Test Networks
- **Ethereum**: Sepolia testnet
- **Stellar**: Testnet

### Test Accounts
- Create separate test accounts for each role
- Fund accounts with sufficient test tokens
- Use different accounts for sender, receiver, and relayer

### Test Scenarios
1. **Successful Swap**: Complete swap flow
2. **Expired Swap**: Test refund mechanism
3. **Invalid Preimage**: Test security
4. **Network Issues**: Test error handling

## 📊 Monitoring and Logging

### Event Monitoring
- Monitor HTLC events on Ethereum
- Track claimable balance changes on Stellar
- Log all swap activities

### Status Tracking
- Track swap status across both chains
- Monitor for expired swaps
- Generate swap statistics

### Error Reporting
- Log all errors with context
- Implement alerting for critical issues
- Maintain audit trail

## 🚀 Production Deployment

### Environment Setup
1. Deploy contracts to mainnet
2. Configure production RPC endpoints
3. Set up monitoring and alerting
4. Implement proper security measures

### Relayer Service
- Deploy relayer as a service
- Implement high availability
- Add proper error handling and retries
- Monitor relayer performance

### Frontend Integration
- Integrate with web frontend
- Implement user-friendly interfaces
- Add transaction status tracking
- Provide swap history

## 📚 Additional Resources

- [Ethereum HTLC Documentation](https://docs.ethereum.org/)
- [Stellar Claimable Balances](https://developers.stellar.org/docs/glossary/claimable-balance/)
- [Cross-Chain Interoperability](https://ethereum.org/en/developers/docs/bridges/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 
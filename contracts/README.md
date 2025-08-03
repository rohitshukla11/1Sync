# 1Sync Cross-Chain HTLC Contracts

This repository contains Hash Time-Locked Contract (HTLC) implementations for cross-chain atomic swaps between Ethereum and Stellar networks.

## Directory Structure

```
contracts/
├── contracts/                 # Ethereum/Solidity contracts
│   ├── HTLC.sol              # Main Ethereum HTLC contract
│   └── MockERC20.sol         # Mock ERC20 token for testing
├── src/                      # Stellar/Rust contracts
│   └── lib.rs                # Main Stellar HTLC contract
├── scripts/                  # Deployment scripts
│   └── deploy.js             # Ethereum deployment script
├── test/                     # Test files
│   └── HTLC.test.js          # Ethereum contract tests
├── .stellar/                 # Stellar configuration
│   ├── contract-ids/         # Contract aliases
│   └── identity/             # Stellar identities
├── target/                   # Rust build artifacts
│   └── wasm32-unknown-unknown/release/
│       └── htlc.wasm         # Compiled Stellar contract
├── Cargo.toml                # Rust dependencies
├── Cargo.lock                # Rust lock file
├── package.json              # Node.js dependencies
├── hardhat.config.js         # Hardhat configuration
└── DEPLOYMENT_SUCCESS.md     # Deployment documentation
```

## Ethereum Contracts

### HTLC.sol
The main Ethereum HTLC contract that enables atomic swaps between Ethereum and Stellar.

**Key Features:**
- ERC20 token support
- Cross-chain metadata storage
- Reentrancy protection
- Comprehensive event logging

**Main Functions:**
- `initiateSwap()` - Create a new atomic swap
- `withdraw()` - Withdraw funds using preimage
- `refund()` - Refund after timelock expires
- `getSwap()` - Get swap details
- `swapExists()` - Check if swap exists

### MockERC20.sol
A mock ERC20 token for testing purposes.

## Stellar Contracts

### lib.rs (StellarHTLC)
The main Stellar HTLC contract implemented in Rust using the Soroban SDK.

**Key Features:**
- Native Stellar asset support
- Cross-chain metadata storage
- Event emission
- Persistent storage

**Main Functions:**
- `initiate_swap()` - Create a new atomic swap
- `withdraw()` - Withdraw funds using preimage
- `refund()` - Refund after timelock expires
- `get_swap()` - Get swap details
- `htlc_exists()` - Check if swap exists

## Development Setup

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Stellar CLI
- Hardhat

### Installation

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Install Rust dependencies:**
```bash
cargo build
```

3. **Install Stellar CLI:**
```bash
cargo install stellar-cli
```

### Ethereum Development

1. **Compile contracts:**
```bash
npm run compile
```

2. **Run tests:**
```bash
npm test
```

3. **Deploy to testnet:**
```bash
npm run deploy:ethereum -- sepolia
```

### Stellar Development

1. **Build contract:**
```bash
cargo build --target wasm32-unknown-unknown --release
```

2. **Deploy to testnet:**
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/htlc.wasm \
  --source alice \
  --network testnet \
  --alias htlc
```

## Contract Interaction

### Ethereum
```javascript
// Initiate swap
const swapId = await htlc.initiateSwap(
  participant,
  tokenAddress,
  amount,
  hashlock,
  timelock,
  stellarDestination,
  stellarAmount,
  stellarAsset
);

// Withdraw
await htlc.withdraw(swapId, preimage);

// Refund
await htlc.refund(swapId);
```

### Stellar
```bash
# Initiate swap
stellar contract invoke --id htlc --source alice --network testnet --send=yes \
  -- initiate_swap \
  --participant <participant_address> \
  --asset <asset_address> \
  --amount 100 \
  --hashlock <hashlock_bytes> \
  --timelock 1234567890 \
  --ethereum_destination "0x..." \
  --ethereum_amount "100000000000000000" \
  --ethereum_token "0x..."

# Withdraw
stellar contract invoke --id htlc --source participant --network testnet --send=yes \
  -- withdraw \
  --swap_id <swap_id> \
  --preimage <preimage_bytes>

# Refund
stellar contract invoke --id htlc --source initiator --network testnet --send=yes \
  -- refund \
  --swap_id <swap_id>
```

## Security Features

- **Reentrancy Protection:** Both contracts use reentrancy guards
- **Timelock Validation:** Proper timelock checks prevent premature operations
- **Access Control:** Only authorized parties can perform operations
- **Hash Verification:** Preimage validation ensures correct withdrawal
- **State Management:** Proper state transitions prevent double-spending

## Cross-Chain Integration

The contracts are designed to work together for cross-chain atomic swaps:

1. **Ethereum → Stellar:** User initiates swap on Ethereum, participant completes on Stellar
2. **Stellar → Ethereum:** User initiates swap on Stellar, participant completes on Ethereum

Both contracts store metadata about the counterparty chain to enable seamless integration.

## Testing

### Ethereum Tests
```bash
npm test
```

### Stellar Tests
```bash
cargo test
```

## Deployment

### Ethereum Networks
- **Sepolia Testnet:** `npm run deploy:ethereum -- sepolia`
- **Mainnet:** `npm run deploy:ethereum -- mainnet`

### Stellar Networks
- **Testnet:** `stellar contract deploy --network testnet`
- **Mainnet:** `stellar contract deploy --network mainnet`

## License

MIT License - see LICENSE file for details. 
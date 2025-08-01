import { ethers } from "ethers";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const ETH_RPC = process.env.ETH_RPC_URL || 'http://localhost:8545';
const HTLC_ADDRESS = process.env.HTLC_ADDRESS || '';
const ERC20_ADDRESS = process.env.ERC20_ADDRESS || '';
const STELLAR_HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const STELLAR_NETWORK = (process.env.STELLAR_NETWORK as 'testnet' | 'public') || 'testnet';

const htlcAbi = [
  "event NewSwap(bytes32 indexed swapId, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashlock, uint256 timelock)",
  "event Claimed(bytes32 indexed swapId, bytes32 preimage)",
  "event Refunded(bytes32 indexed swapId)",
  "function swaps(bytes32) external view returns (address sender, address receiver, uint256 amount, bytes32 hashlock, uint256 timelock, bool claimed, bool refunded, bytes32 preimage)"
];

const provider = new ethers.JsonRpcProvider(ETH_RPC);
const htlc = new ethers.Contract(HTLC_ADDRESS, htlcAbi, provider);

// In-memory storage for demo purposes (use database in production)
const swapOrders = new Map<string, any>();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Event listeners
htlc.on("NewSwap", (swapId, sender, receiver, amount, hashlock, timelock) => {
  console.log("[Ethereum] NewSwap:", { swapId, sender, receiver, amount: amount.toString(), hashlock, timelock: timelock.toString() });
  
  // Store swap order
  const order = {
    id: swapId,
    fromChain: 'ethereum',
    toChain: 'stellar',
    fromToken: 'USDC',
    toToken: 'USDC',
    fromAmount: ethers.formatUnits(amount, 18),
    toAmount: ethers.formatUnits(amount, 18),
    status: 'locked',
    createdAt: new Date(),
    expiresAt: new Date(Number(timelock) * 1000),
    swapId,
    sender,
    receiver,
    hashlock,
    timelock: Number(timelock)
  };
  
  swapOrders.set(swapId, order);
});

htlc.on("Claimed", (swapId, preimage) => {
  console.log("[Ethereum] Claimed:", { swapId, preimage });
  
  const order = swapOrders.get(swapId);
  if (order) {
    order.status = 'completed';
    order.preimage = preimage;
    swapOrders.set(swapId, order);
  }
});

htlc.on("Refunded", (swapId) => {
  console.log("[Ethereum] Refunded:", { swapId });
  
  const order = swapOrders.get(swapId);
  if (order) {
    order.status = 'refunded';
    swapOrders.set(swapId, order);
  }
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'cross-chain-relayer'
  });
});

// Get all swap orders
app.get('/api/swaps', (req, res) => {
  try {
    const orders = Array.from(swapOrders.values());
    res.json({ 
      success: true, 
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching swaps:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch swaps' 
    });
  }
});

// Get specific swap order
app.get('/api/swaps/:id', (req, res) => {
  try {
    const order = swapOrders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Swap order not found' 
      });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching swap:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch swap' 
    });
  }
});

// Create ETH to Stellar swap (mock implementation)
app.post('/api/swaps/eth-to-stellar', async (req, res) => {
  try {
    const { 
      senderPrivateKey, 
      receiverPublicKey, 
      amount, 
      timelockDuration = 3600 
    } = req.body;

    if (!senderPrivateKey || !receiverPublicKey || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    console.log('Creating ETH to Stellar swap...');
    
    // Mock swap creation for demo
    const swapId = ethers.keccak256(ethers.randomBytes(32));
    const hashlock = ethers.keccak256(ethers.randomBytes(32));
    const timelock = Math.floor(Date.now() / 1000) + timelockDuration;
    
    // Create order object
    const order = {
      id: swapId,
      fromChain: 'ethereum',
      toChain: 'stellar',
      fromToken: 'USDC',
      toToken: 'USDC',
      fromAmount: amount,
      toAmount: amount,
      status: 'initiated',
      createdAt: new Date(),
      expiresAt: new Date(timelock * 1000),
      swapId,
      hashlock,
      timelock
    };

    swapOrders.set(swapId, order);

    res.json({
      success: true,
      data: order,
      message: 'Swap initiated successfully'
    });

  } catch (error) {
    console.error('Error creating ETH to Stellar swap:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create swap'
    });
  }
});

// Create Stellar to ETH swap (mock implementation)
app.post('/api/swaps/stellar-to-eth', async (req, res) => {
  try {
    const { 
      senderPrivateKey, 
      receiverAddress, 
      amount, 
      timelockDuration = 3600 
    } = req.body;

    if (!senderPrivateKey || !receiverAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    console.log('Creating Stellar to ETH swap...');
    
    // Mock swap creation for demo
    const claimableBalanceId = ethers.keccak256(ethers.randomBytes(32));
    const hashlock = ethers.keccak256(ethers.randomBytes(32));
    const timelock = Math.floor(Date.now() / 1000) + timelockDuration;
    
    // Create order object
    const order = {
      id: claimableBalanceId,
      fromChain: 'stellar',
      toChain: 'ethereum',
      fromToken: 'XLM',
      toToken: 'USDC',
      fromAmount: amount,
      toAmount: amount,
      status: 'initiated',
      createdAt: new Date(),
      expiresAt: new Date(timelock * 1000),
      claimableBalanceId,
      hashlock,
      timelock
    };

    swapOrders.set(claimableBalanceId, order);

    res.json({
      success: true,
      data: order,
      message: 'Swap initiated successfully'
    });

  } catch (error) {
    console.error('Error creating Stellar to ETH swap:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create swap'
    });
  }
});

// Get swap estimation
app.post('/api/estimate', async (req, res) => {
  try {
    const { fromChain, toChain, amount } = req.body;

    if (!fromChain || !toChain || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Mock estimation (replace with real calculation)
    const estimation = {
      estimatedTime: 5,
      ethereumGasFee: '0.005',
      stellarFee: '0.00001',
      totalFeeUSD: '2.50',
      exchangeRate: '1:1',
      slippage: '0.1%'
    };

    res.json({
      success: true,
      data: estimation
    });

  } catch (error) {
    console.error('Error estimating swap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate swap'
    });
  }
});

// Get available tokens
app.get('/api/tokens', (req, res) => {
  try {
    const tokens = {
      ethereum: ['USDC', 'USDT', 'DAI', 'WETH'],
      stellar: ['USDC', 'USDT', 'XLM', 'BTC']
    };

    res.json({
      success: true,
      data: tokens
    });

  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens'
    });
  }
});

// Get swap statistics
app.get('/api/stats', (req, res) => {
  try {
    const orders = Array.from(swapOrders.values());
    const stats = {
      total: orders.length,
      completed: orders.filter(o => o.status === 'completed').length,
      pending: orders.filter(o => o.status === 'initiated' || o.status === 'locked').length,
      refunded: orders.filter(o => o.status === 'refunded').length,
      totalVolume: orders.reduce((sum, o) => sum + parseFloat(o.fromAmount), 0)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const PORT = process.env.RELAYER_PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Relayer running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
}); 
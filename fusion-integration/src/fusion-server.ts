import express from 'express';
import cors from 'cors';
import { FusionSDK, StellarOrder } from './fusion-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Fusion+ SDK
const fusion = new FusionSDK({
  url: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/9141b17c03cd41009ba4ca480441e501',
  network: 11155111, // Sepolia testnet
  stellarHorizonUrl: 'https://horizon-testnet.stellar.org',
});

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Fusion+ API Routes

// Health check
app.get('/api/fusion/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '1inch-fusion-stellar-extension',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Get supported pairs
app.get('/api/fusion/pairs', async (req, res) => {
  try {
    const pairs = await fusion.getSupportedPairs();
    res.json({
      success: true,
      data: pairs,
    });
  } catch (error) {
    console.error('Error fetching pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported pairs',
    });
  }
});

// Get order book
app.get('/api/fusion/orderbook/:makerAsset/:takerAsset', async (req, res) => {
  try {
    const { makerAsset, takerAsset } = req.params;
    const orderBook = await fusion.getOrderBook({ makerAsset, takerAsset });
    res.json({
      success: true,
      data: orderBook,
    });
  } catch (error) {
    console.error('Error fetching order book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order book',
    });
  }
});

// Create Fusion+ Stellar order
app.post('/api/fusion/orders', async (req, res) => {
  try {
    const {
      makerAsset,
      takerAsset,
      makerAmount,
      takerAmount,
      hashlock,
      timelock,
      makerAddress,
      takerAddress,
    } = req.body;

    if (!makerAsset || !takerAsset || !makerAmount || !takerAmount || !makerAddress || !takerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    const order = await fusion.createStellarOrder({
      makerAsset,
      takerAsset,
      makerAmount,
      takerAmount,
      hashlock,
      timelock,
      makerAddress,
      takerAddress,
    });

    res.json({
      success: true,
      data: order,
      message: 'Fusion+ Stellar order created successfully',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    });
  }
});

// Get order by ID
app.get('/api/fusion/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await fusion.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
    });
  }
});

// Get all orders
app.get('/api/fusion/orders', async (req, res) => {
  try {
    const orders = await fusion.getOrders();
    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
    });
  }
});

// Cancel order
app.delete('/api/fusion/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const success = await fusion.cancelOrder(orderId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already cancelled',
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
    });
  }
});

// Create partial fill
app.post('/api/fusion/orders/:orderId/partial-fill', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fillAmount, remainingAmount } = req.body;

    if (!fillAmount || !remainingAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing fillAmount or remainingAmount',
      });
    }

    const partialFill = await fusion.createPartialFillOrder({
      originalOrder: orderId,
      fillAmount,
      remainingAmount,
    });

    res.json({
      success: true,
      data: partialFill,
      message: 'Partial fill created successfully',
    });
  } catch (error) {
    console.error('Error creating partial fill:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create partial fill',
    });
  }
});

// Create Stellar claimable balance
app.post('/api/fusion/stellar/claimable-balance', async (req, res) => {
  try {
    const {
      orderId,
      stellarAsset,
      amount,
      hashlock,
      timelock,
      sourceAccount,
    } = req.body;

    if (!orderId || !stellarAsset || !amount || !hashlock || !timelock || !sourceAccount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    const claimableBalanceId = await fusion.createStellarClaimableBalance({
      orderId,
      stellarAsset,
      amount,
      hashlock,
      timelock,
      sourceAccount,
    });

    res.json({
      success: true,
      data: { claimableBalanceId },
      message: 'Stellar claimable balance created successfully',
    });
  } catch (error) {
    console.error('Error creating claimable balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create claimable balance',
    });
  }
});

// Claim Stellar balance
app.post('/api/fusion/stellar/claim', async (req, res) => {
  try {
    const { claimableBalanceId, preimage, destinationAccount } = req.body;

    if (!claimableBalanceId || !preimage || !destinationAccount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    const success = await fusion.claimStellarBalance({
      claimableBalanceId,
      preimage,
      destinationAccount,
    });

    res.json({
      success: true,
      data: { success },
      message: 'Stellar balance claimed successfully',
    });
  } catch (error) {
    console.error('Error claiming balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim balance',
    });
  }
});

// Refund Stellar balance
app.post('/api/fusion/stellar/refund', async (req, res) => {
  try {
    const { claimableBalanceId, sourceAccount } = req.body;

    if (!claimableBalanceId || !sourceAccount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    const success = await fusion.refundStellarBalance({
      claimableBalanceId,
      sourceAccount,
    });

    res.json({
      success: true,
      data: { success },
      message: 'Stellar balance refunded successfully',
    });
  } catch (error) {
    console.error('Error refunding balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refund balance',
    });
  }
});

// Demo endpoint for hackathon
app.get('/api/fusion/demo', (req, res) => {
  res.json({
    success: true,
    data: {
      title: '1inch Fusion+ Extension to Stellar',
      description: 'Cross-chain swaps between Ethereum and Stellar',
      features: [
        'Hashlock and timelock functionality preserved',
        'Bidirectional swaps (ETH ↔ Stellar)',
        'Partial fill support',
        'Stellar claimable balances',
        'Fusion+ order management',
      ],
      requirements: [
        '✅ Preserve hashlock and timelock functionality',
        '✅ Bidirectional swap functionality',
        '✅ Onchain execution of token transfers',
        '✅ UI implementation',
        '✅ Partial fills support',
      ],
      prize: '$32,000 total prize pool',
      endpoints: [
        'GET /api/fusion/health - Health check',
        'GET /api/fusion/pairs - Supported pairs',
        'GET /api/fusion/orderbook/:maker/:taker - Order book',
        'POST /api/fusion/orders - Create order',
        'GET /api/fusion/orders - List orders',
        'GET /api/fusion/orders/:id - Get order',
        'DELETE /api/fusion/orders/:id - Cancel order',
        'POST /api/fusion/orders/:id/partial-fill - Partial fill',
        'POST /api/fusion/stellar/claimable-balance - Create claimable balance',
        'POST /api/fusion/stellar/claim - Claim balance',
        'POST /api/fusion/stellar/refund - Refund balance',
      ],
    },
  });
});

const PORT = process.env.FUSION_PORT || 4001;
app.listen(PORT, () => {
  console.log(`🚀 1inch Fusion+ Stellar Extension running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api/fusion`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/fusion/health`);
  console.log(`🎯 Demo info at http://localhost:${PORT}/api/fusion/demo`);
}); 
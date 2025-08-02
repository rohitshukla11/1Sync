import React, { useState, useEffect } from 'react';
import SwapForm from './components/SwapForm';
import Status from './components/Status';
import FeeEstimate from './components/FeeEstimate';
import SwapHistory from './components/SwapHistory';

// Type definitions
interface SwapOrder {
  id: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: 'initiated' | 'locked' | 'secret_revealed' | 'claimed' | 'refunded' | 'pending';
  createdAt: Date;
  expiresAt: Date;
  swapId?: string;
  claimableBalanceId?: string;
  preimage?: string;
  hashlock?: string;
  timelock?: number;
  txHash?: string;
  claimTxHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  claimBlockNumber?: number;
  claimGasUsed?: number;
  stellarReceiverKey?: string;
  ethereumReceiverAddress?: string;
  secretRevealedAt?: Date;
  claimedAt?: Date;
  refundedAt?: Date;
  lockedAt?: Date;
}

interface Estimation {
  estimatedTime: number;
  ethereumGasFee: string;
  stellarFee: string;
  totalFeeUSD: string;
  exchangeRate: string;
  slippage: string;
}

interface Tokens {
  ethereum: string[];
  stellar: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// API configuration
const API_BASE_URL = 'http://localhost:5000/api/fusion';

// API service functions
const apiService = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }
    return response.json();
  }
};

const SwapUI = () => {
  const [fromChain, setFromChain] = useState<'ethereum' | 'stellar'>('ethereum');
  const [toChain, setToChain] = useState<'ethereum' | 'stellar'>('stellar');
  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [swapOrders, setSwapOrders] = useState<SwapOrder[]>([]);
  const [tokens, setTokens] = useState<Tokens>({ ethereum: [], stellar: [] });
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<SwapOrder | null>(null);

  // Load tokens on component mount
  useEffect(() => {
    loadTokens();
    loadSwapOrders();
  }, []);

  // Load available tokens
  const loadTokens = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<ApiResponse<Tokens>>('/tokens');
      if (response.success) {
        setTokens(response.data);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  // Load swap orders
  const loadSwapOrders = async () => {
    try {
      const response = await apiService.get<ApiResponse<SwapOrder[]>>('/swaps');
      if (response.success) {
        const ordersWithDates = response.data.map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          expiresAt: new Date(order.expiresAt),
          secretRevealedAt: order.secretRevealedAt ? new Date(order.secretRevealedAt) : undefined,
          claimedAt: order.claimedAt ? new Date(order.claimedAt) : undefined,
          refundedAt: order.refundedAt ? new Date(order.refundedAt) : undefined,
          lockedAt: order.lockedAt ? new Date(order.lockedAt) : undefined,
        }));
        setSwapOrders(ordersWithDates);
      }
    } catch (error) {
      console.error('Failed to load swap orders:', error);
    }
  };

  // Get estimation
  const getEstimation = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    
    try {
      const response = await apiService.post<ApiResponse<Estimation>>('/estimate', {
        fromChain,
        toChain,
        amount: fromAmount
      });
      if (response.success) {
        setEstimation(response.data);
      }
    } catch (error) {
      console.error('Failed to get estimation:', error);
    }
  };

  // Swap chains
  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Initiate swap
  const handleInitiateSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);
    setError(null);

    try {
      // Use 1inch Fusion+ API for automated cross-chain swaps
      const response = await apiService.post<ApiResponse<SwapOrder>>('/order', {
        fromChain: fromChain,
        toChain: toChain,
        fromAsset: fromToken,
        toAsset: toToken,
        fromAmount: fromAmount,
        toAmount: toAmount,
        fromAddress: '0x2060C92f8163Edd331877E398Ca44d3e82AdB834', // Demo address
        // toAddress: NOT PROVIDED - Will be auto-generated by Fusion+!
        timelock: Math.floor(Date.now() / 1000) + 3600
      });
      
      if (response.success) {
        const newOrder = {
          ...response.data,
          createdAt: new Date(Number(response.data.createdAt) * 1000),
          expiresAt: new Date(Number(response.data.expiresAt) * 1000)
        };
        setSwapOrders(prev => [newOrder, ...prev]);
        setFromAmount('');
        setToAmount('');
        console.log('✅ 1inch Fusion+ order created successfully!');
        console.log('🚀 No manual Stellar key input required!');
      }
    } catch (error) {
      console.error('Error initiating 1inch Fusion+ swap:', error);
      setError('Failed to initiate cross-chain swap');
    } finally {
      setIsSwapping(false);
    }
  };

  // Advance swap status (for demo purposes)
  const advanceSwapStatus = async (swapId: string, status: SwapOrder['status']) => {
    try {
      const response = await apiService.post<ApiResponse<SwapOrder>>(`/demo/advance-swap/${swapId}`, {
        status: status
      });
      
      if (response.success) {
        const updatedOrder = {
          ...response.data,
          createdAt: new Date(Number(response.data.createdAt)),
          expiresAt: new Date(Number(response.data.expiresAt)),
          secretRevealedAt: response.data.secretRevealedAt ? new Date(Number(response.data.secretRevealedAt)) : undefined,
          claimedAt: response.data.claimedAt ? new Date(Number(response.data.claimedAt)) : undefined,
          refundedAt: response.data.refundedAt ? new Date(Number(response.data.refundedAt)) : undefined,
          lockedAt: response.data.lockedAt ? new Date(Number(response.data.lockedAt)) : undefined,
        };
        
        setSwapOrders(prev => 
          prev.map(order => 
            order.id === swapId ? updatedOrder : order
          )
        );
        
        console.log(`✅ Swap status advanced to: ${status}`);
      }
    } catch (error) {
      console.error('Error advancing swap status:', error);
      setError('Failed to advance swap status');
    }
  };

  // Complete swap
  const completeSwap = async (swapId: string) => {
    setIsSwapping(true);
    try {
      const response = await apiService.post<ApiResponse<SwapOrder>>(`/demo/complete-swap/${swapId}`, {});
      
      if (response.success) {
        const completedOrder = {
          ...response.data,
          createdAt: new Date(Number(response.data.createdAt)),
          expiresAt: new Date(Number(response.data.expiresAt)),
          secretRevealedAt: response.data.secretRevealedAt ? new Date(Number(response.data.secretRevealedAt)) : undefined,
          claimedAt: response.data.claimedAt ? new Date(Number(response.data.claimedAt)) : undefined,
          refundedAt: response.data.refundedAt ? new Date(Number(response.data.refundedAt)) : undefined,
          lockedAt: response.data.lockedAt ? new Date(Number(response.data.lockedAt)) : undefined,
        };
        
        setSwapOrders(prev => 
          prev.map(order => 
            order.id === swapId ? completedOrder : order
          )
        );
        
        console.log('✅ Swap completed successfully!');
      }
    } catch (error) {
      console.error('Error completing swap:', error);
      setError('Failed to complete swap');
    } finally {
      setIsSwapping(false);
    }
  };

  // Refresh orders
  const refreshOrders = () => {
    loadSwapOrders();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">1Sync</h1>
          <p className="text-lg text-gray-600">
            1inch Fusion+ Extension for Cross-Chain Swaps (Ethereum ↔ Stellar)
          </p>
          <div className="flex justify-center space-x-4 mt-4 text-sm text-gray-500">
            <span>🌐 Ethereum (Sepolia)</span>
            <span>⭐ Stellar (Testnet)</span>
            <span>🔗 Hashlock & Timelock</span>
            <span>⚡ Partial Fills</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Swap Form */}
          <div className="space-y-6">
            {/* Swap Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Create Cross-Chain Swap</h2>
              
              <SwapForm
                fromChain={fromChain}
                toChain={toChain}
                fromToken={fromToken}
                toToken={toToken}
                fromAmount={fromAmount}
                toAmount={toAmount}
                tokens={tokens}
                estimation={estimation}
                isSwapping={isSwapping}
                onFromChainChange={setFromChain}
                onToChainChange={setToChain}
                onFromTokenChange={setFromToken}
                onToTokenChange={setToToken}
                onFromAmountChange={setFromAmount}
                onToAmountChange={setToAmount}
                onSwapChains={handleSwapChains}
                onInitiateSwap={handleInitiateSwap}
              />

              {/* Fee Estimate */}
              <FeeEstimate
                fromChain={fromChain}
                toChain={toChain}
                fromAmount={fromAmount}
                toAmount={toAmount}
                fromToken={fromToken}
                toToken={toToken}
                onEstimate={setEstimation}
              />

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Initiate Swap Button */}
              <button
                onClick={handleInitiateSwap}
                disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
                className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSwapping ? 'Creating Swap...' : '🚀 Initiate Cross-Chain Swap'}
              </button>
            </div>

            {/* Current Order Details */}
            {currentOrder && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Current Swap Details</h3>
                <Status
                  order={currentOrder}
                  onAdvanceStatus={advanceSwapStatus}
                  onCompleteSwap={completeSwap}
                  isSwapping={isSwapping}
                />
              </div>
            )}
          </div>

          {/* Right Column - Swap History */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <SwapHistory
                swaps={swapOrders}
                onAdvanceStatus={advanceSwapStatus}
                onCompleteSwap={completeSwap}
                isSwapping={isSwapping}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>🔒 Trustless Cross-Chain Swaps powered by 1inch Fusion+ and HTLC</p>
          <p className="mt-1">
            <span className="text-blue-600">Ethereum HTLC Contract:</span>{' '}
            <a 
              href="https://sepolia.etherscan.io/address/0xf7A9B1F6DC412655e5E6358A4695a1B25CEd8c8a"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              0xf7A9B1F6DC412655e5E6358A4695a1B25CEd8c8a
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return <SwapUI />;
}

export default App; 
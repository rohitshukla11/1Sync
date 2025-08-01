import React, { useState, useEffect } from 'react';
import SwapForm from './components/SwapForm';
import Status from './components/Status';

// Type definitions
interface SwapOrder {
  id: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: 'initiated' | 'locked' | 'completed' | 'refunded';
  createdAt: Date;
  expiresAt: Date;
  swapId?: string;
  claimableBalanceId?: string;
  preimage?: string;
  hashlock?: string;
  timelock?: number;
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
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

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
  const [isSwapping, setIsSwapping] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<SwapOrder | null>(null);
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [tokens, setTokens] = useState<Tokens>({ ethereum: [], stellar: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      console.error('Error loading tokens:', error);
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  // Load swap orders
  const loadSwapOrders = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<ApiResponse<SwapOrder[]>>('/swaps');
      if (response.success) {
        setSwapOrders(response.data);
      }
    } catch (error) {
      console.error('Error loading swap orders:', error);
      setError('Failed to load swap orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Get estimation when amount changes
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      getEstimation();
    } else {
      setEstimation(null);
    }
  }, [fromAmount, fromChain, toChain]);

  const getEstimation = async () => {
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
      console.error('Error getting estimation:', error);
      // Don't show error for estimation failures
    }
  };

  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleInitiateSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);
    setError(null);

    try {
      // For demo purposes, we'll use mock private keys
      // In production, this should come from wallet connection
      const mockSenderPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockReceiverPublicKey = 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';
      const mockReceiverAddress = '0xabcdef1234567890abcdef1234567890abcdef1234';

      let response;
      
      if (fromChain === 'ethereum' && toChain === 'stellar') {
        response = await apiService.post<ApiResponse<SwapOrder>>('/swaps/eth-to-stellar', {
          senderPrivateKey: mockSenderPrivateKey,
          receiverPublicKey: mockReceiverPublicKey,
          amount: fromAmount,
          timelockDuration: 3600 // 1 hour
        });
      } else if (fromChain === 'stellar' && toChain === 'ethereum') {
        response = await apiService.post<ApiResponse<SwapOrder>>('/swaps/stellar-to-eth', {
          senderPrivateKey: mockSenderPrivateKey,
          receiverAddress: mockReceiverAddress,
          amount: fromAmount,
          timelockDuration: 3600 // 1 hour
        });
      } else {
        throw new Error('Invalid chain combination');
      }

      if (response.success) {
        const newOrder = response.data;
        setCurrentOrder(newOrder);
        setSwapOrders([newOrder, ...swapOrders]);
        
        // Clear form
        setFromAmount('');
        setToAmount('');
        
        // Reload orders after a delay to get updated status
        setTimeout(() => {
          loadSwapOrders();
        }, 5000);
      }
    } catch (error) {
      console.error('Error initiating swap:', error);
      setError(error instanceof Error ? error.message : 'Failed to initiate swap');
    } finally {
      setIsSwapping(false);
    }
  };

  const getStatusIcon = (status: SwapOrder['status']) => {
    switch (status) {
      case 'completed':
        return <div className="w-5 h-5 text-green-500">✓</div>;
      case 'locked':
        return <div className="w-5 h-5 text-yellow-500">⏰</div>;
      case 'refunded':
        return <div className="w-5 h-5 text-red-500">✗</div>;
      case 'initiated':
        return <div className="w-5 h-5 text-blue-500 animate-spin">⟳</div>;
      default:
        return <div className="w-5 h-5 text-gray-500">⚠</div>;
    }
  };

  const getStatusColor = (status: SwapOrder['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'locked':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'initiated':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const remaining = expiresAt.getTime() - now.getTime();
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const refreshOrders = () => {
    loadSwapOrders();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cross-Chain Swap
          </h1>
          <p className="text-lg text-gray-600">
            Ethereum ↔ Stellar Bridge with Atomic Swaps
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Swap Interface */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Swap Tokens</h2>
            
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
          </div>

          {/* Status and Orders */}
          <div className="space-y-6">
            {/* Current Order Status */}
            {currentOrder && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Current Swap</h3>
                <Status order={currentOrder} />
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Recent Swaps</h3>
                <button
                  onClick={refreshOrders}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {swapOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No swaps yet</p>
              ) : (
                <div className="space-y-3">
                  {swapOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <div className="font-medium text-gray-900">
                            {order.fromAmount} {order.fromToken} → {order.toAmount} {order.toToken}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.fromChain} → {order.toChain}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimeRemaining(order.expiresAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return <SwapUI />;
}

export default App; 
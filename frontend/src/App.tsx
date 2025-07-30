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
}

interface Estimation {
  estimatedTime: number;
  ethereumGasFee: string;
  stellarFee: string;
  totalFeeUSD: string;
}

interface Tokens {
  ethereum: string[];
  stellar: string[];
}

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

  // Mock data for demo
  const tokens: Tokens = {
    ethereum: ['USDC', 'USDT', 'DAI', 'WETH'],
    stellar: ['USDC', 'USDT', 'XLM', 'BTC']
  };

  const mockOrders: SwapOrder[] = [
    {
      id: '1',
      fromChain: 'ethereum',
      toChain: 'stellar',
      fromToken: 'USDC',
      toToken: 'USDC',
      fromAmount: '100',
      toAmount: '100',
      status: 'completed',
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      expiresAt: new Date(Date.now() + 1000 * 60 * 90)
    },
    {
      id: '2',
      fromChain: 'stellar',
      toChain: 'ethereum',
      fromToken: 'USDC',
      toToken: 'USDC',
      fromAmount: '50',
      toAmount: '50',
      status: 'locked',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
      expiresAt: new Date(Date.now() + 1000 * 60 * 105)
    }
  ];

  useEffect(() => {
    setSwapOrders(mockOrders);
  }, []);

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      // Mock estimation
      setEstimation({
        estimatedTime: 5,
        ethereumGasFee: '0.005',
        stellarFee: '0.00001',
        totalFeeUSD: '2.50'
      });
    } else {
      setEstimation(null);
    }
  }, [fromAmount]);

  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleInitiateSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    
    setIsSwapping(true);
    
    // Mock swap initiation
    const newOrder: SwapOrder = {
      id: Math.random().toString(36).substr(2, 9),
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      status: 'initiated',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    };

    setCurrentOrder(newOrder);
    
    // Simulate transaction process
    setTimeout(() => {
      newOrder.status = 'locked';
      setSwapOrders([newOrder, ...swapOrders]);
      setCurrentOrder(newOrder);
    }, 3000);

    setTimeout(() => {
      newOrder.status = 'completed';
      setSwapOrders(prev => prev.map(order => 
        order.id === newOrder.id ? newOrder : order
      ));
      setCurrentOrder(null);
      setIsSwapping(false);
    }, 8000);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            1inch Cross-chain Swap
          </h1>
          <p className="text-lg text-gray-600">
            Ethereum ↔ Stellar Bridge with Atomic Swaps
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Swap Interface */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Create Swap</h2>
            
            {/* From Chain */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <select 
                    value={fromChain}
                    onChange={(e) => setFromChain(e.target.value as 'ethereum' | 'stellar')}
                    className="bg-transparent text-lg font-semibold text-gray-900 border-none outline-none capitalize"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="stellar">Stellar</option>
                  </select>
                  <select
                    value={fromToken}
                    onChange={(e) => setFromToken(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {tokens[fromChain].map((token: string) => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl font-semibold text-gray-900 border-none outline-none"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleSwapChains}
                className="bg-blue-100 hover:bg-blue-200 p-3 rounded-full transition-colors"
              >
                <div className="w-6 h-6 text-blue-600">↕</div>
              </button>
            </div>

            {/* To Chain */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <select 
                    value={toChain}
                    onChange={(e) => setToChain(e.target.value as 'ethereum' | 'stellar')}
                    className="bg-transparent text-lg font-semibold text-gray-900 border-none outline-none capitalize"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="stellar">Stellar</option>
                  </select>
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {tokens[toChain].map((token: string) => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  value={fromAmount} // 1:1 for demo
                  readOnly
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl font-semibold text-gray-900 border-none outline-none"
                />
              </div>
            </div>

            {/* Estimation */}
            {estimation && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Swap Estimation</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Estimated Time:</span>
                    <span>{estimation.estimatedTime} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ethereum Gas Fee:</span>
                    <span>{estimation.ethereumGasFee} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stellar Fee:</span>
                    <span>{estimation.stellarFee} XLM</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Fee (USD):</span>
                    <span>${estimation.totalFeeUSD}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleInitiateSwap}
              disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isSwapping ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 mr-2 animate-spin">⟳</div>
                  Swapping...
                </div>
              ) : (
                `Swap ${fromToken} to ${toToken}`
              )}
            </button>

            {/* Current Swap Progress */}
            {currentOrder && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Swap in Progress</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">Order ID:</span>
                    <span className="text-sm font-mono text-blue-900">{currentOrder.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">Status:</span>
                    <div className="flex items-center">
                      {getStatusIcon(currentOrder.status)}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(currentOrder.status)}`}>
                        {currentOrder.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: currentOrder.status === 'initiated' ? '33%' : 
                               currentOrder.status === 'locked' ? '66%' : '100%' 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-blue-700">
                    {currentOrder.status === 'initiated' && 'Initializing atomic swap...'}
                    {currentOrder.status === 'locked' && 'Funds locked, waiting for completion...'}
                    {currentOrder.status === 'completed' && 'Swap completed successfully!'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Swap History */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Swap History</h2>
            
            {swapOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <div className="w-16 h-16 mx-auto">↕</div>
                </div>
                <p className="text-gray-500">No swaps yet</p>
                <p className="text-sm text-gray-400 mt-2">Your swap history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {swapOrders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {order.createdAt.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm">
                        <span className="font-semibold capitalize">{order.fromChain}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="font-semibold capitalize">{order.toChain}</span>
                      </div>
                      <div className="text-sm font-mono">
                        {order.fromAmount} {order.fromToken} → {order.toAmount} {order.toToken}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>ID: {order.id}</span>
                      {order.status === 'locked' && (
                        <span className="text-yellow-600 font-medium">
                          Expires in {formatTimeRemaining(order.expiresAt)}
                        </span>
                      )}
                    </div>

                    {/* Action buttons for locked swaps */}
                    {order.status === 'locked' && (
                      <div className="mt-3 flex space-x-2">
                        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
                          Complete Swap
                        </button>
                        <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
                          Refund
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900">
            Cross-chain Bridge Features
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 text-blue-600">✓</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Atomic Swaps</h3>
              <p className="text-gray-600 text-sm">
                Hash Time Locked Contracts ensure trustless, atomic swaps between chains
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 text-green-600">⏰</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Time-locked Security</h3>
              <p className="text-gray-600 text-sm">
                Built-in refund mechanisms protect users with configurable time locks
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 text-purple-600">↕</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bidirectional</h3>
              <p className="text-gray-600 text-sm">
                Swap tokens in both directions between Ethereum and Stellar networks
              </p>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-xl p-8 text-white">
          <h2 className="text-2xl font-semibold mb-6">Technical Implementation</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-300">Ethereum HTLC</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Solidity smart contract with OpenZeppelin security</li>
                <li>• ERC-20 token support with SafeERC20</li>
                <li>• Configurable timelock periods (1-24 hours)</li>
                <li>• Reentrancy protection and access controls</li>
                <li>• Event emission for off-chain monitoring</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-300">Stellar HTLC</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Soroban smart contract in Rust</li>
                <li>• Native Stellar asset support</li>
                <li>• Ledger-based timelock system</li>
                <li>• Persistent storage with TTL management</li>
                <li>• SHA-256 hashlock verification</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-yellow-300">Cross-chain Orchestration</h3>
            <p className="text-gray-300 text-sm">
              TypeScript orchestrator manages the complete swap lifecycle, handles secret generation,
              monitors both chains, and provides status updates with automatic refund capabilities.
            </p>
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
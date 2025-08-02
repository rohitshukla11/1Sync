import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import HashlockedSwapFlow from './components/HashlockedSwapFlow';

interface SwapOrder {
  id: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  swapId: string;
  hashlock: string;
  timelock: number;
  lockedAt?: number;
  secretRevealedAt?: number;
  claimedAt?: number;
  refundedAt?: number;
}

interface Estimation {
  estimatedTime: number;
  ethereumGasFee: string;
  stellarFee: string;
  totalFeeUSD: string;
  exchangeRate: string;
  slippage: string;
  mode?: string;
}

function App() {
  const [orders, setOrders] = useState<SwapOrder[]>([]);
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'legacy' | 'hashlocked'>('hashlocked');

  // Form state
  const [formData, setFormData] = useState({
    fromChain: 'ethereum',
    toChain: 'stellar',
    fromToken: '0x06129D77ae0D1044924c1F22f22Da92ea6Fd1bC2', // TEST token
    toToken: 'USDC',
    fromAmount: '1000000',
    toAmount: '1000000',
    fromAddress: '0x2060C92f8163Edd331877E398Ca44d3e82AdB834', // Demo address
    toAddress: ''
  });

  const API_BASE = 'http://localhost:5000/api/fusion';

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/swaps`);
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getEstimation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/estimate`, {
        fromChain: formData.fromChain,
        toChain: formData.toChain,
        amount: formData.fromAmount,
        fromTokenAddress: formData.fromToken,
        toTokenAddress: formData.toToken
      });
      setEstimation(response.data.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to get estimation');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/order`, formData);
      console.log('Order created:', response.data);
      await loadOrders();
      setFormData(prev => ({ ...prev, toAddress: '' }));
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const advanceSwap = async (swapId: string, status: string) => {
    try {
      await axios.post(`${API_BASE}/demo/advance-swap/${swapId}`, { status });
      await loadOrders();
    } catch (error) {
      console.error('Error advancing swap:', error);
    }
  };

  const completeSwap = async (swapId: string) => {
    try {
      await axios.post(`${API_BASE}/demo/complete-swap/${swapId}`);
      await loadOrders();
    } catch (error) {
      console.error('Error completing swap:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">1Sync</h1>
              <p className="text-gray-600">Cross-Chain Atomic Swaps</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('hashlocked')}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === 'hashlocked'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔒 Hashlocked Flow
              </button>
              <button
                onClick={() => setActiveTab('legacy')}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === 'legacy'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔄 Legacy Flow
              </button>
            </div>
          </div>
          </div>
        </div>

      {activeTab === 'hashlocked' ? (
        <HashlockedSwapFlow />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Order Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Cross-Chain Swap</h2>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Chain
                    </label>
                    <select
                      name="fromChain"
                      value={formData.fromChain}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="stellar">Stellar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Chain
                    </label>
                    <select
                      name="toChain"
                      value={formData.toChain}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="stellar">Stellar</option>
                      <option value="ethereum">Ethereum</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Token
                    </label>
                    <input
                      type="text"
                      name="fromToken"
                      value={formData.fromToken}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Token address or symbol"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Token
                    </label>
                    <input
                      type="text"
                      name="toToken"
                      value={formData.toToken}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Token address or symbol"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Amount
                    </label>
                    <input
                      type="text"
                      name="fromAmount"
                      value={formData.fromAmount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Amount to send"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Amount
                    </label>
                    <input
                      type="text"
                      name="toAmount"
                      value={formData.toAmount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Amount to receive"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Address
                  </label>
                  <input
                    type="text"
                    name="fromAddress"
                    value={formData.fromAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Address (Optional)
                  </label>
                  <input
                    type="text"
                    name="toAddress"
                    value={formData.toAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Recipient address (auto-generated if empty)"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={getEstimation}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-400"
                  >
                    {loading ? 'Getting Estimation...' : 'Get Estimation'}
                  </button>
              <button
                    onClick={createOrder}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {loading ? 'Creating...' : 'Create Order'}
              </button>
            </div>
              </div>

              {/* Estimation Display */}
              {estimation && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Estimation</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Estimated Time:</strong> {estimation.estimatedTime / 60} minutes
                    </div>
                    <div>
                      <strong>Ethereum Gas Fee:</strong> {estimation.ethereumGasFee} ETH
                    </div>
                    <div>
                      <strong>Stellar Fee:</strong> {estimation.stellarFee} XLM
                    </div>
                    <div>
                      <strong>Total Fee (USD):</strong> ${estimation.totalFeeUSD}
                    </div>
                    <div>
                      <strong>Exchange Rate:</strong> {estimation.exchangeRate}
                    </div>
                    <div>
                      <strong>Slippage:</strong> {estimation.slippage}
                    </div>
                    {estimation.mode && (
                      <div className="col-span-2">
                        <strong>Mode:</strong> {estimation.mode}
                      </div>
                    )}
                  </div>
              </div>
            )}
          </div>

            {/* Orders List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>
              
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {order.fromAmount} {order.fromToken} → {order.toAmount} {order.toToken}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {order.fromChain} → {order.toChain}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'claimed' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Order ID: {order.swapId}</div>
                      <div>Hashlock: {order.hashlock}</div>
                      <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                      <div>Expires: {new Date(order.expiresAt).toLocaleString()}</div>
                    </div>

                    <div className="mt-3 flex space-x-2">
                      {order.status === 'initiated' && (
                        <>
                          <button
                            onClick={() => advanceSwap(order.id, 'locked')}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Lock
                          </button>
                          <button
                            onClick={() => advanceSwap(order.id, 'cancelled')}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {order.status === 'locked' && (
                        <>
                          <button
                            onClick={() => advanceSwap(order.id, 'secret_revealed')}
                            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Reveal Secret
                          </button>
                          <button
                            onClick={() => advanceSwap(order.id, 'refunded')}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Refund
                          </button>
                        </>
                      )}
                      {order.status === 'secret_revealed' && (
                        <button
                          onClick={() => completeSwap(order.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Complete Swap
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {orders.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No orders yet. Create your first cross-chain swap!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 
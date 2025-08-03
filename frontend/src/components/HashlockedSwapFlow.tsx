import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MetaMaskConnect from './MetaMaskConnect';
import FreighterConnect from './FreighterConnect';

interface HashlockedOrder {
  id: string; // Changed from orderId to id to match API response
  maker: string;
  taker?: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  hashlock: string;
  secret?: string;
  timelock: number;
  status: 'created' | 'filled' | 'escrowed' | 'funded' | 'claimed' | 'completed' | 'cancelled';
  evmEscrowAddress?: string;
  stellarClaimableBalanceId?: string;
  createdAt: number;
  updatedAt: number;
  stellarTransactionHash?: string;
  ethereumTransactionHash?: string;
  explorerLinks?: {
    stellar?: {
      transaction?: string;
      claimableBalance?: string;
      address?: string;
      operation?: string;
      contract?: string;
    };
    ethereum?: {
      transaction?: string;
      address?: string;
      contract?: string;
    };
  };
}

interface SwapFlowParams {
  maker: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  fromChain: 'ethereum' | 'stellar';
  toChain: 'ethereum' | 'stellar';
  timelockDuration?: number;
}

const HashlockedSwapFlow: React.FC = () => {
  const [currentOrder, setCurrentOrder] = useState<HashlockedOrder | null>(null);
  const [orders, setOrders] = useState<HashlockedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [connectedWallet, setConnectedWallet] = useState<string>('');
  const [connectedStellarWallet, setConnectedStellarWallet] = useState<string>('');
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);

  // Form state for creating orders
  const [formData, setFormData] = useState<SwapFlowParams>({
    maker: '0x2060C92f8163Edd331877E398Ca44d3e82AdB834', // Default fallback
    makingAmount: '1000000',
    takingAmount: '1000000',
    makerAsset: 'ETH', // Standard ETH on Sepolia
    takerAsset: 'USDC', // USDC on Stellar
    fromChain: 'ethereum',
    toChain: 'stellar',
    timelockDuration: 3600
  });

  const [takerAddress, setTakerAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

  const API_BASE = 'http://localhost:5000/api/hashlocked';

  // Update form data when wallet connects
  useEffect(() => {
    if (connectedWallet) {
      setFormData(prev => ({
        ...prev,
        maker: connectedWallet
      }));
    }
  }, [connectedWallet]);

  // Handle MetaMask connection
  const handleMetaMaskConnect = (address: string) => {
    setConnectedWallet(address);
    console.log('MetaMask connected:', address);
  };

  // Handle Freighter connection
  const handleFreighterConnect = (address: string) => {
    setConnectedStellarWallet(address);
    console.log('Freighter connected:', address);
  };

  // Helper function to determine step from order status
  const getStepFromStatus = (status: HashlockedOrder['status']): number => {
    switch (status) {
      case 'created': return 1;
      case 'filled': return 2;
      case 'escrowed': return 3;
      case 'funded': return 4;
      case 'claimed': return 5;
      case 'completed': return 6;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  // Load all orders and determine current state on component mount
  useEffect(() => {
    loadOrders();
    loadAvailableTokens();
  }, []);

  const loadAvailableTokens = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tokens`);
      setAvailableTokens(response.data.data);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/orders`);
      const allOrders = response.data.data;
      setOrders(allOrders);

      // Find the most recent non-completed order or the most recent completed order
      const sortedOrders = allOrders.sort((a: HashlockedOrder, b: HashlockedOrder) => 
        b.createdAt - a.createdAt
      );

      if (sortedOrders.length > 0) {
        const mostRecentOrder = sortedOrders[0];
        const step = getStepFromStatus(mostRecentOrder.status);
        
        // Set current order and step based on the most recent order
        setCurrentOrder(mostRecentOrder);
        setCurrentStep(step);
        
        console.log(`Loaded order ${mostRecentOrder.id} with status ${mostRecentOrder.status}, step ${step}`);
      }
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

  // Step 1: Create Order
  const createOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/create-order`, formData);
      setCurrentOrder(response.data.data);
      setCurrentStep(1);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Fill Order
  const fillOrder = async () => {
    if (!currentOrder) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/fill-order`, {
        orderId: currentOrder.id,
        taker: takerAddress
      });
      setCurrentOrder(response.data.data);
      setCurrentStep(2);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fill order');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create Escrow
  const createEscrow = async () => {
    if (!currentOrder) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/create-escrow`, {
        orderId: currentOrder.id
      });
      setCurrentOrder(response.data.data);
      setCurrentStep(3);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create escrow');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Fund Stellar
  const fundStellar = async () => {
    if (!currentOrder) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/fund-stellar`, {
        orderId: currentOrder.id
      });
      setCurrentOrder(response.data.data);
      setCurrentStep(4);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fund Stellar');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Claim Stellar
  const claimStellar = async () => {
    if (!currentOrder) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/claim-stellar`, {
        orderId: currentOrder.id
      });
      setCurrentOrder(response.data.data);
      setCurrentStep(5);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to claim Stellar');
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Claim EVM
  const claimEVM = async () => {
    if (!currentOrder) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/claim-evm`, {
        orderId: currentOrder.id
      });
      setCurrentOrder(response.data.data);
      setCurrentStep(6);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to claim EVM');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentOrder(null);
    setCurrentStep(0);
    setError(null);
  };

  // Function to select a specific order
  const selectOrder = (order: HashlockedOrder) => {
    setCurrentOrder(order);
    setCurrentStep(getStepFromStatus(order.status));
    setError(null);
  };

  // Function to continue with the next step automatically
  const continueWithNextStep = async () => {
    if (!currentOrder) return;
    
    const nextStep = currentStep + 1;
    if (nextStep > 6) return;

    setLoading(true);
    setError(null);
    
    try {
      let response;
      switch (nextStep) {
        case 2:
          response = await axios.post(`${API_BASE}/fill-order`, {
            orderId: currentOrder.id,
            taker: takerAddress
          });
          break;
        case 3:
          response = await axios.post(`${API_BASE}/create-escrow`, {
            orderId: currentOrder.id
          });
          break;
        case 4:
          response = await axios.post(`${API_BASE}/fund-stellar`, {
            orderId: currentOrder.id
          });
          break;
        case 5:
          response = await axios.post(`${API_BASE}/claim-stellar`, {
            orderId: currentOrder.id
          });
          break;
        case 6:
          response = await axios.post(`${API_BASE}/claim-evm`, {
            orderId: currentOrder.id
          });
          break;
        default:
          return;
      }
      
      setCurrentOrder(response.data.data);
      setCurrentStep(nextStep);
      await loadOrders();
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to execute step ${nextStep}`);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (step: number) => {
    if (currentStep > step) return 'completed';
    if (currentStep === step) return 'current';
    return 'pending';
  };

  const getStepButton = (step: number) => {
    const status = getStepStatus(step);
    const isCurrent = status === 'current';
    const isCompleted = status === 'completed';

    switch (step) {
      case 1:
        return (
          <button
            onClick={createOrder}
            disabled={loading || !isCurrent}
            className={`px-4 py-2 rounded ${isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
          >
            {loading ? 'Creating...' : 'Create Order'}
          </button>
        );
      case 2:
        return (
          <button
            onClick={fillOrder}
            disabled={loading || !isCurrent}
            className={`px-4 py-2 rounded ${isCurrent ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
          >
            {loading ? 'Filling...' : 'Fill Order'}
          </button>
        );
      case 3:
        return (
          <button
            onClick={createEscrow}
            disabled={loading || !isCurrent}
            className={`px-4 py-2 rounded ${isCurrent ? 'bg-purple-500 text-white' : 'bg-gray-300'}`}
          >
            {loading ? 'Creating...' : 'Create Escrow'}
          </button>
        );
      case 4:
        return (
          <button
            onClick={fundStellar}
            disabled={loading || !isCurrent}
            className={`px-4 py-2 rounded ${isCurrent ? 'bg-yellow-500 text-white' : 'bg-gray-300'}`}
          >
            {loading ? 'Funding...' : 'Fund Stellar'}
          </button>
        );
      case 5:
        return (
          <button
            onClick={claimStellar}
            disabled={loading || !isCurrent}
            className={`px-4 py-2 rounded ${isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-300'}`}
          >
            {loading ? 'Claiming...' : 'Claim Stellar'}
          </button>
        );
      case 6:
        return (
          <button
            onClick={claimEVM}
            disabled={loading || !isCurrent}
            className={`px-4 py-2 rounded ${isCurrent ? 'bg-red-500 text-white' : 'bg-gray-300'}`}
          >
            {loading ? 'Claiming...' : 'Claim EVM'}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🔒 Hashlocked Atomic Swap Flow
        </h1>
        <p className="text-gray-600 mb-6">
          Complete atomic swap between EVM and Stellar following the hashlocked-cli pattern
        </p>

        {/* MetaMask Connection Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">🔗 Connect Your Wallet</h2>
          <MetaMaskConnect 
            onConnect={handleMetaMaskConnect}
          />
          {/* Stellar Wallet Connection */}
          <div className="wallet-section">
            <h3>Stellar Wallet (Taker)</h3>
            <FreighterConnect 
              onConnect={handleFreighterConnect}
              connectedAddress={connectedStellarWallet}
            />
            {!connectedStellarWallet && (
              <div className="fallback-option">
                <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                  💡 <strong>Don't have Freighter?</strong> The system will generate a temporary Stellar address for testing.
                </p>
                <button 
                  onClick={() => {
                    // Generate a mock Stellar address for testing
                    const mockAddress = `G${Math.random().toString(36).substring(2, 50).toUpperCase()}A`;
                    setConnectedStellarWallet(mockAddress);
                  }}
                  style={{
                    background: '#64748b',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginTop: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Use Test Stellar Address
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Swap Progress</h2>
            {currentOrder && (
              <button
                onClick={resetFlow}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Reset Flow
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-6 gap-4">
            {[
              { step: 1, title: 'Create Order', desc: 'MAKER creates order' },
              { step: 2, title: 'Fill Order', desc: 'TAKER fills order' },
              { step: 3, title: 'Create Escrow', desc: 'MAKER creates EVM escrow' },
              { step: 4, title: 'Fund Stellar', desc: 'TAKER funds Stellar' },
              { step: 5, title: 'Claim Stellar', desc: 'MAKER claims Stellar' },
              { step: 6, title: 'Claim EVM', desc: 'TAKER claims EVM' }
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className={`text-center p-4 rounded-lg border-2 ${
                  getStepStatus(step) === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : getStepStatus(step) === 'current'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                  getStepStatus(step) === 'completed'
                    ? 'bg-green-500 text-white'
                    : getStepStatus(step) === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {getStepStatus(step) === 'completed' ? '✓' : step}
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-gray-600">{desc}</p>
                {getStepStatus(step) === 'current' && getStepButton(step)}
              </div>
            ))}
          </div>
        </div>

        {/* Current Order Status */}
        {currentOrder && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-800">Current Order Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                currentOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {currentOrder.status.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Order ID:</span>
                <span className="ml-2 font-mono text-gray-600">{currentOrder.id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Current Step:</span>
                <span className="ml-2 text-blue-600 font-semibold">{currentStep}/6</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Maker:</span>
                <span className="ml-2 font-mono text-gray-600">{currentOrder.maker}</span>
              </div>
              {currentOrder.taker && (
                <div>
                  <span className="font-medium text-gray-700">Taker:</span>
                  <span className="ml-2 font-mono text-gray-600">{currentOrder.taker}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Making:</span>
                <span className="ml-2 text-gray-600">{currentOrder.makingAmount} {currentOrder.makerAsset}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Taking:</span>
                <span className="ml-2 text-gray-600">{currentOrder.takingAmount} {currentOrder.takerAsset}</span>
              </div>
              {currentOrder.stellarClaimableBalanceId && (
                <div>
                  <span className="font-medium text-gray-700">Stellar Claimable Balance:</span>
                  <span className="ml-2 font-mono text-gray-600">{currentOrder.stellarClaimableBalanceId}</span>
                </div>
              )}
              {currentOrder.evmEscrowAddress && (
                <div>
                  <span className="font-medium text-gray-700">EVM Escrow:</span>
                  <span className="ml-2 font-mono text-gray-600">{currentOrder.evmEscrowAddress}</span>
                </div>
              )}
              {currentOrder.secret && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Secret (revealed):</span>
                  <span className="ml-2 font-mono text-gray-600">{currentOrder.secret.substring(0, 16)}...</span>
                </div>
              )}
            </div>

            {/* Blockchain Transactions Section */}
            {currentOrder && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Blockchain Transactions</h3>
                
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>🔗 Blockchain Transactions:</strong> 
                    These are actual transactions on Stellar testnet and Ethereum Sepolia testnet.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentOrder.explorerLinks?.stellar?.transaction && (
                    <div className="p-3 bg-white border rounded-lg">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Stellar Transaction</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Transaction: {currentOrder.explorerLinks.stellar.transaction}
                      </p>
                      {currentOrder.explorerLinks.stellar.transaction && (
                        <a 
                          href={currentOrder.explorerLinks.stellar.transaction}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="View on Stellar Testnet Explorer"
                        >
                          🔗 View on Stellar Explorer
                        </a>
                      )}
                    </div>
                  )}

                  {currentOrder.explorerLinks?.ethereum?.transaction && (
                    <div className="p-3 bg-white border rounded-lg">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Ethereum Transaction</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Transaction: {currentOrder.explorerLinks.ethereum.transaction}
                      </p>
                      {currentOrder.explorerLinks.ethereum.transaction && (
                        <a 
                          href={currentOrder.explorerLinks.ethereum.transaction}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="View on Sepolia Etherscan"
                        >
                          🔗 View on Etherscan
                        </a>
                      )}
                    </div>
                  )}

                  {currentOrder.explorerLinks?.stellar?.claimableBalance && (
                    <div className="p-3 bg-white border rounded-lg">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Stellar Claimable Balance</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Address: {currentOrder.explorerLinks.stellar.claimableBalance}
                      </p>
                      {currentOrder.explorerLinks.stellar.claimableBalance && (
                        <a 
                          href={currentOrder.explorerLinks.stellar.claimableBalance}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="View on Stellar Testnet Explorer"
                        >
                          🔗 View on Stellar Explorer
                        </a>
                      )}
                    </div>
                  )}

                  {currentOrder.explorerLinks?.ethereum?.address && (
                    <div className="p-3 bg-white border rounded-lg">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Ethereum Escrow</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Address: {currentOrder.explorerLinks.ethereum.address}
                      </p>
                      {currentOrder.explorerLinks.ethereum.address && (
                        <a 
                          href={currentOrder.explorerLinks.ethereum.address}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="View on Sepolia Etherscan"
                        >
                          🔗 View on Etherscan
                        </a>
                      )}
                    </div>
                  )}

                  {currentOrder.explorerLinks?.stellar?.operation && (
                    <div className="p-3 bg-white border rounded-lg">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Stellar Operation</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Operation: {currentOrder.explorerLinks.stellar.operation}
                      </p>
                      {currentOrder.explorerLinks.stellar.operation && (
                        <a 
                          href={currentOrder.explorerLinks.stellar.operation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="View on Stellar Testnet Explorer"
                        >
                          🔗 View on Stellar Explorer
                        </a>
                      )}
                    </div>
                  )}

                  {currentOrder.explorerLinks?.ethereum?.contract && (
                    <div className="p-3 bg-white border rounded-lg">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Ethereum Contract</h4>
                      <p className="text-xs text-gray-600 mb-1">
                        Contract: {currentOrder.explorerLinks.ethereum.contract}
                      </p>
                      {currentOrder.explorerLinks.ethereum.contract && (
                        <a 
                          href={currentOrder.explorerLinks.ethereum.contract}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="View on Sepolia Etherscan"
                        >
                          🔗 View on Etherscan
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Continue with Next Step Button */}
        {currentOrder && currentOrder.status !== 'completed' && currentOrder.status !== 'cancelled' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800">Continue Flow</h3>
                <p className="text-sm text-green-600">
                  Current step: {currentStep}/6 - {currentOrder.status}
                </p>
              </div>
              <button
                onClick={continueWithNextStep}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Continue to Step ${currentStep + 1}`}
              </button>
            </div>
          </div>
        )}

        {/* Create New Order Button - Always Visible */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-800">Start New Atomic Swap</h3>
              <p className="text-sm text-purple-600">
                {currentOrder ? `Current order: ${currentOrder.id} (${currentOrder.status})` : 'No active order'}
              </p>
            </div>
            <div className="flex gap-2">
              {currentOrder && (
                <button
                  onClick={resetFlow}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Reset Flow
                </button>
              )}
              <button
                onClick={() => {
                  setCurrentOrder(null);
                  setCurrentStep(0);
                  setError(null);
                }}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Create New Order
              </button>
            </div>
          </div>
        </div>

        {/* Order Creation Form */}
        {!currentOrder && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Atomic Swap Order</h3>
            
            {/* MetaMask Connection */}
            <MetaMaskConnect 
              onConnect={handleMetaMaskConnect}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maker Address {connectedWallet && <span className="text-green-600">(Connected: {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)})</span>}
                </label>
                <input
                  type="text"
                  name="maker"
                  value={formData.maker}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={connectedWallet ? connectedWallet : "Connect MetaMask or enter address manually"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Making Amount
                </label>
                <input
                  type="text"
                  name="makingAmount"
                  value={formData.makingAmount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taking Amount
                </label>
                <input
                  type="text"
                  name="takingAmount"
                  value={formData.takingAmount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maker Asset
                </label>
                <select
                  name="makerAsset"
                  value={formData.makerAsset}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Asset</option>
                  {availableTokens
                    .filter(token => token.chain === formData.fromChain)
                    .map(token => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} ({token.name})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taker Asset
                </label>
                <select
                  name="takerAsset"
                  value={formData.takerAsset}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Asset</option>
                  {availableTokens
                    .filter(token => token.chain === formData.toChain)
                    .map(token => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} ({token.name})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Chain
                </label>
                <select
                  name="fromChain"
                  value={formData.fromChain}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="stellar">Stellar</option>
                  <option value="ethereum">Ethereum</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timelock Duration (seconds)
                </label>
                <input
                  type="number"
                  name="timelockDuration"
                  value={formData.timelockDuration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={createOrder}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </div>
        )}

        {/* Taker Address Input */}
        {currentOrder && currentStep >= 1 && currentStep < 2 && (
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">Step 2: Taker Information</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taker Address
                </label>
                <input
                  type="text"
                  value={takerAddress}
                  onChange={(e) => setTakerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                onClick={fillOrder}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? 'Filling...' : 'Fill Order'}
              </button>
            </div>
          </div>
        )}

        {/* All Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">All Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Order ID</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Maker</th>
                  <th className="px-4 py-2 text-left">Taker</th>
                  <th className="px-4 py-2 text-left">Making</th>
                  <th className="px-4 py-2 text-left">Taking</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={`border-b hover:bg-gray-50 ${
                    currentOrder?.id === order.id ? 'bg-blue-50' : ''
                  }`}>
                    <td className="px-4 py-2 font-mono text-sm">{order.id}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{order.maker}</td>
                    <td className="px-4 py-2 font-mono text-xs">{order.taker || '-'}</td>
                    <td className="px-4 py-2">{order.makingAmount} {order.makerAsset}</td>
                    <td className="px-4 py-2">{order.takingAmount} {order.takerAsset}</td>
                    <td className="px-4 py-2 text-sm">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => selectOrder(order)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HashlockedSwapFlow; 
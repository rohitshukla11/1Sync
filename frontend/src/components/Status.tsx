import React, { useState } from "react";

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

interface StatusProps {
  order: SwapOrder;
  onAdvanceStatus?: (swapId: string, status: SwapOrder['status']) => void;
  onCompleteSwap?: (swapId: string) => void;
  isSwapping?: boolean;
}

export default function Status({ order, onAdvanceStatus, onCompleteSwap, isSwapping }: StatusProps) {
  const getStatusIcon = (status: SwapOrder['status']) => {
    switch (status) {
      case 'claimed':
        return <div className="w-5 h-5 text-green-500">✅</div>;
      case 'secret_revealed':
        return <div className="w-5 h-5 text-blue-500">🔓</div>;
      case 'locked':
        return <div className="w-5 h-5 text-yellow-500">🔒</div>;
      case 'refunded':
        return <div className="w-5 h-5 text-red-500">❌</div>;
      case 'initiated':
      case 'pending':
        return <div className="w-5 h-5 text-blue-500 animate-spin">⏳</div>;
      default:
        return <div className="w-5 h-5 text-gray-500">⚠</div>;
    }
  };

  const getStatusColor = (status: SwapOrder['status']) => {
    switch (status) {
      case 'claimed':
        return 'bg-green-100 text-green-800';
      case 'secret_revealed':
        return 'bg-blue-100 text-blue-800';
      case 'locked':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'initiated':
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDescription = (status: SwapOrder['status']) => {
    switch (status) {
      case 'initiated':
      case 'pending':
        return 'Swap order created and waiting for funds to be locked';
      case 'locked':
        return 'Funds locked in HTLC, waiting for secret reveal';
      case 'secret_revealed':
        return 'Secret revealed, funds can be claimed';
      case 'claimed':
        return 'Swap completed successfully';
      case 'refunded':
        return 'Swap expired and funds refunded';
      default:
        return 'Unknown status';
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    const now = new Date();
    const remaining = expiryDate.getTime() - now.getTime();
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getSwapTimeline = () => {
    const timeline = [
      {
        phase: 'initiated',
        title: '⏳ Initiated',
        description: 'Swap order created',
        timestamp: order.createdAt,
        completed: true,
        icon: '⏳'
      },
      {
        phase: 'locked',
        title: '🔒 Locked',
        description: 'Funds locked in HTLC',
        timestamp: order.lockedAt,
        completed: order.status !== 'initiated' && order.status !== 'pending',
        icon: '🔒'
      },
      {
        phase: 'secret_revealed',
        title: '🔓 Secret Revealed',
        description: 'Preimage revealed for claiming',
        timestamp: order.secretRevealedAt,
        completed: ['secret_revealed', 'claimed'].includes(order.status),
        icon: '🔓'
      },
      {
        phase: 'claimed',
        title: '✅ Claimed',
        description: 'Swap completed successfully',
        timestamp: order.claimedAt,
        completed: order.status === 'claimed',
        icon: '✅'
      }
    ];

    // Add refunded phase if applicable
    if (order.status === 'refunded') {
      timeline.push({
        phase: 'refunded',
        title: '❌ Refunded',
        description: 'Swap expired and funds refunded',
        timestamp: order.refundedAt,
        completed: true,
        icon: '❌'
      });
    }

    return timeline;
  };

  const timeline = getSwapTimeline();

  return (
    <div className="space-y-4">
      {/* Order ID */}
      <div className="flex items-start space-x-2">
        <span className="text-sm text-gray-600 whitespace-nowrap">Order ID:</span>
        <span className="text-sm font-mono text-gray-900 break-all">{order.id}</span>
      </div>

      {/* Status with Description */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Status:</span>
        <div className="flex items-center">
          {getStatusIcon(order.status)}
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
            {order.status === 'pending' ? 'INITIATED' : order.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-500 italic">
        {getStatusDescription(order.status)}
      </div>

      {/* Timeline View - Always Visible */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">🕒 Swap Timeline</h4>
        <div className="space-y-3">
          {timeline.map((step, index) => (
            <div key={step.phase} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                step.completed 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step.completed ? step.icon : '⏸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">
                  {step.description}
                </div>
                {step.timestamp && (
                  <div className="text-xs text-gray-400 mt-1">
                    {step.timestamp instanceof Date ? step.timestamp.toLocaleString() : new Date(step.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
              {index < timeline.length - 1 && (
                <div className={`w-px h-8 ml-4 ${
                  step.completed ? 'bg-green-200' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hashlock and Timelock - Always Visible */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-900">🔧 Technical Details</h4>
        
        {/* Hashlock */}
        {order.hashlock && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-700">🔐 Hashlock:</span>
            <div className="text-xs font-mono text-gray-900 break-all bg-white p-2 rounded border">
              {order.hashlock}
            </div>
          </div>
        )}

        {/* Timelock */}
        {order.timelock && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-700">⏰ Timelock:</span>
            <div className="text-xs text-gray-900">
              {new Date(order.timelock * 1000).toLocaleString()}
              {order.status === 'locked' && (
                <span className="ml-2 text-yellow-600 font-medium">
                  (Expires in {formatTimeRemaining(order.expiresAt)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preimage/Secret - Only show if revealed */}
        {order.preimage && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-700">🔓 Revealed Secret:</span>
            <div className="text-xs font-mono text-gray-900 break-all bg-white p-2 rounded border">
              {order.preimage}
            </div>
          </div>
        )}

        {/* Transaction Hashes */}
        {(order.txHash || order.claimTxHash) && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-700">🔗 Transaction Hashes:</span>
            
            {order.txHash && (
              <div className="space-y-1">
                <span className="text-xs text-gray-600">Ethereum (Lock):</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${order.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-600 break-all hover:underline block bg-white p-2 rounded border"
                >
                  {order.txHash}
                </a>
                {order.blockNumber && (
                  <div className="text-xs text-gray-500">
                    Block: {order.blockNumber} | Gas: {order.gasUsed}
                  </div>
                )}
              </div>
            )}

            {order.claimTxHash && (
              <div className="space-y-1">
                <span className="text-xs text-gray-600">Ethereum (Claim):</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${order.claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-green-600 break-all hover:underline block bg-white p-2 rounded border"
                >
                  {order.claimTxHash}
                </a>
                {order.claimBlockNumber && (
                  <div className="text-xs text-gray-500">
                    Block: {order.claimBlockNumber} | Gas: {order.claimGasUsed}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blockchain Transaction Details */}
      {(order.txHash || order.claimTxHash) && (
        <div className="bg-green-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-green-900">🌐 Blockchain Details</h4>
          {order.txHash && (
            <div className="space-y-1">
              <div className="flex items-start space-x-2">
                <span className="text-xs text-green-700 whitespace-nowrap">Lock TX:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${order.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-green-900 break-all hover:underline"
                >
                  {order.txHash}
                </a>
              </div>
              {order.blockNumber && (
                <div className="text-xs text-green-600">
                  Block: {order.blockNumber} | Gas: {order.gasUsed}
                </div>
              )}
            </div>
          )}
          {order.claimTxHash && (
            <div className="space-y-1">
              <div className="flex items-start space-x-2">
                <span className="text-xs text-green-700 whitespace-nowrap">Claim TX:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${order.claimTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-green-900 break-all hover:underline"
                >
                  {order.claimTxHash}
                </a>
              </div>
              {order.claimBlockNumber && (
                <div className="text-xs text-green-600">
                  Block: {order.claimBlockNumber} | Gas: {order.claimGasUsed}
                </div>
              )}
            </div>
          )}
          <div className="text-xs text-green-600 mt-2">
            🌐 Network: Sepolia Testnet | 🔗 Contract: 
            <a 
              href="https://sepolia.etherscan.io/address/0xf7A9B1F6DC412655e5E6358A4695a1B25CEd8c8a"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline ml-1"
            >
              0xf7A9B1F6DC412655e5E6358A4695a1B25CEd8c8a
            </a>
          </div>
        </div>
      )}

      {/* Stellar Receiver Information */}
      {order.stellarReceiverKey && (
        <div className="bg-purple-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-purple-900">⭐ Stellar Receiver</h4>
          <div className="space-y-1">
            <div className="flex items-start space-x-2">
              <span className="text-xs text-purple-700 whitespace-nowrap">Stellar Key:</span>
              <span className="text-xs font-mono text-purple-900 break-all">
                {order.stellarReceiverKey}
              </span>
            </div>
            {order.ethereumReceiverAddress && (
              <div className="flex items-start space-x-2">
                <span className="text-xs text-purple-700 whitespace-nowrap">ETH Address:</span>
                <span className="text-xs font-mono text-purple-900 break-all">
                  {order.ethereumReceiverAddress}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Information */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created: {(order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)).toLocaleTimeString()}</span>
        {order.status === 'locked' && (
          <span className="text-yellow-600 font-medium">
            Expires in {formatTimeRemaining(order.expiresAt)}
          </span>
        )}
      </div>

      {/* Demo Controls */}
      {onAdvanceStatus && onCompleteSwap && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">🎭 Demo Controls</h4>
          <div className="flex flex-wrap gap-2">
            {(order.status === 'initiated' || order.status === 'pending') && (
              <button
                onClick={() => onAdvanceStatus(order.id, 'locked')}
                className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Lock Funds
              </button>
            )}
            {order.status === 'locked' && (
              <button
                onClick={() => onAdvanceStatus(order.id, 'secret_revealed')}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Reveal Secret
              </button>
            )}
            {order.status === 'secret_revealed' && (
              <button
                onClick={() => onCompleteSwap(order.id)}
                disabled={isSwapping}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isSwapping ? 'Claiming...' : 'Claim Funds'}
              </button>
            )}
            {order.status === 'claimed' && (
              <span className="text-xs text-green-700 font-medium">✅ Swap completed!</span>
            )}
            {order.status === 'locked' && (
              <button
                onClick={() => onAdvanceStatus(order.id, 'refunded')}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                Refund
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
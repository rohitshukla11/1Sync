import React from "react";

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

interface StatusProps {
  order: SwapOrder;
  onAdvanceStatus?: (swapId: string, status: SwapOrder['status']) => void;
  onCompleteSwap?: (swapId: string) => void;
  isSwapping?: boolean;
}

export default function Status({ order, onAdvanceStatus, onCompleteSwap, isSwapping }: StatusProps) {
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
    // Ensure expiresAt is a Date object
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

  return (
    <div className="space-y-4">
      {/* Order ID */}
      <div className="flex items-start space-x-2">
        <span className="text-sm text-gray-600 whitespace-nowrap">Order ID:</span>
        <span className="text-sm font-mono text-gray-900 break-all">{order.id}</span>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Status:</span>
        <div className="flex items-center">
          {getStatusIcon(order.status)}
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
            {order.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Swap Details */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Swap:</span>
          <span className="text-sm font-medium text-gray-900">
            {order.fromAmount} {order.fromToken} → {order.toAmount} {order.toToken}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Direction:</span>
          <span className="text-sm font-medium text-gray-900">
            {order.fromChain} → {order.toChain}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ 
            width: order.status === 'initiated' ? '25%' : 
                   order.status === 'locked' ? '75%' : 
                   order.status === 'completed' ? '100%' : '0%' 
          }}
        ></div>
      </div>

      {/* Status Description */}
      <div className="text-xs text-gray-600">
        {order.status === 'initiated' && 'Initializing atomic swap...'}
        {order.status === 'locked' && 'Funds locked, waiting for completion...'}
        {order.status === 'completed' && 'Swap completed successfully!'}
        {order.status === 'refunded' && 'Swap was refunded'}
      </div>

      {/* Technical Details */}
      {(order.hashlock || order.preimage || order.timelock) && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-blue-900">Technical Details</h4>
          {order.hashlock && (
            <div className="flex items-start space-x-2">
              <span className="text-xs text-blue-700 whitespace-nowrap">Hashlock:</span>
              <span className="text-xs font-mono text-blue-900 break-all">
                {order.hashlock}
              </span>
            </div>
          )}
          {order.preimage && (
            <div className="flex items-start space-x-2">
              <span className="text-xs text-blue-700 whitespace-nowrap">Preimage:</span>
              <span className="text-xs font-mono text-blue-900 break-all">
                {order.preimage}
              </span>
            </div>
          )}
          {order.timelock && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700">Timelock:</span>
              <span className="text-xs text-blue-900">
                {new Date(order.timelock * 1000).toLocaleString()}
              </span>
            </div>
          )}
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
            {order.status === 'initiated' && (
              <button
                onClick={() => onAdvanceStatus(order.id, 'locked')}
                className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Lock Funds
              </button>
            )}
            {order.status === 'locked' && (
              <button
                onClick={() => onCompleteSwap(order.id)}
                disabled={isSwapping}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isSwapping ? 'Completing...' : 'Complete Swap'}
              </button>
            )}
            {order.status === 'completed' && (
              <span className="text-xs text-green-700 font-medium">✅ Swap completed!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
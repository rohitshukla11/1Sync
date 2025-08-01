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
}

export default function Status({ order }: StatusProps) {
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
    <div className="space-y-4">
      {/* Order ID */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Order ID:</span>
        <span className="text-sm font-mono text-gray-900">{order.id}</span>
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700">Hashlock:</span>
              <span className="text-xs font-mono text-blue-900 truncate max-w-32">
                {order.hashlock}
              </span>
            </div>
          )}
          {order.preimage && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700">Preimage:</span>
              <span className="text-xs font-mono text-blue-900 truncate max-w-32">
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
        <span>Created: {order.createdAt.toLocaleTimeString()}</span>
        {order.status === 'locked' && (
          <span className="text-yellow-600 font-medium">
            Expires in {formatTimeRemaining(order.expiresAt)}
          </span>
        )}
      </div>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import Status from './Status';

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

interface SwapHistoryProps {
  swaps: SwapOrder[];
  onAdvanceStatus?: (swapId: string, status: SwapOrder['status']) => void;
  onCompleteSwap?: (swapId: string) => void;
  isSwapping?: boolean;
}

export default function SwapHistory({ swaps, onAdvanceStatus, onCompleteSwap, isSwapping }: SwapHistoryProps) {
  const [filteredSwaps, setFilteredSwaps] = useState<SwapOrder[]>(swaps);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tokenPairFilter, setTokenPairFilter] = useState<string>('all');
  const [selectedSwap, setSelectedSwap] = useState<SwapOrder | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    filterSwaps();
  }, [swaps, statusFilter, tokenPairFilter]);

  const filterSwaps = () => {
    let filtered = [...swaps];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(swap => swap.status === statusFilter);
    }

    // Filter by token pair
    if (tokenPairFilter !== 'all') {
      filtered = filtered.filter(swap => {
        const pair = `${swap.fromToken}/${swap.toToken}`;
        return pair === tokenPairFilter;
      });
    }

    setFilteredSwaps(filtered);
  };

  const getStatusIcon = (status: SwapOrder['status']) => {
    switch (status) {
      case 'claimed':
        return <div className="w-4 h-4 text-green-500">✅</div>;
      case 'secret_revealed':
        return <div className="w-4 h-4 text-blue-500">🔓</div>;
      case 'locked':
        return <div className="w-4 h-4 text-yellow-500">🔒</div>;
      case 'refunded':
        return <div className="w-4 h-4 text-red-500">❌</div>;
      case 'initiated':
      case 'pending':
        return <div className="w-4 h-4 text-blue-500 animate-spin">⏳</div>;
      default:
        return <div className="w-4 h-4 text-gray-500">⚠</div>;
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getUniqueTokenPairs = () => {
    const pairs = swaps.map(swap => `${swap.fromToken}/${swap.toToken}`);
    return ['all', ...Array.from(new Set(pairs))];
  };

  const getStatusCounts = () => {
    const counts = {
      all: swaps.length,
      initiated: swaps.filter(s => s.status === 'initiated').length,
      locked: swaps.filter(s => s.status === 'locked').length,
      secret_revealed: swaps.filter(s => s.status === 'secret_revealed').length,
      claimed: swaps.filter(s => s.status === 'claimed').length,
      refunded: swaps.filter(s => s.status === 'refunded').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Swaps</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">🔍 Filters</h4>
          
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Status:</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    statusFilter === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Token Pair Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Token Pair:</label>
            <select
              value={tokenPairFilter}
              onChange={(e) => setTokenPairFilter(e.target.value)}
              className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getUniqueTokenPairs().map(pair => (
                <option key={pair} value={pair}>
                  {pair === 'all' ? 'All Pairs' : pair}
                </option>
              ))}
            </select>
          </div>

          {/* Results Summary */}
          <div className="text-xs text-gray-600">
            Showing {filteredSwaps.length} of {swaps.length} swaps
          </div>
        </div>
      )}

      {/* Swaps List */}
      <div className="space-y-3">
        {filteredSwaps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">📭</div>
            <div>No swaps found</div>
            <div className="text-xs">Try adjusting your filters</div>
          </div>
        ) : (
          filteredSwaps.map((swap) => (
            <div
              key={swap.id}
              onClick={() => setSelectedSwap(selectedSwap?.id === swap.id ? null : swap)}
              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(swap.status)}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {swap.fromAmount && swap.fromToken && swap.toAmount && swap.toToken 
                        ? `${swap.fromAmount} ${swap.fromToken} → ${swap.toAmount} ${swap.toToken}`
                        : swap.fromToken && swap.toToken
                        ? `${swap.fromToken} → ${swap.toToken}`
                        : 'Cross-chain Swap'
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {swap.fromChain && swap.toChain 
                        ? `${swap.fromChain} → ${swap.toChain}`
                        : 'Cross-chain'
                      }
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(swap.status)}`}>
                    {swap.status === 'pending' ? 'INITIATED' : swap.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(swap.createdAt instanceof Date ? swap.createdAt : new Date(swap.createdAt))}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedSwap?.id === swap.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Status
                    order={swap}
                    onAdvanceStatus={onAdvanceStatus}
                    onCompleteSwap={onCompleteSwap}
                    isSwapping={isSwapping}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <div className="font-medium text-gray-900">{statusCounts.initiated}</div>
            <div className="text-gray-500">Initiated</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{statusCounts.locked}</div>
            <div className="text-gray-500">Locked</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{statusCounts.claimed}</div>
            <div className="text-gray-500">Completed</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{statusCounts.refunded}</div>
            <div className="text-gray-500">Refunded</div>
          </div>
        </div>
      </div>
    </div>
  );
} 
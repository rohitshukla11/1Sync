import React, { useState, useEffect } from 'react';

interface FeeEstimate {
  ethereumGasFee: string;
  stellarFee: string;
  totalFeeUSD: string;
  estimatedTime: number;
  exchangeRate: string;
  slippage: string;
}

interface FeeEstimateProps {
  fromChain: string;
  toChain: string;
  fromAmount: string;
  toAmount: string;
  fromToken: string;
  toToken: string;
  onEstimate?: (estimate: FeeEstimate) => void;
}

export default function FeeEstimate({ 
  fromChain, 
  toChain, 
  fromAmount, 
  toAmount, 
  fromToken, 
  toToken,
  onEstimate 
}: FeeEstimateProps) {
  const [estimate, setEstimate] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      fetchEstimate();
    }
  }, [fromChain, toChain, fromAmount, toAmount, fromToken, toToken]);

  const fetchEstimate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/fusion/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromChain,
          toChain,
          amount: fromAmount
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEstimate(data.data);
          onEstimate?.(data.data);
        } else {
          setError('Failed to get estimate');
        }
      } else {
        setError('Failed to get estimate');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!fromAmount || parseFloat(fromAmount) <= 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-blue-900">💰 Fee Estimate</h4>
        <button
          onClick={fetchEstimate}
          disabled={loading}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <div className="text-xs text-blue-600">
          Calculating fees...
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600">
          {error}
        </div>
      )}

      {estimate && (
        <div className="space-y-2">
          {/* Gas Fees */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Ethereum Gas</div>
              <div className="text-sm font-medium text-gray-900">
                {estimate.ethereumGasFee} ETH
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-xs text-gray-600">Stellar Fee</div>
              <div className="text-sm font-medium text-gray-900">
                {estimate.stellarFee} XLM
              </div>
            </div>
          </div>

          {/* Total Fee */}
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-600">Total Fee (USD)</div>
            <div className="text-sm font-medium text-gray-900">
              ${estimate.totalFeeUSD}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-600">Time</div>
              <div className="font-medium text-gray-900">
                {Math.ceil(estimate.estimatedTime / 60)}m
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">Rate</div>
              <div className="font-medium text-gray-900">
                {estimate.exchangeRate}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">Slippage</div>
              <div className="font-medium text-gray-900">
                {estimate.slippage}
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Ethereum: Sepolia</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Stellar: Testnet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
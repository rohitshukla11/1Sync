import React from "react";

interface SwapFormProps {
  fromChain: 'ethereum' | 'stellar';
  toChain: 'ethereum' | 'stellar';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  tokens: {
    ethereum: string[];
    stellar: string[];
  };
  estimation: {
    estimatedTime: number;
    ethereumGasFee: string;
    stellarFee: string;
    totalFeeUSD: string;
    exchangeRate: string;
    slippage: string;
  } | null;
  isSwapping: boolean;
  onFromChainChange: (chain: 'ethereum' | 'stellar') => void;
  onToChainChange: (chain: 'ethereum' | 'stellar') => void;
  onFromTokenChange: (token: string) => void;
  onToTokenChange: (token: string) => void;
  onFromAmountChange: (amount: string) => void;
  onToAmountChange: (amount: string) => void;
  onSwapChains: () => void;
  onInitiateSwap: () => void;
}

export default function SwapForm({
  fromChain,
  toChain,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  tokens,
  estimation,
  isSwapping,
  onFromChainChange,
  onToChainChange,
  onFromTokenChange,
  onToTokenChange,
  onFromAmountChange,
  onToAmountChange,
  onSwapChains,
  onInitiateSwap
}: SwapFormProps) {
  return (
    <div className="space-y-6">
      {/* From Chain */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
        <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <select 
              value={fromChain}
              onChange={(e) => onFromChainChange(e.target.value as 'ethereum' | 'stellar')}
              className="bg-transparent text-lg font-semibold text-gray-900 border-none outline-none capitalize"
            >
              <option value="ethereum">Ethereum</option>
              <option value="stellar">Stellar</option>
            </select>
            <select
              value={fromToken}
              onChange={(e) => onFromTokenChange(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {tokens[fromChain]?.map((token: string) => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => onFromAmountChange(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-semibold text-gray-900 border-none outline-none"
          />
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={onSwapChains}
          className="bg-blue-100 hover:bg-blue-200 p-3 rounded-full transition-colors"
        >
          <div className="w-6 h-6 text-blue-600">↕</div>
        </button>
      </div>

      {/* To Chain */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
        <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <select 
              value={toChain}
              onChange={(e) => onToChainChange(e.target.value as 'ethereum' | 'stellar')}
              className="bg-transparent text-lg font-semibold text-gray-900 border-none outline-none capitalize"
            >
              <option value="ethereum">Ethereum</option>
              <option value="stellar">Stellar</option>
            </select>
            <select
              value={toToken}
              onChange={(e) => onToTokenChange(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {tokens[toChain]?.map((token: string) => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
          <input
            type="number"
            value={toAmount}
            onChange={(e) => onToAmountChange(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-semibold text-gray-900 border-none outline-none"
          />
        </div>
      </div>

      {/* Estimation */}
      {estimation && (
        <div className="bg-blue-50 rounded-xl p-4">
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
            <div className="flex justify-between">
              <span>Exchange Rate:</span>
              <span>{estimation.exchangeRate}</span>
            </div>
            <div className="flex justify-between">
              <span>Slippage:</span>
              <span>{estimation.slippage}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
              <span>Total Fee (USD):</span>
              <span>${estimation.totalFeeUSD}</span>
            </div>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={onInitiateSwap}
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
    </div>
  );
} 
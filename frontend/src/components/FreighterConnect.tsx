import React, { useState, useEffect } from 'react';

interface FreighterConnectProps {
  onConnect: (address: string) => void;
  connectedAddress?: string;
}

declare global {
  interface Window {
    freighter?: any;
    Freighter?: any;
    stellar?: any;
    /* Add more potential injection points */
  }
}

const FreighterConnect: React.FC<FreighterConnectProps> = ({ onConnect, connectedAddress }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [isFreighterDetected, setIsFreighterDetected] = useState(false);
  const [detectionLogs, setDetectionLogs] = useState<string[]>([]);

  // Enhanced Freighter detection
  const detectFreighter = () => {
    const logs: string[] = [];
    
    // Method 1: Check window.freighter
    if (window.freighter) {
      logs.push('✅ Found window.freighter');
      setIsFreighterDetected(true);
      return { detected: true, instance: window.freighter, logs };
    }
    logs.push('❌ window.freighter not found');

    // Method 2: Check window.Freighter
    if (window.Freighter) {
      logs.push('✅ Found window.Freighter');
      setIsFreighterDetected(true);
      return { detected: true, instance: window.Freighter, logs };
    }
    logs.push('❌ window.Freighter not found');

    // Method 3: Check via bracket notation
    if (window['freighter']) {
      logs.push('✅ Found window["freighter"]');
      setIsFreighterDetected(true);
      return { detected: true, instance: window['freighter'], logs };
    }
    logs.push('❌ window["freighter"] not found');

    // Method 4: Check window.stellar (some extensions use this)
    if (window.stellar) {
      logs.push('✅ Found window.stellar');
      setIsFreighterDetected(true);
      return { detected: true, instance: window.stellar, logs };
    }
    logs.push('❌ window.stellar not found');

    // Method 5: Check global object
    try {
      const globalObj = (function() { return typeof window !== 'undefined' ? window : (global as any); })();
      if (globalObj && globalObj.freighter) {
        logs.push('✅ Found global.freighter');
        setIsFreighterDetected(true);
        return { detected: true, instance: globalObj.freighter, logs };
      }
      logs.push('❌ global.freighter not found');
    } catch (e) {
      logs.push('❌ Error checking global scope');
    }

    logs.push('❌ Freighter not detected through any method');
    setDetectionLogs(logs);
    setIsFreighterDetected(false);
    return { detected: false, instance: null, logs };
  };

  // Get the Freighter instance
  const getFreighterInstance = () => {
    const result = detectFreighter();
    return result.instance;
  };

  // Auto-detect on component mount and when props change
  useEffect(() => {
    if (connectedAddress) {
      setAccount(connectedAddress);
      setIsConnected(true);
      setIsFreighterDetected(true);
    } else {
      // Run initial detection
      const result = detectFreighter();
      console.log('🔍 Freighter detection result:', result);
      
      if (result.detected) {
        checkConnection();
      }
      
      // Set up polling to detect late-loading extensions
      const interval = setInterval(() => {
        if (!isFreighterDetected && detectionAttempts < 10) {
          setDetectionAttempts(prev => prev + 1);
          const retryResult = detectFreighter();
          console.log(`🔄 Retry ${detectionAttempts + 1}/10:`, retryResult);
          
          if (retryResult.detected) {
            checkConnection();
            clearInterval(interval);
          }
        } else if (detectionAttempts >= 10) {
          clearInterval(interval);
        }
      }, 2000);

      // Cleanup interval
      return () => clearInterval(interval);
    }
  }, [connectedAddress, isFreighterDetected, detectionAttempts]);

  // Check for existing connection
  const checkConnection = async () => {
    const freighter = getFreighterInstance();
    if (!freighter) return;

    setIsChecking(true);
    try {
      const isConnected = await freighter.isConnected();
      if (isConnected) {
        const publicKey = await freighter.getPublicKey();
        setAccount(publicKey);
        setIsConnected(true);
        onConnect(publicKey);
      }
    } catch (error) {
      console.error('Error checking Freighter connection:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Manual refresh function
  const refreshDetection = () => {
    console.log('🔄 Manually refreshing Freighter detection...');
    setError(null);
    setDetectionAttempts(0);
    const result = detectFreighter();
    console.log('🔍 Manual detection result:', result);
    
    if (result.detected) {
      checkConnection();
    }
  };

  // Start polling detection
  const startDetection = () => {
    console.log('🔄 Starting manual polling detection...');
    setError(null);
    setDetectionAttempts(0);
    refreshDetection();
  };

  // Manual force detection (for testing)
  const forceDetection = () => {
    console.log('🔧 Force detection triggered...');
    setError(null);
    setDetectionLogs([]);
    
    // Log all available properties on window for debugging
    const windowProps = Object.getOwnPropertyNames(window).filter(prop => 
      prop.toLowerCase().includes('freighter') || 
      prop.toLowerCase().includes('stellar')
    );
    
    console.log('🔍 Window properties containing freighter/stellar:', windowProps);
    setDetectionLogs([
      '🔍 Debug information:',
      `Window properties: ${windowProps.join(', ') || 'None found'}`,
      `typeof window.freighter: ${typeof window.freighter}`,
      `typeof window.Freighter: ${typeof window.Freighter}`,
      `typeof window.stellar: ${typeof window.stellar}`,
    ]);
    
    // Try detection again
    const result = detectFreighter();
    console.log('🔍 Force detection result:', result);
  };

  // Connect to Freighter
  const connectWallet = async () => {
    const freighter = getFreighterInstance();
    if (!freighter) {
      setError('Freighter wallet is not installed. Please install it from https://www.freighter.app/');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Check if we're on the right network (Testnet)
      const network = await freighter.getNetwork();
      if (network !== 'TESTNET') {
        await freighter.setNetwork('TESTNET');
      }

      // Connect to Freighter
      await freighter.connect();
      
      // Get the public key
      const publicKey = await freighter.getPublicKey();
      
      setAccount(publicKey);
      setIsConnected(true);
      onConnect(publicKey);
      
      console.log('✅ Connected to Freighter wallet:', publicKey);
      
    } catch (error: any) {
      console.error('❌ Failed to connect to Freighter:', error);
      setError(error.message || 'Failed to connect to Freighter wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    onConnect('');
    console.log('🔌 Disconnected from Freighter wallet');
  };

  // Switch to Testnet
  const switchToTestnet = async () => {
    const freighter = getFreighterInstance();
    if (!freighter) {
      setError('Freighter wallet is not installed');
      return;
    }

    try {
      await freighter.setNetwork('TESTNET');
      console.log('✅ Switched to Stellar Testnet');
    } catch (error: any) {
      console.error('❌ Failed to switch network:', error);
      setError('Failed to switch to Testnet');
    }
  };

  // Helper to format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Render UI for Freighter not installed
  if (!isFreighterDetected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Freighter Wallet Not Detected
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Please install{' '}
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:text-yellow-600"
                >
                  Freighter wallet
                </a>{' '}
                to connect your Stellar account.
              </p>
              <p className="mt-1">
                If you've already installed Freighter, try refreshing the page or clicking the buttons below.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4">
          <div className="flex space-x-2 flex-wrap">
            <button
              onClick={refreshDetection}
              disabled={isChecking}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Refresh Detection'}
            </button>
            <button
              onClick={startDetection}
              disabled={false}
              className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
            >
              Retry Detection
            </button>
            <button
              onClick={forceDetection}
              className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
            >
              Debug Detection
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
            >
              Reload Page
            </button>
          </div>

          {/* Detection status */}
          {detectionAttempts > 0 && (
            <div className="mt-2 text-xs text-yellow-700">
              🔄 Detection attempts: {detectionAttempts}/10
            </div>
          )}

          {/* Detection logs */}
          {detectionLogs.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
              <h4 className="font-semibold text-yellow-800 mb-1">Detection Debug:</h4>
              <ul className="space-y-1">
                {detectionLogs.map((log, index) => (
                  <li key={index} className="text-yellow-700 font-mono">{log}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">
              Freighter Wallet
            </h3>
            <p className="text-sm text-gray-500">
              Connect your Stellar account
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <div className="text-sm text-gray-600">
                {account && formatAddress(account)}
              </div>
              <button
                onClick={disconnectWallet}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Network Status */}
      {isConnected && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Network:</span>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Testnet
              </span>
              <button
                onClick={switchToTestnet}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isConnected && !error && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                ✅ Connected to Freighter wallet
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreighterConnect; 
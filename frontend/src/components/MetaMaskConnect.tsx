import React, { useState, useEffect } from 'react';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface MetaMaskConnectProps {
  onConnect: (address: string) => void;
}

const MetaMaskConnect: React.FC<MetaMaskConnectProps> = ({ onConnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum;
  };

  const getCurrentNetwork = async () => {
    if (!window.ethereum) return null;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networkId = parseInt(chainId, 16);
      
      let networkName = 'Unknown';
      let isCorrectNetwork = false;
      
      switch (networkId) {
        case 11155111:
          networkName = 'Sepolia Testnet';
          isCorrectNetwork = true;
          break;
        case 1:
          networkName = 'Ethereum Mainnet';
          break;
        case 137:
          networkName = 'Polygon';
          break;
        default:
          networkName = `Network ${networkId}`;
      }
      
      return {
        chainId,
        networkId,
        networkName,
        isCorrectNetwork
      };
    } catch (error) {
      console.error('Error getting network:', error);
      return null;
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return false;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to MetaMask, add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SEP',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          return false;
        }
      }
      console.error('Error switching to Sepolia:', error);
      return false;
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        const connectedAddress = accounts[0];
        setAddress(connectedAddress);
        setIsConnected(true);
        
        // Check and switch network
        const network = await getCurrentNetwork();
        setNetworkInfo(network);
        
        if (network && !network.isCorrectNetwork) {
          console.log('Wrong network detected, switching to Sepolia...');
          const switched = await switchToSepolia();
          if (switched) {
            const updatedNetwork = await getCurrentNetwork();
            setNetworkInfo(updatedNetwork);
          }
        }
        
        // Make ethereum available globally for backend integration
        if (typeof window !== 'undefined') {
          (window as any).globalEthereum = window.ethereum;
        }
        
        onConnect(connectedAddress);
        
        console.log(`✅ MetaMask connected: ${connectedAddress}`);
        if (network) {
          console.log(`🌐 Network: ${network.networkName} (${network.networkId})`);
        }
      }
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      setError(`Failed to connect: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress('');
    setNetworkInfo(null);
    setError('');
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (isMetaMaskInstalled()) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
            
            const network = await getCurrentNetwork();
            setNetworkInfo(network);
            
            // Make ethereum available globally
            if (typeof window !== 'undefined') {
              (window as any).globalEthereum = window.ethereum;
            }
            
            onConnect(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking MetaMask connection:', error);
        }
      }
    };

    checkConnection();

    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== address) {
          setAddress(accounts[0]);
          onConnect(accounts[0]);
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', async () => {
        const network = await getCurrentNetwork();
        setNetworkInfo(network);
      });
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [onConnect]);

  if (!isMetaMaskInstalled()) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🦊 MetaMask Required</h3>
        <p>Please install MetaMask to connect your Ethereum wallet.</p>
        <a 
          href="https://metamask.io/download.html" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#f6851b', textDecoration: 'none' }}
        >
          Download MetaMask
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>🦊 MetaMask Connection</h3>
      
      {!isConnected ? (
        <>
          <button 
            onClick={connectWallet} 
            disabled={isLoading}
            style={{
              backgroundColor: '#f6851b',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect MetaMask'}
          </button>
          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </>
      ) : (
        <div>
          <p>✅ <strong>Connected:</strong> {address}</p>
          {networkInfo && (
            <p>
              🌐 <strong>Network:</strong> {networkInfo.networkName}
              {networkInfo.isCorrectNetwork ? 
                <span style={{ color: 'green' }}> ✅</span> : 
                <span style={{ color: 'orange' }}> ⚠️ Switch to Sepolia</span>
              }
            </p>
          )}
          {networkInfo && !networkInfo.isCorrectNetwork && (
            <button 
              onClick={switchToSepolia}
              style={{
                backgroundColor: '#f6851b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Switch to Sepolia
            </button>
          )}
          <button 
            onClick={disconnectWallet}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default MetaMaskConnect; 
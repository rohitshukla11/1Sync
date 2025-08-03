import React from 'react';
import './App.css';
import HashlockedSwapFlow from './components/HashlockedSwapFlow';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">1Sync</h1>
              <p className="text-gray-600">Cross-Chain Atomic Swaps</p>
            </div>
          </div>
        </div>
      </div>

      <HashlockedSwapFlow />
    </div>
  );
}

export default App; 
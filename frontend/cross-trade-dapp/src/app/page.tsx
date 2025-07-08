'use client'

import { useState } from 'react'
import { ConnectButton } from "@/components/ConnectButton";
import { RequestModal } from "@/components/RequestModal";
import { useAccount } from 'wagmi'
import { RequestsList } from "@/components/RequestsList";
import { RequestDetailsModal } from "@/components/RequestDetailsModal";
import { AllRequestsList } from "@/components/AllRequestsList";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const { isConnected } = useAccount()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Cross-Trade DApp
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Connect your wallet to start trading across L1 and L2
        </p>
        <ConnectButton />
        
        {isConnected && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              Make Cross-Trade Request
            </button>
           
          </div>
        )}
      </div>

      <RequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    
      
      <div className="w-full max-w-6xl mt-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* <RequestsList /> */}
          <AllRequestsList />
        </div>
      </div>
    </div>
  );
}
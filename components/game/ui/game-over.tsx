"use client"

import { useRouter } from 'next/navigation'

interface GameOverProps {
  onRestart?: () => void
}

export default function GameOver({ onRestart }: GameOverProps) {
  const router = useRouter()

  const handleGoHome = () => {
    // Redirect to home page
    router.push('/')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="text-center text-white max-w-md mx-auto p-8">
        {/* Game Over Title */}
        <h1 className="text-7xl font-bold text-red-500 mb-12 animate-pulse drop-shadow-2xl">
          GAME OVER
        </h1>
        
        {/* Enemy Image - Larger and more prominent */}
        <div className="mb-12">
          <img 
            src="/enemyhakla.png" 
            alt="Enemy that defeated you" 
            className="w-48 h-48 mx-auto rounded-xl shadow-2xl border-4 border-red-500 animate-bounce"
          />
        </div>
        
        {/* Death Message */}
        <p className="text-2xl mb-12 text-gray-200 font-semibold drop-shadow-lg">
          You were defeated by the enemies!
        </p>
        
        {/* Home Button */}
        <button
          onClick={handleGoHome}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-6 px-12 rounded-xl text-2xl transition-all duration-200 shadow-2xl hover:shadow-red-500/25 transform hover:scale-105 active:scale-95"
        >
          Return to Home
        </button>
        
        {/* Instructions */}
        <p className="text-lg text-gray-400 mt-8 font-medium">
          Click to return to the main menu
        </p>
      </div>
    </div>
  )
}


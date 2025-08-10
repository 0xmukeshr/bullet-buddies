"use client"

import { useEffect } from "react"
import { useGameState } from "@/lib/game-state-context"
import { useBlockchainGame } from "@/lib/blockchain-game-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet, Trophy, Users, AlertCircle, Gamepad2 } from "lucide-react"

export default function TitlePage() {
  const { hasStarted, setGameStatus } = useGameState()
  const {
    contractState,
    isConnected,
    isLoading,
    error,
    walletAddress,
    connectWallet,
    blockchainEnabled,
    setBlockchainEnabled,
    startBlockchainGame,
    resetBlockchainGame
  } = useBlockchainGame()

  // Update the handlePlayButtonClick function to go directly to playing state if already started
  const handlePlayButtonClick = async () => {
    if (hasStarted) {
      console.log("Resume button clicked, setting game status directly to playing")
      setGameStatus("playing")
    } else {
      console.log("Play button clicked, setting game status to sleeping")
      
      // If blockchain is connected and enabled, start blockchain game
      if (isConnected && blockchainEnabled && !contractState.playerAlive && !contractState.enemyAlive) {
        console.log("🎮 Starting blockchain game along with regular game...")
        try {
          await startBlockchainGame()
          console.log("✅ Blockchain game started successfully")
        } catch (error) {
          console.error("❌ Failed to start blockchain game:", error)
          // Continue with regular game even if blockchain fails
        }
      }
      
      setGameStatus("sleeping")
    }
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Handle ESC key to resume game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && hasStarted) {
        console.log("ESC pressed on title screen, going to paused state")
        setGameStatus("sleeping")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasStarted, setGameStatus])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
      <div className="max-w-2xl w-full px-4">
        <h1 className="text-6xl font-bold text-center text-white mb-8">
          <span className="text-game-primary"> bULLET</span>
          <span className="text-game-accent">    bUDDIES</span>
        </h1>

        <div className="space-y-4 max-w-md mx-auto">
          <button
            onClick={handlePlayButtonClick}
            className="w-full py-3 px-4 bg-game-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
          >
            {hasStarted ? "Resume Game" : "Start Game"}
          </button>

          <button
            onClick={() => setGameStatus("settings")}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Settings
          </button>

          <button
            onClick={() => setGameStatus("howToPlay")}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            How to Play
          </button>
        </div>

        {/* Blockchain Integration Section */}
        <Card className="mt-8 max-w-md mx-auto bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gamepad2 className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Blockchain Gaming</h3>
            </div>
            
            {!isConnected ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-300">
                  Connect your wallet to track stats on blockchain
                </p>
                <Button
                  onClick={() => {
                    setBlockchainEnabled(true);
                    connectWallet();
                  }}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Connecting & Reading Contract...' : 'Connect Wallet'}
                </Button>
                <p className="text-xs text-gray-400">
                  Avalanche Fuji Testnet • Contract: 0x208879...C9a1
                </p>
                {isLoading && (
                  <div className="text-center space-y-2">
                    <p className="text-xs text-blue-400 animate-pulse">
                      🔐 Please approve transactions in MetaMask
                    </p>
                    <p className="text-xs text-gray-500">
                      May require 2-4 signatures for blockchain game setup
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Wallet</span>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Connected
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 font-mono text-center">
                  {walletAddress && shortenAddress(walletAddress)}
                </p>
                
                {/* Game Statistics */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 bg-blue-950/50 rounded border border-blue-800/30">
                    <Users className="h-3 w-3 mx-auto mb-1 text-blue-400" />
                    <p className="text-xs text-gray-400">Games</p>
                    <p className="text-sm font-bold text-white">{contractState.gamesPlayed}</p>
                  </div>
                  <div className="text-center p-2 bg-green-950/50 rounded border border-green-800/30">
                    <Trophy className="h-3 w-3 mx-auto mb-1 text-green-400" />
                    <p className="text-xs text-gray-400">Wins</p>
                    <p className="text-sm font-bold text-green-400">{contractState.playerWins}</p>
                  </div>
                  <div className="text-center p-2 bg-red-950/50 rounded border border-red-800/30">
                    <AlertCircle className="h-3 w-3 mx-auto mb-1 text-red-400" />
                    <p className="text-xs text-gray-400">Losses</p>
                    <p className="text-sm font-bold text-red-400">{contractState.enemyWins}</p>
                  </div>
                </div>
                
                {/* Win Rate */}
                {contractState.gamesPlayed > 0 && (
                  <div className="text-center mt-3">
                    <p className="text-xs text-gray-400">Win Rate</p>
                    <p className="text-lg font-bold text-blue-400">
                      {Math.round((contractState.playerWins / contractState.gamesPlayed) * 100)}%
                    </p>
                  </div>
                )}
                
                {/* Current Game Status */}
                {(contractState.playerAlive || contractState.enemyAlive) && (
                  <div className="p-2 bg-yellow-950/50 rounded border border-yellow-800/30 mt-3">
                    <p className="text-sm font-medium text-yellow-300 text-center">Game in Progress</p>
                    <div className="flex justify-between text-xs text-yellow-400 mt-1">
                      <span>Player: {contractState.playerAlive ? '🟢 Alive' : '🔴 Dead'}</span>
                      <span>Enemy: {contractState.enemyAlive ? '🟢 Alive' : '🔴 Dead'}</span>
                    </div>
                  </div>
                )}
                
                {/* Manual Blockchain Controls - for testing */}
                <div className="space-y-2 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => startBlockchainGame()}
                      disabled={isLoading || contractState.playerAlive || contractState.enemyAlive}
                      size="sm"
                      variant="outline"
                      className="text-xs border-blue-600 text-blue-400 hover:bg-blue-950"
                    >
                      🎮 Start Game
                    </Button>
                    <Button
                      onClick={() => resetBlockchainGame()}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                      className="text-xs border-red-600 text-red-400 hover:bg-red-950"
                    >
                      🔄 Reset
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Manual blockchain controls for testing</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-3 p-2 bg-red-950/50 border border-red-800/30 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <p className="text-xs text-red-300 font-medium">Error</p>
                </div>
                <p className="text-xs text-red-400 mt-1">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {hasStarted && (
          <div className="mt-6 text-center text-gray-400">
            <p>Press ESC to resume game</p>
          </div>
        )}

        <div className="mt-12 text-gray-400 text-center text-sm">
          <p>
            Made with ❤️ by {"Dematter"}
            </  p>
        </div>
      </div>
    </div>
  )
}

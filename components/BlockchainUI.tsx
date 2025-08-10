"use client"

import React from 'react'
import { useBlockchainGame } from '@/lib/blockchain-game-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Wallet, Trophy, Gamepad2, Users } from 'lucide-react'

interface BlockchainUIProps {
  className?: string
}

export function BlockchainUI({ className }: BlockchainUIProps) {
  const {
    contractState,
    isConnected,
    isLoading,
    error,
    walletAddress,
    connectWallet,
    blockchainEnabled,
    setBlockchainEnabled,
  } = useBlockchainGame()

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card className={`w-80 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-blue-600" />
          Blockchain Game
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blockchain Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enable Blockchain</label>
          <Switch
            checked={blockchainEnabled}
            onCheckedChange={setBlockchainEnabled}
            disabled={isLoading}
          />
        </div>

        {blockchainEnabled && (
          <>
            {/* Wallet Connection */}
            {!isConnected ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">Connect wallet to track your game stats on blockchain</p>
                <Button
                  onClick={connectWallet}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </div>
            ) : (
              <>
                {/* Wallet Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Wallet</span>
                    <Badge variant="outline" className="text-green-600">
                      Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    {walletAddress && shortenAddress(walletAddress)}
                  </p>
                </div>

                {/* Game Statistics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <Users className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <p className="text-xs text-gray-600">Games</p>
                    <p className="text-sm font-bold">{contractState.gamesPlayed}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <Trophy className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <p className="text-xs text-gray-600">Wins</p>
                    <p className="text-sm font-bold text-green-600">{contractState.playerWins}</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <AlertCircle className="h-4 w-4 mx-auto mb-1 text-red-600" />
                    <p className="text-xs text-gray-600">Losses</p>
                    <p className="text-sm font-bold text-red-600">{contractState.enemyWins}</p>
                  </div>
                </div>

                {/* Current Game Status */}
                {(contractState.playerAlive || contractState.enemyAlive) && (
                  <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-800">Game in Progress</p>
                    <div className="flex justify-between text-xs text-yellow-700 mt-1">
                      <span>Player: {contractState.playerAlive ? '🟢 Alive' : '🔴 Dead'}</span>
                      <span>Enemy: {contractState.enemyAlive ? '🟢 Alive' : '🔴 Dead'}</span>
                    </div>
                  </div>
                )}

                {/* Win Rate */}
                {contractState.gamesPlayed > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Win Rate</p>
                    <p className="text-lg font-bold text-blue-600">
                      {Math.round((contractState.playerWins / contractState.gamesPlayed) * 100)}%
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-red-700 font-medium">Error</p>
                </div>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            )}

            {/* Network Info */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              <p>Avalanche Fuji Testnet</p>
              <p className="font-mono">0x208879...C9a1</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default BlockchainUI


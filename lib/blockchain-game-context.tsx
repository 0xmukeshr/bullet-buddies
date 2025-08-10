"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { OneVsOneBlackRoom } from './blockchain/typechain-types'
import { OneVsOneBlackRoom__factory } from './blockchain/typechain-types'
import { usePlayerStatus } from './player-status-context'
import { useGameState } from './game-state-context'

// REAL deployed contract address on Fuji testnet
const CONTRACT_ADDRESS = "0x208879493F3081949d707dE514Da5B9557d9C9a1"

interface BlockchainGameState {
  player: string
  enemy: string
  playerAlive: boolean
  enemyAlive: boolean
  gamesPlayed: number
  playerWins: number
  enemyWins: number
}

interface BlockchainGameContextType {
  // Blockchain state
  contractState: BlockchainGameState
  isConnected: boolean
  isLoading: boolean
  error: string | null
  walletAddress: string | null
  
  // Contract actions
  connectWallet: () => Promise<void>
  startBlockchainGame: () => Promise<void>
  endBlockchainGame: (playerWon: boolean) => Promise<void>
  resetBlockchainGame: () => Promise<void>
  
  // Game integration flags
  blockchainEnabled: boolean
  setBlockchainEnabled: (enabled: boolean) => void
}

declare global {
  interface Window {
    ethereum: any
  }
}

const BlockchainGameContext = createContext<BlockchainGameContextType | null>(null)

export function BlockchainGameProvider({ children }: { children: ReactNode }) {
  const [contract, setContract] = useState<OneVsOneBlackRoom | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockchainEnabled, setBlockchainEnabled] = useState(false)
  
  const [contractState, setContractState] = useState<BlockchainGameState>({
    player: ethers.ZeroAddress,
    enemy: ethers.ZeroAddress,
    playerAlive: false,
    enemyAlive: false,
    gamesPlayed: 0,
    playerWins: 0,
    enemyWins: 0
  })
  
  // Get game contexts
  const playerStatus = usePlayerStatus()
  const gameState = useGameState()
  
  // Connect to wallet and contract
  const connectWallet = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)
      
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask')
      }

      const provider = new BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      setSigner(signer)
      setWalletAddress(address)
      
      // Connect to contract
      const gameContract = OneVsOneBlackRoom__factory.connect(CONTRACT_ADDRESS, signer)
      setContract(gameContract)
      
      // Load initial state
      await loadContractState(gameContract)
      
      console.log('🔗 Blockchain connected:', address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Load contract state
  const loadContractState = useCallback(async (gameContract?: OneVsOneBlackRoom) => {
    const contractToUse = gameContract || contract
    if (!contractToUse) return

    try {
      const [player, enemy, [playerStatus, enemyStatus], [total, pWins, eWins]] = await Promise.all([
        contractToUse.player(),
        contractToUse.enemy(),
        contractToUse.checkStatus(),
        contractToUse.getGameStats()
      ])

      setContractState({
        player,
        enemy,
        playerAlive: playerStatus,
        enemyAlive: enemyStatus,
        gamesPlayed: Number(total),
        playerWins: Number(pWins),
        enemyWins: Number(eWins)
      })
    } catch (err) {
      console.error('Failed to load contract state:', err)
    }
  }, [contract])
  
  // Start blockchain game (spawn player and enemy)
  const startBlockchainGame = useCallback(async () => {
    if (!contract || !blockchainEnabled) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Spawn player
      const spawnPlayerTx = await contract.spawnPlayer()
      await spawnPlayerTx.wait()
      
      // Generate random enemy address and spawn
      const randomWallet = ethers.Wallet.createRandom()
      const enemyAddress = randomWallet.address
      
      const spawnEnemyTx = await contract.spawnEnemy(enemyAddress)
      await spawnEnemyTx.wait()
      
      await loadContractState()
      
      console.log('🎮 Blockchain game started!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start blockchain game')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, blockchainEnabled, loadContractState])
  
  // End blockchain game (kill player or enemy)
  const endBlockchainGame = useCallback(async (playerWon: boolean) => {
    if (!contract || !blockchainEnabled) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      if (playerWon) {
        // Player wins - kill enemy
        const killEnemyTx = await contract.killEnemy()
        await killEnemyTx.wait()
        console.log('🏆 Player won! Enemy eliminated on blockchain.')
      } else {
        // Player loses - kill player
        const killPlayerTx = await contract.killPlayer()
        await killPlayerTx.wait()
        console.log('💀 Player died! Loss recorded on blockchain.')
      }
      
      await loadContractState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end blockchain game')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, blockchainEnabled, loadContractState])
  
  // Reset blockchain game
  const resetBlockchainGame = useCallback(async () => {
    if (!contract || !blockchainEnabled) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const resetTx = await contract.resetGame()
      await resetTx.wait()
      
      await loadContractState()
      
      console.log('🔄 Blockchain game reset!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset blockchain game')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [contract, blockchainEnabled, loadContractState])
  
  // Monitor player health for blockchain integration
  useEffect(() => {
    if (!blockchainEnabled || !contract || !contractState.playerAlive) return
    
    if (playerStatus.health <= 0) {
      console.log('💀 Player health reached 0, ending blockchain game...')
      endBlockchainGame(false) // Player lost
    }
  }, [playerStatus.health, blockchainEnabled, contract, contractState.playerAlive, endBlockchainGame])
  
  // Monitor game state changes
  useEffect(() => {
    if (!blockchainEnabled) return
    
    // Start blockchain game when transitioning to playing
    if (gameState.gameStatus === 'playing' && gameState.hasStarted && contract && 
        !contractState.playerAlive && !contractState.enemyAlive) {
      console.log('🚀 Game started, initializing blockchain game...')
      startBlockchainGame().catch(console.error)
    }
    
    // Reset blockchain game when returning to title
    if (gameState.gameStatus === 'title' && contract && 
        (contractState.playerAlive || contractState.enemyAlive)) {
      console.log('🔄 Game reset, resetting blockchain game...')
      resetBlockchainGame().catch(console.error)
    }
  }, [gameState.gameStatus, gameState.hasStarted, blockchainEnabled, contract, 
      contractState.playerAlive, contractState.enemyAlive, startBlockchainGame, resetBlockchainGame])
  
  // Listen for contract events
  useEffect(() => {
    if (!contract) return

    const handlePlayerSpawned = (player: string) => {
      console.log('🏃 Player spawned on blockchain:', player)
      loadContractState()
    }
    
    const handleEnemySpawned = (enemy: string) => {
      console.log('👾 Enemy spawned on blockchain:', enemy)
      loadContractState()
    }
    
    const handlePlayerKilled = (player: string) => {
      console.log('💀 Player killed on blockchain:', player)
      loadContractState()
    }
    
    const handleEnemyKilled = (enemy: string) => {
      console.log('🏆 Enemy killed on blockchain:', enemy)
      loadContractState()
    }
    
    const handleGameReset = () => {
      console.log('🔄 Game reset on blockchain')
      loadContractState()
    }

    contract.on('PlayerSpawned', handlePlayerSpawned)
    contract.on('EnemySpawned', handleEnemySpawned)
    contract.on('PlayerKilled', handlePlayerKilled)
    contract.on('EnemyKilled', handleEnemyKilled)
    contract.on('GameReset', handleGameReset)

    return () => {
      contract.off('PlayerSpawned', handlePlayerSpawned)
      contract.off('EnemySpawned', handleEnemySpawned)
      contract.off('PlayerKilled', handlePlayerKilled)
      contract.off('EnemyKilled', handleEnemyKilled)
      contract.off('GameReset', handleGameReset)
    }
  }, [contract, loadContractState])
  
  return (
    <BlockchainGameContext.Provider
      value={{
        contractState,
        isConnected: !!contract,
        isLoading,
        error,
        walletAddress,
        connectWallet,
        startBlockchainGame,
        endBlockchainGame,
        resetBlockchainGame,
        blockchainEnabled,
        setBlockchainEnabled,
      }}
    >
      {children}
    </BlockchainGameContext.Provider>
  )
}

export function useBlockchainGame() {
  const context = useContext(BlockchainGameContext)
  if (!context) {
    throw new Error('useBlockchainGame must be used within a BlockchainGameProvider')
  }
  return context
}


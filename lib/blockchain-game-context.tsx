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
  const [isConnecting, setIsConnecting] = useState(false)
  const [gameInitialized, setGameInitialized] = useState(false)
  const [isTransactionPending, setIsTransactionPending] = useState(false)
  const [transactionQueue, setTransactionQueue] = useState<Array<() => Promise<void>>>([])
  
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
  
  // Transaction queue system to prevent multiple simultaneous transactions
  const executeTransaction = useCallback(async (transactionFn: () => Promise<void>, description: string) => {
    if (isTransactionPending) {
      console.log(`⚠️ Transaction "${description}" skipped - another transaction is pending`)
      return
    }
    
    try {
      setIsTransactionPending(true)
      console.log(`🔄 Starting transaction: ${description}`)
      await transactionFn()
      console.log(`✅ Transaction completed: ${description}`)
    } catch (error) {
      console.error(`❌ Transaction failed: ${description}`, error)
      throw error
    } finally {
      setIsTransactionPending(false)
    }
  }, [isTransactionPending])
  
  // Connect to wallet and contract with connection state management
  const connectWallet = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting || isLoading) {
      console.log('🔒 Connection already in progress, skipping...')
      return
    }

    try {
      setError(null)
      setIsLoading(true)
      setIsConnecting(true)
      
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask and connect to Avalanche Fuji Testnet')
      }

      const provider = new BrowserProvider(window.ethereum)
      
      // Check if we're on the correct network (Fuji testnet)
      try {
        const network = await provider.getNetwork()
        console.log('🌐 Current network:', network.chainId, network.name)
        
        if (network.chainId !== BigInt(43113)) {
          // Request network switch to Fuji testnet
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xa869' }], // 43113 in hex
            })
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xa869',
                    chainName: 'Avalanche Fuji Testnet',
                    nativeCurrency: {
                      name: 'AVAX',
                      symbol: 'AVAX',
                      decimals: 18,
                    },
                    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                    blockExplorerUrls: ['https://testnet.snowtrace.io/'],
                  },
                ],
              })
            } else {
              throw switchError
            }
          }
        }
      } catch (networkErr) {
        console.warn('⚠️ Network check/switch failed:', networkErr)
        // Continue anyway, let user handle network manually
      }
      
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      setSigner(signer)
      setWalletAddress(address)
      
      // Auto-enable blockchain when wallet connects successfully
      setBlockchainEnabled(true)
      
      // Connect to contract
      const gameContract = OneVsOneBlackRoom__factory.connect(CONTRACT_ADDRESS, signer)
      setContract(gameContract)
      
      // Test contract connection with a simple read operation
      console.log('🔗 Testing contract connection...')
      try {
        await gameContract.getGameStats()
        console.log('✅ Contract connection successful')
      } catch (contractErr) {
        console.warn('⚠️ Contract read test failed:', contractErr)
        // Continue anyway - might be a network issue
      }
      
      // Load initial state
      await loadContractState(gameContract)
      
      console.log('🔗 Blockchain connected:', address)
      console.log('📋 Contract address:', CONTRACT_ADDRESS)
      console.log('🌐 Ready to interact with Avalanche Fuji Testnet')
    } catch (err) {
      console.error('❌ Wallet connection failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
      // Reset blockchain enabled on connection failure
      setBlockchainEnabled(false)
    } finally {
      setIsLoading(false)
      setIsConnecting(false)
    }
  }, [isConnecting, isLoading])
  
  // Load contract state
  const loadContractState = useCallback(async (gameContract?: OneVsOneBlackRoom) => {
    const contractToUse = gameContract || contract
    if (!contractToUse) return

    try {
      // Load basic contract state first
      const [player, enemy, [total, pWins, eWins]] = await Promise.all([
        contractToUse.player(),
        contractToUse.enemy(),
        contractToUse.getGameStats()
      ])

      // Only check status if both player and enemy are set (not zero address)
      let playerStatus = false
      let enemyStatus = false
      
      if (player !== ethers.ZeroAddress && enemy !== ethers.ZeroAddress) {
        try {
          const [pStatus, eStatus] = await contractToUse.checkStatus()
          playerStatus = pStatus
          enemyStatus = eStatus
        } catch (statusErr) {
          console.warn('⚠️ Could not check game status:', statusErr)
          // Leave status as false if we can't check
        }
      }

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
      // Set error but don't throw to prevent UI crashes
      setError('Failed to load blockchain state')
    }
  }, [contract])
  
  // Start blockchain game (spawn player and enemy)
  const startBlockchainGame = useCallback(async () => {
    if (!contract || !blockchainEnabled) return
    
    return executeTransaction(async () => {
      setError(null)
      
      // Check current contract state first
      const currentPlayer = await contract.player()
      const currentEnemy = await contract.enemy()
      const [playerAlive, enemyAlive] = await contract.checkStatus()
      
      console.log('🔍 Current contract state:', {
        player: currentPlayer,
        enemy: currentEnemy,
        playerIsZero: currentPlayer === ethers.ZeroAddress,
        enemyIsZero: currentEnemy === ethers.ZeroAddress,
        playerAlive,
        enemyAlive
      })
      
      // If player or enemy already exist, we need to reset
      if (currentPlayer !== ethers.ZeroAddress || currentEnemy !== ethers.ZeroAddress) {
        console.log('⚠️ Game already exists, resetting...')
        
        // If game is still in progress, end it first
        if (playerAlive && enemyAlive) {
          console.log('⚠️ Game still in progress, ending it to allow reset...')
          try {
            // Try to kill enemy first to end the game
            const gasEstimate = await contract.killEnemy.estimateGas()
            const killEnemyTx = await contract.killEnemy({
              gasLimit: gasEstimate * BigInt(120) / BigInt(100),
              gasPrice: ethers.parseUnits('25', 'gwei')
            })
            await killEnemyTx.wait()
            console.log('✅ Enemy killed to end current game')
          } catch (killErr) {
            console.log('Could not kill enemy, trying to kill player instead')
            try {
              const gasEstimate = await contract.killPlayer.estimateGas()
              const killPlayerTx = await contract.killPlayer({
                gasLimit: gasEstimate * BigInt(120) / BigInt(100),
                gasPrice: ethers.parseUnits('25', 'gwei')
              })
              await killPlayerTx.wait()
              console.log('✅ Player killed to end current game')
            } catch (killPlayerErr) {
              console.error('Could not end game by killing either player or enemy')
              throw new Error('Cannot start new game - unable to end current game')
            }
          }
        }
        
        // Now reset the game
        try {
          console.log('🔄 Resetting game...')
          const gasEstimate = await contract.resetGame.estimateGas()
          const resetTx = await contract.resetGame({
            gasLimit: gasEstimate * BigInt(120) / BigInt(100),
            gasPrice: ethers.parseUnits('25', 'gwei')
          })
          await resetTx.wait()
          console.log('✅ Game reset successful')
        } catch (resetErr) {
          console.error('Failed to reset game:', resetErr)
          throw new Error(`Failed to reset game: ${resetErr.message}`)
        }
      }
      
      // Now spawn player with proper gas handling
      console.log('🏃 Spawning player...')
      try {
        // Estimate gas first to avoid transaction failures
        const gasEstimate = await contract.spawnPlayer.estimateGas()
        const spawnPlayerTx = await contract.spawnPlayer({
          gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
          gasPrice: ethers.parseUnits('25', 'gwei') // Fuji testnet gas price
        })
        await spawnPlayerTx.wait()
        console.log('✅ Player spawned successfully')
      } catch (spawnErr: any) {
        console.error('❌ Failed to spawn player:', spawnErr)
        if (spawnErr.reason === 'Player already set') {
          console.log('⚠️ Player already spawned, continuing...')
        } else {
          throw new Error(`Failed to spawn player: ${spawnErr.message}`)
        }
      }
      
      // Generate random enemy address and spawn with proper gas handling
      const randomWallet = ethers.Wallet.createRandom()
      const enemyAddress = randomWallet.address
      
      console.log('👾 Spawning enemy:', enemyAddress)
      try {
        // Estimate gas first
        const gasEstimate = await contract.spawnEnemy.estimateGas(enemyAddress)
        const spawnEnemyTx = await contract.spawnEnemy(enemyAddress, {
          gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
          gasPrice: ethers.parseUnits('25', 'gwei') // Fuji testnet gas price
        })
        await spawnEnemyTx.wait()
        console.log('✅ Enemy spawned successfully')
      } catch (spawnErr: any) {
        console.error('❌ Failed to spawn enemy:', spawnErr)
        throw new Error(`Failed to spawn enemy: ${spawnErr.message}`)
      }
      
      // Reload contract state
      await loadContractState()
      
      console.log('🎮 Blockchain game started successfully!')
    }, "Start Blockchain Game")
  }, [contract, blockchainEnabled, loadContractState, executeTransaction])
  
  // End blockchain game (kill player or enemy)
  const endBlockchainGame = useCallback(async (playerWon: boolean) => {
    console.log('🎯 endBlockchainGame called:', {
      playerWon,
      contract: !!contract,
      blockchainEnabled,
      contractState: {
        playerAlive: contractState.playerAlive,
        enemyAlive: contractState.enemyAlive,
        player: contractState.player,
        enemy: contractState.enemy
      }
    })
    
    if (!contract) {
      console.log('❌ No contract available for endBlockchainGame')
      return
    }
    
    if (!blockchainEnabled) {
      console.log('❌ Blockchain not enabled for endBlockchainGame')
      return
    }
    
    return executeTransaction(async () => {
      setError(null)
      
      if (playerWon) {
        // Player wins - kill enemy (check if enemy exists first)
        if (contractState.enemy === ethers.ZeroAddress || !contractState.enemyAlive) {
          console.warn('Cannot kill enemy - no enemy set or already dead')
          return
        }
        try {
          const gasEstimate = await contract.killEnemy.estimateGas()
          const killEnemyTx = await contract.killEnemy({
            gasLimit: gasEstimate * BigInt(120) / BigInt(100),
            gasPrice: ethers.parseUnits('25', 'gwei')
          })
          await killEnemyTx.wait()
          console.log('🏆 Player won! Enemy eliminated on blockchain.')
        } catch (killErr: any) {
          console.error('❌ Failed to kill enemy:', killErr)
          throw new Error(`Failed to record enemy death: ${killErr.message}`)
        }
      } else {
        // Player loses - kill player (check if player exists first)
        if (contractState.player === ethers.ZeroAddress || !contractState.playerAlive) {
          console.warn('Cannot kill player - no player set or already dead')
          return
        }
        try {
          const gasEstimate = await contract.killPlayer.estimateGas()
          const killPlayerTx = await contract.killPlayer({
            gasLimit: gasEstimate * BigInt(120) / BigInt(100),
            gasPrice: ethers.parseUnits('25', 'gwei')
          })
          await killPlayerTx.wait()
          console.log('💀 Player died! Loss recorded on blockchain.')
        } catch (killErr: any) {
          console.error('❌ Failed to kill player:', killErr)
          throw new Error(`Failed to record player death: ${killErr.message}`)
        }
      }
      
      await loadContractState()
    }, playerWon ? "Kill Enemy - Player Won" : "Kill Player - Player Lost")
  }, [contract, blockchainEnabled, contractState, loadContractState, executeTransaction])
  
  // Reset blockchain game
  const resetBlockchainGame = useCallback(async () => {
    if (!contract || !blockchainEnabled) return
    
    return executeTransaction(async () => {
      setError(null)
      
      // Check if game is still in progress
      try {
        const [playerAlive, enemyAlive] = await contract.checkStatus()
        if (playerAlive && enemyAlive) {
          console.log('⚠️ Game in progress, killing enemy first to allow reset...')
          const gasEstimate = await contract.killEnemy.estimateGas()
          const killEnemyTx = await contract.killEnemy({
            gasLimit: gasEstimate * BigInt(120) / BigInt(100),
            gasPrice: ethers.parseUnits('25', 'gwei')
          })
          await killEnemyTx.wait()
          console.log('✅ Enemy killed, now can reset')
        }
      } catch (statusErr) {
        console.warn('Could not check game status, attempting direct reset')
      }
      
      const gasEstimate = await contract.resetGame.estimateGas()
      const resetTx = await contract.resetGame({
        gasLimit: gasEstimate * BigInt(120) / BigInt(100),
        gasPrice: ethers.parseUnits('25', 'gwei')
      })
      await resetTx.wait()
      
      await loadContractState()
      
      console.log('🔄 Blockchain game reset!')
    }, "Reset Blockchain Game")
  }, [contract, blockchainEnabled, loadContractState, executeTransaction])
  
  // Monitor game state for player death - only trigger killPlayer when game is actually over
  useEffect(() => {
    console.log('🔍 Game over check:', {
      gameStatus: gameState.gameStatus,
      health: playerStatus.health,
      blockchainEnabled,
      contract: !!contract,
      playerAlive: contractState.playerAlive
    })
    
    if (!blockchainEnabled) {
      console.log('⚠️ Blockchain not enabled, skipping game over check')
      return
    }
    
    if (!contract) {
      console.log('⚠️ No contract connected, skipping game over check')
      return
    }
    
    if (!contractState.playerAlive) {
      console.log('⚠️ Player not alive on blockchain, skipping game over check')
      return
    }
    
    // Only trigger killPlayer when game status is 'game-over' AND player health is 0
    if (gameState.gameStatus === 'game-over' && playerStatus.health <= 0) {
      console.log('💀 Game over confirmed - player died! Recording death on blockchain...')
      endBlockchainGame(false).then(() => {
        console.log('✅ Player death recorded on blockchain')
      }).catch(err => {
        console.error('❌ Failed to record player death on blockchain:', err)
      })
    }
  }, [gameState.gameStatus, playerStatus.health, blockchainEnabled, contract, contractState.playerAlive, endBlockchainGame])
  
  // Monitor game state changes with debouncing
  useEffect(() => {
    if (!blockchainEnabled || !contract) {
      console.log('🔍 Blockchain not enabled or contract not connected:', { blockchainEnabled, contract: !!contract })
      setGameInitialized(false)
      return
    }
    
    console.log('🔍 Game state check:', {
      gameStatus: gameState.gameStatus,
      hasStarted: gameState.hasStarted,
      playerAlive: contractState.playerAlive,
      enemyAlive: contractState.enemyAlive,
      player: contractState.player,
      enemy: contractState.enemy,
      gameInitialized,
      isLoading
    })
    
    // Start blockchain game when transitioning to playing - with strict debouncing
    if (gameState.gameStatus === 'playing' && gameState.hasStarted && !gameInitialized && !isLoading) {
      const needsNewGame = (
        (!contractState.playerAlive && !contractState.enemyAlive) ||
        (contractState.player === ethers.ZeroAddress && contractState.enemy === ethers.ZeroAddress)
      )
      
      if (needsNewGame) {
        console.log('🚀 Game started, initializing blockchain game...')
        setGameInitialized(true)
        
        // Add timeout to prevent immediate triggering
        const initTimer = setTimeout(() => {
          startBlockchainGame().catch((err) => {
            console.error('Failed to start blockchain game:', err)
            setGameInitialized(false) // Reset on failure
          })
        }, 1000) // Wait 1 second before starting blockchain game
        
        return () => clearTimeout(initTimer)
      } else {
        console.log('🔍 Blockchain game already in progress, skipping initialization')
        setGameInitialized(true) // Mark as initialized if game is already running
      }
    }
    
    // Reset blockchain game when returning to title
    if (gameState.gameStatus === 'title') {
      console.log('🏠 Returning to home/title screen - checking reset needs:', {
        playerAlive: contractState.playerAlive,
        enemyAlive: contractState.enemyAlive,
        playerAddress: contractState.player,
        enemyAddress: contractState.enemy,
        blockchainEnabled
      })
      
      // Reset blockchain game if there are active players/enemies OR if addresses are set
      const needsReset = (
        contractState.playerAlive || 
        contractState.enemyAlive || 
        (contractState.player !== ethers.ZeroAddress) ||
        (contractState.enemy !== ethers.ZeroAddress)
      )
      
      if (needsReset && blockchainEnabled && contract) {
        console.log('🔄 Game reset needed, resetting blockchain game...')
        resetBlockchainGame().then(() => {
          console.log('✅ Blockchain game reset completed - ready for new game')
        }).catch((error) => {
          console.error('❌ Failed to reset blockchain game:', error)
          // Set error but don't block the reset process
          setError('Failed to reset blockchain game. You may need to manually reset.')
        })
      } else if (!blockchainEnabled) {
        console.log('ℹ️ Blockchain not enabled, skipping blockchain reset')
      } else if (!needsReset) {
        console.log('ℹ️ No blockchain reset needed - game already clean')
      }
      
      setGameInitialized(false) // Reset initialization state
    }
    
    // Reset initialization state when transitioning to game over
    if (gameState.gameStatus === 'game-over') {
      setGameInitialized(false)
    }
  }, [gameState.gameStatus, gameState.hasStarted, blockchainEnabled, contract, 
      contractState.playerAlive, contractState.enemyAlive, contractState.player, contractState.enemy, 
      startBlockchainGame, resetBlockchainGame, gameInitialized, isLoading])
  
  // Listen for contract events with debouncing
  useEffect(() => {
    if (!contract || !blockchainEnabled) return

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

    // Note: Event listening disabled for now due to TypeChain v6 compatibility issues
    // TODO: Implement proper event listening with filters when needed
    console.log('Event listeners disabled - will poll state instead')
    
    // Reduced polling frequency and only when blockchain is enabled and game is active
    const pollInterval = setInterval(() => {
      if (contract && blockchainEnabled && (gameState.gameStatus === 'playing' || gameState.gameStatus === 'sleeping')) {
        loadContractState(contract)
      }
    }, 10000) // Reduced frequency: Poll every 10 seconds instead of 5

    return () => {
      clearInterval(pollInterval)
    }
  }, [contract, loadContractState, blockchainEnabled, gameState.gameStatus])
  
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


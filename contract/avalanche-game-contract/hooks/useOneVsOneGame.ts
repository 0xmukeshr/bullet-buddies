import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers';
import { OneVsOneBlackRoom } from '../typechain-types';
import { OneVsOneBlackRoom__factory } from '../typechain-types';

interface GameState {
  player: string;
  enemy: string;
  playerAlive: boolean;
  enemyAlive: boolean;
  gamesPlayed: number;
  playerWins: number;
  enemyWins: number;
}

export function useOneVsOneGame() {

// Fuji testnet deployed contract address
const CONTRACT_ADDRESS = "0x208879493F3081949d707dE514Da5B9557d9C9a1";

// Gas optimization settings for Avalanche Fuji
const TX_OVERRIDES = {
  gasLimit: 100000, // Conservative gas limit
  maxFeePerGas: 25000000000, // 25 gwei
  maxPriorityFeePerGas: 2000000000, // 2 gwei
};

// Avalanche Fuji Testnet configuration
const AVALANCHE_FUJI = {
  chainId: '0xa869', // 43113 in hex
  chainName: 'Avalanche Fuji Testnet',
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
};

// Utility function to add/switch to Avalanche Fuji network
const switchToAvalancheFuji = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AVALANCHE_FUJI.chainId }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [AVALANCHE_FUJI],
        });
      } catch (addError) {
        throw new Error('Failed to add Avalanche Fuji network');
      }
    } else {
      throw switchError;
    }
  }
};
  const [contract, setContract] = useState<OneVsOneBlackRoom | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    player: ethers.ZeroAddress,
    enemy: ethers.ZeroAddress,
    playerAlive: false,
    enemyAlive: false,
    gamesPlayed: 0,
    playerWins: 0,
    enemyWins: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to contract with network validation
  const connect = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask to play this game');
      }

      // Check and switch to Avalanche Fuji if needed
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 43113n) { // 43113 is Avalanche Fuji chain ID
        setError('Wrong network detected. Switching to Avalanche Fuji...');
        await switchToAvalancheFuji();
        
        // Wait a bit and refresh provider after network switch
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setSigner(signer);
      
      // TypeChain generated factory with full type safety
      const gameContract = OneVsOneBlackRoom__factory.connect(CONTRACT_ADDRESS, signer);
      setContract(gameContract);

      // Clear any previous errors and load initial game state
      setError(null);
      await loadGameState(gameContract);

    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Please connect your MetaMask wallet to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect to game');
      }
    }
  }, []);

  // Load game state from contract
  const loadGameState = useCallback(async (gameContract?: OneVsOneBlackRoom) => {
    const contractToUse = gameContract || contract;
    if (!contractToUse) return;

    try {
      const [player, enemy, [playerStatus, enemyStatus], [total, pWins, eWins]] = await Promise.all([
        contractToUse.player(),
        contractToUse.enemy(),
        contractToUse.checkStatus(),
        contractToUse.getGameStats()
      ]);

      console.log('🔍 Debug - Contract State:');
      console.log('Player address:', player);
      console.log('Enemy address:', enemy);
      console.log('Player alive:', playerStatus);
      console.log('Enemy alive:', enemyStatus);
      console.log('Games played:', Number(total));
      console.log('Player wins:', Number(pWins));
      console.log('Enemy wins:', Number(eWins));

      setGameState({
        player,
        enemy,
        playerAlive: playerStatus,
        enemyAlive: enemyStatus,
        gamesPlayed: Number(total),
        playerWins: Number(pWins),
        enemyWins: Number(eWins)
      });
    } catch (err) {
      console.error('Failed to load game state:', err);
    }
  }, [contract]);

  // Spawn player with optimized gas settings
  const spawnPlayer = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.spawnPlayer(TX_OVERRIDES);
      await tx.wait();
      await loadGameState();
    } catch (err: any) {
      // Handle specific MetaMask rejection errors
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Transaction was rejected by user. Please approve the transaction to continue playing.');
      } else if (err?.code === -32603) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to spawn player');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Spawn enemy with random address generation
  const spawnEnemyRandom = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      // Generate random enemy address
      const randomWallet = ethers.Wallet.createRandom();
      const enemyAddress = randomWallet.address;
      
      const tx = await contract.spawnEnemy(enemyAddress, TX_OVERRIDES);
      await tx.wait();
      await loadGameState();
    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Transaction was rejected by user. Please approve the transaction to spawn enemy.');
      } else if (err?.code === -32603) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to spawn enemy');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Spawn enemy with specific address
  const spawnEnemy = useCallback(async (enemyAddress: string) => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.spawnEnemy(enemyAddress, TX_OVERRIDES);
      await tx.wait();
      await loadGameState();
    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Transaction was rejected by user. Please approve the transaction to spawn enemy.');
      } else if (err?.code === -32603) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to spawn enemy');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Kill player (called when enemy gets close for 20s)
  const killPlayer = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.killPlayer(TX_OVERRIDES);
      await tx.wait();
      await loadGameState();
    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Transaction was rejected by user. Please approve the transaction to record player death.');
      } else if (err?.code === -32603) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to kill player');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Kill enemy (automatic - no transaction needed, just track locally)
  const killEnemy = useCallback(async () => {
    // Enemy death is handled locally in the game
    // No blockchain transaction needed - player wins automatically
    console.log('Enemy defeated - player wins! No transaction needed.');
    await loadGameState();
  }, [loadGameState]);

  // Reset game (only works when game is over)
  const resetGame = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    // Check if game is actually over before attempting reset
    const gameOver = await contract.isGameOver();
    if (!gameOver) {
      setError('Cannot reset game while both players are still alive. One player must die first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.resetGame(TX_OVERRIDES);
      await tx.wait();
      await loadGameState();
    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Transaction was rejected by user. Please approve the transaction to reset the game.');
      } else if (err?.code === -32603) {
        setError('Network error. Please check your connection and try again.');
      } else if (err?.reason === 'Game still in progress') {
        setError('Cannot reset: Game is still in progress. One player must die first.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to reset game');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Check if game is over
  const isGameOver = useCallback(async (): Promise<boolean> => {
    if (!contract) return false;
    return await contract.isGameOver();
  }, [contract]);

  // Direct blockchain state check (for debugging)
  const checkBlockchainState = useCallback(async () => {
    if (!contract) {
      console.log('❌ No contract connected');
      return;
    }

    try {
      console.log('🔍 Direct blockchain state check...');
      const player = await contract.player();
      const enemy = await contract.enemy();
      const playerAlive = await contract.playerAlive();
      const enemyAlive = await contract.enemyAlive();
      const [total, pWins, eWins] = await contract.getGameStats();

      console.log('Direct results:');
      console.log('- Player:', player);
      console.log('- Enemy:', enemy);
      console.log('- Player Alive:', playerAlive);
      console.log('- Enemy Alive:', enemyAlive);
      console.log('- Games:', Number(total), 'Player Wins:', Number(pWins), 'Enemy Wins:', Number(eWins));
    } catch (err) {
      console.error('Direct state check failed:', err);
    }
  }, [contract]);

  // Convenient function to start a new game - spawns both player and enemy with 2 transactions
  const startNewGame = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      // First spawn the player (Transaction 1)
      console.log('🎮 Spawning player... (1/2)');
      const playerTx = await contract.spawnPlayer(TX_OVERRIDES);
      await playerTx.wait();
      await loadGameState();

      // Then spawn a random enemy (Transaction 2)
      console.log('👾 Spawning enemy... (2/2)');
      const randomWallet = ethers.Wallet.createRandom();
      const enemyAddress = randomWallet.address;
      
      const enemyTx = await contract.spawnEnemy(enemyAddress, TX_OVERRIDES);
      await enemyTx.wait();
      await loadGameState();
      
      console.log('✅ Game ready! Both players spawned.');

    } catch (err: any) {
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setError('Transaction was rejected by user. Please approve both transactions to start the game.');
      } else if (err?.code === -32603) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start new game');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Listen for events with full type safety
  useEffect(() => {
    if (!contract) return;

    const handlePlayerSpawned = (player: string) => {
      console.log('Player spawned:', player);
      loadGameState();
    };
    
    const handleEnemySpawned = (enemy: string) => {
      console.log('Enemy spawned:', enemy);
      loadGameState();
    };
    
    const handlePlayerKilled = (player: string) => {
      console.log('Player killed:', player);
      loadGameState();
    };
    
    const handleEnemyKilled = (enemy: string) => {
      console.log('Enemy killed:', enemy);
      loadGameState();
    };
    
    const handleGameReset = () => {
      console.log('Game reset');
      loadGameState();
    };

    contract.on('PlayerSpawned', handlePlayerSpawned);
    contract.on('EnemySpawned', handleEnemySpawned);
    contract.on('PlayerKilled', handlePlayerKilled);
    contract.on('EnemyKilled', handleEnemyKilled);
    contract.on('GameReset', handleGameReset);

    return () => {
      contract.off('PlayerSpawned', handlePlayerSpawned);
      contract.off('EnemySpawned', handleEnemySpawned);
      contract.off('PlayerKilled', handlePlayerKilled);
      contract.off('EnemyKilled', handleEnemyKilled);
      contract.off('GameReset', handleGameReset);
    };
  }, [contract, loadGameState]);

  // Helper functions for UI logic
  const canResetGame = useCallback(() => {
    // Can only reset when at least one player is dead
    return !gameState.playerAlive || !gameState.enemyAlive;
  }, [gameState.playerAlive, gameState.enemyAlive]);

  const canSpawnPlayer = useCallback(() => {
    // Can spawn player when no player exists (address is zero)
    return gameState.player === ethers.ZeroAddress;
  }, [gameState.player]);

  const canSpawnEnemy = useCallback(() => {
    // Can spawn enemy when no enemy exists and player exists
    return gameState.enemy === ethers.ZeroAddress && gameState.player !== ethers.ZeroAddress;
  }, [gameState.enemy, gameState.player]);

  const getGameStatus = useCallback(() => {
    if (gameState.player === ethers.ZeroAddress) {
      return 'waiting_for_player';
    } else if (gameState.enemy === ethers.ZeroAddress) {
      return 'waiting_for_enemy';
    } else if (gameState.playerAlive && gameState.enemyAlive) {
      return 'in_progress';
    } else if (!gameState.playerAlive) {
      return 'player_dead';
    } else if (!gameState.enemyAlive) {
      return 'enemy_dead';
    }
    return 'unknown';
  }, [gameState]);

  return {
    // State
    gameState,
    isLoading,
    error,
    isConnected: !!contract,

    // Helper functions
    canResetGame: canResetGame(),
    canSpawnPlayer: canSpawnPlayer(),
    canSpawnEnemy: canSpawnEnemy(),
    gameStatus: getGameStatus(),

    // Actions
    connect,
    startNewGame,
    spawnPlayer,
    spawnEnemyRandom,
    spawnEnemy,
    killPlayer,
    killEnemy,
    resetGame,
    isGameOver,
    refreshState: () => loadGameState(),
    checkBlockchainState
  };
}


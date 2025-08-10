import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers';
import { OneVsOneBlackRoom } from '../../typechain-types';
import { OneVsOneBlackRoom__factory } from '../../typechain-types';

// Update this with your deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

interface GameState {
  player: string;
  enemy: string;
  playerAlive: boolean;
  enemyAlive: boolean;
  gamesPlayed: number;
  playerWins: number;
  enemyWins: number;
}

interface UseOneVsOneGameReturn {
  // State
  gameState: GameState;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  connect: () => Promise<void>;
  spawnPlayer: () => Promise<void>;
  spawnEnemyRandom: () => Promise<void>;
  spawnEnemy: (enemyAddress: string) => Promise<void>;
  killPlayer: () => Promise<void>;
  killEnemy: () => Promise<void>;
  resetGame: () => Promise<void>;
  isGameOver: () => Promise<boolean>;
  refreshState: () => Promise<void>;
}

declare global {
  interface Window {
    ethereum: any;
  }
}

export function useOneVsOneGame(): UseOneVsOneGameReturn {
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

  // Connect to contract
  const connect = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setSigner(signer);
      
      // TypeChain generated factory with full type safety
      const gameContract = OneVsOneBlackRoom__factory.connect(CONTRACT_ADDRESS, signer);
      setContract(gameContract);

      // Load initial game state
      await loadGameState(gameContract);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
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

  // Spawn player
  const spawnPlayer = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.spawnPlayer();
      await tx.wait();
      await loadGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn player');
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
      
      const tx = await contract.spawnEnemy(enemyAddress);
      await tx.wait();
      await loadGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn enemy');
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
      const tx = await contract.spawnEnemy(enemyAddress);
      await tx.wait();
      await loadGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn enemy');
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
      const tx = await contract.killPlayer();
      await tx.wait();
      await loadGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kill player');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Kill enemy (called after 20 shots hit)
  const killEnemy = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.killEnemy();
      await tx.wait();
      await loadGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kill enemy');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGameState]);

  // Reset game
  const resetGame = useCallback(async () => {
    if (!contract) throw new Error('Contract not connected');

    setIsLoading(true);
    setError(null);

    try {
      const tx = await contract.resetGame();
      await tx.wait();
      await loadGameState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset game');
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

  return {
    // State
    gameState,
    isLoading,
    error,
    isConnected: !!contract,

    // Actions
    connect,
    spawnPlayer,
    spawnEnemyRandom,
    spawnEnemy,
    killPlayer,
    killEnemy,
    resetGame,
    isGameOver,
    refreshState: () => loadGameState()
  };
}


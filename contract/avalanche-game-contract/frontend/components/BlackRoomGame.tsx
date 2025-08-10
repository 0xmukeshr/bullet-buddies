import React, { useState, useEffect, useCallback } from 'react';
import { useOneVsOneGame } from '../hooks/useOneVsOneGame';

export function BlackRoomGame() {
  const {
    gameState,
    isLoading,
    error,
    isConnected,
    connect,
    spawnPlayer,
    spawnEnemyRandom,
    killPlayer,
    killEnemy,
    resetGame
  } = useOneVsOneGame();

  const [shotsFired, setShotsFired] = useState(0);
  const [enemyCloseTime, setEnemyCloseTime] = useState(0);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [enemyNearPlayer, setEnemyNearPlayer] = useState(false); // This would come from your game engine

  // Your game logic hooks
  useEffect(() => {
    // When enemy gets close to player, start counting
    if (enemyNearPlayer && gameState.playerAlive && gameState.enemyAlive) {
      const timer = setInterval(() => {
        setEnemyCloseTime(prev => {
          const newTime = prev + 1;
          
          // Kill player if enemy close for 20 seconds
          if (newTime >= 20) {
            killPlayer();
            setEnemyCloseTime(0);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setEnemyCloseTime(0);
    }
  }, [enemyNearPlayer, gameState.playerAlive, gameState.enemyAlive, killPlayer]);

  // Handle shooting
  const handleShoot = useCallback(() => {
    if (gameState.playerAlive && gameState.enemyAlive) {
      setShotsFired(prev => {
        const newShots = prev + 1;
        
        // Kill enemy after 20 shots
        if (newShots >= 20) {
          killEnemy();
          setShotsFired(0);
          return 0;
        }
        
        return newShots;
      });
    }
  }, [gameState.playerAlive, gameState.enemyAlive, killEnemy]);

  // Start new game
  const startNewGame = async () => {
    try {
      await spawnPlayer();
      await spawnEnemyRandom(); // Spawns enemy with random address
      setGameInProgress(true);
      setShotsFired(0);
      setEnemyCloseTime(0);
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  // Handle game over
  useEffect(() => {
    if (!gameState.playerAlive || !gameState.enemyAlive) {
      setGameInProgress(false);
    }
  }, [gameState.playerAlive, gameState.enemyAlive]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-4xl font-bold mb-8">OneVsOne Black Room</h1>
        <button
          onClick={connect}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet & Enter Room'}
        </button>
        {error && (
          <p className="text-red-400 mt-4">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Game Stats */}
      <div className="fixed top-4 left-4 bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Stats</h3>
        <p>Games: {gameState.gamesPlayed}</p>
        <p>Wins: {gameState.playerWins}</p>
        <p>Losses: {gameState.enemyWins}</p>
      </div>

      {/* Game Status */}
      <div className="fixed top-4 right-4 bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Status</h3>
        <p>Player: {gameState.playerAlive ? '🟢 Alive' : '🔴 Dead'}</p>
        <p>Enemy: {gameState.enemyAlive ? '🟢 Alive' : '🔴 Dead'}</p>
        {gameInProgress && (
          <div>
            <p>Shots: {shotsFired}/20</p>
            <p>Enemy Close: {enemyCloseTime}s</p>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col items-center justify-center min-h-screen">
        {!gameInProgress ? (
          <div className="text-center">
            {!gameState.playerAlive && !gameState.enemyAlive ? (
              <div>
                <h2 className="text-3xl font-bold mb-4">Enter the Black Room</h2>
                <button
                  onClick={startNewGame}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-xl"
                >
                  {isLoading ? 'Starting...' : 'Start Game'}
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  {gameState.playerAlive ? 'You Win!' : 'You Lose!'}
                </h2>
                <p className="mb-4">
                  {gameState.playerAlive 
                    ? 'Enemy eliminated! You survived the black room.' 
                    : 'The enemy got too close. You died in the black room.'}
                </p>
                <button
                  onClick={resetGame}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
                >
                  {isLoading ? 'Resetting...' : 'Reset Game'}
                </button>
                <button
                  onClick={startNewGame}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  {isLoading ? 'Starting...' : 'New Game'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Survive the Black Room!</h2>
            <p className="mb-4">Shoot the enemy 20 times before it gets close for 20 seconds</p>
            
            {/* Your actual game component would go here */}
            <div className="bg-gray-900 w-96 h-96 mx-auto mb-4 border-2 border-red-600 flex items-center justify-center">
              <p>Your 3D Game Canvas Here</p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleShoot}
                disabled={!gameState.playerAlive || !gameState.enemyAlive}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
              >
                🔫 Shoot ({shotsFired}/20)
              </button>
              
              <button
                onClick={() => setEnemyNearPlayer(!enemyNearPlayer)}
                disabled={!gameState.playerAlive}
                className={`${enemyNearPlayer ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} text-white font-bold py-2 px-4 rounded`}
              >
                {enemyNearPlayer ? '💀 Enemy Near' : '👾 Simulate Enemy Near'}
              </button>
            </div>
            
            {enemyCloseTime > 0 && (
              <div className="mt-4 p-2 bg-red-900 rounded">
                <p className="text-red-200">⚠️ Enemy is close! {20 - enemyCloseTime}s to escape!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 left-4 bg-red-600 text-white p-4 rounded">
          Error: {error}
        </div>
      )}
    </div>
  );
}


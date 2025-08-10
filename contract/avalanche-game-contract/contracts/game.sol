// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; // Updated to latest stable version

/**
 * @title OneVsOneBlackRoom
 * @dev A simple 1v1 game contract for Avalanche C-Chain
 * @notice This contract manages player/enemy spawning and death mechanics
 */
contract OneVsOneBlackRoom {
    // State variables
    address public player;
    address public enemy;
    bool public playerAlive;
    bool public enemyAlive;
    
    // Game statistics
    uint256 public gamesPlayed;
    uint256 public playerWins;
    uint256 public enemyWins;
    
    // Events
    event PlayerSpawned(address indexed player);
    event EnemySpawned(address indexed enemy);
    event PlayerKilled(address indexed player);
    event EnemyKilled(address indexed enemy);
    event GameReset();
    
    // Modifiers
    modifier onlyValidPlayer() {
        require(player != address(0), "No player set");
        _;
    }
    
    modifier onlyValidEnemy() {
        require(enemy != address(0), "No enemy set");
        _;
    }
    
    /**
     * @dev Spawn player (only once per game, stays same address)
     */
    function spawnPlayer() external {
        require(player == address(0), "Player already set");
        player = msg.sender;
        playerAlive = true;
        emit PlayerSpawned(player);
    }
    
    /**
     * @dev Spawn enemy (frontend decides location & timing)
     * @param _enemy The address representing the enemy
     */
    function spawnEnemy(address _enemy) external {
        require(_enemy != address(0), "Invalid enemy address");
        require(_enemy != player, "Enemy cannot be the same as player");
        enemy = _enemy;
        enemyAlive = true;
        emit EnemySpawned(enemy);
    }
    
    /**
     * @dev Called from frontend when player dies (enemy near for 20s)
     */
    function killPlayer() external onlyValidPlayer {
        require(playerAlive, "Player already dead");
        playerAlive = false;
        enemyWins++;
        gamesPlayed++;
        emit PlayerKilled(player);
    }
    
    /**
     * @dev Called from frontend when enemy dies (20 shots)
     */
    function killEnemy() external onlyValidEnemy {
        require(enemyAlive, "Enemy already dead");
        enemyAlive = false;
        playerWins++;
        gamesPlayed++;
        emit EnemyKilled(enemy);
    }
    
    /**
     * @dev Check status of both player and enemy
     * @return playerStatus Current player alive status
     * @return enemyStatus Current enemy alive status
     */
    function checkStatus() external view returns (bool playerStatus, bool enemyStatus) {
        return (playerAlive, enemyAlive);
    }
    
    /**
     * @dev Get game statistics
     * @return total Total games played
     * @return pWins Player wins
     * @return eWins Enemy wins
     */
    function getGameStats() external view returns (uint256 total, uint256 pWins, uint256 eWins) {
        return (gamesPlayed, playerWins, enemyWins);
    }
    
    /**
     * @dev Reset the game for a new round
     */
    function resetGame() external {
        require((!playerAlive || !enemyAlive), "Game still in progress");
        
        // Reset states
        player = address(0);
        enemy = address(0);
        playerAlive = false;
        enemyAlive = false;
        
        emit GameReset();
    }
    
    /**
     * @dev Check if game is over
     * @return isOver True if either player or enemy is dead
     */
    function isGameOver() external view returns (bool isOver) {
        return (!playerAlive || !enemyAlive);
    }
}
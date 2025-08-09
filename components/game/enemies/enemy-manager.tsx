"use client"

import { useState, useEffect, useRef } from 'react'
import { useGameState as useGameContext } from '@/lib/game-context'
import Enemy from './enemy'
import * as THREE from 'three'

interface EnemyData {
  id: string
  spawnPosition: [number, number, number]
  createdAt: number
}

interface EnemyManagerProps {
  playerPosition: { x: number; y: number; z: number }
  terrainHeightData: number[][]
  terrainParams?: {
    width: number
    depth: number
    scale: number
  }
  gameStatus: string
  maxEnemies?: number
  spawnRadius?: number
  spawnInterval?: number
}

export default function EnemyManager({
  playerPosition,
  terrainHeightData,
  terrainParams,
  gameStatus,
  maxEnemies = 1,
  spawnRadius = 30,
  spawnInterval = 15000 // 15 seconds
}: EnemyManagerProps) {
  const [enemies, setEnemies] = useState<EnemyData[]>([])
  const lastSpawnTime = useRef(0)
  const enemyIdCounter = useRef(0)

  // Get terrain height at a given x, z position
  const getTerrainHeightAt = (x: number, z: number): number => {
    if (!terrainHeightData || terrainHeightData.length === 0 || !terrainParams) {
      return 0
    }

    // Convert world coordinates to terrain grid coordinates
    const terrainX = Math.floor((x + terrainParams.width / 2))
    const terrainZ = Math.floor((z + terrainParams.depth / 2))

    // Clamp to terrain bounds
    const clampedX = Math.max(0, Math.min(terrainHeightData[0].length - 1, terrainX))
    const clampedZ = Math.max(0, Math.min(terrainHeightData.length - 1, terrainZ))

    return terrainHeightData[clampedZ][clampedX]
  }

  // Generate random spawn position around the player
  const generateRandomSpawnPosition = (): [number, number, number] => {
    // Generate completely random angle (0 to 2π)
    const angle = Math.random() * Math.PI * 2
    
    // Generate random distance from 70% to 100% of spawn radius for far spawning
    const minDistance = spawnRadius * 0.7
    const maxDistance = spawnRadius
    const distance = minDistance + Math.random() * (maxDistance - minDistance)
    
    // Calculate position around player using polar coordinates
    const x = playerPosition.x + Math.cos(angle) * distance
    const z = playerPosition.z + Math.sin(angle) * distance
    
    // Get terrain height at spawn position
    const y = getTerrainHeightAt(x, z) + 1.5 // Spawn slightly higher above terrain
    
    console.log(`Generating spawn at angle: ${(angle * 180 / Math.PI).toFixed(1)}°, distance: ${distance.toFixed(1)}, position: [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`)
    
    return [x, y, z]
  }

  // Spawn new enemy
  const spawnEnemy = () => {
    if (enemies.length >= maxEnemies) {
      return // Don't spawn if at max capacity
    }

    const newEnemy: EnemyData = {
      id: `enemy-${enemyIdCounter.current++}`,
      spawnPosition: generateRandomSpawnPosition(),
      createdAt: Date.now()
    }

    setEnemies(prev => [...prev, newEnemy])
    console.log(`Spawned enemy ${newEnemy.id} at position:`, newEnemy.spawnPosition)
  }

  // Handle enemy destruction
  const handleEnemyDestroyed = (enemyId: string) => {
    setEnemies(prev => prev.filter(enemy => enemy.id !== enemyId))
    console.log(`Enemy ${enemyId} destroyed/despawned`)
  }

  // Enemy spawning logic
  useEffect(() => {
    console.log('EnemyManager: Checking spawn conditions...')
    console.log('Game status:', gameStatus)
    console.log('Terrain ready:', terrainHeightData?.length > 0)
    console.log('Current enemy count:', enemies.length)
    console.log('Max enemies:', maxEnemies)
    
    if (gameStatus !== 'playing') {
      console.log('EnemyManager: Not spawning - game not playing')
      return // Don't spawn enemies when not playing
    }

    if (!terrainHeightData || terrainHeightData.length === 0) {
      console.log('EnemyManager: Not spawning - terrain not ready')
      return // Don't spawn enemies if terrain isn't ready
    }

    const currentTime = Date.now()
    
    // Check if it's time to spawn a new enemy
    if (currentTime - lastSpawnTime.current >= spawnInterval) {
      console.log('EnemyManager: Spawning enemy due to timer')
      spawnEnemy()
      lastSpawnTime.current = currentTime
    }
    
    // Spawn an enemy immediately if we have none (for testing)
    if (enemies.length === 0) {
      console.log('EnemyManager: Spawning initial enemy')
      spawnEnemy()
      lastSpawnTime.current = currentTime
    }
    
    // Set up interval for continuous spawning
    const interval = setInterval(() => {
      if (gameStatus === 'playing' && enemies.length < maxEnemies) {
        spawnEnemy()
      }
    }, spawnInterval)

    return () => clearInterval(interval)
  }, [gameStatus, terrainHeightData, enemies.length, spawnInterval, maxEnemies])

  // Clear all enemies when game status changes
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setEnemies([])
    }
  }, [gameStatus])

  return (
    <>
      {enemies.map(enemy => (
        <Enemy
          key={enemy.id}
          id={enemy.id}
          spawnPosition={enemy.spawnPosition}
          playerPosition={playerPosition}
          terrainHeightData={terrainHeightData}
          terrainParams={terrainParams}
          onEnemyDestroyed={handleEnemyDestroyed}
        />
      ))}
    </>
  )
}


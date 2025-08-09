"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type * as THREE from "three"

export interface BulletTrail {
  start: THREE.Vector3
  end: THREE.Vector3
  timestamp: number
  intensity?: number // Added intensity property
}

export interface EnemyHit {
  enemyId: string
  damage: number
  hitPosition: THREE.Vector3
  timestamp: number
}

export interface EnemyInstance {
  id: string
  mesh: THREE.Mesh
  position: THREE.Vector3
  hitRadius: number
}

interface GameState {
  playerPosition: { x: number; y: number; z: number }
  setPlayerPosition: (position: { x: number; y: number; z: number }) => void
  bulletTrails: BulletTrail[]
  addBulletTrail: (trail: BulletTrail) => void
  enemyHits: EnemyHit[]
  addEnemyHit: (hit: EnemyHit) => void
  getEnemyHits: (enemyId: string) => EnemyHit[]
  clearEnemyHits: (enemyId: string) => void
  enemies: Map<string, EnemyInstance>
  registerEnemy: (enemy: EnemyInstance) => void
  unregisterEnemy: (enemyId: string) => void
  updateEnemyPosition: (enemyId: string, position: THREE.Vector3) => void
}

const GameContext = createContext<GameState | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 1.7, z: 0 })
  const [bulletTrails, setBulletTrails] = useState<BulletTrail[]>([])
  const [enemyHits, setEnemyHits] = useState<EnemyHit[]>([])
  const [enemies] = useState<Map<string, EnemyInstance>>(new Map())

  // Use useCallback to prevent unnecessary re-renders
  const addBulletTrail = useCallback((trail: BulletTrail) => {
    setBulletTrails((prev) => {
      // Limit the number of trails to prevent performance issues
      const newTrails = [trail, ...prev]
      if (newTrails.length > 10) {
        return newTrails.slice(0, 10)
      }
      return newTrails
    })
  }, [])

  const addEnemyHit = useCallback((hit: EnemyHit) => {
    setEnemyHits((prev) => {
      const newHits = [hit, ...prev]
      // Keep only recent hits (last 100)
      if (newHits.length > 100) {
        return newHits.slice(0, 100)
      }
      return newHits
    })
  }, [])

  const getEnemyHits = useCallback((enemyId: string): EnemyHit[] => {
    return enemyHits.filter(hit => hit.enemyId === enemyId)
  }, [enemyHits])

  const clearEnemyHits = useCallback((enemyId: string) => {
    setEnemyHits(prev => prev.filter(hit => hit.enemyId !== enemyId))
  }, [])

  const registerEnemy = useCallback((enemy: EnemyInstance) => {
    enemies.set(enemy.id, enemy)
  }, [])

  const unregisterEnemy = useCallback((enemyId: string) => {
    enemies.delete(enemyId)
  }, [])

  const updateEnemyPosition = useCallback((enemyId: string, position: THREE.Vector3) => {
    const enemy = enemies.get(enemyId)
    if (enemy) {
      enemy.position.copy(position)
    }
  }, [])

  return (
    <GameContext.Provider
      value={{
        playerPosition,
        setPlayerPosition,
        bulletTrails,
        addBulletTrail,
        enemyHits,
        addEnemyHit,
        getEnemyHits,
        clearEnemyHits,
        enemies,
        registerEnemy,
        unregisterEnemy,
        updateEnemyPosition,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGameState() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGameState must be used within a GameProvider")
  }
  return context
}

// Remove the additional context and hook that was causing the error

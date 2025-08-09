"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import * as THREE from "three"

interface EnemyHit {
  enemyId: string
  damage: number
  hitPosition: THREE.Vector3
  timestamp: number
}

interface EnemyContextType {
  registerEnemyHit: (hit: EnemyHit) => void
  getEnemyHits: (enemyId: string) => EnemyHit[]
  clearEnemyHits: (enemyId: string) => void
}

const EnemyContext = createContext<EnemyContextType | null>(null)

export function EnemyProvider({ children }: { children: ReactNode }) {
  const [enemyHits, setEnemyHits] = useState<Map<string, EnemyHit[]>>(new Map())

  const registerEnemyHit = useCallback((hit: EnemyHit) => {
    setEnemyHits(prev => {
      const newMap = new Map(prev)
      const existingHits = newMap.get(hit.enemyId) || []
      newMap.set(hit.enemyId, [...existingHits, hit])
      return newMap
    })
  }, [])

  const getEnemyHits = useCallback((enemyId: string): EnemyHit[] => {
    return enemyHits.get(enemyId) || []
  }, [enemyHits])

  const clearEnemyHits = useCallback((enemyId: string) => {
    setEnemyHits(prev => {
      const newMap = new Map(prev)
      newMap.delete(enemyId)
      return newMap
    })
  }, [])

  return (
    <EnemyContext.Provider value={{
      registerEnemyHit,
      getEnemyHits,
      clearEnemyHits
    }}>
      {children}
    </EnemyContext.Provider>
  )
}

export function useEnemyHits() {
  const context = useContext(EnemyContext)
  if (!context) {
    throw new Error("useEnemyHits must be used within an EnemyProvider")
  }
  return context
}


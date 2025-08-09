"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Update the GameStatus type to include "sleeping" and "game-over"
type GameStatus = "title" | "playing" | "settings" | "howToPlay" | "sleeping" | "game-over"

interface GameStateContextType {
  gameStatus: GameStatus
  hasStarted: boolean
  setGameStatus: (status: GameStatus) => void
  setHasStarted: (started: boolean) => void
}

const GameStateContext = createContext<GameStateContextType | null>(null)

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [gameStatus, setGameStatus] = useState<GameStatus>("title")
  const [hasStarted, setHasStarted] = useState(false)

  return (
    <GameStateContext.Provider
      value={{
        gameStatus,
        hasStarted,
        setGameStatus,
        setHasStarted,
      }}
    >
      {children}
    </GameStateContext.Provider>
  )
}

export function useGameState() {
  const context = useContext(GameStateContext)
  if (!context) {
    throw new Error("useGameState must be used within a GameStateProvider")
  }
  return context
}

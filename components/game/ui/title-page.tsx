"use client"

import { useEffect } from "react"
import { useGameState } from "@/lib/game-state-context"

export default function TitlePage() {
  const { hasStarted, setGameStatus } = useGameState()

  // Update the handlePlayButtonClick function to go directly to playing state if already started
  const handlePlayButtonClick = () => {
    if (hasStarted) {
      console.log("Resume button clicked, setting game status directly to playing")
      setGameStatus("playing")
    } else {
      console.log("Play button clicked, setting game status to sleeping")
      setGameStatus("sleeping")
    }
  }

  // Handle ESC key to resume game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && hasStarted) {
        console.log("ESC pressed on title screen, going to paused state")
        setGameStatus("sleeping")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasStarted, setGameStatus])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
      <div className="max-w-2xl w-full px-4">
        <h1 className="text-6xl font-bold text-center text-white mb-8">
          <span className="text-game-primary"> bULLET</span>
          <span className="text-game-accent">    bUDDIES</span>
        </h1>

        <div className="space-y-4 max-w-md mx-auto">
          <button
            onClick={handlePlayButtonClick}
            className="w-full py-3 px-4 bg-game-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
          >
            {hasStarted ? "Resume Game" : "Start Game"}
          </button>

          <button
            onClick={() => setGameStatus("settings")}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Settings
          </button>

          <button
            onClick={() => setGameStatus("howToPlay")}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            How to Play
          </button>
        </div>

        {hasStarted && (
          <div className="mt-6 text-center text-gray-400">
            <p>Press ESC to resume game</p>
          </div>
        )}

        <div className="mt-12 text-gray-400 text-center text-sm">
          <p>
            Made with ❤️ by {"Dematter"}
            </  p>
        </div>
      </div>
    </div>
  )
}

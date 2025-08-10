"use client"

import GameContainer from "@/components/game/game-container"
import { Providers } from "./providers"

export default function Home() {
  return (
    <Providers>
      <main className="w-full h-screen overflow-hidden bg-black">
        <GameContainer />
      </main>
    </Providers>
  )
}

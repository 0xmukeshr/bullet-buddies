"use client"
import { useEffect } from "react"
import Crosshair from "./crosshair"
import AmmoCounter from "./ammo-counter"
import Toolbar from "./toolbar"
import InventoryGrid from "./inventory-grid"
import CraftingGrid from "./crafting-grid"
import StatusBars from "./status-bars"
import CampfireInventory from "../ui/campfire-inventory"
import InteractionPrompt from "./interaction-prompt"
import { useInventory } from "@/lib/inventory-context"
import { useCrafting } from "@/lib/crafting-context"
import { useInteraction } from "@/lib/interaction-context"
import { useBlockchainGame } from "@/lib/blockchain-game-context"

interface HUDProps {
  isLocked: boolean
  terrainReady: boolean
  showCrosshair?: boolean
  ammo?: { current: number; reserve: number }
  pointerLockSupported?: boolean
  pointerLockError?: any
  returningFromTitle?: boolean
  gameStatus?: string
}

export default function HUD({
  isLocked,
  terrainReady,
  showCrosshair = true,
  ammo = { current: 30, reserve: 90 },
  pointerLockSupported = true,
  pointerLockError = null,
  returningFromTitle = false,
  gameStatus = "playing",
}: HUDProps) {
  const { isOpen: isInventoryOpen, activeCampfire, inventoryOpenedBy } = useInventory()
  const { setIsOpen: setCraftingOpen } = useCrafting()
  const { showPrompt, promptMessage } = useInteraction()
  const { blockchainEnabled, isConnected, walletAddress, contractState } = useBlockchainGame()

  // When inventory is opened or closed, also open or close crafting, but only if opened via Tab
  useEffect(() => {
    setCraftingOpen(isInventoryOpen && inventoryOpenedBy === "tab")
  }, [isInventoryOpen, inventoryOpenedBy, setCraftingOpen])

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair - only show when locked and not in inventory */}
      {isLocked && showCrosshair && !isInventoryOpen && <Crosshair />}

      {/* Ammo counter - only show when locked and not in inventory */}
      {isLocked && !isInventoryOpen && <AmmoCounter current={ammo.current} reserve={ammo.reserve} />}

      {/* Status bars - always show when playing */}
      {isLocked && !isInventoryOpen && <StatusBars />}

      {/* Interaction prompt - show when near interactable items */}
      {isLocked && !isInventoryOpen && showPrompt && <InteractionPrompt show={showPrompt} message={promptMessage} />}

      {/* Toolbar - always show, regardless of inventory state */}
      <Toolbar />

      {/* Inventory - always render but control visibility inside component */}
      <InventoryGrid visible={isInventoryOpen} />

      {/* Crafting - only show when inventory opened via Tab */}
      <CraftingGrid visible={isInventoryOpen && inventoryOpenedBy === "tab"} />

      {/* Campfire inventory - show when active campfire is set */}
      {activeCampfire && <CampfireInventory campfireId={activeCampfire} onClose={() => {}} />}
      
      {/* Blockchain Debug Info - Show in corner */}
      {isLocked && !isInventoryOpen && (
        <div className="absolute top-20 left-4 pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white p-2 rounded text-xs font-mono">
            <div className="text-yellow-400 mb-1">🔗 BLOCKCHAIN DEBUG</div>
            <div>Enabled: {blockchainEnabled ? '✅' : '❌'}</div>
            <div>Connected: {isConnected ? '✅' : '❌'}</div>
            {walletAddress && (
              <div>Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
            )}
            <div>Player Alive: {contractState.playerAlive ? '✅' : '❌'}</div>
            <div>Enemy Alive: {contractState.enemyAlive ? '✅' : '❌'}</div>
            <div>Games: {contractState.gamesPlayed}</div>
            <div>Wins: {contractState.playerWins}</div>
            <div>Losses: {contractState.enemyWins}</div>
          </div>
        </div>
      )}
    </div>
  )
}

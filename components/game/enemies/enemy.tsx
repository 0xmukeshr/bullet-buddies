"use client"

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { useGameState } from '@/lib/game-context'
import { usePlayerStatus } from '@/lib/player-status-context'
import { useBlockchainGame } from '@/lib/blockchain-game-context'

interface EnemyProps {
  id: string
  spawnPosition: [number, number, number]
  playerPosition: { x: number; y: number; z: number }
  terrainHeightData: number[][]
  terrainParams?: {
    width: number
    depth: number
    scale: number
  }
  onEnemyDestroyed?: (id: string) => void
}

export default function Enemy({
  id,
  spawnPosition,
  playerPosition,
  terrainHeightData,
  terrainParams,
  onEnemyDestroyed
}: EnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(...spawnPosition))
  const [health, setHealth] = useState(20) // Enemy health (20 hits to kill)
  const [isDestroyed, setIsDestroyed] = useState(false)
  const [isDying, setIsDying] = useState(false) // Death animation state
  const [deathParticles, setDeathParticles] = useState<THREE.Vector3[]>([])
  const [particleVelocities, setParticleVelocities] = useState<THREE.Vector3[]>([])
  const [isHit, setIsHit] = useState(false) // Hit flash effect
  const [lastDamageTime, setLastDamageTime] = useState(0) // Track when we last damaged the player
  const speed = 0.04 // Enemy movement speed (increased for more aggressive behavior)
  const followDistance = 1.4 // Minimum distance to maintain from player (reduced to get closer)
  const maxDistance = 80 // Maximum distance before enemy despawns
  const hitRadius = 1.0 // Radius for hit detection
  const damageRadius = 1.5 // Distance at which enemy damages player
  const damageAmount = 2 // Damage per attack
  const damageInterval = 1000 // Damage every 1000ms (1 second)
  
  const { getEnemyHits, clearEnemyHits, registerEnemy, unregisterEnemy, updateEnemyPosition } = useGameState()
  const { damage } = usePlayerStatus()
  const { endBlockchainGame, blockchainEnabled } = useBlockchainGame()
  
  // Load enemy texture
  const enemyTexture = useLoader(TextureLoader, '/enemyhakla.png')
  
  // Create death burst when enemy dies
  const createDeathBurst = () => {
    const particles: THREE.Vector3[] = []
    const velocities: THREE.Vector3[] = []
    
    for (let i = 0; i < 20; i++) {
      // Random direction
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      const particle = new THREE.Vector3(
        position.x,
        position.y + 0.5,
        position.z
      )
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * (2 + Math.random() * 3),
        Math.cos(phi) * (1 + Math.random() * 2),
        Math.sin(phi) * Math.sin(theta) * (2 + Math.random() * 3)
      )
      
      particles.push(particle)
      velocities.push(velocity)
    }
    
    setDeathParticles(particles)
    setParticleVelocities(velocities)
  }
  
  // Add userData to mesh for hit detection
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.isEnemy = true
      meshRef.current.userData.enemyId = id
      meshRef.current.userData.takeDamage = (damage: number) => {
        console.log(`Enemy ${id} taking damage: ${damage}`)
        
        // Trigger hit flash effect
        setIsHit(true)
        setTimeout(() => setIsHit(false), 100) // Flash for 100ms
        
        setHealth(prevHealth => {
          const newHealth = Math.max(0, prevHealth - damage)
          
          console.log(`Enemy ${id} hit! Health: ${newHealth}/20`)
          
          // If health reaches 0, start death sequence
          if (newHealth <= 0) {
            console.log(`Enemy ${id} is dying!`)
            setIsDying(true)
            createDeathBurst()
            
            // Enemy killed - no blockchain interaction needed
            console.log('🎯 Enemy killed! (No blockchain recording for enemy kills)')
            
            // Remove enemy after death animation
            setTimeout(() => {
              console.log(`Enemy ${id} being destroyed`)
              onEnemyDestroyed?.(id)
            }, 1000)
          }
          
          return newHealth
        })
      }
    }
  }, [id, onEnemyDestroyed, position])
  
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

  // Register enemy with game context
  useEffect(() => {
    if (meshRef.current) {
      const enemyInstance = {
        id,
        mesh: meshRef.current,
        position: position,
        hitRadius,
        health,
        maxHealth: 20,
        isDead: isDying
      }
      console.log(`🎯 Registering enemy ${id} with game context`)
      console.log('Enemy mesh:', meshRef.current)
      console.log('Enemy userData:', meshRef.current.userData)
      registerEnemy(enemyInstance)
      
      return () => {
        console.log(`🚫 Unregistering enemy ${id}`)
        unregisterEnemy(id)
      }
    }
  }, [id, registerEnemy, unregisterEnemy])


  // Create enemy material with enhanced 3D appearance and hit flash
  const enemyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: enemyTexture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x111111),
      emissiveIntensity: 0.1
    })
  }, [enemyTexture])
  
  // Update material properties based on hit state
  useEffect(() => {
    if (enemyMaterial) {
      enemyMaterial.emissive.setHex(isHit ? 0xff0000 : 0x111111)
      enemyMaterial.emissiveIntensity = isHit ? 0.5 : 0.1
      enemyMaterial.needsUpdate = true
    }
  }, [isHit, enemyMaterial])

  // Main animation loop
  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Handle death particle animation
    if (isDying && deathParticles.length > 0) {
      const updatedParticles = deathParticles.map((particle, index) => {
        const velocity = particleVelocities[index]
        if (velocity) {
          // Apply gravity
          velocity.y -= 9.8 * delta
          
          // Update particle position
          return particle.clone().add(velocity.clone().multiplyScalar(delta))
        }
        return particle
      })
      
      setDeathParticles(updatedParticles)
      return // Don't do movement logic if dying
    }

    if (isDying) return // Skip movement if dying

    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z)
    const enemyPos = position.clone()
    
    // Calculate distance to player
    const distanceToPlayer = enemyPos.distanceTo(playerPos)
    
    // If too far from player, despawn this enemy
    if (distanceToPlayer > maxDistance) {
      onEnemyDestroyed?.(id)
      return
    }
    
    // Check if enemy is close enough to damage player
    const currentTime = Date.now()
    if (distanceToPlayer <= damageRadius && currentTime - lastDamageTime >= damageInterval) {
      damage(damageAmount)
      setLastDamageTime(currentTime)
      console.log(`Enemy ${id} damaged player for ${damageAmount} HP!`)
    }
    
    // If close enough to player, don't move closer
    if (distanceToPlayer <= followDistance) {
      return
    }
    
    // Calculate direction to player
    const direction = playerPos.clone().sub(enemyPos).normalize()
    
    // Move towards player
    const newX = enemyPos.x + direction.x * speed
    const newZ = enemyPos.z + direction.z * speed
    
    // Get terrain height at new position
    const terrainHeight = getTerrainHeightAt(newX, newZ)
    const newY = terrainHeight + 1 // Keep enemy slightly above terrain
    
    // Update position
    const newPosition = new THREE.Vector3(newX, newY, newZ)
    setPosition(newPosition)
    
    // Update mesh position
    meshRef.current.position.copy(newPosition)
    
    // Update position in game context
    updateEnemyPosition(id, newPosition)
    
    // Make enemy face the player
    meshRef.current.lookAt(playerPos.x, newY, playerPos.z)
  })

  return (
    <>
      {/* Main enemy sprite - hide during death */}
      {!isDying && (
        <>
          <mesh ref={meshRef} position={spawnPosition} material={enemyMaterial}>
            {/* Create a plane geometry to display the enemy image */}
            <planeGeometry args={[2, 2]} />
          </mesh>
          
          {/* Shadow plane for better 3D effect */}
          <mesh 
            position={[
              position.x, 
              getTerrainHeightAt(position.x, position.z) + 0.01, 
              position.z
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial 
              color={0x000000} 
              transparent={true} 
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
      
      {/* Death burst particles */}
      {isDying && deathParticles.map((particle, index) => (
        <mesh 
          key={index}
          position={[particle.x, particle.y, particle.z]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial 
            color={0xff4444} 
            transparent={true} 
            opacity={0.8}
          />
        </mesh>
      ))}
      
      {/* Health bar above enemy */}
      {!isDying && health < 20 && (
        <>
          {/* Health bar background */}
          <mesh 
            position={[position.x, position.y + 1.5, position.z]}
            scale={[1, 0.1, 0.01]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={0x333333} />
          </mesh>
          
          {/* Health bar fill */}
          <mesh 
            position={[
              position.x - 0.5 + (health / 20) * 0.5, 
              position.y + 1.5, 
              position.z
            ]}
            scale={[health / 20, 0.1, 0.01]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={health > 10 ? 0x00ff00 : health > 5 ? 0xffff00 : 0xff0000} />
          </mesh>
        </>
      )}
    </>
  )
}


"use client"

import { useEffect, useState } from 'react'
import { Canvas, extend } from '@react-three/fiber'
import * as THREE from 'three'

interface CanvasWrapperProps {
  children: React.ReactNode
  [key: string]: any
}

export default function CanvasWrapper({ children, ...props }: CanvasWrapperProps) {
  const [isClient, setIsClient] = useState(false)
  const [isThreeReady, setIsThreeReady] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Extend THREE namespace on client side only
    if (typeof window !== 'undefined') {
      try {
        // Ensure THREE is available before extending
        if (THREE && typeof THREE === 'object') {
          extend(THREE)
          console.log('THREE.js namespace extended successfully')
          setIsThreeReady(true)
        } else {
          console.error('THREE.js not properly loaded')
          setIsThreeReady(true) // Allow to proceed anyway
        }
      } catch (error) {
        console.warn('Failed to extend THREE namespace:', error)
        setIsThreeReady(true) // Allow to proceed anyway
      }
    }
  }, [])

  // Only render Canvas on client side after THREE is ready
  if (!isClient || !isThreeReady) {
    return <div className="w-full h-full bg-black" />
  }

  return (
    <Canvas {...props}>
      {children}
    </Canvas>
  )
}


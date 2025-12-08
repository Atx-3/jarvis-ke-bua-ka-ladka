import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import * as THREE from 'three'
import type { HandControls, HandTrackerProps } from '../types'

type TrackerState = 'idle' | 'initializing' | 'ready' | 'error'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

function distance3d(a: NormalizedLandmark, b: NormalizedLandmark) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = (a.z || 0) - (b.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function computeTension(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[0]
  const fingerTips = [4, 8, 12, 16, 20].map((i) => landmarks[i])
  const bases = [5, 9, 13, 17].map((i) => landmarks[i])

  const avgTip = fingerTips.reduce((acc, tip) => acc + distance3d(tip, wrist), 0) / fingerTips.length
  const palmSize = bases.reduce((acc, base) => acc + distance3d(base, wrist), 0) / bases.length

  const openRatio = avgTip / (palmSize * 1.6)
  const tension = 1 - Math.min(Math.max(openRatio, 0), 1)
  return Math.min(Math.max(tension, 0), 1)
}

export default function HandTracker({ onControls, onError }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const handLandmarker = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const [state, setState] = useState<TrackerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const lastVideoTime = useRef<number>(-1)
  const lastPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastZoom = useRef<number>(1)
  const baseWristPos = useRef<{ x: number; y: number } | null>(null)
  const controlsRef = useRef<HandControls>({
    zoom: 1,
    panX: 0,
    panY: 0,
    hasBothHands: false,
  })

  useEffect(() => {
    start()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      handLandmarker.current?.close()
      const stream = videoRef.current?.srcObject as MediaStream | null
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async () => {
    try {
      setState('initializing')
      setError(null)
      onError?.(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })

      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/wasm',
      )

      handLandmarker.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minTrackingConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
      })

      setState('ready')
      processFrame()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to access camera'
      setState('error')
      setError(message)
      onError?.(message)
    }
  }

  const processFrame = () => {
    if (!handLandmarker.current || !videoRef.current) return

    const video = videoRef.current
    const now = performance.now()
    if (lastVideoTime.current === video.currentTime) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    lastVideoTime.current = video.currentTime

    const result = handLandmarker.current.detectForVideo(video, now)
    const hands = result.landmarks ?? []

    if (hands.length >= 1) {
      const hand = hands[0]
      const wrist = hand[0]
      const tension = computeTension(hand)
      const isFistClosed = tension > 0.7 // Consider fist closed when tension > 0.7

      // Initialize base position on first detection
      if (baseWristPos.current === null) {
        baseWristPos.current = { x: wrist.x, y: wrist.y }
      }

      // Zoom from hand openness (closed fist = zoom in, open hand = zoom out)
      // Inverted: closed (high tension) = zoom in (high zoom value)
      const targetZoom = 0.5 + tension * 2.0 // tension 0..1 => zoom 0.5..2.5
      lastZoom.current = lastZoom.current * 0.7 + targetZoom * 0.3 // Faster response

      let panX = 0
      let panY = 0

      // Only pan when fist is closed
      if (isFistClosed) {
        // Calculate relative movement from base position
        // Invert Y because camera Y is inverted (up in hand = down in camera)
        const dx = (wrist.x - baseWristPos.current.x) * 6.0 // Increased sensitivity
        const dy = -(wrist.y - baseWristPos.current.y) * 6.0 // Inverted and increased sensitivity
        
        // Update pan with less smoothing for faster response
        lastPan.current = {
          x: lastPan.current.x * 0.6 + dx * 0.4,
          y: lastPan.current.y * 0.6 + dy * 0.4,
        }
        
        panX = THREE.MathUtils.clamp(lastPan.current.x, -1, 1)
        panY = THREE.MathUtils.clamp(lastPan.current.y, -1, 1)
      } else {
        // When hand opens, update base position but don't reset pan immediately
        // This allows smooth transition
        baseWristPos.current = { x: wrist.x, y: wrist.y }
        // Smoothly return pan to center when hand opens
        lastPan.current = {
          x: lastPan.current.x * 0.85,
          y: lastPan.current.y * 0.85,
        }
        panX = lastPan.current.x
        panY = lastPan.current.y
      }

      controlsRef.current = {
        zoom: Math.min(Math.max(lastZoom.current, 0.5), 2.5),
        panX,
        panY,
        hasBothHands: false,
      }
      onControls(controlsRef.current)
    } else {
      // No hand detected - reset base position and smoothly return to center
      baseWristPos.current = null
      lastPan.current = {
        x: lastPan.current.x * 0.9,
        y: lastPan.current.y * 0.9,
      }
      controlsRef.current = {
        ...controlsRef.current,
        panX: lastPan.current.x,
        panY: lastPan.current.y,
        hasBothHands: false,
      }
      onControls(controlsRef.current)
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }

  return (
    <div className="hand-preview">
      <video ref={videoRef} playsInline muted />
      {state === 'error' && (
        <div className="hand-error glass">
          <p>Camera unavailable</p>
          <button type="button" onClick={start}>
            Retry
          </button>
        </div>
      )}
      {state === 'initializing' && <div className="hand-status glass">Calibrating…</div>}
      {state === 'ready' && <div className="hand-status glass">Tracking</div>}
      {error && <span className="hand-note">{error}</span>}
    </div>
  )
}


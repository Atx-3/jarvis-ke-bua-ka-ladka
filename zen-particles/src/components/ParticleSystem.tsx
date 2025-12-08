import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { SceneMode, SceneProps } from '../types'

type PlanetDef = {
  name: string
  radius: number
  distance: number
  speed: number
  color: string
  tilt?: number
}

const PLANETS: PlanetDef[] = [
  { name: 'Mercury', radius: 0.18, distance: 1.2, speed: 1.3, color: '#c0b7a8' },
  { name: 'Venus', radius: 0.24, distance: 1.9, speed: 1.0, color: '#d9b26b' },
  { name: 'Earth', radius: 0.26, distance: 2.6, speed: 0.8, color: '#6bb6ff', tilt: 0.41 },
  { name: 'Mars', radius: 0.22, distance: 3.2, speed: 0.65, color: '#ff7043' },
  { name: 'Jupiter', radius: 0.6, distance: 4.4, speed: 0.35, color: '#d0a06b' },
  { name: 'Saturn', radius: 0.5, distance: 5.6, speed: 0.3, color: '#d9c38f' },
  { name: 'Uranus', radius: 0.38, distance: 6.6, speed: 0.22, color: '#9bd6ff' },
  { name: 'Neptune', radius: 0.36, distance: 7.3, speed: 0.18, color: '#6f8bff' },
]

function createDotCloud(count = 2000) {
  const geometry = new THREE.BufferGeometry()
  // Initial positions: tight concentrated sphere (contracted state)
  const initialPositions = new Float32Array(count * 3)
  // Target positions: scattered fragments (expanded state)
  const targetPositions = new Float32Array(count * 3)
  const radius = 0.6 // Smaller, tighter sphere radius
  
  for (let i = 0; i < count; i++) {
    // Initial: tight uniform sphere surface (more concentrated)
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    // Use uniform distribution on sphere surface for tighter ball
    const r = radius * (0.8 + Math.random() * 0.2) // Slight variation but mostly on surface
    
    initialPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    initialPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    initialPositions[i * 3 + 2] = r * Math.cos(phi)
    
    // Target: scattered fragments (expanded)
    const spread = 8
    const rTarget = spread * Math.cbrt(Math.random())
    const thetaTarget = Math.random() * Math.PI * 2
    const phiTarget = Math.acos(Math.random() * 2 - 1)
    
    targetPositions[i * 3] = rTarget * Math.sin(phiTarget) * Math.cos(thetaTarget)
    targetPositions[i * 3 + 1] = rTarget * Math.sin(phiTarget) * Math.sin(thetaTarget)
    targetPositions[i * 3 + 2] = rTarget * Math.cos(phiTarget)
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3))
  geometry.setAttribute('targetPos', new THREE.BufferAttribute(targetPositions, 3))
  
  const material = new THREE.PointsMaterial({
    color: 0x8fd6ff,
    size: 0.08, // Slightly larger dots for better visibility
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const points = new THREE.Points(geometry, material)
  points.userData = { initialPositions, targetPositions }
  return points
}

export default function SceneRenderer({ controls, mode, modelUrl }: SceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const systemGroupRef = useRef<THREE.Group | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const dotRef = useRef<THREE.Points | null>(null)
  const frameRef = useRef<number | null>(null)
  const resizeObserver = useRef<ResizeObserver | null>(null)
  const controlsRef = useRef(controls)
  const modeRef = useRef<SceneMode>(mode)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050608, 0.04)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100)
    // Default zoomed out position for solar system
    camera.position.set(0, 4.5, 15)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.8)
    scene.add(ambient)
    const sunLight = new THREE.PointLight(0xffe7b0, 3.4, 120)
    scene.add(sunLight)

    // Sun
    const sunGeo = new THREE.SphereGeometry(1, 48, 48)
    const sunMat = new THREE.MeshStandardMaterial({
      emissive: new THREE.Color('#ffb347'),
      emissiveIntensity: 1.8,
      color: '#ffcc80',
      roughness: 0.4,
      metalness: 0.1,
    })
    const sunMesh = new THREE.Mesh(sunGeo, sunMat)
    sunMesh.name = 'sun'
    scene.add(sunMesh)

    // Planet system group
    const systemGroup = new THREE.Group()
    systemGroupRef.current = systemGroup
    scene.add(systemGroup)

    // Planets + rings (for Saturn)
    PLANETS.forEach((p) => {
      const geo = new THREE.SphereGeometry(p.radius, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        roughness: 0.6,
        metalness: 0.1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.x = p.distance
      mesh.userData = { speed: p.speed, distance: p.distance, angle: Math.random() * Math.PI * 2 }
      if (p.tilt) mesh.rotation.z = p.tilt
      systemGroup.add(mesh)

      if (p.name === 'Saturn') {
        const ringGeo = new THREE.RingGeometry(p.radius * 1.1, p.radius * 1.8, 64, 1)
        const ringMat = new THREE.MeshBasicMaterial({
          color: '#d3c0a8',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = Math.PI / 2.2
        ring.position.x = p.distance
        systemGroup.add(ring)
      }
    })

    // Stars background
    const stars = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.7 }),
    )
    const starCount = 1500
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 30 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)
    }
    stars.geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    stars.name = 'stars'
    scene.add(stars)

    // Dot cloud (hidden unless mode === 'dots')
    const dots = createDotCloud()
    dots.visible = mode === 'dots'
    dotRef.current = dots
    scene.add(dots)

    const handleResize = () => {
      const { clientWidth, clientHeight } = container
      renderer.setSize(clientWidth, clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }

    resizeObserver.current = new ResizeObserver(handleResize)
    resizeObserver.current.observe(container)

    const clock = new THREE.Clock()
    const animate = () => {
      const t = clock.getElapsedTime()

      // Orbit planets if solar mode
      const systemGroup = systemGroupRef.current

      if (modeRef.current === 'solar' && systemGroup) {
        systemGroup.children.forEach((obj) => {
          const data = obj.userData
          if (data && typeof data.speed === 'number' && typeof data.distance === 'number') {
            data.angle += data.speed * 0.005
            obj.position.x = Math.cos(data.angle) * data.distance
            obj.position.z = Math.sin(data.angle) * data.distance
          }
        })
        // Auto-rotate solar system slowly
        systemGroup.rotation.y = t * 0.05
      }

      // Apply hand controls
      const zoom = controlsRef.current.zoom ?? 1
      const panX = controlsRef.current.panX ?? 0
      const panY = controlsRef.current.panY ?? 0
      
      // Zoom: lower zoom = farther out (default zoomed out), higher zoom = closer
      const baseDist = modeRef.current === 'solar' ? 15 : 10
      const dist = THREE.MathUtils.clamp(baseDist / zoom, 4, 25)
      
      // Pan: left/right and up/down camera movement
      const panRange = 6 // How far camera can pan
      const baseY = modeRef.current === 'solar' ? 4.5 : 4
      const targetX = panX * panRange
      const targetY = baseY + panY * panRange
      const targetZ = dist
      
      camera.position.set(targetX, targetY, targetZ)
      camera.lookAt(targetX, baseY, 0) // Look at center but offset by panX

      const sun = scene.getObjectByName('sun')
      if (sun) sun.rotation.y = t * 0.1

      // Animate dots: contract to sphere (low zoom) or expand to fragments (high zoom)
      if (dotRef.current && modeRef.current === 'dots') {
        const dotGeo = dotRef.current.geometry
        const posAttr = dotGeo.getAttribute('position') as THREE.BufferAttribute
        const targetAttr = dotGeo.getAttribute('targetPos') as THREE.BufferAttribute
        if (posAttr && targetAttr && dotRef.current.userData.initialPositions) {
          // zoom 0.5-2.5 maps to expansion 0-1 (closed hand = zoom in = expand fragments)
          const expansion = THREE.MathUtils.clamp((zoom - 0.5) / 2.0, 0, 1)
          const initial = dotRef.current.userData.initialPositions as Float32Array
          const target = dotRef.current.userData.targetPositions as Float32Array
          for (let i = 0; i < posAttr.count; i++) {
            const ix = i * 3
            posAttr.array[ix] = THREE.MathUtils.lerp(initial[ix], target[ix], expansion)
            posAttr.array[ix + 1] = THREE.MathUtils.lerp(initial[ix + 1], target[ix + 1], expansion)
            posAttr.array[ix + 2] = THREE.MathUtils.lerp(initial[ix + 2], target[ix + 2], expansion)
          }
          posAttr.needsUpdate = true
        }
        // Rotate dots slowly for visual effect
        dotRef.current.rotation.y = t * 0.1
        dotRef.current.rotation.x = t * 0.05
      }
      
      // Rotate model slowly
      if (modelRef.current && modeRef.current === 'model') {
        modelRef.current.rotation.y = t * 0.1
        modelRef.current.rotation.x = t * 0.05
      }

      renderer.render(scene, camera)
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      resizeObserver.current?.disconnect()
      resizeObserver.current = null
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      stars.geometry.dispose()
      ;(stars.material as THREE.Material).dispose()
      sunGeo.dispose()
      sunMat.dispose()
      systemGroup.children.forEach((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material && 'dispose' in mesh.material) (mesh.material as THREE.Material).dispose()
      })
      if (dotRef.current) {
        dotRef.current.geometry.dispose()
        ;(dotRef.current.material as THREE.Material).dispose()
      }
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          const c = child as THREE.Mesh
          if (c.isMesh) {
            c.geometry?.dispose()
            if (Array.isArray(c.material)) {
              c.material.forEach((m) => m.dispose && m.dispose())
            } else if (c.material && 'dispose' in c.material) {
              c.material.dispose()
            }
          }
        })
      }
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // Toggle visibility based on mode
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const sun = scene.getObjectByName('sun')
    const stars = scene.getObjectByName('stars')
    if (sun) sun.visible = mode === 'solar'
    if (stars) stars.visible = true
    if (systemGroupRef.current) systemGroupRef.current.visible = mode === 'solar'
    if (dotRef.current) dotRef.current.visible = mode === 'dots'
    if (modelRef.current) modelRef.current.visible = mode === 'model'
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    controlsRef.current = controls
  }, [controls])

  // Load model or image when URL changes
  useEffect(() => {
    if (!sceneRef.current) return
    if (!modelUrl) {
      if (modelRef.current) {
        sceneRef.current.remove(modelRef.current)
        modelRef.current = null
      }
      return
    }

    // Extract URL and file type info
    const [url, fileType] = modelUrl.split('|')
    const urlLower = (fileType || url).toLowerCase()
    const isImage =
      urlLower.includes('image') ||
      urlLower.endsWith('.jpg') ||
      urlLower.endsWith('.jpeg') ||
      urlLower.endsWith('.png') ||
      urlLower.endsWith('.webp') ||
      urlLower.startsWith('image/')

    if (isImage) {
      // Load image as texture on a sphere
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        url,
        (texture) => {
          if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current)
          }
          texture.flipY = false // Fix image orientation
          const geometry = new THREE.SphereGeometry(3, 64, 64)
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            emissive: new THREE.Color(0x222222),
            emissiveIntensity: 0.2,
          })
          const sphere = new THREE.Mesh(geometry, material)
          sphere.name = 'imageSphere'
          modelRef.current = sphere
          sceneRef.current?.add(sphere)
        },
        undefined,
        (error) => {
          console.error('Error loading image:', error)
        },
      )
    } else {
      // Load 3D model (GLTF/GLB/OBJ)
      const loader = new GLTFLoader()
      loader.load(
        url,
        (gltf: GLTF) => {
          if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current)
          }
          modelRef.current = gltf.scene
          modelRef.current.position.set(0, 0, 0)
          modelRef.current.scale.setScalar(2)
          sceneRef.current?.add(modelRef.current)
        },
        undefined,
        (error) => {
          console.error('Error loading 3D model:', error)
        },
      )
    }
  }, [modelUrl])

  return <div ref={containerRef} className="canvas-wrap" />
}


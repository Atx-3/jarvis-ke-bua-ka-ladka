import type { ShapeType } from '../types'

const rand = (min: number, max: number) => Math.random() * (max - min) + min

const randomOnSphere = (radius = 1) => {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const x = radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.sin(phi) * Math.sin(theta)
  const z = radius * Math.cos(phi)
  return [x, y, z]
}

const randomInSphere = (radius = 1) => {
  const u = Math.random()
  const v = Math.random()
  const w = Math.random()
  const r = radius * Math.cbrt(u)
  const theta = 2 * Math.PI * v
  const phi = Math.acos(2 * w - 1)
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.sin(phi) * Math.sin(theta)
  const z = r * Math.cos(phi)
  return [x, y, z]
}

const heartPoint = () => {
  // 3D heart by revolving the classic 2D formula with depth noise
  const t = rand(0, Math.PI)
  const r = rand(0.72, 1)
  const x2d = 16 * Math.pow(Math.sin(t), 3)
  const y2d =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)

  const scale = 0.025 * r
  const depth = rand(-0.35, 0.35)
  const angle = rand(0, Math.PI * 2)
  const x = x2d * scale * Math.cos(angle) - depth * Math.sin(angle)
  const z = x2d * scale * Math.sin(angle) + depth * Math.cos(angle)
  const y = y2d * scale
  return [x, y, z]
}

const phyllotaxisPoint = (i: number, total: number) => {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const radius = Math.sqrt(i / total) * 1.25
  const theta = i * golden
  const x = radius * Math.cos(theta)
  const z = radius * Math.sin(theta)
  const y = Math.sin(radius * 1.3) * 0.35
  return [x, y, z]
}

const saturnPoint = (i: number, total: number) => {
  const ringRatio = 0.45
  const useRing = i / total > 0.4
  if (useRing) {
    const radius = rand(1.4, 2.1)
    const angle = rand(0, Math.PI * 2)
    const thickness = rand(-0.12, 0.12)
    const x = radius * Math.cos(angle)
    const z = radius * Math.sin(angle)
    return [x, thickness, z]
  }
  return randomOnSphere(1 - ringRatio)
}

const buddhaPoint = () => {
  const region = Math.random()
  if (region < 0.35) {
    // head
    const [x, y, z] = randomOnSphere(0.55)
    return [x, y + 1.1, z]
  }
  if (region < 0.75) {
    // body ellipsoid
    const [x, y, z] = randomInSphere(1)
    return [x * 0.8, y * 0.9, z * 0.6]
  }
  // base torus-like
  const angle = rand(0, Math.PI * 2)
  const r = rand(0.9, 1.2)
  const tube = rand(-0.22, 0.22)
  const x = (r + tube * Math.cos(angle)) * Math.cos(angle)
  const z = (r + tube * Math.sin(angle)) * Math.sin(angle)
  return [x, tube - 1.05, z]
}

export function generateGeometry(type: ShapeType, count: number) {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    let point: number[]

    switch (type) {
      case 'sphere':
        point = randomOnSphere(1.1)
        break
      case 'heart':
        point = heartPoint()
        break
      case 'flower':
        point = phyllotaxisPoint(i, count)
        break
      case 'saturn':
        point = saturnPoint(i, count)
        break
      case 'buddha':
        point = buddhaPoint()
        break
      case 'fireworks':
        point = randomInSphere(rand(1, 1.8))
        break
      default:
        point = randomOnSphere()
    }

    positions[i * 3] = point[0]
    positions[i * 3 + 1] = point[1]
    positions[i * 3 + 2] = point[2]
  }

  return positions
}


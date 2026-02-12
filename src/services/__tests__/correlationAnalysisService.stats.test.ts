import { describe, it, expect } from 'vitest'
import { calculatePearsonCorrelation, performCorrelationAnalysis } from '@/services/correlationAnalysisService'

function must<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message)
  }
  return value
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0)
}

function scale(v: number[], k: number): number[] {
  return v.map(x => x * k)
}

function sub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - (b[i] ?? 0))
}

function generateCorrelatedPair(n: number, r: number): { x: number[]; y: number[] } {
  // Centered x (mean 0)
  const x = Array.from({ length: n }, (_, i) => i - (n - 1) / 2)

  // Start with a simple centered z, then orthogonalize against x
  const z0 = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : -1))
  const proj = dot(z0, x) / dot(x, x)
  let z = sub(z0, scale(x, proj))

  // Scale z to match ||x|| so that correlation is controlled by coefficients
  const normX2 = dot(x, x)
  const normZ2 = dot(z, z)
  if (normZ2 === 0) {
    // fallback (should not happen for n>=5)
    z = Array.from({ length: n }, () => 0)
  } else {
    z = scale(z, Math.sqrt(normX2 / normZ2))
  }

  const a = r
  const b = Math.sqrt(1 - r * r)
  const y = x.map((xi, i) => a * xi + b * (z[i] ?? 0))
  return { x, y }
}

describe('correlationAnalysisService (stats)', () => {
  it('calculatePearsonCorrelation returns expected r for constructed data', () => {
    const { x, y } = generateCorrelatedPair(10, 0.5)
    const r = calculatePearsonCorrelation(x, y)
    expect(r).toBeCloseTo(0.5, 10)
  })

  it('performCorrelationAnalysis returns two-tailed p-values with reasonable magnitude', () => {
    // n=10, df=8
    const rValues = [0, 0.5, 0.8, 0.9] as const
    const results = rValues.map(targetR => {
      const { x, y } = generateCorrelatedPair(10, targetR)
      const res = performCorrelationAnalysis(x, y)
      expect(res).not.toBeNull()
      return res!
    })

    expect(results).toHaveLength(4)
    const r0 = must(results[0], 'missing result for r=0')
    const r1 = must(results[1], 'missing result for r=0.5')
    const r2 = must(results[2], 'missing result for r=0.8')
    const r3 = must(results[3], 'missing result for r=0.9')

    // r=0 => p ~ 1
    expect(r0.coefficient).toBeCloseTo(0, 10)
    expect(r0.pValue).toBeGreaterThan(0.99)

    // r=0.5 => p ~ 0.141 (two-tailed, df=8)
    expect(r1.coefficient).toBeCloseTo(0.5, 10)
    expect(r1.pValue).toBeGreaterThan(0.11)
    expect(r1.pValue).toBeLessThan(0.18)

    // r=0.8 => p around 0.005
    expect(r2.coefficient).toBeCloseTo(0.8, 10)
    expect(r2.pValue).toBeGreaterThan(0.001)
    expect(r2.pValue).toBeLessThan(0.02)

    // r=0.9 => p very small
    expect(r3.coefficient).toBeCloseTo(0.9, 10)
    expect(r3.pValue).toBeLessThan(0.002)
  })

  it('performCorrelationAnalysis treats |r|=1 as p=0', () => {
    const x = [0, 1, 2, 3, 4]
    const y = [0, 2, 4, 6, 8]
    const res = performCorrelationAnalysis(x, y)
    expect(res).not.toBeNull()
    expect(res!.coefficient).toBeCloseTo(1, 12)
    expect(res!.pValue).toBe(0)
    expect(res!.isSignificant).toBe(true)
  })

  it('p-value is symmetric for r and -r', () => {
    const { x, y } = generateCorrelatedPair(10, 0.8)
    const resPos = performCorrelationAnalysis(x, y)
    const resNeg = performCorrelationAnalysis(x, y.map(v => -v))
    expect(resPos).not.toBeNull()
    expect(resNeg).not.toBeNull()
    expect(resPos!.pValue).toBeCloseTo(resNeg!.pValue, 10)
  })
})

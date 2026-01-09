import { describe, it, expect } from 'vitest'
import { registerAllGames } from '@/games'
import { gameRegistry } from '@/core/gameRegistry'
import { hasGameResultConverter } from '@/services/scoreNormalizer'

describe('scoreNormalizer converter coverage', () => {
  it('every registered game should have a converter', () => {
    gameRegistry.clear()
    registerAllGames()

    const gameIds = gameRegistry.getAllIds()
    const missing = gameIds.filter(id => !hasGameResultConverter(id))

    expect(missing).toEqual([])
  })
})
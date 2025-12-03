/**
 * 遊戲註冊中心
 * 管理所有遊戲的註冊、查詢與認知維度關聯
 */

import type { CognitiveDimension } from '../types/cognitive'
import type { GameDefinition, CognitiveWeights } from '../types/game'

class GameRegistry {
  private games: Map<string, GameDefinition> = new Map()

  /**
   * 註冊遊戲
   */
  register(game: GameDefinition): void {
    if (this.games.has(game.id)) {
      console.warn(`遊戲 ${game.id} 已經註冊，將被覆蓋`)
    }
    this.games.set(game.id, game)
  }

  /**
   * 批量註冊遊戲
   */
  registerAll(games: GameDefinition[]): void {
    games.forEach(game => this.register(game))
  }

  /**
   * 取得遊戲定義
   */
  get(gameId: string): GameDefinition | undefined {
    return this.games.get(gameId)
  }

  /**
   * 取得所有遊戲
   */
  getAll(): GameDefinition[] {
    return Array.from(this.games.values())
  }

  /**
   * 取得遊戲 ID 列表
   */
  getAllIds(): string[] {
    return Array.from(this.games.keys())
  }

  /**
   * 依認知維度取得遊戲
   */
  getByDimension(dimension: CognitiveDimension): GameDefinition[] {
    return this.getAll().filter(game => {
      const weights = game.cognitiveWeights
      return weights[dimension] !== undefined && (weights[dimension] as number) > 0
    })
  }

  /**
   * 取得遊戲的認知維度權重
   */
  getCognitiveWeights(gameId: string): CognitiveWeights {
    const game = this.get(gameId)
    return game?.cognitiveWeights || {}
  }

  /**
   * 取得遊戲的主要認知維度（權重最高的）
   */
  getPrimaryDimension(gameId: string): CognitiveDimension | null {
    const weights = this.getCognitiveWeights(gameId)
    const entries = Object.entries(weights) as [CognitiveDimension, number][]
    if (entries.length === 0) return null
    
    return entries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )[0]
  }

  /**
   * 取得所有認知維度的相關遊戲與權重
   */
  getDimensionGameMap(): Map<CognitiveDimension, Array<{ gameId: string; weight: number }>> {
    const map = new Map<CognitiveDimension, Array<{ gameId: string; weight: number }>>()
    
    // 初始化所有維度
    const dimensions: CognitiveDimension[] = [
      'reaction', 'logic', 'memory', 'cognition', 'coordination', 'attention'
    ]
    dimensions.forEach(d => map.set(d, []))
    
    // 遍歷所有遊戲
    this.getAll().forEach(game => {
      const weights = game.cognitiveWeights
      Object.entries(weights).forEach(([dimension, weight]) => {
        const w = weight as number
        if (w && w > 0) {
          map.get(dimension as CognitiveDimension)?.push({ gameId: game.id, weight: w })
        }
      })
    })
    
    return map
  }

  /**
   * 檢查遊戲是否已註冊
   */
  has(gameId: string): boolean {
    return this.games.has(gameId)
  }

  /**
   * 取得已註冊遊戲數量
   */
  get count(): number {
    return this.games.size
  }

  /**
   * 移除遊戲（通常不需要）
   */
  unregister(gameId: string): boolean {
    return this.games.delete(gameId)
  }

  /**
   * 清除所有遊戲（通常不需要）
   */
  clear(): void {
    this.games.clear()
  }
}

// 單例導出
export const gameRegistry = new GameRegistry()

// 預設導出類別（供測試用）
export default GameRegistry

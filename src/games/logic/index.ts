/**
 * 遊戲邏輯模組統一匯出
 * 包含所有遊戲的題目生成、驗證、分數計算等純邏輯
 * 
 * 為避免命名衝突，以命名空間方式匯出各遊戲模組
 */

// 數學計算遊戲
import * as MathCalcLogic from './mathCalc'
export { MathCalcLogic }
export type { MathCalcConfig, MathQuestion, MathCalcResult } from './mathCalc'

// 卡片配對遊戲
import * as CardMatchLogic from './cardMatch'
export { CardMatchLogic }
export type { CardMatchConfig, Card, CardMatchResult } from './cardMatch'

// Stroop 測試
import * as StroopTestLogic from './stroopTest'
export { StroopTestLogic }
export type { StroopConfig, StroopQuestion, StroopResult } from './stroopTest'

// 打地鼠遊戲
import * as WhackAMoleLogic from './whackAMole'
export { WhackAMoleLogic }
export type { WhackAMoleConfig, Hole, WhackAMoleResult } from './whackAMole'

// 天平秤重遊戲
import * as BalanceScaleLogic from './balanceScale'
export { BalanceScaleLogic }
export type { BalanceScaleConfig, WeightItem, BalanceScaleResult } from './balanceScale'

// 迷宮導航遊戲
import * as MazeNavigationLogic from './mazeNavigation'
export { MazeNavigationLogic }
export type { MazeConfig, MazeState, MazeResult } from './mazeNavigation'

// 找不同遊戲
import * as SpotDifferenceLogic from './spotDifference'
export { SpotDifferenceLogic }
export type { SpotDifferenceConfig, SpotDifferenceResult } from './spotDifference'

// 瞬間記憶遊戲
import * as InstantMemoryLogic from './instantMemory'
export { InstantMemoryLogic }
export type { InstantMemoryConfig, RoundState as InstantMemoryRoundState, InstantMemoryResult } from './instantMemory'

// 撲克記憶遊戲
import * as PokerMemoryLogic from './pokerMemory'
export { PokerMemoryLogic }
export type { PokerMemoryConfig, PokerCard, PokerMemoryResult } from './pokerMemory'

// 猜拳遊戲
import * as RockPaperScissorsLogic from './rockPaperScissors'
export { RockPaperScissorsLogic }
export type { RockPaperScissorsConfig, RockPaperScissorsResult } from './rockPaperScissors'

// 手勢記憶遊戲
import * as GestureMemoryLogic from './gestureMemory'
export { GestureMemoryLogic }
export type { GestureMemoryConfig, Gesture, GestureMemoryResult } from './gestureMemory'

// 數字連連看遊戲
import * as NumberConnectLogic from './numberConnect'
export { NumberConnectLogic }
export type { NumberConnectConfig, NumberNode, NumberConnectResult } from './numberConnect'

// 圖案推理遊戲
import * as PatternReasoningLogic from './patternReasoning'
export { PatternReasoningLogic }
export type { PatternReasoningConfig, PatternQuestion, PatternReasoningResult } from './patternReasoning'

// 聲音記憶遊戲
import * as AudioMemoryLogic from './audioMemory'
export { AudioMemoryLogic }
export type { AudioMemoryConfig, SoundItem, AudioMemoryResult } from './audioMemory'

// 節拍模仿遊戲
import * as RhythmMimicLogic from './rhythmMimic'
export { RhythmMimicLogic }
export type { RhythmMimicConfig, RhythmPattern, RhythmMimicResult } from './rhythmMimic'

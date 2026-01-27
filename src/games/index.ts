// 遊戲註冊 - 將所有遊戲註冊到系統中
import { gameRegistry } from '@/core/gameRegistry'
import { getAssetEmoji, preloadAssetManifest } from '@/services/assetLoader'

// 註冊所有遊戲
export function registerAllGames(): void {
  void preloadAssetManifest()
  // 1. 打地鼠 - 反應力為主
  gameRegistry.register({
    id: 'whack-a-mole',
    name: '打地鼠',
    description: '快速點擊出現的地鼠，訓練反應速度和注意力',
    icon: '🐹',
    category: 'reaction',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 20, easy: 30, medium: 45, hard: 60 },
    cognitiveWeights: {
      reaction: 0.8,
      attention: 0.2,
    },
    defaultSettings: {
      easy: { interval: 2400, duration: 1800, holes: 3, bombChance: 0.1, gameTime: 40 },
      medium: { interval: 1900, duration: 1400, holes: 6, bombChance: 0.15, gameTime: 50 },
      hard: { interval: 1500, duration: 1100, holes: 9, bombChance: 0.2, gameTime: 60 },
    },
    instructions: [
      '點擊「開始遊戲」按鈕',
      '當地鼠 🐹 出現時，快速點擊它',
      '小心避開炸彈 💣，點到會扣分',
      '連續擊中可獲得連擊加成',
    ],
  })

  // 2. 天平比重 - 邏輯為主
  gameRegistry.register({
    id: 'balance-scale',
    name: '天平比重',
    description: '判斷哪邊較重，訓練邏輯推理和數學能力',
    icon: '⚖️',
    category: 'logic',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 40, easy: 60, medium: 90, hard: 120 },
    cognitiveWeights: {
      logic: 0.9,
      cognition: 0.1,
    },
    defaultSettings: {
      easy: { rounds: 8, maxItems: 4, minDiff: 2, maxDiff: 4, timePerRound: 12, showWeightHint: true, showTilt: true, tiltStrength: 3.5, maxTilt: 20 },
      medium: { rounds: 12, maxItems: 5, minDiff: 2, maxDiff: 3, timePerRound: 10, showWeightHint: false, showTilt: true, tiltStrength: 3, maxTilt: 18 },
      hard: { rounds: 15, maxItems: 6, minDiff: 1, maxDiff: 2, timePerRound: 8, showWeightHint: false, showTilt: true, tiltStrength: 2.5, maxTilt: 14 },
    },
    instructions: [
      '觀察天平兩側的物品',
      '判斷哪一側比較重',
      '點擊你認為較重的那一側',
      '注意物品的數量和大小都會影響重量',
    ],
  })

  // 3. 翻牌配對 - 記憶力為主
  gameRegistry.register({
    id: 'card-match',
    name: '翻牌配對',
    description: '記住卡片位置並找出配對，訓練短期記憶',
    icon: '🃏',
    category: 'memory',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 40, easy: 60, medium: 90, hard: 120 },
    cognitiveWeights: {
      memory: 0.85,
      attention: 0.15,
    },
    defaultSettings: {
      easy: { pairs: 6, previewTime: 3500, gridCols: 3, timeLimit: 0 },
      medium: { pairs: 8, previewTime: 2500, gridCols: 4, timeLimit: 150 },
      hard: { pairs: 12, previewTime: 2000, gridCols: 4, timeLimit: 120 },
    },
    instructions: [
      '遊戲開始會短暫顯示所有卡片',
      '記住每張卡片的位置',
      '翻開兩張相同的卡片即可配對',
      '用最少的步數完成所有配對',
    ],
  })

  // 4. Stroop測試 - 認知為主
  gameRegistry.register({
    id: 'stroop-test',
    name: 'Stroop測試',
    description: '說出文字的顏色而非文字內容，訓練認知靈活性',
    icon: '🎨',
    category: 'cognition',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 30, easy: 60, medium: 90, hard: 120 },
    cognitiveWeights: {
      cognition: 0.7,
      reaction: 0.3,
    },
      defaultSettings: {
        easy: { rounds: 5, timePerRound: 9, congruentChance: 0.5 },
        medium: { rounds: 10, timePerRound: 7, congruentChance: 0.3 },
        hard: { rounds: 15, timePerRound: 6, congruentChance: 0.2 },
      },
    instructions: [
      '螢幕會顯示一個有顏色的文字',
      '選擇文字的「顏色」，而不是文字本身',
      '例如：紅色的「藍色」→ 答案是「紅色」',
      '在時間內做出正確選擇',
    ],
  })

  // 5. 皇家花園迷宮 - 協調為主
  gameRegistry.register({
    id: 'maze-navigation',
    name: '皇家花園迷宮',
    description: '規劃路線走出迷宮，訓練空間感和手眼協調',
    icon: '🧭',
    category: 'coordination',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 40, easy: 60, medium: 90, hard: 120 },
    cognitiveWeights: {
      coordination: 0.75,
      logic: 0.25,
    },
    defaultSettings: {
      easy: { size: 7, complexity: 0.3 },
      medium: { size: 9, complexity: 0.4 },
      hard: { size: 11, complexity: 0.5 },
    },
    instructions: [
      '使用方向鍵或點擊按鈕移動',
      '從起點（綠色）走到終點（紅色）',
      '規劃最短路線可獲得更高分數',
      '支援鍵盤 WASD 或方向鍵控制',
    ],
  })

  // 6. 找不同 - 專注力為主
  gameRegistry.register({
    id: 'spot-difference',
    name: '找不同',
    description: '找出兩張圖片的不同之處，訓練觀察力和專注力',
    icon: '🔍',
    category: 'attention',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 50, easy: 90, medium: 120, hard: 150 },
    cognitiveWeights: {
      attention: 0.8,
      cognition: 0.2,
    },
    defaultSettings: {
      easy: { gridSize: 4, diffCount: 2, rounds: 3, timePerRound: 50, maxHints: 3 },
      medium: { gridSize: 5, diffCount: 3, rounds: 4, timePerRound: 45, maxHints: 2 },
      hard: { gridSize: 6, diffCount: 4, rounds: 5, timePerRound: 40, maxHints: 1 },
    },
    instructions: [
      '觀察左右兩張圖片',
      '點擊右圖中與左圖不同的位置',
      '找出所有不同點即可過關',
      '可使用提示功能，但次數有限',
    ],
  })

  // 7. 加減乘除 - 邏輯+處理速度
  gameRegistry.register({
    id: 'math-calc',
    name: '加減乘除',
    description: '快速計算數學題目，訓練邏輯推理和處理速度',
    icon: '🧮',
    category: 'logic',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 45, easy: 90, medium: 90, hard: 90 },
    cognitiveWeights: {
      logic: 0.6,
      attention: 0.3,
      reaction: 0.1,
    },
    defaultSettings: {
      easy: { questionsCount: 10, timeLimit: 120, operations: ['+', '-'], maxNumber: 20 },
      medium: { questionsCount: 12, timeLimit: 120, operations: ['+', '-', '×'], maxNumber: 50 },
      hard: { questionsCount: 15, timeLimit: 120, operations: ['+', '-', '×', '÷'], maxNumber: 100 },
    },
    instructions: [
      '觀察數學題目',
      '快速計算出答案',
      '從四個選項中選擇正確答案',
      '答對越快，分數越高',
    ],
  })

  // 8. 瞬間記憶 - 短期記憶
  gameRegistry.register({
    id: 'instant-memory',
    name: '瞬間記憶',
    description: '記住閃現的數字序列，訓練短期記憶和工作記憶',
    icon: '🧠',
    category: 'memory',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 30, easy: 60, medium: 90, hard: 120 },
    cognitiveWeights: {
      memory: 0.8,
      attention: 0.2,
    },
    defaultSettings: {
      easy: { startLength: 3, maxLength: 6, showTime: 2400, rounds: 8 },
      medium: { startLength: 4, maxLength: 8, showTime: 2000, rounds: 10 },
      hard: { startLength: 5, maxLength: 10, showTime: 1600, rounds: 12 },
    },
    instructions: [
      '觀察螢幕上閃現的數字',
      '記住數字出現的順序',
      '使用數字鍵盤依序輸入',
      '答對會增加數字長度',
    ],
  })

  // 9. 撲克記憶 - 記憶+注意
  gameRegistry.register({
    id: 'poker-memory',
    name: '撲克記憶',
    description: '找出相同的撲克牌配對，訓練視覺空間記憶',
    icon: '🃏',
    category: 'memory',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 60, easy: 120, medium: 120, hard: 120 },
    cognitiveWeights: {
      memory: 0.7,
      attention: 0.3,
    },
    defaultSettings: {
      easy: { pairs: 6, gridCols: 4, timeLimit: 120, peekTime: 3500 },
      medium: { pairs: 8, gridCols: 4, timeLimit: 120, peekTime: 2500 },
      hard: { pairs: 12, gridCols: 6, timeLimit: 120, peekTime: 2000 },
    },
    instructions: [
      '開始會短暫顯示所有牌面',
      '記住每張撲克牌的位置',
      '翻開兩張相同花色和數字的牌即配對成功',
      '在時間內完成所有配對',
    ],
  })

  // 10. 猜拳遊戲 - 反應+認知
  gameRegistry.register({
    id: 'rock-paper-scissors',
    name: '猜拳遊戲',
    description: '快速選擇正確的手勢，訓練反應速度和認知彈性',
    icon: '✊',
    category: 'reaction',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 30, easy: 60, medium: 75, hard: 90 },
    cognitiveWeights: {
      reaction: 0.5,
      cognition: 0.4,
      attention: 0.1,
    },
    defaultSettings: {
      easy: { rounds: 10, timePerRound: 6, reverseChance: 0 },
      medium: { rounds: 12, timePerRound: 5, reverseChance: 0.25 },
      hard: { rounds: 15, timePerRound: 4, reverseChance: 0.4 },
    },
    instructions: [
      '電腦出拳後快速選擇你的手勢',
      '正常模式：選擇能贏過電腦的手勢',
      '反向模式：選擇會輸給電腦的手勢',
      '反應越快，分數越高',
    ],
  })

  // 11. 手勢記憶 - 記憶+協調
  gameRegistry.register({
    id: 'gesture-memory',
    name: '手勢記憶',
    description: '觀察一系列手勢後按順序重現，訓練序列記憶和協調力',
    icon: '👋',
    category: 'memory',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 45, easy: 90, medium: 120, hard: 150 },
    cognitiveWeights: {
      memory: 0.6,
      coordination: 0.4,
    },
    defaultSettings: {
      easy: { startLength: 2, maxLength: 4, showTime: 1800, gesturePool: 6, totalRounds: 8 },
      medium: { startLength: 3, maxLength: 6, showTime: 1500, gesturePool: 8, totalRounds: 10 },
      hard: { startLength: 4, maxLength: 8, showTime: 1200, gesturePool: 9, totalRounds: 12 },
    },
    instructions: [
      '觀察依序出現的手勢圖案',
      '記住手勢出現的順序',
      '按照相同順序點擊對應手勢',
      '連續答對可增加序列長度',
    ],
  })

  // 12. 數字連連看 - 注意力+認知
  gameRegistry.register({
    id: 'number-connect',
    name: '數字連連看',
    description: '按順序依次點擊數字，訓練注意力和視覺掃描',
    icon: '🔢',
    category: 'attention',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 30, easy: 60, medium: 90, hard: 120 },
    cognitiveWeights: {
      attention: 0.6,
      cognition: 0.4,
    },
    defaultSettings: {
      easy: { count: 6, timeLimit: 60, nodeSize: 56, spacing: 90 },
      medium: { count: 8, timeLimit: 80, nodeSize: 52, spacing: 80 },
      hard: { count: 9, timeLimit: 90, nodeSize: 48, spacing: 72 },
    },
    instructions: [
      '畫面上散佈著數字',
      '依序點擊 1, 2, 3... 直到最大數字',
      '點擊錯誤會扣分',
      '越快完成分數越高',
    ],
  })

  // 13. 圖形推理 - 邏輯+認知
  gameRegistry.register({
    id: 'pattern-reasoning',
    name: '圖形推理',
    description: '找出圖形序列的規律，選擇正確的下一個圖形',
    icon: '🔷',
    category: 'logic',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 50, easy: 90, medium: 120, hard: 150 },
    cognitiveWeights: {
      logic: 0.6,
      cognition: 0.4,
    },
    defaultSettings: {
      easy: { sequenceLength: 3, optionCount: 3, totalRounds: 8, timePerRound: 35, complexity: 1 },
      medium: { sequenceLength: 4, optionCount: 4, totalRounds: 10, timePerRound: 30, complexity: 2 },
      hard: { sequenceLength: 5, optionCount: 4, totalRounds: 12, timePerRound: 25, complexity: 3 },
    },
    instructions: [
      '觀察圖形序列的變化規律',
      '可能是形狀、顏色、大小或旋轉的變化',
      '選擇最符合規律的下一個圖形',
      '答對越快分數越高',
    ],
  })

  // 14. 聽覺記憶 - 記憶+注意力
  gameRegistry.register({
    id: 'audio-memory',
    name: '聽覺記憶',
    description: '聽取一系列聲音後按順序選擇，訓練聽覺記憶',
    icon: '🎵',
    category: 'memory',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 45, easy: 90, medium: 120, hard: 150 },
    cognitiveWeights: {
      memory: 0.6,
      attention: 0.4,
    },
      defaultSettings: {
        easy: { startLength: 2, maxLength: 4, soundPool: 6, totalRounds: 5, playbackSpeed: 1700 },
        medium: { startLength: 3, maxLength: 6, soundPool: 8, totalRounds: 8, playbackSpeed: 1400 },
        hard: { startLength: 4, maxLength: 8, soundPool: 9, totalRounds: 10, playbackSpeed: 1100 },
      },
    instructions: [
      '仔細聆聽播放的音符序列',
      '記住音符出現的順序',
      '點擊對應的音符按鈕重現順序',
      '可點擊重新播放再聽一次',
    ],
  })

  // 15. 節奏模仿 - 協調力+反應
  gameRegistry.register({
    id: 'rhythm-mimic',
    name: '節奏模仿',
    description: '觀察節奏模式後在正確時機點擊，訓練節奏感和協調力',
    icon: '🥁',
    category: 'coordination',
    difficulties: ['easy', 'medium', 'hard'],
    estimatedTime: { mini: 45, easy: 90, medium: 120, hard: 150 },
    cognitiveWeights: {
      coordination: 0.6,
      reaction: 0.4,
    },
    defaultSettings: {
      easy: { startBeats: 3, maxBeats: 6, tempo: 900, tolerance: 320, totalRounds: 8 },
      medium: { startBeats: 4, maxBeats: 8, tempo: 700, tolerance: 240, totalRounds: 10 },
      hard: { startBeats: 5, maxBeats: 10, tempo: 550, tolerance: 180, totalRounds: 12 },
    },
    instructions: [
      '觀察示範的節奏模式',
      '倒數結束後輪到你模仿',
      '在正確的時機點擊螢幕',
      '時機越準確分數越高',
    ],
  })

  void Promise.all([
    updateGameIcon('whack-a-mole'),
    updateGameIcon('balance-scale'),
    updateGameIcon('card-match'),
    updateGameIcon('stroop-test'),
    updateGameIcon('maze-navigation'),
    updateGameIcon('spot-difference'),
    updateGameIcon('math-calc'),
    updateGameIcon('instant-memory'),
    updateGameIcon('poker-memory'),
    updateGameIcon('rock-paper-scissors'),
    updateGameIcon('gesture-memory'),
    updateGameIcon('number-connect'),
    updateGameIcon('pattern-reasoning'),
    updateGameIcon('audio-memory'),
    updateGameIcon('rhythm-mimic'),
  ])
}

async function updateGameIcon(gameId: string): Promise<void> {
  const game = gameRegistry.get(gameId)
  if (!game) return
  const usage = `game.icon.${gameId}`
  const emoji = await getAssetEmoji(usage)
  if (emoji) {
    game.icon = emoji
  }
}

// 獲取遊戲元件
export function getGameComponent(gameId: string) {
  const componentMap: Record<string, () => Promise<any>> = {
    'whack-a-mole': () => import('@/components/games/WhackAMole.vue'),
    'balance-scale': () => import('@/components/games/BalanceScale.vue'),
    'card-match': () => import('@/components/games/CardMatch.vue'),
    'stroop-test': () => import('@/components/games/StroopTest.vue'),
    'math-calc': () => import('@/components/games/MathCalc.vue'),
    'maze-navigation': () => import('@/components/games/MazeNavigation.vue'),
    'spot-difference': () => import('@/components/games/SpotDifference.vue'),
    'instant-memory': () => import('@/components/games/InstantMemory.vue'),
    'poker-memory': () => import('@/components/games/PokerMemory.vue'),
    'rock-paper-scissors': () => import('@/components/games/RockPaperScissors.vue'),
    'gesture-memory': () => import('@/components/games/GestureMemory.vue'),
    'number-connect': () => import('@/components/games/NumberConnect.vue'),
    'pattern-reasoning': () => import('@/components/games/PatternReasoning.vue'),
    'audio-memory': () => import('@/components/games/AudioMemory.vue'),
    'rhythm-mimic': () => import('@/components/games/RhythmMimic.vue'),
  }

  return componentMap[gameId]
}

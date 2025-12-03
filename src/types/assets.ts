/**
 * 素材類型定義
 */

// 素材類別
export type AssetCategory = 'ui' | 'games' | 'cognitive' | 'report'

// 素材類型
export type AssetType = 'image' | 'audio'

// 音效類型
export type SoundType = 'sfx' | 'bgm'

// 遊戲素材清單
export interface GameAssets {
  images: Record<string, string>  // key: 用途, value: 路徑
  audio: Record<string, string>   // key: 用途, value: 路徑
}

// 素材清單
export interface AssetManifest {
  ui: GameAssets
  games: Record<string, GameAssets>
  cognitive: Record<string, string>  // dimension -> icon path
}

// 預設素材清單（使用 emoji 和系統音效作為佔位）
export const DEFAULT_ASSET_MANIFEST: AssetManifest = {
  ui: {
    images: {
      logo: '/images/ui/logo.svg',
      homeIcon: '/images/ui/icons/home.svg',
      settingsIcon: '/images/ui/icons/settings.svg',
      reportIcon: '/images/ui/icons/report.svg',
      userIcon: '/images/ui/icons/user.svg',
      playIcon: '/images/ui/icons/play.svg',
      pauseIcon: '/images/ui/icons/pause.svg',
      soundOnIcon: '/images/ui/icons/sound-on.svg',
      soundOffIcon: '/images/ui/icons/sound-off.svg',
    },
    audio: {
      click: '/audio/ui/click.mp3',
      success: '/audio/ui/success.mp3',
      error: '/audio/ui/error.mp3',
      complete: '/audio/ui/complete.mp3',
    },
  },
  games: {
    'whack-a-mole': {
      images: {
        moleNormal: '/images/games/whack-a-mole/mole-normal.png',
        moleHit: '/images/games/whack-a-mole/mole-hit.png',
        hole: '/images/games/whack-a-mole/hole.png',
        hammer: '/images/games/whack-a-mole/hammer.png',
      },
      audio: {
        hit: '/audio/games/whack-a-mole/hit.mp3',
        miss: '/audio/games/whack-a-mole/miss.mp3',
        popup: '/audio/games/whack-a-mole/popup.mp3',
      },
    },
    'balance-scale': {
      images: {
        scale: '/images/games/balance-scale/scale.png',
        weight1: '/images/games/balance-scale/weight-1.png',
        weight2: '/images/games/balance-scale/weight-2.png',
      },
      audio: {
        drop: '/audio/games/balance-scale/drop.mp3',
        balance: '/audio/games/balance-scale/balance.mp3',
      },
    },
    'card-match': {
      images: {
        cardBack: '/images/games/card-match/card-back.png',
        cardFront1: '/images/games/card-match/card-front-1.png',
        cardFront2: '/images/games/card-match/card-front-2.png',
        cardFront3: '/images/games/card-match/card-front-3.png',
        cardFront4: '/images/games/card-match/card-front-4.png',
      },
      audio: {
        flip: '/audio/games/card-match/flip.mp3',
        match: '/audio/games/card-match/match.mp3',
        mismatch: '/audio/games/card-match/mismatch.mp3',
      },
    },
    'stroop-test': {
      images: {},  // 純文字遊戲
      audio: {
        correct: '/audio/games/stroop-test/correct.mp3',
        wrong: '/audio/games/stroop-test/wrong.mp3',
      },
    },
    'maze-navigation': {
      images: {
        player: '/images/games/maze-navigation/player.png',
        wall: '/images/games/maze-navigation/wall.png',
        goal: '/images/games/maze-navigation/goal.png',
        path: '/images/games/maze-navigation/path.png',
      },
      audio: {
        step: '/audio/games/maze-navigation/step.mp3',
        wallBump: '/audio/games/maze-navigation/wall-bump.mp3',
        goalReach: '/audio/games/maze-navigation/goal-reach.mp3',
      },
    },
    'spot-difference': {
      images: {
        scene1a: '/images/games/spot-difference/scene-1-a.png',
        scene1b: '/images/games/spot-difference/scene-1-b.png',
        marker: '/images/games/spot-difference/marker.png',
      },
      audio: {
        found: '/audio/games/spot-difference/found.mp3',
        hint: '/audio/games/spot-difference/hint.mp3',
      },
    },
  },
  cognitive: {
    reaction: '/images/cognitive/reaction.svg',
    logic: '/images/cognitive/logic.svg',
    memory: '/images/cognitive/memory.svg',
    cognition: '/images/cognitive/cognition.svg',
    coordination: '/images/cognitive/coordination.svg',
    attention: '/images/cognitive/attention.svg',
  },
}

// 素材載入狀態
export interface AssetLoadingState {
  loaded: number
  total: number
  isLoading: boolean
  error: string | null
}

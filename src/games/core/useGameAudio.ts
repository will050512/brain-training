/**
 * 遊戲音效管理 Composable
 * 支援預錄音效（.ogg/.mp3）+ Web Audio API 合成備援
 */

import { ref, onUnmounted } from 'vue'
import type { GameSoundType, CustomSoundConfig } from './gameTypes'

// ===== 音效配置 =====

/** 預設音效頻率配置（Web Audio 合成用） */
const SYNTH_SOUNDS: Record<GameSoundType, { frequency: number; duration: number; type: OscillatorType }> = {
  correct: { frequency: 880, duration: 150, type: 'sine' },
  wrong: { frequency: 220, duration: 200, type: 'square' },
  click: { frequency: 440, duration: 50, type: 'sine' },
  start: { frequency: 660, duration: 200, type: 'sine' },
  end: { frequency: 440, duration: 300, type: 'triangle' },
  countdown: { frequency: 880, duration: 100, type: 'sine' },
  warning: { frequency: 330, duration: 150, type: 'sawtooth' },
  combo: { frequency: 1046, duration: 150, type: 'sine' },
  perfect: { frequency: 1318, duration: 200, type: 'sine' },
  levelUp: { frequency: 523, duration: 400, type: 'sine' },
  bonus: { frequency: 784, duration: 150, type: 'sine' },
  tick: { frequency: 1000, duration: 30, type: 'sine' },
  flip: { frequency: 600, duration: 80, type: 'sine' },
  match: { frequency: 740, duration: 200, type: 'sine' },
  mismatch: { frequency: 200, duration: 200, type: 'sawtooth' },
}

/** 音效檔案基礎路徑 */
const AUDIO_BASE_PATH = '/audio/games'

/** 支援的音效格式（按優先順序） */
const AUDIO_FORMATS = ['.ogg', '.mp3']

// ===== 類型定義 =====

export interface UseGameAudioOptions {
  /** 是否啟用音效 */
  enabled?: boolean
  /** 主音量 (0-1) */
  volume?: number
  /** 自訂音效配置 */
  customSounds?: CustomSoundConfig[]
  /** 遊戲專屬音效資料夾 */
  gameFolder?: string
}

interface AudioCache {
  buffer: AudioBuffer | null
  audio: HTMLAudioElement | null
}

// ===== 全域音效上下文（單例） =====

let globalAudioContext: AudioContext | null = null
const audioBufferCache = new Map<string, AudioBuffer>()
const audioElementCache = new Map<string, HTMLAudioElement>()

function getAudioContext(): AudioContext {
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // 確保音效上下文已啟動（需要使用者互動）
  if (globalAudioContext.state === 'suspended') {
    globalAudioContext.resume()
  }
  return globalAudioContext
}

// ===== Composable =====

export function useGameAudio(options: UseGameAudioOptions = {}) {
  const {
    enabled = true,
    volume = 0.5,
    customSounds = [],
    gameFolder,
  } = options

  // ===== 狀態 =====
  const isEnabled = ref(enabled)
  const masterVolume = ref(volume)
  const isLoading = ref(false)
  const loadedSounds = ref<Set<string>>(new Set())

  // 用於追蹤當前播放的音效
  const activeSources: Set<AudioBufferSourceNode> = new Set()
  const activeOscillators: Set<OscillatorNode> = new Set()

  // ===== 音效載入 =====

  /**
   * 獲取音效檔案路徑
   */
  function getAudioPath(soundId: string): string[] {
    const folder = gameFolder ? `${AUDIO_BASE_PATH}/${gameFolder}` : AUDIO_BASE_PATH
    return AUDIO_FORMATS.map(ext => `${folder}/${soundId}${ext}`)
  }

  /**
   * 預載音效檔案
   */
  async function preloadSound(soundId: string): Promise<boolean> {
    if (loadedSounds.value.has(soundId)) return true

    const paths = getAudioPath(soundId)
    
    for (const path of paths) {
      try {
        // 嘗試使用 AudioBuffer（優先，更精確控制）
        const response = await fetch(path)
        if (!response.ok) continue
        
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = getAudioContext()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        audioBufferCache.set(soundId, audioBuffer)
        loadedSounds.value.add(soundId)
        return true
      } catch {
        // 嘗試下一個格式
        continue
      }
    }

    // 備援：嘗試使用 HTMLAudioElement
    for (const path of paths) {
      try {
        const audio = new Audio()
        audio.preload = 'auto'
        
        await new Promise<void>((resolve, reject) => {
          audio.oncanplaythrough = () => resolve()
          audio.onerror = () => reject()
          audio.src = path
        })
        
        audioElementCache.set(soundId, audio)
        loadedSounds.value.add(soundId)
        return true
      } catch {
        continue
      }
    }

    return false
  }

  /**
   * 批次預載音效
   */
  async function preloadSounds(soundIds: string[]): Promise<void> {
    isLoading.value = true
    
    await Promise.all(
      soundIds.map(id => preloadSound(id).catch(() => false))
    )
    
    isLoading.value = false
  }

  /**
   * 預載所有預設遊戲音效
   */
  async function preloadDefaultSounds(): Promise<void> {
    const defaultSounds: GameSoundType[] = [
      'correct', 'wrong', 'click', 'start', 'end',
      'countdown', 'warning', 'combo'
    ]
    await preloadSounds(defaultSounds)
  }

  // ===== 音效播放 =====

  /**
   * 使用 Web Audio API 播放已載入的音效
   */
  function playFromBuffer(soundId: string, customVolume?: number): void {
    const buffer = audioBufferCache.get(soundId)
    if (!buffer) return

    try {
      const audioContext = getAudioContext()
      const source = audioContext.createBufferSource()
      const gainNode = audioContext.createGain()
      
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      gainNode.gain.value = (customVolume ?? masterVolume.value)
      
      source.start(0)
      activeSources.add(source)
      
      source.onended = () => {
        activeSources.delete(source)
      }
    } catch (error) {
      console.warn(`播放音效失敗 [${soundId}]:`, error)
    }
  }

  /**
   * 使用 HTMLAudioElement 播放音效
   */
  function playFromElement(soundId: string, customVolume?: number): void {
    const audio = audioElementCache.get(soundId)
    if (!audio) return

    try {
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = customVolume ?? masterVolume.value
      clone.play().catch(() => {})
    } catch (error) {
      console.warn(`播放音效失敗 [${soundId}]:`, error)
    }
  }

  /**
   * 使用 Web Audio API 合成音效（最終備援）
   */
  function playSynthSound(
    frequency: number,
    duration: number = 150,
    type: OscillatorType = 'sine',
    customVolume?: number
  ): void {
    try {
      const audioContext = getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.type = type
      oscillator.frequency.value = frequency
      
      const vol = customVolume ?? masterVolume.value
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(vol * 0.3, audioContext.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration / 1000)
      
      activeOscillators.add(oscillator)
      
      oscillator.onended = () => {
        activeOscillators.delete(oscillator)
      }
    } catch (error) {
      console.warn('合成音效播放失敗:', error)
    }
  }

  /**
   * 播放遊戲音效
   * 優先順序：AudioBuffer > HTMLAudioElement > Web Audio 合成
   */
  function playSound(soundType: GameSoundType, customVolume?: number): void {
    if (!isEnabled.value) return

    // 嘗試播放預載的音效
    if (audioBufferCache.has(soundType)) {
      playFromBuffer(soundType, customVolume)
      return
    }

    if (audioElementCache.has(soundType)) {
      playFromElement(soundType, customVolume)
      return
    }

    // 備援：使用合成音效
    const synthConfig = SYNTH_SOUNDS[soundType]
    if (synthConfig) {
      playSynthSound(
        synthConfig.frequency,
        synthConfig.duration,
        synthConfig.type,
        customVolume
      )
    }
  }

  /**
   * 播放自訂音效
   */
  function playCustomSound(soundId: string, customVolume?: number): void {
    if (!isEnabled.value) return

    // 嘗試從快取播放
    if (audioBufferCache.has(soundId)) {
      playFromBuffer(soundId, customVolume)
      return
    }

    if (audioElementCache.has(soundId)) {
      playFromElement(soundId, customVolume)
      return
    }

    // 查找自訂配置
    const config = customSounds.find(s => s.id === soundId)
    if (config?.frequency) {
      playSynthSound(
        config.frequency,
        config.duration ?? 150,
        'sine',
        config.volume ?? customVolume
      )
    }
  }

  /**
   * 播放音調序列（用於音樂類遊戲）
   */
  async function playToneSequence(
    frequencies: number[],
    duration: number = 300,
    gap: number = 100
  ): Promise<void> {
    for (const freq of frequencies) {
      playSynthSound(freq, duration, 'sine')
      await new Promise(resolve => setTimeout(resolve, duration + gap))
    }
  }

  /**
   * 播放單個音調
   */
  function playTone(frequency: number, duration: number = 300): void {
    if (!isEnabled.value) return
    playSynthSound(frequency, duration, 'sine')
  }

  // ===== 控制方法 =====

  /**
   * 設置音效開關
   */
  function setEnabled(value: boolean): void {
    isEnabled.value = value
    if (!value) {
      stopAll()
    }
  }

  /**
   * 設置主音量
   */
  function setVolume(value: number): void {
    masterVolume.value = Math.max(0, Math.min(1, value))
  }

  /**
   * 停止所有音效
   */
  function stopAll(): void {
    activeSources.forEach(source => {
      try {
        source.stop()
      } catch {}
    })
    activeSources.clear()

    activeOscillators.forEach(osc => {
      try {
        osc.stop()
      } catch {}
    })
    activeOscillators.clear()
  }

  /**
   * 清理資源
   */
  function cleanup(): void {
    stopAll()
    loadedSounds.value.clear()
  }

  // 組件卸載時清理
  onUnmounted(() => {
    stopAll()
  })

  // ===== 便捷方法 =====

  /** 播放正確音效 */
  const playCorrect = () => playSound('correct')
  
  /** 播放錯誤音效 */
  const playWrong = () => playSound('wrong')
  
  /** 播放點擊音效 */
  const playClick = () => playSound('click')
  
  /** 播放開始音效 */
  const playStart = () => playSound('start')
  
  /** 播放結束音效 */
  const playEnd = () => playSound('end')
  
  /** 播放倒數音效 */
  const playCountdown = () => playSound('countdown')
  
  /** 播放警告音效 */
  const playWarning = () => playSound('warning')
  
  /** 播放連擊音效 */
  const playCombo = () => playSound('combo')
  
  /** 播放配對成功音效 */
  const playMatch = () => playSound('match')
  
  /** 播放配對失敗音效 */
  const playMismatch = () => playSound('mismatch')
  
  /** 播放翻牌音效 */
  const playFlip = () => playSound('flip')

  return {
    // 狀態
    isEnabled,
    masterVolume,
    isLoading,
    loadedSounds,
    
    // 預載方法
    preloadSound,
    preloadSounds,
    preloadDefaultSounds,
    
    // 播放方法
    playSound,
    playCustomSound,
    playTone,
    playToneSequence,
    playSynthSound,
    
    // 便捷方法
    playCorrect,
    playWrong,
    playClick,
    playStart,
    playEnd,
    playCountdown,
    playWarning,
    playCombo,
    playMatch,
    playMismatch,
    playFlip,
    
    // 控制方法
    setEnabled,
    setVolume,
    stopAll,
    cleanup,
  }
}

export type UseGameAudioReturn = ReturnType<typeof useGameAudio>

// ===== 全域音效管理器（可選） =====

let globalAudioManager: UseGameAudioReturn | null = null

/**
 * 獲取全域音效管理器
 */
export function getGlobalAudioManager(): UseGameAudioReturn {
  if (!globalAudioManager) {
    // 創建一個不會被卸載的實例
    globalAudioManager = {
      ...useGameAudio(),
    }
  }
  return globalAudioManager
}

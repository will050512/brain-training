import type { Page } from '@playwright/test'

const TEST_USER_ID = 'user_test_seed'

export const seedUserId = TEST_USER_ID

export async function seedLocalStorage(page: Page): Promise<void> {
  await page.addInitScript(({ userId }) => {
    localStorage.setItem('brain-training-current-user', userId)
    localStorage.setItem('brain-training-last-user', userId)
    localStorage.setItem(`brain-training-assessment-${userId}`, JSON.stringify({
      hasCompletedAssessment: true,
      assessmentResult: {
        suggestedDifficulty: 'medium',
        completedAt: new Date().toISOString(),
        scores: { reaction: 60, memory: 55, logic: 65 },
      },
    }))
    localStorage.setItem('brain-training-settings', JSON.stringify({
      soundEnabled: false,
      musicEnabled: false,
      soundVolume: 0.7,
      musicVolume: 0.5,
      hasSeenWelcome: true,
      fontSize: 'large',
      themeMode: 'light',
      orientationPreference: 'auto',
      declineDetectionMode: 'general',
      dailyTrainingDuration: 15,
      weeklyTrainingGoal: 5,
      enableBehaviorTracking: true,
      reduceMotion: false,
      highContrast: false,
      enableVoicePrompts: false,
      enableHapticFeedback: true,
      assessmentReminderEnabled: true,
      sidebarCollapsed: false,
      defaultDifficulty: 'easy',
      defaultSubDifficulty: 2,
      gameDifficultySettings: {},
      hasGlobalDifficultyOverride: false,
    }))
  }, { userId: TEST_USER_ID })
}

export async function seedIndexedDB(page: Page): Promise<void> {
  await page.addInitScript(({ userId }) => {
    const request = indexedDB.open('brain-training-db', 4)
    request.onupgradeneeded = () => {
      // DB schema is created by app code; ensure open succeeds.
    }
    request.onsuccess = () => {
      const db = request.result
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const tx = db.transaction(['users', 'userSettings', 'userStats', 'gameSessions', 'dailyTrainingSessions', 'miniCogResults'], 'readwrite')
      tx.objectStore('users').put({
        id: userId,
        name: '測試使用者',
        birthday: '1955-05-01',
        educationYears: 12,
        gender: 'female',
        transferCode: 'TEST01',
        transferCodeUpdatedAt: now,
        clientSource: 'web',
        authProvider: 'local',
        createdAt: now,
        lastActiveAt: now,
        updatedAt: now,
        profileVersion: 1,
      })
      tx.objectStore('userSettings').put({
        odId: userId,
        soundEnabled: false,
        musicEnabled: false,
        soundVolume: 0.7,
        musicVolume: 0.5,
        hasSeenWelcome: true,
      })
      tx.objectStore('userStats').put({
        odId: userId,
        totalGamesPlayed: 6,
        totalPlayTime: 600,
        averageScore: 68,
        bestScores: {
          'whack-a-mole': 82,
          'math-calc': 76,
          'card-match': 71,
        },
        gamePlayCounts: {
          'whack-a-mole': 2,
          'math-calc': 2,
          'card-match': 2,
        },
        favoriteGameId: 'whack-a-mole',
        lastPlayedAt: now,
        streak: 2,
      })

      const sessions = [
        buildSession(userId, 'whack-a-mole', 'easy', 2, 82, 55, 1, startOfWeek),
        buildSession(userId, 'math-calc', 'easy', 2, 76, 60, 2, startOfWeek),
        buildSession(userId, 'card-match', 'easy', 2, 71, 65, 3, startOfWeek),
        buildSession(userId, 'stroop-test', 'easy', 2, 66, 50, 4, startOfWeek),
        buildSession(userId, 'pattern-reasoning', 'easy', 2, 69, 58, 5, startOfWeek),
        buildSession(userId, 'audio-memory', 'easy', 2, 64, 52, 6, startOfWeek),
      ]
      const gameStore = tx.objectStore('gameSessions')
      sessions.forEach(session => gameStore.put(session))

      tx.objectStore('dailyTrainingSessions').put({
        id: `daily-${userId}-${startOfWeek.toISOString().slice(0, 10)}`,
        odId: userId,
        date: startOfWeek.toISOString().slice(0, 10),
        plannedGames: [
          { gameId: 'whack-a-mole', difficulty: 'easy', subDifficulty: 2, estimatedTime: 30 },
          { gameId: 'math-calc', difficulty: 'easy', subDifficulty: 2, estimatedTime: 40 },
          { gameId: 'card-match', difficulty: 'easy', subDifficulty: 2, estimatedTime: 50 },
        ],
        completedGames: ['whack-a-mole'],
        interrupted: false,
        startedAt: now.toISOString(),
        completedAt: '',
        totalDuration: 120,
      })

      tx.objectStore('miniCogResults').put({
        id: `mini-${userId}-${now.getTime()}`,
        odId: userId,
        wordRecall: {
          wordSet: { locale: 'zh-TW', words: ['香蕉', '日出', '椅子'], setIndex: 0 },
          immediateRecall: ['香蕉', '日出'],
          delayedRecall: ['香蕉'],
          score: 2,
        },
        clockDrawing: {
          targetTime: '11:10',
          selfAssessment: { hasCompleteCircle: true, hasCorrectNumbers: true, hasCorrectHands: false },
          score: 1,
          completionTime: 120000,
        },
        totalScore: 3,
        atRisk: false,
        mmseCorrelation: '',
        completedAt: now.toISOString(),
        duration: 180,
      })

      tx.oncomplete = () => {
        db.close()
      }
    }

    function buildSession(userId: string, gameId: string, difficulty: 'easy' | 'medium' | 'hard', subDifficulty: 1 | 2 | 3, score: number, duration: number, offsetDays: number, startOfWeek: Date) {
      const createdAt = new Date(startOfWeek)
      createdAt.setDate(startOfWeek.getDate() + offsetDays)
      return {
        id: `${gameId}-${userId}-${createdAt.getTime()}`,
        odId: userId,
        gameId,
        difficulty,
        subDifficulty,
        result: {
          gameId,
          difficulty,
          subDifficulty,
          score,
          maxScore: 100,
          correctCount: 10,
          totalCount: 12,
          accuracy: 0.83,
          avgReactionTime: 650,
          duration,
          timestamp: createdAt,
          mode: offsetDays % 2 === 0 ? 'daily' : 'free',
        },
        cognitiveScores: {
          reaction: score * 0.6,
          logic: score * 0.2,
          memory: score * 0.2,
          cognition: 0,
          coordination: 0,
          attention: 0,
        },
        createdAt,
      }
    }
  }, { userId: TEST_USER_ID })
}

/**
 * Vue Router 設定
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
// 導入佈局類型（會自動擴展 RouteMeta）
import '@/types/layout'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { 
      layout: 'default',
      title: '首頁',
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { 
      layout: 'fullscreen',
      title: '登入',
    },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { 
      layout: 'fullscreen',
      title: '歡迎',
    },
  },
  {
    path: '/assessment',
    name: 'Assessment',
    component: () => import('@/views/AssessmentView.vue'),
    meta: { 
      requiresAuth: true,
      layout: 'app',
      title: '能力評估',
    },
  },
  {
    path: '/games',
    name: 'GameSelect',
    component: () => import('@/views/GameSelectView.vue'),
    meta: { 
      requiresAuth: true, 
      requiresAssessment: true,
      layout: 'default',
      title: '選擇遊戲',
    },
  },
  {
    // 舊版「說明/難度頁」：已整合到 GamePlayView 的 ready 畫面，保留 redirect 兼容舊連結
    path: '/games/:gameId/preview',
    redirect: to => ({
      name: 'GamePlay',
      params: to.params,
      query: to.query,
    }),
    meta: { 
      requiresAuth: true, 
      requiresAssessment: true,
      layout: 'fullscreen',
      title: '遊戲預覽',
    },
  },
  {
    path: '/games/:gameId',
    name: 'GamePlay',
    component: () => import('@/views/GamePlayView.vue'),
    meta: { 
      requiresAuth: true, 
      requiresAssessment: true,
      layout: 'game',
      title: '遊戲中',
      isGame: true,
      hideBottomNav: true,
    },
    props: true,
  },
  {
    path: '/daily-challenge',
    name: 'DailyChallenge',
    component: () => import('@/views/DailyChallengeView.vue'),
    meta: { 
      requiresAuth: true, 
      requiresAssessment: true,
      layout: 'default',
      title: '每日挑戰',
    },
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('@/views/ReportView.vue'),
    meta: { 
      requiresAuth: true,
      layout: 'default',
      title: '訓練報告',
    },
  },
  {
    path: '/weekly-report',
    name: 'WeeklyReport',
    component: () => import('@/views/WeeklyReportView.vue'),
    meta: { 
      requiresAuth: true,
      layout: 'default',
      title: '週報告',
    },
  },
  {
    path: '/nutrition',
    name: 'Nutrition',
    component: () => import('@/views/NutritionView.vue'),
    meta: { 
      requiresAuth: true,
      layout: 'default',
      title: '營養建議',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { 
      layout: 'default',
      title: '設定',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 導航守衛
router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAssessment = to.matched.some(record => record.meta.requiresAssessment)
  const hasUser = localStorage.getItem('brain-training-current-user')
  
  if (requiresAuth) {
    // 檢查 localStorage 是否有登入狀態
    if (!hasUser) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  }
  
  // 首次使用者需完成能力評估
  let hasCompletedAssessment = false
  if (hasUser) {
    const assessmentData = localStorage.getItem(`brain-training-assessment-${hasUser}`)
    if (assessmentData) {
      try {
        hasCompletedAssessment = JSON.parse(assessmentData).hasCompletedAssessment === true
      } catch {
        hasCompletedAssessment = false
      }
    }
  }

  const assessmentAllowedRoutes = new Set(['Assessment', 'Onboarding', 'Login'])
  if (hasUser && !hasCompletedAssessment && !assessmentAllowedRoutes.has(to.name as string)) {
    next({ name: 'Assessment', query: { redirect: to.fullPath } })
    return
  }

  // 檢查是否需要完成評估才能訪問
  if (requiresAssessment) {
    if (!hasCompletedAssessment) {
      // 重定向到評估頁面
      next({ name: 'Assessment', query: { redirect: to.fullPath } })
      return
    }
  }
  
  next()
})

export default router

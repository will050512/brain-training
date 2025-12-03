/**
 * Vue Router 設定
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingView.vue'),
  },
  {
    path: '/assessment',
    name: 'Assessment',
    component: () => import('@/views/AssessmentView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/games',
    name: 'GameSelect',
    component: () => import('@/views/GameSelectView.vue'),
    meta: { requiresAuth: true, requiresAssessment: true },
  },
  {
    path: '/games/:gameId',
    name: 'GamePlay',
    component: () => import('@/views/GamePlayView.vue'),
    meta: { requiresAuth: true, requiresAssessment: true },
    props: true,
  },
  {
    path: '/daily-challenge',
    name: 'DailyChallenge',
    component: () => import('@/views/DailyChallengeView.vue'),
    meta: { requiresAuth: true, requiresAssessment: true },
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('@/views/ReportView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/weekly-report',
    name: 'WeeklyReport',
    component: () => import('@/views/WeeklyReportView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/nutrition',
    name: 'Nutrition',
    component: () => import('@/views/NutritionView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
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
  
  if (requiresAuth) {
    // 檢查 localStorage 是否有登入狀態
    const hasUser = localStorage.getItem('brain-training-current-user')
    if (!hasUser) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  }
  
  // 檢查是否需要完成評估才能訪問
  if (requiresAssessment) {
    const settingsData = localStorage.getItem('brain-training-settings')
    const hasCompletedAssessment = settingsData 
      ? JSON.parse(settingsData).hasCompletedAssessment === true
      : false
    
    if (!hasCompletedAssessment) {
      // 重定向到評估頁面
      next({ name: 'Assessment', query: { redirect: to.fullPath } })
      return
    }
  }
  
  next()
})

export default router

<script setup lang="ts">
/**
 * 營養推薦視圖
 * 根據認知表現提供營養補充建議
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { 
  checkNutritionTriggers,
  getAllSupplements,
  type NutritionRecommendation,
  type SupplementInfo,
  type SupplementType,
  type ScoreHistory as NutritionScoreHistory
} from '@/services/nutritionPlaceholder'
import { calculateScoreHistory, type ScoreHistory } from '@/services/scoreCalculator'
import { getDB } from '@/services/db'
import type { CognitiveDimension } from '@/types/cognitive'
import type { GameSession } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const isLoading = ref(true)
const activeRecommendations = ref<NutritionRecommendation[]>([])
const allSupplements = ref<SupplementInfo[]>([])
const showAllSupplements = ref(false)
const selectedType = ref<string>('all')

// 類型列表
const supplementTypes = computed(() => {
  const types = allSupplements.value.map(s => s.type)
  return ['all', ...Array.from(new Set(types))]
})

// 類型名稱對照
const typeNames: Record<string, string> = {
  all: '全部',
  omega3: 'Omega-3 魚油',
  vitaminB: '維生素 B 群',
  vitaminD: '維生素 D',
  vitaminE: '維生素 E',
  lecithin: '卵磷脂',
  ginkgo: '銀杏',
  phosphatidylserine: '磷脂醯絲胺酸',
  coq10: '輔酶 Q10',
  curcumin: '薑黃素'
}

// 維度名稱對照
const dimensionNames: Record<CognitiveDimension, string> = {
  reaction: '反應力',
  logic: '邏輯力',
  memory: '記憶力',
  cognition: '認知力',
  coordination: '協調力',
  attention: '專注力'
}

// 載入推薦
async function loadRecommendations(): Promise<void> {
  isLoading.value = true
  
  try {
    const userId = userStore.currentUser?.id
    if (userId) {
      // 取得遊戲記錄
      const db = await getDB()
      const sessions = await db.getAll('gameSessions') as GameSession[]
      const userSessions = sessions.filter(s => s.odId === userId)
      
      // 計算歷史分數
      const history = calculateScoreHistory(userSessions, 'day')
      
      // 取得最新分數
      if (history.length > 0) {
        const latest = history[history.length - 1]
        const latestScores = latest?.scores || {
          reaction: 70, logic: 70, memory: 70, cognition: 70, coordination: 70, attention: 70
        }
        
        // 轉換歷史格式
        const scoreHistory: NutritionScoreHistory[] = history.map((h: ScoreHistory) => ({
          date: h.date,
          scores: h.scores
        }))
        
        // 取得根據表現觸發的推薦
        const triggered = checkNutritionTriggers(latestScores, scoreHistory)
        activeRecommendations.value = triggered
      }
    }
    
    // 所有營養品
    allSupplements.value = getAllSupplements()
  } catch (error) {
    console.error('載入營養推薦失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 取得優先級顏色
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    case 'low': return '#22c55e'
    default: return '#6b7280'
  }
}

// 取得優先級文字
function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high': return '強烈建議'
    case 'medium': return '建議'
    case 'low': return '可考慮'
    default: return ''
  }
}

// 取得類型圖示
function getTypeIcon(type: SupplementType | string): string {
  switch (type) {
    case 'omega3': return '🐟'
    case 'vitaminB': return '💊'
    case 'vitaminD': return '☀️'
    case 'vitaminE': return '🌻'
    case 'lecithin': return '🥚'
    case 'ginkgo': return '🌿'
    case 'phosphatidylserine': return '🧬'
    case 'coq10': return '⚡'
    case 'curcumin': return '🧡'
    default: return '📦'
  }
}

// 篩選後的推薦
const filteredRecommendations = computed(() => {
  if (selectedType.value === 'all') return activeRecommendations.value
  return activeRecommendations.value.filter(r => r.supplement.type === selectedType.value)
})

// 篩選後的所有營養品
const filteredSupplements = computed(() => {
  if (selectedType.value === 'all') return allSupplements.value
  return allSupplements.value.filter(s => s.type === selectedType.value)
})

onMounted(() => {
  loadRecommendations()
})
</script>

<template>
  <div class="nutrition-view">
    <header class="page-header">
      <button class="back-btn" @click="router.back()">
        ← 返回
      </button>
      <h1>🥗 營養建議</h1>
    </header>

    <!-- 重要免責聲明 -->
    <div class="disclaimer-box">
      <div class="disclaimer-icon">⚠️</div>
      <div class="disclaimer-content">
        <h3>重要聲明</h3>
        <p>
          本頁面提供的營養建議僅供參考，不能替代專業醫療建議。
          在開始任何營養補充計劃之前，請務必諮詢醫師或營養師。
        </p>
        <p class="disclaimer-note">
          特別是正在服藥的使用者，某些營養素可能與藥物產生交互作用。
        </p>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>正在分析您的需求...</p>
    </div>

    <template v-else>
      <!-- 切換顯示 -->
      <div class="toggle-section">
        <button 
          class="toggle-btn"
          :class="{ active: !showAllSupplements }"
          @click="showAllSupplements = false"
        >
          📌 個人化建議 ({{ activeRecommendations.length }})
        </button>
        <button 
          class="toggle-btn"
          :class="{ active: showAllSupplements }"
          @click="showAllSupplements = true"
        >
          📚 所有營養素
        </button>
      </div>

      <!-- 無個人化建議時 -->
      <div v-if="!showAllSupplements && activeRecommendations.length === 0" class="no-recommendations">
        <div class="no-rec-icon">✨</div>
        <h3>目前沒有特別建議</h3>
        <p>根據您的訓練表現，目前沒有特別需要加強的營養素。</p>
        <p class="sub">持續保持良好的訓練習慣！</p>
        <button class="view-all-btn" @click="showAllSupplements = true">
          瀏覽所有營養素 →
        </button>
      </div>

      <!-- 類型篩選 -->
      <div v-if="(showAllSupplements ? filteredSupplements.length : filteredRecommendations.length) > 0" class="type-filter">
        <button
          v-for="t in supplementTypes"
          :key="t"
          class="type-btn"
          :class="{ active: selectedType === t }"
          @click="selectedType = t"
        >
          {{ t !== 'all' ? getTypeIcon(t) : '📋' }}
          {{ typeNames[t] || t }}
        </button>
      </div>

      <!-- 個人化推薦列表 -->
      <div v-if="!showAllSupplements && filteredRecommendations.length > 0" class="recommendations-list">
        <div 
          v-for="rec in filteredRecommendations"
          :key="rec.id"
          class="recommendation-card"
        >
          <!-- 優先級標籤 -->
          <div 
            class="priority-tag"
            :style="{ backgroundColor: getPriorityColor(rec.priority) }"
          >
            {{ getPriorityText(rec.priority) }}
          </div>

          <div class="rec-header">
            <span class="rec-icon">{{ getTypeIcon(rec.supplement.type) }}</span>
            <div class="rec-title-section">
              <h3 class="rec-name">{{ rec.supplement.name }}</h3>
              <span class="rec-type">{{ rec.supplement.nameEn }}</span>
            </div>
          </div>

          <p class="rec-description">{{ rec.supplement.description }}</p>
          
          <!-- 建議原因 -->
          <div class="rec-reason">
            <span class="reason-label">📋 建議原因：</span>
            <span class="reason-value">{{ rec.reason }}</span>
          </div>

          <!-- 針對的維度 -->
          <div class="rec-dimensions">
            <span class="dim-label">針對：</span>
            <span 
              v-for="dim in rec.supplement.relatedDimensions" 
              :key="dim"
              class="dim-tag"
            >
              {{ dimensionNames[dim] }}
            </span>
          </div>

          <!-- 建議劑量 -->
          <div class="rec-dosage">
            <span class="dosage-label">💊 建議劑量：</span>
            <span class="dosage-value">{{ rec.supplement.dosageRange }}</span>
          </div>

          <!-- 主要功效 -->
          <div class="rec-benefits">
            <span class="benefits-label">✨ 主要功效：</span>
            <span class="benefits-value">{{ rec.supplement.benefits.join('、') }}</span>
          </div>

          <!-- 注意事項 -->
          <div v-if="rec.supplement.precautions.length > 0" class="rec-warnings">
            <details>
              <summary>⚠️ 注意事項</summary>
              <ul>
                <li v-for="(warning, idx) in rec.supplement.precautions" :key="idx">
                  {{ warning }}
                </li>
              </ul>
            </details>
          </div>

          <!-- 交互作用 -->
          <div v-if="rec.supplement.interactions.length > 0" class="rec-interactions">
            <details>
              <summary>💊 可能的交互作用</summary>
              <ul>
                <li v-for="(interaction, idx) in rec.supplement.interactions" :key="idx">
                  {{ interaction }}
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>

      <!-- 所有營養品列表 -->
      <div v-if="showAllSupplements" class="supplements-list">
        <div 
          v-for="supplement in filteredSupplements"
          :key="supplement.type"
          class="supplement-card"
        >
          <div class="sup-header">
            <span class="sup-icon">{{ getTypeIcon(supplement.type) }}</span>
            <div class="sup-title-section">
              <h3 class="sup-name">{{ supplement.name }}</h3>
              <span class="sup-name-en">{{ supplement.nameEn }}</span>
            </div>
          </div>

          <p class="sup-description">{{ supplement.description }}</p>

          <!-- 針對的維度 -->
          <div class="sup-dimensions">
            <span class="dim-label">相關維度：</span>
            <span 
              v-for="dim in supplement.relatedDimensions" 
              :key="dim"
              class="dim-tag"
            >
              {{ dimensionNames[dim] }}
            </span>
          </div>

          <!-- 建議劑量 -->
          <div class="sup-dosage">
            <span class="dosage-label">💊 建議劑量：</span>
            <span class="dosage-value">{{ supplement.dosageRange }}</span>
          </div>

          <!-- 主要功效 -->
          <div class="sup-benefits">
            <span class="benefits-label">✨ 主要功效：</span>
            <span class="benefits-value">{{ supplement.benefits.join('、') }}</span>
          </div>

          <!-- 注意事項 -->
          <div v-if="supplement.precautions.length > 0" class="sup-warnings">
            <details>
              <summary>⚠️ 注意事項</summary>
              <ul>
                <li v-for="(warning, idx) in supplement.precautions" :key="idx">
                  {{ warning }}
                </li>
              </ul>
            </details>
          </div>

          <!-- 交互作用 -->
          <div v-if="supplement.interactions.length > 0" class="sup-interactions">
            <details>
              <summary>💊 可能的交互作用</summary>
              <ul>
                <li v-for="(interaction, idx) in supplement.interactions" :key="idx">
                  {{ interaction }}
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>

      <!-- 底部提醒 -->
      <div class="bottom-reminder">
        <p>💡 營養補充應配合均衡飲食，不應取代正常飲食。</p>
        <p>🏥 如有任何健康疑慮，請諮詢專業醫療人員。</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.nutrition-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 3rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: var(--color-background-soft, #f1f5f9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.page-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

/* 免責聲明 */
.disclaimer-box {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #fef3c7, #fef9c3);
  border: 2px solid #f59e0b;
  border-radius: 16px;
  margin-bottom: 1.5rem;
}

.disclaimer-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.disclaimer-content h3 {
  margin: 0 0 0.5rem 0;
  color: #b45309;
  font-size: 1.125rem;
}

.disclaimer-content p {
  margin: 0;
  color: #92400e;
  font-size: 0.9rem;
  line-height: 1.5;
}

.disclaimer-note {
  margin-top: 0.5rem !important;
  font-weight: 500;
}

/* 載入中 */
.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 切換按鈕 */
.toggle-section {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.toggle-btn {
  flex: 1;
  padding: 0.875rem;
  background: var(--color-background-soft, #f1f5f9);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #e2e8f0;
}

.toggle-btn.active {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1d4ed8;
  font-weight: 600;
}

/* 無建議 */
.no-recommendations {
  text-align: center;
  padding: 3rem 1rem;
  background: var(--color-background-soft, #f1f5f9);
  border-radius: 16px;
}

.no-rec-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-recommendations h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.no-recommendations p {
  margin: 0;
  color: #64748b;
}

.no-recommendations .sub {
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.view-all-btn {
  margin-top: 1.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

/* 類型篩選 */
.type-filter {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}

.type-btn {
  padding: 0.5rem 1rem;
  background: var(--color-background-soft, #f1f5f9);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.type-btn:hover {
  background: #e2e8f0;
}

.type-btn.active {
  background: #3b82f6;
  color: white;
}

/* 推薦列表 & 營養品列表 */
.recommendations-list,
.supplements-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-card,
.supplement-card {
  position: relative;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
}

.priority-tag {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.rec-header,
.sup-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.rec-icon,
.sup-icon {
  font-size: 2rem;
}

.rec-title-section,
.sup-title-section {
  flex: 1;
}

.rec-name,
.sup-name {
  margin: 0;
  font-size: 1.25rem;
}

.rec-type,
.sup-name-en {
  font-size: 0.875rem;
  color: #64748b;
}

.rec-description,
.sup-description {
  color: #374151;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.rec-reason {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border-radius: 8px;
}

.reason-label {
  color: #166534;
  font-weight: 500;
}

.reason-value {
  color: #166534;
}

.rec-dimensions,
.sup-dimensions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.dim-label {
  font-size: 0.875rem;
  color: #64748b;
}

.dim-tag {
  padding: 0.25rem 0.5rem;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.rec-dosage,
.sup-dosage,
.rec-benefits,
.sup-benefits {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.dosage-label,
.benefits-label {
  color: #64748b;
}

.dosage-value,
.benefits-value {
  font-weight: 500;
}

.rec-warnings,
.sup-warnings,
.rec-interactions,
.sup-interactions {
  margin-top: 1rem;
  font-size: 0.875rem;
}

.rec-warnings details,
.sup-warnings details {
  background: #fef3c7;
  border-radius: 8px;
  padding: 0.75rem;
}

.rec-interactions details,
.sup-interactions details {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.rec-warnings summary,
.sup-warnings summary {
  cursor: pointer;
  font-weight: 500;
  color: #b45309;
}

.rec-interactions summary,
.sup-interactions summary {
  cursor: pointer;
  font-weight: 500;
  color: #475569;
}

.rec-warnings ul,
.sup-warnings ul,
.rec-interactions ul,
.sup-interactions ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
}

.rec-warnings li,
.sup-warnings li {
  margin-bottom: 0.25rem;
  color: #92400e;
}

.rec-interactions li,
.sup-interactions li {
  margin-bottom: 0.25rem;
  color: #64748b;
}

/* 底部提醒 */
.bottom-reminder {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--color-background-soft, #f1f5f9);
  border-radius: 12px;
  text-align: center;
}

.bottom-reminder p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #64748b;
}

/* 響應式 */
@media (max-width: 640px) {
  .disclaimer-box {
    flex-direction: column;
    text-align: center;
  }
  
  .toggle-section {
    flex-direction: column;
  }
}
</style>

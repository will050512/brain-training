<template>
  <ResponsiveContainer class="report-view">
    <!-- 手機版 APP 風格佈局 -->
    <template #mobile>
      <div class="mobile-report">
        <!-- 手機版頂部導覽 -->
        <header class="mobile-header">
          <router-link to="/" class="back-btn">
            <span class="icon">←</span>
          </router-link>
          <h1 class="mobile-title">認知評估報告</h1>
          <button @click="downloadReport" class="action-btn" :disabled="isGenerating">
            <span class="icon">{{ isGenerating ? '⏳' : '📥' }}</span>
          </button>
        </header>

        <!-- 手機版內容 - 垂直滑動卡片 -->
        <main class="mobile-content" ref="reportRef">
          <!-- 快速摘要卡片 -->
          <section class="mobile-summary-card">
            <div class="user-avatar">👤</div>
            <div class="user-info">
              <h2 class="user-name">{{ userStore.currentUser?.name }}</h2>
              <p class="user-age">{{ userStore.userAge }} 歲</p>
            </div>
            <div class="score-badge" :class="getScoreLevel(cognitiveIndex)">
              <span class="score-value">{{ cognitiveIndex }}</span>
              <span class="score-label">綜合指數</span>
            </div>
          </section>

          <!-- 認知能力雷達圖卡片 -->
          <section class="mobile-card">
            <h3 class="card-title">🧠 認知能力</h3>
            <RadarChart 
              :scores="gameStore.cognitiveScores" 
              :previousScores="previousScores"
            />
          </section>

          <!-- 各維度分數卡片（可左右滑動） -->
          <section class="dimension-swiper">
            <h3 class="swiper-title">各維度表現</h3>
            <div class="swiper-container">
              <div 
                v-for="dim in cognitiveDimensions" 
                :key="dim.id" 
                class="dimension-card"
                :style="{ borderColor: dim.color }"
              >
                <span class="dim-icon">{{ dim.icon }}</span>
                <span class="dim-name">{{ dim.name }}</span>
                <span class="dim-score" :style="{ color: dim.color }">
                  {{ gameStore.cognitiveScores[dim.id] }}
                </span>
                <span class="dim-trend">{{ getTrendIcon(dim.id) }}</span>
              </div>
            </div>
          </section>

          <!-- 趨勢圖卡片 -->
          <section class="mobile-card">
            <h3 class="card-title">📈 歷史趨勢</h3>
            <TrendChart 
              :history="gameStore.scoreHistory" 
              :showWarningLines="true"
              :professionalMode="false"
            />
          </section>

          <!-- 訓練統計卡片 -->
          <section class="mobile-stats-card">
            <h3 class="card-title">📊 訓練統計</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value text-blue-500">{{ userStore.currentStats?.totalGamesPlayed || 0 }}</span>
                <span class="stat-label">總遊戲次數</span>
              </div>
              <div class="stat-item">
                <span class="stat-value text-green-500">{{ userStore.currentStats?.averageScore || 0 }}</span>
                <span class="stat-label">平均分數</span>
              </div>
              <div class="stat-item">
                <span class="stat-value text-purple-500">{{ formatPlayTime(userStore.currentStats?.totalPlayTime || 0) }}</span>
                <span class="stat-label">訓練時長</span>
              </div>
              <div class="stat-item">
                <span class="stat-value text-orange-500">{{ userStore.currentStats?.streak || 0 }}</span>
                <span class="stat-label">連續天數</span>
              </div>
            </div>
          </section>

          <!-- Mini-Cog 評估卡片 -->
          <section v-if="latestMiniCogResult" class="mobile-card mini-cog-mobile">
            <h3 class="card-title">🧪 Mini-Cog™ 評估</h3>
            <div class="mini-cog-summary">
              <div class="mini-cog-score-ring" :class="getMiniCogScoreClass(latestMiniCogResult.totalScore)">
                {{ latestMiniCogResult.totalScore }}/5
              </div>
              <div class="mini-cog-detail">
                <p class="interpretation">{{ getMiniCogInterpretation(latestMiniCogResult).level }}</p>
                <p class="date">{{ formatDate(new Date(latestMiniCogResult.completedAt)) }}</p>
              </div>
            </div>
            <router-link to="/assessment" class="btn btn-secondary btn-block">
              重新測驗
            </router-link>
          </section>

          <!-- 無 Mini-Cog 記錄 -->
          <section v-else class="mobile-card mini-cog-empty-mobile">
            <span class="empty-icon">🧠</span>
            <h3>尚無 Mini-Cog™ 評估</h3>
            <p>約 3 分鐘即可完成認知篩檢</p>
            <router-link to="/assessment" class="btn btn-primary">
              立即評估
            </router-link>
          </section>

          <!-- Mini-Cog 與遊戲分數關聯分析 -->
          <section class="mobile-card">
            <h3 class="card-title">📐 關聯分析</h3>
            <MiniCogCorrelationChart 
              :mini-cog-results="miniCogHistory"
              :game-sessions="gameStore.recentSessions"
            />
          </section>

          <!-- 訓練建議卡片 -->
          <section class="mobile-card">
            <h3 class="card-title">💡 訓練建議</h3>
            <div class="suggestion-list">
              <div 
                v-for="(suggestion, index) in trainingSuggestions.slice(0, 3)" 
                :key="index"
                class="suggestion-item"
                :class="`priority-${suggestion.priority}`"
              >
                <span class="suggestion-icon">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }}</span>
                <div class="suggestion-content">
                  <strong>{{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}</strong>
                  <p>{{ suggestion.message }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- 免責聲明 -->
          <section class="mobile-disclaimer">
            <p>⚠️ 本報告僅供參考，不可作為醫療診斷依據。如有疑慮，請諮詢專業醫師。</p>
          </section>
        </main>

        <!-- 手機版底部快速導覽 -->
        <nav class="mobile-bottom-nav">
          <router-link to="/" class="nav-item">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">首頁</span>
          </router-link>
          <router-link to="/weekly-report" class="nav-item">
            <span class="nav-icon">📅</span>
            <span class="nav-label">週報告</span>
          </router-link>
          <router-link to="/games" class="nav-item">
            <span class="nav-icon">🎮</span>
            <span class="nav-label">遊戲</span>
          </router-link>
          <router-link to="/settings" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">設定</span>
          </router-link>
        </nav>
      </div>
    </template>

    <!-- 桌面版專業儀表板佈局 -->
    <template #desktop>
      <div class="desktop-report">
        <!-- 側邊快速導覽 -->
        <aside class="desktop-sidebar">
          <nav class="sidebar-nav">
            <a 
              v-for="section in reportSections" 
              :key="section.id"
              :href="`#${section.id}`"
              class="sidebar-link"
              :class="{ active: activeSection === section.id }"
              @click.prevent="scrollToSection(section.id)"
            >
              <span class="link-icon">{{ section.icon }}</span>
              <span class="link-text">{{ section.name }}</span>
            </a>
          </nav>
          <div class="sidebar-actions">
            <button @click="downloadReport" class="btn btn-primary btn-block" :disabled="isGenerating">
              {{ isGenerating ? '生成中...' : '📥 下載 PDF' }}
            </button>
            <router-link to="/weekly-report" class="btn btn-secondary btn-block">
              📅 週報告
            </router-link>
          </div>
        </aside>

        <!-- 主內容區域 -->
        <main class="desktop-content" ref="reportRef" @scroll="onContentScroll">
          <!-- 頭部 -->
          <header class="desktop-header">
            <router-link to="/" class="btn btn-secondary">
              ← 返回首頁
            </router-link>
            <h1 class="desktop-title">認知評估報告</h1>
            <div class="header-spacer"></div>
          </header>

          <!-- 免責聲明 -->
          <div class="disclaimer-banner mb-6">
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div>
                <p class="font-medium text-amber-800 dark:text-amber-200">重要聲明</p>
                <p class="text-sm text-amber-700 dark:text-amber-300">
                  本系統提供的 MMSE/MoCA/CASI 分數為基於遊戲表現的估算值，僅供參考，
                  不可作為醫療診斷依據。如有認知功能相關疑慮，請諮詢專業醫師或職能治療師進行正式評估。
                </p>
              </div>
            </div>
          </div>

          <!-- 報告內容 -->
          <div class="report-content">
            <!-- 使用者資訊卡片 -->
            <section id="user-info" class="card">
              <div class="flex flex-wrap items-center gap-6">
                <div class="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-4xl">
                  👤
                </div>
                <div class="flex-1 min-w-0">
                  <h2 class="text-2xl font-bold text-[var(--color-text)]">{{ userStore.currentUser?.name }}</h2>
                  <p class="text-[var(--color-text-muted)]">{{ userStore.userAge }} 歲</p>
                  <p v-if="userStore.currentUser?.educationYears !== undefined" class="text-[var(--color-text-muted)] text-sm">
                    教育年數：{{ userStore.currentUser.educationYears }} 年
                  </p>
                  <p class="text-sm text-[var(--color-text-muted)]">
                    報告生成日期：{{ formatDate(new Date()) }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-sm text-[var(--color-text-muted)]">綜合認知指數</div>
                  <div class="text-4xl font-bold" :class="getScoreClass(cognitiveIndex)">
                    {{ cognitiveIndex }}
                  </div>
                  <!-- 與台灣常模比較 -->
                  <div v-if="normativeComparison" class="mt-2">
                    <span 
                      class="text-xs px-2 py-1 rounded-full"
                      :class="normativeComparison.statusClass"
                    >
                      {{ normativeComparison.statusText }}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <!-- 台灣常模參考卡片 -->
            <section v-if="userStore.userAge && userStore.userEducationYears !== null" id="normative" class="card normative-card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <span>📊</span>
                台灣認知功能常模參考
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-[var(--color-surface)] dark:bg-slate-700/50 p-4 rounded-lg">
                  <div class="text-sm text-[var(--color-text-muted)] mb-1">MMSE 參考切截點</div>
                  <div class="text-2xl font-bold text-blue-500 dark:text-blue-400">
                    {{ normativeData?.mmse?.cutoff || '-' }}
                  </div>
                  <div class="text-xs text-[var(--color-text-muted)]">
                    ({{ getAgeGroupLabel() }}，{{ getEducationLabel() }})
                  </div>
                </div>
                <div class="bg-[var(--color-surface)] dark:bg-slate-700/50 p-4 rounded-lg">
                  <div class="text-sm text-[var(--color-text-muted)] mb-1">MoCA 參考切截點</div>
                  <div class="text-2xl font-bold text-purple-500 dark:text-purple-400">
                    {{ normativeData?.moca?.cutoff || '-' }}
                  </div>
                  <div class="text-xs text-[var(--color-text-muted)]">
                    建議 ≥23 分為正常
                  </div>
                </div>
                <div class="bg-[var(--color-surface)] dark:bg-slate-700/50 p-4 rounded-lg">
                  <div class="text-sm text-[var(--color-text-muted)] mb-1">CASI 參考切截點</div>
                  <div class="text-2xl font-bold text-green-500 dark:text-green-400">
                    {{ normativeData?.casi?.cutoff || '-' }}
                  </div>
                  <div class="text-xs text-[var(--color-text-muted)]">
                    分數越高越佳
                  </div>
                </div>
              </div>
              <p class="text-xs text-[var(--color-text-muted)] mt-4">
                ※ 以上數據參考台灣本土研究常模，實際評估請諮詢專業醫療人員
              </p>
            </section>

            <!-- 雷達圖 -->
            <section id="cognitive-analysis" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-6">認知能力分析</h3>
              <div class="flex flex-col md:flex-row gap-8">
                <div class="flex-1">
                  <RadarChart 
                    :scores="gameStore.cognitiveScores" 
                    :previousScores="previousScores"
                  />
                </div>
                <div class="flex-1">
                  <!-- 各維度分數列表 -->
                  <div class="space-y-4">
                    <div v-for="dim in cognitiveDimensions" :key="dim.id" class="flex items-center gap-4">
                      <span class="text-2xl">{{ dim.icon }}</span>
                      <div class="flex-1">
                        <div class="flex justify-between mb-1">
                          <span class="font-medium text-[var(--color-text)]">{{ dim.name }}</span>
                          <span class="font-bold" :style="{ color: dim.color }">
                            {{ gameStore.cognitiveScores[dim.id] }} 分
                          </span>
                        </div>
                        <div class="progress-bar">
                          <div 
                            class="progress-bar-fill"
                            :style="{ 
                              width: `${gameStore.cognitiveScores[dim.id]}%`,
                              backgroundColor: dim.color 
                            }"
                          ></div>
                        </div>
                      </div>
                      <!-- 趨勢指示 -->
                      <span class="text-xl">
                        {{ getTrendIcon(dim.id) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 趨勢圖 -->
            <section id="trends" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-6">歷史趨勢</h3>
              <TrendChart 
                :history="gameStore.scoreHistory" 
                :showWarningLines="true"
                :professionalMode="false"
              />
            </section>

            <!-- 訓練統計 -->
            <section id="statistics" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-6">訓練統計</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="text-center">
                  <div class="text-3xl font-bold text-blue-500 dark:text-blue-400">
                    {{ userStore.currentStats?.totalGamesPlayed || 0 }}
                  </div>
                  <div class="text-[var(--color-text-muted)]">總遊戲次數</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-green-500 dark:text-green-400">
                    {{ userStore.currentStats?.averageScore || 0 }}
                  </div>
                  <div class="text-[var(--color-text-muted)]">平均分數</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-purple-500 dark:text-purple-400">
                    {{ formatPlayTime(userStore.currentStats?.totalPlayTime || 0) }}
                  </div>
                  <div class="text-[var(--color-text-muted)]">總訓練時長</div>
                </div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-orange-500 dark:text-orange-400">
                    {{ userStore.currentStats?.streak || 0 }}
                  </div>
                  <div class="text-[var(--color-text-muted)]">連續訓練天數</div>
                </div>
              </div>
            </section>

            <!-- Mini-Cog 評估記錄 -->
            <section v-if="latestMiniCogResult" id="mini-cog" class="card mini-cog-card">
              <div class="mini-cog-header">
                <h3 class="title-sm">Mini-Cog™ 認知篩檢</h3>
                <span class="mini-cog-date">
                  {{ formatDateTime(latestMiniCogResult.completedAt) }}
                </span>
              </div>
              
              <div class="mini-cog-content">
                <!-- 分數圓圈 -->
                <div class="mini-cog-score-section">
                  <div class="mini-cog-score-circle" :class="getMiniCogScoreClass(latestMiniCogResult.totalScore)">
                    <span class="score-value">{{ latestMiniCogResult.totalScore }}</span>
                    <span class="score-max">/ 5</span>
                  </div>
                  <div class="mini-cog-interpretation" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
                    <span class="interpretation-level">{{ getMiniCogInterpretation(latestMiniCogResult).level }}</span>
                    <p class="interpretation-desc">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</p>
                  </div>
                </div>

                <!-- 分項分數 -->
                <div class="mini-cog-breakdown">
                  <div class="breakdown-item">
                    <span class="breakdown-icon">📝</span>
                    <div class="breakdown-info">
                      <span class="breakdown-label">詞語回憶</span>
                      <span class="breakdown-score">{{ latestMiniCogResult.wordRecall.score }} / 3</span>
                    </div>
                    <div class="breakdown-bar">
                      <div 
                        class="breakdown-fill"
                        :style="{ width: `${(latestMiniCogResult.wordRecall.score / 3) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-icon">🕐</span>
                    <div class="breakdown-info">
                      <span class="breakdown-label">時鐘繪圖</span>
                      <span class="breakdown-score">{{ latestMiniCogResult.clockDrawing.score }} / 2</span>
                    </div>
                    <div class="breakdown-bar">
                      <div 
                        class="breakdown-fill"
                        :style="{ width: `${(latestMiniCogResult.clockDrawing.score / 2) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- MMSE 對應說明 -->
                <div v-if="getMiniCogInterpretation(latestMiniCogResult).mmseCorrespondence" class="mmse-correspondence">
                  <span class="mmse-icon">📊</span>
                  <div class="mmse-info">
                    <span class="mmse-label">MMSE 對照參考</span>
                    <p class="mmse-value">
                      此分數對應 MMSE 約 {{ getMiniCogInterpretation(latestMiniCogResult).mmseCorrespondence }} 分
                    </p>
                    <p class="mmse-note">
                      （MMSE 滿分 30 分，24 分以下建議進一步評估）
                    </p>
                  </div>
                </div>

                <!-- 警示提醒 -->
                <div 
                  v-if="getMiniCogInterpretation(latestMiniCogResult).needsFurtherAssessment" 
                  class="mini-cog-warning"
                >
                  <span class="warning-icon">⚠️</span>
                  <div class="warning-content">
                    <strong>建議事項</strong>
                    <p>{{ latestMiniCogResult.mmseCorrelation }}</p>
                  </div>
                </div>

                <!-- 操作按鈕 -->
                <div class="mini-cog-actions">
                  <router-link to="/assessment" class="btn btn-secondary">
                    重新測驗
                  </router-link>
                  <button 
                    v-if="miniCogHistory.length > 1" 
                    class="btn btn-secondary"
                    @click="showMiniCogHistory = !showMiniCogHistory"
                  >
                    {{ showMiniCogHistory ? '隱藏歷史' : '查看歷史' }}
                  </button>
                </div>
              </div>

              <!-- 歷史記錄展開 -->
              <Transition name="expand">
                <div v-if="showMiniCogHistory && miniCogHistory.length > 1" class="mini-cog-history">
                  <h4 class="history-title">歷史評估記錄</h4>
                  <div class="history-list">
                    <div 
                      v-for="record in miniCogHistory.slice(1)" 
                      :key="record.id"
                      class="history-item"
                    >
                      <div class="history-date">
                        {{ formatDate(new Date(record.completedAt)) }}
                      </div>
                      <div class="history-scores">
                        <span class="history-score" :class="getMiniCogScoreClass(record.totalScore)">
                          總分 {{ record.totalScore }}/5
                        </span>
                        <span class="history-detail">
                          詞語 {{ record.wordRecall.score }}/3 · 時鐘 {{ record.clockDrawing.score }}/2
                        </span>
                      </div>
                      <div class="history-status" :class="getMiniCogInterpretationClass(record)">
                        {{ getMiniCogInterpretation(record).level }}
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </section>

            <!-- 無 Mini-Cog 記錄提示 -->
            <section v-else id="mini-cog" class="card mini-cog-empty">
              <div class="empty-content">
                <span class="empty-icon">🧠</span>
                <h3 class="empty-title">尚無 Mini-Cog™ 評估記錄</h3>
                <p class="empty-description">
                  Mini-Cog 是一個快速的認知篩檢工具，約 3 分鐘即可完成。
                  建議定期進行評估以追蹤認知功能變化。
                </p>
                <router-link to="/assessment" class="btn btn-primary">
                  立即進行評估
                </router-link>
              </div>
            </section>

            <!-- Mini-Cog 與遊戲分數關聯分析 -->
            <section id="correlation" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-2">📐 Mini-Cog 與遊戲表現關聯分析</h3>
              <p class="text-sm text-[var(--color-text-muted)] mb-4">
                此圖表顯示 Mini-Cog 評估分數與遊戲平均表現之間的統計關聯，使用 Pearson 相關係數進行分析。
              </p>
              <MiniCogCorrelationChart 
                :mini-cog-results="miniCogHistory"
                :game-sessions="gameStore.recentSessions"
              />
            </section>

            <!-- 各遊戲表現 -->
            <section id="games" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-6">各遊戲表現</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="game in gameStore.allGames" 
                  :key="game.id"
                  class="p-4 bg-[var(--color-surface-alt)] rounded-lg"
                >
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">{{ game.icon }}</span>
                    <span class="font-medium text-[var(--color-text)]">{{ game.name }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-[var(--color-text-muted)]">最佳成績</span>
                    <span class="font-bold text-[var(--color-text)]">{{ gameStore.getBestScore(game.id) || '-' }} 分</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-[var(--color-text-muted)]">平均分數</span>
                    <span class="text-[var(--color-text-secondary)]">{{ gameStore.getAverageScore(game.id) || '-' }} 分</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-[var(--color-text-muted)]">遊玩次數</span>
                    <span class="text-[var(--color-text-secondary)]">{{ gameStore.getSessionsByGame(game.id).length }} 次</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- 訓練建議 -->
            <section id="suggestions" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-6">訓練建議</h3>
              <div class="space-y-4">
                <div 
                  v-for="(suggestion, index) in trainingSuggestions" 
                  :key="index"
                  class="p-4 rounded-lg"
                  :class="{
                    'bg-red-500/10 dark:bg-red-500/20 border-l-4 border-red-500': suggestion.priority === 'high',
                    'bg-yellow-500/10 dark:bg-yellow-500/20 border-l-4 border-yellow-500': suggestion.priority === 'medium',
                    'bg-green-500/10 dark:bg-green-500/20 border-l-4 border-green-500': suggestion.priority === 'low',
                  }"
                >
                  <div class="flex items-start gap-3">
                    <span class="text-2xl">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }}</span>
                    <div>
                      <div class="font-medium text-[var(--color-text)]">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}</div>
                      <p class="text-[var(--color-text-secondary)] text-sm mt-1">{{ suggestion.message }}</p>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <span 
                          v-for="game in suggestion.suggestedGames" 
                          :key="game"
                          class="text-xs bg-[var(--color-surface)] dark:bg-slate-600 px-2 py-1 rounded text-[var(--color-text)]"
                        >
                          {{ game }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 最近遊戲記錄 -->
            <section id="recent" class="card">
              <h3 class="text-lg font-bold text-[var(--color-text)] mb-6">最近遊戲記錄</h3>
              <div v-if="gameStore.recentSessions.length > 0" class="space-y-2">
                <div 
                  v-for="session in gameStore.recentSessions" 
                  :key="session.id"
                  class="flex items-center justify-between p-3 bg-[var(--color-surface-alt)] rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{{ getGameIcon(session.gameId) }}</span>
                    <div>
                      <div class="font-medium text-[var(--color-text)]">{{ getGameName(session.gameId) }}</div>
                      <div class="text-sm text-[var(--color-text-muted)]">
                        {{ formatDateTime(session.createdAt) }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold" :class="getScoreClass(session.result.score)">
                      {{ session.result.score }} 分
                    </div>
                    <span 
                      class="difficulty-badge text-xs"
                      :class="`difficulty-${session.difficulty}`"
                    >
                      {{ DIFFICULTIES[session.difficulty].name }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-[var(--color-text-muted)]">
                尚無遊戲記錄
              </div>
            </section>
          </div>
        </main>
      </div>
    </template>
  </ResponsiveContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore, useGameStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, emptyCognitiveScores, type CognitiveDimensionInfo } from '@/types/cognitive'
import { DIFFICULTIES } from '@/types/game'
import { 
  calculateCognitiveIndex, 
  generateTrainingSuggestions
} from '@/services/scoreCalculator'
import { 
  getQuickReferenceCutoffs,
  getRiskLevel as getNormativeRiskLevel
} from '@/services/taiwanNormativeData'
import { getUserMiniCogResults, getLatestMiniCogResult } from '@/services/db'
import { 
  type MiniCogResult, 
  getRiskLevelDescription,
  calculateMiniCogTotal 
} from '@/services/miniCogService'
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import MiniCogCorrelationChart from '@/components/charts/MiniCogCorrelationChart.vue'
import { ResponsiveContainer } from '@/components/layout'

const userStore = useUserStore()
const gameStore = useGameStore()

// 狀態
const reportRef = ref<HTMLElement | null>(null)
const isGenerating = ref(false)
const activeSection = ref('user-info')

// Mini-Cog 相關狀態
const latestMiniCogResult = ref<MiniCogResult | null>(null)
const miniCogHistory = ref<MiniCogResult[]>([])
const showMiniCogHistory = ref(false)

// 報告區塊定義（用於桌面版側邊導覽）
const reportSections = [
  { id: 'user-info', name: '基本資訊', icon: '👤' },
  { id: 'normative', name: '常模參考', icon: '📊' },
  { id: 'cognitive-analysis', name: '認知分析', icon: '🧠' },
  { id: 'trends', name: '歷史趨勢', icon: '📈' },
  { id: 'statistics', name: '訓練統計', icon: '📋' },
  { id: 'mini-cog', name: 'Mini-Cog', icon: '🧪' },
  { id: 'correlation', name: '關聯分析', icon: '📐' },
  { id: 'games', name: '遊戲表現', icon: '🎮' },
  { id: 'suggestions', name: '訓練建議', icon: '💡' },
  { id: 'recent', name: '最近記錄', icon: '🕐' },
]

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS) as CognitiveDimensionInfo[]

// 綜合認知指數
const cognitiveIndex = computed(() => 
  calculateCognitiveIndex(gameStore.cognitiveScores)
)

// 上週分數（用於比較）
const previousScores = computed(() => {
  const trends = gameStore.getWeeklyTrends()
  const scores = emptyCognitiveScores()
  trends.forEach((t: { dimension: keyof typeof scores; previousScore: number }) => {
    scores[t.dimension] = t.previousScore
  })
  return scores
})

// 訓練建議
const trainingSuggestions = computed(() => 
  generateTrainingSuggestions(gameStore.cognitiveScores)
)

// 台灣常模數據
const normativeData = computed(() => {
  const age = userStore.userAge
  const eduYears = userStore.userEducationYears
  if (!age || eduYears === null) return null
  
  const cutoffs = getQuickReferenceCutoffs(age, eduYears)
  return {
    mmse: { cutoff: cutoffs.MMSE.dementia },
    moca: { cutoff: cutoffs.MoCA.dementia },
    casi: { cutoff: cutoffs.CASI.dementia }
  }
})

// 與常模比較結果
const normativeComparison = computed(() => {
  const age = userStore.userAge
  const eduYears = userStore.userEducationYears
  if (!age || eduYears === null) return null
  
  // 使用遊戲分數估算的 MMSE 分數（綜合指數 * 30 / 100）
  const estimatedMMSE = Math.round(cognitiveIndex.value * 30 / 100)
  const riskLevel = getNormativeRiskLevel(estimatedMMSE, 'MMSE', age, eduYears)
  
  const statusMap: Record<string, { statusText: string; statusClass: string }> = {
    'normal': { statusText: '表現良好 ✓', statusClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    'warning': { statusText: '邊緣值 ⚠', statusClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    'mci': { statusText: '需注意 ⚠', statusClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    'dementia': { statusText: '建議諮詢專業 ⚠', statusClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }
  
  return statusMap[riskLevel] || statusMap['normal']
})

// 年齡分組標籤
function getAgeGroupLabel(): string {
  const age = userStore.userAge
  if (!age) return ''
  if (age < 50) return '40-49歲'
  if (age < 60) return '50-59歲'
  if (age < 70) return '60-69歲'
  if (age < 80) return '70-79歲'
  return '80歲以上'
}

// 教育程度標籤
function getEducationLabel(): string {
  const eduYears = userStore.userEducationYears
  if (eduYears === null) return ''
  return eduYears <= 6 ? '低教育程度' : '高教育程度'
}

// 格式化日期
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// 格式化日期時間
function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分鐘`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}小時${mins}分`
}

// 取得分數顏色
function getScoreClass(score: number): string {
  if (score >= 80) return 'text-green-500 dark:text-green-400'
  if (score >= 50) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

// 取得分數等級樣式（手機版用）
function getScoreLevel(score: number): string {
  if (score >= 80) return 'score-good'
  if (score >= 50) return 'score-moderate'
  return 'score-concern'
}

// 滾動到指定區塊（桌面版側邊導覽）
function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSection.value = sectionId
  }
}

// 內容滾動時更新活動區塊
function onContentScroll(event: Event): void {
  const container = event.target as HTMLElement
  const sections = reportSections.map(s => document.getElementById(s.id)).filter(Boolean)
  
  for (const section of sections) {
    if (section) {
      const rect = section.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      if (rect.top >= containerRect.top && rect.top < containerRect.top + 200) {
        activeSection.value = section.id
        break
      }
    }
  }
}

// 取得趨勢圖示
function getTrendIcon(dimension: string): string {
  const trends = gameStore.getWeeklyTrends()
  const trend = trends.find((t: { dimension: string }) => t.dimension === dimension)
  if (!trend) return '➖'
  if (trend.trend === 'improving') return '📈'
  if (trend.trend === 'declining') return '📉'
  return '➖'
}

// 取得遊戲圖示
function getGameIcon(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.icon || '🎮'
}

// 取得遊戲名稱
function getGameName(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.name || gameId
}

// Mini-Cog 相關函數
function getMiniCogScoreClass(score: number): string {
  if (score >= 4) return 'score-good'
  if (score >= 3) return 'score-moderate'
  return 'score-concern'
}

function getMiniCogInterpretationClass(result: MiniCogResult): string {
  const { riskLevel } = calculateMiniCogTotal(
    result.wordRecall.score,
    result.clockDrawing.score
  )
  if (riskLevel === 'normal') return 'interpretation-normal'
  if (riskLevel === 'borderline') return 'interpretation-borderline'
  return 'interpretation-warning'
}

function getMiniCogInterpretation(result: MiniCogResult): {
  level: string
  description: string
  needsFurtherAssessment: boolean
  recommendation: string
  mmseCorrespondence: string | null
} {
  const { totalScore, riskLevel } = calculateMiniCogTotal(
    result.wordRecall.score,
    result.clockDrawing.score
  )
  const riskInfo = getRiskLevelDescription(riskLevel)
  
  return {
    level: riskInfo.label,
    description: riskInfo.description,
    needsFurtherAssessment: riskLevel === 'at-risk',
    recommendation: result.mmseCorrelation,
    mmseCorrespondence: totalScore <= 2 ? '≤24' : (totalScore === 3 ? '~24-26' : null)
  }
}

async function loadMiniCogData(): Promise<void> {
  if (!userStore.currentUser?.id) return
  
  try {
    const odId = userStore.currentUser.id
    latestMiniCogResult.value = await getLatestMiniCogResult(odId) || null
    miniCogHistory.value = await getUserMiniCogResults(odId)
  } catch (error) {
    console.error('Failed to load Mini-Cog data:', error)
  }
}

// 生命週期
onMounted(() => {
  loadMiniCogData()
})

// 下載報告
async function downloadReport(): Promise<void> {
  isGenerating.value = true
  
  try {
    // 使用新的 PDF 服務
    const { 
      generateCognitiveReport, 
      downloadPdf, 
      formatBehaviorSummary 
    } = await import('@/services/pdfService')
    const { analyzeBehavior } = await import('@/services/behaviorAnalysisService')
    
    // 準備使用者資訊
    const userInfo = {
      name: userStore.currentUser?.name || '未知',
      age: userStore.userAge || 0,
      educationYears: userStore.currentUser?.educationYears || 0,
      reportDate: new Date().toISOString().split('T')[0] || ''
    }
    
    // 準備 Mini-Cog 資料
    let miniCogReportData = null
    if (latestMiniCogResult.value) {
      const selfAssess = latestMiniCogResult.value.clockDrawing.selfAssessment
      // 計算自評分數：完整圓形(1分) + 正確數字(1分) + 正確指針(1分) = 最高 3 分
      const selfAssessScore = selfAssess 
        ? (selfAssess.hasCompleteCircle ? 1 : 0) + 
          (selfAssess.hasCorrectNumbers ? 1 : 0) + 
          (selfAssess.hasCorrectHands ? 1 : 0)
        : 0
      miniCogReportData = {
        totalScore: latestMiniCogResult.value.totalScore,
        wordRecallScore: latestMiniCogResult.value.wordRecall.score,
        clockDrawingScore: latestMiniCogResult.value.clockDrawing.score,
        clockSelfAssessment: selfAssessScore,
        atRisk: latestMiniCogResult.value.atRisk,
        duration: latestMiniCogResult.value.duration,
        completedAt: latestMiniCogResult.value.completedAt,
        clockImageData: latestMiniCogResult.value.clockDrawing.imageData,
        wordsUsed: latestMiniCogResult.value.wordRecall.wordSet?.words
      }
    }
    
    // 準備認知分數資料
    const cognitiveScoreData = {
      memory: gameStore.cognitiveScores.memory || 0,
      attention: gameStore.cognitiveScores.attention || 0,
      processing: gameStore.cognitiveScores.cognition || 0,  // 對應到 cognition
      executive: gameStore.cognitiveScores.logic || 0,       // 對應到 logic
      language: gameStore.cognitiveScores.coordination || 0  // 對應到 coordination
    }
    
    // 準備趨勢資料
    const trendData = gameStore.scoreHistory.slice(-20).map((h) => {
      // 計算總分（各維度平均）
      const dims = Object.values(h.scores).filter(v => v > 0)
      const avgScore = dims.length > 0 
        ? dims.reduce((a, b) => a + b, 0) / dims.length 
        : 0
      return {
        date: h.date,
        score: Math.round(avgScore),
        gameType: undefined
      }
    })
    
    // 嘗試獲取行為分析資料
    let behaviorSummary = null
    if (gameStore.recentSessions.length > 0) {
      try {
        const latestSession = gameStore.recentSessions[0]
        if (latestSession?.id) {
          const analysis = await analyzeBehavior(latestSession.id)
          behaviorSummary = formatBehaviorSummary(analysis)
        }
      } catch {
        // 行為分析失敗，繼續生成報告
        console.warn('行為分析獲取失敗')
      }
    }
    
    // 生成 PDF
    const pdfBlob = await generateCognitiveReport(
      userInfo,
      miniCogReportData,
      cognitiveScoreData,
      trendData,
      behaviorSummary,
      {
        includeClockDrawing: true,
        includeTrends: true,
        includeBehavior: true,
        includeRecommendations: true,
        language: 'bilingual'
      }
    )
    
    // 下載 PDF
    const filename = `認知評估報告_${userStore.currentUser?.name}_${new Date().toISOString().split('T')[0]}.pdf`
    downloadPdf(pdfBlob, filename)
    
  } catch (error) {
    console.error('PDF 生成失敗:', error)
    alert('報告生成失敗，請稍後再試')
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
/* ======================= */
/* 報告頁面整體佈局 */
/* ======================= */
.report-view {
  min-height: 100vh;
  background: var(--color-bg);
}

/* ======================= */
/* 手機版 APP 風格佈局 */
/* ======================= */
.mobile-report {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 4rem; /* 為底部導覽留空間 */
}

.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.mobile-header .back-btn,
.mobile-header .action-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-surface-alt);
  color: var(--color-text);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.mobile-header .back-btn:hover,
.mobile-header .action-btn:hover {
  background: var(--color-primary);
  color: white;
}

.mobile-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.mobile-content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

/* 手機版摘要卡片 */
.mobile-summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #4338ca));
  border-radius: 1rem;
  color: white;
}

.mobile-summary-card .user-avatar {
  font-size: 2.5rem;
  width: 3.5rem;
  height: 3.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-summary-card .user-info {
  flex: 1;
}

.mobile-summary-card .user-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.mobile-summary-card .user-age {
  font-size: 0.875rem;
  opacity: 0.9;
  margin: 0;
}

.mobile-summary-card .score-badge {
  text-align: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
}

.mobile-summary-card .score-value {
  font-size: 2rem;
  font-weight: 700;
  display: block;
}

.mobile-summary-card .score-label {
  font-size: 0.75rem;
  opacity: 0.9;
}

/* 手機版通用卡片 */
.mobile-card {
  background: var(--color-surface);
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mobile-card .card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem;
}

/* 維度滑動區域 */
.dimension-swiper {
  margin: 0 -1rem;
  padding: 0 1rem;
}

.swiper-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  padding: 0 1rem;
}

.swiper-container {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 0.5rem 1rem;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.swiper-container::-webkit-scrollbar {
  display: none;
}

.dimension-card {
  flex-shrink: 0;
  width: 100px;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border-left: 3px solid;
  text-align: center;
  scroll-snap-align: start;
}

.dimension-card .dim-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.dimension-card .dim-name {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: block;
}

.dimension-card .dim-score {
  font-size: 1.5rem;
  font-weight: 700;
  display: block;
}

.dimension-card .dim-trend {
  font-size: 1rem;
}

/* 手機版統計卡片 */
.mobile-stats-card {
  background: var(--color-surface);
  border-radius: 1rem;
  padding: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  display: block;
}

.stat-item .stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* 手機版 Mini-Cog */
.mini-cog-mobile .mini-cog-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.mini-cog-mobile .mini-cog-score-ring {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
}

.mini-cog-mobile .mini-cog-score-ring.score-good {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.mini-cog-mobile .mini-cog-score-ring.score-moderate {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.mini-cog-mobile .mini-cog-score-ring.score-concern {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.mini-cog-mobile .mini-cog-detail .interpretation {
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.mini-cog-mobile .mini-cog-detail .date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.mini-cog-empty-mobile {
  text-align: center;
  padding: 2rem 1rem;
}

.mini-cog-empty-mobile .empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.mini-cog-empty-mobile h3 {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0 0 0.25rem;
}

.mini-cog-empty-mobile p {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0 0 1rem;
}

/* 訓練建議列表 */
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.suggestion-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
}

.suggestion-item.priority-high {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
}

.suggestion-item.priority-medium {
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
}

.suggestion-item.priority-low {
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid #22c55e;
}

.suggestion-item .suggestion-icon {
  font-size: 1.25rem;
}

.suggestion-item .suggestion-content strong {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text);
}

.suggestion-item .suggestion-content p {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

/* 手機版免責聲明 */
.mobile-disclaimer {
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 手機版底部導覽 */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 0.75rem 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;
}

.mobile-bottom-nav .nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.2s;
}

.mobile-bottom-nav .nav-item:hover,
.mobile-bottom-nav .nav-item.router-link-active {
  color: var(--color-primary);
}

.mobile-bottom-nav .nav-icon {
  font-size: 1.25rem;
}

.mobile-bottom-nav .nav-label {
  font-size: 0.625rem;
}

/* ======================= */
/* 桌面版專業儀表板佈局 */
/* ======================= */
.desktop-report {
  display: flex;
  min-height: 100vh;
}

.desktop-sidebar {
  width: 240px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  margin-bottom: 0.25rem;
}

.sidebar-link:hover {
  background: var(--color-surface-alt);
  color: var(--color-text);
}

.sidebar-link.active {
  background: var(--color-primary);
  color: white;
}

.sidebar-link .link-icon {
  font-size: 1.125rem;
}

.sidebar-link .link-text {
  font-size: 0.875rem;
}

.sidebar-actions {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.desktop-content {
  flex: 1;
  overflow-y: auto;
  height: 100vh;
}

.desktop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.desktop-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.header-spacer {
  width: 100px; /* 與左側按鈕對稱 */
}

.report-content {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ======================= */
/* 共用樣式 */
/* ======================= */
.btn-block {
  width: 100%;
  text-align: center;
}

/* 分數等級樣式 */
.score-badge.score-good {
  background: rgba(34, 197, 94, 0.2);
}

.score-badge.score-moderate {
  background: rgba(245, 158, 11, 0.2);
}

.score-badge.score-concern {
  background: rgba(239, 68, 68, 0.2);
}

/* ======================= */
/* 原有樣式 */
/* ======================= */
.disclaimer-banner {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 1rem;
}

:root.dark .disclaimer-banner {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2));
  border-color: rgba(245, 158, 11, 0.5);
}

.normative-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(79, 70, 229, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.2);
}

:root.dark .normative-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.15));
  border-color: rgba(99, 102, 241, 0.3);
}

/* Mini-Cog Card Styles */
.mini-cog-card {
  border: 2px solid #4f46e5;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
}

:root.dark .mini-cog-card {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.15) 100%);
  border-color: rgba(139, 92, 246, 0.5);
}

.mini-cog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9d5ff;
}

:root.dark .mini-cog-header {
  border-bottom-color: rgba(139, 92, 246, 0.3);
}

.mini-cog-date {
  font-size: 0.875rem;
  color: #7c3aed;
}

:root.dark .mini-cog-date {
  color: #a78bfa;
}

.mini-cog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.mini-cog-score-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.mini-cog-score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.mini-cog-score-circle.score-good {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.mini-cog-score-circle.score-moderate {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.mini-cog-score-circle.score-concern {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.mini-cog-score-circle .score-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.mini-cog-score-circle .score-max {
  font-size: 0.875rem;
  opacity: 0.9;
}

.mini-cog-interpretation {
  padding: 1rem;
  border-radius: 0.75rem;
  flex: 1;
}

.mini-cog-interpretation.interpretation-normal {
  background: rgba(34, 197, 94, 0.1);
  border-left: 4px solid #22c55e;
}

.mini-cog-interpretation.interpretation-borderline {
  background: rgba(245, 158, 11, 0.1);
  border-left: 4px solid #f59e0b;
}

.mini-cog-interpretation.interpretation-warning {
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid #ef4444;
}

.interpretation-level {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.interpretation-desc {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.mini-cog-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.breakdown-icon {
  font-size: 1.5rem;
}

.breakdown-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-label {
  font-weight: 500;
  color: var(--color-text);
}

.breakdown-score {
  font-weight: 600;
  color: #4f46e5;
}

:root.dark .breakdown-score {
  color: #a78bfa;
}

.breakdown-bar {
  height: 8px;
  background: var(--color-surface-alt);
  border-radius: 4px;
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.mmse-correspondence {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(14, 165, 233, 0.1);
  border-radius: 0.75rem;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.mmse-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.mmse-info {
  flex: 1;
}

.mmse-label {
  font-weight: 600;
  color: #0369a1;
  display: block;
  margin-bottom: 0.25rem;
}

:root.dark .mmse-label {
  color: #38bdf8;
}

.mmse-value {
  margin: 0;
  color: var(--color-text-secondary);
}

.mmse-note {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.mini-cog-warning {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 0.75rem;
  border-left: 4px solid #ef4444;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-content strong {
  color: #dc2626;
  display: block;
  margin-bottom: 0.25rem;
}

:root.dark .warning-content strong {
  color: #f87171;
}

.warning-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.mini-cog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  padding-top: 1rem;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.mini-cog-history {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.history-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.history-date {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  min-width: 100px;
}

.history-scores {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.history-score {
  font-weight: 600;
}

.history-score.score-good { color: #16a34a; }
.history-score.score-moderate { color: #d97706; }
.history-score.score-concern { color: #dc2626; }

:root.dark .history-score.score-good { color: #4ade80; }
:root.dark .history-score.score-moderate { color: #fbbf24; }
:root.dark .history-score.score-concern { color: #f87171; }

.history-detail {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.history-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.history-status.interpretation-normal {
  background: rgba(34, 197, 94, 0.15);
  color: #166534;
}

.history-status.interpretation-borderline {
  background: rgba(245, 158, 11, 0.15);
  color: #92400e;
}

.history-status.interpretation-warning {
  background: rgba(239, 68, 68, 0.15);
  color: #991b1b;
}

:root.dark .history-status.interpretation-normal {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

:root.dark .history-status.interpretation-borderline {
  background: rgba(245, 158, 11, 0.2);
  color: #fde047;
}

:root.dark .history-status.interpretation-warning {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* Mini-Cog Empty State */
.mini-cog-empty {
  border: 2px dashed rgba(99, 102, 241, 0.3);
  background: linear-gradient(135deg, rgba(238, 242, 255, 0.5) 0%, rgba(224, 231, 255, 0.5) 100%);
}

:root.dark .mini-cog-empty {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%);
}

.empty-content {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-description {
  color: var(--color-text-muted);
  max-width: 400px;
  margin: 0 auto 1.5rem;
}

/* Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Responsive */
@media (max-width: 640px) {
  .mini-cog-score-section {
    flex-direction: column;
    text-align: center;
  }

  .mini-cog-actions {
    flex-direction: column;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .history-date {
    min-width: auto;
  }
}
</style>

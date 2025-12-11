<template>
  <div class="h-full flex flex-col bg-[var(--color-bg)]">
    <div v-if="isMobile" class="flex flex-col min-h-screen pb-20">
      <div class="flex justify-between items-center p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-30">
        <h2 class="text-lg font-bold text-[var(--color-text)]">認知評估報告</h2>
        <button 
          @click="downloadReport" 
          class="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text)] border border-[var(--color-border)] active:scale-95 transition-transform" 
          :disabled="isGenerating"
        >
          <span class="text-xl">{{ isGenerating ? '⏳' : '📥' }}</span>
        </button>
      </div>

      <main class="flex-1 p-4 space-y-4 overflow-y-auto">
        <section class="flex items-center gap-4 p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
          <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl backdrop-blur-sm">👤</div>
          <div class="flex-1">
            <h2 class="text-xl font-bold m-0">{{ userStore.currentUser?.name || '使用者' }}</h2>
            <p class="text-sm opacity-90">{{ userStore.userAge || '?' }} 歲</p>
          </div>
          <div 
            class="px-4 py-2 rounded-xl backdrop-blur-sm text-center min-w-[80px]"
            :class="getScoreLevelBg(cognitiveIndex)"
          >
            <span class="text-2xl font-bold block">{{ cognitiveIndex }}</span>
            <span class="text-xs opacity-90">綜合指數</span>
          </div>
        </section>

        <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">🧠 認知能力</h3>
          <div class="h-64">
            <RadarChart 
              :scores="gameStore.cognitiveScores" 
              :previousScores="previousScores"
            />
          </div>
        </section>

        <section class="-mx-4 px-4 overflow-x-auto scroll-smooth no-scrollbar">
          <div class="flex gap-3 pb-2 w-max">
            <div 
              v-for="dim in cognitiveDimensions" 
              :key="dim.id" 
              class="flex-shrink-0 w-28 p-3 rounded-xl bg-[var(--color-surface)] border-2 flex flex-col items-center justify-center gap-1 shadow-sm"
              :style="{ borderColor: dim.color }"
            >
              <span class="text-2xl mb-1">{{ dim.icon }}</span>
              <span class="text-xs text-[var(--color-text-secondary)]">{{ dim.name }}</span>
              <span class="text-xl font-bold" :style="{ color: dim.color }">
                {{ gameStore.cognitiveScores[dim.id] }}
              </span>
              <span class="text-sm">{{ getTrendIcon(dim.id) }}</span>
            </div>
          </div>
        </section>

        <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">📊 訓練統計</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="block text-xl font-bold text-blue-500">{{ userStore.currentStats?.totalGamesPlayed || 0 }}</span>
              <span class="text-xs text-[var(--color-text-secondary)]">次數</span>
            </div>
            <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="block text-xl font-bold text-green-500">{{ userStore.currentStats?.averageScore || 0 }}</span>
              <span class="text-xs text-[var(--color-text-secondary)]">均分</span>
            </div>
            <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="block text-xl font-bold text-purple-500">{{ formatPlayTime(userStore.currentStats?.totalPlayTime || 0) }}</span>
              <span class="text-xs text-[var(--color-text-secondary)]">時長</span>
            </div>
            <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="block text-xl font-bold text-orange-500">{{ userStore.currentStats?.streak || 0 }}</span>
              <span class="text-xs text-[var(--color-text-secondary)]">連續</span>
            </div>
          </div>
        </section>

        <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">📈 歷史趨勢</h3>
          <div class="h-48">
            <TrendChart 
              :history="gameStore.scoreHistory" 
              :showWarningLines="true"
              :professionalMode="false"
            />
          </div>
        </section>

        <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">💡 訓練建議</h3>
          <div class="space-y-3">
            <div 
              v-for="(suggestion, index) in trainingSuggestions.slice(0, 3)" 
              :key="index"
              class="flex gap-3 p-3 rounded-lg bg-[var(--color-surface-alt)] border-l-4"
              :class="{
                'border-red-500': suggestion.priority === 'high',
                'border-yellow-500': suggestion.priority === 'medium',
                'border-green-500': suggestion.priority === 'low',
              }"
            >
              <span class="text-xl">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }}</span>
              <div>
                <strong class="text-sm block text-[var(--color-text)]">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}</strong>
                <p class="text-xs text-[var(--color-text-secondary)] mt-0.5">{{ suggestion.message }}</p>
              </div>
            </div>
          </div>
        </section>

        <div class="h-8"></div>
      </main>
    </div>

    <div v-else class="max-w-7xl mx-auto w-full p-6 grid grid-cols-[240px_1fr] gap-6 items-start">
      <aside class="sticky top-6 space-y-4">
        <nav class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          <a 
            v-for="section in reportSections" 
            :key="section.id"
            :href="`#${section.id}`"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]"
            :class="{ 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)] hover:text-white': activeSection === section.id }"
            @click.prevent="scrollToSection(section.id)"
          >
            <span class="text-lg">{{ section.icon }}</span>
            <span class="text-sm font-medium">{{ section.name }}</span>
          </a>
        </nav>
        
        <div class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-4 space-y-2">
          <button 
            @click="downloadReport" 
            class="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5" 
            :disabled="isGenerating"
          >
            {{ isGenerating ? '生成中...' : '📥 下載 PDF' }}
          </button>
          <router-link to="/weekly-report" class="btn btn-secondary w-full text-center block py-2.5">
            📅 查看週報
          </router-link>
        </div>
      </aside>

      <main class="space-y-6" ref="reportRef" @scroll="onContentScroll">
        <div class="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex gap-3 items-start">
          <span class="text-2xl">⚠️</span>
          <div>
            <p class="font-bold text-amber-800 dark:text-amber-200">重要聲明</p>
            <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
              本報告數據基於遊戲表現估算，不可作為醫療診斷依據。如有疑慮請諮詢專業醫師。
            </p>
          </div>
        </div>

        <section id="user-info" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <div class="flex items-center gap-6">
            <div class="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-4xl">
              👤
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold mb-1 text-[var(--color-text)]">{{ userStore.currentUser?.name }} 的評估報告</h1>
              <p class="text-[var(--color-text-secondary)]">
                {{ userStore.userAge }} 歲 • 教育：{{ userStore.currentUser?.educationYears || 0 }} 年
              </p>
              <p class="text-sm text-[var(--color-text-muted)] mt-1">
                生成日期：{{ formatDate(new Date()) }}
              </p>
            </div>
            <div class="text-right bg-[var(--color-bg-soft)] px-6 py-3 rounded-xl border border-[var(--color-border)]">
              <div class="text-sm text-[var(--color-text-secondary)] mb-1">綜合指數</div>
              <div class="text-4xl font-bold" :class="getScoreClass(cognitiveIndex)">
                {{ cognitiveIndex }}
              </div>
              <div v-if="normativeComparison" class="mt-2 text-xs px-2 py-1 rounded-full inline-block" :class="normativeComparison.statusClass">
                {{ normativeComparison.statusText }}
              </div>
            </div>
          </div>
        </section>

        <section v-if="normativeData" id="normative" class="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800 p-6 shadow-sm">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">
            📊 台灣認知功能常模參考
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
              <div class="text-sm text-[var(--color-text-muted)] mb-1">MMSE 切截點</div>
              <div class="text-2xl font-bold text-blue-500">{{ normativeData.mmse.cutoff || '-' }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">{{ getAgeGroupLabel() }}，{{ getEducationLabel() }}</div>
            </div>
            <div class="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
              <div class="text-sm text-[var(--color-text-muted)] mb-1">MoCA 切截點</div>
              <div class="text-2xl font-bold text-purple-500">{{ normativeData.moca.cutoff || '-' }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">建議 ≥23 分為正常</div>
            </div>
            <div class="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
              <div class="text-sm text-[var(--color-text-muted)] mb-1">CASI 切截點</div>
              <div class="text-2xl font-bold text-green-500">{{ normativeData.casi.cutoff || '-' }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">分數越高越佳</div>
            </div>
          </div>
        </section>

        <section id="cognitive-analysis" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">🧠 認知能力分析</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div class="h-80">
              <RadarChart 
                :scores="gameStore.cognitiveScores" 
                :previousScores="previousScores"
              />
            </div>
            <div class="space-y-5">
              <div v-for="dim in cognitiveDimensions" :key="dim.id" class="flex items-center gap-4">
                <span class="text-2xl w-8 text-center">{{ dim.icon }}</span>
                <div class="flex-1">
                  <div class="flex justify-between mb-2">
                    <span class="font-medium text-[var(--color-text)]">{{ dim.name }}</span>
                    <span class="font-bold" :style="{ color: dim.color }">{{ gameStore.cognitiveScores[dim.id] }}</span>
                  </div>
                  <div class="h-2.5 bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-1000 ease-out"
                      :style="{ width: `${gameStore.cognitiveScores[dim.id]}%`, backgroundColor: dim.color }"
                    ></div>
                  </div>
                </div>
                <span class="text-xl w-6">{{ getTrendIcon(dim.id) }}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="trends" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">📈 歷史趨勢</h3>
          <div class="h-64">
             <TrendChart 
                :history="gameStore.scoreHistory" 
                :showWarningLines="true"
                :professionalMode="false"
              />
          </div>
        </section>

        <section id="statistics" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">📋 訓練統計</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center p-4 bg-[var(--color-bg-soft)] rounded-xl">
              <div class="text-3xl font-bold text-blue-500 mb-1">{{ userStore.currentStats?.totalGamesPlayed || 0 }}</div>
              <div class="text-sm text-[var(--color-text-secondary)]">總遊戲次數</div>
            </div>
            <div class="text-center p-4 bg-[var(--color-bg-soft)] rounded-xl">
              <div class="text-3xl font-bold text-green-500 mb-1">{{ userStore.currentStats?.averageScore || 0 }}</div>
              <div class="text-sm text-[var(--color-text-secondary)]">平均分數</div>
            </div>
            <div class="text-center p-4 bg-[var(--color-bg-soft)] rounded-xl">
              <div class="text-3xl font-bold text-purple-500 mb-1">{{ formatPlayTime(userStore.currentStats?.totalPlayTime || 0) }}</div>
              <div class="text-sm text-[var(--color-text-secondary)]">總訓練時長</div>
            </div>
            <div class="text-center p-4 bg-[var(--color-bg-soft)] rounded-xl">
              <div class="text-3xl font-bold text-orange-500 mb-1">{{ userStore.currentStats?.streak || 0 }}</div>
              <div class="text-sm text-[var(--color-text-secondary)]">連續天數</div>
            </div>
          </div>
        </section>

        <section id="mini-cog" class="bg-[var(--color-surface)] rounded-xl border-2 border-indigo-100 dark:border-indigo-900 shadow-sm p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div class="flex justify-between items-center mb-6 relative">
            <h3 class="text-lg font-bold mb-0 flex items-center gap-2 text-[var(--color-text)]">🧪 Mini-Cog™ 篩檢</h3>
            <span v-if="latestMiniCogResult" class="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {{ formatDateTime(latestMiniCogResult.completedAt) }}
            </span>
          </div>

          <div v-if="latestMiniCogResult" class="flex flex-col gap-6 relative">
            <div class="flex flex-col md:flex-row gap-6">
              <div class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 rounded-full w-40 h-40 border-4 shrink-0 shadow-lg mx-auto md:mx-0"
                   :class="getMiniCogBorderClass(latestMiniCogResult.totalScore)">
                <div class="text-5xl font-bold mb-1 leading-none" :class="getMiniCogScoreClass(latestMiniCogResult.totalScore)">
                  {{ latestMiniCogResult.totalScore }}
                </div>
                <div class="text-sm text-[var(--color-text-muted)]">總分 / 5</div>
              </div>

              <div class="flex-1 space-y-4">
                <div class="p-4 rounded-lg border-l-4" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
                  <strong class="block text-lg mb-1">{{ getMiniCogInterpretation(latestMiniCogResult).label }}</strong>
                  <p class="text-sm opacity-90">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="p-3 bg-[var(--color-surface-alt)] rounded-lg">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm text-[var(--color-text-secondary)]">📝 詞語回憶</span>
                      <span class="font-bold text-indigo-600">{{ latestMiniCogResult.wordRecall.score }}/3</span>
                    </div>
                    <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-indigo-500" :style="{ width: `${(latestMiniCogResult.wordRecall.score/3)*100}%` }"></div>
                    </div>
                  </div>
                  <div class="p-3 bg-[var(--color-surface-alt)] rounded-lg">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm text-[var(--color-text-secondary)]">🕐 時鐘繪圖</span>
                      <span class="font-bold text-indigo-600">{{ latestMiniCogResult.clockDrawing.score }}/2</span>
                    </div>
                    <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-indigo-500" :style="{ width: `${(latestMiniCogResult.clockDrawing.score/2)*100}%` }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex gap-3 justify-end pt-4 border-t border-[var(--color-border)]">
              <router-link to="/assessment" class="btn btn-secondary btn-sm">重新測驗</router-link>
              <button 
                v-if="miniCogHistory.length > 1" 
                class="btn btn-ghost btn-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                @click="showMiniCogHistory = !showMiniCogHistory"
              >
                {{ showMiniCogHistory ? '隱藏歷史' : '查看歷史' }}
              </button>
            </div>

            <Transition name="expand">
              <div v-if="showMiniCogHistory" class="space-y-2 pt-2">
                <div 
                  v-for="record in miniCogHistory.slice(1)" 
                  :key="record.id"
                  class="flex items-center justify-between p-3 bg-[var(--color-bg-soft)] rounded-lg text-sm"
                >
                  <span class="text-[var(--color-text-muted)]">{{ formatDateTime(record.completedAt) }}</span>
                  <div class="flex gap-3">
                    <span :class="getMiniCogScoreClass(record.totalScore)" class="font-bold">總分 {{ record.totalScore }}</span>
                    <span class="text-[var(--color-text-secondary)]">({{ record.wordRecall.score }}/{{ record.clockDrawing.score }})</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <div v-else class="text-center py-10 bg-[var(--color-bg-soft)] rounded-xl border border-dashed border-[var(--color-border)]">
             <span class="text-4xl block mb-2">📋</span>
             <p class="mb-4 text-[var(--color-text-secondary)]">尚無評估記錄，建議定期檢測</p>
             <router-link to="/assessment" class="btn btn-primary btn-sm">立即開始評估</router-link>
          </div>
        </section>

        <section id="correlation" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-2 flex items-center gap-2 text-[var(--color-text)]">📐 關聯分析</h3>
          <p class="text-sm text-[var(--color-text-muted)] mb-4">Mini-Cog 評估分數與遊戲表現的相關性分析。</p>
          <MiniCogCorrelationChart 
            :mini-cog-results="miniCogHistory"
            :game-sessions="gameStore.recentSessions"
          />
        </section>

        <section id="games" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-6 text-[var(--color-text)]">🎮 各遊戲表現</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="game in gameStore.allGames" 
              :key="game.id"
              class="p-4 bg-[var(--color-surface-alt)] rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors"
            >
              <div class="flex items-center gap-3 mb-3">
                <span class="text-2xl">{{ game.icon }}</span>
                <span class="font-medium text-[var(--color-text)]">{{ game.name }}</span>
              </div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-[var(--color-text-muted)]">最佳成績</span>
                  <span class="font-bold text-[var(--color-text)]">{{ gameStore.getBestScore(game.id) || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[var(--color-text-muted)]">平均分數</span>
                  <span class="text-[var(--color-text)]">{{ gameStore.getAverageScore(game.id) || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[var(--color-text-muted)]">遊玩次數</span>
                  <span class="text-[var(--color-text)]">{{ gameStore.getSessionsByGame(game.id).length }} 次</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="suggestions" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">💡 智能建議</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div 
              v-for="(suggestion, index) in trainingSuggestions" 
              :key="index"
              class="p-4 rounded-xl border-l-4 bg-[var(--color-surface-alt)]"
              :class="{
                'border-red-500 bg-red-50/50 dark:bg-red-900/10': suggestion.priority === 'high',
                'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10': suggestion.priority === 'medium',
                'border-green-500 bg-green-50/50 dark:bg-green-900/10': suggestion.priority === 'low',
              }"
            >
              <div class="flex items-center gap-2 mb-2 font-bold text-[var(--color-text)]">
                {{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }}
                {{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}
              </div>
              <p class="text-sm text-[var(--color-text-secondary)] mb-2">{{ suggestion.message }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="g in suggestion.suggestedGames" :key="g" class="text-xs px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)]">
                  {{ g }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="recent" class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-6">
          <h3 class="text-lg font-bold mb-4 text-[var(--color-text)]">🕐 最近遊戲記錄</h3>
          <div v-if="gameStore.recentSessions.length > 0" class="space-y-2">
            <div 
              v-for="session in gameStore.recentSessions.slice(0, 5)" 
              :key="session.id"
              class="flex items-center justify-between p-3 bg-[var(--color-surface-alt)] rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ getGameIcon(session.gameId) }}</span>
                <div>
                  <div class="font-medium text-[var(--color-text)] text-sm">{{ getGameName(session.gameId) }}</div>
                  <div class="text-xs text-[var(--color-text-muted)]">
                    {{ formatDateTime(session.createdAt) }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-sm" :class="getScoreClass(session.result.score)">
                  {{ session.result.score }} 分
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  {{ DIFFICULTIES[session.difficulty]?.name }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 text-[var(--color-text-muted)] text-sm">
            尚無近期記錄
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore, useGameStore } from '@/stores'
import { useResponsive } from '@/composables/useResponsive'
import { COGNITIVE_DIMENSIONS, emptyCognitiveScores, type CognitiveDimensionInfo } from '@/types/cognitive'
import { DIFFICULTIES } from '@/types/game'
import { calculateCognitiveIndex, generateTrainingSuggestions } from '@/services/scoreCalculator'
import { getLatestMiniCogResult, getUserMiniCogResults } from '@/services/db'
import { type MiniCogResult, getRiskLevelDescription, calculateMiniCogTotal } from '@/services/miniCogService'
import type { ReportUserInfo } from '@/services/pdfService'
import { getQuickReferenceCutoffs, getRiskLevel as getNormativeRiskLevel } from '@/services/taiwanNormativeData'

// 圖表元件
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import MiniCogCorrelationChart from '@/components/charts/MiniCogCorrelationChart.vue'

const { isMobile } = useResponsive()
const userStore = useUserStore()
const gameStore = useGameStore()

// 狀態
const isGenerating = ref(false)
const activeSection = ref('user-info')
const latestMiniCogResult = ref<MiniCogResult | null>(null)
const miniCogHistory = ref<MiniCogResult[]>([])
const showMiniCogHistory = ref(false)
const reportRef = ref<HTMLElement | null>(null)

// 報告區塊定義 (Desktop Navigation)
const reportSections = [
  { id: 'user-info', name: '基本資訊', icon: '👤' },
  { id: 'normative', name: '常模參考', icon: '📊' },
  { id: 'cognitive-analysis', name: '認知分析', icon: '🧠' },
  { id: 'trends', name: '歷史趨勢', icon: '📈' },
  { id: 'statistics', name: '訓練統計', icon: '📋' },
  { id: 'mini-cog', name: 'Mini-Cog', icon: '🧪' },
  { id: 'correlation', name: '關聯分析', icon: '📐' },
  { id: 'games', name: '各遊戲表現', icon: '🎮' },
  { id: 'suggestions', name: '訓練建議', icon: '💡' },
  { id: 'recent', name: '最近記錄', icon: '🕐' },
]

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS) as CognitiveDimensionInfo[]

// 綜合認知指數
const cognitiveIndex = computed(() => 
  calculateCognitiveIndex(gameStore.cognitiveScores)
)

// 上週分數
const previousScores = computed(() => {
  const trends = gameStore.getWeeklyTrends()
  const scores = emptyCognitiveScores()
  trends.forEach((t: { dimension: keyof typeof scores; previousScore: number }) => {
    scores[t.dimension] = t.previousScore
  })
  return scores
})

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
  
  // 估算 MMSE
  const estimatedMMSE = Math.round(cognitiveIndex.value * 30 / 100)
  const riskLevel = getNormativeRiskLevel(estimatedMMSE, 'MMSE', age, eduYears)
  
  const statusMap: Record<string, { statusText: string; statusClass: string }> = {
    'normal': { statusText: '表現良好 ✓', statusClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    'warning': { statusText: '邊緣值 ⚠', statusClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    'mci': { statusText: '需注意 ⚠', statusClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    'dementia': { statusText: '建議諮詢 ⚠', statusClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }
  
  return statusMap[riskLevel] || statusMap['normal']
})

// ===== 輔助函數 =====
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分鐘`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}小時${mins}分`
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getScoreLevelBg(score: number): string {
  if (score >= 80) return 'bg-white/20 text-white'
  if (score >= 60) return 'bg-white/20 text-white'
  return 'bg-white/20 text-white'
}

function getTrendIcon(dimension: string): string {
  const trends = gameStore.getWeeklyTrends()
  const trend = trends.find((t: { dimension: string }) => t.dimension === dimension)
  return trend?.trend === 'improving' ? '📈' : (trend?.trend === 'declining' ? '📉' : '➖')
}

// 取得年齡組標籤
function getAgeGroupLabel(): string {
  const age = userStore.userAge
  if (!age) return ''
  if (age < 50) return '40-49歲'
  if (age < 60) return '50-59歲'
  if (age < 70) return '60-69歲'
  if (age < 80) return '70-79歲'
  return '80歲以上'
}

function getEducationLabel(): string {
  const eduYears = userStore.userEducationYears
  if (eduYears === null) return ''
  return eduYears <= 6 ? '低教育程度' : '高教育程度'
}

// 取得遊戲相關
function getGameIcon(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.icon || '🎮'
}

function getGameName(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.name || gameId
}

// Mini-Cog 相關
function getMiniCogScoreClass(score: number): string {
  return score >= 4 ? 'text-green-600 dark:text-green-400' : (score >= 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')
}

function getMiniCogBorderClass(score: number): string {
  return score >= 4 ? 'border-green-500' : (score >= 3 ? 'border-yellow-500' : 'border-red-500')
}

function getMiniCogInterpretation(result: MiniCogResult) {
  const { riskLevel } = calculateMiniCogTotal(result.wordRecall.score, result.clockDrawing.score)
  return getRiskLevelDescription(riskLevel)
}

function getMiniCogInterpretationClass(result: MiniCogResult) {
  const { riskLevel } = calculateMiniCogTotal(result.wordRecall.score, result.clockDrawing.score)
  if (riskLevel === 'normal') return 'bg-green-50 text-green-800 border-green-500 dark:bg-green-900/20 dark:text-green-200'
  if (riskLevel === 'borderline') return 'bg-yellow-50 text-yellow-800 border-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-200'
  return 'bg-red-50 text-red-800 border-red-500 dark:bg-red-900/20 dark:text-red-200'
}

// 捲動邏輯
function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId)
  if (element) {
    const offset = 80 
    const elementPosition = element.getBoundingClientRect().top + window.scrollY
    const offsetPosition = elementPosition - offset
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    activeSection.value = sectionId
  }
}

// 滾動監聽更新 Active
function onContentScroll(event: Event): void {
  // 簡單實作：若容器是 window (isMobile=false時實際上是 body scroll)，則需用 window.scrollY
  // 但此處 Desktop 結構下 main 可能是自己的 scroll container，或是 body scroll
  // 為求簡化，點擊導覽已足夠，滾動監聽可視需求實作完善
}

async function downloadReport() {
  isGenerating.value = true
  try {
     const { generateCognitiveReport, downloadPdf, formatBehaviorSummary } = await import('@/services/pdfService')
     const { analyzeBehavior } = await import('@/services/behaviorAnalysisService')

     // 準備使用者資料
     const userInfo: ReportUserInfo = {
       name: userStore.currentUser?.name || '未知',
       age: userStore.userAge || 0,
       educationYears: userStore.currentUser?.educationYears || 0,
      reportDate: new Date().toISOString().split('T')[0] as string
     }

     // 準備 Mini-Cog 資料
     let miniCogReportData = null
     if (latestMiniCogResult.value) {
        const selfAssess = latestMiniCogResult.value.clockDrawing.selfAssessment
        const selfAssessScore = selfAssess 
          ? (selfAssess.hasCompleteCircle ? 1 : 0) + (selfAssess.hasCorrectNumbers ? 1 : 0) + (selfAssess.hasCorrectHands ? 1 : 0)
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

     // 準備分數與趨勢
     const cognitiveScoreData = {
       memory: gameStore.cognitiveScores.memory || 0,
       attention: gameStore.cognitiveScores.attention || 0,
       processing: gameStore.cognitiveScores.cognition || 0,
       executive: gameStore.cognitiveScores.logic || 0,
       language: gameStore.cognitiveScores.coordination || 0
     }
     
     const trendData = gameStore.scoreHistory.slice(-20).map((h) => {
        const dims = Object.values(h.scores).filter(v => v > 0)
        const avgScore = dims.length > 0 ? dims.reduce((a, b) => a + b, 0) / dims.length : 0
        return { date: h.date, score: Math.round(avgScore), gameType: undefined }
     })

     // 行為分析
     let behaviorSummary = null
     if (gameStore.recentSessions.length > 0) {
        try {
           const latestSession = gameStore.recentSessions[0]
           if (latestSession?.id) {
              const analysis = await analyzeBehavior(latestSession.id)
              behaviorSummary = formatBehaviorSummary(analysis)
           }
        } catch (e) { console.warn('Behavior analysis skipped') }
     }

     // 生成
     const pdfBlob = await generateCognitiveReport(
        userInfo,
        miniCogReportData,
        cognitiveScoreData,
        trendData,
        behaviorSummary,
        { includeClockDrawing: true, includeTrends: true, includeBehavior: true, includeRecommendations: true, language: 'bilingual' }
     )
     
     const filename = `認知評估報告_${userStore.currentUser?.name}_${new Date().toISOString().split('T')[0]}.pdf`
     downloadPdf(pdfBlob, filename)

  } catch (e) {
    console.error(e)
    alert('報告生成失敗')
  } finally {
    isGenerating.value = false
  }
}

onMounted(async () => {
  if (userStore.currentUser?.id) {
    try {
      latestMiniCogResult.value = await getLatestMiniCogResult(userStore.currentUser.id) || null
      miniCogHistory.value = await getUserMiniCogResults(userStore.currentUser.id)
    } catch (e) { console.error('Failed loading MiniCog data', e) }

    if (gameStore.sessions.length === 0) {
      await gameStore.loadUserSessions(userStore.currentUser.id)
    }
  }
})
</script>

<style scoped>
/* 隱藏 Scrollbar 但保持捲動功能 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 歷史展開動畫 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}
</style>
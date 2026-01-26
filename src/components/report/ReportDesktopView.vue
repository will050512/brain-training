<template>
  <div class="page-shell page-shell-wide grid grid-cols-[280px_1fr] gap-8 items-start min-h-screen">
    <aside class="sticky top-8 flex flex-col gap-4 h-[calc(100vh-4rem)]">
      <nav class="flex-1 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-3 overflow-y-auto no-scrollbar flex flex-col gap-1">
        <div class="px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">報告章節</div>
        <a
          v-for="section in reportSections"
          :key="section.id"
          href="#"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative"
          :class="activeSection === section.id ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-md font-medium' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]'"
          @click.prevent="onScrollToSection(section.id)"
        >
          <span class="text-lg relative z-10 transition-transform group-hover:scale-110">{{ section.icon }}</span>
          <span class="text-sm relative z-10">{{ section.name }}</span>
        </a>
      </nav>

      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-md p-5">
        <div class="text-center mb-4">
          <div class="text-xs text-[var(--color-text-muted)] mb-1">報告日期</div>
          <div class="font-bold text-[var(--color-text)]">{{ formatDate(new Date()) }}</div>
        </div>
        <button @click="onDownloadReport" :disabled="isGenerating" class="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 shadow-lg hover:-translate-y-0.5 transition-transform">
          <span class="text-lg">{{ isGenerating ? '⏳' : '📥' }}</span>
          <span>{{ isGenerating ? '生成中...' : '下載完整報告' }}</span>
        </button>
        <router-link to="/weekly-report" class="btn btn-secondary w-full text-center block mt-3 py-2 text-sm">
          📅 查看週報
        </router-link>
      </div>
    </aside>

    <main class="space-y-8 min-w-0 pb-16">
      <div class="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30">
        <span class="text-xl">⚠️</span>
        <div>
          <h4 class="font-bold text-[var(--color-warning-text)] text-sm mb-1">醫療免責聲明</h4>
          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">本報告數據基於遊戲表現估算，僅供自我健康管理參考，不可作為正式醫療診斷依據。</p>
        </div>
      </div>

      <section id="user-info" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div class="relative z-10 flex items-center gap-8">
          <div class="w-24 h-24 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text)] flex items-center justify-center text-5xl shadow-xl ring-4 ring-[var(--color-surface)] border border-[var(--color-border)]">👤</div>
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-[var(--color-text)] mb-2">{{ userName || '使用者' }}</h1>
            <div class="flex gap-3 text-sm text-[var(--color-text)]">
              <span class="px-3 py-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)]">{{ userAge || '?' }} 歲</span>
              <span class="px-3 py-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)]">教育程度：{{ educationYears || 0 }} 年</span>
              <span v-if="birthday" class="px-3 py-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                生日：{{ formatBirthdayToRoc(birthday) }}
              </span>
            </div>
          </div>
          <div class="text-right pl-8 border-l border-[var(--color-border)]">
            <div class="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1">綜合認知指數</div>
            <div class="text-5xl font-bold tracking-tight" :class="getScoreClass(cognitiveIndex)">{{ cognitiveIndex }}</div>
            <div v-if="normativeComparison" class="mt-2">
              <span class="badge py-1 px-3" :class="normativeComparison.statusClass">{{ normativeComparison.statusText }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="normativeData" id="normative" class="scroll-mt-24">
        <div class="p-6 rounded-2xl bg-[var(--gradient-card)] border border-[var(--color-border)] shadow-sm">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--color-text)]">📊 台灣常模參考</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-[var(--color-surface)]/90 backdrop-blur p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
              <div class="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">MMSE 切截點</div>
              <div class="text-3xl font-bold text-[var(--color-score)]">{{ normativeData.mmse.cutoff || '-' }} <span class="text-sm font-normal text-[var(--color-text-muted)]">分</span></div>
              <div class="mt-2 text-[10px] inline-block px-2 py-1 rounded bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]">{{ getAgeGroupLabel() }}</div>
            </div>
            <div class="bg-[var(--color-surface)]/90 backdrop-blur p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
              <div class="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">MoCA 切截點</div>
              <div class="text-3xl font-bold text-[var(--color-progress)]">{{ normativeData.moca.cutoff || '-' }} <span class="text-sm font-normal text-[var(--color-text-muted)]">分</span></div>
            </div>
            <div class="bg-[var(--color-surface)]/90 backdrop-blur p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
              <div class="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">CASI 切截點</div>
              <div class="text-3xl font-bold text-[var(--color-score-good)]">{{ normativeData.casi.cutoff || '-' }} <span class="text-sm font-normal text-[var(--color-text-muted)]">分</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="cognitive-analysis" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">🧠 認知能力分析</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div class="h-80 w-full"><RadarChart ref="radarChartRef" :scores="cognitiveScores" :previousScores="previousScores" /></div>
          <div class="space-y-3">
            <div v-for="dim in cognitiveDimensions" :key="dim.id" class="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors group">
              <div class="w-10 h-10 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">{{ dim.icon }}</div>
              <div class="flex-1">
                <div class="flex justify-between mb-1.5">
                  <span class="font-bold text-[var(--color-text)]">{{ dim.name }}</span>
                  <span class="font-bold" :style="{ color: dim.color }">{{ cognitiveScores[dim.id] }}</span>
                </div>
                <div class="h-2 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-1000 relative overflow-hidden" :style="{ width: `${cognitiveScores[dim.id]}%`, backgroundColor: dim.color }">
                    <div class="absolute inset-0 bg-[var(--color-surface)]/20 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>
              <div class="text-xl w-8 text-center" :title="getTrendIcon(dim.id) === '📈' ? '上升' : '下降'">{{ getTrendIcon(dim.id) }}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="trends" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold flex items-center gap-2 text-[var(--color-text)]">📈 歷史趨勢</h3>
          <span class="text-xs bg-[var(--color-surface-alt)] px-3 py-1 rounded-full text-[var(--color-text-secondary)] font-medium">近 30 天</span>
        </div>
        <div class="h-72 w-full"><TrendChart ref="trendChartRef" :history="scoreHistory" chartType="bar" :showWarningLines="true" :professionalMode="false" /></div>
      </section>

      <section id="statistics" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-6 text-[var(--color-text)]">📋 訓練統計</h3>
        <div class="grid grid-cols-2 gap-6">
          <div class="bg-[var(--color-bg-soft)] rounded-xl p-5 border border-[var(--color-border)]">
            <div class="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-light)]">
              <span class="text-2xl">📅</span>
              <div>
                <div class="font-bold text-[var(--color-text)]">每日訓練</div>
                <div class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Daily Challenge</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-score)]">{{ dailyStats.totalGames }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">總次數</div>
              </div>
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-score-good)]">{{ dailyStats.averageScore }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">平均分數</div>
              </div>
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-progress)]">{{ formatPlayTime(dailyStats.totalPlayTime) }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">總時長</div>
              </div>
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-combo)]">{{ userStreak }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">連續天數</div>
              </div>
            </div>
          </div>
          <div class="bg-[var(--color-bg-soft)] rounded-xl p-5 border border-[var(--color-border)]">
            <div class="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-light)]">
              <span class="text-2xl">🎮</span>
              <div>
                <div class="font-bold text-[var(--color-text)]">自由遊戲</div>
                <div class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Free Play</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-score)]">{{ freeStats.totalGames }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">總次數</div>
              </div>
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-score-good)]">{{ freeStats.averageScore }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">平均分數</div>
              </div>
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-progress)]">{{ formatPlayTime(freeStats.totalPlayTime) }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">總時長</div>
              </div>
              <div class="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                <div class="text-2xl font-bold text-[var(--color-combo)]">{{ userStreak }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">連續天數</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mini-cog" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border-2 border-[var(--color-border)] shadow-sm p-6 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-80 h-80 bg-[var(--color-primary-bg)]/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div class="relative z-10">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold flex items-center gap-2 text-[var(--color-text)]">🧪 Mini-Cog™ 篩檢</h3>
            <span v-if="latestMiniCogResult" class="px-3 py-1 rounded-full bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              檢測日期：{{ formatDateTime(latestMiniCogResult.completedAt) }}
            </span>
          </div>
          <div v-if="latestMiniCogResult" class="flex items-start gap-8">
            <div class="flex flex-col items-center justify-center p-6 bg-[var(--gradient-card)] rounded-full w-48 h-48 border-[6px] shrink-0 shadow-lg" :class="getMiniCogBorderClass(latestMiniCogResult.totalScore)">
              <div class="text-6xl font-bold mb-1 leading-none" :class="getMiniCogScoreClass(latestMiniCogResult.totalScore)">{{ latestMiniCogResult.totalScore }}</div>
              <div class="text-sm text-[var(--color-text-muted)] font-medium">總分 / 5</div>
            </div>
            <div class="flex-1 space-y-4">
              <div class="p-5 rounded-xl border-l-[6px] bg-[var(--color-surface)] shadow-sm" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
                <strong class="block text-xl mb-1">{{ getMiniCogInterpretation(latestMiniCogResult).label }}</strong>
                <p class="opacity-90 leading-relaxed">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-[var(--color-text-secondary)] uppercase">詞語回憶</span>
                    <span class="font-bold text-xl text-[var(--color-score)]">{{ latestMiniCogResult.wordRecall.score }}<span class="text-sm text-[var(--color-text-muted)]">/3</span></span>
                  </div>
                  <div class="h-2 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                    <div class="h-full bg-[var(--color-score)]" :style="{ width: `${(latestMiniCogResult.wordRecall.score / 3) * 100}%` }"></div>
                  </div>
                </div>
                <div class="p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-[var(--color-text-secondary)] uppercase">時鐘繪圖</span>
                    <span class="font-bold text-xl text-[var(--color-score)]">{{ latestMiniCogResult.clockDrawing.score }}<span class="text-sm text-[var(--color-text-muted)]">/2</span></span>
                  </div>
                  <div class="h-2 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                    <div class="h-full bg-[var(--color-score)]" :style="{ width: `${(latestMiniCogResult.clockDrawing.score / 2) * 100}%` }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 bg-[var(--color-bg-soft)] rounded-xl border-2 border-dashed border-[var(--color-border)]">
            <span class="text-4xl block mb-4">📋</span>
            <p class="mb-6 text-[var(--color-text-secondary)]">目前尚無 Mini-Cog 評估記錄</p>
            <router-link to="/assessment" class="btn btn-primary px-8 py-2.5 shadow-md">立即開始評估</router-link>
          </div>
          <div v-if="miniCogHistory.length > 1" class="mt-6 pt-4 border-t border-[var(--color-border)]">
            <button @click="onToggleMiniCogHistory" class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
              <span>{{ showMiniCogHistory ? '▼' : '▶' }}</span>
              <span>查看歷史記錄 ({{ miniCogHistory.length }} 筆)</span>
            </button>
            <Transition name="expand">
              <div v-if="showMiniCogHistory" class="grid grid-cols-2 gap-3 mt-3">
                <div v-for="record in miniCogHistory.slice(1, 7)" :key="record.id" class="flex justify-between p-3 bg-[var(--color-bg-soft)] rounded-lg text-sm border border-[var(--color-border-light)]">
                  <span class="text-[var(--color-text-muted)]">{{ formatDateTime(record.completedAt) }}</span>
                  <span class="font-bold" :class="getMiniCogScoreClass(record.totalScore)">{{ record.totalScore }} 分</span>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <section id="correlation" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-2 flex items-center gap-2 text-[var(--color-text)]">📐 關聯分析</h3>
        <p class="text-sm text-[var(--color-text-muted)] mb-6">Mini-Cog 篩檢與遊戲訓練表現對照</p>
        <MiniCogCorrelationChart :mini-cog-results="miniCogHistory" :game-sessions="recentSessions" />
      </section>

      <section id="games" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-6 text-[var(--color-text)]">🎮 各遊戲表現</h3>
        <div class="grid grid-cols-3 gap-4">
          <div v-for="game in allGames" :key="game.id" class="p-4 bg-[var(--color-surface-alt)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-all border border-transparent hover:border-[var(--color-border)] group">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-2xl group-hover:scale-110 transition-transform">{{ game.icon }}</span>
              <span class="font-bold text-[var(--color-text)]">{{ game.name }}</span>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between border-b border-[var(--color-border-light)] pb-2 mb-2">
                <span class="text-[var(--color-text-muted)] text-xs">最佳</span>
                <span class="font-bold text-[var(--color-text)]">{{ getBestScore(game.id) || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--color-text-muted)] text-xs">平均</span>
                <span class="text-[var(--color-text)]">{{ getAverageScore(game.id) || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="suggestions" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">💡 智能建議</h3>
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="(suggestion, index) in trainingSuggestions"
            :key="index"
            class="p-4 rounded-xl border-l-4 shadow-sm transition-shadow hover:shadow-md"
            :class="{
              'border-[var(--color-danger)] bg-[var(--color-danger-bg)]': suggestion.priority === 'high',
              'border-[var(--color-warning)] bg-[var(--color-warning-bg)]': suggestion.priority === 'medium',
              'border-[var(--color-success)] bg-[var(--color-success-bg)]': suggestion.priority === 'low'
            }"
          >
            <div class="flex items-center gap-2 mb-2 font-bold text-[var(--color-text)]">
              {{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }} {{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}
            </div>
            <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">{{ suggestion.message }}</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="g in suggestion.suggestedGames" :key="g" class="text-xs px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">{{ g }}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="nutrition" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">🥗 個人化營養建議</h3>

        <div v-if="!nutritionUnlocked" class="text-center py-10">
          <div class="text-4xl mb-3">🔒</div>
          <p class="text-[var(--color-text-secondary)] mb-4">完成 <span class="font-bold text-[var(--color-primary)]">{{ nutritionUnlockProgress }}/{{ NUTRITION_UNLOCK_REQUIRED_TRAININGS }}</span> 場遊戲後解鎖</p>
          <div class="w-64 h-2 bg-[var(--color-bg-muted)] rounded-full mx-auto overflow-hidden">
            <div class="h-full bg-[var(--color-success)] transition-all duration-500" :style="{ width: `${nutritionUnlockPercent}%` }"></div>
          </div>
        </div>

        <div v-else-if="nutritionResult">
          <div class="bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 p-4 rounded-xl mb-6">
            <div class="flex items-start gap-3">
              <span class="text-xl">⚠️</span>
              <div class="flex-1">
                <p class="text-sm text-[var(--color-text)]">以下建議僅供參考，不構成醫療診斷。</p>
                <button @click="onToggleNutritionDisclaimer" class="text-xs text-[var(--color-warning)] underline mt-1">{{ showNutritionDisclaimer ? '收起' : '完整免責聲明' }}</button>
                <div v-if="showNutritionDisclaimer" class="mt-2 pt-2 border-t border-[var(--color-warning)]/30 text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">{{ NUTRITION_DISCLAIMER }}</div>
              </div>
            </div>
          </div>

          <div v-if="nutritionResult.recommendations.filter(r => r.priority === 'high').length > 0" class="mb-6">
            <h4 class="text-sm font-bold text-[var(--color-danger)] uppercase tracking-wider mb-3 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[var(--color-danger)]"></span> 重點關注</h4>
            <div class="grid grid-cols-2 gap-4">
              <div v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'high')" :key="rec.id" class="p-4 rounded-xl bg-[var(--color-danger-bg)] border-l-4 border-[var(--color-danger)]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-bold text-[var(--color-text)]">{{ rec.supplement.name }}</span>
                  <span v-if="rec.supplement.isPartnerProduct" class="badge badge--warning">合作</span>
                </div>
                <p class="text-sm text-[var(--color-text-secondary)] mb-2">{{ rec.reason }}</p>
                <div class="text-xs bg-[var(--color-surface)]/50 p-2 rounded inline-block">建議劑量：{{ rec.supplement.dosageRange }}</div>
              </div>
            </div>
          </div>

          <div class="bg-[var(--color-success-bg)] p-5 rounded-xl border border-[var(--color-success)]/30">
            <h4 class="text-sm font-bold text-[var(--color-success)] uppercase tracking-wider mb-3">一般建議</h4>
            <ul class="grid grid-cols-2 gap-3">
              <li v-for="(advice, i) in nutritionResult.generalAdvice" :key="i" class="text-sm text-[var(--color-text-secondary)] flex gap-2"><span class="text-[var(--color-success)] font-bold">✓</span> {{ advice }}</li>
            </ul>
          </div>
        </div>

        <div v-else class="text-center py-8 text-[var(--color-text-muted)]">載入中...</div>
      </section>

      <section id="recent" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
        <h3 class="text-lg font-bold mb-4 text-[var(--color-text)]">🕐 最近遊戲記錄</h3>
        <div v-if="recentSessions.length > 0" class="space-y-3">
          <div v-for="session in recentSessions.slice(0, 5)" :key="session.id" class="flex items-center justify-between p-4 bg-[var(--color-surface-alt)] rounded-xl border border-transparent hover:border-[var(--color-border)] transition-colors">
            <div class="flex items-center gap-4">
              <span class="text-2xl">{{ getGameIcon(session.gameId) }}</span>
              <div>
                <div class="font-bold text-[var(--color-text)]">{{ getGameName(session.gameId) }}</div>
                <div class="text-xs text-[var(--color-text-muted)]">{{ formatDateTime(session.createdAt) }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-lg" :class="getScoreClass(session.result.score)">{{ session.result.score }} 分</div>
              <span class="badge badge--neutral text-xs">{{ DIFFICULTIES[session.difficulty]?.name }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-[var(--color-text-muted)]">尚無近期記錄</div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CognitiveScores, CognitiveDimensionInfo, CognitiveDimension } from '@/types/cognitive'
import type { GameDefinition, GameSession } from '@/types/game'
import type { ScoreHistory, TrainingSuggestion } from '@/services/scoreCalculator'
import type { MiniCogResult } from '@/services/miniCogService'
import type { PersonalizedNutritionResult } from '@/services/nutritionPlaceholder'
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import MiniCogCorrelationChart from '@/components/charts/MiniCogCorrelationChart.vue'
import { COGNITIVE_DIMENSIONS } from '@/types/cognitive'
import { DIFFICULTIES } from '@/types/game'
import { NUTRITION_DISCLAIMER } from '@/services/nutritionPlaceholder'
import { NUTRITION_UNLOCK_REQUIRED_TRAININGS } from '@/utils/trainingStats'

type NormativeData = {
  mmse: { cutoff: number | null }
  moca: { cutoff: number | null }
  casi: { cutoff: number | null }
}

type NormativeComparison = {
  statusText: string
  statusClass: string
}

type ReportSection = {
  id: string
  name: string
  icon: string
}

type StatSummary = {
  totalGames: number
  totalPlayTime: number
  averageScore: number
}

defineProps<{
  reportSections: ReportSection[]
  activeSection: string
  onScrollToSection: (sectionId: string) => void
  formatDate: (date: Date) => string
  isGenerating: boolean
  onDownloadReport: () => void
  userName: string
  userAge: number | null
  educationYears: number
  birthday: string | null
  cognitiveIndex: number
  getScoreClass: (score: number) => string
  formatBirthdayToRoc: (birthday: string) => string
  normativeComparison: NormativeComparison | null
  normativeData: NormativeData | null
  getAgeGroupLabel: () => string
  cognitiveDimensions: CognitiveDimensionInfo[]
  cognitiveScores: CognitiveScores
  previousScores: CognitiveScores
  getTrendIcon: (dimension: CognitiveDimension) => string
  scoreHistory: ScoreHistory[]
  dailyStats: StatSummary
  freeStats: StatSummary
  formatPlayTime: (seconds: number) => string
  userStreak: number
  latestMiniCogResult: MiniCogResult | null
  miniCogHistory: MiniCogResult[]
  showMiniCogHistory: boolean
  onToggleMiniCogHistory: () => void
  formatDateTime: (date: Date | string) => string
  getMiniCogScoreClass: (score: number) => string
  getMiniCogBorderClass: (score: number) => string
  getMiniCogInterpretation: (result: MiniCogResult) => { label: string; description: string }
  getMiniCogInterpretationClass: (result: MiniCogResult) => string
  trainingSuggestions: TrainingSuggestion[]
  allGames: GameDefinition[]
  getBestScore: (gameId: string) => number | null | undefined
  getAverageScore: (gameId: string) => number | null | undefined
  recentSessions: GameSession[]
  getGameIcon: (gameId: string) => string
  getGameName: (gameId: string) => string
  nutritionUnlocked: boolean
  nutritionUnlockProgress: number
  nutritionUnlockPercent: number
  nutritionResult: PersonalizedNutritionResult | null
  showNutritionDisclaimer: boolean
  onToggleNutritionDisclaimer: () => void
}>()

const radarChartRef = ref<InstanceType<typeof RadarChart> | null>(null)
const trendChartRef = ref<InstanceType<typeof TrendChart> | null>(null)

defineExpose({
  getRadarChartDataURL: () => radarChartRef.value?.getDataURL() ?? null,
  getTrendChartDataURL: () => trendChartRef.value?.getDataURL() ?? null
})
</script>

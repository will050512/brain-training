<template>
  <div class="min-h-screen bg-[var(--color-bg)]">
    
    <div v-if="isMobile" class="flex flex-col min-h-screen">
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

      <main class="flex-1 p-4 space-y-4">
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
            <RadarChart ref="radarChartRef" :scores="gameStore.cognitiveScores" :previousScores="previousScores" />
          </div>
        </section>

        <div class="h-8"></div>
      </main>
    </div>

    <div v-else class="max-w-7xl mx-auto w-full p-6 grid grid-cols-[260px_1fr] gap-8 items-start relative">
      
      <aside class="sticky top-6 h-[calc(100vh-3rem)] flex flex-col gap-4">
        
        <nav class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm p-2 overflow-y-auto no-scrollbar flex-1">
          <div class="space-y-1">
            <a 
              v-for="section in reportSections" 
              :key="section.id"
              href="#"
              class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group"
              :class="activeSection === section.id 
                ? 'bg-[var(--color-primary)] text-white shadow-md transform scale-[1.02]' 
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]'"
              @click.prevent="scrollToSection(section.id)"
            >
              <span class="text-xl group-hover:scale-110 transition-transform">{{ section.icon }}</span>
              <span class="text-sm font-medium">{{ section.name }}</span>
            </a>
          </div>
        </nav>
        
        <div class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-lg p-4 mt-auto">
          <div class="mb-3 text-center">
             <div class="text-xs text-[var(--color-text-muted)] mb-1">報告生成日期</div>
             <div class="font-medium text-[var(--color-text)]">{{ formatDate(new Date()) }}</div>
          </div>
          
          <button 
            @click="downloadReport" 
            class="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all" 
            :disabled="isGenerating"
          >
            <span class="text-xl">{{ isGenerating ? '⏳' : '📥' }}</span>
            <span>{{ isGenerating ? '生成中...' : '下載完整報告' }}</span>
          </button>
          
          <router-link to="/weekly-report" class="mt-3 btn btn-secondary w-full text-center block py-2 text-sm">
            📅 查看週報
          </router-link>
        </div>
      </aside>

      <main class="space-y-8 min-w-0 pb-12">
        
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 p-5 rounded-2xl flex gap-4 items-center shadow-sm">
          <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-2xl flex-shrink-0">⚠️</div>
          <div>
            <p class="font-bold text-amber-900 dark:text-amber-100">醫療免責聲明</p>
            <p class="text-sm text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
              本報告數據基於遊戲表現估算，僅供自我健康管理參考，不可作為正式醫療診斷依據。如有疑慮請諮詢專業醫師。
            </p>
          </div>
        </div>

        <section id="user-info" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <div class="flex items-center gap-8">
            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-5xl shadow-lg ring-4 ring-blue-50 dark:ring-blue-900/20">
              👤
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-[var(--color-text)]">{{ userStore.currentUser?.name }}</h1>
                <span class="px-3 py-1 rounded-full bg-[var(--color-bg-soft)] text-sm border border-[var(--color-border)]">
                   {{ userStore.userAge }} 歲
                </span>
              </div>
              <p class="text-[var(--color-text-secondary)] text-lg">
                教育程度：{{ userStore.currentUser?.educationYears || 0 }} 年
              </p>
            </div>
            <div class="text-right pl-8 border-l border-[var(--color-border)]">
              <div class="text-sm text-[var(--color-text-secondary)] mb-1 font-medium">綜合認知指數</div>
              <div class="text-5xl font-bold tracking-tight" :class="getScoreClass(cognitiveIndex)">
                {{ cognitiveIndex }}
              </div>
              <div v-if="normativeComparison" class="mt-3 text-sm px-3 py-1.5 rounded-full inline-flex items-center gap-1 font-medium" :class="normativeComparison.statusClass">
                {{ normativeComparison.statusText }}
              </div>
            </div>
          </div>
        </section>

        <section v-if="normativeData" id="normative" class="scroll-mt-8">
           <div class="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 p-8 shadow-sm">
            <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">
              📊 台灣認知功能常模參考
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white/60 dark:bg-slate-800/60 p-5 rounded-xl border border-indigo-100 dark:border-indigo-700/50 backdrop-blur-sm">
                <div class="text-sm text-[var(--color-text-muted)] mb-2 font-medium">MMSE 切截點</div>
                <div class="flex items-end gap-2">
                  <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ normativeData.mmse.cutoff || '-' }}</div>
                  <div class="text-sm text-[var(--color-text-muted)] mb-1">分</div>
                </div>
                <div class="mt-2 text-xs text-[var(--color-text-secondary)] bg-blue-100/50 dark:bg-blue-900/30 px-2 py-1 rounded inline-block">
                  {{ getAgeGroupLabel() }} • {{ getEducationLabel() }}
                </div>
              </div>
              <div class="bg-white/60 dark:bg-slate-800/60 p-5 rounded-xl border border-purple-100 dark:border-purple-700/50 backdrop-blur-sm">
                <div class="text-sm text-[var(--color-text-muted)] mb-2 font-medium">MoCA 切截點</div>
                <div class="flex items-end gap-2">
                  <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">{{ normativeData.moca.cutoff || '-' }}</div>
                  <div class="text-sm text-[var(--color-text-muted)] mb-1">分</div>
                </div>
                <div class="mt-2 text-xs text-[var(--color-text-secondary)] bg-purple-100/50 dark:bg-purple-900/30 px-2 py-1 rounded inline-block">
                  建議 ≥23 分為正常
                </div>
              </div>
              <div class="bg-white/60 dark:bg-slate-800/60 p-5 rounded-xl border border-green-100 dark:border-green-700/50 backdrop-blur-sm">
                <div class="text-sm text-[var(--color-text-muted)] mb-2 font-medium">CASI 切截點</div>
                <div class="flex items-end gap-2">
                  <div class="text-3xl font-bold text-green-600 dark:text-green-400">{{ normativeData.casi.cutoff || '-' }}</div>
                  <div class="text-sm text-[var(--color-text-muted)] mb-1">分</div>
                </div>
                <div class="mt-2 text-xs text-[var(--color-text-secondary)] bg-green-100/50 dark:bg-green-900/30 px-2 py-1 rounded inline-block">
                  分數越高越佳
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cognitive-analysis" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <h3 class="text-xl font-bold mb-8 flex items-center gap-2 text-[var(--color-text)]">🧠 認知能力分析</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-w-0">
            <div class="h-80 w-full min-w-0">
              <RadarChart 
                ref="radarChartRef"
                :scores="gameStore.cognitiveScores" 
                :previousScores="previousScores"
              />
            </div>
            <div class="space-y-6 w-full min-w-0">
              <div v-for="dim in cognitiveDimensions" :key="dim.id" class="flex items-center gap-4 group">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--color-bg-soft)] text-2xl group-hover:scale-110 transition-transform">
                  {{ dim.icon }}
                </div>
                <div class="flex-1">
                  <div class="flex justify-between mb-2">
                    <span class="font-bold text-[var(--color-text)]">{{ dim.name }}</span>
                    <span class="font-bold text-lg" :style="{ color: dim.color }">{{ gameStore.cognitiveScores[dim.id] }}</span>
                  </div>
                  <div class="h-3 bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      :style="{ width: `${gameStore.cognitiveScores[dim.id]}%`, backgroundColor: dim.color }"
                    >
                      <div class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>
                <span class="text-2xl w-8 text-center" title="趨勢">{{ getTrendIcon(dim.id) }}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="trends" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold flex items-center gap-2 text-[var(--color-text)]">📈 歷史趨勢</h3>
            <span class="text-sm text-[var(--color-text-secondary)]">近 30 天變化</span>
          </div>
          <div class="h-72 w-full min-w-0">
             <TrendChart 
                ref="trendChartRef"
                :history="gameStore.scoreHistory" 
                :showWarningLines="true"
                :professionalMode="false"
              />
          </div>
        </section>

        <section id="statistics" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">📋 訓練統計</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center p-6 bg-[var(--color-bg-soft)] rounded-2xl hover:bg-[var(--color-surface-alt)] transition-colors border border-transparent hover:border-[var(--color-border)]">
              <div class="text-4xl font-bold text-blue-500 mb-2">{{ userStore.currentStats?.totalGamesPlayed || 0 }}</div>
              <div class="text-sm text-[var(--color-text-secondary)] font-medium">總遊戲次數</div>
            </div>
            <div class="text-center p-6 bg-[var(--color-bg-soft)] rounded-2xl hover:bg-[var(--color-surface-alt)] transition-colors border border-transparent hover:border-[var(--color-border)]">
              <div class="text-4xl font-bold text-green-500 mb-2">{{ userStore.currentStats?.averageScore || 0 }}</div>
              <div class="text-sm text-[var(--color-text-secondary)] font-medium">平均分數</div>
            </div>
            <div class="text-center p-6 bg-[var(--color-bg-soft)] rounded-2xl hover:bg-[var(--color-surface-alt)] transition-colors border border-transparent hover:border-[var(--color-border)]">
              <div class="text-4xl font-bold text-purple-500 mb-2">{{ formatPlayTime(userStore.currentStats?.totalPlayTime || 0) }}</div>
              <div class="text-sm text-[var(--color-text-secondary)] font-medium">總訓練時長</div>
            </div>
            <div class="text-center p-6 bg-[var(--color-bg-soft)] rounded-2xl hover:bg-[var(--color-surface-alt)] transition-colors border border-transparent hover:border-[var(--color-border)]">
              <div class="text-4xl font-bold text-orange-500 mb-2">{{ userStore.currentStats?.streak || 0 }}</div>
              <div class="text-sm text-[var(--color-text-secondary)] font-medium">連續天數</div>
            </div>
          </div>
        </section>

        <section id="mini-cog" class="bg-[var(--color-surface)] rounded-2xl border-2 border-indigo-100 dark:border-indigo-900 shadow-sm p-8 relative overflow-hidden scroll-mt-8">
           <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
           
           <div class="flex justify-between items-center mb-8 relative">
             <h3 class="text-xl font-bold mb-0 flex items-center gap-2 text-[var(--color-text)]">🧪 Mini-Cog™ 篩檢</h3>
             <span v-if="latestMiniCogResult" class="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
               檢測日期：{{ formatDateTime(latestMiniCogResult.completedAt) }}
             </span>
           </div>

           <div v-if="latestMiniCogResult" class="flex flex-col gap-8 relative">
             <div class="flex flex-col md:flex-row gap-8 items-start">
               <div class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 rounded-full w-48 h-48 border-[6px] shrink-0 shadow-lg"
                    :class="getMiniCogBorderClass(latestMiniCogResult.totalScore)">
                 <div class="text-6xl font-bold mb-1 leading-none" :class="getMiniCogScoreClass(latestMiniCogResult.totalScore)">
                   {{ latestMiniCogResult.totalScore }}
                 </div>
                 <div class="text-base text-[var(--color-text-muted)] font-medium">總分 / 5</div>
               </div>

               <div class="flex-1 w-full space-y-6">
                 <div class="p-6 rounded-xl border-l-[6px]" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
                   <strong class="block text-xl mb-2">{{ getMiniCogInterpretation(latestMiniCogResult).label }}</strong>
                   <p class="text-base opacity-90 leading-relaxed">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</p>
                 </div>

                 <div class="grid grid-cols-2 gap-6">
                   <div class="p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                     <div class="flex justify-between items-center mb-3">
                       <span class="text-sm font-medium text-[var(--color-text-secondary)]">📝 詞語回憶</span>
                       <span class="font-bold text-xl text-indigo-600">{{ latestMiniCogResult.wordRecall.score }}<span class="text-sm text-gray-400">/3</span></span>
                     </div>
                     <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div class="h-full bg-indigo-500 rounded-full" :style="{ width: `${(latestMiniCogResult.wordRecall.score/3)*100}%` }"></div>
                     </div>
                   </div>
                   <div class="p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                     <div class="flex justify-between items-center mb-3">
                       <span class="text-sm font-medium text-[var(--color-text-secondary)]">🕐 時鐘繪圖</span>
                       <span class="font-bold text-xl text-indigo-600">{{ latestMiniCogResult.clockDrawing.score }}<span class="text-sm text-gray-400">/2</span></span>
                     </div>
                     <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div class="h-full bg-indigo-500 rounded-full" :style="{ width: `${(latestMiniCogResult.clockDrawing.score/2)*100}%` }"></div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
              <div v-if="miniCogHistory.length > 1" class="mt-4 pt-4 border-t border-[var(--color-border)]">
                 <button 
                   class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                   @click="showMiniCogHistory = !showMiniCogHistory"
                 >
                   <span>{{ showMiniCogHistory ? '▼' : '▶' }}</span>
                   <span>查看歷史記錄 ({{ miniCogHistory.length }} 筆)</span>
                 </button>
                 <Transition name="expand">
                   <div v-if="showMiniCogHistory" class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                     <div 
                       v-for="record in miniCogHistory.slice(1, 7)" 
                       :key="record.id"
                       class="flex items-center justify-between p-3 bg-[var(--color-bg-soft)] rounded-lg text-sm"
                     >
                       <span class="text-[var(--color-text-muted)]">{{ formatDateTime(record.completedAt) }}</span>
                       <span :class="getMiniCogScoreClass(record.totalScore)" class="font-bold">
                         {{ record.totalScore }} 分
                         <span class="text-xs text-gray-400 font-normal ml-1">({{ record.wordRecall.score }}/{{ record.clockDrawing.score }})</span>
                       </span>
                     </div>
                   </div>
                 </Transition>
              </div>
           </div>
           
           <div v-else class="text-center py-12 bg-[var(--color-bg-soft)] rounded-xl border-2 border-dashed border-[var(--color-border)]">
              <span class="text-5xl block mb-4">📋</span>
              <p class="mb-6 text-lg text-[var(--color-text-secondary)]">目前尚無 Mini-Cog 評估記錄</p>
              <router-link to="/assessment" class="btn btn-primary btn-lg shadow-lg">
                立即開始評估
              </router-link>
           </div>
        </section>

        <section id="correlation" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <h3 class="text-xl font-bold mb-2 flex items-center gap-2 text-[var(--color-text)]">📐 關聯分析</h3>
          <p class="text-sm text-[var(--color-text-muted)] mb-6">分析 Mini-Cog 篩檢分數與日常遊戲訓練表現的相關性。</p>
          <MiniCogCorrelationChart 
            :mini-cog-results="miniCogHistory"
            :game-sessions="gameStore.recentSessions"
          />
        </section>

        <section id="games" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <h3 class="text-xl font-bold mb-6 text-[var(--color-text)]">🎮 各遊戲表現</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="game in gameStore.allGames" 
              :key="game.id"
              class="p-5 bg-[var(--color-surface-alt)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors border border-transparent hover:border-[var(--color-border)] group"
            >
              <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl group-hover:scale-110 transition-transform">{{ game.icon }}</span>
                <span class="font-bold text-[var(--color-text)] text-lg">{{ game.name }}</span>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between border-b border-[var(--color-border)] pb-2 mb-2">
                  <span class="text-[var(--color-text-muted)]">最佳成績</span>
                  <span class="font-bold text-[var(--color-text)] text-base">{{ gameStore.getBestScore(game.id) || '-' }}</span>
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

        <section id="suggestions" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">💡 智能建議</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div 
              v-for="(suggestion, index) in trainingSuggestions" 
              :key="index"
              class="p-5 rounded-xl border-l-[6px] bg-[var(--color-surface-alt)] shadow-sm"
              :class="{
                'border-red-500 bg-red-50/50 dark:bg-red-900/10': suggestion.priority === 'high',
                'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10': suggestion.priority === 'medium',
                'border-green-500 bg-green-50/50 dark:bg-green-900/10': suggestion.priority === 'low',
              }"
            >
              <div class="flex items-center gap-2 mb-3 font-bold text-lg text-[var(--color-text)]">
                {{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }}
                {{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}
              </div>
              <p class="text-base text-[var(--color-text-secondary)] mb-3 leading-relaxed">{{ suggestion.message }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="g in suggestion.suggestedGames" :key="g" class="text-xs px-2.5 py-1 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  {{ g }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="recent" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 scroll-mt-8">
          <h3 class="text-xl font-bold mb-4 text-[var(--color-text)]">🕐 最近遊戲記錄</h3>
          <div v-if="gameStore.recentSessions.length > 0" class="space-y-3">
            <div 
              v-for="session in gameStore.recentSessions.slice(0, 5)" 
              :key="session.id"
              class="flex items-center justify-between p-4 bg-[var(--color-surface-alt)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors"
            >
              <div class="flex items-center gap-4">
                <span class="text-2xl">{{ getGameIcon(session.gameId) }}</span>
                <div>
                  <div class="font-bold text-[var(--color-text)]">{{ getGameName(session.gameId) }}</div>
                  <div class="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {{ formatDateTime(session.createdAt) }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-lg" :class="getScoreClass(session.result.score)">
                  {{ session.result.score }} 分
                </div>
                <span class="text-xs px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  {{ DIFFICULTIES[session.difficulty]?.name }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-[var(--color-text-muted)]">
            尚無近期記錄，快去玩個遊戲吧！
          </div>
        </section>
        
        <div class="h-8"></div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// Script 部分保持不變，邏輯完全沿用
// (請將原本的 import 與 function 邏輯複製貼上於此)
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

// 圖表 Refs
const radarChartRef = ref<InstanceType<typeof RadarChart> | null>(null)
const trendChartRef = ref<InstanceType<typeof TrendChart> | null>(null)

// 狀態
const isGenerating = ref(false)
const activeSection = ref('user-info')
const latestMiniCogResult = ref<MiniCogResult | null>(null)
const miniCogHistory = ref<MiniCogResult[]>([])
const showMiniCogHistory = ref(false)

// 報告區塊定義
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

// 格式化函數
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

function getGameIcon(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.icon || '🎮'
}

function getGameName(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.name || gameId
}

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

// 修正捲動邏輯：改用 scrollIntoView 
function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId)
  if (element) {
    // scrollIntoView 會自動找到最近的可捲動父層，並將元素滑到視野中
    // 搭配 CSS 的 scroll-margin-top (scroll-mt-8)，可以完美預留頂部空間
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSection.value = sectionId
  }
}

// 更新滾動監聽 (針對 window)
function handleScroll() {
  if (isMobile.value) return // 手機版不處理側邊欄 Active 狀態

  const scrollY = window.scrollY
  // 找出目前在畫面中的 Section
  for (const section of reportSections) {
    const el = document.getElementById(section.id)
    if (el) {
      const top = el.offsetTop - 100
      const bottom = top + el.offsetHeight
      if (scrollY >= top && scrollY < bottom) {
        activeSection.value = section.id
        break
      }
    }
  }
}

async function downloadReport() {
  isGenerating.value = true
  try {
     const { generateCognitiveReport, downloadPdf, formatBehaviorSummary } = await import('@/services/pdfService')
     const { analyzeBehavior } = await import('@/services/behaviorAnalysisService')

     const userInfo: ReportUserInfo = {
       name: userStore.currentUser?.name || '未知',
       age: userStore.userAge || 0,
       educationYears: userStore.currentUser?.educationYears || 0,
      reportDate: new Date().toISOString().split('T')[0] as string
     }

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

     // 獲取圖表圖片
     const radarChartImage = radarChartRef.value?.getDataURL()
     const trendChartImage = trendChartRef.value?.getDataURL()

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
          language: 'bilingual',
          radarChartImage,
          trendChartImage
        }
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
  
  // 監聽 window 滾動
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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

/* 確保 Scroll Margin 生效 (讓錨點定位時有頭部空間) */
.scroll-mt-8 {
  scroll-margin-top: 2rem;
}

/* 閃光動畫 */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
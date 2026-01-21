<template>
  <div class="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text)] selection:bg-[var(--color-primary)] selection:text-[var(--color-text-inverse)]">
    
    <!-- Mobile View -->
    <div v-if="isMobile" class="flex flex-col min-h-screen pb-safe">
      <!-- Header: Compact & Sticky -->
      <header class="h-[52px] flex items-center justify-between px-3 sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm">
        <h2 class="text-base font-bold tracking-tight text-[var(--color-text)]">認知評估報告</h2>
        <button 
          @click="downloadReport" 
          class="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text)] border border-[var(--color-border)] active:scale-95 transition-transform"
          :disabled="isGenerating"
          aria-label="下載報告"
        >
          <span class="text-lg">{{ isGenerating ? '⏳' : '📥' }}</span>
        </button>
      </header>

      <main class="flex-1 p-3 space-y-3 overflow-x-hidden">
        <!-- Disclaimer -->
        <div class="px-3 py-2 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/20 flex items-start gap-2">
          <span class="text-sm">⚠️</span>
          <p class="text-xs text-[var(--color-text-secondary)] leading-snug pt-0.5">
            數據僅供參考，非醫療診斷。
          </p>
        </div>

        <!-- User Card: Compact -->
        <section class="p-4 rounded-xl bg-[var(--gradient-primary)] text-[var(--color-text-inverse)] shadow-md relative overflow-hidden">
          <div class="absolute right-0 top-0 w-32 h-32 bg-[var(--color-surface)]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div class="relative z-10 flex items-center gap-3">
             <div class="w-12 h-12 rounded-full bg-[var(--color-surface)]/20 backdrop-blur-sm flex items-center justify-center border border-[var(--color-border-inverse)] shadow-inner text-xl">
               👤
             </div>
             <div class="flex-1 min-w-0">
               <h2 class="text-lg font-bold truncate leading-tight">{{ userStore.currentUser?.name || '使用者' }}</h2>
               <p class="text-xs opacity-90 font-medium">{{ userStore.userAge || '?' }} 歲 • {{ userStore.currentUser?.educationYears || 0 }}年教育</p>
             </div>
             <div class="text-right">
               <div class="text-2xl font-bold leading-none">{{ cognitiveIndex }}</div>
               <div class="text-[10px] opacity-80 font-medium uppercase tracking-wider">綜合指數</div>
             </div>
          </div>
        </section>

        <!-- Radar Chart -->
        <section class="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
           <div class="flex items-center gap-2 mb-2">
             <span class="w-1 h-3 rounded-full bg-[var(--color-primary)]"></span>
             <h3 class="text-sm font-bold text-[var(--color-text)]">能力分佈</h3>
           </div>
           <div class="h-52 -ml-2">
             <RadarChart ref="radarChartRef" :scores="gameStore.cognitiveScores" :previousScores="previousScores" />
           </div>
        </section>

        <!-- Dimensions List -->
        <section class="space-y-2">
           <div v-for="dim in cognitiveDimensions" :key="dim.id" class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3 shadow-sm active:scale-[0.99] transition-transform">
              <div class="w-9 h-9 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-lg shrink-0 text-[var(--color-text)]">
                {{ dim.icon }}
              </div>
              <div class="flex-1 min-w-0">
                 <div class="flex justify-between items-center mb-1.5">
                    <span class="text-sm font-bold text-[var(--color-text)]">{{ dim.name }}</span>
                    <span class="text-sm font-bold font-mono" :style="{ color: dim.color }">{{ gameStore.cognitiveScores[dim.id] }}</span>
                 </div>
                 <div class="h-1.5 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-1000" :style="{ width: `${gameStore.cognitiveScores[dim.id]}%`, backgroundColor: dim.color }"></div>
                 </div>
              </div>
           </div>
        </section>

        <!-- Training Stats Grid -->
        <section class="grid grid-cols-2 gap-2">
          <!-- Daily -->
          <div class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div class="flex items-center gap-1.5 mb-2 pb-2 border-b border-[var(--color-border-light)]">
              <span class="text-sm">📅</span>
              <span class="text-xs font-bold text-[var(--color-text)]">每日訓練</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-[var(--color-text-muted)]">次數</span>
                <span class="font-bold text-[var(--color-text)]">{{ dailyStats.totalGames }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-[var(--color-text-muted)]">平均</span>
                <span class="font-bold text-[var(--color-score-good)]">{{ dailyStats.averageScore }}</span>
              </div>
            </div>
          </div>
          <!-- Free -->
          <div class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div class="flex items-center gap-1.5 mb-2 pb-2 border-b border-[var(--color-border-light)]">
              <span class="text-sm">🎮</span>
              <span class="text-xs font-bold text-[var(--color-text)]">自由遊戲</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-[var(--color-text-muted)]">次數</span>
                <span class="font-bold text-[var(--color-text)]">{{ freeStats.totalGames }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-[var(--color-text-muted)]">平均</span>
                <span class="font-bold text-[var(--color-score-good)]">{{ freeStats.averageScore }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Mini-Cog -->
        <section v-if="latestMiniCogResult" class="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm relative overflow-hidden">
           <div class="absolute right-0 top-0 w-24 h-24 bg-[var(--color-bg-soft)] rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
           <div class="relative z-10">
             <div class="flex justify-between items-center mb-3">
               <h3 class="text-sm font-bold flex items-center gap-1.5 text-[var(--color-text)]">
                 <span class="w-1 h-3 rounded-full bg-[var(--color-accent-purple)]"></span>
                 Mini-Cog 篩檢
               </h3>
               <span class="text-[10px] bg-[var(--color-surface-alt)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">
                 {{ formatDateTime(latestMiniCogResult.completedAt).split(' ')[0] }}
               </span>
             </div>
             <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold shrink-0 bg-[var(--color-surface)]"
                     :class="[getMiniCogBorderClass(latestMiniCogResult.totalScore), getMiniCogScoreClass(latestMiniCogResult.totalScore)]">
                   {{ latestMiniCogResult.totalScore }}
                </div>
                <div class="flex-1 text-sm p-2 rounded-lg bg-[var(--color-bg-soft)] border-l-2" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
                   <div class="font-bold text-xs mb-0.5">{{ getMiniCogInterpretation(latestMiniCogResult).label }}</div>
                   <div class="text-[10px] leading-tight opacity-90">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</div>
                </div>
             </div>
           </div>
        </section>

        <!-- Suggestions -->
        <section v-if="trainingSuggestions.length > 0" class="space-y-2">
           <h3 class="text-sm font-bold px-1 flex items-center gap-1.5 text-[var(--color-text)]">
             <span>💡</span> 智能建議
           </h3>
           <div v-for="(s, i) in trainingSuggestions.slice(0, 3)" :key="i" 
                class="p-3 rounded-xl border-l-[3px] text-xs bg-[var(--color-surface)] shadow-sm"
                :class="s.priority === 'high' ? 'border-[var(--color-danger)]' : (s.priority === 'medium' ? 'border-[var(--color-warning)]' : 'border-[var(--color-success)]')">
                <div class="flex items-center gap-1.5 font-bold mb-1 text-[var(--color-text)]">
                   {{ COGNITIVE_DIMENSIONS[s.dimension].icon }} {{ COGNITIVE_DIMENSIONS[s.dimension].name }}
                </div>
                <p class="text-[var(--color-text-secondary)] leading-relaxed">{{ s.message }}</p>
           </div>
        </section>
        
        <!-- Nutrition (Mobile) -->
        <section class="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
           <h3 class="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-text)]">
             <span>🥗</span> 營養建議
           </h3>
           <div v-if="!nutritionUnlocked" class="text-center py-2">
             <div class="text-xl mb-1">🔒</div>
             <p class="text-xs text-[var(--color-text-muted)] mb-2">再玩 <span class="font-bold text-[var(--color-primary)]">{{ NUTRITION_UNLOCK_REQUIRED_TRAININGS - nutritionUnlockProgress }}</span> 場解鎖</p>
             <div class="w-32 h-1 bg-[var(--color-bg-muted)] rounded-full mx-auto overflow-hidden">
               <div class="h-full bg-[var(--color-success)]" :style="{ width: `${nutritionUnlockPercent}%` }"></div>
             </div>
           </div>
           <div v-else-if="nutritionResult">
              <div v-if="nutritionResult.recommendations.length > 0" class="space-y-2">
                 <div v-for="rec in nutritionResult.recommendations.slice(0,1)" :key="rec.id" class="p-2.5 bg-[var(--color-surface-alt)] rounded-lg border-l-2 border-[var(--color-primary)]">
                    <div class="font-bold text-xs text-[var(--color-text)] mb-0.5">{{ rec.supplement.name }}</div>
                    <p class="text-[10px] text-[var(--color-text-secondary)] leading-tight">{{ rec.reason }}</p>
                 </div>
                 <div class="text-center mt-2">
                    <span class="text-[10px] text-[var(--color-text-muted)]">更多建議請查看電腦版或完整報告</span>
                 </div>
              </div>
           </div>
        </section>

        <div class="h-8"></div>
      </main>
    </div>

    <!-- Desktop View -->
    <div v-else class="container-desktop mx-auto px-4 py-8 grid grid-cols-[280px_1fr] gap-8 items-start min-h-screen">
       <!-- Sidebar -->
       <aside class="sticky top-8 flex flex-col gap-4 h-[calc(100vh-4rem)]">
          <nav class="flex-1 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-3 overflow-y-auto no-scrollbar flex flex-col gap-1">
             <div class="px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">報告章節</div>
             <a v-for="section in reportSections" :key="section.id" href="#"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative"
                :class="activeSection === section.id ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-md font-medium' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]'"
                @click.prevent="scrollToSection(section.id)">
                <span class="text-lg relative z-10 transition-transform group-hover:scale-110">{{ section.icon }}</span>
                <span class="text-sm relative z-10">{{ section.name }}</span>
             </a>
          </nav>
          
          <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-md p-5">
             <div class="text-center mb-4">
               <div class="text-xs text-[var(--color-text-muted)] mb-1">報告日期</div>
               <div class="font-bold text-[var(--color-text)]">{{ formatDate(new Date()) }}</div>
             </div>
             <button @click="downloadReport" :disabled="isGenerating" class="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 shadow-lg hover:-translate-y-0.5 transition-transform">
                <span class="text-lg">{{ isGenerating ? '⏳' : '📥' }}</span>
                <span>{{ isGenerating ? '生成中...' : '下載完整報告' }}</span>
             </button>
             <router-link to="/weekly-report" class="btn btn-secondary w-full text-center block mt-3 py-2 text-sm">
                📅 查看週報
             </router-link>
          </div>
       </aside>

       <!-- Main Content -->
       <main class="space-y-8 min-w-0 pb-16">
          <!-- Disclaimer -->
          <div class="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30">
             <span class="text-xl">⚠️</span>
             <div>
                <h4 class="font-bold text-[var(--color-warning-text)] text-sm mb-1">醫療免責聲明</h4>
                <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">本報告數據基於遊戲表現估算，僅供自我健康管理參考，不可作為正式醫療診斷依據。</p>
             </div>
          </div>

          <!-- User Info Section -->
          <section id="user-info" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 relative overflow-hidden">
             <div class="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary-bg)]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
             <div class="relative z-10 flex items-center gap-8">
                <div class="w-24 h-24 rounded-full bg-[var(--gradient-primary)] text-[var(--color-text-inverse)] flex items-center justify-center text-5xl shadow-xl ring-4 ring-[var(--color-surface)]">👤</div>
                <div class="flex-1">
                   <h1 class="text-3xl font-bold text-[var(--color-text)] mb-2">{{ userStore.currentUser?.name }}</h1>
                   <div class="flex gap-3 text-sm text-[var(--color-text-secondary)]">
                      <span class="px-3 py-1 rounded-full bg-[var(--color-bg-soft)] border border-[var(--color-border)]">{{ userStore.userAge }} 歲</span>
                      <span class="px-3 py-1 rounded-full bg-[var(--color-bg-soft)] border border-[var(--color-border)]">教育程度：{{ userStore.currentUser?.educationYears || 0 }} 年</span>
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

          <!-- Normative Data -->
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

          <!-- Cognitive Analysis -->
          <section id="cognitive-analysis" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
             <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">🧠 認知能力分析</h3>
             <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div class="h-80 w-full"><RadarChart ref="radarChartRef" :scores="gameStore.cognitiveScores" :previousScores="previousScores" /></div>
                <div class="space-y-3">
                   <div v-for="dim in cognitiveDimensions" :key="dim.id" class="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors group">
                      <div class="w-10 h-10 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">{{ dim.icon }}</div>
                      <div class="flex-1">
                         <div class="flex justify-between mb-1.5">
                            <span class="font-bold text-[var(--color-text)]">{{ dim.name }}</span>
                            <span class="font-bold" :style="{ color: dim.color }">{{ gameStore.cognitiveScores[dim.id] }}</span>
                         </div>
                          <div class="h-2 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                             <div class="h-full rounded-full transition-all duration-1000 relative overflow-hidden" :style="{ width: `${gameStore.cognitiveScores[dim.id]}%`, backgroundColor: dim.color }">
                                <div class="absolute inset-0 bg-[var(--color-surface)]/20 animate-[shimmer_2s_infinite]"></div>
                             </div>
                          </div>
                      </div>
                      <div class="text-xl w-8 text-center" :title="getTrendIcon(dim.id) === '📈' ? '上升' : '下降'">{{ getTrendIcon(dim.id) }}</div>
                   </div>
                </div>
             </div>
          </section>

          <!-- Trends -->
          <section id="trends" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold flex items-center gap-2 text-[var(--color-text)]">📈 歷史趨勢</h3>
                <span class="text-xs bg-[var(--color-surface-alt)] px-3 py-1 rounded-full text-[var(--color-text-secondary)] font-medium">近 30 天</span>
             </div>
             <div class="h-72 w-full"><TrendChart ref="trendChartRef" :history="gameStore.scoreHistory" :showWarningLines="true" :professionalMode="false" /></div>
          </section>

          <!-- Statistics -->
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
                         <div class="text-2xl font-bold text-[var(--color-combo)]">{{ userStore.currentStats?.streak || 0 }}</div>
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
                         <div class="text-2xl font-bold text-[var(--color-combo)]">{{ userStore.currentStats?.streak || 0 }}</div>
                         <div class="text-xs text-[var(--color-text-muted)]">連續天數</div>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <!-- Mini-Cog (Desktop) -->
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
                               <div class="h-full bg-[var(--color-score)]" :style="{ width: `${(latestMiniCogResult.wordRecall.score/3)*100}%` }"></div>
                            </div>
                         </div>
                         <div class="p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                            <div class="flex justify-between items-center mb-2">
                               <span class="text-xs font-bold text-[var(--color-text-secondary)] uppercase">時鐘繪圖</span>
                               <span class="font-bold text-xl text-[var(--color-score)]">{{ latestMiniCogResult.clockDrawing.score }}<span class="text-sm text-[var(--color-text-muted)]">/2</span></span>
                            </div>
                            <div class="h-2 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                               <div class="h-full bg-[var(--color-score)]" :style="{ width: `${(latestMiniCogResult.clockDrawing.score/2)*100}%` }"></div>
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
                <!-- History Toggle -->
                <div v-if="miniCogHistory.length > 1" class="mt-6 pt-4 border-t border-[var(--color-border)]">
                   <button @click="showMiniCogHistory = !showMiniCogHistory" class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
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

          <!-- Correlation -->
          <section id="correlation" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
             <h3 class="text-lg font-bold mb-2 flex items-center gap-2 text-[var(--color-text)]">📐 關聯分析</h3>
             <p class="text-sm text-[var(--color-text-muted)] mb-6">Mini-Cog 篩檢與遊戲訓練表現對照</p>
             <MiniCogCorrelationChart :mini-cog-results="miniCogHistory" :game-sessions="gameStore.recentSessions" />
          </section>

          <!-- Games Grid -->
          <section id="games" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
             <h3 class="text-lg font-bold mb-6 text-[var(--color-text)]">🎮 各遊戲表現</h3>
             <div class="grid grid-cols-3 gap-4">
                <div v-for="game in gameStore.allGames" :key="game.id" class="p-4 bg-[var(--color-surface-alt)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-all border border-transparent hover:border-[var(--color-border)] group">
                   <div class="flex items-center gap-3 mb-3">
                      <span class="text-2xl group-hover:scale-110 transition-transform">{{ game.icon }}</span>
                      <span class="font-bold text-[var(--color-text)]">{{ game.name }}</span>
                   </div>
                   <div class="space-y-2 text-sm">
                      <div class="flex justify-between border-b border-[var(--color-border-light)] pb-2 mb-2">
                         <span class="text-[var(--color-text-muted)] text-xs">最佳</span>
                         <span class="font-bold text-[var(--color-text)]">{{ gameStore.getBestScore(game.id) || '-' }}</span>
                      </div>
                      <div class="flex justify-between">
                         <span class="text-[var(--color-text-muted)] text-xs">平均</span>
                         <span class="text-[var(--color-text)]">{{ gameStore.getAverageScore(game.id) || '-' }}</span>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <!-- Suggestions -->
          <section id="suggestions" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
             <h3 class="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text)]">💡 智能建議</h3>
             <div class="grid grid-cols-2 gap-4">
                <div v-for="(suggestion, index) in trainingSuggestions" :key="index"
                     class="p-4 rounded-xl border-l-4 shadow-sm transition-shadow hover:shadow-md"
                     :class="{
                       'border-[var(--color-danger)] bg-[var(--color-danger-bg)]': suggestion.priority === 'high',
                       'border-[var(--color-warning)] bg-[var(--color-warning-bg)]': suggestion.priority === 'medium',
                       'border-[var(--color-success)] bg-[var(--color-success-bg)]': suggestion.priority === 'low'
                     }">
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

          <!-- Nutrition -->
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
                <!-- Disclaimer Toggle -->
                <div class="bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 p-4 rounded-xl mb-6">
                   <div class="flex items-start gap-3">
                      <span class="text-xl">⚠️</span>
                      <div class="flex-1">
                         <p class="text-sm text-[var(--color-text)]">以下建議僅供參考，不構成醫療診斷。</p>
                         <button @click="showNutritionDisclaimer = !showNutritionDisclaimer" class="text-xs text-[var(--color-warning)] underline mt-1">{{ showNutritionDisclaimer ? '收起' : '完整免責聲明' }}</button>
                         <div v-if="showNutritionDisclaimer" class="mt-2 pt-2 border-t border-[var(--color-warning)]/30 text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">{{ NUTRITION_DISCLAIMER }}</div>
                      </div>
                   </div>
                </div>

                <!-- High Priority -->
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

                <!-- General Advice -->
                <div class="bg-[var(--color-success-bg)] p-5 rounded-xl border border-[var(--color-success)]/30">
                   <h4 class="text-sm font-bold text-[var(--color-success)] uppercase tracking-wider mb-3">一般建議</h4>
                   <ul class="grid grid-cols-2 gap-3">
                      <li v-for="(advice, i) in nutritionResult.generalAdvice" :key="i" class="text-sm text-[var(--color-text-secondary)] flex gap-2"><span class="text-[var(--color-success)] font-bold">✓</span> {{ advice }}</li>
                   </ul>
                </div>
             </div>
             
             <div v-else class="text-center py-8 text-[var(--color-text-muted)]">載入中...</div>
          </section>

          <!-- Recent Games -->
          <section id="recent" class="scroll-mt-24 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
             <h3 class="text-lg font-bold mb-4 text-[var(--color-text)]">🕐 最近遊戲記錄</h3>
             <div v-if="gameStore.recentSessions.length > 0" class="space-y-3">
                <div v-for="session in gameStore.recentSessions.slice(0, 5)" :key="session.id" class="flex items-center justify-between p-4 bg-[var(--color-surface-alt)] rounded-xl border border-transparent hover:border-[var(--color-border)] transition-colors">
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

  </div>
</template>

<script setup lang="ts">
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
import { type PersonalizedNutritionResult, type NutritionRecommendation, NUTRITION_DISCLAIMER } from '@/services/nutritionPlaceholder'
import { generateNutritionResultForUser } from '@/services/nutritionRecommendationService'

// 圖表元件
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import MiniCogCorrelationChart from '@/components/charts/MiniCogCorrelationChart.vue'
import {
  getTotalGamesPlayed,
  NUTRITION_UNLOCK_REQUIRED_TRAININGS,
  getNutritionUnlockPercent,
  getNutritionUnlockProgress
} from '@/utils/trainingStats'
import type { NutritionReportData } from '@/services/pdfService'

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
const nutritionResult = ref<PersonalizedNutritionResult | null>(null)
const showNutritionDisclaimer = ref(false)

// 檢查營養建議解鎖（完成指定訓練次數）
const nutritionUnlocked = computed(() => {
  const totalGames = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return totalGames >= NUTRITION_UNLOCK_REQUIRED_TRAININGS
})

const nutritionUnlockProgress = computed(() => {
  const totalGames = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return getNutritionUnlockProgress(totalGames)
})

const nutritionUnlockPercent = computed(() => {
  const totalGames = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return getNutritionUnlockPercent(totalGames)
})

const dailySessions = computed(() =>
  gameStore.sessions.filter(s => s.result?.mode === 'daily')
)

const freeSessions = computed(() =>
  gameStore.sessions.filter(s => s.result?.mode !== 'daily')
)

const dailyStats = computed(() => {
  const sessions = dailySessions.value
  const totalGames = sessions.length
  const totalPlayTime = sessions.reduce((sum: number, s) => sum + (s.result?.duration || 0), 0)
  const scores = sessions.map(s => s.result?.score).filter((v): v is number => typeof v === 'number')
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0
  return { totalGames, totalPlayTime, averageScore }
})

const freeStats = computed(() => {
  const sessions = freeSessions.value
  const totalGames = sessions.length
  const totalPlayTime = sessions.reduce((sum: number, s) => sum + (s.result?.duration || 0), 0)
  const scores = sessions.map(s => s.result?.score).filter((v): v is number => typeof v === 'number')
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0
  return { totalGames, totalPlayTime, averageScore }
})

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
  { id: 'nutrition', name: '營養建議', icon: '🥗' },
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
    'normal': { statusText: '表現良好 ?', statusClass: 'badge--success' },
    'warning': { statusText: '邊緣值 ?', statusClass: 'badge--warning' },
    'mci': { statusText: '需注意 ?', statusClass: 'badge--warning' },
    'dementia': { statusText: '建議諮詢 ?', statusClass: 'badge--danger' }
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
  if (score >= 80) return 'text-[var(--color-success)]'
  if (score >= 60) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-danger)]'
}

function getScoreLevelBg(score: number): string {
  if (score >= 80) return 'bg-[var(--color-surface)]/20 text-[var(--color-text-inverse)]'
  if (score >= 60) return 'bg-[var(--color-surface)]/20 text-[var(--color-text-inverse)]'
  return 'bg-[var(--color-surface)]/20 text-[var(--color-text-inverse)]'
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
  return score >= 4 ? 'text-[var(--color-success)]' : (score >= 3 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]')
}

function getMiniCogBorderClass(score: number): string {
  return score >= 4 ? 'border-[var(--color-success)]' : (score >= 3 ? 'border-[var(--color-warning)]' : 'border-[var(--color-danger)]')
}

function getMiniCogInterpretation(result: MiniCogResult) {
  const { riskLevel } = calculateMiniCogTotal(result.wordRecall.score, result.clockDrawing.score)
  return getRiskLevelDescription(riskLevel)
}

function getMiniCogInterpretationClass(result: MiniCogResult) {
  const { riskLevel } = calculateMiniCogTotal(result.wordRecall.score, result.clockDrawing.score)
  if (riskLevel === 'normal') return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]'
  if (riskLevel === 'borderline') return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]'
  return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]'
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

     let nutritionData: NutritionReportData | null = null
     if (nutritionUnlocked.value && nutritionResult.value) {
       nutritionData = {
         recommendations: nutritionResult.value.recommendations.map(r => ({
           name: r.supplement.name,
           reason: r.reason,
           priority: r.priority,
           dosage: r.supplement.dosageRange,
           isPartnerProduct: r.supplement.isPartnerProduct,
           partnerName: r.supplement.partnerName
         })),
         cognitiveAdvice: [...nutritionResult.value.cognitiveBasedAdvice, ...nutritionResult.value.ageBasedAdvice],
         generalAdvice: nutritionResult.value.generalAdvice
       }
     }

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
          includeNutrition: !!(nutritionUnlocked.value && nutritionData && nutritionData.recommendations.length > 0),
          language: 'bilingual',
          radarChartImage,
          trendChartImage
        },
        nutritionData
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
    
    // 生成營養建議（如已解鎖）
    if (nutritionUnlocked.value) {
      try {
        nutritionResult.value = await generateNutritionResultForUser({
          odId: userStore.currentUser.id,
          age: userStore.userAge || 65,
          educationYears: userStore.currentUser?.educationYears || 9,
          cognitiveScores: gameStore.cognitiveScores,
          sessions: gameStore.sessions
        })
      } catch (e) { 
        console.error('Failed generating nutrition recommendations', e) 
      }
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
.scroll-mt-24 {
  scroll-margin-top: 6rem;
}

/* 閃光動畫 */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>

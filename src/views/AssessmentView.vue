<template>
  <div 
    class="min-h-screen page-ambient flex flex-col transition-colors duration-300 font-sans h-screen overflow-hidden"
  >
    <!-- Header: Clean & Minimal -->
    <header class="bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] shrink-0 z-30 safe-area-top">
      <div class="px-4 sm:px-6">
        <div class="flex items-center justify-between h-14">
          <router-link 
            to="/" 
            class="btn btn-ghost -ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] gap-1 h-11 min-h-[44px]"
          >
            <span class="text-xl">←</span> <span class="text-sm font-medium">返回</span>
          </router-link>
          <h1 class="text-lg font-bold text-[var(--color-text)] tracking-wide">能力評估</h1>
          <div class="w-12"></div> <!-- Spacer for center alignment -->
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main 
      class="flex-1 w-full flex flex-col safe-area-bottom relative overflow-hidden"
    >
      
      <!-- 1. Mini-Cog Mode (Preserved Wrapper) -->
      <MiniCogFlow 
        v-if="stage === 'mini-cog'"
        :language="selectedLanguage"
        @complete="handleMiniCogComplete"
        @cancel="stage = 'select'"
        class="h-full w-full overflow-y-auto"
      />

      <!-- 2. Select Assessment Type -->
      <section v-else-if="stage === 'select'" class="flex-1 h-full flex flex-col gap-5 p-4 md:p-6 overflow-y-auto animate-fade-in w-full">
        <div class="shrink-0 space-y-1 pt-2">
           <h2 class="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
             <span>🧠</span> 選擇評估方式
           </h2>
           <p class="text-[var(--color-text-secondary)] text-sm">了解您的認知狀態，量身打造訓練計畫</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 shrink-0">
            <!-- Mini-Cog Card -->
            <button 
              class="card text-left p-5 relative group transition-all duration-300 border border-[var(--color-primary)]/20 hover:border-[var(--color-primary)] active:scale-[0.98] bg-[var(--color-surface)] shadow-sm min-h-[140px]"
              @click="startMiniCog"
            >
              <div class="absolute -top-2 -right-2 z-10">
                <span class="bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-xs font-bold px-2 py-1 rounded-lg shadow-sm animate-pulse">
                  推薦
                </span>
              </div>
              <div class="flex items-start gap-4">
                <div class="text-4xl bg-[var(--color-primary-bg)] w-14 h-14 flex items-center justify-center rounded-xl shrink-0">⏱️</div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-bold text-[var(--color-text)] leading-tight mb-1">Mini-Cog™ 快篩</h3>
                  <div class="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] mt-2">
                    <span class="bg-[var(--color-primary-bg)] px-2 py-1 rounded text-sm">⚡ 3 分鐘</span>
                  </div>
                </div>
              </div>
              <p class="text-sm text-[var(--color-text-secondary)] mt-4 leading-relaxed line-clamp-2">
                透過詞語記憶與畫鐘測驗，快速篩檢認知功能狀態。
              </p>
            </button>

            <!-- Full Assessment Card -->
            <button 
              class="card text-left p-5 group transition-all duration-300 border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 active:scale-[0.98] bg-[var(--color-surface)] shadow-sm min-h-[140px]"
              @click="stage = 'intro'"
            >
              <div class="flex items-start gap-4">
                <div class="text-4xl bg-[var(--color-bg-muted)] w-14 h-14 flex items-center justify-center rounded-xl shrink-0">📋</div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-bold text-[var(--color-text)] leading-tight mb-1">完整能力評估</h3>
                  <div class="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] mt-2">
                    <span class="bg-[var(--color-bg-muted)] px-2 py-1 rounded text-sm">🎯 5 分鐘</span>
                  </div>
                </div>
              </div>
              <p class="text-sm text-[var(--color-text-secondary)] mt-4 leading-relaxed line-clamp-2">
                全面測試反應、記憶與邏輯能力，提供詳細雷達圖分析。
              </p>
            </button>
        </div>

        <!-- Language Selector -->
        <div class="flex items-center gap-3 shrink-0 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] mt-2">
          <label class="text-base font-medium text-[var(--color-text-muted)] whitespace-nowrap">Mini-Cog 語言</label>
          <div class="relative flex-1">
            <select 
              v-model="selectedLanguage" 
              class="w-full appearance-none bg-transparent text-[var(--color-text)] py-2 pl-2 pr-8 focus:outline-none text-base font-medium h-12"
            >
              <option value="zh-TW">繁體中文</option>
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center text-[var(--color-text-muted)]">
              <svg class="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        <!-- History Hint -->
        <div v-if="hasRecentMiniCog" class="mt-auto pt-4 shrink-0 pb-2">
          <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
              <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm text-lg">📊</div>
              <div>
                <p class="font-bold text-[var(--color-success)] text-sm mb-0.5">最近記錄</p>
                <p class="text-sm text-[var(--color-text-secondary)] opacity-80">{{ formatRecentMiniCogDate }}</p>
              </div>
            </div>
            <button 
              class="btn btn-sm btn-outline border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white h-12 min-h-[48px] px-5 text-base"
              @click="viewMiniCogHistory"
            >
              查看
            </button>
          </div>
        </div>
      </section>

      <!-- 3. Intro Stage -->
      <section v-else-if="stage === 'intro'" class="flex-1 flex flex-col p-4 md:p-6 w-full animate-slide-up overflow-y-auto">
        <div class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-lg flex flex-col min-h-full sm:min-h-0 rounded-2xl">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-[var(--color-primary-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner shrink-0">
              🧠
            </div>
            <h2 class="text-2xl font-bold mb-3 text-[var(--color-text)]">準備好了嗎？</h2>
            <p class="text-[var(--color-text-secondary)] text-base leading-relaxed">
              將進行三個簡單測驗，<br/>幫助系統了解您目前的狀態。
            </p>
          </div>
          
          <div class="space-y-4 mb-8 flex-1">
            <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
              <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">⚡</span>
              <div>
                <div class="font-bold text-[var(--color-text)] text-lg">反應力</div>
                <div class="text-sm text-[var(--color-text-muted)] mt-1">快速選擇看到的顏色</div>
              </div>
            </div>
            <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
              <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">🧠</span>
              <div>
                <div class="font-bold text-[var(--color-text)] text-lg">記憶力</div>
                <div class="text-sm text-[var(--color-text-muted)] mt-1">記住數字序列並輸入</div>
              </div>
            </div>
            <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
              <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">🧩</span>
              <div>
                <div class="font-bold text-[var(--color-text)] text-lg">邏輯力</div>
                <div class="text-sm text-[var(--color-text-muted)] mt-1">簡單的數學計算</div>
              </div>
            </div>
          </div>
          
          <div class="space-y-4 shrink-0">
            <button @click="startAssessment" class="btn btn-primary btn-lg w-full text-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all min-h-[60px]">
              開始測試
            </button>
            <button @click="stage = 'select'" class="btn btn-ghost w-full min-h-[50px] text-[var(--color-text-muted)] text-base">
              稍後再說
            </button>
          </div>
        </div>
      </section>

      <!-- 4. Testing Stage (Optimized Layout for Elderly) -->
      <div v-else-if="stage === 'testing'" class="flex-1 flex flex-col w-full p-3 md:p-6 h-full overflow-hidden bg-[var(--color-bg)]">
        
        <!-- Progress Header -->
        <div class="mb-3 shrink-0 rounded-xl bg-[var(--color-surface)]/90 border border-[var(--color-border)]/70 px-4 py-3 shadow-sm z-10">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-[var(--color-primary)] bg-[var(--color-primary-bg)] px-3 py-1.5 rounded-lg">
              {{ questionTypeLabel }}
            </span>
            <span class="text-sm font-medium text-[var(--color-text-muted)] tracking-wider">
              <span class="text-xl font-bold text-[var(--color-text)]">{{ currentIndex + 1 }}</span>
              <span class="opacity-40 mx-1">/</span>
              <span>{{ questions.length }}</span>
            </span>
          </div>
          <div class="h-3 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
            <div 
              class="h-full bg-[var(--color-primary)] transition-all duration-500 ease-out rounded-full"
              :style="{ width: `${((currentIndex + 1) / questions.length) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Question Card -->
        <div ref="questionCardRef" class="card flex-1 flex flex-col relative overflow-hidden shadow-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] rounded-2xl">
          <!-- Timer Bar (Top) -->
          <div class="absolute top-0 left-0 w-full h-2 bg-[var(--color-bg-muted)] z-20">
            <div 
              class="h-full transition-all duration-1000 linear"
              :class="timeLeft <= 3 ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-primary)]'"
              :style="{ width: `${(timeLeft / (currentQuestion?.timeLimit || 10)) * 100}%` }"
            ></div>
          </div>

          <!-- Scrollable Content Area -->
          <div ref="questionScrollRef" class="flex-1 flex flex-col p-4 w-full h-full overflow-y-auto">
            
            <!-- Reaction Type -->
            <template v-if="currentQuestion?.type === 'reaction'">
              <div class="flex flex-col h-full">
                <!-- Question Title (Fixed) -->
                <div class="shrink-0 mb-4 text-center">
                   <h3 class="text-2xl md:text-3xl text-[var(--color-text)] font-bold tracking-tight leading-tight">
                     {{ currentQuestion.question }}
                   </h3>
                </div>
                
                <!-- Color Block (Flexible Height - can shrink) -->
                <div class="flex-1 min-h-[80px] flex flex-col justify-center mb-6">
                  <div 
                    class="w-full h-full max-h-[35vh] rounded-3xl shadow-sm flex items-center justify-center transform transition-all duration-300 border-4 border-white/20 relative overflow-hidden"
                    :style="{ 
                      backgroundColor: currentQuestion.data?.displayColor as string,
                      boxShadow: `0 10px 30px -10px ${currentQuestion.data?.displayColor}`
                    }"
                  >
                    <span class="text-5xl md:text-7xl font-black text-white drop-shadow-lg tracking-widest z-10">
                      {{ currentQuestion.data?.displayText }}
                    </span>
                  </div>
                </div>

                <!-- Options (Fixed Bottom - LARGE BUTTONS) -->
                <div class="grid grid-cols-2 gap-4 shrink-0 mt-auto">
                  <button
                    v-for="option in currentQuestion.options"
                    :key="option"
                    @click="submitAnswer(option)"
                    class="btn btn-secondary text-2xl md:text-3xl font-bold border-2 border-transparent hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)] transition-all active:scale-95 py-6 min-h-[80px] md:min-h-[100px] rounded-2xl shadow-sm"
                    :disabled="isSubmitting"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
            </template>

            <!-- Memory Type -->
            <template v-else-if="currentQuestion?.type === 'memory'">
              <div class="flex flex-col h-full items-center justify-center text-center">
                 <!-- Question Title -->
                <h3 class="text-2xl md:text-3xl text-[var(--color-text)] mb-8 font-bold shrink-0">
                  {{ currentQuestion.question }}
                </h3>
                
                <div class="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto">
                  <!-- Display Phase -->
                  <div v-if="memoryPhase === 'display'" class="w-full flex flex-col items-center animate-fade-in">
                    <div class="text-[clamp(4rem,18vw,6rem)] font-black text-[var(--color-primary)] tracking-[0.15em] mb-10 select-none leading-none">
                      {{ currentQuestion.data?.sequence }}
                    </div>
                    <div class="w-full max-w-[240px] bg-[var(--color-bg-muted)] h-3 rounded-full overflow-hidden">
                       <div class="h-full bg-[var(--color-primary)] animate-[shrink_3s_linear_forwards]"></div>
                    </div>
                  </div>
                  
                  <!-- Input Phase -->
                  <div v-else class="w-full flex flex-col items-center animate-fade-in">
                    <input
                      v-model="memoryInput"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      class="input text-center text-5xl font-bold tracking-[0.3em] h-24 w-full mb-8 rounded-2xl shadow-inner bg-[var(--color-bg-soft)] border-2 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
                      placeholder="____"
                      @keyup.enter="submitAnswer(memoryInput)"
                      ref="memoryInputRef"
                      autocomplete="off"
                    />
                    <button
                      @click="submitAnswer(memoryInput)"
                      class="btn btn-primary btn-lg w-full shadow-lg py-5 min-h-[70px] text-2xl font-bold rounded-2xl"
                      :disabled="!memoryInput || isSubmitting"
                    >
                      確認答案
                    </button>
                  </div>
                </div>
                <!-- Spacer -->
                <div class="h-10 shrink-0"></div>
              </div>
            </template>

            <!-- Logic Type -->
            <template v-else-if="currentQuestion?.type === 'logic'">
               <div class="flex flex-col h-full">
                <!-- Title -->
                <div class="shrink-0 mb-4 text-center">
                  <h3 class="text-2xl md:text-3xl text-[var(--color-text)] font-bold">請計算結果</h3>
                </div>
                
                <!-- Calculation Display (Flexible - can shrink) -->
                <div class="flex-1 flex items-center justify-center mb-6 min-h-[80px]">
                  <div class="w-full bg-[var(--color-accent-purple)]/5 border-2 border-[var(--color-accent-purple)]/20 rounded-3xl p-4 flex items-center justify-center h-full max-h-[35vh]">
                    <!-- Use standard break words to prevent overflow, and clamp for sizing -->
                    <div class="text-[clamp(2.5rem,12vw,4.5rem)] font-black text-[var(--color-accent-purple)] tracking-wider leading-none text-center break-words w-full">
                      {{ currentQuestion.question }}
                    </div>
                  </div>
                </div>

                <!-- Options (LARGE BUTTONS) -->
                <div class="grid grid-cols-2 gap-4 shrink-0 mt-auto">
                  <button
                    v-for="option in currentQuestion.options"
                    :key="option"
                    @click="submitAnswer(option)"
                    class="btn btn-secondary text-3xl md:text-4xl font-bold border-2 border-transparent hover:border-[var(--color-accent-purple)] hover:text-[var(--color-accent-purple)] active:scale-95 py-6 min-h-[80px] md:min-h-[100px] rounded-2xl shadow-sm"
                    :disabled="isSubmitting"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 5. Mini-Cog Result -->
      <section v-else-if="stage === 'mini-cog-result'" class="flex-1 flex flex-col w-full animate-fade-in p-4 md:p-6 overflow-y-auto">
        <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-lg my-auto">
          <div class="mb-4 inline-block p-4 rounded-full bg-[var(--color-success-bg)] text-4xl shadow-sm">
            🎉
          </div>
          <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">篩檢完成</h2>
          <p class="text-[var(--color-text-secondary)] mb-6 text-base">您的認知篩檢結果如下</p>
          
          <div class="bg-[var(--color-bg-soft)] rounded-2xl p-5 mb-5 border border-[var(--color-border)] relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-[var(--color-primary)]/20"></div>
            <div class="text-5xl font-black text-[var(--color-primary)] mb-1 tracking-tighter">
              {{ recentMiniCogResult?.totalScore }}<span class="text-2xl text-[var(--color-text-muted)] font-medium">/5</span>
            </div>
            <div class="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">總分</div>
            
            <div class="grid grid-cols-2 gap-px bg-[var(--color-border)] mt-5 rounded-xl overflow-hidden border border-[var(--color-border)]">
              <div class="bg-[var(--color-surface)] p-4">
                <div class="text-xl font-bold text-[var(--color-text)]">
                  {{ recentMiniCogResult?.wordRecall.score }} / 3
                </div>
                <div class="text-xs text-[var(--color-text-muted)] mt-1">詞語回憶</div>
              </div>
              <div class="bg-[var(--color-surface)] p-4">
                <div class="text-xl font-bold text-[var(--color-text)]">
                  {{ recentMiniCogResult?.clockDrawing.score }} / 2
                </div>
                <div class="text-xs text-[var(--color-text-muted)] mt-1">時鐘繪圖</div>
              </div>
            </div>
          </div>

          <div class="bg-[var(--color-info-bg)]/30 rounded-xl p-4 mb-6 text-left border border-[var(--color-info-bg)] flex gap-4">
            <span class="text-2xl shrink-0 mt-0.5">💡</span>
            <p class="text-[var(--color-text-primary)] text-base leading-relaxed">
              <span class="font-bold block mb-1 text-[var(--color-info)]">系統建議</span>
              已根據結果調整遊戲難度。建議每天進行 15 分鐘認知訓練。
            </p>
          </div>

          <div class="space-y-4">
            <button @click="startDailyTraining" class="btn btn-primary btn-lg w-full shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all min-h-[60px] text-xl font-bold">
              開始今日訓練
            </button>
            <button @click="viewReport" class="btn btn-ghost w-full text-base min-h-[50px]">
              查看詳細報告
            </button>
          </div>
        </div>
      </section>

      <!-- 6. Full Assessment Result -->
      <section v-else-if="stage === 'result'" class="flex-1 flex flex-col w-full animate-fade-in p-4 md:p-6 overflow-y-auto">
        <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-lg my-auto">
          <div class="mb-3 inline-block p-4 rounded-full bg-[var(--color-primary-bg)] text-4xl shadow-sm">
            🏆
          </div>
          <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">能力評估完成！</h2>
          <p class="text-[var(--color-text-secondary)] mb-6 text-base">您的各項能力分析</p>

          <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
              <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">⚡</div>
              <div class="text-2xl font-black text-[var(--color-reaction)]">{{ result?.scores.reaction }}</div>
              <div class="text-xs uppercase font-bold text-[var(--color-text-muted)] mt-1">反應力</div>
            </div>
            <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
              <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">🧠</div>
              <div class="text-2xl font-black text-[var(--color-memory)]">{{ result?.scores.memory }}</div>
              <div class="text-xs uppercase font-bold text-[var(--color-text-muted)] mt-1">記憶力</div>
            </div>
            <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
              <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">🧩</div>
              <div class="text-2xl font-black text-[var(--color-logic)]">{{ result?.scores.logic }}</div>
              <div class="text-xs uppercase font-bold text-[var(--color-text-muted)] mt-1">邏輯力</div>
            </div>
          </div>

          <div class="bg-[var(--color-surface-alt)] rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-base border border-[var(--color-border)]">
             <div class="border-r border-[var(--color-border)] pr-2">
               <div class="text-[var(--color-text-muted)] text-xs mb-1 uppercase tracking-wider">答對題數</div>
               <div class="font-bold text-lg text-[var(--color-text)]">{{ result?.correctCount }} <span class="text-sm font-normal opacity-60">/ {{ result?.totalQuestions }}</span></div>
             </div>
             <div class="pl-2">
               <div class="text-[var(--color-text-muted)] text-xs mb-1 uppercase tracking-wider">平均反應</div>
               <div class="font-bold text-lg text-[var(--color-text)]">{{ ((result?.averageReactionTime ?? 0) / 1000).toFixed(1) }}s</div>
             </div>
          </div>

          <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-xl p-5 mb-8 text-left relative overflow-hidden">
            <div class="absolute right-0 top-0 opacity-10 text-7xl transform translate-x-1/4 -translate-y-1/4">🎯</div>
            <h3 class="font-bold text-[var(--color-success)] text-xs uppercase tracking-wider mb-2">建議訓練難度</h3>
            <div class="text-4xl font-black text-[var(--color-success)] mb-2">
              {{ difficultyLabel }}
            </div>
            <p class="text-[var(--color-text-primary)] text-base opacity-90 leading-relaxed">
              {{ difficultyDescription }}
            </p>
          </div>

          <div class="flex gap-4 justify-center">
            <button @click="saveAndContinue" class="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-h-[60px] text-xl font-bold">
              儲存並開始
            </button>
            <button @click="retakeAssessment" class="btn btn-ghost px-5 btn-lg min-h-[60px] text-lg">
              重測
            </button>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore, useUserStore } from '@/stores'
import { DIFFICULTIES } from '@/types/game'
import MiniCogFlow from '@/components/assessment/MiniCogFlow.vue'
import { getLatestMiniCogResult, saveBaselineAssessment, generateId } from '@/services/db'
import { syncBaselineAssessmentToSheet } from '@/services/userDataSheetSyncService'
import type { MiniCogResult } from '@/services/miniCogService'
import {
  generateAssessmentQuestions,
  calculateAssessmentResult,
  getDifficultyDescription,
  type AssessmentQuestion,
  type AssessmentAnswer,
  type AssessmentResult,
} from '@/services/assessmentService'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

// 狀態
const stage = ref<'select' | 'mini-cog' | 'intro' | 'testing' | 'result' | 'mini-cog-result'>('select')
const questions = ref<AssessmentQuestion[]>([])
const answers = ref<AssessmentAnswer[]>([])
const currentIndex = ref(0)
const timeLeft = ref(0)
const isSubmitting = ref(false)
const result = ref<AssessmentResult | null>(null)

// Mini-Cog 相關
const selectedLanguage = ref<'zh-TW' | 'zh-CN' | 'en'>('zh-TW')
const recentMiniCogResult = ref<MiniCogResult | null>(null)

// 記憶題專用
const memoryPhase = ref<'display' | 'input'>('display')
const memoryInput = ref('')
const memoryInputRef = ref<HTMLInputElement | null>(null)
const questionScrollRef = ref<HTMLDivElement | null>(null)
const questionCardRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  const mode = String(route.query.mode || '').toLowerCase()
  if (mode === 'mini-cog' || mode === 'minicog') {
    stage.value = 'mini-cog'
    return
  }

  if (mode === 'quick' || mode === 'full' || mode === 'quick-assessment' || mode === 'quickassessment') {
    stage.value = 'intro'
  }
})

// 計時器
let timer: ReturnType<typeof setInterval> | null = null
let questionStartTime = 0

// 計算屬性
const currentQuestion = computed(() => questions.value[currentIndex.value])

const questionTypeLabel = computed(() => {
  switch (currentQuestion.value?.type) {
    case 'reaction': return '⚡ 反應力'
    case 'memory': return '🧠 記憶力'
    case 'logic': return '🧩 邏輯力'
    default: return ''
  }
})

const difficultyLabel = computed(() => {
  if (!result.value) return ''
  return DIFFICULTIES[result.value.suggestedDifficulty].name
})

const difficultyDescription = computed(() => {
  if (!result.value) return ''
  return getDifficultyDescription(result.value.suggestedDifficulty)
})

// Mini-Cog 相關計算屬性
const hasRecentMiniCog = computed(() => recentMiniCogResult.value !== null)

const formatRecentMiniCogDate = computed(() => {
  if (!recentMiniCogResult.value) return ''
  const date = new Date(recentMiniCogResult.value.completedAt)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Mini-Cog 方法
function startMiniCog() {
  stage.value = 'mini-cog'
}

function handleMiniCogComplete(miniCogResult: MiniCogResult) {
  recentMiniCogResult.value = miniCogResult
  // 根據 Mini-Cog 分數設定建議難度
  let suggestedDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
  if (miniCogResult.totalScore >= 4) {
    suggestedDifficulty = 'hard'
  } else if (miniCogResult.totalScore <= 2) {
    suggestedDifficulty = 'easy'
  }
  
  settingsStore.setAssessmentResult({
    suggestedDifficulty,
    completedAt: miniCogResult.completedAt,
    scores: {
      reaction: miniCogResult.totalScore * 20,
      memory: miniCogResult.wordRecall.score * 33,
      logic: miniCogResult.clockDrawing.score * 50
    }
  })
  
  stage.value = 'mini-cog-result'
}

function startDailyTraining() {
  router.push('/daily-challenge')
}

function viewReport() {
  router.push('/report')
}

function viewMiniCogHistory() {
  router.push('/report')
}

async function loadRecentMiniCog() {
  if (!userStore.currentUser?.id) return
  try {
    recentMiniCogResult.value = await getLatestMiniCogResult(userStore.currentUser.id) || null
  } catch (error) {
    console.error('Failed to load recent Mini-Cog result:', error)
  }
}

// 開始評估
function startAssessment() {
  questions.value = generateAssessmentQuestions()
  answers.value = []
  currentIndex.value = 0
  stage.value = 'testing'
  // 重置滾動位置
  nextTick(() => {
     window.scrollTo(0, 0)
  })
  startQuestion()
}

// 開始單一題目
function startQuestion() {
  const q = currentQuestion.value
  if (!q) return

  timeLeft.value = q.timeLimit
  questionStartTime = Date.now()
  isSubmitting.value = false
  
  // 確保滾動回到頂部，解決換題看不到題目的問題
  nextTick(() => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
    if (questionScrollRef.value) {
      questionScrollRef.value.scrollTop = 0
    }
  })

  // 記憶題特殊處理
  if (q.type === 'memory') {
    memoryPhase.value = 'display'
    memoryInput.value = ''
    
    // 顯示一段時間後進入輸入階段
    const displayTime = (q.data?.displayTime as number) || 3000
    setTimeout(() => {
      memoryPhase.value = 'input'
      nextTick(() => {
        memoryInputRef.value?.focus()
      })
    }, displayTime)
  }

  // 開始倒數
  startTimer()
}

// 倒數計時器
function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      // 時間到，自動提交空答案
      submitAnswer(null)
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 提交答案
function submitAnswer(answer: string | number | null) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  stopTimer()

  const q = currentQuestion.value
  if (!q) return

  const reactionTime = Date.now() - questionStartTime
  const isCorrect = answer !== null && String(answer) === String(q.correctAnswer)

  answers.value.push({
    questionId: q.id,
    userAnswer: answer,
    isCorrect,
    reactionTime,
  })

  // 下一題或結束
  setTimeout(() => {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
      startQuestion()
    } else {
      finishAssessment()
    }
  }, 300)
}

// 完成評估
function finishAssessment() {
  stopTimer()
  result.value = calculateAssessmentResult(questions.value, answers.value)
  stage.value = 'result'
}

// 儲存結果並繼續
async function saveAndContinue() {
  if (result.value) {
    settingsStore.setAssessmentResult({
      suggestedDifficulty: result.value.suggestedDifficulty,
      completedAt: result.value.completedAt,
      scores: result.value.scores,
    })

    const odId = userStore.currentUser?.id
    if (odId) {
      const overallLevel = result.value.suggestedDifficulty === 'hard'
        ? 'advanced'
        : result.value.suggestedDifficulty === 'medium'
          ? 'intermediate'
          : 'beginner'

      const baseline = {
        id: generateId(),
        odId,
        assessedAt: result.value.completedAt,
        cognitiveScores: {
          reaction: result.value.scores.reaction,
          logic: result.value.scores.logic,
          memory: result.value.scores.memory,
          cognition: 0,
          coordination: 0,
          attention: 0,
        },
        suggestedDifficulties: {},
        overallLevel,
        gamesPlayed: [],
      }

      await saveBaselineAssessment({ ...baseline, overallLevel: overallLevel as 'beginner' | 'intermediate' | 'advanced' })
      await syncBaselineAssessmentToSheet({ ...baseline, overallLevel: overallLevel as 'beginner' | 'intermediate' | 'advanced' })
    }
  }
  // 引導至每日訓練，讓用戶可以直接開始個人化訓練
  router.push('/daily-challenge')
}

// 重新測試
function retakeAssessment() {
  stage.value = 'select'
  result.value = null
}

// 生命週期
onMounted(() => {
  loadRecentMiniCog()
})

// 監聽頁面離開
watch(stage, (newStage: string) => {
  if (newStage !== 'testing') {
    stopTimer()
  }
})
</script>

<style scoped>
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>

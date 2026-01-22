<template>
  <div 
    class="min-h-screen bg-[var(--color-bg)] flex flex-col transition-colors duration-300 font-sans"
    :class="{ 'h-screen overflow-hidden': stage === 'mini-cog' }"
  >
    <!-- Header: Clean & Minimal -->
    <header class="bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)] sticky top-0 z-30 safe-area-top">
      <div class="px-4 sm:px-6">
        <div class="flex items-center justify-between h-14">
          <router-link 
            to="/" 
            class="btn btn-ghost btn-sm -ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] gap-1"
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
      class="flex-1 w-full px-3 py-2 sm:px-4 flex flex-col safe-area-bottom"
      :class="{ 'overflow-hidden p-0': stage === 'mini-cog' }"
    >
      
      <!-- 1. Mini-Cog Mode (Preserved Wrapper) -->
      <MiniCogFlow 
        v-if="stage === 'mini-cog'"
        :language="selectedLanguage"
        @complete="handleMiniCogComplete"
        @cancel="stage = 'select'"
        class="h-full"
      />

      <!-- 2. Select Assessment Type -->
      <section v-else-if="stage === 'select'" class="flex-1 flex flex-col gap-3 animate-fade-in">
        <div class="text-center sm:text-left py-1">
          <div class="text-4xl mb-1 filter drop-shadow-sm">🧠</div>
          <h2 class="text-xl font-bold text-[var(--color-text)] mb-0.5">選擇評估方式</h2>
          <p class="text-[var(--color-text-secondary)] text-sm">了解您的認知狀態，量身打造訓練計畫</p>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <!-- Mini-Cog Card -->
          <button 
            class="card text-left p-4 relative group transition-all duration-300 border border-[var(--color-primary)]/20 hover:border-[var(--color-primary)] hover:shadow-lg bg-[var(--color-surface)] overflow-visible"
            @click="startMiniCog"
          >
            <div class="absolute -top-3 -right-3">
              <span class="bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse">
                推薦
              </span>
            </div>
            <div class="flex items-start gap-3">
              <div class="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 bg-[var(--color-primary-bg)] w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl shrink-0">⏱️</div>
              <div>
                <h3 class="text-base font-bold text-[var(--color-text)] mb-0.5 group-hover:text-[var(--color-primary)] transition-colors">Mini-Cog™ 快篩</h3>
                <div class="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-bg)]/50 px-2 py-0.5 rounded-md w-fit mb-1">
                  <span>⚡ 3 分鐘</span>
                  <span>•</span>
                  <span>國際標準</span>
                </div>
              </div>
            </div>
            <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
              透過詞語記憶與畫鐘測驗，快速篩檢認知功能狀態。
            </p>
          </button>

          <!-- Full Assessment Card -->
          <button 
            class="card text-left p-4 group transition-all duration-300 border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-lg bg-[var(--color-surface)]"
            @click="stage = 'intro'"
          >
            <div class="flex items-start gap-3">
              <div class="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 bg-[var(--color-bg-muted)] w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl shrink-0">📋</div>
              <div>
                <h3 class="text-base font-bold text-[var(--color-text)] mb-0.5 group-hover:text-[var(--color-primary)] transition-colors">完整能力評估</h3>
                <div class="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-muted)]/50 px-2 py-0.5 rounded-md w-fit mb-1">
                  <span>🎯 5 分鐘</span>
                  <span>•</span>
                  <span>綜合分析</span>
                </div>
              </div>
            </div>
            <p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
              全面測試反應、記憶與邏輯能力，提供詳細雷達圖分析。
            </p>
          </button>
        </div>

        <!-- Language Selector -->
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <label class="text-xs font-medium text-[var(--color-text-muted)]">Mini-Cog 語言：</label>
          <div class="relative">
            <select 
              v-model="selectedLanguage" 
              class="appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] py-1.5 pl-3 pr-8 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-xs font-medium shadow-sm min-h-[36px]"
            >
              <option value="zh-TW">繁體中文</option>
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-text-muted)]">
              <svg class="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        <!-- History Hint -->
        <div v-if="hasRecentMiniCog" class="animate-slide-up mt-auto">
          <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-2">
              <div class="bg-white rounded-full p-1.5 shadow-sm text-base">📊</div>
              <div>
                <p class="font-bold text-[var(--color-success)] text-xs">最近記錄</p>
                <p class="text-[10px] text-[var(--color-text-secondary)] opacity-80">{{ formatRecentMiniCogDate }}</p>
              </div>
            </div>
            <button 
              class="btn btn-sm btn-outline border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white px-3 text-xs h-8 min-h-0"
              @click="viewMiniCogHistory"
            >
              查看
            </button>
          </div>
        </div>
      </section>

      <!-- 3. Intro Stage -->
      <section v-else-if="stage === 'intro'" class="flex-1 flex flex-col animate-slide-up w-full max-w-lg mx-auto py-2">
        <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 text-center shadow-lg flex flex-col h-full sm:h-auto">
          <div class="w-12 h-12 bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center mx-auto mb-2 text-2xl shadow-inner shrink-0">
            🧠
          </div>
          <h2 class="text-lg font-bold mb-1 text-[var(--color-text)]">準備好了嗎？</h2>
          <p class="text-[var(--color-text-secondary)] mb-4 leading-relaxed text-xs sm:text-sm">
            我們將進行三個簡單的測驗，<br/>幫助系統了解您目前的狀態。
          </p>
          
          <div class="space-y-2 mb-6 flex-1 sm:flex-none overflow-y-auto">
            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
              <span class="text-lg bg-white rounded-lg p-1 shadow-sm">⚡</span>
              <div class="text-left">
                <div class="font-bold text-[var(--color-text)] text-sm">反應力</div>
                <div class="text-[10px] text-[var(--color-text-muted)]">快速選擇看到的顏色</div>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
              <span class="text-lg bg-white rounded-lg p-1 shadow-sm">🧠</span>
              <div class="text-left">
                <div class="font-bold text-[var(--color-text)] text-sm">記憶力</div>
                <div class="text-[10px] text-[var(--color-text-muted)]">記住數字序列並輸入</div>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
              <span class="text-lg bg-white rounded-lg p-1 shadow-sm">🧩</span>
              <div class="text-left">
                <div class="font-bold text-[var(--color-text)] text-sm">邏輯力</div>
                <div class="text-[10px] text-[var(--color-text-muted)]">簡單的數學計算</div>
              </div>
            </div>
          </div>
          
          <div class="space-y-2 mt-auto sm:mt-0">
            <button @click="startAssessment" class="btn btn-primary btn-lg w-full text-base shadow-lg hover:shadow-xl transform transition hover:-translate-y-1">
              開始測試
            </button>
            <button @click="stage = 'select'" class="btn btn-ghost w-full btn-sm">
              稍後再說
            </button>
          </div>
        </div>
      </section>

      <!-- 4. Testing Stage -->
      <div v-else-if="stage === 'testing'" class="flex-1 flex flex-col w-full py-1 max-w-lg mx-auto h-full overflow-hidden">
        <!-- Progress Header -->
        <div class="mb-2 px-1 shrink-0">
          <div class="flex justify-between items-end mb-1">
            <span class="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-bg)] px-2 py-0.5 rounded-full">
              {{ questionTypeLabel }}
            </span>
            <span class="text-[10px] font-medium text-[var(--color-text-muted)] tracking-wider">
              {{ currentIndex + 1 }} <span class="text-[9px] opacity-60">/</span> {{ questions.length }}
            </span>
          </div>
          <div class="h-1 bg-[var(--color-bg-muted)] rounded-full overflow-hidden shadow-inner">
            <div 
              class="h-full bg-[var(--color-primary)] transition-all duration-500 ease-out rounded-full"
              :style="{ width: `${((currentIndex + 1) / questions.length) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Question Card -->
        <div class="card flex-1 flex flex-col relative overflow-hidden shadow-lg border border-[var(--color-border-light)] min-h-0">
          <!-- Timer Bar (Top) -->
          <div class="absolute top-0 left-0 w-full h-1 bg-[var(--color-bg-muted)] z-20">
            <div 
              class="h-full transition-all duration-1000 linear"
              :class="timeLeft <= 3 ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-primary)]'"
              :style="{ width: `${(timeLeft / (currentQuestion?.timeLimit || 10)) * 100}%` }"
            ></div>
          </div>

          <!-- Timer Badge -->
          <div class="absolute top-2 right-2 z-10">
             <div 
               class="flex items-center justify-center w-7 h-7 rounded-full font-bold text-[10px] shadow-sm transition-all duration-300 border-2"
               :class="timeLeft <= 3 
                 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)] scale-110' 
                 : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]'"
             >
               {{ timeLeft }}
             </div>
           </div>
          
          <div class="flex-1 flex flex-col items-center justify-center p-3 text-center overflow-y-auto">
            
            <!-- Reaction Type -->
            <template v-if="currentQuestion?.type === 'reaction'">
              <h3 class="text-base text-[var(--color-text)] mb-3 font-bold">{{ currentQuestion.question }}</h3>
              
              <div 
                class="w-full aspect-video max-h-32 rounded-xl shadow-md mb-4 flex items-center justify-center transform transition-all duration-300"
                :style="{ 
                  backgroundColor: currentQuestion.data?.displayColor as string,
                  boxShadow: `0 8px 20px -8px ${currentQuestion.data?.displayColor}`
                }"
              >
                <span class="text-3xl font-black text-white drop-shadow-md tracking-widest">
                  {{ currentQuestion.data?.displayText }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 w-full mt-auto">
                <button
                  v-for="option in currentQuestion.options"
                  :key="option"
                  @click="submitAnswer(option)"
                  class="btn btn-secondary btn-lg text-sm font-bold border-2 border-transparent hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)] transition-all active:scale-95 py-2 min-h-[48px]"
                  :disabled="isSubmitting"
                >
                  {{ option }}
                </button>
              </div>
            </template>

            <!-- Memory Type -->
            <template v-else-if="currentQuestion?.type === 'memory'">
              <h3 class="text-base text-[var(--color-text)] mb-4 font-bold">{{ currentQuestion.question }}</h3>
              
              <div v-if="memoryPhase === 'display'" class="flex-1 flex flex-col items-center justify-center animate-fade-in w-full min-h-[160px]">
                <div class="text-5xl font-black text-[var(--color-primary)] tracking-[0.2em] mb-4 scale-110 transform transition-transform">
                  {{ currentQuestion.data?.sequence }}
                </div>
                <div class="w-full bg-[var(--color-bg-muted)] h-1 mt-4 rounded-full overflow-hidden max-w-[160px] mx-auto">
                   <div class="h-full bg-[var(--color-primary)] animate-[shrink_3s_linear_forwards]"></div>
                </div>
              </div>
              
              <div v-else class="flex-1 flex flex-col items-center justify-center w-full animate-fade-in min-h-[160px]">
                <input
                  v-model="memoryInput"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="input text-center text-2xl font-bold tracking-[0.5em] h-14 w-full max-w-[220px] mb-4 rounded-xl shadow-inner bg-[var(--color-bg-soft)] border-2 focus:border-[var(--color-primary)]"
                  placeholder="____"
                  @keyup.enter="submitAnswer(memoryInput)"
                  ref="memoryInputRef"
                  autocomplete="off"
                />
                <button
                  @click="submitAnswer(memoryInput)"
                  class="btn btn-primary btn-lg w-full max-w-xs shadow-lg py-2.5 min-h-[48px]"
                  :disabled="!memoryInput || isSubmitting"
                >
                  確認答案
                </button>
              </div>
            </template>

            <!-- Logic Type -->
            <template v-else-if="currentQuestion?.type === 'logic'">
              <h3 class="text-base text-[var(--color-text)] mb-4 font-bold">請計算結果</h3>
              
              <div class="w-full bg-[var(--color-accent-purple)]/10 border border-[var(--color-accent-purple)]/20 rounded-xl p-4 mb-6 flex-1 flex items-center justify-center max-h-36">
                <div class="text-4xl font-black text-[var(--color-accent-purple)] tracking-wider">
                  {{ currentQuestion.question }}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 w-full mt-auto">
                <button
                  v-for="option in currentQuestion.options"
                  :key="option"
                  @click="submitAnswer(option)"
                  class="btn btn-secondary btn-lg text-lg font-bold border-2 border-transparent hover:border-[var(--color-accent-purple)] hover:text-[var(--color-accent-purple)] active:scale-95 py-2 min-h-[48px]"
                  :disabled="isSubmitting"
                >
                  {{ option }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 5. Mini-Cog Result -->
      <section v-else-if="stage === 'mini-cog-result'" class="flex-1 flex flex-col w-full animate-fade-in py-1 max-w-lg mx-auto">
        <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center shadow-lg">
          <div class="mb-2 inline-block p-2.5 rounded-full bg-[var(--color-success-bg)] text-2xl shadow-sm">
            🎉
          </div>
          <h2 class="text-lg font-bold mb-0.5 text-[var(--color-text)]">篩檢完成</h2>
          <p class="text-[var(--color-text-secondary)] mb-3 text-xs">您的認知篩檢結果如下</p>
          
          <div class="bg-[var(--color-bg-soft)] rounded-xl p-3 mb-3 border border-[var(--color-border)] relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary)]/20"></div>
            <div class="text-3xl font-black text-[var(--color-primary)] mb-0.5 tracking-tighter">
              {{ recentMiniCogResult?.totalScore }}<span class="text-lg text-[var(--color-text-muted)] font-medium">/5</span>
            </div>
            <div class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">總分</div>
            
            <div class="grid grid-cols-2 gap-px bg-[var(--color-border)] mt-3 rounded-lg overflow-hidden border border-[var(--color-border)]">
              <div class="bg-[var(--color-surface)] p-2">
                <div class="text-base font-bold text-[var(--color-text)]">
                  {{ recentMiniCogResult?.wordRecall.score }} / 3
                </div>
                <div class="text-[9px] text-[var(--color-text-muted)]">詞語回憶</div>
              </div>
              <div class="bg-[var(--color-surface)] p-2">
                <div class="text-base font-bold text-[var(--color-text)]">
                  {{ recentMiniCogResult?.clockDrawing.score }} / 2
                </div>
                <div class="text-[9px] text-[var(--color-text-muted)]">時鐘繪圖</div>
              </div>
            </div>
          </div>

          <div class="bg-[var(--color-info-bg)]/40 rounded-lg p-2.5 mb-4 text-left border border-[var(--color-info-bg)] flex gap-2">
            <span class="text-lg shrink-0">💡</span>
            <p class="text-[var(--color-text-primary)] text-xs leading-relaxed">
              <span class="font-bold block mb-0.5">系統建議</span>
              已根據結果調整遊戲難度。建議每天進行 15 分鐘認知訓練。
            </p>
          </div>

          <div class="space-y-2">
            <button @click="startDailyTraining" class="btn btn-primary btn-lg w-full shadow-lg hover:shadow-xl hover:-translate-y-1">
              開始今日訓練
            </button>
            <button @click="viewReport" class="btn btn-ghost w-full text-xs min-h-[32px] h-8">
              查看詳細報告
            </button>
          </div>
        </div>
      </section>

      <!-- 6. Full Assessment Result -->
      <section v-else-if="stage === 'result'" class="flex-1 flex flex-col w-full animate-fade-in py-1 max-w-lg mx-auto">
        <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center shadow-lg">
          <div class="mb-2 inline-block p-2.5 rounded-full bg-[var(--color-primary-bg)] text-2xl shadow-sm">
            🏆
          </div>
          <h2 class="text-lg font-bold mb-0.5 text-[var(--color-text)]">能力評估完成！</h2>
          <p class="text-[var(--color-text-secondary)] mb-3 text-xs">您的各項能力分析</p>

          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="bg-[var(--color-surface)] rounded-xl p-2 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
              <div class="text-base mb-1 bg-[var(--color-bg-soft)] w-6 h-6 flex items-center justify-center rounded-full">⚡</div>
              <div class="text-base font-black text-[var(--color-reaction)]">{{ result?.scores.reaction }}</div>
              <div class="text-[9px] uppercase font-bold text-[var(--color-text-muted)] mt-0.5">反應力</div>
            </div>
            <div class="bg-[var(--color-surface)] rounded-xl p-2 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
              <div class="text-base mb-1 bg-[var(--color-bg-soft)] w-6 h-6 flex items-center justify-center rounded-full">🧠</div>
              <div class="text-base font-black text-[var(--color-memory)]">{{ result?.scores.memory }}</div>
              <div class="text-[9px] uppercase font-bold text-[var(--color-text-muted)] mt-0.5">記憶力</div>
            </div>
            <div class="bg-[var(--color-surface)] rounded-xl p-2 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
              <div class="text-base mb-1 bg-[var(--color-bg-soft)] w-6 h-6 flex items-center justify-center rounded-full">🧩</div>
              <div class="text-base font-black text-[var(--color-logic)]">{{ result?.scores.logic }}</div>
              <div class="text-[9px] uppercase font-bold text-[var(--color-text-muted)] mt-0.5">邏輯力</div>
            </div>
          </div>

          <div class="bg-[var(--color-surface-alt)] rounded-lg p-2.5 mb-3 grid grid-cols-2 gap-2 text-sm border border-[var(--color-border)]">
             <div class="border-r border-[var(--color-border)] pr-2">
               <div class="text-[var(--color-text-muted)] text-[9px] mb-0.5">答對題數</div>
               <div class="font-bold text-sm text-[var(--color-text)]">{{ result?.correctCount }} <span class="text-[9px] font-normal opacity-60">/ {{ result?.totalQuestions }}</span></div>
             </div>
             <div class="pl-2">
               <div class="text-[var(--color-text-muted)] text-[9px] mb-0.5">平均反應</div>
               <div class="font-bold text-sm text-[var(--color-text)]">{{ ((result?.averageReactionTime ?? 0) / 1000).toFixed(1) }}s</div>
             </div>
          </div>

          <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-xl p-3 mb-4 text-left relative overflow-hidden">
            <div class="absolute right-0 top-0 opacity-10 text-4xl transform translate-x-1/4 -translate-y-1/4">🎯</div>
            <h3 class="font-bold text-[var(--color-success)] text-[9px] uppercase tracking-wider mb-0.5">建議訓練難度</h3>
            <div class="text-xl font-black text-[var(--color-success)] mb-0.5">
              {{ difficultyLabel }}
            </div>
            <p class="text-[var(--color-text-primary)] text-xs opacity-90 leading-relaxed">
              {{ difficultyDescription }}
            </p>
          </div>

          <div class="flex gap-2 justify-center">
            <button @click="saveAndContinue" class="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl hover:-translate-y-1">
              儲存並開始
            </button>
            <button @click="retakeAssessment" class="btn btn-ghost px-3 btn-lg">
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
  startQuestion()
}

// 開始單一題目
function startQuestion() {
  const q = currentQuestion.value
  if (!q) return

  timeLeft.value = q.timeLimit
  questionStartTime = Date.now()
  isSubmitting.value = false

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

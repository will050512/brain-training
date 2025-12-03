<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="consent-modal-overlay"
        @click.self="handleBackdropClick"
      >
        <div class="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <!-- Header -->
          <header class="consent-header">
            <div class="consent-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h2 id="consent-title" class="consent-title">資料使用同意書</h2>
            <p class="consent-version">版本 {{ CURRENT_CONSENT_VERSION }}</p>
          </header>

          <!-- Content -->
          <div class="consent-content">
            <!-- Introduction -->
            <section class="consent-section">
              <h3 class="section-title">
                <span class="section-icon">📋</span>
                關於此應用程式
              </h3>
              <p class="section-text">
                「腦力訓練」是一款認知訓練應用程式，旨在透過互動遊戲幫助您維持與提升認知功能。
                為了提供更好的服務，我們需要收集和處理部分資料。請仔細閱讀以下說明，並選擇您願意同意的項目。
              </p>
            </section>

            <!-- Essential Data -->
            <section class="consent-section consent-required">
              <div class="consent-item">
                <div class="consent-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="essential-consent"
                    v-model="consent.essentialConsent"
                    class="consent-checkbox"
                    disabled
                  />
                  <label for="essential-consent" class="consent-label">
                    <span class="consent-label-title">
                      基本功能資料
                      <span class="required-badge">必要</span>
                    </span>
                  </label>
                </div>
                <div class="consent-description">
                  <p>包含以下資料：</p>
                  <ul>
                    <li>使用者暱稱與設定偏好</li>
                    <li>遊戲成績與進度記錄</li>
                    <li>基本使用統計（如遊戲次數、完成時間）</li>
                  </ul>
                  <p class="consent-note">
                    <strong>儲存位置：</strong>所有資料僅儲存於您的裝置本機，不會上傳至外部伺服器。
                  </p>
                </div>
              </div>
            </section>

            <!-- Analytics Data -->
            <section class="consent-section">
              <div class="consent-item">
                <div class="consent-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="analytics-consent"
                    v-model="consent.analyticsConsent"
                    class="consent-checkbox"
                  />
                  <label for="analytics-consent" class="consent-label">
                    <span class="consent-label-title">
                      匿名分析資料
                      <span class="optional-badge">選用</span>
                    </span>
                  </label>
                </div>
                <div class="consent-description">
                  <p>若您同意，我們將收集：</p>
                  <ul>
                    <li>認知表現趨勢分析（去識別化）</li>
                    <li>遊戲難度與使用模式統計</li>
                    <li>應用程式效能與穩定性資料</li>
                  </ul>
                  <p class="consent-note">
                    此資料用於改善應用程式品質，所有資料將經過匿名化處理，無法識別個人身份。
                  </p>
                </div>
              </div>
            </section>

            <!-- Behavior Tracking -->
            <section class="consent-section">
              <div class="consent-item">
                <div class="consent-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="behavior-consent"
                    v-model="consent.behaviorTrackingConsent"
                    class="consent-checkbox"
                  />
                  <label for="behavior-consent" class="consent-label">
                    <span class="consent-label-title">
                      行為追蹤資料
                      <span class="optional-badge">選用</span>
                    </span>
                  </label>
                </div>
                <div class="consent-description">
                  <p>若您同意，我們將記錄：</p>
                  <ul>
                    <li>遊戲操作細節（點擊位置、反應時間分布）</li>
                    <li>時鐘繪圖測驗的圖像記錄</li>
                    <li>遊戲中的行為模式分析</li>
                  </ul>
                  <p class="consent-note">
                    此資料可提供更精確的認知分析與個人化建議。所有資料僅儲存於本機。
                  </p>
                </div>
              </div>
            </section>

            <!-- Medical Sharing -->
            <section class="consent-section">
              <div class="consent-item">
                <div class="consent-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="medical-consent"
                    v-model="consent.medicalSharingConsent"
                    class="consent-checkbox"
                  />
                  <label for="medical-consent" class="consent-label">
                    <span class="consent-label-title">
                      醫療資料分享
                      <span class="optional-badge">選用</span>
                    </span>
                  </label>
                </div>
                <div class="consent-description">
                  <p>若您同意，您可以：</p>
                  <ul>
                    <li>匯出認知評估報告供醫療專業人員參考</li>
                    <li>產生可列印的 Mini-Cog 評估摘要</li>
                    <li>與照護者分享您的進度報告</li>
                  </ul>
                  <p class="consent-note">
                    此功能讓您主動將資料分享給信任的對象，分享前會再次確認。
                  </p>
                </div>
              </div>
            </section>

            <!-- Privacy Notice -->
            <section class="consent-section privacy-notice">
              <h3 class="section-title">
                <span class="section-icon">🔒</span>
                隱私保護承諾
              </h3>
              <ul class="privacy-list">
                <li>所有資料儲存於您的裝置，我們無法存取</li>
                <li>您可以隨時在設定中變更這些選項</li>
                <li>您可以隨時要求刪除所有資料</li>
                <li>本應用程式不會販售或分享您的個人資料</li>
              </ul>
            </section>
          </div>

          <!-- Footer -->
          <footer class="consent-footer">
            <p class="consent-summary">
              <span v-if="isVersionUpdate" class="version-update-notice">
                ⚠️ 同意書已更新，請重新確認您的選擇
              </span>
            </p>
            <div class="consent-actions">
              <button
                v-if="allowSkip && !isVersionUpdate"
                class="btn-secondary"
                @click="handleSkip"
              >
                稍後再說
              </button>
              <button
                class="btn-primary"
                @click="handleConfirm"
                :disabled="!canConfirm"
              >
                {{ confirmButtonText }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CURRENT_CONSENT_VERSION, defaultDataConsent, type DataConsentOptions } from '@/types/user'
import { saveDataConsent, getDataConsent, checkConsentVersionNeedsUpdate } from '@/services/db'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// Props
const props = withDefaults(defineProps<{
  modelValue?: boolean
  allowSkip?: boolean
}>(), {
  modelValue: false,
  allowSkip: false
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirmed', consent: DataConsentOptions): void
  (e: 'skipped'): void
}>()

// State
const visible = ref(props.modelValue)
const isVersionUpdate = ref(false)
const previousConsent = ref<DataConsentOptions | null>(null)

const consent = ref<DataConsentOptions>({
  odId: '',
  essentialConsent: true, // Always required
  analyticsConsent: false,
  behaviorTrackingConsent: false,
  medicalSharingConsent: false,
  consentTimestamp: '',
  consentVersion: CURRENT_CONSENT_VERSION
})

// Computed
const canConfirm = computed(() => consent.value.essentialConsent)

const confirmButtonText = computed(() => {
  if (isVersionUpdate.value) {
    return '確認並更新同意'
  }
  return '確認同意'
})

const currentOdId = computed(() => userStore.currentUser?.id || '')

// Watch for v-model changes
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// Methods
const handleBackdropClick = () => {
  if (props.allowSkip && !isVersionUpdate.value) {
    handleSkip()
  }
}

const handleSkip = () => {
  visible.value = false
  emit('skipped')
}

const handleConfirm = async () => {
  if (!canConfirm.value) return

  // Update timestamp and version
  consent.value.odId = currentOdId.value
  consent.value.consentTimestamp = new Date().toISOString()
  consent.value.consentVersion = CURRENT_CONSENT_VERSION

  // Save to IndexedDB
  try {
    await saveDataConsent(consent.value)
    visible.value = false
    emit('confirmed', { ...consent.value })
  } catch (error) {
    console.error('Failed to save consent:', error)
    // Still emit and close, but log the error
    visible.value = false
    emit('confirmed', { ...consent.value })
  }
}

const loadExistingConsent = async () => {
  if (!currentOdId.value) return
  
  try {
    const existing = await getDataConsent(currentOdId.value)
    if (existing) {
      previousConsent.value = existing
      
      // Check if version is outdated
      const outdated = await checkConsentVersionNeedsUpdate(currentOdId.value)
      isVersionUpdate.value = outdated
      
      // Pre-fill with existing preferences
      consent.value = {
        ...existing,
        consentVersion: CURRENT_CONSENT_VERSION
      }
    }
  } catch (error) {
    console.error('Failed to load existing consent:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadExistingConsent()
})

// Watch for user changes
watch(currentOdId, (newOdId) => {
  if (newOdId) {
    loadExistingConsent()
  }
})

// Expose for parent components
defineExpose({
  show: () => { visible.value = true },
  hide: () => { visible.value = false },
  isVersionUpdate
})
</script>

<style scoped>
.consent-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.consent-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 1.5rem;
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

:where(.dark, .dark *) .consent-modal {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

/* Header */
.consent-header {
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  text-align: center;
}

.consent-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  margin-bottom: 0.75rem;
}

.consent-icon svg {
  width: 2rem;
  height: 2rem;
}

.consent-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.025em;
}

.consent-version {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

/* Content */
.consent-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}

.consent-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

:where(.dark, .dark *) .consent-section {
  border-color: #334155;
}

.consent-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.consent-required {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  margin: 0 -2rem;
  padding: 1.5rem 2rem;
  border-radius: 0;
}

:where(.dark, .dark *) .consent-required {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

:where(.dark, .dark *) .section-title {
  color: #f1f5f9;
}

.section-icon {
  font-size: 1.25rem;
}

.section-text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #475569;
}

:where(.dark, .dark *) .section-text {
  color: #94a3b8;
}

/* Consent Items */
.consent-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.consent-checkbox-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.consent-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  border: 2px solid #cbd5e1;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0.125rem;
  accent-color: #4f46e5;
}

:where(.dark, .dark *) .consent-checkbox {
  border-color: #475569;
  background-color: #1e293b;
}

.consent-checkbox:disabled {
  cursor: not-allowed;
  background-color: #4f46e5;
  border-color: #4f46e5;
}

.consent-checkbox:checked {
  background-color: #4f46e5;
  border-color: #4f46e5;
}

.consent-label {
  cursor: pointer;
  flex: 1;
}

.consent-label-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

:where(.dark, .dark *) .consent-label-title {
  color: #f1f5f9;
}

.required-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border-radius: 9999px;
}

.optional-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 9999px;
}

:where(.dark, .dark *) .optional-badge {
  background: #334155;
  color: #94a3b8;
}

.consent-description {
  padding-left: 2.25rem;
  font-size: 0.875rem;
  color: #64748b;
}

:where(.dark, .dark *) .consent-description {
  color: #94a3b8;
}

.consent-description p {
  margin: 0 0 0.5rem;
}

.consent-description ul {
  margin: 0 0 0.5rem;
  padding-left: 1.25rem;
}

.consent-description li {
  margin-bottom: 0.25rem;
  line-height: 1.5;
}

.consent-note {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border-left: 3px solid #4f46e5;
  margin-top: 0.75rem !important;
}

:where(.dark, .dark *) .consent-note {
  background: #1e293b;
}

/* Privacy Notice */
.privacy-notice {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  margin: 0 -2rem 1.5rem;
  padding: 1.5rem 2rem;
  border-radius: 0;
  border-bottom: none;
}

:where(.dark, .dark *) .privacy-notice {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%);
}

.privacy-list {
  margin: 0;
  padding-left: 1.25rem;
}

.privacy-list li {
  margin-bottom: 0.5rem;
  color: #166534;
  line-height: 1.5;
}

:where(.dark, .dark *) .privacy-list li {
  color: #4ade80;
}

/* Footer */
.consent-footer {
  padding: 1.25rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

:where(.dark, .dark *) .consent-footer {
  background: #0f172a;
  border-color: #334155;
}

.consent-summary {
  margin: 0 0 1rem;
  text-align: center;
  min-height: 1.5rem;
}

.version-update-notice {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

:where(.dark, .dark *) .version-update-notice {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.consent-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 4px 14px -3px rgba(79, 70, 229, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px -3px rgba(79, 70, 229, 0.5);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #64748b;
  border: 2px solid #e2e8f0;
}

:where(.dark, .dark *) .btn-secondary {
  background: #1e293b;
  color: #94a3b8;
  border-color: #334155;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

:where(.dark, .dark *) .btn-secondary:hover {
  background: #334155;
  border-color: #475569;
}

/* Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .consent-modal,
.modal-fade-leave-to .consent-modal {
  transform: scale(0.9) translateY(20px);
}

/* Responsive */
@media (max-width: 640px) {
  .consent-modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .consent-modal {
    max-height: 95vh;
    border-radius: 1.5rem 1.5rem 0 0;
  }

  .consent-header,
  .consent-content,
  .consent-footer {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .consent-required,
  .privacy-notice {
    margin-left: -1.25rem;
    margin-right: -1.25rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .consent-title {
    font-size: 1.25rem;
  }

  .consent-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: opacity 0.15s ease;
  }

  .modal-fade-enter-from .consent-modal,
  .modal-fade-leave-to .consent-modal {
    transform: none;
  }
}

/* Scrollbar styling */
.consent-content::-webkit-scrollbar {
  width: 8px;
}

.consent-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

:where(.dark, .dark *) .consent-content::-webkit-scrollbar-track {
  background: #1e293b;
}

.consent-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

:where(.dark, .dark *) .consent-content::-webkit-scrollbar-thumb {
  background: #475569;
}

.consent-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

:where(.dark, .dark *) .consent-content::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>

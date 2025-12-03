import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { registerAllGames } from './games'
import { initDatabase } from './services/db'
import './style.css'

// 建立應用程式
const app = createApp(App)

// 使用 Pinia 狀態管理
const pinia = createPinia()
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 應用程式初始化
async function bootstrap() {
  try {
    // 初始化資料庫
    await initDatabase()
    console.log('Database initialized')
    
    // 註冊所有遊戲
    registerAllGames()
    console.log('Games registered')
    
    // 掛載應用程式
    app.mount('#app')
    console.log('App mounted')
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // 即使初始化失敗也嘗試掛載應用程式
    app.mount('#app')
  }
}

bootstrap()

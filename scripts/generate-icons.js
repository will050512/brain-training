/**
 * LOGO 圖示產生腳本
 * 使用 sharp 將原始 LOGO 轉換為多種尺寸的 PWA 圖示
 */

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 使用根目錄的新 logo.png
const SOURCE_LOGO = path.join(__dirname, '../logo.png')
const PUBLIC_DIR = path.join(__dirname, '../public')

// 要產生的圖示尺寸配置
const ICON_SIZES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'logo-64.png', size: 64 },
  { name: 'logo-128.png', size: 128 },
]

// 產生 ICO 格式的 favicon（使用最小尺寸的 PNG 替代）
async function generateFavicon(sourcePath, outputDir) {
  const faviconPath = path.join(outputDir, 'favicon.ico')
  
  // 使用 32x32 PNG 作為 favicon（現代瀏覽器支援 PNG favicon）
  await sharp(sourcePath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(faviconPath.replace('.ico', '.png'))
  
  // 複製為 .ico（實際上是 PNG，但大多數瀏覽器可接受）
  await fs.copyFile(
    faviconPath.replace('.ico', '.png'),
    faviconPath.replace('.ico', '-temp.png')
  )
  
  console.log(`✅ 產生 favicon.png (32x32)`)
}

// 產生各尺寸 PNG 圖示
async function generatePngIcons(sourcePath, outputDir) {
  for (const { name, size } of ICON_SIZES) {
    const outputPath = path.join(outputDir, name)
    
    await sharp(sourcePath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath)
    
    console.log(`✅ 產生 ${name} (${size}x${size})`)
  }
}

// 產生 SVG 版本（從 PNG 轉換為簡化的 SVG）
async function generateSvgLogo(sourcePath, outputDir) {
  const outputPath = path.join(outputDir, 'logo.svg')
  
  // 讀取 PNG 並轉換為 base64 嵌入 SVG
  const pngBuffer = await sharp(sourcePath)
    .resize(128, 128, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toBuffer()
  
  const base64 = pngBuffer.toString('base64')
  
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="128" height="128" viewBox="0 0 128 128">
  <image width="128" height="128" xlink:href="data:image/png;base64,${base64}"/>
</svg>`
  
  await fs.writeFile(outputPath, svgContent)
  console.log(`✅ 產生 logo.svg (向量版)`)
}

// 產生 PDF 報告用的 base64 LOGO
async function generateBase64Logo(sourcePath, outputDir) {
  const outputPath = path.join(outputDir, '../src/assets/logo-base64.ts')
  
  const pngBuffer = await sharp(sourcePath)
    .resize(200, 60, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toBuffer()
  
  const base64 = pngBuffer.toString('base64')
  
  const tsContent = `/**
 * LOGO Base64 編碼
 * 自動產生，請勿手動修改
 */
export const LOGO_BASE64 = 'data:image/png;base64,${base64}'
export const LOGO_WIDTH = 200
export const LOGO_HEIGHT = 60
`
  
  // 確保目錄存在
  const dir = path.dirname(outputPath)
  await fs.mkdir(dir, { recursive: true })
  
  await fs.writeFile(outputPath, tsContent)
  console.log(`✅ 產生 logo-base64.ts (PDF 報告用)`)
}

// 主函數
async function main() {
  console.log('🚀 開始產生 LOGO 圖示...\n')
  
  // 檢查原始檔案是否存在
  try {
    await fs.access(SOURCE_LOGO)
  } catch {
    console.error(`❌ 找不到原始 LOGO 檔案: ${SOURCE_LOGO}`)
    process.exit(1)
  }
  
  // 確保輸出目錄存在
  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  
  try {
    // 產生各種尺寸的圖示
    await generatePngIcons(SOURCE_LOGO, PUBLIC_DIR)
    await generateFavicon(SOURCE_LOGO, PUBLIC_DIR)
    await generateSvgLogo(SOURCE_LOGO, PUBLIC_DIR)
    await generateBase64Logo(SOURCE_LOGO, PUBLIC_DIR)
    
    console.log('\n✨ 所有圖示產生完成！')
  } catch (error) {
    console.error('❌ 產生圖示時發生錯誤:', error)
    process.exit(1)
  }
}

main()

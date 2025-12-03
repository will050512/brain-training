/**
 * 序列化工具函數
 * 用於處理 IndexedDB 儲存時的物件序列化問題
 */

/**
 * 深拷貝物件並移除不可序列化的內容
 * 解決 Vue Proxy、Ref、函數、undefined 等無法存入 IndexedDB 的問題
 * 
 * @param obj - 要序列化的物件
 * @returns 可以安全存入 IndexedDB 的純物件
 */
export function sanitizeForIDB<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // 處理 Date 物件 - 轉換為 ISO 字串
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T
  }

  // 處理陣列
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForIDB(item)) as unknown as T
  }

  // 處理純物件（包括 Vue Proxy）
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    
    for (const key of Object.keys(obj)) {
      const value = (obj as Record<string, unknown>)[key]
      
      // 跳過函數和 undefined
      if (typeof value === 'function' || value === undefined) {
        continue
      }
      
      // 遞迴處理巢狀物件
      result[key] = sanitizeForIDB(value)
    }
    
    return result as T
  }

  // 原始類型直接返回
  return obj
}

/**
 * 使用 JSON 序列化/反序列化進行深拷貝
 * 更簡單但會丟失 Date 物件（轉為字串）
 * 
 * @param obj - 要深拷貝的物件
 * @returns 深拷貝後的物件
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (error) {
    console.error('深拷貝失敗:', error)
    // 回退到 sanitizeForIDB
    return sanitizeForIDB(obj)
  }
}

/**
 * 檢查物件是否可以安全存入 IndexedDB
 * 用於偵錯目的
 * 
 * @param obj - 要檢查的物件
 * @param path - 當前路徑（用於錯誤訊息）
 * @returns 問題欄位的路徑陣列
 */
export function findNonSerializableFields(
  obj: unknown,
  path: string = ''
): string[] {
  const problems: string[] = []

  if (obj === null || obj === undefined) {
    return problems
  }

  if (typeof obj === 'function') {
    problems.push(`${path}: 函數`)
    return problems
  }

  if (typeof obj === 'symbol') {
    problems.push(`${path}: Symbol`)
    return problems
  }

  if (obj instanceof Date) {
    return problems // Date 是可序列化的
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      problems.push(...findNonSerializableFields(item, `${path}[${index}]`))
    })
    return problems
  }

  if (typeof obj === 'object') {
    // 檢查是否為 Vue Ref 或 Reactive
    const proto = Object.getPrototypeOf(obj)
    if (proto && proto.constructor && proto.constructor.name !== 'Object') {
      // 可能是特殊物件（如 Vue Proxy）
      // 不一定是問題，但值得注意
    }

    for (const key of Object.keys(obj)) {
      const value = (obj as Record<string, unknown>)[key]
      problems.push(...findNonSerializableFields(value, path ? `${path}.${key}` : key))
    }
  }

  return problems
}

/**
 * 將 Date 字串轉回 Date 物件
 * 用於從 IndexedDB 讀取後還原資料
 * 
 * @param obj - 從 IndexedDB 讀取的物件
 * @param dateFields - 需要轉換的欄位名稱陣列
 * @returns 還原 Date 物件後的資料
 */
export function restoreDates<T>(obj: T, dateFields: string[]): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj
  }

  const result = { ...obj } as Record<string, unknown>

  for (const field of dateFields) {
    if (field in result && typeof result[field] === 'string') {
      const date = new Date(result[field] as string)
      if (!isNaN(date.getTime())) {
        result[field] = date
      }
    }
  }

  return result as T
}

/**
 * 安全的 structuredClone 替代方案
 * 支援不支援 structuredClone 的舊瀏覽器
 * 
 * @param obj - 要克隆的物件
 * @returns 克隆後的物件
 */
export function safeClone<T>(obj: T): T {
  // 優先使用原生 structuredClone（如果可用）
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj)
    } catch {
      // structuredClone 失敗，回退到 sanitizeForIDB
    }
  }
  
  return sanitizeForIDB(obj)
}

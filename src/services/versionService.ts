import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface AppMetaEntry {
  key: string
  value: string
  updatedAt: string
}

interface AppMetaDB extends DBSchema {
  appMeta: {
    key: string
    value: AppMetaEntry
  }
}

const DB_NAME = 'brain-training-meta-db'
const DB_VERSION = 1
const STORE_NAME = 'appMeta'
const BUILD_HASH_KEY = 'buildHash'

let dbPromise: Promise<IDBPDatabase<AppMetaDB>> | null = null

async function getMetaDB(): Promise<IDBPDatabase<AppMetaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppMetaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
      }
    })
  }

  return dbPromise
}

export async function getStoredBuildHash(): Promise<string | null> {
  const db = await getMetaDB()
  const entry = await db.get(STORE_NAME, BUILD_HASH_KEY)
  return entry?.value ?? null
}

export async function setStoredBuildHash(hash: string): Promise<void> {
  const db = await getMetaDB()
  const entry: AppMetaEntry = {
    key: BUILD_HASH_KEY,
    value: hash,
    updatedAt: new Date().toISOString()
  }
  await db.put(STORE_NAME, entry)
}

export async function clearStoredBuildHash(): Promise<void> {
  const db = await getMetaDB()
  await db.delete(STORE_NAME, BUILD_HASH_KEY)
}

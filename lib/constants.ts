export const PLAYER_RETRY_COUNT = 3
export const SEARCH_DEBOUNCE_MS = 300
export const SYNC_STALE_TIME = 24 * 60 * 60 * 1000 // 24 hours
export const CREDENTIALS_STORAGE_KEY = 'ott_credentials'
export const CORS_PROXY_STORAGE_KEY = 'ott_cors_proxy_enabled'
export const PLAYBACK_SAVE_INTERVAL = 10_000 // 10 seconds
export const COMPLETED_THRESHOLD = 0.9 // 90% watched = completed

export const BUFFER_CONFIG = {
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  maxBufferSize: 30 * 1000 * 1000, // 30MB
}

export const API_TIMEOUT = 15_000 // 15 seconds

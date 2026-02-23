import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- URL validation ----

/**
 * Validates that a stream URL is a well-formed http(s) URL.
 * Guards against empty strings, blob: leftovers, and relative paths.
 */
export function isValidStreamUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// ---- Stream URL helpers ----

const HLS_EXTENSIONS = ['.m3u8']
const NATIVE_VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.ts']

/**
 * Determine if a URL is an HLS manifest.
 */
export function isHlsUrl(url: string): boolean {
  const pathname = new URL(url, 'https://placeholder').pathname.toLowerCase()
  return HLS_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}

/**
 * Determine if a URL points to a format that the native <video> tag can
 * attempt to play directly (mp4, webm, mkv*, mov, ts).
 * *MKV support varies by browser; Chromium-based browsers handle it.
 */
export function isNativeVideoUrl(url: string): boolean {
  const pathname = new URL(url, 'https://placeholder').pathname.toLowerCase()
  return NATIVE_VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}

/**
 * Upgrade an HTTP stream URL to HTTPS.
 * Returns the upgraded URL, or the original if it was already HTTPS.
 */
export function upgradeToHttps(url: string): string {
  if (url.startsWith('http://')) {
    return url.replace(/^http:\/\//, 'https://')
  }
  return url
}

/**
 * Wrap a stream URL with the corsproxy.io CORS proxy.
 */
export function corsProxyUrl(url: string): string {
  return `https://corsproxy.io/?${encodeURIComponent(url)}`
}

/**
 * Check whether the user has enabled the CORS Proxy toggle.
 */
export function isCorsProxyEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('ott_cors_proxy_enabled') === 'true'
  } catch {
    return false
  }
}

/**
 * Build an ordered list of URLs to try for a given stream.
 *
 * When the CORS Proxy toggle is ON the proxied URL is tried *first*
 * (this lets users bypass mixed-content blocks immediately).
 *
 * Otherwise the order is:
 * 1. HTTPS upgrade
 * 2. Original HTTP URL (only added when different from HTTPS)
 * 3. CORS-proxied URL as last resort (only on HTTPS pages with HTTP streams)
 */
export function buildStreamUrlCandidates(rawUrl: string): string[] {
  const candidates: string[] = []
  const httpsUrl = upgradeToHttps(rawUrl)
  const proxyEnabled = isCorsProxyEnabled()

  if (proxyEnabled) {
    // User opted in -- proxy first, then direct HTTPS, then original HTTP
    candidates.push(corsProxyUrl(rawUrl))
    candidates.push(httpsUrl)
    if (httpsUrl !== rawUrl) candidates.push(rawUrl)
  } else {
    // Default order: HTTPS > HTTP > proxied HTTP (last resort)
    candidates.push(httpsUrl)
    if (httpsUrl !== rawUrl) candidates.push(rawUrl)

    if (
      rawUrl.startsWith('http://') &&
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:'
    ) {
      candidates.push(corsProxyUrl(rawUrl))
    }
  }

  return candidates
}

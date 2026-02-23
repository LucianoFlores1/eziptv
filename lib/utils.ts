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
 * Wrap a stream URL with a CORS proxy when direct access fails on
 * HTTPS origins talking to HTTP-only servers.
 *
 * Only applied at runtime when the page is served over HTTPS and the
 * target URL is HTTP (mixed-content scenario).
 */
export function corsProxyUrl(url: string): string {
  // Only proxy HTTP URLs when we're on an HTTPS page
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith('http://')
  ) {
    return `https://corsproxy.io/?${encodeURIComponent(url)}`
  }
  return url
}

/**
 * Build an ordered list of URLs to try for a given stream.
 *
 * 1. HTTPS upgrade (browser CSP will also try this via upgrade-insecure-requests)
 * 2. Original URL (works when page is on HTTP or the server supports mixed)
 * 3. CORS-proxied original URL (last resort for mixed-content)
 */
export function buildStreamUrlCandidates(rawUrl: string): string[] {
  const candidates: string[] = []
  const httpsUrl = upgradeToHttps(rawUrl)

  // Always try HTTPS first
  candidates.push(httpsUrl)

  // If the original was HTTP, add it as a fallback
  if (httpsUrl !== rawUrl) {
    candidates.push(rawUrl)
  }

  // Last resort: CORS proxy on the original HTTP URL
  if (rawUrl.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    candidates.push(corsProxyUrl(rawUrl))
  }

  return candidates
}

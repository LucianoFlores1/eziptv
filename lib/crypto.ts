const SALT = 'ott-player-v1-salt-2024'

function getFingerprint(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent + (navigator.language || '')
  }
  return 'default-fingerprint'
}

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// XOR fallback for environments without crypto.subtle
function xorCipher(text: string, key: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

function hasSubtleCrypto(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  )
}

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBuffer(getFingerprint() + SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: stringToBuffer(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!hasSubtleCrypto()) {
    // XOR fallback
    const key = SALT + getFingerprint()
    const ciphered = xorCipher(plaintext, key)
    return 'xor:' + btoa(ciphered)
  }

  const key = await deriveKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    stringToBuffer(plaintext)
  )

  return bufferToBase64(iv) + ':' + bufferToBase64(encrypted)
}

export async function decrypt(encoded: string): Promise<string> {
  if (encoded.startsWith('xor:')) {
    // XOR fallback
    const key = SALT + getFingerprint()
    const ciphered = atob(encoded.slice(4))
    return xorCipher(ciphered, key)
  }

  if (!hasSubtleCrypto()) {
    throw new Error('Cannot decrypt AES-GCM data without crypto.subtle')
  }

  const [ivB64, dataB64] = encoded.split(':')
  const iv = base64ToBuffer(ivB64)
  const data = base64ToBuffer(dataB64)
  const key = await deriveKey()

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

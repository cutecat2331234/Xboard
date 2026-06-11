/** Generate X25519 key pair for Reality (base64url, Web Crypto). */
export async function generateRealityKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  const keyPair = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  if (!privateJwk.d || !publicJwk.x) {
    throw new Error('Failed to export X25519 keys')
  }
  return { privateKey: privateJwk.d, publicKey: publicJwk.x }
}

/** Random hex short ID with even length between 2 and 16. */
export function generateRealityShortId(): string {
  const length = 2 * Math.floor(8 * Math.random()) + 2
  const bytes = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, length)
}

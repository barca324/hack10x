const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'

// Load key lazily so it always reads the current env value
const getKey = () => {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must be a 64-character hex string (got ${hex?.length ?? 0} chars)`)
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a plaintext string → returns an object { iv, authTag, encrypted }
 */
function encrypt(text) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted.toString('hex')
  }
}

/**
 * Decrypt an object { iv, authTag, encrypted } → returns plaintext string
 */
function decrypt(data) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(data.iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data.encrypted, 'hex')),
    decipher.final()
  ])
  return decrypted.toString('utf8')
}

module.exports = { encrypt, decrypt }

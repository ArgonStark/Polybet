// Simple in-memory session store
// In production, use Redis or another persistent store

interface Session {
  sessionId: string
  walletAddress: string
  proxyAddress: string
  createdAt: number
}

const sessions = new Map<string, Session>()

export function createSession(
  sessionId: string,
  walletAddress: string,
  proxyAddress: string
): Session {
  const session: Session = {
    sessionId,
    walletAddress,
    proxyAddress,
    createdAt: Date.now(),
  }
  sessions.set(sessionId, session)
  return session
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId)
}

export function getSessionByWallet(walletAddress: string): Session | undefined {
  for (const session of sessions.values()) {
    if (session.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
      return session
    }
  }
  return undefined
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}

// Clean up old sessions (older than 24 hours)
export function cleanupOldSessions(): void {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > maxAge) {
      sessions.delete(sessionId)
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldSessions, 60 * 60 * 1000)
}


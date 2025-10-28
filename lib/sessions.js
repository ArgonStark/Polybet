const sessions = new Map();

export function createSession(sessionId, address, authData) {
  const session = {
    sessionId,
    address,
    token: authData.token,
    refreshToken: authData.refresh_token,
    expiresAt: Date.now() + (authData.expires_in * 1000),
    createdAt: Date.now()
  };
  sessions.set(sessionId, session);
  console.log('[sessions] Created session for', address);
  return session;
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}, 5 * 60 * 1000);

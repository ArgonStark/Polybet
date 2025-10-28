// Use global object to persist sessions across requests
if (!global.sessionsMap) {
  global.sessionsMap = new Map();
}

const sessions = global.sessionsMap;

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
  console.log('[sessions] Created session for', address, 'with ID:', sessionId);
  console.log('[sessions] Total sessions:', sessions.size);
  return session;
}

export function getSession(sessionId) {
  console.log('[sessions] Looking up session:', sessionId);
  console.log('[sessions] Available session IDs:', Array.from(sessions.keys()));
  const session = sessions.get(sessionId);
  if (!session) {
    console.log('[sessions] Session not found');
    return null;
  }
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    console.log('[sessions] Session expired');
    return null;
  }
  console.log('[sessions] Session found');
  return session;
}

export function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

export function updateSessionWithProxy(sessionId, proxyWallet) {
  const session = sessions.get(sessionId);
  if (session) {
    session.proxyWallet = proxyWallet;
    console.log('[sessions] Updated session with proxy wallet:', proxyWallet.address);
  }
}

export function updateSessionWithDepositAddress(sessionId, depositAddress) {
  const session = sessions.get(sessionId);
  if (session) {
    session.depositAddress = depositAddress;
    console.log('[sessions] Updated session with deposit address:', depositAddress.depositAddress);
  }
}

export function getAllSessions() {
  return sessions;
}

if (!global.sessionCleanupInterval) {
  global.sessionCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions.entries()) {
      if (now > s.expiresAt) sessions.delete(id);
    }
  }, 5 * 60 * 1000);
}

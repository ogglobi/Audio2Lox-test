import crypto from 'crypto';

export interface PkceSession {
  verifier: string;
  redirectUri: string;
}

const pkceState = new Map<string, PkceSession>();

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function createPkcePair(stateKey: string, redirectUri: string): { codeChallenge: string } {
  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
  pkceState.set(stateKey, { verifier, redirectUri });
  return { codeChallenge: challenge };
}

export function consumePkceVerifier(stateKey: string): PkceSession | undefined {
  const session = pkceState.get(stateKey);
  if (session) {
    pkceState.delete(stateKey);
  }
  return session;
}

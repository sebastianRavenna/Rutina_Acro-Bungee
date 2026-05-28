// OAuth PKCE para Spotify Web API + Web Playback SDK
// Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
];

const TOKEN_STORAGE_KEY = 'acrobungee-spotify-tokens-v1';
const VERIFIER_SESSION_KEY = 'acrobungee-spotify-verifier';
const CLIENT_ID_SESSION_KEY = 'acrobungee-spotify-client-id';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  clientId: string;
}

export function getRedirectUri(): string {
  return `${window.location.origin}/callback`;
}

// Persistencia tokens
export function loadTokens(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: SpotifyTokens): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// PKCE helpers
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars.charAt(out[i] % chars.length);
  }
  return str;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Inicia el flow OAuth: redirige a Spotify accounts.
 * El verifier se guarda en sessionStorage para usarlo al volver del callback.
 */
export async function startAuthFlow(clientId: string): Promise<void> {
  if (!clientId.trim()) {
    throw new Error('Falta el Client ID de Spotify.');
  }
  const verifier = generateRandomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));

  sessionStorage.setItem(VERIFIER_SESSION_KEY, verifier);
  sessionStorage.setItem(CLIENT_ID_SESSION_KEY, clientId);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES.join(' '),
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Intercambia el code recibido en /callback por tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const verifier = sessionStorage.getItem(VERIFIER_SESSION_KEY);
  const clientId = sessionStorage.getItem(CLIENT_ID_SESSION_KEY);
  if (!verifier || !clientId) {
    throw new Error('Falta el verifier o el client_id de la sesión (sessionStorage).');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const tokens: SpotifyTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    clientId,
  };

  sessionStorage.removeItem(VERIFIER_SESSION_KEY);
  // dejamos el clientId en sessionStorage por si luego hace refresh, pero ya quedó en tokens.clientId
  saveTokens(tokens);
  return tokens;
}

/**
 * Refresca el access token usando el refresh_token. Si no es posible, devuelve null y limpia.
 */
export async function refreshAccessToken(tokens: SpotifyTokens): Promise<SpotifyTokens | null> {
  const body = new URLSearchParams({
    client_id: tokens.clientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
  });

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    const updated: SpotifyTokens = {
      ...tokens,
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? tokens.refreshToken,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    saveTokens(updated);
    return updated;
  } catch {
    return null;
  }
}

/**
 * Devuelve un access token válido, refrescando si está por expirar.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  const margin = 60 * 1000; // 1 min de margen
  if (tokens.expiresAt - margin > Date.now()) {
    return tokens.accessToken;
  }
  const refreshed = await refreshAccessToken(tokens);
  return refreshed?.accessToken ?? null;
}

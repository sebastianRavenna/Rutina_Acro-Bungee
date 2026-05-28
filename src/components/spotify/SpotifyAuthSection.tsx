import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { getRedirectUri, loadTokens, startAuthFlow, clearTokens } from '../../utils/spotify-auth';

const ENV_CLIENT_ID = (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '').trim();

export function SpotifyAuthSection() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Forzar re-render después de disconnect (loadTokens es sync, lee localStorage)
  const [tokensVersion, setTokensVersion] = useState(0);

  const effectiveClientId = ENV_CLIENT_ID || settings.spotifyClientId.trim();
  const hasEnvClientId = ENV_CLIENT_ID.length > 0;

  const tokens = loadTokens();
  void tokensVersion; // mantiene la dependencia
  const isConnected = !!tokens && tokens.clientId === effectiveClientId;

  const handleConnect = async () => {
    setError(null);
    if (!effectiveClientId) {
      setError('Falta el Client ID de Spotify.');
      return;
    }
    setBusy(true);
    try {
      await startAuthFlow(effectiveClientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    clearTokens();
    setError(null);
    setTokensVersion((v) => v + 1);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.2em',
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        SPOTIFY
      </h3>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-card)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <Toggle
          checked={settings.spotifyEnabled}
          onChange={(v) => updateSettings({ spotifyEnabled: v })}
          label="Activar control de Spotify"
        />

        {settings.spotifyEnabled && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Requiere <strong style={{ color: 'var(--text-primary)' }}>Spotify Premium</strong>. El
              audio baja al 30% cuando habla la voz.
            </div>

            {hasEnvClientId ? (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  background: 'rgba(0, 212, 255, 0.06)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  borderRadius: 6,
                  padding: '6px 8px',
                }}
              >
                ✓ La app está pre-configurada — solo iniciá sesión con tu cuenta de Spotify Premium.
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Client ID de Spotify
                  </div>
                  <Input
                    value={settings.spotifyClientId}
                    onChange={(e) => updateSettings({ spotifyClientId: e.target.value })}
                    placeholder="Pegá acá tu Client ID"
                    aria-label="Client ID de Spotify"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowHelp((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: 12,
                    textAlign: 'left',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {showHelp ? '− Ocultar instrucciones' : '? Cómo obtener tu Client ID'}
                </button>

                {showHelp && <HelpSteps />}
              </>
            )}

            {isConnected ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'rgba(29, 185, 84, 0.12)',
                  border: '1px solid rgba(29, 185, 84, 0.4)',
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--accent-spotify)' }}>
                  ✓ Conectado a Spotify
                </span>
                <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleConnect}
                disabled={busy || !effectiveClientId}
                style={{
                  background: 'var(--accent-spotify)',
                  color: '#fff',
                }}
              >
                {busy ? 'Redirigiendo...' : 'Conectar con Spotify'}
              </Button>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(255, 0, 60, 0.1)',
                  border: '1px solid rgba(255, 0, 60, 0.35)',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: '#ff7593',
                }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HelpSteps() {
  const redirectUri = getRedirectUri();
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
      }}
    >
      <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li>
          Entrá a{' '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
            developer.spotify.com/dashboard
          </a>{' '}
          con tu cuenta de Spotify.
        </li>
        <li>Tocá <strong style={{ color: 'var(--text-primary)' }}>Create app</strong>.</li>
        <li>App name: cualquiera. Description: cualquiera.</li>
        <li>
          En <strong style={{ color: 'var(--text-primary)' }}>Redirect URIs</strong> agregá exactamente:
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '6px 10px',
              marginTop: 4,
              fontSize: 11,
              color: 'var(--accent-cyan)',
              wordBreak: 'break-all',
            }}
          >
            {redirectUri}
          </div>
        </li>
        <li>
          En <strong style={{ color: 'var(--text-primary)' }}>APIs used</strong> tildá
          <em> Web API</em> y <em>Web Playback SDK</em>.
        </li>
        <li>Guardá y copiá el Client ID acá arriba.</li>
      </ol>
    </div>
  );
}

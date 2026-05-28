import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { useAzureTTS } from '../../hooks/useAzureTTS';
import { unlockAudio } from '../../utils/audio-unlock';

export function PremiumVoiceSection() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const azure = useAzureTTS(settings.premiumVoiceEnabled);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTest = async () => {
    void unlockAudio();
    setTesting(true);
    setTestError(null);
    azure.clearError();
    try {
      const played = await azure.play({
        voice: settings.premiumVoiceId,
        text: '¡Vamos! Hola, esta es una prueba de voz premium.',
      });
      if (!played) {
        // azure.play no tira; expone el error en lastFetchError
        setTestError(azure.lastFetchError ?? 'No se pudo reproducir el audio.');
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const grouped = {
    female: azure.voices.filter((v) => v.gender === 'female'),
    male: azure.voices.filter((v) => v.gender === 'male'),
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
        VOZ PREMIUM (AZURE)
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
          checked={settings.premiumVoiceEnabled}
          onChange={(v) => updateSettings({ premiumVoiceEnabled: v })}
          label="Usar voces neuronales premium"
        />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Voces actuadas mucho más naturales que las del sistema. Los audios se{' '}
          <strong style={{ color: 'var(--text-primary)' }}>pre-generan al iniciar la rutina</strong>{' '}
          (toma 2–5 segundos), después se reproducen al instante y quedan cacheados para próximas
          sesiones. Requiere internet solo al iniciar.
        </div>

        {settings.premiumVoiceEnabled && (
          <>
            {azure.voicesLoading && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Cargando voces disponibles...
              </div>
            )}
            {azure.voicesError && (
              <div
                style={{
                  background: 'rgba(255, 0, 60, 0.08)',
                  border: '1px solid rgba(255, 0, 60, 0.3)',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: '#ff7593',
                }}
              >
                No se pudo conectar con el servidor: {azure.voicesError}
                <br />
                <small>Verificá que AZURE_TTS_KEY y AZURE_TTS_REGION estén configuradas.</small>
              </div>
            )}
            {azure.voices.length > 0 && (
              <>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Voz
                  </div>
                  <select
                    value={settings.premiumVoiceId}
                    onChange={(e) => updateSettings({ premiumVoiceId: e.target.value })}
                    style={selectStyle}
                    aria-label="Voz premium Azure"
                  >
                    {grouped.female.length > 0 && (
                      <optgroup label="♀ Femeninas">
                        {grouped.female.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {grouped.male.length > 0 && (
                      <optgroup label="♂ Masculinas">
                        {grouped.male.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
                  {testing ? 'Generando...' : '▶ Probar voz'}
                </Button>
                {testError && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#ff7593',
                      background: 'rgba(255, 0, 60, 0.08)',
                      padding: '6px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {testError}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-input)',
  padding: '12px 14px',
  color: 'var(--text-primary)',
  fontSize: 15,
};

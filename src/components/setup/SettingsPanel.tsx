import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { useSpeech } from '../../hooks/useSpeech';
import { guessVoiceGender } from '../../utils/voice';
import { SpotifyAuthSection } from '../spotify/SpotifyAuthSection';
import { PremiumVoiceSection } from './PremiumVoiceSection';

export function SettingsPanel() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setView = useAppStore((s) => s.setView);
  const templatesCount = useAppStore((s) => s.movementTemplates.length);
  const { speak, isSupported, spanishVoices, availableVoices } = useSpeech();

  // Mostrar voces en español + opción de "todas" (algunos usuarios pueden tener solo voces en inglés)
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const voicesToShow = showAllLanguages ? availableVoices : spanishVoices;

  const voicesGrouped = useMemo(() => {
    const fem: SpeechSynthesisVoice[] = [];
    const mas: SpeechSynthesisVoice[] = [];
    const unk: SpeechSynthesisVoice[] = [];
    voicesToShow.forEach((v) => {
      const g = guessVoiceGender(v.name);
      if (g === 'female') fem.push(v);
      else if (g === 'male') mas.push(v);
      else unk.push(v);
    });
    return { fem, mas, unk };
  }, [voicesToShow]);

  return (
    <div className="app-shell" style={{ paddingTop: 70 }}>
      {/* Botón volver flotante - visible mientras scrolleás */}
      <button
        onClick={() => setView('home')}
        aria-label="Volver"
        style={{
          position: 'fixed',
          top: 'calc(14px + env(safe-area-inset-top))',
          left: 14,
          background: 'rgba(13, 27, 53, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-strong)',
          borderRadius: '50%',
          width: 44,
          height: 44,
          color: 'var(--text-primary)',
          fontSize: 18,
          zIndex: 50,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        }}
      >
        ←
      </button>

      <header style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 24 }}>
          AJUSTES
        </h2>
      </header>

      <PremiumVoiceSection />

      <Section title="VOZ DEL NAVEGADOR">
        {!isSupported && (
          <Note>Tu navegador no soporta síntesis de voz. Los anuncios no se escucharán.</Note>
        )}
        <small style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
          Esta es la voz de respaldo, se usa solo si la voz Premium está desactivada o no responde.
        </small>
        <Field label="Voz específica">
          <select
            value={settings.voiceURI ?? ''}
            onChange={(e) =>
              updateSettings({ voiceURI: e.target.value === '' ? null : e.target.value })
            }
            style={selectStyle}
            aria-label="Seleccionar voz"
          >
            <option value="">— Automática (mejor match por idioma) —</option>
            {voicesGrouped.fem.length > 0 && (
              <optgroup label="♀ Femeninas (heurística)">
                {voicesGrouped.fem.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </optgroup>
            )}
            {voicesGrouped.mas.length > 0 && (
              <optgroup label="♂ Masculinas (heurística)">
                {voicesGrouped.mas.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </optgroup>
            )}
            {voicesGrouped.unk.length > 0 && (
              <optgroup label="Sin clasificar">
                {voicesGrouped.unk.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <small style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
            {voicesToShow.length} voces disponibles. La clasificación por género es una heurística por
            nombre.
          </small>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showAllLanguages}
              onChange={(e) => setShowAllLanguages(e.target.checked)}
            />
            Ver voces de todos los idiomas
          </label>
        </Field>

        <Field label="Idioma base (cuando no hay voz específica)">
          <select
            value={settings.voiceLang}
            onChange={(e) => updateSettings({ voiceLang: e.target.value })}
            style={selectStyle}
          >
            <option value="es-AR">Español (Argentina)</option>
            <option value="es-ES">Español (España)</option>
            <option value="es-MX">Español (México)</option>
            <option value="es-US">Español (EE.UU.)</option>
            <option value="es">Español (genérico)</option>
          </select>
        </Field>

        <Field label={`Velocidad base: ${settings.voiceRate.toFixed(2)}x`}>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={settings.voiceRate}
            onChange={(e) => updateSettings({ voiceRate: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </Field>

        <Field label={`Tono base: ${settings.voicePitch.toFixed(2)}`}>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={settings.voicePitch}
            onChange={(e) => updateSettings({ voicePitch: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </Field>

        <Field label={`Volumen: ${Math.round(settings.voiceVolume * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.voiceVolume}
            onChange={(e) => updateSettings({ voiceVolume: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </Field>

        <Button variant="secondary" size="sm" onClick={() => speak('Hola, esta es una prueba de voz.')}>
          Probar voz
        </Button>
      </Section>

      <Section title="ANUNCIOS">
        <Toggle
          checked={settings.announceNextMovement}
          onChange={(v) => updateSettings({ announceNextMovement: v })}
          label='Anunciar "Próximo: ..." antes del cambio'
        />
        <small style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: -8, display: 'block' }}>
          El nombre del movimiento siempre se anuncia al cambiar. Esto controla solo el aviso
          anticipado.
        </small>

        <Field label={`Aviso previo global: ${settings.warnBeforeSeconds}s antes`}>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={settings.warnBeforeSeconds}
            onChange={(e) => updateSettings({ warnBeforeSeconds: parseInt(e.target.value, 10) })}
            style={{ width: '100%' }}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
            Cada movimiento puede personalizar este valor desde el editor.
          </small>
        </Field>

        <Field
          label={
            settings.startCountdownSeconds === 0
              ? 'Cuenta regresiva al iniciar: desactivada'
              : `Cuenta regresiva al iniciar: ${settings.startCountdownSeconds}s`
          }
        >
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={settings.startCountdownSeconds}
            onChange={(e) =>
              updateSettings({ startCountdownSeconds: parseInt(e.target.value, 10) })
            }
            style={{ width: '100%' }}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
            Al tocar ▶ Iniciar, primero se anuncia el primer movimiento y después cuenta hacia
            atrás antes de arrancar. Ej: "Bolita... 5, 4, 3, 2, 1".
          </small>
        </Field>
      </Section>

      <Section title="BIBLIOTECA">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Tenés {templatesCount}{' '}
          {templatesCount === 1 ? 'plantilla guardada' : 'plantillas guardadas'}.
        </div>
        <Input
          readOnly
          value="Guardá movimientos como plantilla desde el editor (botón ★)"
          style={{ background: 'transparent', border: 'none', padding: '4px 0', fontSize: 12, color: 'var(--text-muted)' }}
        />
        <Button variant="secondary" size="sm" onClick={() => setView('library')}>
          Gestionar biblioteca
        </Button>
      </Section>

      <SpotifyAuthSection />

      <div style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
        Tus rutinas y ajustes se guardan en este dispositivo.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
        {title}
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
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255, 107, 53, 0.08)',
        border: '1px solid rgba(255, 107, 53, 0.25)',
        borderRadius: 8,
        padding: 10,
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}
    >
      {children}
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

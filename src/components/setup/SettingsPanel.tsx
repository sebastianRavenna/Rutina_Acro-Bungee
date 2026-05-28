import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { useSpeech } from '../../hooks/useSpeech';
import { PRESET_LABELS, guessVoiceGender } from '../../utils/voice';
import type { EnergyPreset } from '../../types';
import { SpotifyAuthSection } from '../spotify/SpotifyAuthSection';
import { PremiumVoiceSection } from './PremiumVoiceSection';

const PRESET_ORDER: EnergyPreset[] = ['chill', 'normal', 'intense', 'coach'];

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

  const testPhrases: Record<EnergyPreset, string> = {
    chill: 'Respiramos profundo. Próximo movimiento.',
    normal: 'Próximo movimiento: salto.',
    intense: 'Salto invertido',
    coach: 'Salto invertido',
  };

  return (
    <div className="app-shell">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setView('home')}
          aria-label="Volver"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: 38,
            height: 38,
            color: 'var(--text-secondary)',
            flexShrink: 0,
            fontSize: 16,
          }}
        >
          ←
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 24 }}>
          AJUSTES
        </h2>
      </header>

      <Section title="ESTILO DE VOZ">
        {!isSupported && (
          <Note>Tu navegador no soporta síntesis de voz. Los anuncios no se escucharán.</Note>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRESET_ORDER.map((p) => (
            <PresetCard
              key={p}
              preset={p}
              active={settings.energyPreset === p}
              onSelect={() => updateSettings({ energyPreset: p })}
              onTest={() => speak(testPhrases[p], { hype: true })}
            />
          ))}
        </div>
      </Section>

      <Section title="VOZ">
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

        <Button variant="secondary" size="sm" onClick={() => speak('Hola, esta es una prueba de voz.', { hype: true })}>
          Probar voz
        </Button>
        <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          El preset puede modificar velocidad, tono, volumen y el texto (mayúsculas, signos de
          exclamación, frases motivacionales).
        </small>
      </Section>

      <Section title="ANUNCIOS">
        <Toggle
          checked={settings.announceMovementName}
          onChange={(v) => updateSettings({ announceMovementName: v })}
          label="Anunciar nombre del movimiento"
        />
        <Toggle
          checked={settings.announceCountdown}
          onChange={(v) => updateSettings({ announceCountdown: v })}
          label="Anunciar cuenta regresiva (3, 2, 1)"
        />
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

      <PremiumVoiceSection />

      <SpotifyAuthSection />

      <div style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
        Tus rutinas y ajustes se guardan en este dispositivo.
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onSelect,
  onTest,
}: {
  preset: EnergyPreset;
  active: boolean;
  onSelect: () => void;
  onTest: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: active ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
        border: active ? '1px solid rgba(0, 212, 255, 0.5)' : '1px solid var(--border-subtle)',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: 14,
          textAlign: 'left',
          padding: 0,
          flex: 1,
          cursor: 'pointer',
        }}
      >
        {active ? '● ' : '○ '}
        {PRESET_LABELS[preset]}
      </button>
      <button
        type="button"
        onClick={onTest}
        aria-label={`Probar preset ${preset}`}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        ▶ probar
      </button>
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

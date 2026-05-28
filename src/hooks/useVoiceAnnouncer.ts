import { useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSpeech } from './useSpeech';
import { useAzureTTS } from './useAzureTTS';
import { getPresetModifiers } from '../utils/voice';
import type { Routine } from '../types';

interface VoiceAnnouncerOpts {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface VoiceAnnouncerReturn {
  speak: (text: string, options?: { hype?: boolean }) => void;
  cancel: () => void;
  preloadRoutine: (
    routine: Routine,
    onProgress?: (done: number, total: number) => void,
  ) => Promise<{ ok: number; failed: number; skipped: boolean }>;
  isPremiumActive: boolean;
}

/**
 * Capa unificada de anuncios. Si la voz premium está activa y los textos
 * fueron pre-generados, usa Azure (audio instantáneo). Si no, cae a speechSynthesis.
 */
export function useVoiceAnnouncer(opts: VoiceAnnouncerOpts = {}): VoiceAnnouncerReturn {
  const settings = useAppStore((s) => s.settings);
  const speech = useSpeech({
    onSpeakStart: opts.onSpeakStart,
    onSpeakEnd: opts.onSpeakEnd,
  });
  const azure = useAzureTTS(settings.premiumVoiceEnabled);

  const isPremiumActive = settings.premiumVoiceEnabled;

  // Refs estables para que el handler de pre-generación no se invalide
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Modifiers del preset traducidos a parámetros SSML que Azure entiende
  const azureProsody = useMemo(() => {
    const mods = getPresetModifiers(settings.energyPreset);
    // rateMultiplier 1 → "+0%", 1.1 → "+10%", 0.9 → "-10%"
    const ratePct = Math.round((mods.rateMultiplier - 1) * 100);
    // pitchDelta 0.15 → "+15%" (aprox; mapeo simple)
    const pitchPct = Math.round(mods.pitchDelta * 100);
    const styleByPreset: Record<string, string | undefined> = {
      coach: 'cheerful',
      intense: 'cheerful',
    };
    return {
      rate: ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`,
      pitch: pitchPct >= 0 ? `+${pitchPct}%` : `${pitchPct}%`,
      style: styleByPreset[settings.energyPreset],
      transform: mods.transformText,
      pickHype: mods.pickHype,
    };
  }, [settings.energyPreset]);

  const speak = useCallback<VoiceAnnouncerReturn['speak']>(
    (text, options) => {
      if (!isPremiumActive) {
        speech.speak(text, options);
        return;
      }
      // En premium NO aplicamos hype dinámico (porque las arengas no están pre-cacheadas
      // y romperían el flow). Solo transformamos texto con el preset.
      const transformed = azureProsody.transform(text);
      void azure.play(
        {
          text: transformed,
          voice: settings.premiumVoiceId,
          rate: azureProsody.rate,
          pitch: azureProsody.pitch,
          style: azureProsody.style,
        },
        {
          onStart: () => optsRef.current.onSpeakStart?.(),
          onEnd: () => optsRef.current.onSpeakEnd?.(),
        },
      );
    },
    [
      isPremiumActive,
      speech,
      azure,
      settings.premiumVoiceId,
      azureProsody.rate,
      azureProsody.pitch,
      azureProsody.style,
      azureProsody.transform,
    ],
  );

  const cancel = useCallback(() => {
    speech.cancel();
    azure.cancel();
  }, [speech, azure]);

  const preloadRoutine = useCallback<VoiceAnnouncerReturn['preloadRoutine']>(
    async (routine, onProgress) => {
      if (!isPremiumActive) {
        return { ok: 0, failed: 0, skipped: true };
      }
      const texts = new Set<string>();
      routine.movements.forEach((m, i) => {
        if (settings.announceMovementName) {
          texts.add(azureProsody.transform(m.name));
        }
        const next = routine.movements[i + 1];
        if (next) {
          texts.add(azureProsody.transform(`Próximo: ${next.name}`));
        }
      });
      if (settings.announceCountdown) {
        ['3', '2', '1'].forEach((n) => texts.add(azureProsody.transform(n)));
      }
      texts.add(azureProsody.transform('¡Rutina completada! Excelente trabajo.'));

      const requests = Array.from(texts).map((text) => ({
        text,
        voice: settings.premiumVoiceId,
        rate: azureProsody.rate,
        pitch: azureProsody.pitch,
        style: azureProsody.style,
      }));

      const result = await azure.preload(requests, onProgress);
      return { ...result, skipped: false };
    },
    [
      isPremiumActive,
      settings.announceMovementName,
      settings.announceCountdown,
      settings.premiumVoiceId,
      azure,
      azureProsody.rate,
      azureProsody.pitch,
      azureProsody.style,
      azureProsody.transform,
    ],
  );

  return { speak, cancel, preloadRoutine, isPremiumActive };
}

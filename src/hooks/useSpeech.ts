import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getPresetModifiers } from '../utils/voice';

interface UseSpeechOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface UseSpeechReturn {
  speak: (text: string, options?: { hype?: boolean }) => void;
  cancel: () => void;
  isSupported: boolean;
  availableVoices: SpeechSynthesisVoice[]; // todas (no solo es-*)
  spanishVoices: SpeechSynthesisVoice[];
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const settings = useAppStore((s) => s.settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      synth.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const spanishVoices = useMemo(
    () => voices.filter((v) => v.lang?.toLowerCase().startsWith('es')),
    [voices],
  );

  const chosenVoice = useMemo(() => {
    // 1) Si hay un voiceURI específico y existe, usarlo
    if (settings.voiceURI) {
      const exact = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (exact) return exact;
    }
    // 2) Caer al mejor match por idioma
    if (spanishVoices.length === 0) return null;
    const exactLang = spanishVoices.find((v) => v.lang === settings.voiceLang);
    if (exactLang) return exactLang;
    const arVariant = spanishVoices.find((v) => v.lang?.toLowerCase() === 'es-ar');
    if (arVariant) return arVariant;
    return spanishVoices[0];
  }, [voices, spanishVoices, settings.voiceURI, settings.voiceLang]);

  const speak = useCallback(
    (text: string, opts: { hype?: boolean } = {}) => {
      if (!isSupported || !text) return;
      const synth = window.speechSynthesis;
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      const mods = getPresetModifiers(settings.energyPreset);
      let finalText = mods.transformText(text);
      if (opts.hype && mods.pickHype) {
        const hype = mods.pickHype();
        if (hype) finalText = `${hype} ${finalText}`;
      }
      const utter = new SpeechSynthesisUtterance(finalText);
      if (chosenVoice) {
        utter.voice = chosenVoice;
        utter.lang = chosenVoice.lang;
      } else {
        utter.lang = settings.voiceLang;
      }
      utter.rate = clamp(settings.voiceRate * mods.rateMultiplier, 0.5, 2);
      utter.pitch = clamp(settings.voicePitch + mods.pitchDelta, 0, 2);
      utter.volume = clamp(settings.voiceVolume * mods.volumeMultiplier, 0, 1);
      utter.onstart = () => optionsRef.current.onSpeakStart?.();
      utter.onend = () => optionsRef.current.onSpeakEnd?.();
      utter.onerror = () => optionsRef.current.onSpeakEnd?.();
      try {
        synth.speak(utter);
      } catch {
        // ignore
      }
    },
    [
      isSupported,
      chosenVoice,
      settings.voiceLang,
      settings.voiceRate,
      settings.voicePitch,
      settings.voiceVolume,
      settings.energyPreset,
    ],
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }, [isSupported]);

  return { speak, cancel, isSupported, availableVoices: voices, spanishVoices };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

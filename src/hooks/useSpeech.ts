import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

interface UseSpeechOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface UseSpeechReturn {
  speak: (text: string, options?: { onEnd?: () => void }) => void;
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
    (text: string, opts: { onEnd?: () => void } = {}) => {
      if (!isSupported || !text) {
        opts.onEnd?.();
        return;
      }
      const synth = window.speechSynthesis;
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      // hype y presets ya no se aplican: la voz va al natural con los valores del usuario.
      const utter = new SpeechSynthesisUtterance(text);
      if (chosenVoice) {
        utter.voice = chosenVoice;
        utter.lang = chosenVoice.lang;
      } else {
        utter.lang = settings.voiceLang;
      }
      utter.rate = clamp(settings.voiceRate, 0.5, 2);
      utter.pitch = clamp(settings.voicePitch, 0, 2);
      utter.volume = clamp(settings.voiceVolume, 0, 1);
      let endFired = false;
      const fireEnd = () => {
        if (endFired) return;
        endFired = true;
        optionsRef.current.onSpeakEnd?.();
        opts.onEnd?.();
      };
      utter.onstart = () => optionsRef.current.onSpeakStart?.();
      utter.onend = fireEnd;
      utter.onerror = fireEnd;
      try {
        synth.speak(utter);
      } catch {
        fireEnd();
      }
    },
    [
      isSupported,
      chosenVoice,
      settings.voiceLang,
      settings.voiceRate,
      settings.voicePitch,
      settings.voiceVolume,
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

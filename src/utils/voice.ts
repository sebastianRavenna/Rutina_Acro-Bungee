import type { EnergyPreset } from '../types';

export interface PresetModifiers {
  rateMultiplier: number;
  pitchDelta: number;
  volumeMultiplier: number;
  /** Transforma el texto que se va a hablar para añadir énfasis. */
  transformText: (text: string) => string;
  /** Frases motivacionales que se pueden anteponer al nombre del movimiento. */
  pickHype?: () => string | null;
}

const COACH_HYPE = [
  '¡Vamos!',
  '¡Con todo!',
  '¡Dale!',
  '¡Fuerza!',
  '¡Ahora!',
  '¡A romperla!',
];

export const PRESET_LABELS: Record<EnergyPreset, string> = {
  chill: 'Chill — relajado',
  normal: 'Normal — neutro',
  intense: 'Intenso — más fuerte',
  coach: 'Coach — gritado con arenga',
};

export function getPresetModifiers(preset: EnergyPreset): PresetModifiers {
  switch (preset) {
    case 'chill':
      return {
        rateMultiplier: 0.9,
        pitchDelta: -0.05,
        volumeMultiplier: 0.9,
        transformText: (t) => t,
      };
    case 'intense':
      return {
        rateMultiplier: 1.1,
        pitchDelta: 0.15,
        volumeMultiplier: 1.0,
        transformText: (t) => `¡${t.trim().replace(/[!.]+$/, '')}!`,
      };
    case 'coach':
      return {
        rateMultiplier: 1.05,
        pitchDelta: 0.25,
        volumeMultiplier: 1.0,
        transformText: (t) => {
          const clean = t.trim().replace(/[!.]+$/, '');
          // Mayúsculas mejora ligeramente la prosodia en algunas voces TTS
          return `¡${clean.toUpperCase()}!`;
        },
        pickHype: () => COACH_HYPE[Math.floor(Math.random() * COACH_HYPE.length)],
      };
    case 'normal':
    default:
      return {
        rateMultiplier: 1,
        pitchDelta: 0,
        volumeMultiplier: 1,
        transformText: (t) => t,
      };
  }
}

// Heurística por nombre — no es perfecta pero ayuda a distinguir voces en la lista.
// Cubre los nombres más comunes en voces TTS de Windows/macOS/iOS/Android/Chrome.
const FEMALE_HINTS = [
  'paulina', 'helena', 'monica', 'mónica', 'marisol', 'esperanza', 'soledad',
  'lucia', 'lucía', 'sabina', 'mariana', 'carmen', 'rosa', 'isabel', 'elena',
  'ines', 'inés', 'angelica', 'angélica', 'female', 'mujer', 'femenina',
  'samantha', 'karen', 'victoria', 'laura', 'sara', 'sofia', 'sofía',
  'google español', 'google español de estados unidos',
];
const MALE_HINTS = [
  'jorge', 'diego', 'carlos', 'juan', 'pablo', 'enrique', 'miguel',
  'pedro', 'luis', 'male', 'hombre', 'masculino', 'daniel',
];

export type VoiceGender = 'female' | 'male' | 'unknown';

export function guessVoiceGender(voiceName: string): VoiceGender {
  const lower = voiceName.toLowerCase();
  if (FEMALE_HINTS.some((h) => lower.includes(h))) return 'female';
  if (MALE_HINTS.some((h) => lower.includes(h))) return 'male';
  return 'unknown';
}

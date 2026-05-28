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

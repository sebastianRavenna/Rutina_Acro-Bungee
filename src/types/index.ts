export interface Movement {
  id: string;
  name: string;
  duration: number;
  notes?: string;
  // Override del aviso previo global. Si es undefined, se usa AppSettings.warnBeforeSeconds.
  warnBeforeSeconds?: number;
}

export interface Routine {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  movements: Movement[];
}

/** Plantilla independiente de cualquier rutina. Al usar una plantilla, se copia. */
export interface MovementTemplate {
  id: string;
  name: string;
  duration: number;
  notes?: string;
  warnBeforeSeconds?: number;
  createdAt: number;
  usageCount: number;
}

export type EnergyPreset = 'chill' | 'normal' | 'intense' | 'coach';

export interface AppSettings {
  warnBeforeSeconds: number;
  voiceLang: string;
  voiceURI: string | null; // voz específica elegida (voice.voiceURI). null = mejor match por lang.
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  energyPreset: EnergyPreset; // 'normal' = no transform; otros aplican modificadores
  announceMovementName: boolean;
  announceCountdown: boolean;
  spotifyEnabled: boolean;
  spotifyClientId: string;
  // Azure TTS (voces premium pre-generadas)
  premiumVoiceEnabled: boolean;
  premiumVoiceId: string; // ej: "es-AR-ElenaNeural"
}

export interface PlaybackState {
  routineId: string;
  currentIndex: number;
  timeLeft: number;
  isPlaying: boolean;
  isFinished: boolean;
}

export type AppView = 'home' | 'editor' | 'playback' | 'settings' | 'library';

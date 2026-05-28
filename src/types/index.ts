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

export interface AppSettings {
  warnBeforeSeconds: number;
  voiceLang: string;
  voiceURI: string | null; // voz específica elegida (voice.voiceURI). null = mejor match por lang.
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  /** Si true, anuncia "Próximo: X" antes del cambio. El nombre del movimiento
   *  al cambiar SIEMPRE se anuncia (independiente de este flag). */
  announceNextMovement: boolean;
  /** Segundos de cuenta regresiva al INICIO de la rutina, después de anunciar
   *  el primer movimiento. 0 = desactivado. */
  startCountdownSeconds: number;
  spotifyEnabled: boolean;
  spotifyClientId: string;
  /** Link o URI de Spotify de la playlist/álbum/canción favorita.
   *  Puede ser un open.spotify.com/... o un spotify:playlist:... */
  spotifyPlaylistUri: string;
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

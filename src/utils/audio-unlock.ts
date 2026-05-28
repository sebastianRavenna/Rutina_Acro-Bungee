// Desbloqueo de audio para autoplay policy del browser.
//
// Chrome/Safari/Firefox bloquean audio.play() si pasó "demasiado tiempo" desde
// el último user gesture (típicamente >5s). El preload del Azure TTS puede
// consumir varios segundos antes del primer play "real", lo que invalida el
// gesture original del click.
//
// Solución: durante el handler del click sincrónico, reproducir un audio
// silencioso muy corto Y resumir un AudioContext. Esto deja al navegador
// con un "audio session" activo que dura toda la sesión.

// WAV minimal válido: header de 44 bytes + 0 muestras de PCM 16-bit mono 44.1kHz.
// Mucho más liviano y confiable que generar un MP3 silencioso.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

let unlocked = false;
let audioCtx: AudioContext | null = null;

/**
 * Llamar SINCRÓNICAMENTE dentro de un event handler de click/touch del usuario.
 * Desbloquea el audio session para que play() asincrónicos posteriores no
 * sean rechazados por autoplay policy.
 */
export async function unlockAudio(): Promise<void> {
  if (unlocked) return;
  unlocked = true; // marcar optimistamente para evitar dobles llamadas

  // 1) AudioContext: si está suspended, resumirlo. En Safari iOS esto es lo
  // que realmente desbloquea el audio system.
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
    }
  } catch (e) {
    console.warn('[audio-unlock] AudioContext failed:', e);
  }

  // 2) Reproducir un WAV silencioso minúsculo para "calentar" el HTMLAudioElement.
  try {
    const a = new Audio(SILENT_WAV);
    a.volume = 0;
    await a.play();
    a.pause();
  } catch (e) {
    console.warn('[audio-unlock] silent audio failed:', e);
    // Si falla esto, igual probamos seguir. AudioContext suele ser suficiente.
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

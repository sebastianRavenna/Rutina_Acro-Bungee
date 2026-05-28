// Lista de voces neuronales españolas disponibles via Azure TTS.
// Endpoint público: NO requiere AZURE_TTS_KEY (es info estática, podríamos
// devolver desde el cliente, pero la centralizamos acá para que la whitelist
// sea la misma que /api/tts).

export const config = {
  runtime: 'edge',
};

export interface AzureVoice {
  id: string; // voiceName ej: "es-AR-ElenaNeural"
  label: string; // "Elena · Argentina"
  gender: 'female' | 'male';
  locale: string; // "es-AR"
  region: string; // "Argentina"
  /** Estilos especiales que soporta esa voz para mstts:express-as. */
  styles?: string[];
}

const VOICES: AzureVoice[] = [
  { id: 'es-AR-ElenaNeural', label: 'Elena · Argentina', gender: 'female', locale: 'es-AR', region: 'Argentina' },
  { id: 'es-AR-TomasNeural', label: 'Tomás · Argentina', gender: 'male', locale: 'es-AR', region: 'Argentina' },
  { id: 'es-MX-DaliaNeural', label: 'Dalia · México', gender: 'female', locale: 'es-MX', region: 'México', styles: ['cheerful'] },
  { id: 'es-MX-JorgeNeural', label: 'Jorge · México', gender: 'male', locale: 'es-MX', region: 'México', styles: ['cheerful'] },
  { id: 'es-ES-ElviraNeural', label: 'Elvira · España', gender: 'female', locale: 'es-ES', region: 'España' },
  { id: 'es-ES-XimenaNeural', label: 'Ximena · España', gender: 'female', locale: 'es-ES', region: 'España' },
  { id: 'es-ES-AlvaroNeural', label: 'Álvaro · España', gender: 'male', locale: 'es-ES', region: 'España' },
  { id: 'es-US-PalomaNeural', label: 'Paloma · EE.UU.', gender: 'female', locale: 'es-US', region: 'EE.UU.' },
  { id: 'es-US-AlonsoNeural', label: 'Alonso · EE.UU.', gender: 'male', locale: 'es-US', region: 'EE.UU.' },
  { id: 'es-CO-SalomeNeural', label: 'Salomé · Colombia', gender: 'female', locale: 'es-CO', region: 'Colombia' },
  { id: 'es-CO-GonzaloNeural', label: 'Gonzalo · Colombia', gender: 'male', locale: 'es-CO', region: 'Colombia' },
  { id: 'es-CL-CatalinaNeural', label: 'Catalina · Chile', gender: 'female', locale: 'es-CL', region: 'Chile' },
  { id: 'es-PE-CamilaNeural', label: 'Camila · Perú', gender: 'female', locale: 'es-PE', region: 'Perú' },
];

export default function handler(_req: Request): Response {
  return new Response(JSON.stringify({ voices: VOICES }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

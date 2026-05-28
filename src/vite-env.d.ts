/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  readonly VITE_AZURE_TTS_ENABLED?: string; // '1' habilita el toggle en Settings (la key vive solo server-side)
  readonly VITE_AZURE_TTS_DEFAULT_VOICE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

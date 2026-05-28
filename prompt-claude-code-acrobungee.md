# PROMPT PARA CLAUDE CODE — AcroBungee Timer PWA

## Contexto
Crear desde cero una aplicación web PWA (Progressive Web App) llamada **AcroBungee Timer**. Es una herramienta para profesores de acro-bungee y gimnasia que les permite programar rutinas o coreografías con pasos cronometrados, y anunciarlos por voz durante la sesión. La app debe poder instalarse en el homescreen del celular y funcionar sin conexión a internet después de la primera carga.

---

## Stack tecnológico

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite
- **PWA**: `vite-plugin-pwa` con Workbox
- **Estilos**: CSS Modules o CSS-in-JS con variables CSS (sin Tailwind, sin UI libraries externas)
- **Estado global**: Zustand (liviano, sin boilerplate)
- **Persistencia**: localStorage (con un wrapper tipado)
- **Audio/Voz**: Web Speech API (`window.speechSynthesis`) — nativa del navegador
- **Pantalla activa**: Wake Lock API (`navigator.wakeLock`)
- **Spotify (opcional)**: Spotify Web Playback SDK + Spotify Web API (OAuth 2.0 PKCE)
- **Deploy target**: Vercel (crear `vercel.json` básico)
- **Sin backend propio**: todo corre en el cliente

---

## Estructura de carpetas a generar

```
acrobungee-timer/
├── public/
│   ├── favicon.svg               # Ícono simple con forma de bungee/silueta
│   ├── icon-192.png              # PWA icon (crear como SVG→PNG o placeholder)
│   ├── icon-512.png              # PWA icon
│   └── robots.txt
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── vite-env.d.ts
│   ├── styles/
│   │   └── global.css            # Variables CSS, reset, fuentes
│   ├── types/
│   │   └── index.ts              # Interfaces TypeScript centralizadas
│   ├── store/
│   │   └── useAppStore.ts        # Zustand store
│   ├── hooks/
│   │   ├── useSpeech.ts          # Web Speech API wrapper
│   │   ├── useWakeLock.ts        # Wake Lock API wrapper
│   │   ├── useTimer.ts           # Lógica del cronómetro
│   │   └── useSpotify.ts         # Spotify SDK wrapper (opcional)
│   ├── utils/
│   │   ├── storage.ts            # localStorage wrapper tipado
│   │   ├── spotify-auth.ts       # OAuth PKCE flow para Spotify
│   │   └── format.ts             # Helpers de formato (tiempo, etc.)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── CircularTimer.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Toggle.tsx
│   │   │   └── Modal.tsx
│   │   ├── setup/
│   │   │   ├── SetupView.tsx          # Vista principal de configuración
│   │   │   ├── RoutineList.tsx        # Lista de rutinas guardadas
│   │   │   ├── MovementEditor.tsx     # Editor de movimientos de una rutina
│   │   │   ├── MovementItem.tsx       # Fila individual de movimiento
│   │   │   └── SettingsPanel.tsx      # Configuración de voz, aviso, Spotify
│   │   ├── playback/
│   │   │   ├── PlaybackView.tsx       # Vista de ejecución
│   │   │   ├── CurrentMovement.tsx    # Card del movimiento actual
│   │   │   ├── NextMovement.tsx       # Card del próximo movimiento
│   │   │   ├── ProgressBar.tsx        # Barra de progreso total
│   │   │   └── PlaybackControls.tsx   # Botones play/pause/stop/skip
│   │   └── spotify/
│   │       ├── SpotifyPanel.tsx       # Panel de control Spotify
│   │       └── SpotifyLogin.tsx       # Botón de login OAuth
├── .env.example                  # Variables de entorno documentadas
├── .gitignore
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## Tipos TypeScript centrales (`src/types/index.ts`)

```typescript
export interface Movement {
  id: string;            // nanoid
  name: string;
  duration: number;      // segundos
  notes?: string;        // nota opcional visible durante playback
}

export interface Routine {
  id: string;            // nanoid
  name: string;
  createdAt: number;     // timestamp
  updatedAt: number;
  movements: Movement[];
}

export interface AppSettings {
  warnBeforeSeconds: number;    // default: 3
  voiceLang: string;            // default: 'es-AR'
  voiceRate: number;            // 0.5–2.0, default: 0.9
  voicePitch: number;           // 0.5–2.0, default: 1.0
  voiceVolume: number;          // 0–1, default: 1.0
  announceMovementName: boolean;   // default: true
  announceCountdown: boolean;      // anunciar "3, 2, 1" final, default: false
  spotifyEnabled: boolean;         // default: false
  spotifyClientId: string;         // ingresado por el usuario
}

export interface PlaybackState {
  routineId: string;
  currentIndex: number;
  timeLeft: number;
  isPlaying: boolean;
  isFinished: boolean;
}
```

---

## Store Zustand (`src/store/useAppStore.ts`)

El store debe manejar:
- `routines: Routine[]` — lista de rutinas guardadas
- `activeRoutineId: string | null` — rutina abierta en el editor
- `settings: AppSettings` — configuración global
- `playback: PlaybackState | null` — estado del playback activo (null = no hay sesión)
- `view: 'home' | 'editor' | 'playback' | 'settings'`

Acciones:
- `createRoutine(name)` → crea rutina vacía y la abre en el editor
- `updateRoutine(id, partial)` → actualiza campos de la rutina
- `deleteRoutine(id)`
- `duplicateRoutine(id)`
- `addMovement(routineId, movement)`
- `updateMovement(routineId, movementId, partial)`
- `deleteMovement(routineId, movementId)`
- `reorderMovements(routineId, fromIndex, toIndex)` → drag or up/down arrows
- `updateSettings(partial)`
- `startPlayback(routineId)`
- `setPlayback(partial)`
- `endPlayback()`

Persistir en localStorage: `routines` y `settings` (no el estado de playback).

---

## Hook `useSpeech` (`src/hooks/useSpeech.ts`)

```typescript
// Debe exponer:
speak(text: string): void      // cancela lo anterior y habla
cancel(): void
isSupported: boolean           // false si el navegador no soporta speechSynthesis
availableVoices: SpeechSynthesisVoice[]  // filtradas por español
```

- Al inicializar, cargar voces con `speechSynthesis.onvoiceschanged`
- Preferir voces con `lang` que empiece con `es`; de existir `es-AR`, usarla primero
- Si no hay voces en español, usar la voz por defecto del sistema
- Aplicar `rate`, `pitch`, `volume` desde `AppSettings`

---

## Hook `useTimer` (`src/hooks/useTimer.ts`)

- Recibe la rutina y los settings
- Maneja el `setInterval` de 1 segundo
- Lógica de aviso previo: cuando `timeLeft === settings.warnBeforeSeconds` y hay movimiento siguiente → llamar `speak("Próximo: " + nextMovement.name)`
- Si `settings.announceCountdown === true` → anunciar "3", "2", "1" cuando `timeLeft <= 3`
- Al llegar a 0: avanzar al siguiente movimiento y hablar su nombre; si era el último → `endPlayback()` y hablar "¡Rutina completada! Excelente trabajo."
- Limpiar interval en unmount y cuando `isPlaying` pasa a false

---

## Vista de Setup — Home (`SetupView`)

- Header con logo/nombre de la app
- Botón prominente "Nueva rutina"
- Lista de rutinas guardadas (`RoutineList`):
  - Cada tarjeta muestra: nombre, cantidad de movimientos, duración total
  - Acciones: Editar, Duplicar, Eliminar (con confirmación), Iniciar ▶
- Acceso a Configuración (ícono engranaje)
- Estado vacío con ilustración si no hay rutinas

---

## Vista de Editor (`MovementEditor`)

- Input editable con el nombre de la rutina (en el header)
- Lista de movimientos (`MovementItem` × n):
  - Número de orden
  - Input de nombre (editable inline)
  - Input numérico de duración en segundos
  - Textarea colapsable para notas opcionales
  - Botones ▲ ▼ para reordenar
  - Botón × para eliminar
- Formulario de agregar movimiento al final:
  - Input nombre + input duración + botón "Agregar" (también con Enter)
- Footer pegado al fondo con:
  - Duración total de la rutina (calculada)
  - Botón "Iniciar rutina ▶" (deshabilitado si no hay movimientos)
- Botón "← Volver" al home sin perder cambios

---

## Vista de Playback (`PlaybackView`)

### Layout (mobile-first, vertical):
```
┌─────────────────────────────────┐
│  [Nombre rutina]  Paso X de Y   │
│  ████████████░░░░░░  (progreso) │
├─────────────────────────────────┤
│                                 │
│   ┌───── EN CURSO ──────┐       │
│   │   Nombre Movimiento  │      │
│   └─────────────────────┘       │
│                                 │
│        ◯ 12                     │  ← CircularTimer
│         SEG                     │
│                                 │
│   ┌───── PRÓXIMO ───────┐       │
│   │   Nombre Movimiento  │      │
│   │     8 seg            │      │
│   └─────────────────────┘       │
│                                 │
│   [Spotify panel si activo]     │
│                                 │
│  [⏮ Ant]  [⏸ Pausa]  [⏭ Sig]  │
│           [✕ Terminar]          │
└─────────────────────────────────┘
```

### Comportamiento:
- Al entrar en playback NO iniciar automáticamente → mostrar overlay de "Listo para comenzar / ▶ INICIAR"
  - **Esto es crucial**: el navegador requiere un gesto del usuario antes de poder usar speechSynthesis y Wake Lock
- Al presionar INICIAR: adquirir WakeLock, hablar nombre del primer movimiento, arrancar timer
- Botón ⏮ Anterior: volver al movimiento anterior (con tiempo completo), hablar su nombre
- Botón ⏭ Siguiente: saltar al próximo movimiento ahora mismo, hablar su nombre
- Botón ⏸ Pausa / ▶ Continuar: pausar/reanudar timer y voz
- Botón ✕ Terminar: confirmar con un modal simple → volver al editor de esa rutina
- Estado "Rutina Completada": reemplazar timer y movimiento actual con mensaje de fin + confetti (CSS puro, sin librería)
- `CircularTimer`: SVG con trazo animado; colores normales = degradado cyan→verde; últimos `warnBeforeSeconds` = degradado naranja→rojo

---

## Integración Spotify (módulo opcional)

### Activación:
En `SettingsPanel`, si el usuario activa "Integrar Spotify":
1. Aparece un input para ingresar su `Client ID` de Spotify Developer
2. Instrucciones inline (colapsables): "Cómo obtener tu Client ID" con pasos
3. Botón "Conectar con Spotify" que dispara el OAuth PKCE flow

### OAuth PKCE flow (`src/utils/spotify-auth.ts`):
- Generar `code_verifier` (random string 64 chars) y `code_challenge` (SHA-256 → base64url)
- Redirect URI: `window.location.origin + '/callback'`  ← debe configurarse en Spotify Developer Dashboard
- Scopes necesarios: `streaming user-read-playback-state user-modify-playback-state user-read-currently-playing`
- Guardar `code_verifier` en sessionStorage antes del redirect
- Al volver al callback (ruta `/callback`): intercambiar code por access_token
- Guardar `access_token` y `refresh_token` en localStorage (encriptados con btoa si se quiere simplicidad, o plain si no importa)
- Manejar refresh automático antes de expirar

### Web Playback SDK (`src/hooks/useSpotify.ts`):
- Cargar el script `https://sdk.scdn.co/spotify-player.js` dinámicamente
- Inicializar `Spotify.Player` con nombre "AcroBungee Timer"
- Exponer: `isReady`, `isPlaying`, `currentTrack`, `deviceId`
- Métodos: `play()`, `pause()`, `nextTrack()`, `previousTrack()`, `setVolume(0-1)`
- **Nota importante**: el SDK requiere Spotify Premium. Si el usuario no tiene Premium, mostrar mensaje claro de error.

### Panel Spotify en Playback (`SpotifyPanel`):
```
┌──────────────────────────────────┐
│ 🎵 [Álbum thumb] Nombre canción  │
│         Artista                  │
│  [⏮]  [⏸/▶]  [⏭]   🔊 ──●──   │
└──────────────────────────────────┘
```
- Mostrar solo si `spotifyEnabled && isSpotifyReady`
- El volumen de Spotify se controla independientemente del volumen de voz
- Cuando la voz habla, bajar el volumen de Spotify al 30% automáticamente y restaurarlo al terminar (ducking)

---

## Diseño visual y CSS

### Paleta de colores (variables CSS en `global.css`):
```css
:root {
  --bg-primary: #060610;
  --bg-secondary: #0d1b35;
  --bg-card: rgba(255, 255, 255, 0.03);
  --border-subtle: rgba(255, 255, 255, 0.07);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-muted: rgba(255, 255, 255, 0.25);
  --accent-cyan: #00d4ff;
  --accent-green: #00ff88;
  --accent-warn: #ff6b35;
  --accent-danger: #ff003c;
  --accent-spotify: #1db954;
  --radius-card: 14px;
  --radius-btn: 60px;
  --radius-input: 8px;
}
```

### Fuentes:
- Título / Display: `'Bebas Neue'` (Google Fonts) — para nombres de movimientos en playback
- Cuerpo: `'DM Sans'` (Google Fonts)
- Monoespaciada (timer): `'Courier New'` o `'Space Mono'` (Google Fonts)

### Fondo:
```css
background: radial-gradient(ellipse at 30% 15%, #0d1b35 0%, #060610 65%);
```

### Principios de diseño:
- Mobile-first, viewport máximo 480px centrado
- Sin scroll horizontal
- Touch targets mínimo 44×44px
- Transiciones suaves (0.2s–0.5s) en cambios de estado
- El card del movimiento actual pulsa suavemente (CSS keyframe `pulse`) mientras corre
- Todo con `box-sizing: border-box`

---

## PWA — `vite.config.ts`

Usar `vite-plugin-pwa` con estas opciones:
```javascript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
  manifest: {
    name: 'AcroBungee Timer',
    short_name: 'AcroBungee',
    description: 'Temporizador de coreografías con voz para acro-bungee y gimnasia',
    theme_color: '#060610',
    background_color: '#060610',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com/,
        handler: 'CacheFirst',
        options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } }
      }
    ]
  }
})
```

---

## `.env.example`

```env
# Spotify (opcional - solo si querés integrar Spotify)
# 1. Creá una app en https://developer.spotify.com/dashboard
# 2. Agregá como Redirect URI: http://localhost:5173/callback (dev) y tu dominio de Vercel (prod)
# 3. Pegá el Client ID acá:
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui

# La app funciona completamente sin estas variables si no usás Spotify
```

---

## `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

---

## `README.md` — debe incluir

1. **Descripción** de la app
2. **Instalación local**: `npm install && npm run dev`
3. **Build**: `npm run build` + `npm run preview`
4. **Deploy a Vercel**: instrucciones con CLI y con dashboard web
5. **Configurar Spotify** (paso a paso con screenshots en texto):
   - Ir a developer.spotify.com/dashboard
   - Crear app
   - Agregar Redirect URIs (localhost + dominio Vercel)
   - Copiar Client ID
   - Activar en Settings dentro de la app
6. **Cómo instalar como PWA** en Android y iOS

---

## Comportamiento de routing

Sin React Router. Usar el estado de Zustand (`view`) para cambiar entre vistas:
- `'home'` → `SetupView` (lista de rutinas)
- `'editor'` → `MovementEditor` (editar rutina activa)
- `'playback'` → `PlaybackView`
- `'settings'` → `SettingsPanel`

La ruta `/callback` debe manejarse con un `useEffect` en `App.tsx` que detecte `?code=` en la URL para completar el OAuth de Spotify.

---

## Consideraciones importantes de implementación

1. **speechSynthesis en iOS**: requiere que el `speak()` sea disparado dentro de un event handler del usuario (click/touch). El overlay de "Listo para comenzar" garantiza esto.

2. **Wake Lock**: envolver siempre en try/catch — no todos los navegadores lo soportan. Si falla, seguir funcionando normalmente.

3. **Voces de speechSynthesis**: las voces se cargan de forma asíncrona. Usar `speechSynthesis.onvoiceschanged` y también llamar `getVoices()` en el primer render (algunos navegadores las cargan sincrónicamente).

4. **nanoid**: usar para generar IDs únicos de rutinas y movimientos. `npm install nanoid`.

5. **Zustand**: `npm install zustand`. Usar el middleware `persist` con `localStorage` para rutinas y settings.

6. **Íconos PWA**: generar `icon-192.png` y `icon-512.png` como archivos PNG simples. Puede ser un SVG convertido con sharp o simplemente colocar placeholders que funcionen — lo importante es que el manifest los referencie y existan.

7. **El Spotify SDK no tiene tipos oficiales de TypeScript**: agregar una declaración mínima en `src/spotify.d.ts`:
```typescript
interface Window {
  Spotify: typeof import('@types/spotify-web-playback-sdk');
  onSpotifyWebPlaybackSDKReady: () => void;
}
```
O instalar `@types/spotify-web-playback-sdk`.

8. **Audio ducking para Spotify**: implementar en `useSpeech.ts` — antes de `synth.speak()` llamar a un callback `onSpeakStart` y al final del utterance llamar `onSpeakEnd`. `useSpotify.ts` se suscribe a esos callbacks para bajar/subir volumen.

9. **Responsive**: aunque el target principal es mobile, debe verse razonablemente bien en desktop (centrado, max-width 480px, con un fondo que rellene el resto de la pantalla).

10. **Accesibilidad mínima**: todos los botones con `aria-label` descriptivos. El timer con `aria-live="polite"` para el valor de segundos.

---

## Checklist de entrega (lo que debe existir al final)

- [ ] `npm install` no produce errores
- [ ] `npm run dev` levanta la app en localhost:5173
- [ ] `npm run build` genera `/dist` sin errores TypeScript
- [ ] Se puede crear, editar y eliminar rutinas
- [ ] Se puede agregar, reordenar y eliminar movimientos
- [ ] El playback avanza automáticamente con countdown visual
- [ ] La voz anuncia el movimiento actual y el aviso previo
- [ ] Wake Lock activo durante playback (con fallback silencioso)
- [ ] Los datos persisten al recargar la página
- [ ] La app es instalable como PWA (manifest + service worker presentes)
- [ ] `vercel.json` presente y correcto
- [ ] `.env.example` documentado
- [ ] `README.md` con instrucciones completas
- [ ] Spotify: si `VITE_SPOTIFY_CLIENT_ID` está en `.env`, el panel de Spotify aparece en Settings y en Playback
- [ ] Sin errores en consola del navegador en flujo normal

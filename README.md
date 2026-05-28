# AcroBungee Timer

PWA para programar rutinas/coreografías de acro-bungee y gimnasia con pasos cronometrados y anuncios por voz. Pensada para que el profe la instale en el celular y la use sin internet durante la clase.

## Features

- Crear, duplicar, editar y eliminar rutinas.
- Movimientos con nombre, duración en segundos y notas opcionales.
- Reordenar movimientos con flechas.
- Aviso previo configurable global (faltan X segundos para el próximo) **y override por movimiento** — algunos pueden avisar a los 3s y otros a los 5s.
- **Biblioteca de movimientos reusables**: guardá cualquier movimiento como plantilla (estrella ☆) y reusalo en otras rutinas desde el editor con un click.
- **Síntesis de voz con presets de energía**: Chill / Normal / Intenso / Coach (gritado con arenga "¡Vamos!", "¡Dale!"). Selector de voz puntual con clasificación heurística femenina/masculina.
- **Voz premium opcional (Azure Cognitive Services)**: voces neuronales actuadas (Elena/AR, Dalia/MX, Elvira/ES, etc.) **pre-generadas al iniciar la rutina** → reproducen sin delay y quedan cacheadas en IndexedDB para próximas sesiones. Requiere internet solo al iniciar.
- Cuenta regresiva 3-2-1 opcional al final de cada paso.
- Cronómetro circular con cambio de color al entrar en zona de aviso.
- Pantalla activa durante la sesión (Wake Lock API, con fallback silencioso si no está soportado).
- **Integración con Spotify** (opcional): controlar reproducción desde la app y *ducking* automático — el volumen baja al 30% cuando habla la voz y se restaura al terminar.
- Persistencia local (localStorage) — rutinas, biblioteca y ajustes sobreviven al refresh.
- Instalable como PWA en Android / iOS y funciona offline después de la primera carga.

## Stack

- React 18 + TypeScript
- Vite + `vite-plugin-pwa` (Workbox)
- Zustand (estado global + persistencia)
- Web Speech API + Wake Lock API

## Desarrollo local

```bash
npm install
npm run dev
```

La app levanta en http://localhost:5173

```bash
npm run build       # genera /dist (typecheck + build de Vite)
npm run preview     # sirve /dist localmente
npm run typecheck   # solo TypeScript
```

## Deploy a Vercel

### Opción 1 — CLI

```bash
npm install -g vercel
vercel              # primer deploy
vercel --prod       # promover a producción
```

### Opción 2 — Dashboard

1. Subí el proyecto a un repo de GitHub.
2. En https://vercel.com/new importá el repo.
3. Vercel detecta Vite automáticamente. Dejá los defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

El archivo `vercel.json` ya está configurado para SPA routing y headers de seguridad.

## Instalar como PWA

### Android (Chrome)

1. Abrí la URL de la app en Chrome.
2. Tocá el menú (⋮) → "Instalar app" o "Añadir a pantalla principal".
3. La app aparece como ícono y se abre en modo standalone.

### iOS (Safari)

1. Abrí la URL en Safari (no funciona desde Chrome iOS).
2. Tocá el botón de compartir (□↑).
3. Bajá en el menú y tocá "Añadir a pantalla de inicio".
4. Confirmá el nombre y "Añadir".

## Spotify

Funciona con OAuth PKCE. **Requiere Spotify Premium** para reproducir (limitación del Web Playback SDK).

### Modo recomendado: Client ID compartido via `.env`

Vos (el dueño del proyecto) creás UNA sola app de Spotify y la otra persona solo loguea con su cuenta:

1. Entrá a https://developer.spotify.com/dashboard con tu cuenta de Spotify.
2. **Create app** → nombre/desc cualquiera.
3. En **Redirect URIs** agregá:
   - `http://localhost:5173/callback` (dev)
   - `https://TU-DOMINIO.vercel.app/callback` (prod)
4. En **APIs used**: tildá *Web API* y *Web Playback SDK*.
5. En la app creada → **User Management** → agregá los emails de las cuentas Premium que van a usarla (hasta 25).
6. Copiá el Client ID y poné `VITE_SPOTIFY_CLIENT_ID=xxx` en `.env` (local) y en Vercel → Settings → Environment Variables (prod).

La otra persona abre la app → Ajustes → Activar Spotify → "Conectar con Spotify" → logea con su cuenta Premium. Cero fricción.

### Modo alternativo: cada usuario carga su Client ID

Si `VITE_SPOTIFY_CLIENT_ID` está vacío, la app muestra un input donde cada usuario pega el suyo (con instrucciones in-app).

### Ducking

Cuando suena la voz (premium o nativa), el volumen de Spotify baja automáticamente al 30% y se restaura cuando termina.

## Voz Premium (Azure Cognitive Services)

Voces neuronales actuadas en español (Elena/AR, Dalia/MX, Elvira/ES y más). **Pre-generadas al iniciar la rutina** → reproducen sin delay durante el playback y quedan cacheadas en IndexedDB para sesiones futuras.

### Setup

1. https://portal.azure.com → crear recurso **Speech** (free tier F0: 500K caracteres/mes).
2. Recurso → "Keys and Endpoint" → copiar `KEY 1` y la `Region`.
3. En Vercel: Settings → Environment Variables, agregar:
   - `AZURE_TTS_KEY=tu_key`
   - `AZURE_TTS_REGION=eastus` *(o la que te tocó)*
4. En local: mismo en `.env` (sin prefijo `VITE_`, viven solo server-side).
5. Abrir la app → Ajustes → "Usar voces neuronales premium" → elegir voz → ▶ Probar.

**Importante**: las vars `AZURE_TTS_*` NO tienen prefijo `VITE_` a propósito — solo se exponen al servidor (Vercel Function `/api/tts`). Nunca llegan al frontend, así la API key está protegida.

### Cómo funciona el pre-load

Cuando la profe toca "▶ INICIAR":
1. La app calcula todos los textos necesarios (nombre de cada movimiento + "Próximo: X" + "3"/"2"/"1" si countdown está activo + "¡Rutina completada!").
2. Pide los MP3 al endpoint `/api/tts` en paralelo (4 a la vez).
3. Muestra una barra "PREPARANDO N%" mientras tanto.
4. Una vez listos, arranca el timer. Los audios se reproducen instantáneamente.
5. Próxima vez que se corra esa rutina sin cambios: sale del cache de IndexedDB → 0 delay total.

Si falla la red o no hay Azure configurado, la app cae automáticamente a la voz del navegador.

## Privacidad

- No hay backend. Todos los datos viven en `localStorage` del navegador.
- Sin telemetría, sin tracking, sin cuentas.

## Limitaciones conocidas

- **iOS y voz:** `speechSynthesis` requiere que la primera reproducción se dispare desde un gesto del usuario. La pantalla "Listo para comenzar / ▶ INICIAR" cumple ese requisito.
- **Wake Lock:** no está soportado en todos los navegadores (notablemente algunas versiones de Safari iOS). Si falla, la app sigue funcionando pero la pantalla puede apagarse.
- **Voces en español:** la lista de voces disponibles depende del sistema operativo. Algunos navegadores cargan las voces de forma asíncrona la primera vez.

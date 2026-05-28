// Vercel Function: proxy a Azure Cognitive Services Text-to-Speech.
// La API key vive SOLO acá (server-side) — nunca llega al frontend.
//
// Variables de entorno requeridas (configurar en Vercel Dashboard → Settings → Environment Variables):
//   AZURE_TTS_KEY    — Subscription Key del recurso Speech
//   AZURE_TTS_REGION — Region del recurso (ej: "eastus", "brazilsouth", "westeurope")
//
// Modelo: Edge Function (response como Web Response, soporta streams binarios).

export const config = {
  runtime: 'edge',
};

interface RequestBody {
  text: string;
  voice?: string; // ej: "es-AR-ElenaNeural"
  rate?: string; // ej: "+10%", "-5%"
  pitch?: string; // ej: "+15%", "-10%"
  style?: string; // ej: "cheerful", "shouting" (algunos modelos lo soportan)
}

// Voces neuronales en español permitidas — whitelist defensiva para que no abusen del proxy.
// El valor es la lista de styles que esa voz soporta (vía mstts:express-as). Vacío = no usa styles.
const ALLOWED_VOICES: Record<string, string[]> = {
  'es-AR-ElenaNeural': [],
  'es-AR-TomasNeural': [],
  'es-MX-DaliaNeural': ['cheerful'],
  'es-MX-JorgeNeural': ['cheerful'],
  'es-ES-ElviraNeural': [],
  'es-ES-AlvaroNeural': [],
  'es-ES-XimenaNeural': [],
  'es-US-PalomaNeural': [],
  'es-US-AlonsoNeural': [],
  'es-CO-SalomeNeural': [],
  'es-CO-GonzaloNeural': [],
  'es-CL-CatalinaNeural': [],
  'es-PE-CamilaNeural': [],
};

const MAX_TEXT_LENGTH = 400; // anti-abuse: ningún anuncio razonable supera esto

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isZeroPercent(v: string | undefined): boolean {
  if (!v) return true;
  const trimmed = v.trim();
  return trimmed === '+0%' || trimmed === '-0%' || trimmed === '0%' || trimmed === '';
}

function buildSSML(body: Required<Pick<RequestBody, 'text' | 'voice'>> & RequestBody): string {
  const safeText = escapeXml(body.text);
  const lang = body.voice.slice(0, 5); // "es-AR" etc.

  // Si rate y pitch son ambos 0, OMITIMOS el <prosody> y dejamos que la voz
  // suene a su ritmo natural. Envolver con "+0%" puede alterar sutilmente el
  // ritmo y hacer que suene "rara" o ligeramente acelerada.
  const hasRate = !isZeroPercent(body.rate);
  const hasPitch = !isZeroPercent(body.pitch);
  const hasProsody = hasRate || hasPitch;
  const rateAttr = hasRate ? ` rate="${body.rate}"` : '';
  const pitchAttr = hasPitch ? ` pitch="${body.pitch}"` : '';
  const prosodyOpen = hasProsody ? `<prosody${rateAttr}${pitchAttr}>` : '';
  const prosodyClose = hasProsody ? `</prosody>` : '';

  // Si se pidió style y la voz lo soporta, lo aplicamos via mstts express-as
  const styleOpen = body.style ? `<mstts:express-as style="${escapeXml(body.style)}">` : '';
  const styleClose = body.style ? `</mstts:express-as>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${lang}">
  <voice name="${body.voice}">
    ${styleOpen}${prosodyOpen}${safeText}${prosodyClose}${styleClose}
  </voice>
</speak>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION;
  if (!key || !region) {
    return jsonError(500, 'Azure TTS no está configurado en el servidor (faltan AZURE_TTS_KEY / AZURE_TTS_REGION).');
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, 'Body JSON inválido');
  }

  const text = (body.text ?? '').trim();
  if (!text) return jsonError(400, 'Falta el texto');
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(400, `Texto demasiado largo (max ${MAX_TEXT_LENGTH})`);
  }

  const voice = body.voice ?? 'es-AR-ElenaNeural';
  const supportedStyles = ALLOWED_VOICES[voice];
  if (!supportedStyles) {
    return jsonError(400, `Voz no permitida: ${voice}`);
  }

  // Filtrar style: si la voz no lo soporta, lo descartamos en lugar de fallar.
  // (Azure devuelve 400 si mandás un style que la voz no entiende.)
  const safeStyle = body.style && supportedStyles.includes(body.style) ? body.style : undefined;

  const ssml = buildSSML({ text, voice, rate: body.rate, pitch: body.pitch, style: safeStyle });
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const azureRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      // Audio en 48kHz / 192kbps suena mucho más natural que 24kHz/48kbps,
      // y el ancho de banda extra es despreciable para anuncios cortos.
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'AcroBungeeTimer/0.1',
    },
    body: ssml,
  });

  if (!azureRes.ok) {
    const azureBody = await azureRes.text().catch(() => '');
    // Log server-side para debug (aparece en la terminal donde corre `npm run dev`)
    console.error('[api/tts] Azure rechazó la request:', {
      status: azureRes.status,
      voice,
      region,
      bodyExcerpt: azureBody.slice(0, 500),
      ssmlExcerpt: ssml.slice(0, 500),
    });
    return jsonError(
      azureRes.status,
      `Azure ${azureRes.status} (voz=${voice}, región=${region}): ${azureBody.slice(0, 200) || '(respuesta vacía — probablemente la voz no está disponible en esta región)'}`,
    );
  }

  const arrayBuffer = await azureRes.arrayBuffer();
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

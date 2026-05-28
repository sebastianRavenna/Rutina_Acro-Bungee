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

// Voces neuronales en español permitidas — whitelist defensiva para que no abusen del proxy
const ALLOWED_VOICES = new Set([
  'es-AR-ElenaNeural',
  'es-AR-TomasNeural',
  'es-MX-DaliaNeural',
  'es-MX-JorgeNeural',
  'es-ES-ElviraNeural',
  'es-ES-AlvaroNeural',
  'es-ES-XimenaNeural',
  'es-US-PalomaNeural',
  'es-US-AlonsoNeural',
  'es-CO-SalomeNeural',
  'es-CO-GonzaloNeural',
  'es-CL-CatalinaNeural',
  'es-PE-CamilaNeural',
]);

const MAX_TEXT_LENGTH = 400; // anti-abuse: ningún anuncio razonable supera esto

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSSML(body: Required<Pick<RequestBody, 'text' | 'voice'>> & RequestBody): string {
  const safeText = escapeXml(body.text);
  const rate = body.rate ?? '+0%';
  const pitch = body.pitch ?? '+0%';
  const lang = body.voice.slice(0, 5); // "es-AR" etc.

  // Si se pidió style y la voz lo soporta, lo aplicamos via mstts express-as
  const styleOpen = body.style ? `<mstts:express-as style="${escapeXml(body.style)}">` : '';
  const styleClose = body.style ? `</mstts:express-as>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${lang}">
  <voice name="${body.voice}">
    ${styleOpen}<prosody rate="${rate}" pitch="${pitch}">${safeText}</prosody>${styleClose}
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
  if (!ALLOWED_VOICES.has(voice)) {
    return jsonError(400, `Voz no permitida: ${voice}`);
  }

  const ssml = buildSSML({ text, voice, rate: body.rate, pitch: body.pitch, style: body.style });
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const azureRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'AcroBungeeTimer/0.1',
    },
    body: ssml,
  });

  if (!azureRes.ok) {
    const text = await azureRes.text().catch(() => '');
    return jsonError(azureRes.status, `Azure TTS error ${azureRes.status}: ${text.slice(0, 300)}`);
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

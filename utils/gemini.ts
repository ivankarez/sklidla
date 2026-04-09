export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_TEXT_MODEL = 'gemini-3-flash-preview';
export const GEMINI_VISION_MODEL = 'gemini-3-flash-preview';

const parseMaybeJson = (rawText: string): unknown => {
  const text = rawText.trim();
  if (!text) throw new Error('EMPTY AI RESPONSE');
  return JSON.parse(text);
};

export const requestGeminiJson = async (
  apiKey: string,
  model: string,
  prompt: string,
  imageBase64?: string
): Promise<unknown> => {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;

  const parts: any[] = [];
  if (imageBase64) {
    const base64Data = typeof imageBase64 === 'string' ? imageBase64.replace(/^data:[^;]+;base64,/, '') : '';
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64Data } });
  }
  parts.push({ text: prompt });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      'HTTP-Referer': 'https://sklidla.app',
      'X-Title': 'Sklidla',
    },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || `GEMINI HTTP ${response.status}`;
    throw new Error(message);
  }

  let outputText = '';
  if (Array.isArray(json?.candidates) && json.candidates.length > 0) {
    const candidate = json.candidates[0];
    if (typeof candidate?.content === 'string') outputText = candidate.content;
    else if (Array.isArray(candidate?.content)) {
      outputText = candidate.content.map((c: any) => (typeof c === 'string' ? c : (c?.text || ''))).join('\n').trim();
    } else if (typeof candidate?.output === 'string') outputText = candidate.output;
    else if (candidate?.content?.[0]?.text) outputText = candidate.content[0].text;
  } else if (Array.isArray(json?.outputs) && json.outputs.length > 0) {
    const output = json.outputs[0];
    if (typeof output?.content === 'string') outputText = output.content;
    else if (Array.isArray(output?.content)) {
      outputText = output.content.map((p: any) => (typeof p === 'string' ? p : (p?.text || ''))).join('\n').trim();
    } else if (typeof output?.text === 'string') outputText = output.text;
  }

  if (!outputText) outputText = JSON.stringify(json);

  try {
    return parseMaybeJson(outputText);
  } catch (e) {
    throw new Error(`FAILED_TO_PARSE_GEMINI_RESPONSE: ${(e instanceof Error) ? e.message : String(e)}`);
  }
};

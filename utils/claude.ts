export const CLAUDE_URL = 'https://api.anthropic.com/v1/complete';
export const CLAUDE_TEXT_MODEL = 'claude-2.1';

const parseMaybeJson = (rawText: string): unknown => {
  const text = rawText.trim();
  if (!text) throw new Error('EMPTY AI RESPONSE');
  return JSON.parse(text);
};

export const requestClaudeJson = async (
  apiKey: string,
  model: string,
  prompt: string,
  imageBase64?: string
): Promise<unknown> => {
  const url = CLAUDE_URL;

  const base64Data = typeof imageBase64 === 'string' ? imageBase64.replace(/^data:[^;]+;base64,/, '') : undefined;
  const finalPrompt = base64Data ? `${prompt}\n\nINLINE_IMAGE_BASE64:${base64Data}` : prompt;

  const body = {
    model,
    prompt: finalPrompt,
    max_tokens_to_sample: 1024,
    temperature: 0.0,
  } as any;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || json?.error || json?.message || `CLAUDE HTTP ${response.status}`;
    throw new Error(message);
  }

  // Extract textual completion
  const outputText = json?.completion || json?.output || json?.response || JSON.stringify(json);

  try {
    return parseMaybeJson(outputText);
  } catch (e) {
    throw new Error(`FAILED_TO_PARSE_CLAUDE_RESPONSE: ${(e instanceof Error) ? e.message : String(e)}`);
  }
};

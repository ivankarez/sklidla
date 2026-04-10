import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { getSetting } from '../db/dao';
import { CLAUDE_TEXT_MODEL, requestClaudeJson } from './claude';

type AiProviderName = 'OpenRouter' | 'OpenAI' | 'Gemini' | 'Claude';

export interface AnalyzeImageInput {
  base64Image: string;
  nameHint?: string;
  brandHint?: string;
}

export interface ServingSizeSuggestion {
  name: string;
  weight_g: number;
}

export interface AiExtractionResult {
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  estimated_weight_g?: number;
  serving_size_g?: number;
  serving_sizes?: ServingSizeSuggestion[];
  detection_type?: 'label' | 'food' | 'mixed' | 'unknown';
}

export interface FoodNameAutofillInput {
  name: string;
  brand: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fats_per_100g: number | null;
  serving_sizes: ServingSizeSuggestion[] | null;
}

export interface FoodNameAutofillResult {
  name: string | null;
  brand: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fats_per_100g: number | null;
  serving_sizes: ServingSizeSuggestion[] | null;
}

interface AiProvider {
  analyzeImage(input: AnalyzeImageInput): Promise<AiExtractionResult>;
}

interface ProviderConfig {
  name: AiProviderName;
  apiKey: string;
}

interface ChatMessagePartText {
  type: 'text';
  text: string;
}

interface ChatMessagePartImage {
  type: 'image_url';
  imageUrl: { url: string };
}

type ChatMessagePart = ChatMessagePartText | ChatMessagePartImage;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_VISION_MODEL = 'openai/gpt-5.4:online';
const OPENAI_VISION_MODEL = 'gpt-5.4';
const OPENROUTER_TEXT_MODEL = 'openai/gpt-5.4:online';
const OPENAI_TEXT_MODEL = 'gpt-5.4';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_TEXT_MODEL = 'gemini-3-flash-preview';
const GEMINI_VISION_MODEL = 'gemini-3-flash-preview';

const toNonNegativeNumber = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
};

const toNullableNonNegativeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
};

const sanitizeServingSizes = (value: unknown): ServingSizeSuggestion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const weight = toNonNegativeNumber(item?.weight_g);
      if (!name || weight <= 0) return null;
      return { name, weight_g: weight };
    })
    .filter((item): item is ServingSizeSuggestion => item !== null)
    .slice(0, 3);
};

const sanitizeAiExtraction = (raw: unknown): AiExtractionResult => {
  const data = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const rawName = typeof data.name === 'string' ? data.name.trim() : '';
  const invalidNames = new Set([
    'the void',
    'black image',
    'unknown',
    'n/a',
    'none',
    'null',
    '',
  ]);
  const name = invalidNames.has(rawName.toLowerCase()) ? '' : rawName;
  const brand = typeof data.brand === 'string' ? data.brand.trim() : undefined;
  const detectionTypeRaw = typeof data.detection_type === 'string' ? data.detection_type : 'unknown';
  const detection_type: AiExtractionResult['detection_type'] =
    detectionTypeRaw === 'label' ||
    detectionTypeRaw === 'food' ||
    detectionTypeRaw === 'mixed'
      ? detectionTypeRaw
      : 'unknown';

  const estimatedWeight = toNonNegativeNumber(data.estimated_weight_g);
  const servingSize = toNonNegativeNumber(data.serving_size_g);

  return {
    name,
    ...(brand ? { brand } : {}),
    calories_per_100g: toNonNegativeNumber(data.calories_per_100g),
    protein_per_100g: toNonNegativeNumber(data.protein_per_100g),
    carbs_per_100g: toNonNegativeNumber(data.carbs_per_100g),
    fats_per_100g: toNonNegativeNumber(data.fats_per_100g),
    ...(estimatedWeight > 0 ? { estimated_weight_g: estimatedWeight } : {}),
    ...(servingSize > 0 ? { serving_size_g: servingSize } : {}),
    serving_sizes: sanitizeServingSizes(data.serving_sizes),
    detection_type,
  };
};

const sanitizeFoodNameAutofill = (raw: unknown): FoodNameAutofillResult => {
  const data = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const nameRaw = typeof data.name === 'string' ? data.name.trim() : '';
  const brandRaw = typeof data.brand === 'string' ? data.brand.trim() : '';
  const servings = sanitizeServingSizes(data.serving_sizes);

  return {
    name: nameRaw || null,
    brand: brandRaw || null,
    calories_per_100g: toNullableNonNegativeNumber(data.calories_per_100g),
    protein_per_100g: toNullableNonNegativeNumber(data.protein_per_100g),
    carbs_per_100g: toNullableNonNegativeNumber(data.carbs_per_100g),
    fats_per_100g: toNullableNonNegativeNumber(data.fats_per_100g),
    serving_sizes: servings.length > 0 ? servings : null,
  };
};

const buildUnifiedPrompt = (nameHint?: string, brandHint?: string): string => {
  const cleanedName = nameHint?.trim();
  const cleanedBrand = brandHint?.trim();

  const hintLines: string[] = [];
  if (cleanedName) hintLines.push(`- User-provided name hint: "${cleanedName}"`);
  if (cleanedBrand) hintLines.push(`- User-provided brand hint: "${cleanedBrand}"`);
  const hintBlock = hintLines.length > 0
    ? `Context hints from user (high priority unless clearly contradicted by image):\n${hintLines.join('\n')}\n`
    : 'No user hints provided for name/brand. If missing from image, make your best guess.\n';

  return `You are a precise nutrition AI for a tracking app.
Analyze the provided image and automatically decide what it is:
- nutrition label,
- food/photo of meal,
- mixed or unclear.

${hintBlock}
Return ONLY a valid JSON object (no markdown, no explanation) with this schema:
{
  "detection_type": "label" | "food" | "mixed" | "unknown",
  "name": "Best product/food name. Use hint if available and plausible; otherwise guess.",
  "brand": "Brand if visible or strongly implied; else empty string",
  "calories_per_100g": 0,
  "protein_per_100g": 0,
  "carbs_per_100g": 0,
  "fats_per_100g": 0,
  "estimated_weight_g": 0,
  "serving_size_g": 0,
  "serving_sizes": [
    { "name": "serving", "weight_g": 40 }
    ...
  ],
  "image_analysis_notes": "Optional field for your internal use, not shown to user. Include any important details about how you derived the macros, especially if estimation was involved."
}

Rules:
- Always normalize macros to per 100g.
- If only per-serving values are visible, convert to per 100g.
- Include 1-3 serving sizes when possible.
- For food photos, estimate realistic values.
- For labels, prioritize OCR-accurate extraction.
- Use 0 when truly unknown, never null.
- If the image is too dark/blank/blurry to read, set detection_type to "unknown", set macros to 0, and set name to empty string.
- Never invent joke or placeholder names like "The Void" or "Black image".`;
};

const buildFoodNameAutofillPrompt = (input: FoodNameAutofillInput): string => {
  return `You are a precise nutrition AI for a food logging app.
Given a partial food JSON, fill only missing nutrition and serving fields.

Input JSON:
${JSON.stringify(input, null, 2)}

Return ONLY a valid JSON object (no markdown/explanations) with exactly these keys:
{
  "name": "string or null",
  "brand": "string or null",
  "calories_per_100g": number or null,
  "protein_per_100g": number or null,
  "carbs_per_100g": number or null,
  "fats_per_100g": number or null,
  "serving_sizes": [{ "name": "string", "weight_g": number }] or null
}

Rules:
- Keep all non-null input values unchanged.
- Fill only null fields when a realistic estimate is possible.
- Keep all macros normalized to per 100g.
- Use realistic nutrition ranges. Never use negative values.
- If uncertain, keep field as null.
- For serving_sizes, provide 1-3 practical units when inferable (e.g., slice, cup, piece), otherwise null.`;
};

const extractTextFromContent = (content: unknown): string => {
  console.log('Raw AI content:', content);
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof (item as any).text === 'string') {
          return (item as any).text;
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  if (content && typeof content === 'object') {
    return JSON.stringify(content);
  }
  return '';
};

const parseMaybeJson = (rawText: string): unknown => {
  const text = rawText.trim();
  if (!text) throw new Error('EMPTY AI RESPONSE');
  return JSON.parse(text);
};

const parseChatJsonRaw = (responseJson: any): unknown => {
  if (responseJson?.error) {
    throw new Error(responseJson.error.message || 'UNKNOWN AI FAILURE');
  }
  const content = responseJson?.choices?.[0]?.message?.content;
  const rawText = extractTextFromContent(content);
  return parseMaybeJson(rawText);
};

const parseChatJsonContent = (responseJson: any): AiExtractionResult => {
  const parsed = parseChatJsonRaw(responseJson);
  console.log('Parsed AI JSON:', parsed);
  return sanitizeAiExtraction(parsed);
};

const requestOpenRouterJson = async (apiKey: string, model: string, prompt: string): Promise<unknown> => {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sklidla.app',
      'X-Title': 'Sklidla',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || `OPENROUTER HTTP ${response.status}`;
    throw new Error(message);
  }
  return parseChatJsonRaw(json);
};

const requestOpenAiJson = async (apiKey: string, model: string, prompt: string): Promise<unknown> => {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || `OPENAI HTTP ${response.status}`;
    throw new Error(message);
  }
  return parseChatJsonRaw(json);
};

export const requestGeminiJson = async (apiKey: string, model: string, prompt: string, imageBase64?: string): Promise<unknown> => {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;

  // Build parts: if image present, put inline_data first, then text prompt
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
    body: JSON.stringify(
      { 
        contents: [{ parts }],
        tools: [ { google_search: {} } ]
      }
    ),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || `GEMINI HTTP ${response.status}`;
    throw new Error(message);
  }

  // Extract textual output from Gemini response (candidates or outputs shapes)
  let outputText = json.candidates[0]?.content?.parts[0]?.text || '';

  if (!outputText) outputText = JSON.stringify(json);

  // Parse the returned text as JSON and return the parsed object (same shape as requestOpenAiJson/requestOpenRouterJson)
  try {
    return parseMaybeJson(outputText);
  } catch (e) {
    throw new Error(`FAILED_TO_PARSE_GEMINI_RESPONSE: ${(e instanceof Error) ? e.message : String(e)}`);
  }
};

class OpenRouterProvider implements AiProvider {
  constructor(private readonly config: ProviderConfig) {}

  private async analyzeWithModel(input: AnalyzeImageInput, model: string): Promise<AiExtractionResult> {
    const prompt = buildUnifiedPrompt(input.nameHint, input.brandHint);
    const content: unknown[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.base64Image}` } },
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://sklidla.app',
        'X-Title': 'Sklidla',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }],
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      const message = json?.error?.message || `OPENROUTER HTTP ${response.status}`;
      throw new Error(message);
    }
    return parseChatJsonContent(json);
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<AiExtractionResult> {
    return this.analyzeWithModel(input, OPENROUTER_VISION_MODEL);
  }
}

class OpenAiProvider implements AiProvider {
  constructor(private readonly config: ProviderConfig) {}

  async analyzeImage(input: AnalyzeImageInput): Promise<AiExtractionResult> {
    const prompt = buildUnifiedPrompt(input.nameHint, input.brandHint);
    const content: ChatMessagePart[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', imageUrl: { url: `data:image/jpeg;base64,${input.base64Image}` } },
    ];

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }],
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      const message = json?.error?.message || `OPENAI HTTP ${response.status}`;
      throw new Error(message);
    }
    return parseChatJsonContent(json);
  }
}

class GeminiProvider implements AiProvider {
  constructor(private readonly config: ProviderConfig) {}

  async analyzeImage(input: AnalyzeImageInput): Promise<AiExtractionResult> {
    const prompt = buildUnifiedPrompt(input.nameHint, input.brandHint);
    try {
      const parsed = await requestGeminiJson(this.config.apiKey, GEMINI_VISION_MODEL, prompt, input.base64Image);
      return sanitizeAiExtraction(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GEMINI FAILURE';
      throw new Error(message);
    }
  }
}

class ClaudeProvider implements AiProvider {
  constructor(private readonly config: ProviderConfig) {}

  async analyzeImage(input: AnalyzeImageInput): Promise<AiExtractionResult> {
    const prompt = buildUnifiedPrompt(input.nameHint, input.brandHint);
    try {
      const parsed = await requestClaudeJson(this.config.apiKey, CLAUDE_TEXT_MODEL, prompt, input.base64Image);
      return sanitizeAiExtraction(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CLAUDE FAILURE';
      throw new Error(message);
    }
  }
}

const loadProviderConfig = async (): Promise<ProviderConfig | null> => {
  const aiProvider = (await getSetting('ai_provider')) || 'OpenRouter';
  const providerName: AiProviderName =
    aiProvider === 'OpenAI' || aiProvider === 'Gemini' || aiProvider === 'Claude'
      ? aiProvider
      : 'OpenRouter';

  let apiKey = await SecureStore.getItemAsync('apiKey');
  if (!apiKey) {
    const openRouterKey = await SecureStore.getItemAsync('openRouterKey');
    const openAiKey = await SecureStore.getItemAsync('openAiKey');
    apiKey = openRouterKey || openAiKey || null;
  }

  if (!apiKey) {
    Alert.alert('NO API KEY', 'PLEASE ADD A BYOK KEY IN THE VAULT.');
    return null;
  }

  return { name: providerName, apiKey };
};

const createProvider = (config: ProviderConfig): AiProvider => {
  switch (config.name) {
    case 'OpenAI':
      return new OpenAiProvider(config);
    case 'Gemini':
      return new GeminiProvider(config);
    case 'Claude':
      return new ClaudeProvider(config);
    case 'OpenRouter':
    default:
      return new OpenRouterProvider(config);
  }
};

export async function processFoodImage(input: AnalyzeImageInput): Promise<AiExtractionResult | null> {
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  const config = await loadProviderConfig();
  if (!config) return null;

  try {
    const provider = createProvider(config);
    return await provider.analyzeImage(input);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'FAILED TO REACH AI CORE.';
    Alert.alert('AI ERROR', message);
    return null;
  }
}

export async function processFoodNameAutofill(input: FoodNameAutofillInput): Promise<FoodNameAutofillResult | null> {
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  const config = await loadProviderConfig();
  if (!config) return null;

  try {
    const prompt = buildFoodNameAutofillPrompt(input);
    const raw =
      config.name === 'OpenAI'
        ? await requestOpenAiJson(config.apiKey, OPENAI_TEXT_MODEL, prompt)
        : config.name === 'OpenRouter'
          ? await requestOpenRouterJson(config.apiKey, OPENROUTER_TEXT_MODEL, prompt)
          : config.name === 'Gemini'
            ? await requestGeminiJson(config.apiKey, GEMINI_TEXT_MODEL, prompt)
            : config.name === 'Claude'
              ? await requestClaudeJson(config.apiKey, CLAUDE_TEXT_MODEL, prompt)
              : (() => {
                  throw new Error(`${config.name.toUpperCase()} DIRECT PROVIDER NOT IMPLEMENTED YET. USE OPENROUTER OR OPENAI.`);
                })();
    return sanitizeFoodNameAutofill(raw);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'FAILED TO REACH AI CORE.';
    Alert.alert('AI ERROR', message);
    return null;
  }
}

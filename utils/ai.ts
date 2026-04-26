import { getSetting } from '@/db/dao';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  NoObjectGeneratedError,
  Output,
  generateText,
  type JSONValue,
  type LanguageModel,
  type Schema,
  type ToolSet,
} from 'ai';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { buildFoodNameAutofillPrompt, buildUnifiedPrompt } from './ai-prompts';
import {
  aiExtractionSchema,
  foodNameAutofillSchema,
  sanitizeAiExtraction,
  sanitizeFoodNameAutofill,
  type AiExtractionResult,
  type AiProviderName,
  type AnalyzeImageInput,
  type FoodNameAutofillInput,
  type FoodNameAutofillResult,
  type StructuredAiExtractionOutput,
  type StructuredFoodNameAutofillOutput,
} from './ai-schemas';

export type {
  AiExtractionResult,
  AnalyzeImageInput,
  FoodNameAutofillInput,
  FoodNameAutofillResult,
  ServingSizeSuggestion
} from './ai-schemas';

interface ProviderConfig {
  name: AiProviderName;
  apiKey: string;
}

interface ModelContext {
  model: LanguageModel;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  tools?: ToolSet;
}

type AiTaskKind = 'text' | 'vision';

const APP_URL = 'https://sklidla.app';
const APP_NAME = 'Sklidla';
const OPENROUTER_VISION_MODEL = 'google/gemini-3-flash-preview:online';
const OPENAI_VISION_MODEL = 'gpt-5.4';
const OPENROUTER_TEXT_MODEL = 'google/gemini-3-flash-preview:online';
const OPENAI_TEXT_MODEL = 'gpt-5.4';
const GEMINI_TEXT_MODEL = 'gemini-3-flash-preview';
const GEMINI_VISION_MODEL = 'gemini-3-flash-preview';
const AI_DEBUG_PREFIX = '[AI]';
const AI_SLOW_WARNING_MS = 15000;
const AI_STUCK_WARNING_MS = 45000;

let aiRequestCounter = 0;

const stripBase64Prefix = (value: string): string => value.replace(/^data:[^;]+;base64,/, '');

const createAiRequestId = (taskKind: AiTaskKind): string => {
  aiRequestCounter += 1;
  return `${taskKind}-${Date.now()}-${aiRequestCounter}`;
};

const logAi = (requestId: string, message: string, details?: Record<string, unknown>) => {
  if (details) {
    console.log(`${AI_DEBUG_PREFIX} ${requestId} ${message}`, details);
    return;
  }

  console.log(`${AI_DEBUG_PREFIX} ${requestId} ${message}`);
};

const warnAi = (requestId: string, message: string, details?: Record<string, unknown>) => {
  if (details) {
    console.warn(`${AI_DEBUG_PREFIX} ${requestId} ${message}`, details);
    return;
  }

  console.warn(`${AI_DEBUG_PREFIX} ${requestId} ${message}`);
};

const buildModelContext = (config: ProviderConfig, taskKind: AiTaskKind): ModelContext => {
  switch (config.name) {
    case 'OpenAI': {
      const provider = createOpenAI({ apiKey: config.apiKey });

      return {
        model: provider(taskKind === 'vision' ? OPENAI_VISION_MODEL : OPENAI_TEXT_MODEL),
        providerOptions: {
          openai: {
            store: false,
          },
        },
        tools: {
          web_search: provider.tools.webSearch({
            externalWebAccess: true,
          }),
        },
      };
    }
    case 'Gemini': {
      const provider = createGoogleGenerativeAI({
        apiKey: config.apiKey,
        headers: {
          'HTTP-Referer': APP_URL,
          'X-Title': APP_NAME,
        },
      });

      return {
        model: provider(taskKind === 'vision' ? GEMINI_VISION_MODEL : GEMINI_TEXT_MODEL),
        tools: {
          google_search: provider.tools.googleSearch({}),
        },
      };
    }
    case 'OpenRouter':
    default: {
      const provider = createOpenRouter({
        apiKey: config.apiKey,
        compatibility: 'strict',
        appName: APP_NAME,
        appUrl: APP_URL,
      });

      return {
        model: provider.chat(taskKind === 'vision' ? OPENROUTER_VISION_MODEL : OPENROUTER_TEXT_MODEL),
      };
    }
  }
};

const generateStructuredOutput = async <OUTPUT>({
  config,
  taskKind,
  prompt,
  schema,
  base64Image,
  requestId,
}: {
  config: ProviderConfig;
  taskKind: AiTaskKind;
  prompt: string;
  schema: Schema<OUTPUT>;
  base64Image?: string;
  requestId: string;
}): Promise<OUTPUT> => {
  const startedAt = Date.now();
  const context = buildModelContext(config, taskKind);
  const slowWarningTimer = setTimeout(() => {
    warnAi(requestId, 'generateText still pending', {
      provider: config.name,
      taskKind,
      elapsedMs: Date.now() - startedAt,
    });
  }, AI_SLOW_WARNING_MS);
  const stuckWarningTimer = setTimeout(() => {
    warnAi(requestId, 'generateText still pending for a long time', {
      provider: config.name,
      taskKind,
      elapsedMs: Date.now() - startedAt,
    });
  }, AI_STUCK_WARNING_MS);

  logAi(requestId, 'calling generateText', {
    provider: config.name,
    taskKind,
    hasImage: Boolean(base64Image),
    promptLength: prompt.length,
    imageBase64Length: base64Image ? stripBase64Prefix(base64Image).length : 0,
    hasProviderOptions: Boolean(context.providerOptions),
    toolNames: context.tools ? Object.keys(context.tools) : [],
  });

  try {
    const result = await generateText({
      model: context.model,
      output: Output.object({ schema }),
      ...(base64Image
        ? {
          messages: [
            {
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: prompt },
                {
                  type: 'image' as const,
                  image: stripBase64Prefix(base64Image),
                  mediaType: 'image/jpeg',
                },
              ],
            },
          ],
        }
        : { prompt }),
      ...(context.providerOptions ? { providerOptions: context.providerOptions } : {}),
      ...(context.tools ? { tools: context.tools } : {}),
    });

    logAi(requestId, 'generateText resolved', {
      provider: config.name,
      taskKind,
      elapsedMs: Date.now() - startedAt,
    });

    return result.output;
  } finally {
    clearTimeout(slowWarningTimer);
    clearTimeout(stuckWarningTimer);
  }
};

export const requestGeminiJson = async (
  apiKey: string,
  model: string,
  prompt: string,
  imageBase64?: string,
): Promise<unknown> => {
  const provider = createGoogleGenerativeAI({
    apiKey,
    headers: {
      'HTTP-Referer': APP_URL,
      'X-Title': APP_NAME,
    },
  });

  const result = await generateText({
    model: provider(model),
    output: Output.json(),
    ...(imageBase64
      ? {
        messages: [
          {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: prompt },
              {
                type: 'image' as const,
                image: stripBase64Prefix(imageBase64),
                mediaType: 'image/jpeg',
              },
            ],
          },
        ],
      }
      : { prompt }),
    tools: {
      google_search: provider.tools.googleSearch({}),
    },
  });

  return result.output;
};

const resolveLegacyProviderKey = async (providerName: AiProviderName): Promise<string | null> => {
  switch (providerName) {
    case 'OpenRouter':
      return SecureStore.getItemAsync('openRouterKey');
    case 'OpenAI':
      return SecureStore.getItemAsync('openAiKey');
    case 'Gemini':
    default:
      return null;
  }
};

const loadProviderConfig = async (requestId: string): Promise<ProviderConfig | null> => {
  const aiProvider = (await getSetting('ai_provider')) || 'OpenRouter';
  const providerName: AiProviderName =
    aiProvider === 'OpenAI' || aiProvider === 'Gemini'
      ? aiProvider
      : 'OpenRouter';

  const currentKey = await SecureStore.getItemAsync('apiKey');
  const legacyKey = currentKey ? null : await resolveLegacyProviderKey(providerName);
  const apiKey = currentKey || legacyKey;

  if (!apiKey) {
    warnAi(requestId, 'missing API key', { provider: providerName });
    Alert.alert('NO API KEY', 'PLEASE ADD A BYOK KEY IN THE VAULT.');
    return null;
  }

  logAi(requestId, 'loaded provider config', {
    provider: providerName,
    credentialSource: currentKey ? 'apiKey' : 'legacy',
  });

  return { name: providerName, apiKey };
};

const getAiErrorMessage = (error: unknown): string => {
  if (NoObjectGeneratedError.isInstance(error)) {
    return 'AI RESPONSE FAILED SCHEMA VALIDATION.';
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'FAILED TO REACH AI CORE.';
};

export async function processFoodImage(input: AnalyzeImageInput): Promise<AiExtractionResult | null> {
  const requestId = createAiRequestId('vision');
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    warnAi(requestId, 'vision request aborted because AI is disabled');
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  logAi(requestId, 'starting vision request', {
    hasNameHint: Boolean(input.nameHint?.trim()),
    hasBrandHint: Boolean(input.brandHint?.trim()),
    imageBase64Length: stripBase64Prefix(input.base64Image).length,
  });

  const config = await loadProviderConfig(requestId);
  if (!config) return null;

  try {
    const output = await generateStructuredOutput<StructuredAiExtractionOutput>({
      config,
      taskKind: 'vision',
      prompt: buildUnifiedPrompt(input.nameHint, input.brandHint),
      schema: aiExtractionSchema,
      base64Image: input.base64Image,
      requestId,
    });

    const sanitized = sanitizeAiExtraction(output);
    logAi(requestId, 'vision request sanitized successfully', {
      detectionType: sanitized.detection_type,
      name: sanitized.name,
      servingCount: sanitized.serving_sizes.length,
    });
    return sanitized;
  } catch (error) {
    console.error(`${AI_DEBUG_PREFIX} ${requestId} vision request failed`, error);
    Alert.alert('AI ERROR', getAiErrorMessage(error));
    return null;
  }
}

export async function processFoodNameAutofill(
  input: FoodNameAutofillInput,
): Promise<FoodNameAutofillResult | null> {
  const requestId = createAiRequestId('text');
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    warnAi(requestId, 'text request aborted because AI is disabled');
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  logAi(requestId, 'starting text request', {
    hasBrand: Boolean(input.brand?.trim()),
    hasServingSizes: Boolean(input.serving_sizes && input.serving_sizes.length > 0),
    nameLength: input.name.trim().length,
  });

  const config = await loadProviderConfig(requestId);
  if (!config) return null;

  try {
    const output = await generateStructuredOutput<StructuredFoodNameAutofillOutput>({
      config,
      taskKind: 'text',
      prompt: buildFoodNameAutofillPrompt(JSON.stringify(input, null, 2)),
      schema: foodNameAutofillSchema,
      requestId,
    });

    const sanitized = sanitizeFoodNameAutofill(output);
    logAi(requestId, 'text request sanitized successfully', {
      name: sanitized.name,
      hasBrand: Boolean(sanitized.brand),
      servingCount: sanitized.serving_sizes?.length ?? 0,
    });
    return sanitized;
  } catch (error) {
    console.error(`${AI_DEBUG_PREFIX} ${requestId} text request failed`, error);
    Alert.alert('AI ERROR', getAiErrorMessage(error));
    return null;
  }
}

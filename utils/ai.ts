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

const stripBase64Prefix = (value: string): string => value.replace(/^data:[^;]+;base64,/, '');

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
}: {
  config: ProviderConfig;
  taskKind: AiTaskKind;
  prompt: string;
  schema: Schema<OUTPUT>;
  base64Image?: string;
}): Promise<OUTPUT> => {
  const context = buildModelContext(config, taskKind);

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
                image: `data:image/jpeg;base64,${stripBase64Prefix(base64Image)}`,
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

  return result.output;
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
                image: `data:image/jpeg;base64,${stripBase64Prefix(imageBase64)}`,
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

const loadProviderConfig = async (): Promise<ProviderConfig | null> => {
  const aiProvider = (await getSetting('ai_provider')) || 'OpenRouter';
  const providerName: AiProviderName =
    aiProvider === 'OpenAI' || aiProvider === 'Gemini'
      ? aiProvider
      : 'OpenRouter';

  const currentKey = await SecureStore.getItemAsync('apiKey');
  const legacyKey = currentKey ? null : await resolveLegacyProviderKey(providerName);
  const apiKey = currentKey || legacyKey;

  if (!apiKey) {
    Alert.alert('NO API KEY', 'PLEASE ADD A BYOK KEY IN THE VAULT.');
    return null;
  }

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
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  const config = await loadProviderConfig();
  if (!config) return null;

  try {
    const output = await generateStructuredOutput<StructuredAiExtractionOutput>({
      config,
      taskKind: 'vision',
      prompt: buildUnifiedPrompt(input.nameHint, input.brandHint),
      schema: aiExtractionSchema,
      base64Image: input.base64Image,
    });

    return sanitizeAiExtraction(output);
  } catch (error) {
    console.error(error);
    Alert.alert('AI ERROR', getAiErrorMessage(error));
    return null;
  }
}

export async function processFoodNameAutofill(
  input: FoodNameAutofillInput,
): Promise<FoodNameAutofillResult | null> {
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  const config = await loadProviderConfig();
  if (!config) return null;

  try {
    const output = await generateStructuredOutput<StructuredFoodNameAutofillOutput>({
      config,
      taskKind: 'text',
      prompt: buildFoodNameAutofillPrompt(JSON.stringify(input, null, 2)),
      schema: foodNameAutofillSchema,
    });

    return sanitizeFoodNameAutofill(output);
  } catch (error) {
    console.error(error);
    Alert.alert('AI ERROR', getAiErrorMessage(error));
    return null;
  }
}

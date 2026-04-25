import { Alert } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as AiSdk from 'ai';

const mocks = vi.hoisted(() => {
  const openaiWebSearch = vi.fn(() => 'openai-web-search-tool');
  const openaiProvider = Object.assign(vi.fn(() => 'openai-model'), {
    tools: {
      webSearch: openaiWebSearch,
    },
  });
  const googleSearch = vi.fn(() => 'google-search-tool');
  const googleProvider = Object.assign(vi.fn(() => 'gemini-model'), {
    tools: {
      googleSearch,
    },
  });
  const openrouterChat = vi.fn(() => 'openrouter-model');

  return {
    getSetting: vi.fn(),
    getItemAsync: vi.fn(),
    generateText: vi.fn(),
    createOpenAI: vi.fn(() => openaiProvider),
    createGoogleGenerativeAI: vi.fn(() => googleProvider),
    createOpenRouter: vi.fn(() => ({ chat: openrouterChat })),
    openaiProvider,
    openaiWebSearch,
    googleProvider,
    googleSearch,
    openrouterChat,
  };
});

vi.mock('@/db/dao', () => ({
  getSetting: mocks.getSetting,
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: mocks.getItemAsync,
}));

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');

  return {
    ...actual,
    generateText: mocks.generateText,
  };
});

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mocks.createOpenAI,
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: mocks.createOpenRouter,
}));

import { processFoodImage, processFoodNameAutofill, requestGeminiJson } from '@/utils/ai';

type ProviderName = 'Gemini' | 'OpenAI' | 'OpenRouter';

const imageOutput = {
  detection_type: 'food' as const,
  name: 'The Void',
  brand: '  ',
  calories_per_100g: 89,
  protein_per_100g: 1.1,
  carbs_per_100g: 22.8,
  fats_per_100g: 0.3,
  estimated_weight_g: 118,
  serving_size_g: 118,
  serving_sizes: [
    { name: ' medium banana ', weight_g: 118 },
    { name: 'small banana', weight_g: 101 },
    { name: 'large banana', weight_g: 136 },
    { name: 'ignored extra', weight_g: 200 },
  ],
};

const autofillOutput = {
  name: ' Greek Yogurt ',
  brand: ' Fage ',
  calories_per_100g: 97,
  protein_per_100g: 10,
  carbs_per_100g: 3.8,
  fats_per_100g: 5,
  serving_sizes: [
    { name: ' cup ', weight_g: 245 },
    { name: 'tub', weight_g: 500 },
    { name: 'single serve', weight_g: 150 },
    { name: 'ignored extra', weight_g: 1000 },
  ],
};

describe('utils/ai', () => {
  let aiEnabled = 'true';
  let provider: string = 'Gemini';
  let secureStoreValues = new Map<string, string | null>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    aiEnabled = 'true';
    provider = 'Gemini';
    secureStoreValues = new Map<string, string | null>([
      ['apiKey', 'TEST_KEY'],
      ['openAiKey', null],
      ['openRouterKey', null],
    ]);

    mocks.getSetting.mockImplementation(async (key: string) => {
      if (key === 'ai_enabled') return aiEnabled;
      if (key === 'ai_provider') return provider;
      return null;
    });

    mocks.getItemAsync.mockImplementation(async (key: string) => secureStoreValues.get(key) ?? null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const expectVisionCall = (providerName: ProviderName) => {
    const call = mocks.generateText.mock.calls.at(-1)?.[0];

    expect(call).toEqual(
      expect.objectContaining({
        model: expect.anything(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: expect.any(String) },
              {
                type: 'image',
                image: 'data:image/jpeg;base64,TESTBASE64',
                mediaType: 'image/jpeg',
              },
            ],
          },
        ],
      }),
    );

    if (providerName === 'Gemini') {
      expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'TEST_KEY',
          headers: expect.objectContaining({
            'HTTP-Referer': 'https://sklidla.app',
            'X-Title': 'Sklidla',
          }),
        }),
      );
      expect(mocks.googleProvider).toHaveBeenCalledWith('gemini-3-flash-preview');
      expect(mocks.googleSearch).toHaveBeenCalledWith({});
      expect(call).toEqual(
        expect.objectContaining({
          model: 'gemini-model',
          tools: {
            google_search: 'google-search-tool',
          },
        }),
      );
      expect(call).not.toHaveProperty('providerOptions');
      return;
    }

    if (providerName === 'OpenAI') {
      expect(mocks.createOpenAI).toHaveBeenCalledWith({ apiKey: 'TEST_KEY' });
      expect(mocks.openaiProvider).toHaveBeenCalledWith('gpt-5.4');
      expect(mocks.openaiWebSearch).toHaveBeenCalledWith({
        externalWebAccess: true,
      });
      expect(call).toEqual(
        expect.objectContaining({
          model: 'openai-model',
          providerOptions: {
            openai: {
              store: false,
            },
          },
          tools: {
            web_search: 'openai-web-search-tool',
          },
        }),
      );
      return;
    }

    expect(mocks.createOpenRouter).toHaveBeenCalledWith({
      apiKey: 'TEST_KEY',
      compatibility: 'strict',
      appName: 'Sklidla',
      appUrl: 'https://sklidla.app',
    });
    expect(mocks.openrouterChat).toHaveBeenCalledWith('google/gemini-3-flash-preview:online');
    expect(call).toEqual(
      expect.objectContaining({
        model: 'openrouter-model',
      }),
    );
    expect(call).not.toHaveProperty('tools');
    expect(call).not.toHaveProperty('providerOptions');
  };

  const expectTextCall = (providerName: ProviderName) => {
    const call = mocks.generateText.mock.calls.at(-1)?.[0];

    expect(call).toEqual(
      expect.objectContaining({
        model: expect.anything(),
        prompt: expect.any(String),
      }),
    );
    expect(call).not.toHaveProperty('messages');

    if (providerName === 'Gemini') {
      expect(mocks.googleProvider).toHaveBeenCalledWith('gemini-3-flash-preview');
      expect(mocks.googleSearch).toHaveBeenCalledWith({});
      expect(call).toEqual(
        expect.objectContaining({
          model: 'gemini-model',
          tools: {
            google_search: 'google-search-tool',
          },
        }),
      );
      return;
    }

    if (providerName === 'OpenAI') {
      expect(mocks.openaiProvider).toHaveBeenCalledWith('gpt-5.4');
      expect(mocks.openaiWebSearch).toHaveBeenCalledWith({
        externalWebAccess: true,
      });
      expect(call).toEqual(
        expect.objectContaining({
          model: 'openai-model',
          providerOptions: {
            openai: {
              store: false,
            },
          },
          tools: {
            web_search: 'openai-web-search-tool',
          },
        }),
      );
      return;
    }

    expect(mocks.openrouterChat).toHaveBeenCalledWith('google/gemini-3-flash-preview:online');
    expect(call).toEqual(
      expect.objectContaining({
        model: 'openrouter-model',
      }),
    );
    expect(call).not.toHaveProperty('tools');
    expect(call).not.toHaveProperty('providerOptions');
  };

  it.each<ProviderName>(['Gemini', 'OpenAI', 'OpenRouter'])(
    'routes image analysis through the %s provider branch',
    async (providerName) => {
      provider = providerName;
      mocks.generateText.mockResolvedValue({ output: imageOutput });

      const result = await processFoodImage({
        base64Image: 'data:image/jpeg;base64,TESTBASE64',
        nameHint: 'banana',
        brandHint: 'store brand',
      });

      expectVisionCall(providerName);
      expect(result).toEqual({
        name: '',
        calories_per_100g: 89,
        protein_per_100g: 1.1,
        carbs_per_100g: 22.8,
        fats_per_100g: 0.3,
        estimated_weight_g: 118,
        serving_size_g: 118,
        serving_sizes: [
          { name: 'medium banana', weight_g: 118 },
          { name: 'small banana', weight_g: 101 },
          { name: 'large banana', weight_g: 136 },
        ],
        detection_type: 'food',
      });
    },
  );

  it.each<ProviderName>(['Gemini', 'OpenAI', 'OpenRouter'])(
    'routes food autofill through the %s provider branch',
    async (providerName) => {
      provider = providerName;
      mocks.generateText.mockResolvedValue({ output: autofillOutput });

      const result = await processFoodNameAutofill({
        name: 'Greek Yogurt',
        brand: null,
        calories_per_100g: null,
        protein_per_100g: null,
        carbs_per_100g: null,
        fats_per_100g: null,
        serving_sizes: null,
      });

      expectTextCall(providerName);
      expect(result).toEqual({
        name: 'Greek Yogurt',
        brand: 'Fage',
        calories_per_100g: 97,
        protein_per_100g: 10,
        carbs_per_100g: 3.8,
        fats_per_100g: 5,
        serving_sizes: [
          { name: 'cup', weight_g: 245 },
          { name: 'tub', weight_g: 500 },
          { name: 'single serve', weight_g: 150 },
        ],
      });
    },
  );

  it('uses the provider-specific legacy key when apiKey is missing', async () => {
    secureStoreValues.set('apiKey', null);
    secureStoreValues.set('openAiKey', 'OPENAI_LEGACY');
    provider = 'OpenAI';
    mocks.generateText.mockResolvedValue({ output: autofillOutput });

    await processFoodNameAutofill({
      name: 'Greek Yogurt',
      brand: null,
      calories_per_100g: null,
      protein_per_100g: null,
      carbs_per_100g: null,
      fats_per_100g: null,
      serving_sizes: null,
    });

    expect(mocks.createOpenAI).toHaveBeenCalledWith({ apiKey: 'OPENAI_LEGACY' });

    vi.clearAllMocks();

    secureStoreValues.set('openAiKey', null);
    secureStoreValues.set('openRouterKey', 'OPENROUTER_LEGACY');
    provider = 'OpenRouter';
    mocks.generateText.mockResolvedValue({ output: autofillOutput });

    await processFoodNameAutofill({
      name: 'Greek Yogurt',
      brand: null,
      calories_per_100g: null,
      protein_per_100g: null,
      carbs_per_100g: null,
      fats_per_100g: null,
      serving_sizes: null,
    });

    expect(mocks.createOpenRouter).toHaveBeenCalledWith({
      apiKey: 'OPENROUTER_LEGACY',
      compatibility: 'strict',
      appName: 'Sklidla',
      appUrl: 'https://sklidla.app',
    });
  });

  it('alerts when AI is disabled before trying to talk to any provider', async () => {
    aiEnabled = 'false';

    const result = await processFoodImage({
      base64Image: 'TESTBASE64',
    });

    expect(result).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.createOpenAI).not.toHaveBeenCalled();
    expect(mocks.createGoogleGenerativeAI).not.toHaveBeenCalled();
    expect(mocks.createOpenRouter).not.toHaveBeenCalled();
  });

  it('alerts when no key is available for the selected provider', async () => {
    provider = 'Gemini';
    secureStoreValues.set('apiKey', null);

    const result = await processFoodNameAutofill({
      name: 'Protein Bar',
      brand: null,
      calories_per_100g: null,
      protein_per_100g: null,
      carbs_per_100g: null,
      fats_per_100g: null,
      serving_sizes: null,
    });

    expect(result).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('NO API KEY', 'PLEASE ADD A BYOK KEY IN THE VAULT.');
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it('surfaces schema validation failures as AI errors', async () => {
    const isInstanceSpy = vi
      .spyOn(AiSdk.NoObjectGeneratedError, 'isInstance')
      .mockReturnValue(true);
    mocks.generateText.mockRejectedValue({ message: 'ignored' });

    const result = await processFoodNameAutofill({
      name: 'Protein Bar',
      brand: null,
      calories_per_100g: null,
      protein_per_100g: null,
      carbs_per_100g: null,
      fats_per_100g: null,
      serving_sizes: null,
    });

    expect(result).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('AI ERROR', 'AI RESPONSE FAILED SCHEMA VALIDATION.');
    isInstanceSpy.mockRestore();
  });

  it('keeps the Gemini JSON helper available via the shared SDK path', async () => {
    mocks.generateText.mockResolvedValue({
      output: {
        ok: true,
      },
    });

    const result = await requestGeminiJson(
      'GEM_KEY',
      'gemini-3-flash-preview',
      'Test prompt',
      'data:image/jpeg;base64,TESTBASE64',
    );

    expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'GEM_KEY' }),
    );
    expect(mocks.googleProvider).toHaveBeenCalledWith('gemini-3-flash-preview');
    expect(mocks.googleSearch).toHaveBeenCalledWith({});
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-model',
        tools: {
          google_search: 'google-search-tool',
        },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Test prompt' },
              {
                type: 'image',
                image: 'data:image/jpeg;base64,TESTBASE64',
                mediaType: 'image/jpeg',
              },
            ],
          },
        ],
      }),
    );
    expect(result).toEqual({ ok: true });
  });
});

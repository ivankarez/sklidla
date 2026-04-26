import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const integrationState = vi.hoisted(() => ({
  provider: 'OpenRouter' as 'OpenRouter' | 'OpenAI' | 'Gemini',
  apiKey: null as string | null,
  alerts: [] as Array<{ title: string; message?: string }>,
}));

vi.mock('@/db/dao', () => ({
  getSetting: vi.fn(async (key: string) => {
    if (key === 'ai_enabled') return 'true';
    if (key === 'ai_provider') return integrationState.provider;
    return null;
  }),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => (key === 'apiKey' ? integrationState.apiKey : null)),
}));

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn((title: string, message?: string) => {
      integrationState.alerts.push({ title, message });
    }),
  },
}));

import type { AiProviderName } from '@/utils/ai';
import { processFoodImage, processFoodNameAutofill } from '@/utils/ai';

const PROVIDER_ENV_KEYS: Record<AiProviderName, string> = {
  OpenRouter: 'OPENROUTER_API_KEY',
  OpenAI: 'OPENAI_API_KEY',
  Gemini: 'GEMINI_API_KEY',
};

const providers = Object.keys(PROVIDER_ENV_KEYS) as AiProviderName[];

const missingEnvKeys = providers.filter((provider) => {
  const envValue = process.env[PROVIDER_ENV_KEYS[provider]];
  return typeof envValue !== 'string' || envValue.trim().length === 0;
});

if (missingEnvKeys.length > 0) {
  throw new Error(
    `Missing required AI integration env vars: ${missingEnvKeys
      .map((provider) => PROVIDER_ENV_KEYS[provider])
      .join(', ')}`
  );
}

let visionFixtureBase64 = '';

describe.sequential('AI provider integrations', () => {
  beforeAll(async () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/ai-provider/vision-smoke.jpg');
    const fixtureBuffer = await readFile(fixturePath);
    visionFixtureBase64 = fixtureBuffer.toString('base64');
  });

  beforeEach(() => {
    integrationState.alerts = [];
  });

  for (const provider of providers) {
    it(`${provider} text-only autofill returns a usable payload`, async () => {
      integrationState.provider = provider;
      integrationState.apiKey = process.env[PROVIDER_ENV_KEYS[provider]] ?? null;

      const result = await processFoodNameAutofill({
        name: 'Greek Yogurt',
        brand: null,
        calories_per_100g: null,
        protein_per_100g: null,
        carbs_per_100g: null,
        fats_per_100g: null,
        serving_sizes: null,
      });

      expect(integrationState.alerts).toEqual([]);
      expect(result).not.toBeNull();
      expect(result?.name?.trim().length ?? 0).toBeGreaterThan(0);
      expect(
        [
          result?.brand,
          result?.calories_per_100g,
          result?.protein_per_100g,
          result?.carbs_per_100g,
          result?.fats_per_100g,
          result?.serving_sizes?.length ? result.serving_sizes : null,
        ].some((value) => value !== null && value !== undefined)
      ).toBe(true);
    });

    it(`${provider} vision flow returns a structured payload`, async () => {
      integrationState.provider = provider;
      integrationState.apiKey = process.env[PROVIDER_ENV_KEYS[provider]] ?? null;

      const result = await processFoodImage({
        base64Image: visionFixtureBase64,
      });

      expect(integrationState.alerts).toEqual([]);
      expect(result).not.toBeNull();
      expect(result?.detection_type).toMatch(/^(label|food|mixed|unknown)$/);
      expect(Number.isFinite(result?.calories_per_100g)).toBe(true);
      expect(Number.isFinite(result?.protein_per_100g)).toBe(true);
      expect(Number.isFinite(result?.carbs_per_100g)).toBe(true);
      expect(Number.isFinite(result?.fats_per_100g)).toBe(true);
      expect(Array.isArray(result?.serving_sizes)).toBe(true);
    });
  }
});

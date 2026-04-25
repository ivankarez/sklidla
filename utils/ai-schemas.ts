import { jsonSchema } from 'ai';
import type { JSONSchema7 } from 'json-schema';

export type AiProviderName = 'OpenRouter' | 'OpenAI' | 'Gemini';

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

export interface StructuredAiExtractionOutput {
  detection_type: 'label' | 'food' | 'mixed' | 'unknown';
  name: string;
  brand: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  estimated_weight_g: number;
  serving_size_g: number;
  serving_sizes: ServingSizeSuggestion[];
}

export interface StructuredFoodNameAutofillOutput {
  name: string | null;
  brand: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fats_per_100g: number | null;
  serving_sizes: ServingSizeSuggestion[] | null;
}

const nonNegativeNumberSchema = {
  type: 'number',
  minimum: 0,
} as const;

const servingSizeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    weight_g: nonNegativeNumberSchema,
  },
  required: ['name', 'weight_g'],
} satisfies JSONSchema7;

export const aiExtractionSchema = jsonSchema<StructuredAiExtractionOutput>({
  type: 'object',
  additionalProperties: false,
  properties: {
    detection_type: {
      type: 'string',
      enum: ['label', 'food', 'mixed', 'unknown'],
    },
    name: { type: 'string' },
    brand: { type: 'string' },
    calories_per_100g: nonNegativeNumberSchema,
    protein_per_100g: nonNegativeNumberSchema,
    carbs_per_100g: nonNegativeNumberSchema,
    fats_per_100g: nonNegativeNumberSchema,
    estimated_weight_g: nonNegativeNumberSchema,
    serving_size_g: nonNegativeNumberSchema,
    serving_sizes: {
      type: 'array',
      items: servingSizeSchema,
    },
  },
  required: [
    'detection_type',
    'name',
    'brand',
    'calories_per_100g',
    'protein_per_100g',
    'carbs_per_100g',
    'fats_per_100g',
    'estimated_weight_g',
    'serving_size_g',
    'serving_sizes',
  ],
});

export const foodNameAutofillSchema = jsonSchema<StructuredFoodNameAutofillOutput>({
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: ['string', 'null'] },
    brand: { type: ['string', 'null'] },
    calories_per_100g: { type: ['number', 'null'], minimum: 0 },
    protein_per_100g: { type: ['number', 'null'], minimum: 0 },
    carbs_per_100g: { type: ['number', 'null'], minimum: 0 },
    fats_per_100g: { type: ['number', 'null'], minimum: 0 },
    serving_sizes: {
      type: ['array', 'null'],
      items: servingSizeSchema,
    },
  },
  required: [
    'name',
    'brand',
    'calories_per_100g',
    'protein_per_100g',
    'carbs_per_100g',
    'fats_per_100g',
    'serving_sizes',
  ],
});

const invalidNames = new Set([
  'the void',
  'black image',
  'unknown',
  'n/a',
  'none',
  'null',
  '',
]);

const toNonNegativeNumber = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
};

const toNullableNonNegativeNumber = (value: number | null): number | null => {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
};

const sanitizeServingSizes = (value: ServingSizeSuggestion[] | null | undefined): ServingSizeSuggestion[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const name = item.name.trim();
      const weight = toNonNegativeNumber(item.weight_g);
      if (!name || weight <= 0) return null;
      return { name, weight_g: weight };
    })
    .filter((item): item is ServingSizeSuggestion => item !== null)
    .slice(0, 3);
};

export const sanitizeAiExtraction = (raw: StructuredAiExtractionOutput): AiExtractionResult => {
  const name = raw.name.trim();
  const sanitizedName = invalidNames.has(name.toLowerCase()) ? '' : name;
  const brand = raw.brand.trim();
  const estimatedWeight = toNonNegativeNumber(raw.estimated_weight_g);
  const servingSize = toNonNegativeNumber(raw.serving_size_g);

  return {
    name: sanitizedName,
    ...(brand ? { brand } : {}),
    calories_per_100g: toNonNegativeNumber(raw.calories_per_100g),
    protein_per_100g: toNonNegativeNumber(raw.protein_per_100g),
    carbs_per_100g: toNonNegativeNumber(raw.carbs_per_100g),
    fats_per_100g: toNonNegativeNumber(raw.fats_per_100g),
    ...(estimatedWeight > 0 ? { estimated_weight_g: estimatedWeight } : {}),
    ...(servingSize > 0 ? { serving_size_g: servingSize } : {}),
    serving_sizes: sanitizeServingSizes(raw.serving_sizes),
    detection_type: raw.detection_type,
  };
};

export const sanitizeFoodNameAutofill = (
  raw: StructuredFoodNameAutofillOutput,
): FoodNameAutofillResult => {
  const servings = sanitizeServingSizes(raw.serving_sizes);
  const name = raw.name?.trim() || null;
  const brand = raw.brand?.trim() || null;

  return {
    name,
    brand,
    calories_per_100g: toNullableNonNegativeNumber(raw.calories_per_100g),
    protein_per_100g: toNullableNonNegativeNumber(raw.protein_per_100g),
    carbs_per_100g: toNullableNonNegativeNumber(raw.carbs_per_100g),
    fats_per_100g: toNullableNonNegativeNumber(raw.fats_per_100g),
    serving_sizes: servings.length > 0 ? servings : null,
  };
};

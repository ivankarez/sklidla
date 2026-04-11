import { requestGeminiJson } from '@/utils/ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('requestGeminiJson', () => {
  beforeEach(() => {
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends inline_data image first and returns parsed JSON', async () => {
    const model = 'gemini-3-flash-preview';
    const apiKey = 'GEM_KEY';
    const prompt = 'Test prompt';
    const imageBase64 = 'data:image/jpeg;base64,TESTBASE64';

    const fakeResponse = getMockGeminiResponse();

    ((global as any).fetch as any).mockResolvedValue({
      ok: true,
      json: async () => fakeResponse,
    });

    const result = await requestGeminiJson(apiKey, model, prompt, imageBase64);

    expect((global as any).fetch).toHaveBeenCalled();
    const call = (global as any).fetch.mock.calls[0];
    const calledUrl = call[0];
    const options = call[1];

    expect(calledUrl).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    expect(options.headers['x-goog-api-key']).toBe(apiKey);

    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].inline_data.data).toBe('TESTBASE64');
    expect(body.contents[0].parts[1].text).toBe(prompt);
    expect(result).toEqual(JSON.parse(fakeResponse.candidates[0].content.parts[0].text));
  });
});


const getMockGeminiResponse = () => {
  return {
    "candidates": [
      {
        "content": {
          "parts": [
            {
              "text": "{\n  \"detection_type\": \"food\",\n  \"name\": \"Banana\",\n  \"brand\": \"\",\n  \"calories_per_100g\": 89,\n  \"protein_per_100g\": 1.1,\n  \"carbs_per_100g\": 22.8,\n  \"fats_per_100g\": 0.3,\n  \"estimated_weight_g\": 120,\n  \"serving_size_g\": 118,\n  \"serving_sizes\": [\n    {\n      \"name\": \"medium banana\",\n      \"weight_g\": 118\n    },\n    {\n      \"name\": \"small banana\",\n      \"weight_g\": 101\n    },\n    {\n      \"name\": \"large banana\",\n      \"weight_g\": 136\n    }\n  ],\n  \"image_analysis_notes\": \"The image shows a single ripe banana on a desk. Nutritional values are based on standard USDA data for a raw banana. The weight is estimated for the edible portion of a medium-sized banana.\"\n}",
              "thoughtSignature": "..."
            }
          ],
          "role": "model"
        },
        "finishReason": "STOP",
        "index": 0
      }
    ],
    "usageMetadata": {
      "promptTokenCount": 1502,
      "candidatesTokenCount": 263,
      "totalTokenCount": 2503,
      "promptTokensDetails": [
        {
          "modality": "IMAGE",
          "tokenCount": 1064
        },
        {
          "modality": "TEXT",
          "tokenCount": 438
        }
      ],
      "thoughtsTokenCount": 738
    },
    "modelVersion": "gemini-3-flash-preview",
    "responseId": "iwXaacONI7eRxN8Pkd7PqQs"
  };
};

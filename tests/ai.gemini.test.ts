import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestGeminiJson } from '../utils/gemini';

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

    const fakeResponse = {
      outputs: [
        {
          content: [
            {
              text: JSON.stringify({
                detection_type: 'food',
                name: 'Mock Food',
                calories_per_100g: 100,
                protein_per_100g: 5,
                carbs_per_100g: 20,
                fats_per_100g: 1,
              }),
            },
          ],
        },
      ],
    };

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
    expect(result).toEqual(JSON.parse(fakeResponse.outputs[0].content[0].text));
  });
});

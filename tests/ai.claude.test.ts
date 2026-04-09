import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestClaudeJson, CLAUDE_TEXT_MODEL } from '../utils/claude';

describe('requestClaudeJson', () => {
  beforeEach(() => {
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends x-api-key header and returns parsed JSON', async () => {
    const model = CLAUDE_TEXT_MODEL;
    const apiKey = 'CLAUDE_KEY';
    const prompt = 'Test prompt';

    const fakeResponse = {
      completion: JSON.stringify({
        detection_type: 'food',
        name: 'Claude Food',
        calories_per_100g: 120,
        protein_per_100g: 6,
        carbs_per_100g: 15,
        fats_per_100g: 4,
      }),
    };

    ((global as any).fetch as any).mockResolvedValue({
      ok: true,
      json: async () => fakeResponse,
    });

    const result = await requestClaudeJson(apiKey, model, prompt);

    expect((global as any).fetch).toHaveBeenCalled();
    const call = (global as any).fetch.mock.calls[0];
    const calledUrl = call[0];
    const options = call[1];

    expect(calledUrl).toBe('https://api.anthropic.com/v1/complete');
    expect(options.headers['x-api-key']).toBe(apiKey);

    const body = JSON.parse(options.body);
    expect(body.model).toBe(model);
    expect(body.prompt).toContain(prompt);
    expect(result).toEqual(JSON.parse(fakeResponse.completion));
  });
});

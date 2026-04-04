import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { getSetting } from '../db/dao';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function processFoodImage(base64Image: string, mode: 'meal' | 'label'): Promise<any> {
  const aiEnabled = await getSetting('ai_enabled');
  if (aiEnabled === 'false') {
    Alert.alert('AI DISABLED', 'AI FUNCTIONS ARE TURNED OFF IN THE VAULT.');
    return null;
  }

  let apiKey = await SecureStore.getItemAsync('apiKey');
  const aiProvider = await getSetting('ai_provider') || 'OpenRouter';

  if (!apiKey) {
    const orKey = await SecureStore.getItemAsync('openRouterKey');
    const oaKey = await SecureStore.getItemAsync('openAiKey');
    apiKey = orKey || oaKey;
  }

  if (!apiKey) {
    Alert.alert('NO API KEY', 'PLEASE ADD A BYOK KEY IN THE VAULT.');
    return null;
  }

  const isOpenAi = aiProvider === 'OpenAI';
  const endpoint = isOpenAi ? 'https://api.openai.com/v1/chat/completions' : OPENROUTER_URL;
  const model = isOpenAi ? 'gpt-4o' : 'google/gemini-pro-vision';

  const systemPrompt = mode === 'meal' 
    ? `You are an unhinged, brutal, highly precise nutrition AI. The user has provided an image of food. 
Return ONLY a valid JSON object describing the MAIN food item detected, no markdown formatting.
Schema:
{
  "name": "Short Name (e.g., Grilled Chicken Salad)",
  "calories_per_100g": 150,
  "protein_per_100g": 20,
  "carbs_per_100g": 5,
  "fats_per_100g": 5,
  "estimated_weight_g": 250
}
Guess the macros per 100g as accurately as possible. If multiple items, combine or pick the most prominent.`
    : `You are an OCR macro extractor. Extract data from this nutrition label.
Return ONLY a valid JSON object, no markdown formatting.
Schema:
{
  "name": "Product Name (guess from label or leave empty)",
  "calories_per_100g": 0,
  "protein_per_100g": 0,
  "carbs_per_100g": 0,
  "fats_per_100g": 0,
  "serving_size_g": 100
}
Normalize all macros to 100g even if the label is per serving.`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(isOpenAi ? {} : { 'HTTP-Referer': 'https://sklidla.app', 'X-Title': 'Sklidla' })
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      })
    });

    const json = await response.json();
    if (json.error) {
      console.error(json.error);
      Alert.alert('AI ERROR', json.error.message || 'UNKNOWN AI FAILURE');
      return null;
    }

    const content = json.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error(error);
    Alert.alert('NETWORK ERROR', 'FAILED TO REACH AI CORE.');
    return null;
  }
}

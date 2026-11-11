import * as SecureStore from 'expo-secure-store';

const KEY_NAME = 'gemini_api_key';
const MODEL_NAME = 'gemini_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export async function getGeminiConfig(): Promise<{ apiKey: string | null; model: string }> {
  const [key, model] = await Promise.all([
    SecureStore.getItemAsync(KEY_NAME),
    SecureStore.getItemAsync(MODEL_NAME),
  ]);
  return {
    apiKey: key?.trim() ? key.trim() : null,
    model: model?.trim() ? model.trim() : DEFAULT_GEMINI_MODEL,
  };
}

export async function setGeminiKey(key: string): Promise<void> {
  const k = key.trim();
  if (!k) await SecureStore.deleteItemAsync(KEY_NAME);
  else await SecureStore.setItemAsync(KEY_NAME, k);
}

export async function setGeminiModel(model: string): Promise<void> {
  const m = model.trim();
  if (!m) await SecureStore.deleteItemAsync(MODEL_NAME);
  else await SecureStore.setItemAsync(MODEL_NAME, m);
}

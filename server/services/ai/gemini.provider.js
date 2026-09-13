import { gemini, model } from '../../config/ai.js';
import { AIProvider } from './provider.js';

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  const status = error?.status;

  return status === 429 || status === 503;
};

class GeminiProvider extends AIProvider {
  isAvailable() {
    return Boolean(gemini);
  }

  async generateText({ instructions, input }) {
    if (!this.isAvailable()) {
      const error = new Error(
        'Gemini AI provider is not configured.',
      );

      error.code = 'AI_NOT_CONFIGURED';

      throw error;
    }

    if (!instructions?.trim()) {
      const error = new Error(
        'AI instructions are required.',
      );

      error.code = 'AI_INVALID_INSTRUCTIONS';

      throw error;
    }

    if (!input?.trim()) {
      const error = new Error(
        'AI input is required.',
      );

      error.code = 'AI_INVALID_INPUT';

      throw error;
    }

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        console.log(
          `[AI] Gemini request attempt ${attempt + 1}/${MAX_RETRIES + 1}`,
        );

        console.log('[AI] Provider: Gemini');
        console.log('[AI] Model:', model);

        const response = await gemini.models.generateContent({
          model,
          contents: input.trim(),
          config: {
            systemInstruction: instructions.trim(),
          },
        });

        console.log('[AI] Gemini request successful.');

        return {
          text: response.text || '',
          provider: 'gemini',
          model,
          rawResponse: response,
        };
      } catch (error) {
        lastError = error;

        console.error('[AI] Gemini request failed.');
        console.error('[AI] Status:', error?.status);
        console.error('[AI] Message:', error?.message);

        const shouldRetry =
          isRetryableError(error) && attempt < MAX_RETRIES;

        if (!shouldRetry) {
          break;
        }

        const delay =
          INITIAL_RETRY_DELAY * 2 ** attempt;

        console.log(
          `[AI] Temporary Gemini error. Retrying in ${delay}ms...`,
        );

        await sleep(delay);
      }
    }

    console.error('========================================');
    console.error('[AI] GEMINI PROVIDER ERROR');
    console.error('========================================');
    console.error('[AI] Model:', model);
    console.error('[AI] Error name:', lastError?.name);
    console.error('[AI] Error status:', lastError?.status);
    console.error('[AI] Error message:', lastError?.message);
    console.error('========================================');

    const providerError = new Error(
      lastError?.message || 'Gemini API request failed.',
    );

    providerError.code = 'AI_PROVIDER_ERROR';
    providerError.status = lastError?.status || 500;
    providerError.provider = 'gemini';
    providerError.originalError = lastError;

    throw providerError;
  }
}

export const geminiProvider = new GeminiProvider();
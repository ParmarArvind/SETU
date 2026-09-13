import { geminiProvider } from './ai/gemini.provider.js';

const aiProvider = geminiProvider;

export const isAIAvailable = () => {
  return aiProvider.isAvailable();
};

export const getAIProvider = () => {
  return aiProvider;
};

export const generateAIResponse = async ({
  instructions,
  input,
}) => {
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

  const result = await aiProvider.generateText({
    instructions,
    input,
  });

  return {
    text: result.text,
    provider: result.provider,
    model: result.model,
    rawResponse: result.rawResponse,
  };
};
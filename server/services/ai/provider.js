/**
 * Base AI provider contract.
 *
 * Every AI provider used by SETU should expose
 * the same interface.
 */

export class AIProvider {
  constructor() {
    if (new.target === AIProvider) {
      throw new Error(
        'AIProvider is an abstract class and cannot be instantiated directly.',
      );
    }
  }

  /**
   * Check whether the provider is configured and available.
   */
  isAvailable() {
    throw new Error('isAvailable() must be implemented by the provider.');
  }

  /**
   * Generate a text response.
   *
   * @param {Object} params
   * @param {string} params.instructions
   * @param {string} params.input
   * @returns {Promise<Object>}
   */
  async generateText() {
    throw new Error(
      'generateText() must be implemented by the provider.',
    );
  }
}
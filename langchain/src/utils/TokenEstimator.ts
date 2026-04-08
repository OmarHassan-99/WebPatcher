/**
 * Token estimation and prompt truncation utility.
 *
 * Uses a character-based heuristic (~4 characters ≈ 1 token) which is
 * a widely-accepted approximation for English text and code.
 */

/** Maximum tokens allowed in a single prompt (system + human messages). */
export const MAX_PROMPT_TOKENS = 4096;

/** Maximum tokens the model may return in a single response. */
export const MAX_RESPONSE_TOKENS = 4096;

/**
 * Estimate the number of tokens in a given text.
 * Uses the ~4-chars-per-token heuristic.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text so that its estimated token count does not exceed `maxTokens`.
 * Appends an ellipsis indicator when truncation occurs.
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
        return text;
    }

    // Convert token limit back to approximate character limit
    const charLimit = maxTokens * 4;
    return text.slice(0, charLimit - 3) + "...";
}

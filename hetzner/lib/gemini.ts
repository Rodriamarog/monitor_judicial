/**
 * Google Gemini AI Client
 * Wrapper for Gemini API integration
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Get or create Gemini client instance
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable not set');
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
}

/**
 * Rate limiter for Gemini API calls
 * Gemini Free tier: 15 RPM (requests per minute)
 * We'll use 2 second delays to be safe (30 RPM max)
 */
export async function rateLimitedDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 2000));
}

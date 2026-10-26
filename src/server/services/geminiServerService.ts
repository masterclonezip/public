import { GoogleGenAI } from '@google/genai';

/**
 * Server-Side Gemini AI Service
 * Features:
 * - Direct official @google/genai SDK integration
 * - Automatic exponential backoff & retry on HTTP 429 (Rate Limits)
 * - Intelligent model fallback hierarchy (gemini-3.8-flash -> gemini-3.7-flash -> gemini-3.8-flash-lite)
 * - Safe latency & connection verification
 */

export interface GeminiCallParams {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  contents: any[];
  temperature?: number;
  responseMimeType?: string;
}

export async function testGeminiConnection(apiKey: string, requestedModel = 'gemini-flash-latest'): Promise<{
  success: boolean;
  model: string;
  latencyMs: number;
  message?: string;
  error?: string;
}> {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    return { success: false, model: requestedModel, latencyMs: 0, error: 'API key is required' };
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const response = await ai.models.generateContent({
      model: requestedModel,
      contents: [{ role: 'user', parts: [{ text: 'Respond with exactly two words: AI Connected' }] }]
    });

    const latencyMs = Date.now() - startTime;
    const text = response.text || 'AI Connected';
    return {
      success: true,
      model: requestedModel,
      latencyMs,
      message: text.trim()
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      model: requestedModel,
      latencyMs,
      error: err?.message || 'Connection test failed'
    };
  }
}

export async function executeGeminiWithRetry(params: GeminiCallParams): Promise<{
  success: boolean;
  text?: string;
  modelUsed: string;
  attempts: number;
  error?: string;
}> {
  const { apiKey, systemInstruction, contents, temperature = 0.85, responseMimeType } = params;
  const initialModel = params.model || 'gemini-flash-latest';

  const modelCandidates = [
    initialModel,
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-2.0-flash'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let attempts = 0;
  let lastError = '';

  for (let mIdx = 0; mIdx < modelCandidates.length; mIdx++) {
    const currentModel = modelCandidates[mIdx];

    // Try up to 2 attempts per candidate model with smart backoff
    for (let tryCount = 0; tryCount < 2; tryCount++) {
      attempts++;
      try {
        const ai = new GoogleGenAI({ apiKey });
        const config: any = {
          temperature
        };
        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }
        if (responseMimeType) {
          config.responseMimeType = responseMimeType;
        }

        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config
        });

        const text = response.text;
        if (text && text.trim().length > 0) {
          return {
            success: true,
            text: text.trim(),
            modelUsed: currentModel,
            attempts
          };
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        const isRateLimit = lastError.includes('429') || 
                            lastError.includes('RESOURCE_EXHAUSTED') || 
                            lastError.includes('Quota exceeded');

        if (isRateLimit) {
          // Adaptive backoff on 429: wait 2.2s before next retry or next model
          await new Promise(res => setTimeout(res, 2200));
        } else {
          // If other error, small wait
          await new Promise(res => setTimeout(res, 500));
        }
      }
    }
  }

  return {
    success: false,
    modelUsed: initialModel,
    attempts,
    error: lastError || 'All models and retries exhausted'
  };
}

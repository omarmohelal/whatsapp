import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Env } from '../config/env';
import { AI_FALLBACK_REPLY } from '../config/constants';
import type { AppLogger } from '../logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiClient {
  createEmbedding(input: string): Promise<number[]>;
  createChatCompletion(messages: ChatMessage[]): Promise<string>;
}

export interface GeminiReplyInput {
  systemPrompt: string;
  context?: string;
  recentMessages?: ChatMessage[];
  userMessage: string;
}

const DEFAULT_EMBEDDING_SIZE = 768;

function normalizeEmbedding(values: number[], size = DEFAULT_EMBEDDING_SIZE): number[] {
  if (values.length === size) {
    return values;
  }
  if (values.length > size) {
    return values.slice(0, size);
  }
  return [...values, ...Array.from({ length: size - values.length }, () => 0)];
}

function messagesToGeminiText(messages: ChatMessage[]): string {
  return messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join('\n\n');
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiService implements AiClient {
  private readonly client: GoogleGenerativeAI;

  constructor(
    private readonly env: Env,
    private readonly logger?: Pick<AppLogger, 'warn' | 'error' | 'info'>
  ) {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async generateGeminiReply(input: GeminiReplyInput): Promise<string> {
    return this.createChatCompletion([
      { role: 'system', content: input.systemPrompt },
      ...(input.recentMessages ?? []),
      {
        role: 'user',
        content: `${input.context ? `Approved context:\n${input.context}\n\n` : ''}Customer message:\n${
          input.userMessage
        }`
      }
    ]);
  }

  async createEmbedding(input: string): Promise<number[]> {
    return this.withRetry('gemini_embedding', async () => {
      const model = this.client.getGenerativeModel({ model: this.env.GEMINI_EMBEDDING_MODEL });
      const result = await model.embedContent(input);
      return normalizeEmbedding(result.embedding.values ?? []);
    });
  }

  async createChatCompletion(messages: ChatMessage[]): Promise<string> {
    try {
      return await this.withRetry('gemini_chat', async () => {
        const model = this.client.getGenerativeModel({
          model: this.env.GEMINI_CHAT_MODEL,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 450
          }
        });
        const result = await model.generateContent(messagesToGeminiText(messages));
        return result.response.text().trim();
      });
    } catch (error) {
      this.logger?.error({ err: error }, 'Gemini chat failed; returning safe fallback');
      return AI_FALLBACK_REPLY;
    }
  }

  private async withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const delays = [250, 750, 1500];
    let lastError: unknown;

    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      try {
        if (attempt > 0) {
          this.logger?.warn({ operation, attempt: attempt + 1 }, 'Retrying Gemini operation');
        }
        const result = await fn();
        this.logger?.info({ operation, attempt: attempt + 1 }, 'Gemini operation succeeded');
        return result;
      } catch (error) {
        lastError = error;
        this.logger?.warn({ err: error, operation, attempt: attempt + 1 }, 'Gemini operation failed');
        if (attempt < delays.length) {
          await sleep(delays[attempt]);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`${operation} failed`);
  }
}

export async function generateGeminiReply(args: {
  env: Env;
  logger?: Pick<AppLogger, 'warn' | 'error' | 'info'>;
  input: GeminiReplyInput;
}) {
  return new GeminiService(args.env, args.logger).generateGeminiReply(args.input);
}

export async function generateEmbedding(args: {
  env: Env;
  logger?: Pick<AppLogger, 'warn' | 'error' | 'info'>;
  text: string;
}) {
  return new GeminiService(args.env, args.logger).createEmbedding(args.text);
}

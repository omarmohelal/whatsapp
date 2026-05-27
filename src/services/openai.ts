import OpenAI from 'openai';
import type { Env } from '../config/env';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiClient {
  createEmbedding(input: string): Promise<number[]>;
  createChatCompletion(messages: ChatMessage[]): Promise<string>;
}

const DEFAULT_EMBEDDING_SIZE = 1536;

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
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n');
}

async function parseGeminiError(response: Response): Promise<Error> {
  const text = await response.text();
  return new Error(`Gemini API failed ${response.status}: ${text.slice(0, 500)}`);
}

export class OpenAiService implements AiClient {
  private readonly client?: OpenAI;
  private readonly geminiApiKey?: string;

  constructor(private readonly env: Env) {
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    if (env.GEMINI_API_KEY) {
      this.geminiApiKey = env.GEMINI_API_KEY;
    }
  }

  async createEmbedding(input: string): Promise<number[]> {
    if (this.client) {
      const response = await this.client.embeddings.create({
        model: this.env.OPENAI_EMBEDDING_MODEL,
        input
      });

      return normalizeEmbedding(response.data[0]?.embedding ?? []);
    }

    if (this.geminiApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.env.GEMINI_EMBEDDING_MODEL}:embedContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: {
              parts: [{ text: input }]
            }
          })
        }
      );

      if (!response.ok) {
        throw await parseGeminiError(response);
      }

      const data = (await response.json()) as { embedding?: { values?: number[] } };
      return normalizeEmbedding(data.embedding?.values ?? []);
    }

    throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
  }

  async createChatCompletion(messages: ChatMessage[]): Promise<string> {
    if (this.client) {
      const response = await this.client.chat.completions.create({
        model: this.env.OPENAI_CHAT_MODEL,
        messages,
        temperature: 0.2
      });

      return response.choices[0]?.message?.content?.trim() ?? '';
    }

    if (this.geminiApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.env.GEMINI_CHAT_MODEL}:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: messagesToGeminiText(messages) }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 350
            }
          })
        }
      );

      if (!response.ok) {
        throw await parseGeminiError(response);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';
    }

    throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
  }
}

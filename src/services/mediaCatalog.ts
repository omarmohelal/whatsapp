import type { PrismaClient } from '@prisma/client';
import defaultCatalog from '../../knowledge/media-catalog.json';
import type { Env } from '../config/env';
import type { IntentResult } from './intent';

export interface MediaCatalogEntry {
  key: string;
  title: string;
  imageUrl?: string | null;
  aliases: string[];
}

function resolvePlaceholders(value: string | undefined | null, env: Env): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/\$\{CDN_BASE_URL\}/g, env.CDN_BASE_URL.replace(/\/$/, ''));
}

export function loadDefaultMediaCatalog(env: Env): MediaCatalogEntry[] {
  return (defaultCatalog as MediaCatalogEntry[]).map((item) => ({
    ...item,
    imageUrl: resolvePlaceholders(item.imageUrl, env)
  }));
}

export function catalogKeyForIntent(intent: IntentResult, text: string): string {
  if (intent.entities.game === 'wild_rift') {
    return 'wild_rift_shipping';
  }
  if (intent.name === 'league_rp' || intent.entities.game === 'league') {
    return 'league_rp';
  }
  if (intent.entities.game === 'valorant') {
    return 'valorant_vp';
  }
  if (intent.entities.game === 'clash') {
    return 'clash_shipping';
  }

  const normalized = text.toLowerCase();
  if (normalized.includes('wild rift') || normalized.includes('وايلد ريفت')) {
    return 'wild_rift_shipping';
  }
  if (normalized.includes('rp') || normalized.includes('league') || normalized.includes('ليج')) {
    return 'league_rp';
  }
  if (normalized.includes('valorant') || normalized.includes('فالورانت') || normalized.includes('فال') || normalized.includes(' vp')) {
    return 'valorant_vp';
  }
  if (normalized.includes('clash') || normalized.includes('كلاش')) {
    return 'clash_shipping';
  }

  return 'general_games';
}

export class MediaCatalogService {
  constructor(
    private readonly prisma: PrismaClient | undefined,
    private readonly env: Env
  ) {}

  async findForIntent(args: {
    businessId: string;
    intent: IntentResult;
    text: string;
  }): Promise<MediaCatalogEntry | null> {
    const key = catalogKeyForIntent(args.intent, args.text);

    if (this.prisma) {
      const dbItem = await this.prisma.mediaCatalogItem.findUnique({
        where: {
          businessId_key: {
            businessId: args.businessId,
            key
          }
        }
      });

      if (dbItem) {
        return {
          key: dbItem.key,
          title: dbItem.title,
          imageUrl: resolvePlaceholders(dbItem.imageUrl, this.env),
          aliases: dbItem.aliases
        };
      }
    }

    return loadDefaultMediaCatalog(this.env).find((item) => item.key === key) ?? null;
  }
}

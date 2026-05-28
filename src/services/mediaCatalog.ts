import type { PrismaClient } from '@prisma/client';
import defaultCatalog from '../../knowledge/media-catalog.json';
import type { Env } from '../config/env';
import { normalizeForIntent, type IntentResult } from './intent';

export interface MediaCatalogEntry {
  key: string;
  game?: string | null;
  title: string;
  caption?: string | null;
  imageUrl?: string | null;
  aliases: string[];
  isActive?: boolean;
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
    imageUrl: resolvePlaceholders(item.imageUrl, env),
    isActive: item.isActive ?? true
  }));
}

export function matchesMediaItem(text: string, item: MediaCatalogEntry): boolean {
  const normalized = normalizeForIntent(text);
  return item.aliases.some((alias) => normalized.includes(normalizeForIntent(alias)));
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

  const catalogMatch = (defaultCatalog as MediaCatalogEntry[]).find(
    (item) => item.key !== 'general_games' && matchesMediaItem(text, item)
  );

  return catalogMatch?.key ?? 'general_games';
}

export class MediaCatalogService {
  constructor(
    private readonly prisma: PrismaClient | undefined,
    private readonly env: Env
  ) {}

  async findByText(businessId: string, text: string): Promise<MediaCatalogEntry | null> {
    const catalog = await this.listActive(businessId);
    return catalog.find((item) => item.key !== 'general_games' && matchesMediaItem(text, item)) ?? null;
  }

  async findForIntent(args: {
    businessId: string;
    intent: IntentResult;
    text: string;
  }): Promise<MediaCatalogEntry | null> {
    const key = catalogKeyForIntent(args.intent, args.text);
    const catalog = await this.listActive(args.businessId);
    return catalog.find((item) => item.key === key) ?? null;
  }

  async listActive(businessId: string): Promise<MediaCatalogEntry[]> {
    if (this.prisma) {
      const dbItems = await this.prisma.mediaCatalogItem.findMany({
        where: {
          businessId,
          isActive: true
        },
        orderBy: { key: 'asc' }
      });

      if (dbItems.length) {
        return dbItems.map((item) => ({
          key: item.key,
          game: item.game,
          title: item.title,
          caption: item.caption,
          imageUrl: resolvePlaceholders(item.imageUrl, this.env),
          aliases: item.aliases,
          isActive: item.isActive
        }));
      }
    }

    return loadDefaultMediaCatalog(this.env).filter((item) => item.isActive !== false);
  }
}

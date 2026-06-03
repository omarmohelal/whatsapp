import type { PrismaClient } from '@prisma/client';

export interface AgentSettings {
  aiEnabled: boolean;
  autoReplyEnabled: boolean;
  cooldownSeconds: number;
  replyDebounceSeconds: number;
  maxAutoRepliesPerTenMinutes: number;
  maxMessagesContext: number;
  businessTonePrompt: string;
  gamesServicesKnowledge: string;
  humanHandoffEnabled: boolean;
  ignoreStickers: boolean;
  groupRepliesEnabled: boolean;
  groupPromoEnabled: boolean;
  groupPromoIntervalMinutes: number;
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  aiEnabled: true,
  autoReplyEnabled: true,
  cooldownSeconds: 30,
  replyDebounceSeconds: process.env.NODE_ENV === 'test' ? 0 : 4,
  maxAutoRepliesPerTenMinutes: 3,
  maxMessagesContext: 10,
  businessTonePrompt:
    'رد بالمصري، مختصر، محترم، ودود ومناسب للمبيعات. اسأل سؤال واحد بس لما تحتاج توضيح.',
  gamesServicesKnowledge:
    'TheNexus يدعم شحن Wild Rift وLeague RP وValorant VP، هدايا/سكنات Riot، وبيع وشراء الأكونتات. لا تخترع أسعار أو توفر.',
  humanHandoffEnabled: true,
  ignoreStickers: true,
  groupRepliesEnabled: false,
  groupPromoEnabled: false,
  groupPromoIntervalMinutes: 0
};

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export async function loadAgentSettings(
  prisma: PrismaClient,
  businessId: string
): Promise<AgentSettings> {
  const settings = await prisma.adminSetting.findMany({ where: { businessId } });
  const map = new Map(settings.map((setting) => [setting.key, setting.value as unknown]));

  return {
    aiEnabled: boolValue(map.get('aiEnabled'), DEFAULT_AGENT_SETTINGS.aiEnabled),
    autoReplyEnabled: boolValue(map.get('autoReplyEnabled'), DEFAULT_AGENT_SETTINGS.autoReplyEnabled),
    cooldownSeconds: numberValue(map.get('cooldownSeconds'), DEFAULT_AGENT_SETTINGS.cooldownSeconds, 5, 40),
    replyDebounceSeconds: numberValue(
      map.get('replyDebounceSeconds'),
      DEFAULT_AGENT_SETTINGS.replyDebounceSeconds,
      0,
      10
    ),
    maxAutoRepliesPerTenMinutes: numberValue(
      map.get('maxAutoRepliesPerTenMinutes'),
      DEFAULT_AGENT_SETTINGS.maxAutoRepliesPerTenMinutes,
      1,
      10
    ),
    maxMessagesContext: numberValue(
      map.get('maxMessagesContext'),
      DEFAULT_AGENT_SETTINGS.maxMessagesContext,
      4,
      20
    ),
    businessTonePrompt: stringValue(
      map.get('businessTonePrompt'),
      DEFAULT_AGENT_SETTINGS.businessTonePrompt
    ),
    gamesServicesKnowledge: stringValue(
      map.get('gamesServicesKnowledge'),
      DEFAULT_AGENT_SETTINGS.gamesServicesKnowledge
    ),
    humanHandoffEnabled: boolValue(
      map.get('humanHandoffEnabled'),
      DEFAULT_AGENT_SETTINGS.humanHandoffEnabled
    ),
    ignoreStickers: boolValue(map.get('ignoreStickers'), DEFAULT_AGENT_SETTINGS.ignoreStickers),
    groupRepliesEnabled: boolValue(
      map.get('groupRepliesEnabled'),
      DEFAULT_AGENT_SETTINGS.groupRepliesEnabled
    ),
    groupPromoEnabled: boolValue(map.get('groupPromoEnabled'), DEFAULT_AGENT_SETTINGS.groupPromoEnabled),
    groupPromoIntervalMinutes: numberValue(
      map.get('groupPromoIntervalMinutes'),
      DEFAULT_AGENT_SETTINGS.groupPromoIntervalMinutes,
      0,
      1440
    )
  };
}

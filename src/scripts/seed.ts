import { DEFAULT_BUSINESS } from '../config/constants';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { logger } from '../logger';
import { KnowledgeService } from '../services/knowledge';
import { loadDefaultMediaCatalog } from '../services/mediaCatalog';
import { GeminiService } from '../services/gemini';

const initialKnowledge = [
  {
    title: 'TheNexus services overview',
    body: `TheNexus is a gaming services business.

Services:
- Game top-up / shipping for many games.
- Wild Rift top-up.
- League of Legends RP.
- League of Legends skins gifting.
- Riot gifts.
- Buying, selling, and listing game accounts.

The WhatsApp agent should answer only about TheNexus services. It must not answer unrelated questions.`
  },
  {
    title: 'Game top-up rules',
    body: `If a customer asks about charging or top-up for Wild Rift, League, Clash, or another game, ask for:
- Game name.
- Server / region.
- Required package.

If the game is not listed, say TheNexus can charge most games and ask for the game name, server / region, and required package.

League of Legends RP is instant.

Do not invent prices, package availability, stock, or delivery promises.`
  },
  {
    title: 'Riot gifting rules',
    body: `League of Legends skins gifting requires the customer to add TheNexus first, then wait 7 days before the gift can be delivered.

General Riot gifting requires adding TheNexus accounts and waiting 14 days after friend acceptance due to Riot policy.

Riot gift accounts:
TheNexus#0001
TheNexus#0002
TheNexus#0003
TheNexus#0004
TheNexus#0005
TheNexus#0006
TheNexus#0007
TheNexus#0008`
  },
  {
    title: 'Account selling and listing flow',
    body: `If customer wants to sell or list an account, reply in Egyptian Arabic with the listing form:
https://www.thenexus.ink/

Ask them to include:
- Blue Essence count.
- Current rank.
- Number of skins.
- Server / Region.
- Clear account title.
- Description with important details.
- Images or video of the account.

If they know the price, they should write it. If they do not know the price, they can leave it blank and an admin will price it.

Important preparation:
- Remove 2FA.
- Remove any mobile number.
- Remove any recovery email.
- Make sure all data is correct.

If customer says they do not know the account price, mark the conversation as needs_human_pricing.`
  },
  {
    title: 'Account buying flow',
    body: `If customer wants to buy an account, ask for:
- Game or account type.
- Budget.
- Region.
- Rank.
- Skins / champions.
- Preferences.

If there is no clear match, mark the conversation as needs_human_sales and hand off to admin. Do not invent stock or availability.`
  },
  {
    title: 'Sensitive credential handling',
    body: `If a customer sends Riot, Gmail, Facebook, Apple, or other login credentials, do not repeat passwords back. Mark the conversation as sensitive and let admin continue.

Sensitive data should be masked in logs and deleted after the configured TTL.`
  }
];

async function upsertKnowledgeDocument(args: {
  businessId: string;
  title: string;
  body: string;
}) {
  const existing = await prisma.knowledgeDocument.findFirst({
    where: {
      businessId: args.businessId,
      title: args.title
    }
  });

  if (existing) {
    return prisma.knowledgeDocument.update({
      where: { id: existing.id },
      data: {
        body: args.body,
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });
  }

  return prisma.knowledgeDocument.create({
    data: {
      businessId: args.businessId,
      title: args.title,
      body: args.body,
      source: 'MANUAL',
      status: 'APPROVED',
      approvedAt: new Date()
    }
  });
}

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: DEFAULT_BUSINESS.slug },
    create: DEFAULT_BUSINESS,
    update: {
      name: DEFAULT_BUSINESS.name
    }
  });

  if (env.WHATSAPP_PHONE_NUMBER_ID) {
    await prisma.whatsAppPhone.upsert({
      where: { phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID },
      create: {
        businessId: business.id,
        phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID
      },
      update: {
        businessId: business.id,
        isActive: true
      }
    });
  }

  for (const item of loadDefaultMediaCatalog(env)) {
    await prisma.mediaCatalogItem.upsert({
      where: {
        businessId_key: {
          businessId: business.id,
          key: item.key
        }
      },
      create: {
        businessId: business.id,
        key: item.key,
        game: item.game,
        title: item.title,
        caption: item.caption,
        imageUrl: item.imageUrl,
        aliases: item.aliases,
        isActive: item.isActive ?? true
      },
      update: {
        game: item.game,
        title: item.title,
        caption: item.caption,
        imageUrl: item.imageUrl,
        aliases: item.aliases,
        isActive: item.isActive ?? true
      }
    });
  }

  const paymentMethods = [
    { label: 'Crypto / Binance', value: 'Crypto / Binance', sortOrder: 1 },
    { label: 'Credit Card', value: 'Credit Card', sortOrder: 2 },
    { label: 'PayPal', value: 'PayPal', sortOrder: 3 },
    { label: 'Payoneer', value: 'Payoneer', sortOrder: 4 },
    { label: 'Vodafone Cash', value: '01007208978', sortOrder: 5 },
    { label: 'InstaPay', value: '01014094664', sortOrder: 6 }
  ];

  await prisma.paymentMethod.deleteMany({ where: { businessId: business.id } });
  await prisma.paymentMethod.createMany({
    data: paymentMethods.map((method) => ({
      businessId: business.id,
      ...method,
      isActive: true
    }))
  });

  for (const [key, value] of Object.entries({
    defaultLanguage: 'egyptian_arabic',
    agentTone: 'short_warm_professional_sales_friendly',
    secureFormUrl: env.SECURE_FORM_URL,
    adminNotificationNumber: env.ADMIN_NOTIFICATION_NUMBER
  })) {
    await prisma.adminSetting.upsert({
      where: {
        businessId_key: {
          businessId: business.id,
          key
        }
      },
      create: {
        businessId: business.id,
        key,
        value
      },
      update: { value }
    });
  }

  const documents = [];
  for (const doc of initialKnowledge) {
    documents.push(await upsertKnowledgeDocument({ businessId: business.id, ...doc }));
  }

  if (process.env.SEED_REINDEX !== 'false') {
    const knowledge = new KnowledgeService(prisma, new GeminiService(env, logger));
    for (const doc of documents) {
      try {
        await knowledge.reindexDocument(doc.id);
      } catch (error) {
        logger.warn({ err: error, documentId: doc.id }, 'Seed reindex failed; continuing');
      }
    }
  }

  logger.info(
    {
      businessId: business.id,
      knowledgeDocuments: documents.length
    },
    'Seed complete'
  );
}

void main()
  .catch((error) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

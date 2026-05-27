import type { PrismaClient } from '@prisma/client';

export async function deleteExpiredSensitiveCredentialData(prisma: PrismaClient): Promise<number> {
  const expired = await prisma.sensitiveCredentialEvent.findMany({
    where: {
      deletedAt: null,
      deleteAfter: {
        lte: new Date()
      }
    },
    select: {
      id: true,
      messageId: true
    },
    take: 100
  });

  for (const event of expired) {
    await prisma.$transaction([
      prisma.sensitiveCredentialEvent.update({
        where: { id: event.id },
        data: {
          encryptedPayload: null,
          maskedPreview: '[deleted]',
          deletedAt: new Date()
        }
      }),
      ...(event.messageId
        ? [
            prisma.message.update({
              where: { id: event.messageId },
              data: {
                body: '[sensitive credential deleted]',
                containsSensitiveCredential: false
              }
            })
          ]
        : [])
    ]);
  }

  return expired.length;
}

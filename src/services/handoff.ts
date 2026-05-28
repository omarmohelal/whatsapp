import type { IntentResult } from './intent';

export interface HandoffDecision {
  required: boolean;
  reason?: string;
}

export function shouldHandoff(args: {
  intent: IntentResult;
  isSensitive: boolean;
  uncertain?: boolean;
  explicitAdminRequest?: boolean;
}): HandoffDecision {
  if (args.isSensitive) {
    return { required: true, reason: 'sensitive_credentials' };
  }

  if (args.explicitAdminRequest) {
    return { required: true, reason: 'customer_requested_admin' };
  }

  if (['complaint', 'refund', 'payment_issue', 'human_handoff'].includes(args.intent.name)) {
    return { required: true, reason: args.intent.name };
  }

  if (args.intent.name === 'account_sell' && args.intent.entities.unknownAccountPrice) {
    return { required: true, reason: 'needs_human_pricing' };
  }

  if (args.intent.entities.asksForPrice && args.intent.name === 'general') {
    return { required: true, reason: 'pricing_uncertainty' };
  }

  if (args.uncertain) {
    return { required: true, reason: 'agent_uncertainty' };
  }

  return { required: false };
}

export function customerAskedForAdmin(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    'admin',
    'human',
    'representative',
    'sales',
    'ادمن',
    'حد يكلمني',
    'موظف',
    'خدمة العملاء'
  ].some((keyword) => normalized.includes(keyword));
}

import { shouldHandoff } from '../src/services/handoff';
import { classifyIntent } from '../src/services/intent';

describe('handoff logic', () => {
  it('requires handoff for refunds', () => {
    const decision = shouldHandoff({
      intent: classifyIntent('عايز refund للطلب'),
      isSensitive: false
    });

    expect(decision).toEqual({ required: true, reason: 'refund' });
  });

  it('requires handoff for sensitive credentials', () => {
    const decision = shouldHandoff({
      intent: classifyIntent('hello'),
      isSensitive: true
    });

    expect(decision).toEqual({ required: true, reason: 'sensitive_credentials' });
  });

  it('requires human pricing when a seller does not know the account price', () => {
    const decision = shouldHandoff({
      intent: classifyIntent('عايز ابيع اكونت ومش عارف السعر'),
      isSensitive: false
    });

    expect(decision).toEqual({ required: true, reason: 'needs_human_pricing' });
  });
});

import { detectSensitiveCredentials, maskSensitiveText } from '../src/services/credentials';

describe('credential masking', () => {
  it('masks passwords and marks Riot credentials as sensitive', () => {
    const detection = detectSensitiveCredentials(
      'riot account email: player@gmail.com password: SuperSecret123'
    );

    expect(detection.isSensitive).toBe(true);
    expect(detection.credentialType).toBe('riot');
    expect(detection.maskedText).toContain('password: [MASKED]');
    expect(detection.maskedText).not.toContain('SuperSecret123');
  });

  it('masks Arabic password labels', () => {
    const masked = maskSensitiveText('الايميل test@gmail.com الباسورد: abc123');

    expect(masked).toContain('الباسورد: [MASKED]');
    expect(masked).not.toContain('abc123');
  });
});

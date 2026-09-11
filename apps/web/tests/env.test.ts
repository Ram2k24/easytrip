import { describe, expect, it } from 'vitest';
import { getWebEnv } from '@/lib/env';

describe('web environment', () => {
  it('falls back to the local API origin', () => {
    expect(getWebEnv({}).apiUrl).toBe('http://127.0.0.1:4000');
    expect(getWebEnv({}).siteName).toBe('Easy Trip Nepal');
  });

  it('reads allowlisted NEXT_PUBLIC_ values', () => {
    const env = getWebEnv({
      API_URL: 'http://api.internal:4000',
      NEXT_PUBLIC_API_URL: 'https://api.easytrip.test',
      NEXT_PUBLIC_SITE_NAME: 'Easy Trip',
    });
    expect(env.apiUrl).toBe('http://api.internal:4000');
    expect(env.publicApiUrl).toBe('https://api.easytrip.test');
    expect(env.siteName).toBe('Easy Trip');
  });
});

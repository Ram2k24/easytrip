import { type ArgumentMetadata } from '@nestjs/common';
import { z } from 'zod';
import { ContractError } from '../../src/common/errors/contract.error';
import { ZodValidationPipe } from '../../src/common/validation/zod-validation.pipe';

const metadata = { type: 'body', metatype: Object, data: '' } as ArgumentMetadata;

describe('ZodValidationPipe', () => {
  const schema = z.object({
    email: z.string().email(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  });

  it('returns parsed (and coerced) data on success', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ email: 'ops@easytrip.test', limit: '10' }, metadata)).toEqual({
      email: 'ops@easytrip.test',
      limit: 10,
    });
  });

  it('applies schema defaults', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ email: 'ops@easytrip.test' }, metadata).limit).toBe(25);
  });

  it('throws ETN-VAL-001 with a field map on failure', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ email: 'not-an-email', limit: '500' }, metadata);
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractError);
      const contractError = error as ContractError;
      expect(contractError.code).toBe('ETN-VAL-001');
      const fields = (contractError.details?.fields ?? {}) as Record<string, string[]>;
      expect(Object.keys(fields).sort()).toEqual(['email', 'limit']);
    }
  });
});

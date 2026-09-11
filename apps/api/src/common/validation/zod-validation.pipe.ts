import { ERROR_CATALOG, zodIssuesToFieldMap } from '@easytrip/contracts';
import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ContractError } from '../errors/contract.error.js';

/**
 * Zod validation pipe (Arch §2.4 validation pipeline).
 *
 * On failure it throws `ETN-VAL-001` with a `details.fields` map, which is the
 * shape the web app's form error mapping expects (Phase 02 VF-02).
 */
@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new ContractError('VAL_001', {
      message: ERROR_CATALOG.VAL_001.defaultMessage,
      details: { fields: zodIssuesToFieldMap(result.error) },
    });
  }
}

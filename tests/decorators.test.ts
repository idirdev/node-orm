import { describe, it, expect } from 'vitest';
import { getEntityMetadata, getFieldMetadata } from '../src/decorators';

describe('decorators', () => {
  it('registers entity metadata', () => {
    const meta = getEntityMetadata('User');
    expect(meta).toBeDefined();
  });
  it('registers field metadata', () => {
    const fields = getFieldMetadata('User');
    expect(fields).toBeDefined();
    expect(Array.isArray(fields)).toBe(true);
  });
  it('includes primary key field', () => {
    const fields = getFieldMetadata('User');
    const pk = fields?.find((f: any) => f.primaryKey);
    expect(pk).toBeDefined();
  });
});

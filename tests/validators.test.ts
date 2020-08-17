import { describe, it, expect } from 'vitest';
import { required, minLength, maxLength, email, min, max, validate } from '../src/validators';

describe('validators', () => {
  it('required rejects empty', () => {
    expect(required()('')).not.toBeNull();
    expect(required()(null)).not.toBeNull();
    expect(required()('hello')).toBeNull();
  });
  it('minLength checks length', () => {
    expect(minLength(3)('ab')).not.toBeNull();
    expect(minLength(3)('abc')).toBeNull();
  });
  it('maxLength checks length', () => {
    expect(maxLength(3)('abcd')).not.toBeNull();
    expect(maxLength(3)('abc')).toBeNull();
  });
  it('email validates format', () => {
    expect(email()('invalid')).not.toBeNull();
    expect(email()('test@example.com')).toBeNull();
  });
  it('min checks number', () => {
    expect(min(5)(3)).not.toBeNull();
    expect(min(5)(5)).toBeNull();
  });
  it('max checks number', () => {
    expect(max(10)(15)).not.toBeNull();
    expect(max(10)(10)).toBeNull();
  });
  it('validate combines multiple', () => {
    const errors = validate('', [required(), minLength(3)]);
    expect(errors.length).toBeGreaterThan(0);
  });
});

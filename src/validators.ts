type ValidatorFn = (value: unknown) => string | null;

export function required(): ValidatorFn {
  return (v) => (v === null || v === undefined || v === '') ? 'Field is required' : null;
}

export function minLength(min: number): ValidatorFn {
  return (v) => (typeof v === 'string' && v.length < min) ? `Must be at least ${min} characters` : null;
}

export function maxLength(max: number): ValidatorFn {
  return (v) => (typeof v === 'string' && v.length > max) ? `Must be at most ${max} characters` : null;
}

export function email(): ValidatorFn {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (v) => (typeof v === 'string' && !re.test(v)) ? 'Invalid email' : null;
}

export function min(n: number): ValidatorFn {
  return (v) => (typeof v === 'number' && v < n) ? `Must be at least ${n}` : null;
}

export function max(n: number): ValidatorFn {
  return (v) => (typeof v === 'number' && v > n) ? `Must be at most ${n}` : null;
}

export function pattern(re: RegExp, msg?: string): ValidatorFn {
  return (v) => (typeof v === 'string' && !re.test(v)) ? (msg ?? 'Invalid format') : null;
}

export function validate(value: unknown, validators: ValidatorFn[]): string[] {
  return validators.map((v) => v(value)).filter((e): e is string => e !== null);
}

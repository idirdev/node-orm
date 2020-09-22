import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/QueryBuilder';

describe('QueryBuilder', () => {
  it('builds simple select', () => {
    const q = new QueryBuilder('users').select('id', 'name', 'email');
    const result = q.toSQL();
    expect(result.sql).toContain('SELECT');
    expect(result.sql).toContain('users');
  });
  it('adds where clause', () => {
    const q = new QueryBuilder('users').where('id', '=', 1);
    const result = q.toSQL();
    expect(result.sql).toContain('WHERE');
    expect(result.params).toContain(1);
  });
  it('chains multiple where', () => {
    const q = new QueryBuilder('users').where('age', '>', 18).where('active', '=', true);
    const result = q.toSQL();
    expect(result.sql).toContain('AND');
  });
  it('supports orWhere', () => {
    const q = new QueryBuilder('users').where('role', '=', 'admin').orWhere('role', '=', 'mod');
    const result = q.toSQL();
    expect(result.sql).toContain('OR');
  });
  it('adds order by', () => {
    const q = new QueryBuilder('users').orderBy('created_at', 'DESC');
    const result = q.toSQL();
    expect(result.sql).toContain('ORDER BY');
  });
  it('adds limit and offset', () => {
    const q = new QueryBuilder('users').limit(10).offset(20);
    const result = q.toSQL();
    expect(result.sql).toContain('LIMIT');
    expect(result.sql).toContain('OFFSET');
  });
  it('supports joins', () => {
    const q = new QueryBuilder('users').join('posts', 'users.id', 'posts.user_id');
    const result = q.toSQL();
    expect(result.sql).toContain('JOIN');
  });
  it('supports count', () => {
    const q = new QueryBuilder('users').count();
    const result = q.toSQL();
    expect(result.sql).toContain('COUNT(*)');
  });
  it('supports groupBy and having', () => {
    const q = new QueryBuilder('orders').select('status').groupBy('status').having('status', '=', 'active');
    const result = q.toSQL();
    expect(result.sql).toContain('GROUP BY');
    expect(result.sql).toContain('HAVING');
  });
  it('supports andWhere', () => {
    const q = new QueryBuilder('users').where('age', '>', 18).andWhere('active', '=', true);
    const result = q.toSQL();
    expect(result.sql).toContain('AND');
  });
});

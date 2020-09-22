import { QueryBuilder } from './QueryBuilder';

type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';

interface RelationConfig {
  type: RelationType;
  target: string;
  foreignKey: string;
  localKey?: string;
  pivotTable?: string;
}

export class RelationBuilder {
  private relations: Map<string, RelationConfig> = new Map();

  hasOne(name: string, target: string, foreignKey: string): this {
    this.relations.set(name, { type: 'hasOne', target, foreignKey });
    return this;
  }

  hasMany(name: string, target: string, foreignKey: string): this {
    this.relations.set(name, { type: 'hasMany', target, foreignKey });
    return this;
  }

  belongsTo(name: string, target: string, foreignKey: string): this {
    this.relations.set(name, { type: 'belongsTo', target, foreignKey });
    return this;
  }

  manyToMany(name: string, target: string, pivotTable: string, foreignKey: string, relatedKey: string): this {
    this.relations.set(name, { type: 'manyToMany', target, foreignKey, localKey: relatedKey, pivotTable });
    return this;
  }

  getRelation(name: string): RelationConfig | undefined {
    return this.relations.get(name);
  }

  buildQuery(name: string, id: unknown): QueryBuilder | null {
    const rel = this.relations.get(name);
    if (!rel) return null;

    switch (rel.type) {
      case 'hasOne':
      case 'hasMany':
        return new QueryBuilder(rel.target).where(rel.foreignKey, '=', id);
      case 'belongsTo':
        return new QueryBuilder(rel.target).where('id', '=', id);
      case 'manyToMany':
        return new QueryBuilder(rel.pivotTable!)
          .join(rel.target, `${rel.pivotTable}.${rel.localKey}`, `${rel.target}.id`)
          .where(`${rel.pivotTable}.${rel.foreignKey}`, '=', id);
      default:
        return null;
    }
  }

  get all(): Map<string, RelationConfig> {
    return this.relations;
  }
}

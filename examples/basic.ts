import 'reflect-metadata';
import {
  Entity, Field, PrimaryKey, AutoIncrement, Nullable, Unique, Default,
  HasMany, BelongsTo, Model, Connection, QueryBuilder, Schema, FieldType,
  Migration, MigrationRunner,
} from '../src';

// ─── Define Models ───────────────────────────────────────

@Entity('users')
class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Unique
  @Field({ type: FieldType.STRING, length: 100 })
  email!: string;

  @Field({ type: FieldType.STRING })
  name!: string;

  @Default('active')
  @Field({ type: FieldType.STRING })
  status!: string;

  @HasMany(() => Post, 'userId')
  posts!: Post[];
}

@Entity('posts')
class Post extends Model {
  @PrimaryKey
  @AutoIncrement
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Field({ type: FieldType.STRING })
  title!: string;

  @Nullable
  @Field({ type: FieldType.TEXT })
  content!: string;

  @Field({ type: FieldType.INTEGER })
  userId!: number;

  @BelongsTo(() => User, 'userId')
  author!: User;
}

// ─── Usage Example ───────────────────────────────────────

async function main() {
  // Connect to database
  await Connection.connect({
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'dev',
    password: 'dev',
    logging: true,
  });

  // Generate schema SQL
  console.log('User table SQL:');
  console.log(Schema.generateCreateSQL(User));
  console.log();
  console.log('Post table SQL:');
  console.log(Schema.generateCreateSQL(Post));

  // Query builder example
  const query = QueryBuilder.table('users')
    .select('id', 'name', 'email')
    .where('status', '=', 'active')
    .orderBy('name', 'ASC')
    .limit(10)
    .toSQL();

  console.log('\nQuery:', query.sql);
  console.log('Params:', query.params);

  // Join query example
  const joinQuery = QueryBuilder.table('posts')
    .select('posts.*', 'users.name AS author_name')
    .join('users', 'posts.userId', 'users.id', 'LEFT')
    .where('users.status', '=', 'active')
    .orderBy('posts.id', 'DESC')
    .limit(20)
    .toSQL();

  console.log('\nJoin query:', joinQuery.sql);

  // Aggregation example
  const countQuery = QueryBuilder.table('posts')
    .count()
    .where('userId', '=', 1)
    .toSQL();

  console.log('\nCount query:', countQuery.sql);

  await Connection.disconnect();
}

main().catch(console.error);

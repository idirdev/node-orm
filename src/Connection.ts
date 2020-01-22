import { ConnectionConfig, TransactionHandle } from './types';

type ExecuteFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

export class Connection {
  private static config: ConnectionConfig | null = null;
  private static pool: Map<string, unknown> = new Map();
  private static executeFn: ExecuteFn | null = null;
  private static isConnected = false;
  private static logging = false;

  static async connect(config: ConnectionConfig): Promise<void> {
    this.config = config;
    this.logging = config.logging ?? false;

    // In a real implementation, this would establish a connection pool
    // based on the dialect. Here we provide the interface and structure.
    this.isConnected = true;

    if (this.logging) {
      console.log(`[ORM] Connected to ${config.dialect}://${config.host ?? 'localhost'}/${config.database}`);
    }
  }

  static async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    this.pool.clear();
    this.isConnected = false;
    this.config = null;

    if (this.logging) {
      console.log('[ORM] Disconnected');
    }
  }

  static async execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.isConnected) throw new Error('Not connected to database. Call Connection.connect() first.');
    if (this.logging) {
      console.log(`[ORM] SQL: ${sql}`);
      if (params?.length) console.log(`[ORM] Params: ${JSON.stringify(params)}`);
    }

    if (this.executeFn) {
      return this.executeFn(sql, params) as Promise<T[]>;
    }

    // Default stub: in production, this dispatches to the dialect driver
    throw new Error(
      `No database driver configured for dialect "${this.config?.dialect}". ` +
      `Register a driver with Connection.setExecutor().`
    );
  }

  static async transaction(callback: (handle: TransactionHandle) => Promise<void>): Promise<void> {
    await this.execute('BEGIN');
    const handle: TransactionHandle = {
      execute: (sql: string, params?: unknown[]) => this.execute(sql, params),
      commit: async () => { await this.execute('COMMIT'); },
      rollback: async () => { await this.execute('ROLLBACK'); },
    };

    try {
      await callback(handle);
      await handle.commit();
    } catch (error) {
      await handle.rollback();
      throw error;
    }
  }

  static getConnection(): { config: ConnectionConfig | null; connected: boolean } {
    return { config: this.config, connected: this.isConnected };
  }

  static setExecutor(fn: ExecuteFn): void {
    this.executeFn = fn;
  }

  static getConfig(): ConnectionConfig | null {
    return this.config;
  }
}

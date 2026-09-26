import { DurableObject } from 'cloudflare:workers'

const DAILY_LIMIT = 20

export class DailyBudget extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        'CREATE TABLE IF NOT EXISTS daily_budget (day TEXT PRIMARY KEY, used INTEGER NOT NULL)',
      )
    })
  }

  reserve(): boolean {
    const day = new Date().toISOString().slice(0, 10)
    const current =
      this.ctx.storage.sql
        .exec<{ used: number }>('SELECT used FROM daily_budget WHERE day = ?', day)
        .toArray()[0]?.used || 0
    if (current >= DAILY_LIMIT) return false
    this.ctx.storage.sql.exec(
      'INSERT INTO daily_budget (day, used) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET used = used + 1',
      day,
    )
    this.ctx.storage.sql.exec('DELETE FROM daily_budget WHERE day < ?', day)
    return true
  }
}

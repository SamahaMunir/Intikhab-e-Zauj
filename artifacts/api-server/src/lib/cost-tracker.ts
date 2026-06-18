/**
 * In-memory LLM cost tracker. Resets on server restart (fine for a usage gauge;
 * swap for a Mongo collection if you need durable accounting).
 */

export interface CostLog {
  provider: string;
  timestamp: Date;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  matchId: string;
}

const MAX_LOGS = 5000;
let costLogs: CostLog[] = [];

export function recordCost(provider: string, tokensIn: number, tokensOut: number, cost: number, matchId = ''): void {
  costLogs.push({ provider, timestamp: new Date(), tokensIn, tokensOut, cost, matchId });
  if (costLogs.length > MAX_LOGS) costLogs = costLogs.slice(-MAX_LOGS);
}

export function getMonthlyCost(): number {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  return costLogs.filter(l => l.timestamp > cutoff).reduce((s, l) => s + l.cost, 0);
}

export function getCostStats() {
  const totalCost = costLogs.reduce((s, l) => s + l.cost, 0);
  const insightCount = costLogs.length;
  const tokensUsed = costLogs.reduce((s, l) => s + l.tokensIn + l.tokensOut, 0);
  const byProvider: Record<string, { count: number; cost: number }> = {};
  for (const l of costLogs) {
    byProvider[l.provider] = byProvider[l.provider] || { count: 0, cost: 0 };
    byProvider[l.provider].count++;
    byProvider[l.provider].cost += l.cost;
  }
  return {
    totalCost,
    monthlyCost: getMonthlyCost(),
    insightCount,
    avgCostPerInsight: insightCount > 0 ? totalCost / insightCount : 0,
    tokensUsed,
    byProvider,
  };
}

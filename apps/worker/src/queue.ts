/**
 * Scale-up path: BullMQ worker that runs flows from a Redis queue (e.g. Upstash free tier).
 * Uses exactly the same executor as the GitHub Actions cron (`executeAndPersist`).
 *
 *   REDIS_URL=redis://... npm run queue -w @flowguard/worker
 *
 * Enqueue from anywhere with `enqueueFlowRun(flowId)` (e.g. a webhook-triggered API route).
 */
import { Queue, Worker, type Job } from "bullmq";
import { executeAndPersist, loadFlow, supabaseFromEnv } from "./persist.js";
import { resetResolverBreaker } from "./resolvers/index.js";
import { loadDotEnv, runsDir } from "./cli/common.js";

export const QUEUE_NAME = "flow-runs";

export interface FlowRunJob {
  flowId: string;
  reason?: "schedule" | "webhook" | "manual";
}

function connection() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set");
  return { url, maxRetriesPerRequest: null };
}

export async function enqueueFlowRun(job: FlowRunJob): Promise<string | undefined> {
  const queue = new Queue<FlowRunJob>(QUEUE_NAME, { connection: connection() });
  try {
    const added = await queue.add("run", job, { attempts: 2, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 500, removeOnFail: 1000 });
    return added.id;
  } finally {
    await queue.close();
  }
}

export async function processFlowRun(job: Job<FlowRunJob>) {
  // Long-lived process: give a fixed API key a fresh chance on each job.
  resetResolverBreaker();
  const db = supabaseFromEnv();
  if (!db) throw new Error("Supabase is not configured");
  const flow = await loadFlow(db, job.data.flowId);
  const r = await executeAndPersist(db, flow, runsDir());
  return { runId: r.runId, status: r.diagnostics.status, replayUrl: r.replayUrl };
}

export function startWorker(concurrency = Number(process.env.FLOWGUARD_CONCURRENCY || 2)) {
  const worker = new Worker<FlowRunJob>(QUEUE_NAME, processFlowRun, { connection: connection(), concurrency });
  worker.on("completed", (job, result) => console.log(`[queue] ${job.id} ${JSON.stringify(result)}`));
  worker.on("failed", (job, err) => console.error(`[queue] ${job?.id} failed: ${err.message}`));
  return worker;
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("queue.ts");
if (isMain) {
  loadDotEnv();
  const worker = startWorker();
  console.log(`[queue] listening on "${QUEUE_NAME}"`);
  const stop = async () => { await worker.close(); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

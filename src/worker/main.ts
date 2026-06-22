import { runBatchWorker } from "@/worker/batch-worker";

async function main(): Promise<void> {
  try {
    await runBatchWorker(process.argv.slice(2));
  } catch (error) {
    console.error("Batch worker failed", { error });
    process.exitCode = 1;
  }
}

void main();

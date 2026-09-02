import assert from "node:assert/strict";
import test from "node:test";
import { createCliLogger } from "../cli-logger.mjs";

function memoryStream(isTTY = false) {
  const writes = [];
  return {
    isTTY,
    writes,
    write(value) {
      writes.push(value);
      return true;
    },
  };
}

test("structured logger includes timestamp, level, worker, and step in one serialized write", () => {
  const stream = memoryStream(false);
  const logger = createCliLogger({ workerId: "worker-2", stream });
  logger.info("Starting claim", { step: "startup" });

  assert.equal(stream.writes.length, 1);
  assert.match(stream.writes[0], /^\d{4}-\d{2}-\d{2}T[^ ]+ \[INFO\] \[T:worker-2\] \[STEP:startup\] Starting claim\n$/);
});

test("structured logger emits ANSI colors only for supported TTY output", () => {
  const tty = memoryStream(true);
  const plain = memoryStream(false);
  const previousNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  try {
    createCliLogger({ stream: tty }).ok("Claim created", { step: "claim" });
    createCliLogger({ stream: plain }).ok("Claim created", { step: "claim" });
  } finally {
    if (previousNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = previousNoColor;
  }

  assert.match(tty.writes[0], /\u001b\[/);
  assert.doesNotMatch(plain.writes[0], /\u001b\[/);
});

test("JSON output stays parseable and contains no ANSI escape sequences", () => {
  const stream = memoryStream(true);
  const logger = createCliLogger({ json: true, stream });
  logger.writeJson({ valid: true, count: 2 });

  assert.doesNotMatch(stream.writes[0], /\u001b\[/);
  assert.deepEqual(JSON.parse(stream.writes[0]), { valid: true, count: 2 });
});

test("structured errors include the suggested next action", () => {
  const stream = memoryStream(false);
  const logger = createCliLogger({ stream });
  logger.error("Claim conflict", { step: "claim", next: "check agent-status and retry" });

  assert.match(stream.writes[0], /\[ERROR\]/);
  assert.match(stream.writes[0], /next=check agent-status and retry/);
});

test("summary reports total, success, failed, skipped, retries, and elapsed time", () => {
  const stream = memoryStream(false);
  const logger = createCliLogger({ stream });
  logger.summary({ total: 3, success: 2, failed: 1, skipped: 0, retries: 1, elapsedMs: 42 });

  assert.match(stream.writes[0], /\[STEP:summary\] total=3 success=2 failed=1 skipped=0 retries=1 elapsed=42ms/);
});

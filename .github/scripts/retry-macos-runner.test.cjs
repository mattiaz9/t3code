const assert = require("node:assert/strict");
const test = require("node:test");
const { macosLegsToRetry } = require("./retry-macos-runner.cjs");

const acquired = {
  message: "The job was not acquired by Runner of type hosted even after multiple attempts",
};

function macJob(label, overrides = {}) {
  return {
    name: `Desktop ${label} / Build ${label}`,
    conclusion: "cancelled",
    labels: ["macos-15"],
    steps: [],
    annotations: [acquired],
    ...overrides,
  };
}

test("retries macOS builds that never received a runner", () => {
  const decision = macosLegsToRetry([
    { name: "Build JS bundle", conclusion: "success", steps: [{ name: "Checkout" }] },
    macJob("macOS x64"),
    macJob("macOS arm64"),
    {
      name: "Desktop Linux x64 / Build Linux x64",
      conclusion: "success",
      steps: [{ name: "Checkout" }],
    },
    { name: "Publish GitHub Release", conclusion: "skipped", steps: [] },
    { name: "Desktop macOS arm64 / Verify", conclusion: "skipped", steps: [] },
  ]);
  assert.deepEqual(decision, { labels: ["macOS arm64", "macOS x64"], blockedBy: null });
});

test("does not retry a macOS build that started", () => {
  const decision = macosLegsToRetry([macJob("macOS arm64", { steps: [{ name: "Checkout" }] })]);
  assert.deepEqual(decision, { labels: [], blockedBy: "Desktop macOS arm64 / Build macOS arm64" });
});

test("does not retry a cancellation without the runner annotation", () => {
  const decision = macosLegsToRetry([macJob("macOS arm64", { annotations: [] })]);
  assert.equal(decision.blockedBy, "Desktop macOS arm64 / Build macOS arm64");
  assert.deepEqual(decision.labels, []);
});

test("does not retry when another job failed", () => {
  const decision = macosLegsToRetry([
    macJob("macOS arm64"),
    {
      name: "Desktop Linux x64 / Build Linux x64",
      conclusion: "failure",
      steps: [{ name: "Build" }],
    },
  ]);
  assert.equal(decision.blockedBy, "Desktop Linux x64 / Build Linux x64");
  assert.deepEqual(decision.labels, []);
});

test("does not retry a cancelled job that is not a macOS build", () => {
  const decision = macosLegsToRetry([
    macJob("macOS arm64"),
    {
      name: "Desktop Linux arm64 / Build Linux arm64",
      conclusion: "cancelled",
      labels: ["ubuntu-24.04-arm"],
      steps: [],
      annotations: [acquired],
    },
  ]);
  assert.equal(decision.blockedBy, "Desktop Linux arm64 / Build Linux arm64");
});

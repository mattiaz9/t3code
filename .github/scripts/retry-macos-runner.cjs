const MACOS_BUILD_JOB = /^Desktop (macOS .+) \/ Build \1$/;

function macosBuildLabel(job) {
  const match = MACOS_BUILD_JOB.exec(job.name ?? "");
  return match ? match[1] : null;
}

// GitHub cancels a hosted job that never receives a runner. The job has no
// steps, and the check run says it was not acquired.
function isUnacquiredMacOSJob(job) {
  const label = macosBuildLabel(job);
  if (!label || job.conclusion !== "cancelled" || (job.steps ?? []).length !== 0) return false;
  const runners = job.labels ?? [];
  if (!runners.some((runner) => String(runner).startsWith("macos"))) return false;
  return (job.annotations ?? []).some((note) =>
    String(note.message ?? "").includes("not acquired by Runner"),
  );
}

// Re-run only when every unfinished job is a macOS build that never started.
// Any other failure or cancellation stays failed.
function macosLegsToRetry(jobs) {
  const labels = [];
  const seen = new Set();
  for (const job of jobs) {
    if (job.conclusion === "success" || job.conclusion === "skipped") continue;
    if (!isUnacquiredMacOSJob(job)) {
      return { labels: [], blockedBy: job.name ?? "a job" };
    }
    const label = macosBuildLabel(job);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  labels.sort((left, right) => Number(right.includes("arm64")) - Number(left.includes("arm64")));
  return { labels, blockedBy: null };
}

module.exports = {
  macosLegsToRetry,
};

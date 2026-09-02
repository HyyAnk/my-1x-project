export function createClaimCliResult(claim) {
  return {
    id: claim.id,
    agent: claim.agent,
    task: claim.task,
    status: claim.status,
    expiresAt: claim.expiresAt,
    writeZones: claim.writeZones,
    readStableZones: claim.readStableZones,
    plannedFiles: claim.plannedFiles,
    verificationRequired: claim.verificationRequired,
    baseline: {
      baseRevision: claim.baseline?.baseRevision || claim.baseRevision,
      repositoryFingerprint: claim.baseline?.repositoryFingerprint || null,
      dirtyFileCount: claim.baseline?.changedFiles?.length || 0,
    },
    leaseToken: claim.leaseToken,
  };
}

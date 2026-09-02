import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createLeaseToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLeaseToken(token) };
}

export function hashLeaseToken(token) {
  if (typeof token !== "string" || !token) {
    throw new Error("A lease token is required for this claim operation.");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function assertLeaseToken(claim, token) {
  if (!claim?.leaseTokenHash) {
    throw new Error(`Claim "${claim?.id || "unknown"}" has no lease token and cannot be mutated.`);
  }
  const provided = Buffer.from(hashLeaseToken(token), "hex");
  const expected = Buffer.from(claim.leaseTokenHash, "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error(`Lease token is invalid for claim "${claim.id}".`);
  }
}

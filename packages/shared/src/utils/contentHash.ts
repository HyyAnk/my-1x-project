import type { BankQuestion } from "../schemas/questionBank.js";

/** Deterministic JSON serialization for content-addressed contracts. */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJsonStringify).join(",")}]`;
  const objectValue = value as Record<string, unknown>;
  const pairs = Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJsonStringify(objectValue[key])}`);
  return `{${pairs.join(",")}}`;
}

/** SHA-256 implementation available in browser and Node runtimes. */
export function sha256Hex(input: string): string {
  const rotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const bytes = new TextEncoder().encode(input);
  const words: number[] = [];
  const bitLength = bytes.length * 8;
  for (let i = 0; i < bytes.length; i += 1) words[i >> 2] |= (bytes[i] & 0xff) << ((3 - (i % 4)) * 8);
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
    0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
    0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
    0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
    0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let offset = 0; offset < words.length; offset += 16) {
    const schedule: number[] = [];
    for (let i = 0; i < 64; i += 1) {
      if (i < 16) schedule[i] = words[offset + i] | 0;
      else {
        const s0 = rotate(schedule[i - 15], 7) ^ rotate(schedule[i - 15], 18) ^ (schedule[i - 15] >>> 3);
        const s1 = rotate(schedule[i - 2], 17) ^ rotate(schedule[i - 2], 19) ^ (schedule[i - 2] >>> 10);
        schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) | 0;
      }
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i += 1) {
      const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choose = (e & f) ^ (~e & g);
      const t1 = (h + sum1 + choose + constants[i] + schedule[i]) | 0;
      const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (sum0 + majority) | 0;
      [a, b, c, d, e, f, g, h] = [(t1 + t2) | 0, a, b, c, (d + t1) | 0, e, f, g];
    }
    state = state.map((value, index) => (value + [a, b, c, d, e, f, g, h][index]) | 0);
  }
  return state.map((word) => [3, 2, 1, 0].map((shift) => ((word >> (shift * 8)) & 255).toString(16).padStart(2, "0")).join("")).join("");
}

/** Hashes immutable Bank source data while excluding timestamps and cooldown projections. */
export function hashBankQuestionSource(question: BankQuestion): string {
  const {
    created_at: _createdAt,
    updated_at: _updatedAt,
    channel_cooldown: _cooldown,
    translations: _translations,
    ...immutableQuestion
  } = question as BankQuestion & { channel_cooldown?: unknown };
  return sha256Hex(canonicalJsonStringify({ question: immutableQuestion }));
}

export const sourceCanonicalJsonStringify = canonicalJsonStringify;
export const sourceSha256Hex = sha256Hex;

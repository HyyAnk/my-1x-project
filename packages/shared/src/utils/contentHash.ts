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

const SHA256_ROUND_CONSTANTS = new Int32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
  0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
  0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
  0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const SHA256_INITIAL_STATE = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const utf8Encoder = new TextEncoder();

const rotateRight = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

/** Packs UTF-8 bytes into big-endian 32-bit words with SHA-256 padding and the trailing bit length. */
function padMessageWords(bytes: Uint8Array): Int32Array {
  const words = new Int32Array((((bytes.length + 8) >> 6) + 1) << 4);
  for (let i = 0; i < bytes.length; i += 1) words[i >> 2] |= bytes[i] << ((3 - (i & 3)) * 8);
  words[bytes.length >> 2] |= 0x80 << ((3 - (bytes.length & 3)) * 8);
  words[words.length - 1] = bytes.length * 8;
  return words;
}

function compressBlock(state: Int32Array, words: Int32Array, offset: number, schedule: Int32Array): void {
  for (let i = 0; i < 16; i += 1) schedule[i] = words[offset + i];
  for (let i = 16; i < 64; i += 1) {
    const w15 = schedule[i - 15];
    const w2 = schedule[i - 2];
    const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ (w15 >>> 3);
    const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ (w2 >>> 10);
    schedule[i] = (schedule[i - 16] + s0 + schedule[i - 7] + s1) | 0;
  }
  let a = state[0],
    b = state[1],
    c = state[2],
    d = state[3],
    e = state[4],
    f = state[5],
    g = state[6],
    h = state[7];
  for (let i = 0; i < 64; i += 1) {
    const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
    const t1 = (h + sum1 + ((e & f) ^ (~e & g)) + SHA256_ROUND_CONSTANTS[i] + schedule[i]) | 0;
    const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
    const t2 = (sum0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
    h = g;
    g = f;
    f = e;
    e = (d + t1) | 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) | 0;
  }
  state[0] += a;
  state[1] += b;
  state[2] += c;
  state[3] += d;
  state[4] += e;
  state[5] += f;
  state[6] += g;
  state[7] += h;
}

/** SHA-256 implementation available in browser and Node runtimes. */
export function sha256Hex(input: string): string {
  const words = padMessageWords(utf8Encoder.encode(input));
  const state = Int32Array.from(SHA256_INITIAL_STATE);
  const schedule = new Int32Array(64);
  for (let offset = 0; offset < words.length; offset += 16) compressBlock(state, words, offset, schedule);
  let hex = "";
  for (const word of state) hex += (word >>> 0).toString(16).padStart(8, "0");
  return hex;
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

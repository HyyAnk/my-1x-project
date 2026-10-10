import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import nodeTest from "node:test";
import { sha256Hex } from "../src/index.js";

const nodeSha256 = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");

void nodeTest("sha256Hex matches known SHA-256 digests", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

void nodeTest("sha256Hex matches node:crypto across padding boundaries and multi-byte text", () => {
  const inputs = ["x".repeat(55), "x".repeat(56), "x".repeat(63), "x".repeat(64), "x".repeat(119), "x".repeat(1000), "é漢字🎉 mixed"];
  for (let length = 0; length < 300; length += 7) {
    inputs.push(
      Array.from({ length }, (_, index) => String.fromCodePoint(index % 5 === 0 ? 0x4e00 + index : 0x41 + (index % 26))).join(""),
    );
  }
  for (const input of inputs) {
    assert.equal(sha256Hex(input), nodeSha256(input), `digest mismatch for input of length ${input.length}`);
  }
});

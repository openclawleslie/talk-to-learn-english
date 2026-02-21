import assert from "node:assert/strict";
import test from "node:test";

import { alignWords } from "@/lib/word-alignment";

test("alignWords with perfect match", () => {
  const result = alignWords({
    reference: "Hello world",
    transcript: "Hello world",
  });

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    text: "Hello",
    status: "correct",
    referenceIndex: 0,
    transcriptIndex: 0,
  });
  assert.deepEqual(result[1], {
    text: "world",
    status: "correct",
    referenceIndex: 1,
    transcriptIndex: 1,
  });
});

test("alignWords with case-insensitive match", () => {
  const result = alignWords({
    reference: "Hello World",
    transcript: "hello world",
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].status, "correct");
  assert.equal(result[1].status, "correct");
});

test("alignWords with missing word", () => {
  const result = alignWords({
    reference: "Hello beautiful world",
    transcript: "Hello world",
  });

  assert.equal(result.length, 3);
  assert.deepEqual(result[0], {
    text: "Hello",
    status: "correct",
    referenceIndex: 0,
    transcriptIndex: 0,
  });
  assert.deepEqual(result[1], {
    text: "beautiful",
    status: "missing",
    referenceIndex: 1,
    transcriptIndex: undefined,
  });
  assert.deepEqual(result[2], {
    text: "world",
    status: "correct",
    referenceIndex: 2,
    transcriptIndex: 1,
  });
});

test("alignWords with extra word", () => {
  const result = alignWords({
    reference: "Hello world",
    transcript: "Hello beautiful world",
  });

  assert.equal(result.length, 3);
  assert.equal(result[0].text, "Hello");
  assert.equal(result[0].status, "correct");
  assert.equal(result[1].text, "beautiful");
  assert.equal(result[1].status, "extra");
  assert.equal(result[1].referenceIndex, undefined);
  assert.equal(result[2].text, "world");
  assert.equal(result[2].status, "correct");
});

test("alignWords with incorrect word", () => {
  const result = alignWords({
    reference: "Hello world",
    transcript: "Hello word",
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].status, "correct");
  assert.equal(result[1].text, "world");
  assert.equal(result[1].status, "incorrect");
  assert.equal(result[1].referenceIndex, 1);
  assert.equal(result[1].transcriptIndex, 1);
});

test("alignWords with punctuation", () => {
  const result = alignWords({
    reference: "Hello, world!",
    transcript: "Hello world",
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].status, "correct");
  assert.equal(result[1].status, "correct");
});

test("alignWords with empty transcript", () => {
  const result = alignWords({
    reference: "Hello world",
    transcript: "",
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].status, "missing");
  assert.equal(result[1].status, "missing");
});

test("alignWords with empty reference", () => {
  const result = alignWords({
    reference: "",
    transcript: "Hello world",
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].status, "extra");
  assert.equal(result[1].status, "extra");
});

test("alignWords with completely different sentences", () => {
  const result = alignWords({
    reference: "Good morning",
    transcript: "Hello world",
  });

  assert.equal(result.length, 4);
  // All reference words should be marked as missing or incorrect
  // All transcript words should be marked as extra or incorrect
});

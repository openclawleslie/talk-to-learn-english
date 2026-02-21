import type { AlignedWord } from "@/lib/types/pronunciation";

/**
 * Normalizes a word by removing punctuation and converting to lowercase.
 *
 * @param word - The word to normalize
 * @returns Normalized word
 * @internal
 */
function normalizeWord(word: string): string {
  return word.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}

/**
 * Tokenizes a sentence into an array of words.
 *
 * @param sentence - The sentence to tokenize
 * @returns Array of words with punctuation removed
 * @internal
 */
function tokenize(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

/**
 * Calculates the Levenshtein distance between two strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance between the strings
 * @internal
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if two words are similar enough to be considered a match.
 *
 * Words match exactly if they are identical after normalization.
 * This is used to mark words as "correct" in the alignment.
 *
 * @param word1 - First word
 * @param word2 - Second word
 * @returns True if words match exactly
 * @internal
 */
function areSimilar(word1: string, word2: string): boolean {
  const normalized1 = normalizeWord(word1);
  const normalized2 = normalizeWord(word2);

  return normalized1 === normalized2;
}

/**
 * Checks if two words are close enough to align as incorrect pronunciation.
 *
 * Words are considered alignable if they have a small edit distance,
 * suggesting they are attempts at pronouncing the same word.
 *
 * @param word1 - First word
 * @param word2 - Second word
 * @returns True if words should be aligned as incorrect match
 * @internal
 */
function areAlignable(word1: string, word2: string): boolean {
  const normalized1 = normalizeWord(word1);
  const normalized2 = normalizeWord(word2);

  if (normalized1 === normalized2) {
    return true;
  }

  // For alignment purposes, allow words with small edit distance to be paired
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Allow 1-2 character difference for reasonable word length
  if (maxLength <= 3) {
    return distance <= 1;
  } else if (maxLength <= 6) {
    return distance <= 2;
  } else {
    return distance <= 3;
  }
}

/**
 * Aligns words from a reference sentence with words from a transcript.
 *
 * Uses a dynamic programming approach to find the optimal alignment between
 * the reference sentence and the student's transcript. Each word is marked as:
 * - correct: Word matches the reference
 * - incorrect: Word is in the same position but doesn't match
 * - missing: Word is in the reference but not spoken
 * - extra: Word was spoken but not in the reference
 *
 * @param input - Object containing the reference sentence and transcript
 * @param input.reference - The target sentence the student should speak
 * @param input.transcript - The actual transcribed text from the student's speech
 * @returns Array of aligned words with status indicators
 *
 * @example
 * ```ts
 * const aligned = alignWords({
 *   reference: 'Hello world',
 *   transcript: 'Hello beautiful world'
 * });
 * // Returns:
 * // [
 * //   { text: 'Hello', status: 'correct', referenceIndex: 0, transcriptIndex: 0 },
 * //   { text: 'beautiful', status: 'extra', transcriptIndex: 1 },
 * //   { text: 'world', status: 'correct', referenceIndex: 1, transcriptIndex: 2 }
 * // ]
 * ```
 */
export function alignWords(input: { reference: string; transcript: string }): AlignedWord[] {
  const refWords = tokenize(input.reference);
  const transWords = tokenize(input.transcript);

  // Handle empty cases
  if (refWords.length === 0) {
    return transWords.map((word, idx) => ({
      text: word,
      status: "extra" as const,
      transcriptIndex: idx,
    }));
  }

  if (transWords.length === 0) {
    return refWords.map((word, idx) => ({
      text: word,
      status: "missing" as const,
      referenceIndex: idx,
    }));
  }

  // Use dynamic programming for alignment
  const m = refWords.length;
  const n = transWords.length;

  // dp[i][j] = cost of aligning refWords[0..i-1] with transWords[0..j-1]
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  // backtrack[i][j] = direction to backtrack from (i,j)
  const backtrack: string[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(""));

  // Initialize base cases
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i; // cost of deleting all reference words
    backtrack[i][0] = "up";
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j; // cost of inserting all transcript words
    backtrack[0][j] = "left";
  }

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const wordsMatch = areSimilar(refWords[i - 1], transWords[j - 1]);
      const wordsAlignable = areAlignable(refWords[i - 1], transWords[j - 1]);
      const match = wordsMatch ? 0 : 2;

      const costs = {
        diagonal: dp[i - 1][j - 1] + match, // match or substitute
        up: dp[i - 1][j] + 1, // delete from reference (missing word)
        left: dp[i][j - 1] + 1, // insert from transcript (extra word)
      };

      // Prefer diagonal if words are alignable (match or close enough)
      if (wordsAlignable && costs.diagonal <= costs.up && costs.diagonal <= costs.left) {
        dp[i][j] = costs.diagonal;
        backtrack[i][j] = "diagonal";
      } else if (costs.up <= costs.left && costs.up <= costs.diagonal) {
        dp[i][j] = costs.up;
        backtrack[i][j] = "up";
      } else if (costs.left <= costs.diagonal) {
        dp[i][j] = costs.left;
        backtrack[i][j] = "left";
      } else {
        dp[i][j] = costs.diagonal;
        backtrack[i][j] = "diagonal";
      }
    }
  }

  // Backtrack to find alignment
  const aligned: AlignedWord[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const direction = backtrack[i][j];

    if (direction === "diagonal") {
      const refWord = refWords[i - 1];
      const transWord = transWords[j - 1];
      const isMatch = areSimilar(refWord, transWord);

      aligned.unshift({
        text: refWord,
        status: isMatch ? "correct" : "incorrect",
        referenceIndex: i - 1,
        transcriptIndex: j - 1,
      });
      i--;
      j--;
    } else if (direction === "up") {
      // Missing word (in reference but not transcript)
      aligned.unshift({
        text: refWords[i - 1],
        status: "missing",
        referenceIndex: i - 1,
        transcriptIndex: undefined,
      });
      i--;
    } else {
      // Extra word (in transcript but not reference)
      aligned.unshift({
        text: transWords[j - 1],
        status: "extra",
        referenceIndex: undefined,
        transcriptIndex: j - 1,
      });
      j--;
    }
  }

  return aligned;
}

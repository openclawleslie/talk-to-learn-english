/**
 * Status of a word in the pronunciation alignment.
 *
 * - correct: Word was pronounced correctly
 * - incorrect: Word was mispronounced
 * - missing: Word was not spoken
 * - extra: Word was spoken but not in the reference sentence
 */
export type WordStatus = "correct" | "incorrect" | "missing" | "extra";

/**
 * Represents a single word in the word-by-word alignment between
 * the reference sentence and the student's transcript.
 *
 * Used to provide visual feedback on which specific words were
 * pronounced correctly or incorrectly.
 *
 * @example
 * ```ts
 * const word: AlignedWord = {
 *   text: "hello",
 *   status: "correct",
 *   referenceIndex: 0,
 *   transcriptIndex: 0
 * };
 * ```
 */
export interface AlignedWord {
  /**
   * The word text from either the reference sentence or transcript.
   */
  text: string;

  /**
   * The pronunciation status of this word.
   */
  status: WordStatus;

  /**
   * Index of this word in the reference sentence (0-based).
   * Undefined for extra words not in the reference.
   */
  referenceIndex?: number;

  /**
   * Index of this word in the transcript (0-based).
   * Undefined for missing words not in the transcript.
   */
  transcriptIndex?: number;
}

/**
 * Represents a pronunciation improvement tip in Traditional Chinese.
 *
 * Provides specific, actionable feedback based on common pronunciation
 * errors detected in the student's speech.
 *
 * @example
 * ```ts
 * const tip: PronunciationTip = {
 *   message: "注意 'th' 的發音，舌頭要放在牙齒之間",
 *   example: "think, thank, three"
 * };
 * ```
 */
export interface PronunciationTip {
  /**
   * The improvement tip message in Traditional Chinese.
   */
  message: string;

  /**
   * Optional English word examples to illustrate the tip.
   */
  example?: string;
}

/**
 * Detailed pronunciation feedback for a student's submission.
 *
 * Includes word-by-word alignment showing which words were pronounced
 * correctly/incorrectly, plus actionable improvement tips in Traditional Chinese.
 *
 * This is stored in the database as JSONB and returned to the frontend
 * for visual feedback display.
 *
 * @example
 * ```ts
 * const feedback: DetailedFeedback = {
 *   words: [
 *     { text: "hello", status: "correct", referenceIndex: 0, transcriptIndex: 0 },
 *     { text: "world", status: "incorrect", referenceIndex: 1, transcriptIndex: 1 }
 *   ],
 *   tips: [
 *     {
 *       message: "注意 'world' 的 'r' 音，舌頭要向後捲",
 *       example: "world, word, work"
 *     }
 *   ]
 * };
 * ```
 */
export interface DetailedFeedback {
  /**
   * Array of aligned words from the reference sentence and transcript.
   * Words are ordered by their appearance in the reference sentence,
   * with extra words appended at the end.
   */
  words: AlignedWord[];

  /**
   * Array of improvement tips based on detected pronunciation errors.
   * Tips are in Traditional Chinese with optional English examples.
   */
  tips: PronunciationTip[];
}

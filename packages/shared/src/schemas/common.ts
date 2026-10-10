import { z } from "zod";

export const IsoDate = z.string().datetime({ offset: true });

export const QUIZ_MIN_QUESTION_COUNT = 3;

export const QUIZ_MAX_QUESTION_COUNT = 50;

// A child-friendly quiz needs reading, thinking, reveal, and explanation time.
// Keep this shared so topic selection and episode creation make the same promise.
export const QUIZ_SECONDS_PER_QUESTION = 33;

export const QUIZ_MIN_CHOICES_PER_QUESTION = 2;

export const QUIZ_STANDARD_CHOICES_PER_QUESTION = 3;

export const QUIZ_YES_NO_CHOICES_PER_QUESTION = 2;

export const QUIZ_MAX_CHOICES_PER_QUESTION = 3;

// Quiz Short is a portrait product with a tight duration budget (45 to 60 seconds).
export const QUIZ_SHORT_MIN_QUESTION_COUNT = 3;

export const QUIZ_SHORT_MAX_QUESTION_COUNT = 7;

export const QUIZ_SHORT_DEFAULT_QUESTION_COUNT = 5;

export const QUIZ_SHORT_SECONDS_PER_QUESTION = 10;

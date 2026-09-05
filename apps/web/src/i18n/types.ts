import type { en } from "./en";

export type Language = "en";

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends object ? DeepStringRecord<T[K]> : T[K];
};

export type TranslationSchema = DeepStringRecord<typeof en>;

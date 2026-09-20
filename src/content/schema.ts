import { z } from 'astro/zod';
import { isCell } from '../board/geometry';
import { isPartType } from '../parts/registry';

const cell = z
  .string()
  .refine(isCell, { message: 'must be a board cell such as C4 (rows A-G, columns 1-10)' });

export const placedPartSchema = z
  .object({
    type: z.string().refine(isPartType, { message: 'not a part in the kit' }),
    from: cell.optional(),
    to: cell.optional(),
    at: cell.optional(),
    level: z.number().int().min(1).max(3).default(1),
    flip: z.boolean().default(false),
  })
  .refine(
    (part) =>
      (part.at !== undefined && part.from === undefined && part.to === undefined) ||
      (part.at === undefined && part.from !== undefined && part.to !== undefined),
    { message: 'a part needs either `at`, or both `from` and `to` — never both forms' },
  );

export const boardSchema = z.object({
  caption: z.string().optional(),
  /** Set when the build plan deliberately leaves a gap for the reader to bridge. */
  openGap: z.boolean().default(false),
  parts: z.array(placedPartSchema).min(1),
});

/** A coloured concept box beside an experiment, explaining the idea behind it. */
export const sidebarSchema = z.object({
  heading: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
});

/** A reference table, such as the Morse alphabet or a switch-position chart. */
export const tableSchema = z
  .object({
    heading: z.string().min(1),
    columns: z.array(z.string().min(1)).min(1),
    rows: z.array(z.array(z.string()).min(1)).min(1),
  })
  .refine((table) => table.rows.every((row) => row.length === table.columns.length), {
    message: 'every row must have exactly one cell per column',
  });

export const experimentSchema = z.object({
  number: z.number().int().min(1).max(60),
  title: z.string().min(1),
  chapter: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  whatHappens: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).optional(),
  sidebar: sidebarSchema.optional(),
  tables: z.array(tableSchema).default([]),
  boards: z.array(boardSchema).min(1).max(4),
});

export const chapterSchema = z.object({
  order: z.number().int().min(1).max(5),
  title: z.string().min(1),
  colour: z.enum(['red', 'green', 'orange', 'blue', 'purple']),
  intro: z.array(z.string().min(1)).min(1),
  deepDive: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.array(z.string().min(1)).min(1),
      }),
    )
    .default([]),
});

export type Experiment = z.infer<typeof experimentSchema>;
export type Chapter = z.infer<typeof chapterSchema>;

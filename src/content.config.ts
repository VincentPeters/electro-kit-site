import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { chapterSchema, experimentSchema } from './content/schema';

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/chapters' }),
  schema: chapterSchema,
});

const experiments = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/experiments' }),
  // The plain schema keeps `chapter` as a string so Vitest can validate the
  // same files; Astro upgrades it to a real cross-collection reference.
  schema: experimentSchema.extend({ chapter: reference('chapters') }),
});

export const collections = { chapters, experiments };

import { z } from 'zod';

export const emailField = z.email().transform((s) => s.trim().toLowerCase());

export const idParam = z.object({ id: z.string() });
export const slugParam = z.object({ slug: z.string() });

import {z} from 'zod';
export const identitySchema = z.object({
  code: z.string().trim().min(1).max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Bitte nur Buchstaben, Zahlen, Bindestriche oder Unterstriche verwenden.').transform(s=>s.toUpperCase()),
  teamName: z.string().trim().min(1).max(80).refine(s=>!/[\u0000-\u001f\u007f]/.test(s)),
});

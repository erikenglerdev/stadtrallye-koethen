import {createHash} from 'node:crypto';
import {z} from 'zod';
import rawRoute from '../../data/rally-route.json';
const stationSchema = z.object({id: z.string().min(1), number: z.number().int().positive(), name: z.string().min(1), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), radiusMeters: z.number().min(10).max(100), hint: z.string().min(1), hintParts: z.array(z.object({text: z.string(), bold: z.boolean().optional(), underline: z.boolean().optional()})).optional(), hintLayout: z.literal('verse').optional(), hintImage: z.object({src: z.string().regex(/^\/assets\/rally-clues\/[a-f0-9]+\.(jpg|png)$/), alt: z.string().min(1), width: z.number().int().positive(), height: z.number().int().positive()}).optional()});
export const route = z.object({title: z.string(), track: z.array(z.object({lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180)})).min(2), stations: z.array(stationSchema).min(2)}).parse(rawRoute);
if (new Set(route.stations.map(s => s.id)).size !== route.stations.length || route.stations.some((s, i) => s.number !== i + 1)) throw new Error('Station IDs must be unique and numbers sequential');
if (route.stations.some(s => s.hintParts && s.hintParts.map(part => part.text).join('') !== s.hint)) throw new Error('Formatted clue must match its plain text');
// Presentation-only emphasis must not invalidate an ongoing round.
export const routeVersion = createHash('sha256').update(JSON.stringify(route, (key, value) => key === 'hintParts' ? undefined : value)).digest('hex');

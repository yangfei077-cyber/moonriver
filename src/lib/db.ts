import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
const isNeonUrl = url && typeof url === 'string' && (url.startsWith('postgresql://') || url.startsWith('postgres://'));

export const sql = isNeonUrl ? neon(url!) : null;

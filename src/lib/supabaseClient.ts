import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as variáveis de ambiente do Supabase!');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

let channelSequence = 0;

/**

 * Returns a unique realtime channel topic per call so `supabase.channel()`
 * never reuses an already-subscribed channel (which would throw "cannot add
 * `postgres_changes` callbacks ... after `subscribe()`" under React StrictMode,
 * where effects mount/unmount/mount without awaiting removeChannel).
 */
export function uniqueChannelTopic(base: string): string {
  channelSequence += 1;
  return `${base}-${Date.now()}-${channelSequence}`;
}
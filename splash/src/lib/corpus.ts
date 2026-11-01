import { getLiveCollection } from 'astro:content';

export interface CorpusEntry {
  id: string;
  data: Record<string, any>;
  body: string;
}

/**
 * Every entry of a live collection, with the body back on the entry where the
 * routes expect it. Throws when GitHub can't be reached at all, so a route can
 * tell "temporarily unavailable" from "no such document".
 */
export async function getCorpus(collection: 'changelog' | 'context-v'): Promise<CorpusEntry[]> {
  const { entries, error } = await getLiveCollection(collection);
  if (error) throw error;
  return (entries ?? []).map(({ id, data }) => ({ id, data, body: (data as any).body ?? '' }));
}

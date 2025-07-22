import { supabase } from '@/contexts/SessionContext';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function fetchWithRetry(
  query: Promise<any>,
  retries = MAX_RETRIES
): Promise<any> {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(query, retries - 1);
    }
    throw error;
  }
}
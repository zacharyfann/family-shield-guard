import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const getDirectory = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const client = createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from('institutional_directory').select('id,brand_name,verified_phone,verified_domain,safe_portal_url').order('brand_name');
  if (error) throw new Error('The official directory could not be loaded. Please try again later.');
  return data;
});

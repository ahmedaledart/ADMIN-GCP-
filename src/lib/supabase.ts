import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://uqqbbaylcmmtyutymqpa.supabase.co";
// Important: Must use correct publishable key from environment.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (...args) => {
      // Add global timeout of 5 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      return fetch(args[0], {
        ...args[1],
        signal: controller.signal
      }).then(res => {
        clearTimeout(timeoutId);
        return res;
      }).catch(err => {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Timeout: The request to Supabase took longer than 5 seconds.');
        }
        throw err;
      });
    }
  }
});

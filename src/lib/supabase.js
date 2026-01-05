import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const supabaseEnabled = hasSupabase;

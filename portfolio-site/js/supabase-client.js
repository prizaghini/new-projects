import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

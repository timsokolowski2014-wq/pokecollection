import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gqxtmzdrpadaezwtkhkd.supabase.co";
const supabaseKey = "sb_publishable_tv89vSZu4CSQCsNrDuLpLQ_om2laYTJ";

export const supabase = createClient(supabaseUrl, supabaseKey);
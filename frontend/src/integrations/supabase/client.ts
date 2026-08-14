import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://rzslgglgpbvjytjqnair.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6c2xnZ2xncGJ2anl0anFuYWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODM2NDYsImV4cCI6MjEwMjI1OTY0Nn0.oKpRVARTOBNDRp41YaDztftyGpmbME4QYXcZmtIv_zY";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
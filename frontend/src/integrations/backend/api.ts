import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function invokeBackendApi<T = any>(
  endpoint: string,
  payload: any
): Promise<{ data: T | null; error: Error | null }> {
  // If Render backend URL is configured, call the Render Express API
  if (BACKEND_URL) {
    try {
      const cleanBase = BACKEND_URL.replace(/\/+$/, "");
      const cleanEndpoint = endpoint.replace(/^\/+/, "");
      const res = await fetch(`${cleanBase}/api/${cleanEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return { data, error: null };
    } catch (err: any) {
      console.warn(`Render backend call failed, falling back to Supabase function:`, err);
    }
  }

  // Fallback to Supabase Functions
  try {
    const { data, error } = await supabase.functions.invoke(endpoint, {
      body: payload,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

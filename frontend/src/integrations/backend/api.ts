import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export async function invokeBackendApi<T = any>(
  endpoint: string,
  payload: any
): Promise<{ data: T | null; error: Error | null }> {
  const cleanEndpoint = endpoint.replace(/^\/+/, "").replace(/^api\//, "");
  
  // 1. Try local/relative proxy or direct backend URL
  try {
    const targetUrl = BACKEND_URL
      ? `${BACKEND_URL.replace(/\/+$/, "")}/api/${cleanEndpoint}`
      : `/api/${cleanEndpoint}`;

    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionData?.session?.access_token) {
      headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
    }

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { data, error: null };
    }

    // If server returned an application error, return it directly
    const errorData = await res.json().catch(() => null);
    return {
      data: null,
      error: new Error(errorData?.error || `Request failed with status ${res.status}`),
    };
  } catch (err: any) {
    console.warn(`Local backend unreachable, trying fallback:`, err);
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

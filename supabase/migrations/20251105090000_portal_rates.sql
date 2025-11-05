-- Table for per-card-type commission rates per portal
CREATE TABLE IF NOT EXISTS public.portal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portal_id, card_type)
);

ALTER TABLE public.portal_rates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read; allow authenticated users to manage their setup (you may tighten later)
CREATE POLICY "portal_rates_read" ON public.portal_rates FOR SELECT USING (true);
CREATE POLICY "portal_rates_write" ON public.portal_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "portal_rates_update" ON public.portal_rates FOR UPDATE USING (true);
CREATE POLICY "portal_rates_delete" ON public.portal_rates FOR DELETE USING (true);



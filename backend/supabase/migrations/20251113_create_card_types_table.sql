-- Create card_types table for managing different card types with their percentages
CREATE TABLE IF NOT EXISTS public.card_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.card_types ENABLE ROW LEVEL SECURITY;

-- Policies for card_types (users can view, but only admins can modify)
CREATE POLICY "Users can view all card types"
  ON public.card_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert card types"
  ON public.card_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update card types"
  ON public.card_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete card types"
  ON public.card_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_card_types_updated_at
  BEFORE UPDATE ON public.card_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default card types
INSERT INTO public.card_types (name, percentage) VALUES
  ('Credit Card', 2.50),
  ('Debit Card', 1.50),
  ('UPI', 0.00)
ON CONFLICT (name) DO NOTHING;

-- Allow authenticated users to delete portals (adjust as needed for admins-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portals' AND policyname = 'Users can delete portals'
  ) THEN
    CREATE POLICY "Users can delete portals"
      ON public.portals FOR DELETE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;



-- ==============================================================================
-- SQL Script: Completely Remove Web Scraping from Database
-- Instructions: Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Drop the scraping_configs table and any associated constraints/foreign keys
DROP TABLE IF EXISTS public.scraping_configs CASCADE;

-- 2. Clean up any policies associated with scraping_configs (if any remain)
-- (Dropping the table with CASCADE automatically removes RLS policies and table triggers)

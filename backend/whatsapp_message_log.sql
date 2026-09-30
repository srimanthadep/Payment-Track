-- WhatsApp Message Log: Audit trail for outbound WhatsApp messages
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id SERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    action TEXT NOT NULL,          -- 'welcome' | 'receipt'
    message TEXT,
    status TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
    error TEXT,
    customer_id TEXT,
    customer_name TEXT,
    transaction_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_log_created ON whatsapp_message_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_log_user ON whatsapp_message_log(user_id);

-- RLS Policies
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own whatsapp logs"
    ON whatsapp_message_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert whatsapp logs"
    ON whatsapp_message_log FOR INSERT
    WITH CHECK (true);

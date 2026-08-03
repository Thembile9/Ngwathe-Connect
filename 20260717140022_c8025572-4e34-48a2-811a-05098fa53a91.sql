
CREATE TABLE public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  wa_id TEXT,
  profile_name TEXT,
  state TEXT NOT NULL DEFAULT 'idle',
  language TEXT NOT NULL DEFAULT 'en',
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER whatsapp_sessions_updated_at BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  wa_message_id TEXT,
  message_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wa_messages_phone ON public.whatsapp_messages(phone_number, created_at DESC);
CREATE INDEX idx_wa_messages_session ON public.whatsapp_messages(session_id, created_at DESC);

ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS wa_phone_number TEXT;
CREATE INDEX IF NOT EXISTS idx_complaints_wa_phone ON public.complaints(wa_phone_number);

-- ============================================================
-- STORE VISIT MANAGER — Schema Supabase
-- Esegui questo script in: Supabase → SQL Editor → New query
-- ============================================================

-- ── 1. PROFILI UTENTI ──────────────────────────────────────
-- Estende la tabella auth.users di Supabase con nome e ruolo

CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  email     TEXT,
  ruolo     TEXT NOT NULL DEFAULT 'user' CHECK (ruolo IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crea profilo automaticamente al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, ruolo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'ruolo', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. STORE ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  sede       TEXT,
  attivo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ATTIVITÀ ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo      TEXT NOT NULL,
  descrizione TEXT,
  attiva      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. VISITE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id       UUID NOT NULL REFERENCES public.stores(id),
  start_time     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time       TIMESTAMPTZ,
  note_generali  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visits_user_id_idx ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS visits_store_id_idx ON public.visits(store_id);
CREATE INDEX IF NOT EXISTS visits_start_time_idx ON public.visits(start_time DESC);

-- ── 5. ATTIVITÀ VISITA ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visit_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id),
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS va_visit_id_idx ON public.visit_activities(visit_id);

-- ── 6. ALLEGATI ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.attachments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_activity_id UUID NOT NULL REFERENCES public.visit_activities(id) ON DELETE CASCADE,
  file_url          TEXT NOT NULL,
  file_path         TEXT NOT NULL,   -- path nello storage Supabase
  file_name         TEXT NOT NULL,
  file_type         TEXT,            -- MIME type (es. image/jpeg)
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS att_va_id_idx ON public.attachments(visit_activity_id);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments     ENABLE ROW LEVEL SECURITY;

-- Helper function: verifica se l'utente corrente è admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND ruolo = 'admin'
  );
$$;

-- ── PROFILES ──

-- Ogni utente vede il proprio profilo; admin vede tutti
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

-- Ogni utente può aggiornare il proprio; admin aggiorna tutti
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR is_admin());

-- Solo admin può inserire profili (o il trigger automatico)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR is_admin());

-- ── STORES ──

-- Tutti gli utenti autenticati leggono gli store attivi; admin legge tutti
CREATE POLICY "stores_select" ON public.stores
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (attivo = TRUE OR is_admin())
  );

-- Solo admin può modificare store
CREATE POLICY "stores_insert" ON public.stores
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "stores_update" ON public.stores
  FOR UPDATE USING (is_admin());

-- ── ACTIVITIES ──

CREATE POLICY "activities_select" ON public.activities
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (attiva = TRUE OR is_admin())
  );

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "activities_update" ON public.activities
  FOR UPDATE USING (is_admin());

-- ── VISITS ──

-- Utente vede solo le proprie; admin vede tutte
CREATE POLICY "visits_select" ON public.visits
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- Utente inserisce solo le proprie
CREATE POLICY "visits_insert" ON public.visits
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Utente aggiorna solo le proprie (es. note_generali, end_time)
CREATE POLICY "visits_update" ON public.visits
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- ── VISIT_ACTIVITIES ──

-- Accesso tramite join con visits (proprietà implicita)
CREATE POLICY "va_select" ON public.visit_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND (v.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "va_insert" ON public.visit_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "va_update" ON public.visit_activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND (v.user_id = auth.uid() OR is_admin())
    )
  );

-- ── ATTACHMENTS ──

CREATE POLICY "att_select" ON public.attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.visit_activities va
      JOIN public.visits v ON v.id = va.visit_id
      WHERE va.id = visit_activity_id AND (v.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "att_insert" ON public.attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visit_activities va
      JOIN public.visits v ON v.id = va.visit_id
      WHERE va.id = visit_activity_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "att_delete" ON public.attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.visit_activities va
      JOIN public.visits v ON v.id = va.visit_id
      WHERE va.id = visit_activity_id AND (v.user_id = auth.uid() OR is_admin())
    )
  );

-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════
-- Esegui questo separatamente oppure crea il bucket dalla UI Supabase

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: upload solo per utenti autenticati
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');

-- Policy storage: lettura pubblica (URL condivisibili nel PDF)
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments');

-- Policy storage: elimina solo il proprietario o admin
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'attachments');

-- ═══════════════════════════════════════════════════════════
-- DATI INIZIALI DI ESEMPIO
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.activities (titolo, descrizione) VALUES
  ('Verifica espositori', 'Controllare che gli espositori siano integri e ben posizionati'),
  ('Check scorte', 'Verificare le scorte a magazzino e segnalare eventuali mancanze'),
  ('Aggiornamento prezzi', 'Verificare che i prezzi esposti siano aggiornati e corretti'),
  ('Pulizia area espositiva', 'Controllare la pulizia e l''ordine dell''area vendita'),
  ('Verifica materiali POP', 'Controllare la presenza e stato dei materiali promozionali'),
  ('Test dispositivi demo', 'Verificare il funzionamento di tutti i dispositivi in esposizione'),
  ('Feedback personale store', 'Raccogliere feedback dal personale di vendita'),
  ('Foto area espositiva', 'Scattare foto documentative dell''area espositiva')
ON CONFLICT DO NOTHING;

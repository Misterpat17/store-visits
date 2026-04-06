-- ============================================================
-- 1. Aggiungi colonna "area" alle attività e agli store
--    (se non esiste già)
-- ============================================================

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS ordine INTEGER DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS area TEXT;

-- ============================================================
-- 2. Aggiorna area e ordine nelle attività
-- ============================================================

UPDATE public.activities SET area = 'COMMERCIALE', ordine = 1 WHERE titolo ILIKE '%stock%rotazione%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 2 WHERE titolo ILIKE '%numero di sku%' OR titolo ILIKE '%congruenza%sku%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 3 WHERE titolo ILIKE '%offerta%griglia%competition%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 4 WHERE titolo ILIKE '%richiesta%store%prodotti non presenti%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 5 WHERE titolo ILIKE '%criterio espositivo%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 6 WHERE titolo ILIKE '%hit list%hero%core%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 7 WHERE titolo ILIKE '%visita della concorrenza%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 8 WHERE titolo ILIKE '%focus commerciale%';
UPDATE public.activities SET area = 'COMMERCIALE', ordine = 9 WHERE titolo ILIKE '%accessori%massificazione%';

UPDATE public.activities SET area = 'OBSOLETI', ordine = 10 WHERE titolo ILIKE '%lista obsoleti%';
UPDATE public.activities SET area = 'OBSOLETI', ordine = 11 WHERE titolo ILIKE '%prezzo%obsoleti%smaltimento%';
UPDATE public.activities SET area = 'OBSOLETI', ordine = 12 WHERE titolo ILIKE '%evidenza%grafica%obsoleti%';
UPDATE public.activities SET area = 'OBSOLETI', ordine = 13 WHERE titolo ILIKE '%trasferimento obsoleti%';

UPDATE public.activities SET area = 'ASSISTENZA', ordine = 14 WHERE titolo ILIKE '%procedura%assistenza%difetti%';

UPDATE public.activities SET area = 'FORMAZIONE', ordine = 15 WHERE titolo ILIKE '%formativo%novit%marginanti%';
UPDATE public.activities SET area = 'FORMAZIONE', ordine = 16 WHERE titolo ILIKE '%formativo%KPI%percorsi formativi%';

UPDATE public.activities SET area = 'VOLANTINO', ordine = 17 WHERE titolo ILIKE '%volantino%disponibili%esposti%';
UPDATE public.activities SET area = 'VOLANTINO', ordine = 18 WHERE titolo ILIKE '%volantino%massificati%';
UPDATE public.activities SET area = 'VOLANTINO', ordine = 19 WHERE titolo ILIKE '%alternativa%prodotto in promozione%';

UPDATE public.activities SET area = 'PROMOZIONE', ordine = 20 WHERE titolo ILIKE '%promo%ben visibili%' OR titolo ILIKE '%oggetto di promo%';
UPDATE public.activities SET area = 'PROMOZIONE', ordine = 21 WHERE titolo ILIKE '%aree promo%crosselling%';
UPDATE public.activities SET area = 'PROMOZIONE', ordine = 22 WHERE titolo ILIKE '%testate%lineare%adiacente%';
UPDATE public.activities SET area = 'PROMOZIONE', ordine = 23 WHERE titolo ILIKE '%testate%offerta promozionale%';
UPDATE public.activities SET area = 'PROMOZIONE', ordine = 24 WHERE titolo ILIKE '%ceste%offerta promozionale%';

UPDATE public.activities SET area = 'AREE ESPOSITIVE', ordine = 25 WHERE titolo ILIKE '%prodotti esposti%accesi%';
UPDATE public.activities SET area = 'AREE ESPOSITIVE', ordine = 26 WHERE titolo ILIKE '%aree esperienziali%' OR titolo ILIKE '%soundbar%';
UPDATE public.activities SET area = 'AREE ESPOSITIVE', ordine = 27 WHERE titolo ILIKE '%fornitore%perfect%';

UPDATE public.activities SET area = 'ANALISI PERFORMANCE', ordine = 28 WHERE titolo ILIKE '%andamento%settore%marchi%sottogruppi%';
UPDATE public.activities SET area = 'ANALISI PERFORMANCE', ordine = 29 WHERE titolo ILIKE '%peso%marchi%sottogruppi%';
UPDATE public.activities SET area = 'ANALISI PERFORMANCE', ordine = 30 WHERE titolo ILIKE '%prezzi medi%';
UPDATE public.activities SET area = 'ANALISI PERFORMANCE', ordine = 31 WHERE titolo ILIKE '%KPI qualitativi%accessori%servizi%';
UPDATE public.activities SET area = 'ANALISI PERFORMANCE', ordine = 32 WHERE titolo ILIKE '%KPI%singolo%RC%correttivi%';

-- ============================================================
-- 3. Aggiorna area negli store
-- ============================================================

UPDATE public.stores SET area = 'CATANIA' WHERE nome IN ('CT CATANIA','MI MISTERB.','CE CENTROSIC.','ZA ZAGARE','GR GRAVINA');
UPDATE public.stores SET area = 'CENTRO' WHERE nome IN ('EN ENNA','CL CALTANISS.','CF CASTROFIL.','CG CALTAGIRONE','LI LICATA','AG AGRIGENTO','VA VA');
UPDATE public.stores SET area = 'RAGUSA/SIRACUSA' WHERE nome IN ('MO MODICA','RG RAGUSA','AV AVOLA','MS MELILLI');
UPDATE public.stores SET area = 'PALERMO' WHERE nome IN ('CS CASTELVET.','PA PALERMO','TR TRAPANI','VP VILLABATE','CP CP');
UPDATE public.stores SET area = 'MESSINA' WHERE nome IN ('ME MESSINA','ML MILAZZO');
UPDATE public.stores SET area = 'CALABRIA' WHERE nome IN ('GT GIOIA TAURO','SD SIDERNO','VV VIBO VALENTIA');
UPDATE public.stores SET area = 'UDINE' WHERE nome IN ('UD UD');
UPDATE public.stores SET area = 'VENETO' WHERE nome IN ('VI VICENZA','VM MIRA (VE)','PD PADOVA','VR VERONA','TV TREVISO');
UPDATE public.stores SET area = 'LOMBARDIA' WHERE nome IN ('LC LECCO','MN MANTOVA','MM MM','LO LODI');

-- ============================================================
-- 4. Aggiungi colonna deleted_at per il cestino visite
-- ============================================================

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Policy RLS: admin può aggiornare deleted_at
-- (già coperta dalla policy visits_update esistente)


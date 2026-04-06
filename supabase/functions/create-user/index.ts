// supabase/functions/create-user/index.ts
// Edge Function per creare utenti come admin (usa service_role key)
// Deploy: supabase functions deploy create-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verifica che il chiamante sia admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verifica ruolo del chiamante
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ruolo")
      .eq("id", user.id)
      .single();

    if (profile?.ruolo !== "admin") throw new Error("Forbidden: admin only");

    // Crea il nuovo utente
    const { nome, email, password, ruolo } = await req.json();

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, ruolo: ruolo || "user" },
    });

    if (createErr) throw createErr;

    // Upsert profilo
    await supabaseAdmin.from("profiles").upsert({
      id: newUser.user.id,
      nome,
      email,
      ruolo: ruolo || "user",
    });

    return new Response(
      JSON.stringify({ user: newUser.user }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

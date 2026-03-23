import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const email = "superadmin@maringaai.com.br";
  const password = "#Teste_123";

  // Check if user already exists in super_admins
  const { data: existing } = await supabase
    .from("super_admins")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ message: "Super admin already exists" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert into super_admins
  const { error: insertError } = await supabase.from("super_admins").insert({
    auth_user_id: authData.user.id,
    email,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "Super admin created", user_id: authData.user.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

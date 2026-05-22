import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: verify caller is operator_admin or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller role
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (callerRole?.role !== "operator_admin" && callerRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: requires operator_admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, displayName, staffRoleId, operatorId } = await req.json();

    if (!email || !password || !staffRoleId || !operatorId) {
      return new Response(
        JSON.stringify({ error: "email, password, staffRoleId и operatorId обязательны" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller belongs to this operator (unless super admin)
    if (callerRole.role === "operator_admin") {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles").select("operator_id").eq("user_id", caller.id).maybeSingle();
      if (callerProfile?.operator_id !== operatorId) {
        return new Response(JSON.stringify({ error: "Forbidden: wrong operator" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Verify the staff role exists and belongs to the operator
    const { data: role, error: roleError } = await supabaseAdmin
      .from("staff_roles")
      .select("id")
      .eq("id", staffRoleId)
      .eq("operator_id", operatorId)
      .single();

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: "Роль не найдена или не принадлежит оператору" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create auth user with operator_id in metadata.
    // (Variable named `createError` so it does not shadow the earlier
    // `authError` from `auth.getUser()` — Deno rejects redeclarations and
    // crashes the function at boot.)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { operator_id: operatorId },
    });

    if (createError) {
      const message = createError.message.includes("already been registered")
        ? "Пользователь с таким email уже существует"
        : createError.message;
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 2. Assign 'staff' role in user_roles
    const { error: userRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "staff" });

    if (userRoleError) {
      console.error("Error assigning staff role:", userRoleError);
      // Cleanup: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Не удалось назначить роль" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create staff_members record
    const { error: memberError } = await supabaseAdmin
      .from("staff_members")
      .insert({
        user_id: userId,
        operator_id: operatorId,
        staff_role_id: staffRoleId,
        display_name: displayName || email,
        is_active: true,
      });

    if (memberError) {
      console.error("Error creating staff member:", memberError);
      // Cleanup
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Не удалось создать сотрудника" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Сотрудник создан",
        userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

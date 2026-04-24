import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requester's identity
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !requester) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { action, userData, unidadeId: targetUnidadeId } = body;

    if (!targetUnidadeId) {
      throw new Error("unidadeId is required");
    }

    // Security Check: Is the requester an admin of this unit or a super_admin?
    const { data: requesterRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id)
      .or(`and(unidade_id.eq.${targetUnidadeId},role.eq.admin),role.eq.super_admin`);

    if (!requesterRoles || requesterRoles.length === 0) {
      throw new Error("Forbidden: Only unit admins can manage users.");
    }

    if (action === "invite") {
      const { email, role, nome_completo } = userData;

      if (!email || !role || !nome_completo) {
        throw new Error("Missing required fields for invitation");
      }

      // 1. Check if user already exists in profiles
      const { data: existingUser } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", email) // Note: profiles might not have email, check auth
        .maybeSingle();

      // Check auth directly
      const { data: { users: authUsers } } = await supabaseClient.auth.admin.listUsers();
      const userExists = authUsers.find(u => u.email === email);

      if (userExists) {
        throw new Error("User with this email already exists");
      }

      // 2. Create invitation record
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { data: invitation, error: inviteError } = await supabaseClient
        .from("invitations")
        .insert({
          unidade_id: targetUnidadeId,
          email,
          role,
          token,
          invited_by: requester.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // In a real app, we would send the email here.
      // For now, we return the token/link so the UI can show it (or we can use a mock email service).
      // If transactional emails were set up, we'd use them.

      return new Response(JSON.stringify({ invitation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "accept-invitation") {
      const { token, password, nome_completo, telefone } = body;

      if (!token || !password || !nome_completo) {
        throw new Error("Missing required fields to accept invitation");
      }

      // 1. Validate invitation
      const { data: invitation, error: tokenError } = await supabaseClient
        .from("invitations")
        .select("*")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !invitation) {
        throw new Error("Invitation invalid or expired");
      }

      // 2. Create user in auth
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { nome_completo }
      });

      if (createError) throw createError;

      // 3. Create profile
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert({
          id: newUser.user.id,
          unidade_id: invitation.unidade_id,
          nome_completo,
          telefone,
          ativo: true
        });

      if (profileError) {
        await supabaseClient.auth.admin.deleteUser(newUser.user.id);
        throw profileError;
      }

      // 4. Assign role
      const { error: roleError } = await supabaseClient
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          unidade_id: invitation.unidade_id,
          role: invitation.role
        });

      if (roleError) {
        await supabaseClient.from("profiles").delete().eq("id", newUser.user.id);
        await supabaseClient.auth.admin.deleteUser(newUser.user.id);
        throw roleError;
      }

      // 5. Mark invitation as accepted
      await supabaseClient
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "create") {
      // Keep existing create logic but maybe we should disable it later
      // ... same as before

      const { userId } = body;

      if (!userId) throw new Error("userId is required for deletion");

      if (userId === requester.id) {
        throw new Error("Cannot delete yourself");
      }

      // Verify the user being deleted belongs to the same unit (unless requester is super_admin)
      const isSuperAdmin = requesterRoles.some(r => r.role === 'super_admin');
      
      const { data: userProfile } = await supabaseClient
        .from("profiles")
        .select("unidade_id")
        .eq("id", userId)
        .single();

      if (!userProfile) {
        throw new Error("User profile not found");
      }

      if (!isSuperAdmin && userProfile.unidade_id !== targetUnidadeId) {
        throw new Error("User does not belong to your unit");
      }

      // Delete user_roles first (FK)
      await supabaseClient.from("user_roles").delete().eq("user_id", userId);
      
      // Delete profile
      await supabaseClient.from("profiles").delete().eq("id", userId);

      // Delete auth user
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "update") {
      const { userId, updates } = body;
      
      if (!userId || !updates) throw new Error("userId and updates are required");

      const isSuperAdmin = requesterRoles.some(r => r.role === 'super_admin');

      // Verify user belongs to unit
      const { data: userProfile } = await supabaseClient
        .from("profiles")
        .select("unidade_id")
        .eq("id", userId)
        .single();

      if (!userProfile) throw new Error("User profile not found");

      if (!isSuperAdmin && userProfile.unidade_id !== targetUnidadeId) {
        throw new Error("User does not belong to your unit");
      }

      // Update profile
      const profileUpdates: any = {};
      if (updates.nome_completo !== undefined) profileUpdates.nome_completo = updates.nome_completo;
      if (updates.telefone !== undefined) profileUpdates.telefone = updates.telefone;
      if (updates.ativo !== undefined) profileUpdates.ativo = updates.ativo;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update(profileUpdates)
          .eq("id", userId);

        if (updateError) throw updateError;
      }

      // Update email if provided
      if (updates.email) {
        const { error: authUpdateError } = await supabaseClient.auth.admin.updateUserById(userId, {
          email: updates.email
        });
        if (authUpdateError) throw authUpdateError;
      }

      // Update role if provided
      if (updates.role) {
        // Delete old roles in this unit
        await supabaseClient.from("user_roles").delete().eq("user_id", userId).eq("unidade_id", targetUnidadeId);
        // Insert new role
        const { error: roleUpdateError } = await supabaseClient
          .from("user_roles")
          .insert({
            user_id: userId,
            unidade_id: targetUnidadeId,
            role: updates.role
          });
        if (roleUpdateError) throw roleUpdateError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");

  } catch (error: any) {
    console.error("Error in manage-clinic-users:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

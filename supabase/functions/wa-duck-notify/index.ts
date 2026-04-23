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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Erro ao parsear o JSON do request:", e.message);
      throw new Error("Invalid JSON body");
    }
    const { senha_id, tipo = "criacao", mesa_nome, telefone: testTelefone, mensagem: testMensagem, unidade_id: testUnidadeId, config: testConfig } = body;
    
    if (tipo !== "teste" && !senha_id) {
      throw new Error("senha_id is required for non-test types");
    }

    let telefone = "";
    let mensagem = "";
    let config: any = {};
    let finalUnidadeId = null;

    if (tipo === "teste") {
      console.log(`Processando notificação de TESTE para telefone: ${testTelefone}`);
      telefone = testTelefone;
      mensagem = testMensagem || "Este é um teste de configuração da API WADuck.";
      config = testConfig;
      finalUnidadeId = testUnidadeId;

      if (!config && testUnidadeId) {
        const { data: unidade } = await supabaseClient
          .from("unidades")
          .select("whatsapp_config")
          .eq("id", testUnidadeId)
          .single();
        config = unidade?.whatsapp_config || {};
      }
      
      if (!telefone) throw new Error("telefone is required for test");
      if (!config?.api_url || !config?.api_key || !config?.instance_id) {
        throw new Error("WADuck API não configurada corretamente para o teste.");
      }
    } else {
      console.log(`Processando notificação (${tipo}) para senha_id: ${senha_id}`);

      // 1. Busca dados da senha, paciente, fila e unidade
      const { data: senha, error: senhaError } = await supabaseClient
        .from("senhas")
        .select(`
          *,
          paciente:pacientes(nome_completo, telefone),
          fila:filas(nome, prefixo_senha, tempo_espera_estimado),
          unidade:unidades(id, nome, whatsapp_config)
        `)
        .eq("id", senha_id)
        .single();

      if (senhaError || !senha) {
        throw new Error("Senha não encontrada: " + (senhaError?.message || "Registro inexistente"));
      }

      const { paciente, fila, unidade } = senha;
      finalUnidadeId = unidade.id;

      if (!paciente?.telefone) {
        console.log(`Paciente ${paciente?.nome_completo} não possui telefone. Ignorando.`);
        return new Response(JSON.stringify({ status: "ignored", reason: "no_phone" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      config = (unidade.whatsapp_config as any) || {};
      telefone = paciente.telefone;

      if (tipo === "chamada") {
        const template = config.template_chamada || "Olá {{nome}}, sua senha {{senha}} foi chamada agora — dirija-se ao {{local}}.";
        mensagem = template
          .replace("{{nome}}", paciente.nome_completo)
          .replace("{{senha}}", senha.codigo)
          .replace("{{local}}", mesa_nome || "atendimento");
      } else {
        // 2. Calcula tempo estimado
        const { count } = await supabaseClient
          .from("senhas")
          .select("*", { count: "exact", head: true })
          .eq("fila_id", senha.fila_id)
          .eq("status", "aguardando")
          .lt("created_at", senha.created_at);

        const pessoas_na_frente = count || 0;
        const tempo_por_pessoa = fila.tempo_espera_estimado || 10;
        const tempo_total = (pessoas_na_frente + 1) * tempo_por_pessoa;

        const publicUrl = `https://filamed.lovable.app/s/${senha.token_publico}`;
        mensagem = `Olá *${paciente.nome_completo}*, sua senha no *${unidade.nome}* foi gerada com sucesso!

🎫 Senha: *${senha.codigo}*
🕒 Tempo estimado de espera: *${tempo_total} minutos*
👥 Pessoas na sua frente: *${pessoas_na_frente}*

Você pode acompanhar o status da sua senha em tempo real pelo link:
${publicUrl}

Avisaremos você quando for a sua vez!`;
      }
    }

    const api_url = config.api_url || Deno.env.get("WADUCK_API_URL");
    const api_key = config.api_key || Deno.env.get("WADUCK_API_KEY");
    const instance_id = config.instance_id || Deno.env.get("WADUCK_INSTANCE_ID");

    if (!api_url || !api_key) {
      throw new Error("WADuck API não configurada.");
    }

    let mensagem = "";

    if (tipo === "chamada") {
      const template = config.template_chamada || "Olá {{nome}}, sua senha {{senha}} foi chamada agora — dirija-se ao {{local}}.";
      mensagem = template
        .replace("{{nome}}", paciente.nome_completo)
        .replace("{{senha}}", senha.codigo)
        .replace("{{local}}", mesa_nome || "atendimento");
    } else {
      // 2. Calcula tempo estimado
      const { count } = await supabaseClient
        .from("senhas")
        .select("*", { count: "exact", head: true })
        .eq("fila_id", senha.fila_id)
        .eq("status", "aguardando")
        .lt("created_at", senha.created_at);

      const pessoas_na_frente = count || 0;
      const tempo_por_pessoa = fila.tempo_espera_estimado || 10;
      const tempo_total = (pessoas_na_frente + 1) * tempo_por_pessoa;

      const publicUrl = `https://filamed.lovable.app/s/${senha.token_publico}`;
      mensagem = `Olá *${paciente.nome_completo}*, sua senha no *${unidade.nome}* foi gerada com sucesso!

🎫 Senha: *${senha.codigo}*
🕒 Tempo estimado de espera: *${tempo_total} minutos*
👥 Pessoas na sua frente: *${pessoas_na_frente}*

Você pode acompanhar o status da sua senha em tempo real pelo link:
${publicUrl}

Avisaremos você quando for a sua vez!`;
    }

    // 4. Envia para o WADuck
    const endpoint = api_url.endsWith("/") ? api_url : `${api_url}/`;
    const fullUrl = `${endpoint}message/sendText/${instance_id}`;
    
    // Formata o telefone: remove tudo que não for dígito e adiciona 55 se necessário
    let telefone = paciente.telefone.replace(/\D/g, "");
    if (telefone.length <= 11 && !telefone.startsWith("55")) {
      telefone = "55" + telefone;
    }

    const bodyData = {
      number: telefone,
      text: mensagem,
      // Compatibility for newer Evolution API versions
      textMessage: {
        text: mensagem
      },
      options: {
        delay: 0,
        presence: "composing",
        linkPreview: false
      }
    };

    console.log(`Enviando WhatsApp para ${telefone} via ${fullUrl}`);
    console.log(`Payload: ${JSON.stringify(bodyData)}`);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": api_key,
      },
      body: JSON.stringify(bodyData),
    });

    const responseText = await response.text();
    console.log(`WADuck Response Status: ${response.status}`);
    console.log(`WADuck Response Text: ${responseText}`);

    let responseData = {};
    try {
      if (responseText) {
        responseData = JSON.parse(responseText);
      }
    } catch (e) {
      console.warn("Erro ao parsear resposta do WADuck:", e.message);
    }

    // 5. Loga a notificação
    const { error: logError } = await supabaseClient.from("notificacoes_log").insert({
      unidade_id: senha.unidade_id,
      senha_id: senha.id,
      canal: "whatsapp",
      destinatario: telefone,
      status: response.ok ? "enviada" : "falhou",
      mensagem: mensagem,
      erro: response.ok ? null : (responseText || "Erro desconhecido"),
    });

    if (logError) {
      console.error("Erro ao inserir log de notificação:", logError.message);
    }

    return new Response(JSON.stringify({ success: response.ok, data: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
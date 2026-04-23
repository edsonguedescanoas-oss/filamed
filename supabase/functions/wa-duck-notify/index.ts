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
    let finalSenhaId = null;

    if (tipo === "teste") {
      console.log(`Processando notificação de TESTE para telefone: ${testTelefone}`);
      telefone = testTelefone;
      mensagem = testMensagem || "Este é um teste de configuração da API WADuck.";
      config = testConfig;
      finalUnidadeId = testUnidadeId;

      if ((!config || !config.api_url) && testUnidadeId) {
        const { data: unidade } = await supabaseClient
          .from("unidades")
          .select("whatsapp_config")
          .eq("id", testUnidadeId)
          .single();
        config = unidade?.whatsapp_config || {};
      }
      
      if (!telefone) throw new Error("telefone is required for test");
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
      finalSenhaId = senha.id;

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
        const localFormatado = [fila.nome, mesa_nome].filter(Boolean).join(", ");
        mensagem = template
          .replace("{{nome}}", paciente.nome_completo)
          .replace("{{senha}}", senha.codigo)
          .replace("{{local}}", localFormatado || "atendimento");
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

    // Normalização do telefone para verificação e envio
    let formattedTelefone = telefone.replace(/\D/g, "");
    if (formattedTelefone.length <= 11 && !formattedTelefone.startsWith("55")) {
      formattedTelefone = "55" + formattedTelefone;
    }

    // 2. Verificação de duplicidade para chamadas (mesma senha, mesmo local, mesmo destinatário)
    if (tipo === "chamada" && finalSenhaId) {
      const { data: existingLog } = await supabaseClient
        .from("notificacoes_log")
        .select("id")
        .eq("senha_id", finalSenhaId)
        .eq("destinatario", formattedTelefone)
        .eq("status", "enviada")
        .eq("mensagem", mensagem)
        .limit(1)
        .maybeSingle();

      if (existingLog) {
        console.log(`Notificação de chamada já enviada para senha_id ${finalSenhaId} com esta mensagem. Ignorando duplicata.`);
        return new Response(JSON.stringify({ 
          success: true, 
          status: "ignored", 
          reason: "duplicate",
          message: "Notificação de chamada já enviada anteriormente para este local." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    let api_url = config.api_url || Deno.env.get("WADUCK_API_URL") || "";

    const api_key = config.api_key || Deno.env.get("WADUCK_API_KEY");
    const instance_id = config.instance_id || Deno.env.get("WADUCK_INSTANCE_ID");

    if (!api_url || !api_key || !instance_id) {
      throw new Error("WADuck API não configurada corretamente.");
    }

    // Normalização da URL: Se for WADuck e não tiver /v1, adiciona
    if (api_url.includes("waduck.pro") && !api_url.includes("/v1")) {
      api_url = api_url.endsWith("/") ? `${api_url}v1` : `${api_url}/v1`;
    }

    // 4. Envia para o WADuck
    const endpoint = api_url.endsWith("/") ? api_url : `${api_url}/`;
    const fullUrl = `${endpoint}message/sendText/${instance_id}`;
    
    // Formata o telefone: remove tudo que não for dígito e adiciona 55 se necessário
    let formattedTelefone = telefone.replace(/\D/g, "");
    if (formattedTelefone.length <= 11 && !formattedTelefone.startsWith("55")) {
      formattedTelefone = "55" + formattedTelefone;
    }

    const bodyData = {
      number: formattedTelefone,
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

    console.log(`Enviando WhatsApp para ${formattedTelefone} via ${fullUrl}`);
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

    // 5. Loga a notificação (apenas se tivermos uma unidade)
    if (finalUnidadeId) {
      const { error: logError } = await supabaseClient.from("notificacoes_log").insert({
        unidade_id: finalUnidadeId,
        senha_id: finalSenhaId,
        canal: "whatsapp",
        destinatario: formattedTelefone,
        status: response.ok ? "enviada" : "falhou",
        mensagem: mensagem,
        erro: response.ok ? null : (responseText || "Erro desconhecido"),
      });

      if (logError) {
        console.error("Erro ao inserir log de notificação:", logError.message);
      }
    }

    return new Response(JSON.stringify({ success: response.ok, data: responseData, error: response.ok ? null : responseText }), {
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
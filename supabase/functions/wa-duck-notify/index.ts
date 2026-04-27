import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const handler = async (req: Request) => {
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
    } catch (e: any) {
      console.error("Erro ao parsear o JSON do request:", e.message);
      throw new Error("Invalid JSON body");
    }
    const { 
      senha_id, 
      tipo = "criacao", 
      mesa_nome, 
      telefone: testTelefone, 
      mensagem: testMensagem, 
      unidade_id: testUnidadeId, 
      config: testConfig,
      idempotency_key 
    } = body;
    
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
          unidade:unidades(id, nome, whatsapp_config, google_review_url)
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
        
        if (finalUnidadeId) {
          await supabaseClient.from("notificacoes_log").insert({
            unidade_id: finalUnidadeId,
            senha_id: finalSenhaId,
            canal: "whatsapp",
            destinatario: "N/A",
            status: "ignorado",
            mensagem: mensagem || "(Vazia)",
            erro: "Paciente sem telefone cadastrado",
          });
        }

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
      } else if (tipo === "encaminhamento") {
        const publicUrl = `https://filamed.lovable.app/s/${senha.token_publico}`;
        mensagem = `Olá *${paciente.nome_completo}*, sua senha foi atualizada no *${unidade.nome}*.

🎫 Nova senha: *${senha.codigo}*
📍 Fila: *${fila.nome}*

Acompanhe em tempo real pelo mesmo link:
${publicUrl}`;
      } else if (tipo === "finalizacao") {
        const reviewUrl = unidade.google_review_url;
        const template = config.template_finalizacao || "Olá {{nome}}, seu atendimento no {{unidade}} foi finalizado. Obrigado pela visita!";
        mensagem = template
          .replace("{{nome}}", paciente.nome_completo)
          .replace("{{unidade}}", unidade.nome);
        if (reviewUrl) {
          // Utiliza markdown para simular um hiperlink (embora o WhatsApp exiba o texto e o link separadamente,
          // o texto "Avalie agora" chama a atenção para o link logo abaixo).
          mensagem += `\n\n⭐ *Avalie agora:* ${reviewUrl}`;
        }
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

    // 2. Trava Atômica e Idempotência por (paciente/senha/local)
    const lockKey = `lock_wa_${finalSenhaId}_${tipo}_${mesa_nome || 'unidade'}`;
    const generatedIdempotencyKey = idempotency_key || `idemp_${finalSenhaId}_${tipo}_${mesa_nome || 'unidade'}_${Date.now()}`;
    
    // Tenta adquirir a trava atômica (válida por 60 segundos)
    const { data: lockAcquired, error: lockError } = await supabaseClient
      .from("atomic_locks")
      .insert({ 
        key: lockKey, 
        expires_at: new Date(Date.now() + 60000).toISOString() 
      })
      .select();

    if (lockError && lockError.code === '23505') { // Unique constraint violation
      // Verifica se o bloqueio ainda é válido ou se já foi concluído
      const { data: currentLock } = await supabaseClient
        .from("atomic_locks")
        .select("expires_at")
        .eq("key", lockKey)
        .single();
      
      if (currentLock && new Date(currentLock.expires_at) > new Date()) {
        console.log(`Bloqueio atômico ativo para ${lockKey}. Ignorando solicitação duplicada em processamento.`);
        return new Response(JSON.stringify({ 
          success: true, 
          status: "ignored", 
          reason: "locked",
          message: "Esta notificação está sendo processada por outra instância." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Bloqueio expirado, remove e tenta novamente (raro devido ao cleanup)
        await supabaseClient.from("atomic_locks").delete().eq("key", lockKey);
      }
    }

    // Verificação de log existente para garantir idempotência permanente
    const permanentIdempotencyKey = idempotency_key || `msg_${finalSenhaId}_${tipo}_${mesa_nome || 'unidade'}`;
    const { data: existingLog } = await supabaseClient
      .from("notificacoes_log")
      .select("id, status")
      .eq("idempotency_key", permanentIdempotencyKey)
      .eq("status", "enviada")
      .maybeSingle();

    if (existingLog) {
      console.log(`Notificação já enviada anteriormente (idempotency: ${permanentIdempotencyKey}). Ignorando.`);
      // Libera a trava antes de retornar
      await supabaseClient.from("atomic_locks").delete().eq("key", lockKey);
      
      return new Response(JSON.stringify({ 
        success: true, 
        status: "ignored", 
        reason: "idempotency",
        message: "Esta notificação já foi enviada com sucesso." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const currentIdempotencyKey = idempotency_key || permanentIdempotencyKey;


    // Normalização do telefone para verificação e envio
    let formattedTelefone = telefone.replace(/\D/g, "");
    if (formattedTelefone.length <= 11 && !formattedTelefone.startsWith("55")) {
      formattedTelefone = "55" + formattedTelefone;
    }

    let response: Response | null = null;
    let responseText = "";
    let responseData = {};

    try {
      let api_url = config.api_url || Deno.env.get("WADUCK_API_URL") || "";
      const api_key = config.api_key || Deno.env.get("WADUCK_API_KEY");
      const instance_id = config.instance_id || Deno.env.get("WADUCK_INSTANCE_ID");

      if (!api_url || !api_key || !instance_id) {
        throw new Error("WADuck API não configurada corretamente.");
      }

      // Normalização da URL
      if (api_url.includes("waduck.pro") && !api_url.includes("/v1")) {
        api_url = api_url.endsWith("/") ? `${api_url}v1` : `${api_url}/v1`;
      }

      const endpoint = api_url.endsWith("/") ? api_url : `${api_url}/`;
      const fullUrl = `${endpoint}message/sendText/${instance_id}`;
      
      const bodyData = {
        number: formattedTelefone,
        text: mensagem,
        textMessage: { text: mensagem },
        // Desabilita pré-visualização de link em todas as variantes aceitas
        // pelas APIs WADuck/Evolution (v1 e v2).
        linkPreview: false,
        previewUrl: false,
        options: {
          delay: 0,
          presence: "composing",
          linkPreview: false,
          previewUrl: false,
        },
      };

      console.log(`Enviando WhatsApp para ${formattedTelefone} via ${fullUrl}`);

      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          response = await fetch(fullUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": api_key },
            body: JSON.stringify(bodyData),
          });

          responseText = await response.text();
          if (response.ok) break;
        } catch (e: any) {
          responseText = e.message;
        }

        retries++;
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retries * 2000));
        }
      }

      if (!response) throw new Error("Não foi possível obter resposta da API após retries: " + responseText);

      try {
        if (responseText && responseText.trim().startsWith("{")) {
          responseData = JSON.parse(responseText);
        }
      } catch (e: any) {
        console.warn("Erro ao parsear resposta do WADuck:", e.message);
      }

    } finally {
      // Libera a trava atômica
      await supabaseClient.from("atomic_locks").delete().eq("key", lockKey);
    }


    // 5. Loga a notificação (apenas se tivermos uma unidade)
    if (finalUnidadeId) {
      const logData: any = {
        unidade_id: finalUnidadeId,
        senha_id: finalSenhaId,
        canal: "whatsapp",
        destinatario: formattedTelefone,
        status: response?.ok ? "enviada" : "falhou",
        mensagem: mensagem,
        erro: response?.ok ? null : (responseText || "Erro desconhecido"),
        idempotency_key: currentIdempotencyKey,
      };

      // Se temos idempotency_key, usamos upsert para não duplicar logs de reenvio
      const { error: logError } = await supabaseClient
        .from("notificacoes_log")
        .upsert(logData, { onConflict: 'idempotency_key' });

      if (logError) {
        console.error("Erro ao inserir/atualizar log de notificação:", logError.message);
      }
    }

    return new Response(JSON.stringify({ success: response?.ok, data: responseData, error: response?.ok ? null : responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
};

serve(handler);
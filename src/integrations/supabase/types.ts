export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          cancelada_em: string | null
          cancelar_no_fim_do_ciclo: boolean
          ciclo: Database["public"]["Enums"]["assinatura_ciclo"]
          created_at: string
          gateway: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          id: string
          inicio_em: string
          metadata: Json
          plano_id: string
          proximo_ciclo_em: string | null
          status: Database["public"]["Enums"]["assinatura_estado"]
          unidade_id: string
          updated_at: string
        }
        Insert: {
          cancelada_em?: string | null
          cancelar_no_fim_do_ciclo?: boolean
          ciclo?: Database["public"]["Enums"]["assinatura_ciclo"]
          created_at?: string
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          inicio_em?: string
          metadata?: Json
          plano_id: string
          proximo_ciclo_em?: string | null
          status?: Database["public"]["Enums"]["assinatura_estado"]
          unidade_id: string
          updated_at?: string
        }
        Update: {
          cancelada_em?: string | null
          cancelar_no_fim_do_ciclo?: boolean
          ciclo?: Database["public"]["Enums"]["assinatura_ciclo"]
          created_at?: string
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          inicio_em?: string
          metadata?: Json
          plano_id?: string
          proximo_ciclo_em?: string | null
          status?: Database["public"]["Enums"]["assinatura_estado"]
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: true
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          created_at: string
          duracao_segundos: number | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          observacoes: string | null
          paciente_id: string | null
          profissional_id: string | null
          requer_retorno: boolean
          senha_id: string
          senha_retorno_id: string | null
          unidade_id: string
        }
        Insert: {
          created_at?: string
          duracao_segundos?: number | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          observacoes?: string | null
          paciente_id?: string | null
          profissional_id?: string | null
          requer_retorno?: boolean
          senha_id: string
          senha_retorno_id?: string | null
          unidade_id: string
        }
        Update: {
          created_at?: string
          duracao_segundos?: number | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          observacoes?: string | null
          paciente_id?: string | null
          profissional_id?: string | null
          requer_retorno?: boolean
          senha_id?: string
          senha_retorno_id?: string | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_senha_retorno_id_fkey"
            columns: ["senha_retorno_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      atomic_locks: {
        Row: {
          created_at: string | null
          expires_at: string
          key: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          key: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          key?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          ator_id: string | null
          ator_nome: string | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          resumo: string
          unidade_id: string | null
        }
        Insert: {
          acao: string
          ator_id?: string | null
          ator_nome?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          resumo: string
          unidade_id?: string | null
        }
        Update: {
          acao?: string
          ator_id?: string | null
          ator_nome?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          resumo?: string
          unidade_id?: string | null
        }
        Relationships: []
      }
      chamadas: {
        Row: {
          chamado_por: string | null
          created_at: string
          destino: string
          id: string
          idempotency_key: string | null
          observacao: string | null
          senha_id: string
          unidade_id: string
        }
        Insert: {
          chamado_por?: string | null
          created_at?: string
          destino: string
          id?: string
          idempotency_key?: string | null
          observacao?: string | null
          senha_id: string
          unidade_id: string
        }
        Update: {
          chamado_por?: string | null
          created_at?: string
          destino?: string
          id?: string
          idempotency_key?: string | null
          observacao?: string | null
          senha_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamadas_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamadas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          assinatura_id: string
          created_at: string
          gateway_invoice_id: string | null
          gateway_payment_id: string | null
          id: string
          linha_descricao: string
          metadata: Json
          metodo_pagamento: string | null
          moeda: string
          numero: string
          paga_em: string | null
          status: Database["public"]["Enums"]["fatura_status"]
          unidade_id: string
          updated_at: string
          url_recibo: string | null
          valor_centavos: number
          vencimento: string
        }
        Insert: {
          assinatura_id: string
          created_at?: string
          gateway_invoice_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          linha_descricao: string
          metadata?: Json
          metodo_pagamento?: string | null
          moeda?: string
          numero: string
          paga_em?: string | null
          status?: Database["public"]["Enums"]["fatura_status"]
          unidade_id: string
          updated_at?: string
          url_recibo?: string | null
          valor_centavos: number
          vencimento: string
        }
        Update: {
          assinatura_id?: string
          created_at?: string
          gateway_invoice_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          linha_descricao?: string
          metadata?: Json
          metodo_pagamento?: string | null
          moeda?: string
          numero?: string
          paga_em?: string | null
          status?: Database["public"]["Enums"]["fatura_status"]
          unidade_id?: string
          updated_at?: string
          url_recibo?: string | null
          valor_centavos?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturas_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      filas: {
        Row: {
          ativa: boolean
          contador_senha: number
          cor: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          prefixo_senha: string
          tempo_espera_estimado: number | null
          tipo: Database["public"]["Enums"]["fila_tipo"]
          unidade_id: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          contador_senha?: number
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          prefixo_senha: string
          tempo_espera_estimado?: number | null
          tipo: Database["public"]["Enums"]["fila_tipo"]
          unidade_id: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          contador_senha?: number
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          prefixo_senha?: string
          tempo_espera_estimado?: number | null
          tipo?: Database["public"]["Enums"]["fila_tipo"]
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      guiche_atendimentos: {
        Row: {
          atendido_por: string | null
          created_at: string
          fila_destino_id: string | null
          id: string
          observacoes: string | null
          ponto_atendimento_id: string | null
          senha_destino_id: string | null
          senha_id: string
          tipo: string
          unidade_id: string
        }
        Insert: {
          atendido_por?: string | null
          created_at?: string
          fila_destino_id?: string | null
          id?: string
          observacoes?: string | null
          ponto_atendimento_id?: string | null
          senha_destino_id?: string | null
          senha_id: string
          tipo?: string
          unidade_id: string
        }
        Update: {
          atendido_por?: string | null
          created_at?: string
          fila_destino_id?: string | null
          id?: string
          observacoes?: string | null
          ponto_atendimento_id?: string | null
          senha_destino_id?: string | null
          senha_id?: string
          tipo?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guiche_atendimentos_fila_destino_id_fkey"
            columns: ["fila_destino_id"]
            isOneToOne: false
            referencedRelation: "filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guiche_atendimentos_ponto_atendimento_id_fkey"
            columns: ["ponto_atendimento_id"]
            isOneToOne: false
            referencedRelation: "pontos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guiche_atendimentos_senha_destino_id_fkey"
            columns: ["senha_destino_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guiche_atendimentos_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guiche_atendimentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          unidade_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: string
          token: string
          unidade_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_log: {
        Row: {
          canal: Database["public"]["Enums"]["canal_notificacao"]
          created_at: string
          destinatario: string
          enviada_em: string | null
          erro: string | null
          id: string
          idempotency_key: string | null
          mensagem: string
          senha_id: string | null
          status: Database["public"]["Enums"]["notificacao_status"]
          tentativas: number | null
          unidade_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["canal_notificacao"]
          created_at?: string
          destinatario: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          idempotency_key?: string | null
          mensagem: string
          senha_id?: string | null
          status?: Database["public"]["Enums"]["notificacao_status"]
          tentativas?: number | null
          unidade_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_notificacao"]
          created_at?: string
          destinatario?: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          idempotency_key?: string | null
          mensagem?: string
          senha_id?: string | null
          status?: Database["public"]["Enums"]["notificacao_status"]
          tentativas?: number | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_log_senha_id_fkey"
            columns: ["senha_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_log_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          documento_url: string | null
          email: string | null
          id: string
          identificacao_numero: string | null
          identificacao_tipo: string | null
          nome_completo: string
          observacoes: string | null
          prontuario: string | null
          telefone: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          documento_url?: string | null
          email?: string | null
          id?: string
          identificacao_numero?: string | null
          identificacao_tipo?: string | null
          nome_completo: string
          observacoes?: string | null
          prontuario?: string | null
          telefone?: string | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          documento_url?: string | null
          email?: string | null
          id?: string
          identificacao_numero?: string | null
          identificacao_tipo?: string | null
          nome_completo?: string
          observacoes?: string | null
          prontuario?: string | null
          telefone?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          destaque: boolean
          gateway_price_id_anual: string | null
          gateway_price_id_anual_oneoff: string | null
          gateway_price_id_mensal: string | null
          id: string
          limite_atendentes: number | null
          limite_filas: number | null
          limite_senhas_mes: number | null
          limite_tvs: number | null
          moeda: string
          nome: string
          ordem: number
          preco_anual_centavos: number | null
          preco_mensal_centavos: number
          recursos: Json
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          gateway_price_id_anual?: string | null
          gateway_price_id_anual_oneoff?: string | null
          gateway_price_id_mensal?: string | null
          id?: string
          limite_atendentes?: number | null
          limite_filas?: number | null
          limite_senhas_mes?: number | null
          limite_tvs?: number | null
          moeda?: string
          nome: string
          ordem?: number
          preco_anual_centavos?: number | null
          preco_mensal_centavos: number
          recursos?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          gateway_price_id_anual?: string | null
          gateway_price_id_anual_oneoff?: string | null
          gateway_price_id_mensal?: string | null
          id?: string
          limite_atendentes?: number | null
          limite_filas?: number | null
          limite_senhas_mes?: number | null
          limite_tvs?: number | null
          moeda?: string
          nome?: string
          ordem?: number
          preco_anual_centavos?: number | null
          preco_mensal_centavos?: number
          recursos?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ponto_atendimento_permissoes: {
        Row: {
          created_at: string
          id: string
          ponto_atendimento_id: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ponto_atendimento_id: string
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ponto_atendimento_id?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_atendimento_permissoes_ponto_atendimento_id_fkey"
            columns: ["ponto_atendimento_id"]
            isOneToOne: false
            referencedRelation: "pontos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_atendimento_permissoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_atendimento_permissoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_atendimento: {
        Row: {
          ativo: boolean
          created_at: string
          fila_id: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["ponto_tipo"]
          unidade_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fila_id?: string | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["ponto_tipo"]
          unidade_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fila_id?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["ponto_tipo"]
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontos_atendimento_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_atendimento_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          id: string
          nome_completo: string
          ponto_atendimento_id: string | null
          telefone: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          id: string
          nome_completo: string
          ponto_atendimento_id?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome_completo?: string
          ponto_atendimento_id?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ponto_atendimento_id_fkey"
            columns: ["ponto_atendimento_id"]
            isOneToOne: false
            referencedRelation: "pontos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      senhas: {
        Row: {
          codigo: string
          created_at: string
          criado_por: string | null
          fila_id: string
          finalizada_em: string | null
          id: string
          origem: string | null
          paciente_id: string | null
          posicao: number | null
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          senha_origem_id: string | null
          status: Database["public"]["Enums"]["senha_status"]
          tempo_espera_estimado: number | null
          token_publico: string
          triagem_dados: Json | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          criado_por?: string | null
          fila_id: string
          finalizada_em?: string | null
          id?: string
          origem?: string | null
          paciente_id?: string | null
          posicao?: number | null
          prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          senha_origem_id?: string | null
          status?: Database["public"]["Enums"]["senha_status"]
          tempo_espera_estimado?: number | null
          token_publico?: string
          triagem_dados?: Json | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          criado_por?: string | null
          fila_id?: string
          finalizada_em?: string | null
          id?: string
          origem?: string | null
          paciente_id?: string | null
          posicao?: number | null
          prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          senha_origem_id?: string | null
          status?: Database["public"]["Enums"]["senha_status"]
          tempo_espera_estimado?: number | null
          token_publico?: string
          triagem_dados?: Json | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "senhas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "filas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_senha_origem_id_fkey"
            columns: ["senha_origem_id"]
            isOneToOne: false
            referencedRelation: "senhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      sinalizacao_digital: {
        Row: {
          ativo: boolean
          created_at: string
          duracao_segundos: number
          fim_exibicao: string | null
          id: string
          inicio_exibicao: string | null
          ordem: number
          tipo: string
          titulo: string
          unidade_id: string
          updated_at: string
          url_midia: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          duracao_segundos?: number
          fim_exibicao?: string | null
          id?: string
          inicio_exibicao?: string | null
          ordem?: number
          tipo?: string
          titulo: string
          unidade_id: string
          updated_at?: string
          url_midia?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          duracao_segundos?: number
          fim_exibicao?: string | null
          id?: string
          inicio_exibicao?: string | null
          ordem?: number
          tipo?: string
          titulo?: string
          unidade_id?: string
          updated_at?: string
          url_midia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinalizacao_digital_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      triagem_criterios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          regras: Json | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          regras?: Json | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          regras?: Json | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "triagem_criterios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_cache_cleanup_log: {
        Row: {
          deleted: number
          error: string | null
          executed_at: string
          id: string
          scanned: number
        }
        Insert: {
          deleted?: number
          error?: string | null
          executed_at?: string
          id?: string
          scanned?: number
        }
        Update: {
          deleted?: number
          error?: string | null
          executed_at?: string
          id?: string
          scanned?: number
        }
        Relationships: []
      }
      tv_layout_profiles: {
        Row: {
          config: Json
          created_at: string
          id: string
          nome: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          nome: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          nome?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_layout_profiles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_visual_config: {
        Row: {
          aspect_ratio: string
          auto_ajuste: boolean | null
          contraste_chamadas: string
          cor_fundo: string
          cor_primaria: string
          cor_texto: string
          created_at: string
          densidade: string
          escala_chamadas: number
          escala_fonte: number
          escala_header: number | null
          escala_rodape: number | null
          fundo_url: string | null
          historico_limite: number | null
          historico_quebrar_texto: boolean | null
          id: string
          layout_grid_cols: number | null
          layout_grid_rows: number | null
          layout_items: Json | null
          logo_url: string | null
          mensagem_rodape: string | null
          resolucao_preset: string
          safe_area_padding: number | null
          unidade_id: string
          updated_at: string
          zoom_nivel: number | null
        }
        Insert: {
          aspect_ratio?: string
          auto_ajuste?: boolean | null
          contraste_chamadas?: string
          cor_fundo?: string
          cor_primaria?: string
          cor_texto?: string
          created_at?: string
          densidade?: string
          escala_chamadas?: number
          escala_fonte?: number
          escala_header?: number | null
          escala_rodape?: number | null
          fundo_url?: string | null
          historico_limite?: number | null
          historico_quebrar_texto?: boolean | null
          id?: string
          layout_grid_cols?: number | null
          layout_grid_rows?: number | null
          layout_items?: Json | null
          logo_url?: string | null
          mensagem_rodape?: string | null
          resolucao_preset?: string
          safe_area_padding?: number | null
          unidade_id: string
          updated_at?: string
          zoom_nivel?: number | null
        }
        Update: {
          aspect_ratio?: string
          auto_ajuste?: boolean | null
          contraste_chamadas?: string
          cor_fundo?: string
          cor_primaria?: string
          cor_texto?: string
          created_at?: string
          densidade?: string
          escala_chamadas?: number
          escala_fonte?: number
          escala_header?: number | null
          escala_rodape?: number | null
          fundo_url?: string | null
          historico_limite?: number | null
          historico_quebrar_texto?: boolean | null
          id?: string
          layout_grid_cols?: number | null
          layout_grid_rows?: number | null
          layout_items?: Json | null
          logo_url?: string | null
          mensagem_rodape?: string | null
          resolucao_preset?: string
          safe_area_padding?: number | null
          unidade_id?: string
          updated_at?: string
          zoom_nivel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_visual_config_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: true
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_voice_config: {
        Row: {
          created_at: string
          id: string
          pitch: number
          provider: string
          rate: number
          template_chamada: string
          unidade_id: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pitch?: number
          provider?: string
          rate?: number
          template_chamada?: string
          unidade_id: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pitch?: number
          provider?: string
          rate?: number
          template_chamada?: string
          unidade_id?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidade_voice_config_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: true
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          assinatura_id: string | null
          ativo: boolean
          cnpj: string | null
          created_at: string
          endereco: string | null
          google_review_url: string | null
          id: string
          nome: string
          slug: string
          status_assinatura: Database["public"]["Enums"]["assinatura_status"]
          telefone: string | null
          ticket_logo_url: string | null
          ticket_rodape: string | null
          ticket_unidade_nome: string | null
          trial_ends_at: string
          updated_at: string
          whatsapp_config: Json | null
        }
        Insert: {
          assinatura_id?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          google_review_url?: string | null
          id?: string
          nome: string
          slug: string
          status_assinatura?: Database["public"]["Enums"]["assinatura_status"]
          telefone?: string | null
          ticket_logo_url?: string | null
          ticket_rodape?: string | null
          ticket_unidade_nome?: string | null
          trial_ends_at?: string
          updated_at?: string
          whatsapp_config?: Json | null
        }
        Update: {
          assinatura_id?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          google_review_url?: string | null
          id?: string
          nome?: string
          slug?: string
          status_assinatura?: Database["public"]["Enums"]["assinatura_status"]
          telefone?: string | null
          ticket_logo_url?: string | null
          ticket_rodape?: string | null
          ticket_unidade_nome?: string | null
          trial_ends_at?: string
          updated_at?: string
          whatsapp_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string
          gateway: string
          id: string
          payload: Json
          processed_at: string
        }
        Insert: {
          environment?: string
          event_id: string
          event_type: string
          gateway: string
          id?: string
          payload: Json
          processed_at?: string
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string
          gateway?: string
          id?: string
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _audit_ator_nome: { Args: { _user_id: string }; Returns: string }
      admin_alertas_notificacoes: {
        Args: { _janela_horas?: number; _min_falhas?: number }
        Returns: {
          canal: string
          destinatario: string
          notificacao_ids: string[]
          primeira_falha: string
          severidade: string
          total_falhas: number
          total_tentativas: number
          ultima_falha: string
          ultimo_erro: string
          unidade_id: string
          unidade_nome: string
        }[]
      }
      admin_alertas_resumo: {
        Args: { _janela_horas?: number; _min_falhas?: number }
        Returns: Json
      }
      admin_alterar_plano_assinatura: {
        Args: {
          _ciclo?: Database["public"]["Enums"]["assinatura_ciclo"]
          _novo_status?: Database["public"]["Enums"]["assinatura_estado"]
          _plano_id: string
          _unidade_id: string
        }
        Returns: string
      }
      admin_atualizar_status_unidade: {
        Args: {
          _ativo?: boolean
          _novo_status: Database["public"]["Enums"]["assinatura_status"]
          _unidade_id: string
        }
        Returns: undefined
      }
      admin_cancelar_assinatura: {
        Args: { _imediato?: boolean; _unidade_id: string }
        Returns: undefined
      }
      admin_criar_unidade: {
        Args: {
          _cnpj?: string
          _endereco?: string
          _nome: string
          _slug?: string
          _telefone?: string
          _trial_dias?: number
        }
        Returns: string
      }
      admin_detalhe_assinatura: {
        Args: { _unidade_id: string }
        Returns: {
          assinatura_id: string
          cancelada_em: string
          cancelar_no_fim_do_ciclo: boolean
          ciclo: Database["public"]["Enums"]["assinatura_ciclo"]
          gateway: string
          gateway_customer_id: string
          gateway_subscription_id: string
          inicio_em: string
          metadata: Json
          moeda: string
          plano_id: string
          plano_nome: string
          plano_slug: string
          preco_anual_centavos: number
          preco_mensal_centavos: number
          proximo_ciclo_em: string
          status: Database["public"]["Enums"]["assinatura_estado"]
        }[]
      }
      admin_listar_auditoria:
        | {
            Args: {
              _ate?: string
              _desde?: string
              _entidade?: string
              _limite?: number
              _unidade_id?: string
            }
            Returns: {
              acao: string
              ator_id: string
              ator_nome: string
              created_at: string
              dados_antes: Json
              dados_depois: Json
              entidade: string
              entidade_id: string
              id: string
              resumo: string
              unidade_id: string
              unidade_nome: string
            }[]
          }
        | {
            Args: {
              _ate?: string
              _ator_id?: string
              _busca?: string
              _desde?: string
              _entidade?: string
              _limite?: number
              _unidade_id?: string
            }
            Returns: {
              acao: string
              ator_id: string
              ator_nome: string
              created_at: string
              dados_antes: Json
              dados_depois: Json
              entidade: string
              entidade_id: string
              id: string
              resumo: string
              unidade_id: string
              unidade_nome: string
            }[]
          }
      admin_listar_faturas_unidade: {
        Args: { _unidade_id: string }
        Returns: {
          created_at: string
          gateway_invoice_id: string
          id: string
          linha_descricao: string
          metodo_pagamento: string
          moeda: string
          numero: string
          paga_em: string
          status: Database["public"]["Enums"]["fatura_status"]
          url_recibo: string
          valor_centavos: number
          vencimento: string
        }[]
      }
      admin_marcar_fatura_paga: {
        Args: { _fatura_id: string; _metodo?: string }
        Returns: undefined
      }
      admin_metricas_globais: { Args: { _meses?: number }; Returns: Json }
      admin_metricas_unidade: {
        Args: { _meses?: number; _unidade_id: string }
        Returns: Json
      }
      admin_unidade_canais_diagnostico: {
        Args: { _unidade_id: string }
        Returns: Json
      }
      admin_unidade_integracao_status: {
        Args: { _unidade_id: string }
        Returns: {
          faturas_pendentes: number
          notificacoes_falhas_30d: number
          plano_nome: string
          status_assinatura: string
          tem_assinatura: boolean
          total_filas: number
          total_notificacoes_30d: number
          total_pacientes: number
          total_senhas_30d: number
          total_usuarios: number
          tv_configurada: boolean
          voz_configurada: boolean
          whatsapp_configurado: boolean
        }[]
      }
      belongs_to_unidade: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      chamar_senha_do_ponto: {
        Args: { _ponto_atendimento_id: string; _senha_id: string }
        Returns: string
      }
      check_invitation_token: {
        Args: { _token: string }
        Returns: {
          email: string
          id: string
          is_valid: boolean
          role: string
          unidade_nome: string
        }[]
      }
      cleanup_expired_locks: { Args: never; Returns: undefined }
      cleanup_tts_cache: {
        Args: { _retention_days?: number; _service_role_key: string }
        Returns: {
          deleted: number
          scanned: number
        }[]
      }
      cleanup_tts_cache_scheduled: { Args: never; Returns: undefined }
      encaminhar_do_guiche: {
        Args: {
          _fila_destino_id: string
          _observacoes?: string
          _prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          _senha_guiche_id: string
          _tipo?: string
        }
        Returns: {
          codigo: string
          created_at: string
          criado_por: string | null
          fila_id: string
          finalizada_em: string | null
          id: string
          origem: string | null
          paciente_id: string | null
          posicao: number | null
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          senha_origem_id: string | null
          status: Database["public"]["Enums"]["senha_status"]
          tempo_espera_estimado: number | null
          token_publico: string
          triagem_dados: Json | null
          unidade_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "senhas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_fila_guiche: { Args: { _unidade_id: string }; Returns: string }
      finalizar_atendimento_com_retorno: {
        Args: {
          _atendimento_id: string
          _observacoes?: string
          _requer_retorno?: boolean
        }
        Returns: string
      }
      gerar_senha: {
        Args: {
          _fila_id: string
          _origem?: string
          _paciente_id?: string
          _prioridade?: Database["public"]["Enums"]["senha_prioridade"]
        }
        Returns: {
          codigo: string
          created_at: string
          criado_por: string | null
          fila_id: string
          finalizada_em: string | null
          id: string
          origem: string | null
          paciente_id: string | null
          posicao: number | null
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          senha_origem_id: string | null
          status: Database["public"]["Enums"]["senha_status"]
          tempo_espera_estimado: number | null
          token_publico: string
          triagem_dados: Json | null
          unidade_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "senhas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gerar_senha_guiche: {
        Args: {
          _data_nascimento?: string
          _nome: string
          _prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          _telefone?: string
          _triagem_dados?: Json
          _unidade_id: string
        }
        Returns: {
          codigo: string
          created_at: string
          criado_por: string | null
          fila_id: string
          finalizada_em: string | null
          id: string
          origem: string | null
          paciente_id: string | null
          posicao: number | null
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          senha_origem_id: string | null
          status: Database["public"]["Enums"]["senha_status"]
          tempo_espera_estimado: number | null
          token_publico: string
          triagem_dados: Json | null
          unidade_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "senhas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_chamadas_recentes: {
        Args: { _unidade_id: string }
        Returns: {
          created_at: string
          destino: string
          id: string
          senha_id: string
          unidade_id: string
        }[]
      }
      get_chamadas_recentes_detalhadas: {
        Args: { _unidade_id: string }
        Returns: {
          created_at: string
          destino: string
          fila_nome: string
          id: string
          paciente_nome: string
          senha_codigo: string
          senha_id: string
          triagem_dados: Json
          unidade_id: string
        }[]
      }
      get_pacientes_publicos_ativos: {
        Args: { _unidade_id: string }
        Returns: {
          nome_completo: string
          paciente_id: string
        }[]
      }
      get_plano_atual: {
        Args: { _unidade_id: string }
        Returns: {
          assinatura_id: string
          cancelar_no_fim_do_ciclo: boolean
          ciclo: Database["public"]["Enums"]["assinatura_ciclo"]
          gateway_price_id_anual_oneoff: string
          limite_atendentes: number
          limite_filas: number
          limite_senhas_mes: number
          limite_tvs: number
          metadata: Json
          plano_id: string
          plano_nome: string
          plano_slug: string
          proximo_ciclo_em: string
          recursos: Json
          status: Database["public"]["Enums"]["assinatura_estado"]
        }[]
      }
      get_senha_por_token: {
        Args: { _token: string }
        Returns: {
          codigo: string
          created_at: string
          fila_id: string
          id: string
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          status: Database["public"]["Enums"]["senha_status"]
          unidade_id: string
          updated_at: string
        }[]
      }
      get_senhas_ativas: {
        Args: { _unidade_id: string }
        Returns: {
          codigo: string
          created_at: string
          fila_id: string
          id: string
          paciente_id: string
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          status: Database["public"]["Enums"]["senha_status"]
          unidade_id: string
          updated_at: string
        }[]
      }
      get_unidade_publica_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          nome: string
          slug: string
        }[]
      }
      get_unidade_publica_detalhe: {
        Args: { _unidade_id: string }
        Returns: {
          google_review_url: string
          id: string
          nome: string
          slug: string
        }[]
      }
      get_unidade_trial_status: {
        Args: { _unidade_id: string }
        Returns: {
          dias_restantes: number
          expirado: boolean
          status_assinatura: Database["public"]["Enums"]["assinatura_status"]
          trial_ends_at: string
        }[]
      }
      get_unidades_publicas: {
        Args: never
        Returns: {
          id: string
          nome: string
          slug: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_unidade: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _unidade_id: string
          _user_id: string
        }
        Returns: boolean
      }
      historico_ponto_atendimento: {
        Args: {
          _ate?: string
          _busca?: string
          _desde?: string
          _limite?: number
          _ponto_id?: string
          _unidade_id: string
        }
        Returns: {
          atendente_id: string
          atendente_nome: string
          duracao_segundos: number
          evento_id: string
          evento_tipo: string
          fila_nome: string
          observacoes: string
          ocorrido_em: string
          paciente_nome: string
          ponto_id: string
          ponto_nome: string
          requer_retorno: boolean
          senha_codigo: string
          senha_id: string
        }[]
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      marcar_senhas_ausentes: { Args: never; Returns: number }
      pode_ocupar_ponto: {
        Args: { _ponto_atendimento_id: string; _user_id: string }
        Returns: boolean
      }
      realtime_topic_allowed: { Args: { _topic: string }; Returns: boolean }
      retry_failed_notifications: { Args: never; Returns: undefined }
      setup_initial_unidade: {
        Args: {
          _cnpj?: string
          _endereco?: string
          _nome: string
          _slug?: string
          _telefone?: string
        }
        Returns: string
      }
      tem_recurso: {
        Args: { _recurso: string; _unidade_id: string }
        Returns: boolean
      }
      unaccent_simple: { Args: { _text: string }; Returns: string }
      unidade_listar_auditoria: {
        Args: {
          _ate?: string
          _busca?: string
          _desde?: string
          _entidade?: string
          _limite?: number
          _unidade_id: string
        }
        Returns: {
          acao: string
          ator_id: string
          ator_nome: string
          created_at: string
          dados_antes: Json
          dados_depois: Json
          entidade: string
          entidade_id: string
          id: string
          resumo: string
          unidade_id: string
        }[]
      }
      user_unidade_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "recepcao"
        | "medico"
        | "enfermeiro"
        | "gestor"
        | "super_admin"
      assinatura_ciclo: "mensal" | "anual"
      assinatura_estado:
        | "trialing"
        | "ativa"
        | "inadimplente"
        | "cancelada"
        | "pausada"
      assinatura_status: "trial" | "ativo" | "suspenso" | "cancelado"
      canal_notificacao: "whatsapp" | "sms" | "telegram" | "push" | "email"
      fatura_status: "aberta" | "paga" | "falhou" | "reembolsada" | "cancelada"
      fila_tipo:
        | "consulta"
        | "exame"
        | "enfermagem"
        | "urgencia"
        | "farmacia"
        | "laboratorio"
        | "outro"
        | "guiche"
      notificacao_status: "pendente" | "enviada" | "falhou" | "ignorado"
      ponto_tipo: "guiche" | "consultorio" | "exame" | "outro"
      senha_prioridade: "normal" | "preferencial" | "urgente"
      senha_status:
        | "aguardando"
        | "chamada"
        | "em_atendimento"
        | "finalizada"
        | "ausente"
        | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "recepcao",
        "medico",
        "enfermeiro",
        "gestor",
        "super_admin",
      ],
      assinatura_ciclo: ["mensal", "anual"],
      assinatura_estado: [
        "trialing",
        "ativa",
        "inadimplente",
        "cancelada",
        "pausada",
      ],
      assinatura_status: ["trial", "ativo", "suspenso", "cancelado"],
      canal_notificacao: ["whatsapp", "sms", "telegram", "push", "email"],
      fatura_status: ["aberta", "paga", "falhou", "reembolsada", "cancelada"],
      fila_tipo: [
        "consulta",
        "exame",
        "enfermagem",
        "urgencia",
        "farmacia",
        "laboratorio",
        "outro",
        "guiche",
      ],
      notificacao_status: ["pendente", "enviada", "falhou", "ignorado"],
      ponto_tipo: ["guiche", "consultorio", "exame", "outro"],
      senha_prioridade: ["normal", "preferencial", "urgente"],
      senha_status: [
        "aguardando",
        "chamada",
        "em_atendimento",
        "finalizada",
        "ausente",
        "cancelada",
      ],
    },
  },
} as const

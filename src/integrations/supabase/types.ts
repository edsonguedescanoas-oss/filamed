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
          senha_id: string
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
          senha_id: string
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
          senha_id?: string
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
            foreignKeyName: "atendimentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      chamadas: {
        Row: {
          chamado_por: string | null
          created_at: string
          destino: string
          id: string
          observacao: string | null
          senha_id: string
          unidade_id: string
        }
        Insert: {
          chamado_por?: string | null
          created_at?: string
          destino: string
          id?: string
          observacao?: string | null
          senha_id: string
          unidade_id: string
        }
        Update: {
          chamado_por?: string | null
          created_at?: string
          destino?: string
          id?: string
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
      notificacoes_log: {
        Row: {
          canal: Database["public"]["Enums"]["canal_notificacao"]
          created_at: string
          destinatario: string
          enviada_em: string | null
          erro: string | null
          id: string
          mensagem: string
          senha_id: string | null
          status: Database["public"]["Enums"]["notificacao_status"]
          unidade_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["canal_notificacao"]
          created_at?: string
          destinatario: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          mensagem: string
          senha_id?: string | null
          status?: Database["public"]["Enums"]["notificacao_status"]
          unidade_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_notificacao"]
          created_at?: string
          destinatario?: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string
          senha_id?: string | null
          status?: Database["public"]["Enums"]["notificacao_status"]
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
          email: string | null
          id: string
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
          email?: string | null
          id?: string
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
          email?: string | null
          id?: string
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
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          id: string
          nome_completo: string
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
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      senhas: {
        Row: {
          codigo: string
          created_at: string
          fila_id: string
          finalizada_em: string | null
          id: string
          origem: string | null
          paciente_id: string | null
          posicao: number | null
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          status: Database["public"]["Enums"]["senha_status"]
          token_publico: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          fila_id: string
          finalizada_em?: string | null
          id?: string
          origem?: string | null
          paciente_id?: string | null
          posicao?: number | null
          prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          status?: Database["public"]["Enums"]["senha_status"]
          token_publico?: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          fila_id?: string
          finalizada_em?: string | null
          id?: string
          origem?: string | null
          paciente_id?: string | null
          posicao?: number | null
          prioridade?: Database["public"]["Enums"]["senha_prioridade"]
          status?: Database["public"]["Enums"]["senha_status"]
          token_publico?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
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
      unidade_voice_config: {
        Row: {
          created_at: string
          id: string
          pitch: number
          provider: string
          rate: number
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
          id: string
          nome: string
          slug: string
          status_assinatura: Database["public"]["Enums"]["assinatura_status"]
          telefone: string | null
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          assinatura_id?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          slug: string
          status_assinatura?: Database["public"]["Enums"]["assinatura_status"]
          telefone?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          assinatura_id?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          slug?: string
          status_assinatura?: Database["public"]["Enums"]["assinatura_status"]
          telefone?: string | null
          trial_ends_at?: string
          updated_at?: string
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
      belongs_to_unidade: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_tts_cache: {
        Args: { _retention_days?: number; _service_role_key: string }
        Returns: {
          deleted: number
          scanned: number
        }[]
      }
      cleanup_tts_cache_scheduled: { Args: never; Returns: undefined }
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
          fila_id: string
          finalizada_em: string | null
          id: string
          origem: string | null
          paciente_id: string | null
          posicao: number | null
          prioridade: Database["public"]["Enums"]["senha_prioridade"]
          status: Database["public"]["Enums"]["senha_status"]
          token_publico: string
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
      get_plano_atual: {
        Args: { _unidade_id: string }
        Returns: {
          assinatura_id: string
          ciclo: Database["public"]["Enums"]["assinatura_ciclo"]
          limite_atendentes: number
          limite_filas: number
          limite_senhas_mes: number
          limite_tvs: number
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      marcar_senhas_ausentes: { Args: never; Returns: number }
      realtime_topic_allowed: { Args: { _topic: string }; Returns: boolean }
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
      notificacao_status: "pendente" | "enviada" | "falhou"
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
      ],
      notificacao_status: ["pendente", "enviada", "falhou"],
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

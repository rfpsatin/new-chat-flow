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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      atendentes: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          para_triagem: boolean
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          para_triagem?: boolean
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          para_triagem?: boolean
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendentes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendentes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_destinatarios: {
        Row: {
          campanha_id: string
          contato_id: string
          conversa_id: string | null
          created_at: string
          erro_envio_msg: string | null
          id: string
          mensagem_id_whatsapp: string | null
          status_envio: string
          tentativas: number
          ultima_tentativa_em: string | null
          whatsapp_numero: string
        }
        Insert: {
          campanha_id: string
          contato_id: string
          conversa_id?: string | null
          created_at?: string
          erro_envio_msg?: string | null
          id?: string
          mensagem_id_whatsapp?: string | null
          status_envio?: string
          tentativas?: number
          ultima_tentativa_em?: string | null
          whatsapp_numero: string
        }
        Update: {
          campanha_id?: string
          contato_id?: string
          conversa_id?: string | null
          created_at?: string
          erro_envio_msg?: string | null
          id?: string
          mensagem_id_whatsapp?: string | null
          status_envio?: string
          tentativas?: number
          ultima_tentativa_em?: string | null
          whatsapp_numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_destinatarios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_destinatarios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanha_stats"
            referencedColumns: ["campanha_id"]
          },
        ]
      }
      campanhas: {
        Row: {
          agendado_para: string | null
          created_at: string
          descricao: string | null
          empresa_id: string
          envios_por_hora: number | null
          envios_por_minuto: number | null
          finalizada_em: string | null
          id: string
          iniciada_em: string | null
          link: string | null
          mensagem_texto: string
          midia_url: string | null
          modo_resposta: string | null
          nome: string
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          envios_por_hora?: number | null
          envios_por_minuto?: number | null
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string | null
          link?: string | null
          mensagem_texto: string
          midia_url?: string | null
          modo_resposta?: string | null
          nome: string
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          envios_por_hora?: number | null
          envios_por_minuto?: number | null
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string | null
          link?: string | null
          mensagem_texto?: string
          midia_url?: string | null
          modo_resposta?: string | null
          nome?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string | null
          telefone_numero: string | null
          whatsapp_numero: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome?: string | null
          telefone_numero?: string | null
          whatsapp_numero: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string | null
          telefone_numero?: string | null
          whatsapp_numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          agente_responsavel_id: string | null
          campanha_id: string | null
          canal: string
          channel: string | null
          contato_id: string
          created_at: string
          empresa_id: string
          encerrado_em: string | null
          encerrado_por_id: string | null
          human_mode: boolean | null
          id: string
          iniciado_por: string
          last_message_at: string
          motivo_encerramento_id: string | null
          n8n_webhook_id: string | null
          nota_satisfacao: number | null
          nr_protocolo: string | null
          origem: string | null
          origem_final: string | null
          origem_inicial: string | null
          pesquisa_enviada_em: string | null
          pesquisa_respondida_em: string | null
          resumo: string | null
          status: string
          status_ao_encerrar: string | null
          updated_at: string
        }
        Insert: {
          agente_responsavel_id?: string | null
          campanha_id?: string | null
          canal?: string
          channel?: string | null
          contato_id: string
          created_at?: string
          empresa_id: string
          encerrado_em?: string | null
          encerrado_por_id?: string | null
          human_mode?: boolean | null
          id?: string
          iniciado_por?: string
          last_message_at?: string
          motivo_encerramento_id?: string | null
          n8n_webhook_id?: string | null
          nota_satisfacao?: number | null
          nr_protocolo?: string | null
          origem?: string | null
          origem_final?: string | null
          origem_inicial?: string | null
          pesquisa_enviada_em?: string | null
          pesquisa_respondida_em?: string | null
          resumo?: string | null
          status: string
          status_ao_encerrar?: string | null
          updated_at?: string
        }
        Update: {
          agente_responsavel_id?: string | null
          campanha_id?: string | null
          canal?: string
          channel?: string | null
          contato_id?: string
          created_at?: string
          empresa_id?: string
          encerrado_em?: string | null
          encerrado_por_id?: string | null
          human_mode?: boolean | null
          id?: string
          iniciado_por?: string
          last_message_at?: string
          motivo_encerramento_id?: string | null
          n8n_webhook_id?: string | null
          nota_satisfacao?: number | null
          nr_protocolo?: string | null
          origem?: string | null
          origem_final?: string | null
          origem_inicial?: string | null
          pesquisa_enviada_em?: string | null
          pesquisa_respondida_em?: string | null
          resumo?: string | null
          status?: string
          status_ao_encerrar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_agente_responsavel_id_fkey"
            columns: ["agente_responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanha_stats"
            referencedColumns: ["campanha_id"]
          },
          {
            foreignKeyName: "conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "vw_fila_atendimento"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "conversas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_encerrado_por_id_fkey"
            columns: ["encerrado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_motivo_encerramento_id_fkey"
            columns: ["motivo_encerramento_id"]
            isOneToOne: false
            referencedRelation: "motivos_encerramento"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          agente_ia_ativo: boolean
          ativo: boolean
          cnpj: string
          created_at: string
          id: string
          nome_fantasia: string | null
          razao_social: string
          tipo_atendimento: string
          whapi_channel_name: string | null
          whapi_last_error: string | null
          whapi_last_qr_at: string | null
          whapi_phone: string | null
          whapi_status: string | null
          whapi_status_raw: string | null
          whapi_status_source: string | null
          whapi_status_updated_at: string | null
          whapi_token: string | null
          whapi_work_period: string | null
        }
        Insert: {
          agente_ia_ativo?: boolean
          ativo?: boolean
          cnpj: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          tipo_atendimento?: string
          whapi_channel_name?: string | null
          whapi_last_error?: string | null
          whapi_last_qr_at?: string | null
          whapi_phone?: string | null
          whapi_status?: string | null
          whapi_status_raw?: string | null
          whapi_status_source?: string | null
          whapi_status_updated_at?: string | null
          whapi_token?: string | null
          whapi_work_period?: string | null
        }
        Update: {
          agente_ia_ativo?: boolean
          ativo?: boolean
          cnpj?: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          tipo_atendimento?: string
          whapi_channel_name?: string | null
          whapi_last_error?: string | null
          whapi_last_qr_at?: string | null
          whapi_phone?: string | null
          whapi_status?: string | null
          whapi_status_raw?: string | null
          whapi_status_source?: string | null
          whapi_status_updated_at?: string | null
          whapi_token?: string | null
          whapi_work_period?: string | null
        }
        Relationships: []
      }
      mensagens_ativas: {
        Row: {
          contato_id: string
          conteudo: string | null
          conversa_id: string
          criado_em: string
          direcao: string
          empresa_id: string
          id: number
          media_filename: string | null
          media_kind: string | null
          media_mime: string | null
          media_url: string | null
          payload: Json | null
          remetente_id: string | null
          reply_to_message_id: number | null
          reply_to_whatsapp_id: string | null
          tipo_remetente: string
          whatsapp_message_id: string | null
        }
        Insert: {
          contato_id: string
          conteudo?: string | null
          conversa_id: string
          criado_em?: string
          direcao: string
          empresa_id: string
          id?: number
          media_filename?: string | null
          media_kind?: string | null
          media_mime?: string | null
          media_url?: string | null
          payload?: Json | null
          remetente_id?: string | null
          reply_to_message_id?: number | null
          reply_to_whatsapp_id?: string | null
          tipo_remetente: string
          whatsapp_message_id?: string | null
        }
        Update: {
          contato_id?: string
          conteudo?: string | null
          conversa_id?: string
          criado_em?: string
          direcao?: string
          empresa_id?: string
          id?: number
          media_filename?: string | null
          media_kind?: string | null
          media_mime?: string | null
          media_url?: string | null
          payload?: Json | null
          remetente_id?: string | null
          reply_to_message_id?: number | null
          reply_to_whatsapp_id?: string | null
          tipo_remetente?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_ativas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_ativas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "vw_fila_atendimento"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_ativas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_ativas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "vw_fila_atendimento"
            referencedColumns: ["conversa_id"]
          },
          {
            foreignKeyName: "mensagens_ativas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "vw_historico_conversas"
            referencedColumns: ["conversa_id"]
          },
          {
            foreignKeyName: "mensagens_ativas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_ativas_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_historico: {
        Row: {
          arquivado_em: string
          contato_id: string
          conteudo: string | null
          conversa_id: string
          criado_em: string
          direcao: string
          empresa_id: string
          id: number
          payload: Json | null
          remetente_id: string | null
          tipo_remetente: string
        }
        Insert: {
          arquivado_em?: string
          contato_id: string
          conteudo?: string | null
          conversa_id: string
          criado_em: string
          direcao: string
          empresa_id: string
          id?: number
          payload?: Json | null
          remetente_id?: string | null
          tipo_remetente: string
        }
        Update: {
          arquivado_em?: string
          contato_id?: string
          conteudo?: string | null
          conversa_id?: string
          criado_em?: string
          direcao?: string
          empresa_id?: string
          id?: number
          payload?: Json | null
          remetente_id?: string | null
          tipo_remetente?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_historico_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_historico_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "vw_fila_atendimento"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_historico_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_historico_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "vw_fila_atendimento"
            referencedColumns: ["conversa_id"]
          },
          {
            foreignKeyName: "mensagens_historico_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "vw_historico_conversas"
            referencedColumns: ["conversa_id"]
          },
          {
            foreignKeyName: "mensagens_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_historico_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_encerramento: {
        Row: {
          ativo: boolean
          descricao: string
          empresa_id: string
          id: string
        }
        Insert: {
          ativo?: boolean
          descricao: string
          empresa_id: string
          id?: string
        }
        Update: {
          ativo?: boolean
          descricao?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivos_encerramento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      protocolo_contador: {
        Row: {
          dia: string
          proximo: number
        }
        Insert: {
          dia: string
          proximo?: number
        }
        Update: {
          dia?: string
          proximo?: number
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          created_at: string
          email: string
          empresa_id: string
          id: string
          nome: string
          tipo_usuario: string
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          created_at?: string
          email: string
          empresa_id: string
          id?: string
          nome: string
          tipo_usuario: string
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          tipo_usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      whapi_connection_events: {
        Row: {
          created_at: string
          empresa_id: string
          event_type: string | null
          id: string
          payload: Json | null
          source: string
          state: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          source: string
          state?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          source?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whapi_connection_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_campanha_stats: {
        Row: {
          agendado_para: string | null
          campanha_id: string | null
          conversas_abertas: number | null
          empresa_id: string | null
          entregues: number | null
          enviados: number | null
          erros: number | null
          finalizada_em: string | null
          iniciada_em: string | null
          nome: string | null
          pendentes: number | null
          status: string | null
          total_destinatarios: number | null
        }
        Relationships: []
      }
      vw_fila_atendimento: {
        Row: {
          agente_nome: string | null
          agente_responsavel_id: string | null
          campanha_id: string | null
          channel: string | null
          contato_id: string | null
          contato_nome: string | null
          conversa_id: string | null
          created_at: string | null
          empresa_id: string | null
          last_message_at: string | null
          nr_protocolo: string | null
          origem: string | null
          origem_final: string | null
          origem_inicial: string | null
          resumo: string | null
          status: string | null
          whatsapp_numero: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_agente_responsavel_id_fkey"
            columns: ["agente_responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanha_stats"
            referencedColumns: ["campanha_id"]
          },
          {
            foreignKeyName: "conversas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_historico_conversas: {
        Row: {
          agente_nome: string | null
          agente_responsavel_id: string | null
          campanha_id: string | null
          canal: string | null
          contato_id: string | null
          contato_nome: string | null
          conversa_id: string | null
          empresa_id: string | null
          encerrado_em: string | null
          iniciado_em: string | null
          motivo_encerramento: string | null
          nota_satisfacao: number | null
          nr_protocolo: string | null
          origem_final: string | null
          origem_inicial: string | null
          resumo: string | null
          status: string | null
          status_ao_encerrar: string | null
          whatsapp_numero: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_agente_responsavel_id_fkey"
            columns: ["agente_responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "vw_campanha_stats"
            referencedColumns: ["campanha_id"]
          },
          {
            foreignKeyName: "conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "vw_fila_atendimento"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "conversas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_mensagens_consolidado: {
        Row: {
          arquivado_em: string | null
          contato_id: string | null
          conteudo: string | null
          conversa_id: string | null
          criado_em: string | null
          direcao: string | null
          empresa_id: string | null
          id: number | null
          origem: string | null
          payload: Json | null
          remetente_id: string | null
          tipo_remetente: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assumir_conversa: {
        Args: { p_agente_id: string; p_conversa_id: string }
        Returns: undefined
      }
      atribuir_agente: {
        Args: { p_agente_id: string; p_conversa_id: string }
        Returns: undefined
      }
      current_empresa_id: { Args: never; Returns: string }
      current_tipo_usuario: { Args: never; Returns: string }
      encaminhar_para_atendente: {
        Args: { p_agente_id: string; p_conversa_id: string }
        Returns: undefined
      }
      encerrar_conversa: {
        Args: {
          p_conversa_id: string
          p_motivo_id: string
          p_resumo?: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      forcar_atendimento_humano: {
        Args: { p_conversa_id: string }
        Returns: undefined
      }
      get_acompanhamento_mensagens: {
        Args: { p_data_inicio: string; p_data_fim: string }
        Returns: {
          empresa_id: string
          empresa_nome: string | null
          mensagens_recebidas: number
          conversas_fechadas: number
          em_aberto_total: number
          em_aberto_bot: number
          em_aberto_triagem: number
          em_aberto_fila: number
          em_aberto_atendimento: number
        }[]
      }
      get_next_nr_protocolo: { Args: never; Returns: string }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      solicitar_atendimento_humano: {
        Args: { p_conversa_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "adm" | "sup" | "opr"
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
      app_role: ["adm", "sup", "opr"],
    },
  },
} as const

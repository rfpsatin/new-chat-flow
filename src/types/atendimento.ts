export type StatusConversa = 
  | 'bot' 
  | 'esperando_tria' 
  | 'fila_humano' 
  | 'em_atendimento_humano' 
  | 'encerrado';

export type TipoUsuario = 'adm' | 'sup' | 'opr';

export type DirecaoMensagem = 'in' | 'out';

export type TipoRemetente = 'cliente' | 'bot' | 'agente' | 'sistema';

export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  ativo: boolean;
  created_at: string;
}

export interface Usuario {
  id: string;
  auth_user_id: string | null;
  empresa_id: string;
  nome: string;
  email: string;
  tipo_usuario: TipoUsuario;
  ativo: boolean;
  created_at: string;
}

export interface Contato {
  id: string;
  empresa_id: string;
  nome: string | null;
  whatsapp_numero: string;
  telefone_numero: string | null;
  created_at: string;
}

export interface Conversa {
  id: string;
  empresa_id: string;
  contato_id: string;
  canal: string;
  status: StatusConversa;
  iniciado_por: string;
  agente_responsavel_id: string | null;
  motivo_encerramento_id: string | null;
  encerrado_por_id: string | null;
  encerrado_em: string | null;
  resumo: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface MensagemAtiva {
  id: number;
  empresa_id: string;
  conversa_id: string;
  contato_id: string;
  direcao: DirecaoMensagem;
  tipo_remetente: TipoRemetente;
  remetente_id: string | null;
  conteudo: string | null;
  payload: Record<string, unknown> | null;
  criado_em: string;
}

export interface MotivoEncerramento {
  id: string;
  empresa_id: string;
  descricao: string;
  ativo: boolean;
}

export interface FilaAtendimento {
  conversa_id: string;
  empresa_id: string;
  contato_id: string;
  contato_nome: string | null;
  whatsapp_numero: string;
  status: StatusConversa;
  last_message_at: string;
  created_at: string;
  agente_responsavel_id: string | null;
  agente_nome: string | null;
  resumo: string | null;
}

export interface HistoricoConversa {
  conversa_id: string;
  contato_id: string;
  empresa_id: string;
  canal: string;
  status: StatusConversa;
  iniciado_em: string;
  encerrado_em: string | null;
  motivo_encerramento: string | null;
  resumo: string | null;
  contato_nome: string | null;
  whatsapp_numero: string | null;
  agente_responsavel_id: string | null;
  agente_nome: string | null;
}

export interface ContatoComHistorico {
  contato_id: string;
  contato_nome: string | null;
  whatsapp_numero: string | null;
  total_sessoes: number;
}

export interface AtendenteComHistorico {
  agente_id: string;
  agente_nome: string | null;
  total_sessoes: number;
}

export interface FiltrosHistorico {
  busca: string;
  operadorId: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}

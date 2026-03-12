import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Clock, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import React from 'react';
import { HistoricoConversa } from '@/types/atendimento';
import { useMensagensHistoricoInfinite } from '@/hooks/useMensagens';
import { SatisfacaoStars } from './SatisfacaoStars';

function getHistoricoDisplayContent(msg: { conteudo: string | null; payload?: any }): string {
  if (!msg.conteudo) return '';
  
  // Always use payload for interactive/list to ensure complete data with descriptions
  if (msg.payload) {
    const payload = msg.payload as any;
    if (payload.type === 'interactive' || msg.conteudo === '[interactive]') {
      const p = payload.interactive;
      const parts: string[] = [];
      if (p?.header) parts.push(p.header);
      if (p?.body) parts.push(p.body.trim());
      if (p?.buttons?.length) {
        parts.push(p.buttons.map((b: any) => `• ${b.text}`).join('\n'));
      }
      if (p?.footer) parts.push(`{{FOOTER}}${p.footer}`);
      if (parts.length > 0) return parts.join('\n');
    }

    if (payload.type === 'list' || msg.conteudo === '[list]') {
      const p = payload.list;
      const parts: string[] = [];
      if (p?.header) parts.push(p.header);
      if (p?.body) parts.push(p.body.trim());
      if (p?.sections?.length) {
        const items = p.sections.flatMap((s: any) =>
          s.rows.map((r: any) => {
            let item = `• ${r.title}`;
            if (r.description?.trim()) item += ` — ${r.description.trim()}`;
            return item;
          })
        );
        parts.push(items.join('\n'));
      }
      if (p?.footer) parts.push(`{{FOOTER}}${p.footer}`);
      if (parts.length > 0) return parts.join('\n');
    }
  }

  if (msg.conteudo === '[reply]' && msg.payload) {
    if (msg.payload.reply?.buttons_reply?.title) return `📝 ${msg.payload.reply.buttons_reply.title}`;
    if (msg.payload.reply?.list_reply?.title) {
      const desc = msg.payload.reply.list_reply.description?.trim();
      return desc ? `📝 ${msg.payload.reply.list_reply.title}   (${desc})` : `📝 ${msg.payload.reply.list_reply.title}`;
    }
  }

  return msg.conteudo;
}

function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function FormattedHistoricoContent({ content, isOutgoing }: { content: string; isOutgoing: boolean }) {
  const lines = content.split('\n');
  return (
    <div className="text-sm space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('{{FOOTER}}')) {
          const footerText = line.replace('{{FOOTER}}', '');
          return (
            <p key={i} className="text-[10px] text-white/90 mt-1 text-center">
              {footerText}
            </p>
          );
        }

        const isBullet = line.startsWith('• ');
        if (isBullet) {
          const bulletContent = line.slice(2);
          const dashIndex = bulletContent.indexOf(' — ');
          
          if (dashIndex !== -1) {
            const title = bulletContent.slice(0, dashIndex);
            const description = bulletContent.slice(dashIndex + 3);
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 px-2 py-1 rounded-md',
                  isOutgoing ? 'bg-primary-foreground/10' : 'bg-background/60'
                )}
              >
                <span className="shrink-0 mt-0.5 text-sm">▸</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{renderBoldText(title)}</span>
                  <span className="text-[10px] text-muted-foreground pl-3">({description})</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 px-2 py-1 rounded-md text-sm',
                isOutgoing ? 'bg-primary-foreground/10' : 'bg-background/60'
              )}
            >
              <span className="shrink-0 mt-0.5">▸</span>
              <span className="font-medium">{renderBoldText(bulletContent)}</span>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {renderBoldText(line)}
          </p>
        );
      })}
    </div>
  );
}

interface Props {
  sessao: HistoricoConversa;
  onClose: () => void;
}

export function SessaoCard({ sessao, onClose }: Props) {
  const {
    mensagens,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMensagensHistoricoInfinite(sessao.conversa_id);

  return (
    <div className="flex-1 min-h-0 border border-border rounded-lg bg-card flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">
                {format(new Date(sessao.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <SatisfacaoStars nota={sessao.nota_satisfacao} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {sessao.status_ao_encerrar && (
              <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
                {sessao.status_ao_encerrar === 'bot' ? 'Bot' :
                 sessao.status_ao_encerrar === 'esperando_tria' ? 'Triagem' :
                 sessao.status_ao_encerrar === 'fila_humano' ? 'Na Fila' :
                 sessao.status_ao_encerrar === 'em_atendimento_humano' ? 'Atendimento' :
                 sessao.status_ao_encerrar}
              </span>
            )}
            {sessao.agente_nome && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {sessao.agente_nome}
              </span>
            )}
            {sessao.motivo_encerramento && (
              <span className="bg-muted px-1.5 py-0.5 rounded">
                {sessao.motivo_encerramento}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-0 divide-y divide-border/30">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Carregando mensagens...
            </div>
          ) : (mensagens?.length ?? 0) === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Nenhuma mensagem
            </div>
          ) : (
            <>
              {hasNextPage && (
                <div className="py-2 flex justify-center border-b border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Carregar mais antigas'
                    )}
                  </Button>
                </div>
              )}
              {mensagens?.map((msg) => (
              <div key={msg.id} className="py-2">
                <div
                  className={cn(
                    'max-w-[85%] p-2.5 rounded-lg text-sm',
                    msg.direcao === 'in'
                      ? 'bg-muted mr-auto'
                      : 'bg-primary text-primary-foreground ml-auto'
                  )}
                >
                  {msg.tipo_remetente !== 'cliente' && msg.direcao === 'out' && (
                    <div className="text-xs opacity-70 mb-1">
                      {msg.tipo_remetente === 'bot' ? '🤖 Bot' : '👤 Agente'}
                    </div>
                  )}
                  <FormattedHistoricoContent content={getHistoricoDisplayContent(msg)} isOutgoing={msg.direcao === 'out'} />
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {format(new Date(msg.criado_em), 'HH:mm', { locale: ptBR })}
                  </div>
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

import { useState } from 'react';
import { useHistoricoCliente } from '@/hooks/useHistorico';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SatisfacaoStars } from '@/components/historico/SatisfacaoStars';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, History, User, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoricoClienteCollapsibleProps {
  empresaId: string;
  contatoId: string;
  conversaAtualId?: string;
}

export function HistoricoClienteCollapsible({ 
  empresaId, 
  contatoId,
  conversaAtualId
}: HistoricoClienteCollapsibleProps) {
  const [open, setOpen] = useState(false);
  const { data: historico, isLoading } = useHistoricoCliente(empresaId, contatoId);

  // Filtrar a conversa atual do histórico
  const sessoesAnteriores = historico?.filter(h => h.conversa_id !== conversaAtualId);

  if (isLoading || !sessoesAnteriores || sessoesAnteriores.length === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 text-sm">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Histórico do Cliente</span>
          <span className="text-muted-foreground">
            ({sessoesAnteriores.length} {sessoesAnteriores.length === 1 ? 'sessão' : 'sessões'})
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          {sessoesAnteriores.map((sessao) => (
            <div 
              key={sessao.conversa_id}
              className="p-3 rounded-lg bg-muted/50 text-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {sessao.encerrado_em 
                    ? format(new Date(sessao.encerrado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : format(new Date(sessao.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  }
                </span>
                {sessao.nota_satisfacao && (
                  <SatisfacaoStars nota={sessao.nota_satisfacao} size="sm" />
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs">
                {sessao.agente_nome && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{sessao.agente_nome}</span>
                  </div>
                )}
                
                {sessao.motivo_encerramento && (
                  <div className={cn(
                    "flex items-center gap-1",
                    sessao.motivo_encerramento.toLowerCase().includes('resolvido') 
                      ? "text-emerald-600" 
                      : "text-muted-foreground"
                  )}>
                    {sessao.motivo_encerramento.toLowerCase().includes('resolvido') ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    <span>{sessao.motivo_encerramento}</span>
                  </div>
                )}
              </div>
              
              {sessao.resumo && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {sessao.resumo}
                </p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

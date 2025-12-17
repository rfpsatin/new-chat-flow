import { useState } from 'react';
import { useOperadores } from '@/hooks/useUsuarios';
import { useAtendimentosAtivos, useEncaminharAtendente, useAtribuirAgente } from '@/hooks/useFila';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Search, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusConversa } from '@/types/atendimento';

interface AtribuirAtendentePopoverProps {
  empresaId: string;
  conversaId: string;
  conversaStatus: StatusConversa;
  onSuccess?: () => void;
}

export function AtribuirAtendentePopover({ 
  empresaId, 
  conversaId,
  conversaStatus,
  onSuccess 
}: AtribuirAtendentePopoverProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  
  const { data: operadores, isLoading } = useOperadores(empresaId);
  const contagemAtivos = useAtendimentosAtivos(empresaId);
  const encaminharAtendente = useEncaminharAtendente();
  const atribuirAgente = useAtribuirAgente();

  const operadoresFiltrados = operadores?.filter(op => 
    op.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Se está aguardando triagem, usa encaminhar. Se já está em atendimento, usa transferir.
  const isEncaminhamento = conversaStatus === 'esperando_tria';
  const isTransferencia = conversaStatus === 'em_atendimento_humano';

  const handleAtribuir = async (agenteId: string) => {
    if (isEncaminhamento) {
      await encaminharAtendente.mutateAsync({
        conversaId,
        agenteId,
      });
    } else {
      await atribuirAgente.mutateAsync({
        conversaId,
        agenteId,
      });
    }
    setOpen(false);
    setBusca('');
    onSuccess?.();
  };

  const isPending = encaminharAtendente.isPending || atribuirAgente.isPending;

  const getStatusColor = (count: number) => {
    if (count === 0) return 'bg-emerald-500';
    if (count <= 2) return 'bg-emerald-500';
    if (count <= 5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusLabel = (count: number) => {
    if (count === 0) return 'Disponível';
    return `${count} em atendimento`;
  };

  const buttonLabel = isEncaminhamento ? 'Encaminhar para Atendente' : 'Transferir Atendente';
  const headerLabel = isEncaminhamento ? 'Encaminhar para' : 'Transferir para';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isEncaminhamento ? (
            <ArrowRight className="w-4 h-4" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm mb-2">{headerLabel}</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atendente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        
        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : operadoresFiltrados?.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum atendente encontrado
            </div>
          ) : (
            <div className="py-1">
              {operadoresFiltrados?.map((op) => {
                const count = contagemAtivos.get(op.id) || 0;
                return (
                  <button
                    key={op.id}
                    onClick={() => handleAtribuir(op.id)}
                    disabled={isPending}
                    className={cn(
                      "w-full px-3 py-2.5 flex items-center justify-between",
                      "hover:bg-accent transition-colors text-left",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        getStatusColor(count)
                      )} />
                      <span className="font-medium text-sm">{op.nome}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getStatusLabel(count)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

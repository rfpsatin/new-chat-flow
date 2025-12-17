import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { FiltrosHistorico as FiltrosType } from '@/types/atendimento';

interface Props {
  filtros: FiltrosType;
  onFiltrosChange: (filtros: FiltrosType) => void;
  operadores: { id: string; nome: string }[];
}

export function FiltrosHistorico({ filtros, onFiltrosChange, operadores }: Props) {
  const handleClearFiltros = () => {
    onFiltrosChange({
      busca: '',
      operadorId: null,
      dataInicio: null,
      dataFim: null,
    });
  };

  const hasFilters = filtros.busca || filtros.operadorId || filtros.dataInicio || filtros.dataFim;

  return (
    <div className="space-y-3 p-3 border-b border-border">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={filtros.busca}
          onChange={(e) => onFiltrosChange({ ...filtros, busca: e.target.value })}
          placeholder="Nome ou telefone..."
          className="pl-8 h-9"
        />
      </div>

      {/* Operador */}
      <Select
        value={filtros.operadorId || 'all'}
        onValueChange={(value) => onFiltrosChange({ ...filtros, operadorId: value === 'all' ? null : value })}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Operador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos operadores</SelectItem>
          {operadores.map((op) => (
            <SelectItem key={op.id} value={op.id}>
              {op.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Período */}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 h-9 justify-start text-left font-normal',
                !filtros.dataInicio && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filtros.dataInicio ? format(filtros.dataInicio, 'dd/MM/yy') : 'De'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filtros.dataInicio || undefined}
              onSelect={(date) => onFiltrosChange({ ...filtros, dataInicio: date || null })}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 h-9 justify-start text-left font-normal',
                !filtros.dataFim && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filtros.dataFim ? format(filtros.dataFim, 'dd/MM/yy') : 'Até'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filtros.dataFim || undefined}
              onSelect={(date) => onFiltrosChange({ ...filtros, dataFim: date || null })}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Limpar filtros */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-muted-foreground"
          onClick={handleClearFiltros}
        >
          <X className="w-3 h-3 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

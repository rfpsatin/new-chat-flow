import { Search, Bot, Clock, Users, Headphones, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface StatusCount {
  bot: number;
  esperando_tria: number;
  fila_humano: number;
  em_atendimento_humano: number;
}

interface FiltrosFilaProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  statusCounts: StatusCount;
  tipoUsuario?: 'adm' | 'sup' | 'opr';
  allStatusCounts?: StatusCount;
}

const statusConfig = [
  { key: 'todos', label: 'Todos', icon: LayoutGrid },
  { key: 'bot', label: 'Bot', icon: Bot },
  { key: 'esperando_tria', label: 'Triagem', icon: Clock },
  { key: 'fila_humano', label: 'Na Fila', icon: Users },
  { key: 'em_atendimento_humano', label: 'Atendimento', icon: Headphones },
];

export function FiltrosFila({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onSelectStatus,
  statusCounts,
  tipoUsuario,
  allStatusCounts,
}: FiltrosFilaProps) {
  const totalCount = statusCounts.bot + statusCounts.esperando_tria + statusCounts.fila_humano + statusCounts.em_atendimento_humano;

  // Filtrar filtros baseado no tipo de usuário
  const visibleFilters = tipoUsuario === 'opr' 
    ? statusConfig.filter(f => ['todos', 'fila_humano', 'em_atendimento_humano'].includes(f.key))
    : statusConfig;

  // Para operadores, mostrar quantidades discretas de bot e triagem
  const isOperador = tipoUsuario === 'opr';
  const botCount = allStatusCounts?.bot || 0;
  const triagemCount = allStatusCounts?.esperando_tria || 0;
  
  // Determinar se deve usar espaçamento justificado (apenas quando há 3 filtros)
  const numFilters = visibleFilters.length;
  const shouldJustify = numFilters === 3;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Status chips - single select */}
      <div className={cn(
        'flex items-center w-full',
        isOperador ? 'flex-nowrap' : 'flex-wrap',
        shouldJustify ? 'justify-between' : 'gap-2',
        !isOperador && numFilters > 3 && 'gap-y-3'
      )}>
        {visibleFilters.map(({ key, label, icon: Icon }) => {
          const isActive = selectedStatus === key;
          const count = key === 'todos' ? totalCount : (statusCounts[key as keyof StatusCount] || 0);

          return (
            <button
              key={key}
              onClick={() => onSelectStatus(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-all',
                'border shrink-0',
                isOperador 
                  ? 'px-2.5 py-1.5' 
                  : numFilters > 3 
                    ? 'px-4 py-1.5' 
                    : 'px-3 py-1.5',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quantidades discretas para operadores - linha separada abaixo dos chips */}
      {isOperador && (botCount > 0 || triagemCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          {botCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 opacity-50" />
              <span className="opacity-70">Bot: {botCount}</span>
            </div>
          )}
          {triagemCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 opacity-50" />
              <span className="opacity-70">Triagem: {triagemCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

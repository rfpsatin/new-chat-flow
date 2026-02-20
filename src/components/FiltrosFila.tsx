import { Search, Bot, Clock, Users, Headphones, LayoutGrid, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  
  // Separar filtros em primeira linha (máximo 3) e segunda linha (resto)
  const firstRowFilters = visibleFilters.slice(0, 3);
  const secondRowFilters = visibleFilters.slice(3);

  return (
    <div className="space-y-3">
      {/* Search input + ícone de legenda */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Legenda das cores"
            >
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-[220px] p-2.5 text-xs">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Legenda</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full w-2 h-2 bg-blue-700 shrink-0" aria-hidden />
                  <span>Chat-Web (Marketing, Comercial)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full w-2 h-2 bg-green-700 shrink-0" aria-hidden />
                  <span>WhatsApp</span>
                </div>
              </div>
              <p className="text-muted-foreground pt-0.5 border-t border-border/50">
                Cada conversa mostra o círculo e o canal no canto inferior direito do card.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Status chips - single select */}
      <div className="flex flex-col gap-4">
        {/* Primeira linha - sempre 3 filtros, justificados, com margem igual ao campo de pesquisa */}
        <div className="flex items-center w-full justify-between pl-3">
          {firstRowFilters.slice(0, 3).map(({ key, label, icon: Icon }) => {
            const isActive = selectedStatus === key;
            const count = key === 'todos' ? totalCount : (statusCounts[key as keyof StatusCount] || 0);

            return (
              <button
                key={key}
                onClick={() => onSelectStatus(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-all',
                  'border shrink-0 px-2.5 py-1.5',
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
          {/* Preencher com espaços vazios se houver menos de 3 filtros */}
          {firstRowFilters.length < 3 && Array.from({ length: 3 - firstRowFilters.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1" />
          ))}
        </div>

        {/* Segunda linha - sem justificação, com gap pequeno, margem igual ao campo de pesquisa */}
        {secondRowFilters.length > 0 && (
          <div className="flex items-center gap-2 pl-3">
            {secondRowFilters.map(({ key, label, icon: Icon }) => {
              const isActive = selectedStatus === key;
              const count = key === 'todos' ? totalCount : (statusCounts[key as keyof StatusCount] || 0);

              return (
                <button
                  key={key}
                  onClick={() => onSelectStatus(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-all',
                    'border shrink-0 px-4 py-1.5',
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
        )}
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

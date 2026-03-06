import { Search, Bot, Clock, Users, Headphones, LayoutGrid, Info, MoreVertical, CheckSquare, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  showSelectionOption?: boolean;
  // Sub-filtro por agente
  agentesDisponiveis?: { id: string; nome: string }[];
  subFiltroAgenteId?: string | null;
  onSubFiltroAgenteChange?: (agenteId: string | null) => void;
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
  isSelectionMode,
  onToggleSelectionMode,
  showSelectionOption = true,
  agentesDisponiveis,
  subFiltroAgenteId,
  onSubFiltroAgenteChange,
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
          <TooltipContent side="bottom" align="end" className="p-2.5 text-xs">
            <p className="font-medium text-foreground mb-1.5">Legenda</p>
            <div className="flex flex-col gap-1">
              <span>🔵 Chat Web</span>
              <span>🟢 WhatsApp</span>
            </div>
          </TooltipContent>
        </Tooltip>
        {!isSelectionMode && onToggleSelectionMode && showSelectionOption && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Mais opções"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggleSelectionMode}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Selecionar conversas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Status chips - single select */}
      <div className="flex flex-col gap-4">
        {/* Primeira linha - sempre 3 filtros, justificados, com margem igual ao campo de pesquisa */}
        <div className="flex items-center w-full justify-between pl-3">
          {firstRowFilters.slice(0, 3).map(({ key, label, icon: Icon }) => {
            const isActive = selectedStatus === key;
            const count = key === 'todos' ? totalCount : (statusCounts[key as keyof StatusCount] || 0);
            const hasSubFilter = (key === 'fila_humano' || key === 'em_atendimento_humano') && !!agentesDisponiveis?.length;
            const isSubFiltered = hasSubFilter && isActive && !!subFiltroAgenteId;

            return (
              <div key={key} className="inline-flex items-stretch h-8">
                <button
                  onClick={() => {
                    onSelectStatus(key);
                    if (key !== selectedStatus) onSubFiltroAgenteChange?.(null);
                  }}
                  className={cn(
                    'inline-flex h-full items-center gap-1.5 text-xs font-medium transition-all',
                    'border shrink-0 px-2.5',
                    hasSubFilter ? 'rounded-l-full border-r-0' : 'rounded-full',
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
                {hasSubFilter && (
                  <>
                    {isActive ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              'inline-flex h-full items-center justify-center px-1.5 text-xs transition-all border rounded-r-full',
                              'bg-primary text-primary-foreground border-primary hover:bg-primary/90',
                              isSubFiltered && 'ring-1 ring-primary-foreground/40'
                            )}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[160px]">
                          <DropdownMenuItem
                            onClick={() => {
                              onSelectStatus(key);
                              onSubFiltroAgenteChange?.(null);
                            }}
                            className={cn(!subFiltroAgenteId && 'font-semibold')}
                          >
                            Todos
                          </DropdownMenuItem>
                          {agentesDisponiveis?.map((agente) => (
                            <DropdownMenuItem
                              key={agente.id}
                              onClick={() => {
                                onSelectStatus(key);
                                onSubFiltroAgenteChange?.(agente.id);
                              }}
                              className={cn(subFiltroAgenteId === agente.id && 'font-semibold')}
                            >
                              {agente.nome}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStatus(key);
                          if (key !== selectedStatus) onSubFiltroAgenteChange?.(null);
                        }}
                        className={cn(
                          'inline-flex h-full items-center justify-center px-1.5 text-xs transition-all border rounded-r-full',
                          'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
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
              const hasSubFilter = (key === 'fila_humano' || key === 'em_atendimento_humano') && !!agentesDisponiveis?.length;
              const isSubFiltered = hasSubFilter && isActive && !!subFiltroAgenteId;

              return (
                <div key={key} className="inline-flex items-stretch h-8">
                  <button
                    onClick={() => {
                      onSelectStatus(key);
                      if (key !== selectedStatus) onSubFiltroAgenteChange?.(null);
                    }}
                    className={cn(
                      'inline-flex h-full items-center gap-1.5 text-xs font-medium transition-all',
                      'border shrink-0 px-4',
                      hasSubFilter ? 'rounded-l-full border-r-0' : 'rounded-full',
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
                  {hasSubFilter && (
                    <>
                      {isActive ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                'inline-flex h-full items-center justify-center px-1.5 text-xs transition-all border rounded-r-full',
                                'bg-primary text-primary-foreground border-primary hover:bg-primary/90',
                                isSubFiltered && 'ring-1 ring-primary-foreground/40'
                              )}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-[160px]">
                            <DropdownMenuItem
                              onClick={() => {
                                onSelectStatus(key);
                                onSubFiltroAgenteChange?.(null);
                              }}
                              className={cn(!subFiltroAgenteId && 'font-semibold')}
                            >
                              Todos
                            </DropdownMenuItem>
                            {agentesDisponiveis?.map((agente) => (
                              <DropdownMenuItem
                                key={agente.id}
                                onClick={() => {
                                  onSelectStatus(key);
                                  onSubFiltroAgenteChange?.(agente.id);
                                }}
                                className={cn(subFiltroAgenteId === agente.id && 'font-semibold')}
                              >
                                {agente.nome}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStatus(key);
                            if (key !== selectedStatus) onSubFiltroAgenteChange?.(null);
                          }}
                          className={cn(
                            'inline-flex h-full items-center justify-center px-1.5 text-xs transition-all border rounded-r-full',
                            'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          )}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
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

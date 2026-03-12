import { useDatabaseHealth } from '@/hooks/useDatabaseHealth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Database, Activity, HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function DatabaseHealthPanel() {
  const { data, isLoading, error, fetchHealth } = useDatabaseHealth();

  const ov = data?.overview;
  const connPct = ov ? Math.round((ov.active_connections / ov.max_connections) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Saúde do Banco de Dados
          </h2>
          <p className="text-sm text-muted-foreground">
            Métricas consultadas manualmente. Clique em "Consultar" para atualizar.
          </p>
        </div>
        <Button onClick={fetchHealth} disabled={isLoading} className="min-w-[140px]">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Consultar
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {!data && !isLoading && !error && (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          Clique em "Consultar" para ver as métricas do banco.
        </div>
      )}

      {data && ov && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  Armazenamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{ov.db_size_pretty}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tamanho total do banco (dados + índices)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Conexões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {ov.active_connections} <span className="text-sm font-normal text-muted-foreground">/ {ov.max_connections}</span>
                </p>
                <Progress value={connPct} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {connPct}% utilizado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Cache Hit Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{ov.cache_hit_ratio}%</p>
                <Progress value={ov.cache_hit_ratio} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {ov.cache_hit_ratio >= 99 ? 'Excelente' : ov.cache_hit_ratio >= 95 ? 'Bom' : 'Atenção — cache baixo'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Connection states */}
          {data.connectionStates.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conexões por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {data.connectionStates.map((cs) => (
                    <div key={cs.state} className="bg-muted rounded-md px-3 py-2 text-sm">
                      <span className="font-medium">{cs.count}</span>{' '}
                      <span className="text-muted-foreground">{cs.state}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table stats */}
          {data.tableStats.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tabelas (por tamanho)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tabela</TableHead>
                      <TableHead className="text-right">Tamanho Total</TableHead>
                      <TableHead className="text-right">Dados</TableHead>
                      <TableHead className="text-right">Índices</TableHead>
                      <TableHead className="text-right">Linhas (est.)</TableHead>
                      <TableHead className="text-right">Dead Tuples</TableHead>
                      <TableHead className="text-right">Seq Scan</TableHead>
                      <TableHead className="text-right">Idx Scan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tableStats.map((t) => (
                      <TableRow key={t.table_name}>
                        <TableCell className="font-mono text-xs">{t.table_name}</TableCell>
                        <TableCell className="text-right">{t.total_size}</TableCell>
                        <TableCell className="text-right">{t.data_size}</TableCell>
                        <TableCell className="text-right">{t.index_size}</TableCell>
                        <TableCell className="text-right">{t.estimated_rows.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={t.n_dead_tup > 1000 ? 'text-destructive font-medium' : ''}>
                            {t.n_dead_tup.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{t.seq_scan.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{t.idx_scan.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            💡 <strong>CPU e Memória</strong> são métricas de infraestrutura gerenciadas pelo Lovable Cloud e não acessíveis via SQL.
            Os indicadores acima (armazenamento, conexões, cache, dead tuples) são os principais sinais de que a instância pode precisar ser escalada.
          </p>
        </>
      )}
    </div>
  );
}

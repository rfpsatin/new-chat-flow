import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface KpiCardProps {
  value: string | number;
  label: string;
  change?: number;
  showCircle?: boolean;
  circlePercent?: number;
  isLoading?: boolean;
}

export function KpiCard({ value, label, change, showCircle, circlePercent, isLoading }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  if (isLoading) {
    return (
      <Card className="bg-card border-border p-4 flex flex-col gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-24" />
      </Card>
    );
  }
  
  return (
    <Card className="bg-card border-border p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {showCircle && circlePercent !== undefined && (
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(circlePercent / 100) * 125.6} 125.6`}
                  className="text-emerald-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                {circlePercent}%
              </span>
            </div>
          )}
          <div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            isPositive 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </Card>
  );
}

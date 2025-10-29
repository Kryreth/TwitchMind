import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  showToggle?: boolean;
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export function StatCard({ title, value, trend, icon: Icon, loading, showToggle, isVisible, onToggleVisibility }: StatCardProps) {
  const testId = title.toLowerCase().replace(/\s+/g, '-');
  
  if (showToggle && !isVisible) {
    return (
      <Card data-testid={`stat-card-${testId}`} className="opacity-50">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={false}
              onCheckedChange={onToggleVisibility}
              data-testid={`switch-${testId}`}
            />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid={`stat-card-${testId}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {showToggle && (
            <Switch
              checked={isVisible}
              onCheckedChange={onToggleVisibility}
              data-testid={`switch-${testId}`}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground" data-testid={`stat-value-${testId}`}>{value}</div>
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                {trend.isPositive ? (
                  <ArrowTrendingUpIcon className="h-3 w-3 text-chart-2" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3 w-3 text-destructive" />
                )}
                <span className={trend.isPositive ? "text-chart-2" : "text-destructive"}>
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground">from last hour</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

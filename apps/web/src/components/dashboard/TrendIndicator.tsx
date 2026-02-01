import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { DashboardTrendDto } from './types';

interface TrendIndicatorProps {
  trend: DashboardTrendDto;
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <ArrowUp className="h-4 w-4" />;
      case 'down':
        return <ArrowDown className="h-4 w-4" />;
      case 'stable':
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up':
        return 'text-green-600 dark:text-green-500';
      case 'down':
        return 'text-red-600 dark:text-red-500';
      case 'stable':
      default:
        return 'text-muted-foreground';
    }
  };

  const getPercentageText = () => {
    const sign = trend.percentage >= 0 ? '+' : '';
    return `${sign}${trend.percentage.toFixed(1)}%`;
  };

  return (
    <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
      {getTrendIcon()}
      <span className="font-medium">{getPercentageText()}</span>
      <span className="text-muted-foreground text-xs ml-1">
        vs poprzedni okres
      </span>
    </div>
  );
}

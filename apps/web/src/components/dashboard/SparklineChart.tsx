import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { SparklineChartProps } from './types';

export function SparklineChart({
  data,
  color = '#8884d8',
  showTooltip = true,
}: SparklineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-16 flex items-center justify-center text-muted-foreground text-sm">
        Brak danych
      </div>
    );
  }

  // Przekształć dane do formatu wymaganego przez Recharts
  const chartData = data.map((point) => ({
    date: point.date,
    value: point.value,
  }));

  return (
    <div className="w-full h-16">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md">
                    <p className="text-sm font-medium">{data.date}</p>
                    <p className="text-sm text-muted-foreground">
                      Wartość: {data.value}
                    </p>
                  </div>
                );
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

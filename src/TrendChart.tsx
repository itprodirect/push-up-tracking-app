import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartTickFormatter, chartTooltipLabel } from './dates';

export type TrendPoint = { date: string; value: number };
export type TrendRange = 7 | 30 | 365 | 1825 | 'all';

export function TrendChart({
  data,
  goal,
  range,
  color = '#22d3ee',
  label = 'Value',
}: {
  data: TrendPoint[];
  goal?: number;
  range: TrendRange;
  color?: string;
  label?: string;
}) {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={chartTickFormatter(range)}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis stroke="#94a3b8" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: '#94a3b8' }}
            labelFormatter={(v: string) => chartTooltipLabel(v)}
            formatter={(v: number) => [v, label]}
          />
          {goal !== undefined && <ReferenceLine y={goal} stroke="#10b981" strokeDasharray="3 3" />}
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

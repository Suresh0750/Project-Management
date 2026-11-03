'use client';

import { useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { DashboardSection } from '@/components/dashboard/dashboard-section';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/utils/cn';

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  /** Extra line shown in the tooltip and table, e.g. "3 of 5 tasks". */
  detail?: string;
}

interface BarChartCardProps {
  title: string;
  description?: string;
  data: BarDatum[];
  /** Appended to values ("%"). */
  unit?: string;
  /** Fixed upper bound of the value axis (100 for percentages). Defaults to the data max. */
  max?: number;
  /** Draws a full-length track behind each bar (only meaningful for a 0..max scale). */
  track?: boolean;
  valueHeader: string;
  emptyTitle: string;
  emptyDescription?: string;
  refreshing?: boolean;
}

const ROW_HEIGHT = 44;

// Colors come from theme tokens so the chart follows light/dark automatically.
const INK_MUTED = 'var(--muted-foreground)';
const INK = 'var(--foreground)';
const BAR = 'var(--primary)';
const TRACK = 'var(--surface-muted)';

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: BarDatum }>;
  unit: string;
}

/** Value leads (strong), the label follows (secondary), per the interaction guidance. */
function ChartTooltip({ active, payload, unit }: TooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="text-sm font-semibold text-foreground">
        {datum.value.toLocaleString()}
        {unit}
      </p>
      <p className="text-muted-foreground">{datum.label}</p>
      {datum.detail && <p className="mt-0.5 text-muted-foreground">{datum.detail}</p>}
    </div>
  );
}

function truncate(label: string): string {
  return label.length > 18 ? `${label.slice(0, 17)}…` : label;
}

/**
 * Ranked horizontal bars: one hue, labelled directly, recessive axes. Every value is also in
 * the table view, so nothing depends on hover or color.
 */
export function BarChartCard({
  title,
  description,
  data,
  unit = '',
  max,
  track = false,
  valueHeader,
  emptyTitle,
  emptyDescription,
  refreshing,
}: BarChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const hasData = data.some((datum) => datum.value > 0) || (track && data.length > 0);

  const toggle = hasData ? (
    <div role="group" aria-label={`${title} view`} className="inline-flex rounded-md border border-border p-0.5">
      {(
        [
          ['chart', 'Chart', BarChart3],
          ['table', 'Table', Table2],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setView(value)}
          aria-pressed={view === value}
          aria-label={`${label} view`}
          className={cn(
            'flex size-7 items-center justify-center rounded',
            view === value ? 'bg-surface-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  ) : undefined;

  let body;
  if (!hasData) {
    body = <EmptyState icon={BarChart3} title={emptyTitle} {...(emptyDescription ? { description: emptyDescription } : {})} />;
  } else if (view === 'table') {
    body = (
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-5 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-5 py-2 text-right font-medium">
              {valueHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.id} className="border-b border-border last:border-0">
              <td className="px-5 py-2">
                {datum.label}
                {datum.detail && (
                  <span className="block text-xs text-muted-foreground">{datum.detail}</span>
                )}
              </td>
              <td className="px-5 py-2 text-right tabular-nums">
                {datum.value.toLocaleString()}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    body = (
      <div className="px-3 py-3">
        <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + 8}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
            barCategoryGap={10}
          >
            <XAxis type="number" hide domain={[0, max ?? 'dataMax']} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tickLine={false}
              axisLine={false}
              tickFormatter={truncate}
              tick={{ fill: INK_MUTED, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: TRACK, opacity: 0.5 }}
              content={(props) => (
                <ChartTooltip
                  unit={unit}
                  {...(props.active !== undefined ? { active: props.active } : {})}
                  payload={props.payload as TooltipProps['payload'] & ReadonlyArray<unknown>}
                />
              )}
            />
            <Bar
              dataKey="value"
              fill={BAR}
              barSize={14}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              {...(track ? { background: { fill: TRACK, radius: 4 } } : {})}
            >
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value: unknown) => `${String(value)}${unit}`}
                style={{ fill: INK, fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <DashboardSection
      title={title}
      {...(description ? { description } : {})}
      {...(toggle ? { controls: toggle } : {})}
      {...(refreshing !== undefined ? { refreshing } : {})}
    >
      {body}
    </DashboardSection>
  );
}

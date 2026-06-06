import React from 'react';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'red' | 'green' | 'blue' | 'orange' | 'violet';
  trend?: { value: string; positive: boolean };
  sub?: string;
}

const colors = {
  red:    'bg-primary/10 text-primary',
  green:  'bg-success/10 text-success',
  blue:   'bg-info/10 text-info',
  orange: 'bg-warning/10 text-warning',
  violet: 'bg-violet/10 text-violet',
};

export default function StatCard({ label, value, icon: Icon, color = 'blue', trend, sub }: Props) {
  return (
    <div className="card hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
          {trend && (
            <p className={clsx('text-xs font-medium mt-2', trend.positive ? 'text-success' : 'text-danger')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', colors[color])}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

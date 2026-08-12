import React from 'react';
import { clsx } from 'clsx';
import { WeaponCondition, WeaponStatus, IssueStatus } from '../../types/permissions';

type BadgeType = 'condition' | 'status' | 'issueStatus' | 'module';

interface BadgeProps {
  type?: BadgeType;
  value: string;
  className?: string;
}

const conditionStyles: Record<WeaponCondition, string> = {
  excellent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  good: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  fair: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  poor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  damaged: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  retired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const statusStyles: Record<WeaponStatus, string> = {
  available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  out_of_stock: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  retired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const issueStatusStyles: Record<IssueStatus, string> = {
  issued: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  partially_returned: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  returned: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-semibold animate-pulse',
  lost: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const Badge: React.FC<BadgeProps> = ({ type = 'condition', value, className }) => {
  let styleClass = 'bg-slate-800 text-slate-300 border-slate-700';

  if (type === 'condition' && value in conditionStyles) {
    styleClass = conditionStyles[value as WeaponCondition];
  } else if (type === 'status' && value in statusStyles) {
    styleClass = statusStyles[value as WeaponStatus];
  } else if (type === 'issueStatus' && value in issueStatusStyles) {
    styleClass = issueStatusStyles[value as IssueStatus];
  }

  const label = value.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider',
        styleClass,
        className
      )}
    >
      {label}
    </span>
  );
};

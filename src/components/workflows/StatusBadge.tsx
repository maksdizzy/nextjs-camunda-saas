import { Badge } from '@/components/ui/badge';

type StatusBadgeProps = {
  status: 'active' | 'completed' | 'suspended' | 'failed' | 'pending';
  className?: string;
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    active: {
      label: 'Active',
      variant: 'default' as const,
      className: 'bg-blue-500 hover:bg-blue-600',
    },
    completed: {
      label: 'Completed',
      variant: 'default' as const,
      className: 'bg-green-500 hover:bg-green-600',
    },
    suspended: {
      label: 'Suspended',
      variant: 'default' as const,
      className: 'bg-yellow-500 hover:bg-yellow-600',
    },
    failed: {
      label: 'Failed',
      variant: 'destructive' as const,
      className: '',
    },
    pending: {
      label: 'Pending',
      variant: 'secondary' as const,
      className: '',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
};

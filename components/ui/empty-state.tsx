import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6">
        <Icon size={28} className="text-brand-400" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-dark-500 text-sm max-w-xs leading-relaxed mb-8">
        {description}
      </p>

      {action && (
        <button onClick={action.onClick} className="btn-primary !py-2.5 !px-6 !text-sm !rounded-xl">
          {action.label}
        </button>
      )}
    </div>
  );
}

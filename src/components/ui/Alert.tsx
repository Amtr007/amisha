import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { type ReactNode } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  onClose?: () => void;
  children?: ReactNode;
}

export function Alert({ type, message, title, onClose, children }: AlertProps) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="text-green-600" size={20} />,
      title: 'text-green-800',
      text: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <XCircle className="text-red-600" size={20} />,
      title: 'text-red-800',
      text: 'text-red-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertCircle className="text-amber-600" size={20} />,
      title: 'text-amber-800',
      text: 'text-amber-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="text-blue-600" size={20} />,
      title: 'text-blue-800',
      text: 'text-blue-700',
    },
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-4 flex gap-3`}>
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className={`font-medium ${style.title} mb-1`}>{title}</h4>}
        <p className={`${style.text} text-sm`}>{message}</p>
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${style.text} hover:opacity-75 transition-opacity`}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

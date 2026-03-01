import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onPasswordToggle?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      showPasswordToggle,
      isPasswordVisible,
      onPasswordToggle,
      className = '',
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 rounded-xl border transition-all duration-200
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || showPasswordToggle ? 'pr-10' : ''}
              ${
                hasError
                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-200 bg-white focus:border-teal-500 focus:ring-teal-500/20'
              }
              focus:outline-none focus:ring-4
              placeholder:text-gray-400
              ${className}
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={onPasswordToggle}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
          {rightIcon && !showPasswordToggle && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p className={`mt-1.5 text-sm ${hasError ? 'text-red-600' : 'text-gray-500'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

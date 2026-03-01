import { type PasswordStrength } from '../../utils/validation';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

export function PasswordStrengthMeter({ strength }: PasswordStrengthMeterProps) {
  const { score, label, color, feedback } = strength;
  const percentage = (score / 6) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        <span
          className="text-xs font-medium capitalize min-w-[50px] text-right"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      {feedback.length > 0 && (
        <ul className="text-xs text-gray-500 space-y-0.5">
          {feedback.slice(0, 2).map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

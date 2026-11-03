import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '@/schemas/auth';

interface PasswordRequirementsProps {
  value: string;
}

/** Live checklist under a "new password" field: each rule turns green as it is met. */
export function PasswordRequirements({ value }: PasswordRequirementsProps) {
  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const Icon = met ? Check : Circle;
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${
              met ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

import React from 'react';

interface TaskCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

export const TaskCheckbox: React.FC<TaskCheckboxProps> = ({
  checked,
  onToggle,
  label,
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `Mark "${label}" incomplete` : `Complete "${label}"`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4] focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#111114]"
    >
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full transition-all duration-150 ease-out ${
          checked
            ? 'scale-100 bg-[#10B981] text-white shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
            : 'border-[1.5px] border-[#D4D4D8] bg-transparent group-hover:border-[#6366F1] group-active:scale-95 dark:border-[#52525B] dark:group-hover:border-[#818CF8]'
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 14 14"
            fill="none"
            className="h-3 w-3 stroke-current"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
          </svg>
        )}
      </span>
    </button>
  );
};

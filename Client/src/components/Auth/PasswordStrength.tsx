'use client';

import React from 'react';
import clsx from 'clsx';
import { FiCheck } from 'react-icons/fi';

/** Must match `passwordSchema` on the server. */
export const PASSWORD_RULES = [
   {
      key: 'length',
      label: 'At least 8 characters',
      test: (value: string) => value.length >= 8,
   },
   {
      key: 'letter',
      label: 'Contains a letter',
      test: (value: string) => /[a-zA-Z]/.test(value),
   },
   {
      key: 'number',
      label: 'Contains a number',
      test: (value: string) => /\d/.test(value),
   },
] as const;

export const PASSWORD_MAX_LENGTH = 72;

export const isPasswordValid = (value: string) =>
   value.length <= PASSWORD_MAX_LENGTH &&
   PASSWORD_RULES.every((rule) => rule.test(value));

/** react-hook-form `validate` rule with a human message. */
export const validatePassword = (value: string) => {
   if (value.length > PASSWORD_MAX_LENGTH)
      return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
   const failing = PASSWORD_RULES.find((rule) => !rule.test(value));
   return failing ? failing.label : true;
};

const LEVELS = [
   { label: '', bar: 'bg-gray-200', text: 'text-gray-400' },
   { label: 'Weak', bar: 'bg-rose-500', text: 'text-rose-500' },
   { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-500' },
   { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-600' },
   { label: 'Strong', bar: 'bg-green-500', text: 'text-green-600' },
];

/** 0 = empty, 1 = missing a requirement, 2..4 = all requirements + extra entropy. */
export const passwordLevel = (value: string): number => {
   if (!value) return 0;
   if (!PASSWORD_RULES.every((rule) => rule.test(value))) return 1;
   const bonus = [/[A-Z]/.test(value), /[^A-Za-z0-9]/.test(value), value.length >= 12].filter(
      Boolean,
   ).length;
   return Math.min(4, 2 + bonus);
};

interface PasswordStrengthProps {
   value: string;
   className?: string;
}

/** Four-segment meter plus the requirement checklist, driven by the live value. */
const PasswordStrength: React.FC<PasswordStrengthProps> = ({ value, className }) => {
   const level = passwordLevel(value);
   const current = LEVELS[level];

   return (
      <div className={clsx('flex flex-col gap-3', className)}>
         <div className="flex gap-3 items-center">
            <div className="flex flex-1 gap-1.5">
               {[1, 2, 3, 4].map((segment) => (
                  <span
                     key={segment}
                     className={clsx(
                        'h-1.5 flex-1 rounded-full transition-colors duration-300',
                        segment <= level ? current.bar : 'bg-gray-200',
                     )}
                  />
               ))}
            </div>
            <span
               className={clsx(
                  'w-12 text-right text-xs font-semibold',
                  current.text,
               )}
            >
               {current.label}
            </span>
         </div>

         <ul className="grid gap-1.5 m-0 p-0 list-none">
            {PASSWORD_RULES.map((rule) => {
               const passed = rule.test(value);
               return (
                  <li
                     key={rule.key}
                     className={clsx(
                        'flex gap-2 items-center text-xs transition-colors',
                        passed ? 'text-green-600' : 'text-gray-400',
                     )}
                  >
                     <span
                        className={clsx(
                           'flex justify-center items-center w-4 h-4 rounded-full border transition-colors',
                           passed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 bg-white',
                        )}
                     >
                        {passed && <FiCheck size={10} strokeWidth={3} />}
                     </span>
                     {rule.label}
                  </li>
               );
            })}
         </ul>
      </div>
   );
};

export default PasswordStrength;

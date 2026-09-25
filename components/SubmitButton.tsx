"use client";

import { useFormStatus } from "react-dom";

type Props = React.ComponentProps<"button"> & { pendingText?: string };

/** Submit button that disables itself while its form's Server Action runs. */
export function SubmitButton({ children, pendingText, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending || disabled} aria-busy={pending}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

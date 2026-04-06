import { useFormStatus } from 'react-dom';
import { Loader } from 'lucide-react';

/**
 * A submit button that reads pending state from the nearest <form action={fn}>.
 * Must be rendered as a descendant of a form with an action prop.
 *
 * @param {string} pendingText - Text shown while the form action is pending
 * @param {string} className   - Button CSS classes
 * @param {ReactNode} children - Button content when not pending
 */
export default function SubmitButton({
  children,
  pendingText = 'Saving...',
  className = 'btn btn-primary',
  disabled,
  ...props
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      {...props}
    >
      {pending ? (
        <>
          <Loader size={18} className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

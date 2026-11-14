import StatusMessage from './StatusMessage';

interface Props {
  /** The error text shown above the retry button. */
  message: string;
  onRetry: () => void;
  /** Layout classes for the centering container (sizing, padding, background). */
  className?: string;
}

/**
 * A centered load-failure state: an error {@link StatusMessage} plus a
 * "重試" button, used in place of a loading indicator once a fetch fails so
 * the user isn't left on an endless spinner.
 */
export default function RetryableError({
  message,
  onRetry,
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <StatusMessage variant='error'>{message}</StatusMessage>
      <button
        onClick={onRetry}
        className='rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95'
      >
        重試
      </button>
    </div>
  );
}

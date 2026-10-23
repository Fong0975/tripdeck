interface Props {
  className?: string;
}

/** Shared "載入中…" text shown while async data is loading. */
export default function LoadingIndicator({ className = '' }: Props) {
  return (
    <p
      className={`animate-pulse text-sm text-muted-foreground ${className}`.trim()}
    >
      載入中…
    </p>
  );
}

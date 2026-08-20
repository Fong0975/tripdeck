interface Props {
  className?: string;
}

/** Shared "載入中…" text shown while async data is loading. */
export default function LoadingIndicator({ className = '' }: Props) {
  return (
    <p
      className={`text-muted-foreground animate-pulse text-sm ${className}`.trim()}
    >
      載入中…
    </p>
  );
}

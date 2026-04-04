import type { State } from "veles";

type RetryAfterWarningProps = {
  retryAfterSecs$: State<number | null>;
};

function formatCountdown(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSecs % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function RetryAfterWarning({ retryAfterSecs$ }: RetryAfterWarningProps) {
  return retryAfterSecs$.render((retryAfterSecs) =>
    retryAfterSecs === null ? null : (
      <div class="warning-label" role="status" aria-live="polite">
        Server is busy. Please retry in {formatCountdown(retryAfterSecs)}.
      </div>
    ),
  );
}

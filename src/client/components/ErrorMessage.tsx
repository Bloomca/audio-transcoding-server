import { createState, type State } from "veles";

type Props = {
  error$: State<string | null>;
  onRetry: () => void;
};

export function ErrorMessage({ error$, onRetry }: Props) {
  const retrying$ = createState(false);

  error$.track((error) => {
    if (!error) retrying$.set(false);
  });

  return error$.render((error) =>
    error ? (
      <div class="error-container">
        <div
          class="error-message"
          title={error$.attribute((value) => `Error: ${value}`)}
        >
          Something went wrong
        </div>
        <button
          type="button"
          disabled={retrying$.attribute()}
          onClick={(_e) => {
            retrying$.set(true);
            onRetry();
          }}
        >
          Retry
        </button>
      </div>
    ) : null,
  );
}

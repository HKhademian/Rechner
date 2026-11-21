import "./UnifiedControls.css";
import type {
  JSX,
} from "preact";
import {
  Button,
  ButtonVariant,
} from "#components/ui/Button";

export interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly ariaLabel?: string;
  readonly onChange: (page: number) => void;
  readonly className?: string;
}

/** Shared accessible pagination navigation bar. */
export function Pagination({
  page,
  totalPages,
  ariaLabel = "Pagination",
  onChange,
  className = "",
}: PaginationProps): JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className={["ui-pagination", className.trim()].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <Button
        variant={ButtonVariant.Secondary}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      {Array.from({ length: totalPages }, (_, index) => {
        const targetPage = index + 1;
        const isCurrent = page === targetPage;
        return (
          <Button
            key={targetPage}
            variant={isCurrent ? ButtonVariant.Primary : ButtonVariant.Secondary}
            ariaLabel={`Page ${targetPage}`}
            ariaCurrent={isCurrent ? "page" : undefined}
            onClick={() => onChange(targetPage)}
          >
            {targetPage}
          </Button>
        );
      })}
      <Button
        variant={ButtonVariant.Secondary}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

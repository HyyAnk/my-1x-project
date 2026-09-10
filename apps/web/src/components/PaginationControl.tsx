import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export interface PaginationControlProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  // Always show last page
  pages.push(total);

  return pages;
}

export function PaginationControl({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  className = "",
}: PaginationControlProps) {
  if (totalItems <= 0 && totalPages <= 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);
  const pageItems = getPageNumbers(page, totalPages);

  return (
    <nav className={`pagination-container ${className}`.trim()} aria-label="Pagination Navigation" data-testid="pagination-control">
      <div className="pagination-range-info" data-testid="pagination-range-info">
        Showing <strong>{startItem.toLocaleString()}</strong>–<strong>{endItem.toLocaleString()}</strong> of{" "}
        <strong>{totalItems.toLocaleString()}</strong>
      </div>

      <div className="pagination-actions">
        <button
          type="button"
          className="pagination-nav-btn pagination-prev"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Go to previous page"
        >
          <CaretLeft size={15} aria-hidden="true" />
          <span>Previous</span>
        </button>

        <div className="pagination-pages-list" role="list">
          {pageItems.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">
                  …
                </span>
              );
            }

            const isCurrent = item === page;
            return (
              <button
                key={`page-${item}`}
                type="button"
                className={`pagination-page-btn ${isCurrent ? "is-current" : ""}`}
                disabled={disabled}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pagination-nav-btn pagination-next"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Go to next page"
        >
          <span>Next</span>
          <CaretRight size={15} aria-hidden="true" />
        </button>
      </div>

      {onLimitChange ? (
        <div className="pagination-page-size">
          <label htmlFor="pagination-size-select" className="pagination-size-label">
            Per page:
          </label>
          <select
            id="pagination-size-select"
            className="pagination-select"
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Episodes per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </nav>
  );
}

import React from "react";
import Icon from "./Icon";

/**
 * Standardized Pagination Component
 *
 * Provides accessible, responsive pagination controls matching the Figma design system:
 * - Current range summary: "Showing 1-10 of 45 records"
 * - Previous / Next controls with icons
 * - Numbered page buttons with active state and keyboard accessibility
 */
function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  className = "",
}) {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers with clean windowing
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const visiblePages = getPageNumbers();

  return (
    <div className={`pagination-container ${className}`.trim()} role="navigation" aria-label="Pagination Navigation">
      <p className="pagination-info">
        {totalItems > 0 ? (
          <>
            Showing <strong>{startRecord}</strong>–<strong>{endRecord}</strong> of{" "}
            <strong>{totalItems}</strong> entries
          </>
        ) : (
          `Page ${currentPage} of ${totalPages}`
        )}
      </p>

      <div className="pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="pagination-btn pagination-prev"
        >
          <Icon name="chevronLeft" size={16} aria-hidden="true" />
          <span>Previous</span>
        </button>

        {visiblePages[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange?.(1)}
              className="pagination-btn pagination-num"
              aria-label="Go to page 1"
            >
              1
            </button>
            {visiblePages[0] > 2 && <span className="pagination-ellipsis" aria-hidden="true">…</span>}
          </>
        )}

        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange?.(page)}
            className={`pagination-btn pagination-num ${page === currentPage ? "active-page" : ""}`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="pagination-ellipsis" aria-hidden="true">…</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange?.(totalPages)}
              className="pagination-btn pagination-num"
              aria-label={`Go to page ${totalPages}`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="pagination-btn pagination-next"
        >
          <span>Next</span>
          <Icon name="chevronRight" size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;

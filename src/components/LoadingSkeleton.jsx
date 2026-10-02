/**
 * Standardized LoadingSkeleton Component
 *
 * Provides smooth, non-intrusive loading state placeholders for tables,
 * stat cards, and detail sections. Respects prefers-reduced-motion.
 */
function LoadingSkeleton({
  type = "card",
  rows = 4,
  columns = 5,
  count = 4,
  className = "",
  style = {},
}) {
  if (type === "table") {
    return (
      <div className={`skeleton-table ${className}`} style={style} aria-busy="true" aria-label="Loading table data">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="skeleton-table-row">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="skeleton-pulse"
                style={{
                  height: "16px",
                  borderRadius: "4px",
                  width: cIdx === 0 ? "70%" : cIdx === columns - 1 ? "40%" : "85%",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className={`stats-grid ${className}`} style={style} aria-busy="true" aria-label="Loading statistics">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="stat-card skeleton-card">
            <div className="skeleton-pulse" style={{ width: "36px", height: "36px", borderRadius: "8px", marginBottom: "14px" }} />
            <div className="skeleton-pulse" style={{ width: "60%", height: "14px", borderRadius: "4px", marginBottom: "10px" }} />
            <div className="skeleton-pulse" style={{ width: "40%", height: "26px", borderRadius: "6px" }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "detail") {
    return (
      <div className={`dashboard-section ${className}`} style={style} aria-busy="true" aria-label="Loading record details">
        <div className="skeleton-pulse" style={{ width: "35%", height: "22px", borderRadius: "6px", marginBottom: "20px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx}>
              <div className="skeleton-pulse" style={{ width: "45%", height: "12px", borderRadius: "4px", marginBottom: "6px" }} />
              <div className="skeleton-pulse" style={{ width: "80%", height: "16px", borderRadius: "4px" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default line
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        height: "16px",
        borderRadius: "4px",
        width: "100%",
        ...style,
      }}
      aria-busy="true"
    />
  );
}

export default LoadingSkeleton;

import React, { useState } from "react";

/**
 * Currency Formatter
 */
function formatCurrency(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

/**
 * Accessible Interactive Tooltip Component
 */
function ChartTooltip({ active, title, items, position }) {
  if (!active || !title) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${position?.x || 50}%`,
        top: `${position?.y || 0}%`,
        transform: "translate(-50%, -115%)",
        backgroundColor: "#0f172a",
        color: "#ffffff",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)",
        pointerEvents: "none",
        zIndex: 50,
        whiteSpace: "nowrap",
      }}
      role="tooltip"
    >
      <div style={{ fontWeight: 700, borderBottom: "1px solid #334155", paddingBottom: "4px", marginBottom: "4px" }}>
        {title}
      </div>
      {Array.isArray(items) &&
        items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "12px", margin: "2px 0" }}>
            <span style={{ color: "#94a3b8" }}>{item.label}:</span>
            <strong style={{ color: item.color || "#38bdf8" }}>{item.value}</strong>
          </div>
        ))}
    </div>
  );
}

/**
 * Loading Skeleton Box
 */
export function ChartSkeleton({ height = 240 }) {
  return (
    <div
      style={{
        height: `${height}px`,
        width: "100%",
        backgroundColor: "#f1f5f9",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: "13px",
        animation: "pulse 1.5s infinite ease-in-out",
      }}
    >
      <span>Loading visualization...</span>
    </div>
  );
}

/**
 * Empty State Container
 */
export function ChartEmptyState({ height = 200, message = "No data available for this period." }) {
  return (
    <div
      style={{
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        border: "1px dashed #cbd5e1",
        borderRadius: "8px",
        color: "#64748b",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>{message}</p>
    </div>
  );
}

/**
 * Error State Container
 */
export function ChartErrorState({ height = 200, message = "Failed to render chart data." }) {
  return (
    <div
      style={{
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        color: "#b91c1c",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Analytics Unavailable</p>
      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#7f1d1d" }}>{message}</p>
    </div>
  );
}

/**
 * 1. Line/Area Chart Component
 */
export function LineAreaChart({ title, description, data = [], xKey = "month", yKey = "count", yLabel = "Patients", color = "#2563eb" }) {
  const [tooltip, setTooltip] = useState({ active: false, title: "", items: [], position: { x: 0, y: 0 } });

  if (!Array.isArray(data) || data.length === 0) {
    return <ChartEmptyState message={`No ${title?.toLowerCase() || "data"} recorded.`} />;
  }

  const values = data.map((d) => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 5);
  const padding = 35;
  const width = 500;
  const height = 200;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const val = Number(d[yKey]) || 0;
    const y = height - padding - (val / maxVal) * (height - padding * 2);
    return { x, y, val, label: d[xKey] };
  });

  const pathD = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {title && (
        <div style={{ marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>{title}</h4>
          {description && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{description}</p>}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <ChartTooltip active={tooltip.active} title={tooltip.title} items={tooltip.items} position={tooltip.position} />

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={title}>
          {/* Background Grid Lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Area Fill */}
          <path d={areaD} fill={color} fillOpacity="0.12" />

          {/* Line Stroke */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Data Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill="#ffffff"
                stroke={color}
                strokeWidth="3"
                style={{ cursor: "pointer", transition: "transform 0.15s ease" }}
                tabIndex={0}
                role="button"
                aria-label={`${pt.label}: ${pt.val} ${yLabel}`}
                onMouseEnter={() =>
                  setTooltip({
                    active: true,
                    title: pt.label,
                    items: [{ label: yLabel, value: pt.val, color }],
                    position: { x: (pt.x / width) * 100, y: (pt.y / height) * 100 },
                  })
                }
                onMouseLeave={() => setTooltip((prev) => ({ ...prev, active: false }))}
                onFocus={() =>
                  setTooltip({
                    active: true,
                    title: pt.label,
                    items: [{ label: yLabel, value: pt.val, color }],
                    position: { x: (pt.x / width) * 100, y: (pt.y / height) * 100 },
                  })
                }
                onBlur={() => setTooltip((prev) => ({ ...prev, active: false }))}
              />
              <text x={pt.x} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/**
 * 2. Bar Chart Component
 */
export function BarChart({ title, description, data = [], xKey = "department", yKey = "count", yLabel = "Count", color = "#0f766e" }) {
  const [tooltip, setTooltip] = useState({ active: false, title: "", items: [], position: { x: 0, y: 0 } });

  if (!Array.isArray(data) || data.length === 0) {
    return <ChartEmptyState message={`No ${title?.toLowerCase() || "data"} available.`} />;
  }

  const values = data.map((d) => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const width = 500;
  const height = 220;
  const padding = 35;
  const barWidth = Math.min((width - padding * 2) / data.length - 12, 45);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {title && (
        <div style={{ marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>{title}</h4>
          {description && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{description}</p>}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <ChartTooltip active={tooltip.active} title={tooltip.title} items={tooltip.items} position={tooltip.position} />

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={title}>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />

          {data.map((d, idx) => {
            const val = Number(d[yKey]) || 0;
            const barH = (val / maxVal) * (height - padding * 2);
            const x = padding + (idx / data.length) * (width - padding * 2) + 8;
            const y = height - padding - barH;

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={Math.max(barWidth, 8)}
                  height={Math.max(barH, 2)}
                  rx="4"
                  fill={color}
                  style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${d[xKey]}: ${val} ${yLabel}`}
                  onMouseEnter={() =>
                    setTooltip({
                      active: true,
                      title: d[xKey],
                      items: [{ label: yLabel, value: val, color }],
                      position: { x: ((x + barWidth / 2) / width) * 100, y: (y / height) * 100 },
                    })
                  }
                  onMouseLeave={() => setTooltip((prev) => ({ ...prev, active: false }))}
                  onFocus={() =>
                    setTooltip({
                      active: true,
                      title: d[xKey],
                      items: [{ label: yLabel, value: val, color }],
                      position: { x: ((x + barWidth / 2) / width) * 100, y: (y / height) * 100 },
                    })
                  }
                  onBlur={() => setTooltip((prev) => ({ ...prev, active: false }))}
                />
                <text
                  x={x + barWidth / 2}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#475569"
                  fontWeight="500"
                  style={{ pointerEvents: "none" }}
                >
                  {String(d[xKey]).length > 10 ? `${String(d[xKey]).slice(0, 9)}…` : d[xKey]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * 3. Donut Distribution Chart Component
 */
export function DonutChart({ title, description, data = [], nameKey = "status", valueKey = "count", colors = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea"] }) {
  const [tooltip, setTooltip] = useState({ active: false, title: "", items: [], position: { x: 0, y: 0 } });

  if (!Array.isArray(data) || data.length === 0) {
    return <ChartEmptyState message={`No ${title?.toLowerCase() || "distribution"} data.`} />;
  }

  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);
  if (total === 0) {
    return <ChartEmptyState message={`No recorded entries for ${title?.toLowerCase() || "chart"}.`} />;
  }

  let accumulatedAngle = 0;
  const slices = data.map((d, idx) => {
    const val = Number(d[valueKey]) || 0;
    const percentage = (val / total) * 100;
    const angle = (val / total) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      name: d[nameKey],
      val,
      percentage: percentage.toFixed(1),
      startAngle,
      endAngle: accumulatedAngle,
      color: colors[idx % colors.length],
    };
  });

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {title && (
        <div style={{ marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>{title}</h4>
          {description && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{description}</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ position: "relative", width: "160px", height: "160px", flexShrink: 0 }}>
          <ChartTooltip active={tooltip.active} title={tooltip.title} items={tooltip.items} position={tooltip.position} />

          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} role="img" aria-label={title}>
            {slices.map((slice, idx) => {
              const x1 = 50 + 40 * Math.cos((Math.PI * slice.startAngle) / 180);
              const y1 = 50 + 40 * Math.sin((Math.PI * slice.startAngle) / 180);
              const x2 = 50 + 40 * Math.cos((Math.PI * slice.endAngle) / 180);
              const y2 = 50 + 40 * Math.sin((Math.PI * slice.endAngle) / 180);
              const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

              return (
                <path
                  key={idx}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${slice.name}: ${slice.val} (${slice.percentage}%)`}
                  onMouseEnter={() =>
                    setTooltip({
                      active: true,
                      title: slice.name,
                      items: [
                        { label: "Count", value: slice.val, color: slice.color },
                        { label: "Share", value: `${slice.percentage}%`, color: slice.color },
                      ],
                      position: { x: 50, y: 50 },
                    })
                  }
                  onMouseLeave={() => setTooltip((prev) => ({ ...prev, active: false }))}
                  onFocus={() =>
                    setTooltip({
                      active: true,
                      title: slice.name,
                      items: [
                        { label: "Count", value: slice.val, color: slice.color },
                        { label: "Share", value: `${slice.percentage}%`, color: slice.color },
                      ],
                      position: { x: 50, y: 50 },
                    })
                  }
                  onBlur={() => setTooltip((prev) => ({ ...prev, active: false }))}
                />
              );
            })}
            <circle cx="50" cy="50" r="24" fill="#ffffff" />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>{total}</span>
            <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Total</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "150px" }}>
          {slices.map((slice, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: slice.color }} />
                <span style={{ color: "#334155", fontWeight: 500 }}>{slice.name}</span>
              </div>
              <strong style={{ color: "#0f172a" }}>{slice.val}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 4. Multi-Series Financial Comparison Chart
 */
export function FinancialBarChart({ title, description, data = [] }) {
  const [tooltip, setTooltip] = useState({ active: false, title: "", items: [], position: { x: 0, y: 0 } });

  if (!Array.isArray(data) || data.length === 0) {
    return <ChartEmptyState message="No financial data available for comparison." />;
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.billed || 0, d.collected || 0, d.balance || 0)), 100);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {title && (
        <div style={{ marginBottom: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>{title}</h4>
          {description && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{description}</p>}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <ChartTooltip active={tooltip.active} title={tooltip.title} items={tooltip.items} position={tooltip.position} />

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data.map((item, idx) => (
            <div
              key={idx}
              style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff" }}
              onMouseEnter={() =>
                setTooltip({
                  active: true,
                  title: item.month || "Financial Month",
                  items: [
                    { label: "Total Billed", value: formatCurrency(item.billed), color: "#2563eb" },
                    { label: "Collected", value: formatCurrency(item.collected), color: "#16a34a" },
                    { label: "Balance Due", value: formatCurrency(item.balance), color: "#dc2626" },
                  ],
                  position: { x: 50, y: 50 },
                })
              }
              onMouseLeave={() => setTooltip((prev) => ({ ...prev, active: false }))}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                <span>{item.month || "Month"}</span>
                <span>Billed: {formatCurrency(item.billed)}</span>
              </div>

              {/* Progress Track */}
              <div style={{ height: "10px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${((item.collected || 0) / maxVal) * 100}%`, backgroundColor: "#16a34a" }} title={`Collected: ${formatCurrency(item.collected)}`} />
                <div style={{ width: `${((item.balance || 0) / maxVal) * 100}%`, backgroundColor: "#dc2626" }} title={`Outstanding: ${formatCurrency(item.balance)}`} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                <span style={{ color: "#15803d", fontWeight: 600 }}>Collected: {formatCurrency(item.collected)}</span>
                <span style={{ color: "#b91c1c", fontWeight: 600 }}>Outstanding: {formatCurrency(item.balance)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

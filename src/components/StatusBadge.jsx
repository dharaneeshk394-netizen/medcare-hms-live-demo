function StatusBadge({ status }) {
  const normalizedStatus = status?.toLowerCase();

  let className = "status-badge";

  if (normalizedStatus === "active") {
    className += " status-active";
  }

  if (normalizedStatus === "inactive") {
    className += " status-inactive";
  }

  if (normalizedStatus === "scheduled") {
    className += " status-scheduled";
  }

  if (normalizedStatus === "completed") {
    className += " status-completed";
  }

  if (normalizedStatus === "cancelled") {
    className += " status-cancelled";
  }

  if (normalizedStatus === "admitted") {
    className += " status-admitted";
  }

  if (normalizedStatus === "discharged") {
    className += " status-discharged";
  }

  if (normalizedStatus === "transferred") {
    className += " status-transferred";
  }

  if (normalizedStatus === "pending") {
    className += " status-pending";
  }

  if (normalizedStatus === "partial") {
    className += " status-partial";
  }

  if (normalizedStatus === "paid") {
    className += " status-paid";
  }

  if (normalizedStatus === "overdue") {
    className += " status-overdue";
  }

  if (normalizedStatus === "on_leave" || normalizedStatus === "on leave" || normalizedStatus === "leave") {
    className += " status-on-leave";
  }

  if (normalizedStatus === "archived") {
    className += " status-archived";
  }

  if (normalizedStatus === "amended") {
    className += " status-amended";
  }

  if (normalizedStatus === "success" || normalizedStatus === "available" || normalizedStatus === "normal") {
    className += " status-active";
  }

  if (normalizedStatus === "urgent" || normalizedStatus === "in_progress" || normalizedStatus === "in progress") {
    className += " status-pending";
  }

  if (normalizedStatus === "stat" || normalizedStatus === "abnormal" || normalizedStatus === "failed" || normalizedStatus === "error") {
    className += " status-cancelled";
  }

  if (normalizedStatus === "routine") {
    className += " status-scheduled";
  }

  return (
    <span className={className}>
      <span className="status-indicator" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export default StatusBadge;
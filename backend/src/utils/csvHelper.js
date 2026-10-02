/**
 * CSV Helper Utility
 * Implements RFC 4180 standard escaping, UTF-8 Byte Order Mark (BOM) for native Excel compatibility,
 * and defenses against CSV Formula Injection (DDE).
 */

/**
 * Safely escape a single value for CSV output.
 * - Handles null / undefined -> empty string
 * - Defends against CSV Formula Injection (prefixes =, +, -, @, \t, \r with single quote)
 * - Escapes double quotes by doubling them ("" -> """")
 * - Encloses values containing commas, quotes, or newlines in double quotes
 *
 * @param {any} val
 * @returns {string}
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) {
    return "";
  }

  let str = String(val);

  // CSV Formula Injection mitigation:
  // If cell value begins with =, +, -, @, \t, or \r, prepend single quote so spreadsheet engines treat it as plain text
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, newlines, or our injected leading single quote, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str) || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate full RFC 4180 CSV document string with UTF-8 BOM.
 *
 * @param {Array<{ key: string, label: string, format?: (val: any, row: Object) => any }>} columns
 * @param {Array<Object>} rows
 * @returns {string}
 */
function generateCsv(columns, rows = []) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error("CSV columns definition is required.");
  }

  const headerLine = columns.map((col) => escapeCsvValue(col.label)).join(",");

  const dataLines = (rows || []).map((row) => {
    return columns
      .map((col) => {
        const rawVal = row ? row[col.key] : "";
        const val = typeof col.format === "function" ? col.format(rawVal, row) : rawVal;
        return escapeCsvValue(val);
      })
      .join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel and other spreadsheet software properly recognize UTF-8 encoding
  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

module.exports = {
  escapeCsvValue,
  generateCsv,
};

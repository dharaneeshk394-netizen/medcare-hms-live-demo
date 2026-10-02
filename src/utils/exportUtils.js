/**
 * Frontend Export Utility
 * Triggers secure, authenticated dataset downloads with proper filename resolution and error handling.
 */

/**
 * Download an export from a backend API endpoint.
 *
 * @param {string} url - API URL with query parameters
 * @param {string} defaultFilename - Fallback filename if not specified in Content-Disposition header
 * @returns {Promise<void>}
 */
export async function downloadExport(url, defaultFilename = "medcare-export.csv") {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/csv, application/json",
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      let errorMessage = `Export failed (HTTP ${response.status})`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          if (errData && errData.message) {
            errorMessage = errData.message;
          }
        } else {
          const text = await response.text();
          if (text) errorMessage = text;
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition");
    let filename = defaultFilename;

    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (err) {
    console.error("Export download error:", err);
    throw err;
  }
}

export default {
  downloadExport,
};

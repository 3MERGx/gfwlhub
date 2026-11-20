"use client";

import { FaExclamationTriangle } from "react-icons/fa";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#121212",
          color: "#f5f5f5",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            width: "100%",
            margin: "1rem",
            padding: "2rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            background: "#202020",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#ef4444", fontSize: "3rem", marginBottom: "1rem" }}>
            <FaExclamationTriangle style={{ margin: "0 auto" }} />
          </div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a3a3a3", marginBottom: "1rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p style={{ color: "#737373", fontSize: "0.75rem", marginBottom: "1.5rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#107c10",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.75rem 1.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

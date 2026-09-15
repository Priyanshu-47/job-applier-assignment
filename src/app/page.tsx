import Link from "next/link";

export default function Home() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 40, color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 12, color: "#1a1a1a" }}>
        Job Alert System
      </h1>
      <p style={{ fontSize: 16, color: "#4a4a4a", marginBottom: 28, lineHeight: 1.5 }}>
        Create an alert from natural language, ingest jobs, run deterministic matching, then
        process the notification outbox. Use the header to move between pages at any time.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link
          href="/alerts"
          style={{
            display: "block",
            padding: 20,
            border: "1px solid #d0d5dd",
            borderRadius: 8,
            color: "#1a1a1a",
            flex: 1,
            minWidth: 240,
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8, color: "#0b57d0" }}>Create Alert</h3>
          <p style={{ color: "#4a4a4a" }}>
            Parse a job search into filters, edit them, and save.
          </p>
        </Link>

        <Link
          href="/dashboard"
          style={{
            display: "block",
            padding: 20,
            border: "1px solid #d0d5dd",
            borderRadius: 8,
            color: "#1a1a1a",
            flex: 1,
            minWidth: 240,
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8, color: "#0b57d0" }}>Dashboard</h3>
          <p style={{ color: "#4a4a4a" }}>
            Ingest jobs, run matching, send (simulated) notifications, and retry failures.
          </p>
        </Link>
      </div>
    </div>
  );
}

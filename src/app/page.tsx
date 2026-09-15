import Link from "next/link";

export default function Home() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 40 }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 20 }}>
        Job Alert System
      </h1>
      <p style={{ fontSize: 16, color: "#666", marginBottom: 30 }}>
        A scalable, AI-assisted job alert system that matches saved alerts with incoming jobs.
      </p>

      <div style={{ display: "flex", gap: 20 }}>
        <Link
          href="/alerts"
          style={{
            display: "block",
            padding: 20,
            border: "1px solid #dee2e6",
            borderRadius: 8,
            textDecoration: "none",
            color: "#333",
            flex: 1,
            textAlign: "center",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create Alert</h3>
          <p style={{ color: "#666" }}>
            Use AI to parse natural language into structured filters
          </p>
        </Link>

        <Link
          href="/dashboard"
          style={{
            display: "block",
            padding: 20,
            border: "1px solid #dee2e6",
            borderRadius: 8,
            textDecoration: "none",
            color: "#333",
            flex: 1,
            textAlign: "center",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Dashboard</h3>
          <p style={{ color: "#666" }}>
            View alerts, run matching, and process notifications
          </p>
        </Link>
      </div>
    </div>
  );
}

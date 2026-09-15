"use client";

import { useState, useEffect } from "react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remoteStatus: string;
  skills: string[];
  contentHash: string;
  createdAt: string;
}

interface Alert {
  id: string;
  name: string;
  rawQuery: string;
  filters: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

interface OutboxStats {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [outboxStats, setOutboxStats] = useState<OutboxStats | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState({
    jobs: false,
    alerts: false,
    matches: false,
    outbox: false,
  });

  const fetchData = async () => {
    try {
      const [alertsRes, outboxRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch("/api/outbox/stats"),
      ]);

      const alertsData = await alertsRes.json();
      const outboxData = await outboxRes.json();

      setAlerts(alertsData.alerts || []);
      setOutboxStats(outboxData.stats);
    } catch (error) {
      console.error("Fetch data error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runMatching = async () => {
    setLoading((prev) => ({ ...prev, matches: true }));
    try {
      const response = await fetch("/api/matches/run", { method: "POST" });
      const data = await response.json();
      setMatchResults(data);
      fetchData();
    } catch (error) {
      console.error("Run matching error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, matches: false }));
    }
  };

  const processOutbox = async () => {
    setLoading((prev) => ({ ...prev, outbox: true }));
    try {
      await fetch("/api/outbox/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 100 }),
      });
      fetchData();
    } catch (error) {
      console.error("Process outbox error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, outbox: false }));
    }
  };

  const ingestSampleJobs = async () => {
    setLoading((prev) => ({ ...prev, jobs: true }));
    const sampleJobs = [
      {
        externalId: "job-001",
        title: "Senior Python Developer",
        company: "TechCorp",
        description: "We are looking for a senior Python developer with experience in Django and FastAPI",
        location: "Bengaluru, India",
        remoteStatus: "remote",
        skills: ["python", "django", "fastapi", "postgresql"],
      },
      {
        externalId: "job-002",
        title: "Full Stack Engineer",
        company: "StartupXYZ",
        description: "Full stack developer with React and Node.js experience",
        location: "San Francisco, CA",
        remoteStatus: "hybrid",
        skills: ["react", "node.js", "typescript", "mongodb"],
      },
      {
        externalId: "job-003",
        title: "Python Data Engineer",
        company: "DataCo",
        description: "Build data pipelines using Python and Apache Spark",
        location: "Remote",
        remoteStatus: "remote",
        skills: ["python", "apache spark", "sql", "aws"],
      },
      {
        externalId: "job-004",
        title: "Junior Python Developer",
        company: "JuniorTech",
        description: "Entry level Python position for recent graduates",
        location: "New York, NY",
        remoteStatus: "onsite",
        skills: ["python", "flask", "git"],
      },
      {
        externalId: "job-005",
        title: "Senior Backend Engineer",
        company: "BigTech",
        description: "Senior backend engineer with Go and Python experience",
        location: "Seattle, WA",
        remoteStatus: "remote",
        skills: ["go", "python", "kubernetes", "docker"],
      },
    ];

    try {
      const response = await fetch("/api/jobs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: sampleJobs }),
      });
      const data = await response.json();
      console.log("Ingestion result:", data);
      fetchData();
    } catch (error) {
      console.error("Ingest jobs error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, jobs: false }));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Job Alert Dashboard
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ padding: 16, border: "1px solid #dee2e6", borderRadius: 4 }}>
          <h3 style={{ marginTop: 0 }}>Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p style={{ color: "#666" }}>No alerts created yet</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  style={{ padding: 8, borderBottom: "1px solid #eee" }}
                >
                  <strong>{alert.name}</strong>
                  <br />
                  <small style={{ color: "#666" }}>{alert.rawQuery}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ padding: 16, border: "1px solid #dee2e6", borderRadius: 4 }}>
          <h3 style={{ marginTop: 0 }}>Notification Outbox</h3>
          {outboxStats ? (
            <div>
              <p>Total: {outboxStats.total}</p>
              <p>Pending: {outboxStats.pending}</p>
              <p>Processing: {outboxStats.processing}</p>
              <p style={{ color: "#28a745" }}>Sent: {outboxStats.sent}</p>
              <p style={{ color: "#dc3545" }}>Failed: {outboxStats.failed}</p>
            </div>
          ) : (
            <p style={{ color: "#666" }}>Loading...</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <button
          onClick={ingestSampleJobs}
          disabled={loading.jobs}
          style={{
            padding: "10px 16px",
            background: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading.jobs ? "not-allowed" : "pointer",
          }}
        >
          {loading.jobs ? "Ingesting..." : "Ingest Sample Jobs"}
        </button>

        <button
          onClick={runMatching}
          disabled={loading.matches}
          style={{
            padding: "10px 16px",
            background: "#ffc107",
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: loading.matches ? "not-allowed" : "pointer",
          }}
        >
          {loading.matches ? "Running..." : "Run Matching"}
        </button>

        <button
          onClick={processOutbox}
          disabled={loading.outbox}
          style={{
            padding: "10px 16px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading.outbox ? "not-allowed" : "pointer",
          }}
        >
          {loading.outbox ? "Processing..." : "Process Outbox"}
        </button>
      </div>

      {matchResults && (
        <div
          style={{
            padding: 16,
            background: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Match Results</h3>
          <pre style={{ fontSize: 12, overflow: "auto" }}>
            {JSON.stringify(matchResults, null, 2) as string}
          </pre>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, type CSSProperties } from "react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remoteStatus: string;
  skills: string[];
}

interface Alert {
  id: string;
  name: string;
  rawQuery: string;
}

interface OutboxStats {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

interface MatchRow {
  alertId: string;
  alertName: string;
  totalJobs: number;
  matchedJobs: number;
  newMatches: number;
}

interface MatchPayload {
  success: boolean;
  results: MatchRow[];
  summary: {
    totalAlerts: number;
    totalNewMatches: number;
    totalMatchedJobs: number;
  };
}

interface IngestCounts {
  new: number;
  contentChanged: number;
  freshnessOnly: number;
  unchanged: number;
  rejected: number;
}

interface ActionNote {
  kind: "info" | "ok" | "warn" | "error";
  text: string;
}

const panel: CSSProperties = {
  padding: 16,
  border: "1px solid #d0d5dd",
  borderRadius: 8,
  background: "#ffffff",
  color: "#1a1a1a",
};

const btn = (bg: string, fg = "#ffffff"): CSSProperties => ({
  padding: "10px 14px",
  background: bg,
  color: fg,
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
});

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [outboxStats, setOutboxStats] = useState<OutboxStats | null>(null);
  const [matchPayload, setMatchPayload] = useState<MatchPayload | null>(null);
  const [ingestCounts, setIngestCounts] = useState<IngestCounts | null>(null);
  const [outboxResult, setOutboxResult] = useState<{
    processed: number;
    sent: number;
    failed: number;
    retried: number;
  } | null>(null);
  const [note, setNote] = useState<ActionNote | null>(null);
  const [loading, setLoading] = useState({
    jobs: false,
    matches: false,
    outbox: false,
  });

  const fetchData = async () => {
    try {
      const [alertsRes, outboxRes, jobsRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch("/api/outbox/stats"),
        fetch("/api/jobs"),
      ]);
      const alertsData = await alertsRes.json();
      const outboxData = await outboxRes.json();
      const jobsData = await jobsRes.json();
      setAlerts(alertsData.alerts || []);
      setOutboxStats(outboxData.stats);
      setJobs(jobsData.jobs || []);
    } catch (error) {
      setNote({ kind: "error", text: "Could not load dashboard data." });
      console.error("Fetch data error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runMatching = async () => {
    setLoading((prev) => ({ ...prev, matches: true }));
    setNote(null);
    try {
      const response = await fetch("/api/matches/run", { method: "POST" });
      const data = (await response.json()) as MatchPayload;
      setMatchPayload(data);
      const created = data.summary?.totalNewMatches ?? 0;
      if (created > 0) {
        setNote({
          kind: "ok",
          text: `Matching finished. ${created} new notification(s) queued in the outbox.`,
        });
      } else {
        setNote({
          kind: "info",
          text: "Matching finished with 0 new notifications. Those alert/job pairs were already recorded (idempotent — not a failure). To demo failure/retry, use Simulate send failure below.",
        });
      }
      await fetchData();
    } catch (error) {
      setNote({ kind: "error", text: "Matching request failed." });
      console.error("Run matching error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, matches: false }));
    }
  };

  const processOutbox = async (simulateFailure: boolean) => {
    setLoading((prev) => ({ ...prev, outbox: true }));
    setNote(null);
    try {
      const response = await fetch("/api/outbox/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 100, simulateFailure }),
      });
      const data = await response.json();
      setOutboxResult({
        processed: data.processed ?? 0,
        sent: data.sent ?? 0,
        failed: data.failed ?? 0,
        retried: data.retried ?? 0,
      });
      if (simulateFailure) {
        setNote({
          kind: "warn",
          text: `Simulated provider failure. Processed ${data.processed ?? 0}: ${data.retried ?? 0} left pending for retry, ${data.failed ?? 0} permanently failed. Click Process Outbox to retry.`,
        });
      } else if ((data.processed ?? 0) === 0) {
        setNote({
          kind: "info",
          text: "No pending or retryable outbox rows. Ingest jobs, run matching, or simulate a failure first.",
        });
      } else {
        setNote({
          kind: "ok",
          text: `Outbox processed: ${data.sent ?? 0} sent, ${data.retried ?? 0} queued for retry, ${data.failed ?? 0} failed.`,
        });
      }
      await fetchData();
    } catch (error) {
      setNote({ kind: "error", text: "Outbox processing failed." });
      console.error("Process outbox error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, outbox: false }));
    }
  };

  const ingestSampleJobs = async () => {
    setLoading((prev) => ({ ...prev, jobs: true }));
    setNote(null);
    const sampleJobs = [
      {
        externalId: "job-001",
        title: "Senior Python Developer",
        company: "TechCorp",
        description:
          "We are looking for a senior Python developer with experience in Django and FastAPI",
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
      setIngestCounts(data.counts || null);
      const c = data.counts || {};
      setNote({
        kind: "ok",
        text: `Ingest finished — new ${c.new ?? 0}, content changed ${c.contentChanged ?? 0}, freshness-only ${c.freshnessOnly ?? 0}, unchanged ${c.unchanged ?? 0}, rejected ${c.rejected ?? 0}.`,
      });
      await fetchData();
    } catch (error) {
      setNote({ kind: "error", text: "Ingest failed." });
      console.error("Ingest jobs error:", error);
    } finally {
      setLoading((prev) => ({ ...prev, jobs: false }));
    }
  };

  const noteStyle = (kind: ActionNote["kind"]): CSSProperties => {
    if (kind === "ok") return { background: "#e6f4ea", border: "1px solid #b7e0c2", color: "#0d5c2e" };
    if (kind === "warn") return { background: "#fff4e5", border: "1px solid #f5c16c", color: "#7a4b00" };
    if (kind === "error") return { background: "#fdecea", border: "1px solid #f5c2c0", color: "#8a1f11" };
    return { background: "#e8f0fe", border: "1px solid #aecbfa", color: "#174ea6" };
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: 24, color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>Job Alert Dashboard</h1>
      <p style={{ color: "#4a4a4a", marginBottom: 16 }}>
        1) Ingest jobs → 2) Run matching → 3) Process outbox. A second matching run with 0 new
        matches means dedup worked. Use Simulate send failure, then Process Outbox, to show retry.
      </p>

      {note && (
        <div style={{ ...noteStyle(note.kind), padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {note.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={ingestSampleJobs} disabled={loading.jobs} style={btn("#0b57d0")}>
          {loading.jobs ? "Ingesting..." : "Ingest Sample Jobs"}
        </button>
        <button onClick={runMatching} disabled={loading.matches} style={btn("#e37400")}>
          {loading.matches ? "Running..." : "Run Matching"}
        </button>
        <button onClick={() => processOutbox(false)} disabled={loading.outbox} style={btn("#137333")}>
          {loading.outbox ? "Processing..." : "Process Outbox"}
        </button>
        <button onClick={() => processOutbox(true)} disabled={loading.outbox} style={btn("#c5221f")}>
          Simulate send failure
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={panel}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p style={{ color: "#4a4a4a" }}>No alerts yet. Use Create Alert in the header.</p>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {alerts.map((alert) => (
                <li key={alert.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <strong>{alert.name}</strong>
                  <br />
                  <small style={{ color: "#4a4a4a" }}>{alert.rawQuery}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={panel}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Notification Outbox</h3>
          {outboxStats ? (
            <div style={{ lineHeight: 1.7 }}>
              <div>Total: {outboxStats.total}</div>
              <div>Pending (retryable): {outboxStats.pending}</div>
              <div>Processing: {outboxStats.processing}</div>
              <div style={{ color: "#137333" }}>Sent: {outboxStats.sent}</div>
              <div style={{ color: "#c5221f" }}>Failed: {outboxStats.failed}</div>
            </div>
          ) : (
            <p style={{ color: "#4a4a4a" }}>Loading...</p>
          )}
          {outboxResult && (
            <p style={{ marginTop: 12, color: "#4a4a4a" }}>
              Last batch — processed {outboxResult.processed}, sent {outboxResult.sent}, retried{" "}
              {outboxResult.retried}, failed {outboxResult.failed}.
            </p>
          )}
        </div>
      </div>

      <div style={{ ...panel, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Ingested jobs ({jobs.length})</h3>
        {ingestCounts && (
          <p style={{ color: "#4a4a4a", marginBottom: 8 }}>
            Last ingest: new {ingestCounts.new}, changed {ingestCounts.contentChanged}, freshness{" "}
            {ingestCounts.freshnessOnly}, unchanged {ingestCounts.unchanged}, rejected{" "}
            {ingestCounts.rejected}.
          </p>
        )}
        {jobs.length === 0 ? (
          <p style={{ color: "#4a4a4a" }}>None yet. Click Ingest Sample Jobs.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #d0d5dd" }}>
                <th style={{ padding: 8 }}>Title</th>
                <th style={{ padding: 8 }}>Company</th>
                <th style={{ padding: 8 }}>Location</th>
                <th style={{ padding: 8 }}>Remote</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{job.title}</td>
                  <td style={{ padding: 8 }}>{job.company}</td>
                  <td style={{ padding: 8 }}>{job.location}</td>
                  <td style={{ padding: 8 }}>{job.remoteStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {matchPayload && (
        <div style={panel}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Match results</h3>
          <p style={{ color: "#4a4a4a", marginBottom: 12 }}>
            {matchPayload.summary.totalNewMatches} new notification(s) this run.{" "}
            {matchPayload.summary.totalMatchedJobs} matcher hit(s) across{" "}
            {matchPayload.summary.totalAlerts} alert(s). Hits without new notifications were already
            in the outbox.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #d0d5dd" }}>
                <th style={{ padding: 8 }}>Alert</th>
                <th style={{ padding: 8 }}>Jobs scanned</th>
                <th style={{ padding: 8 }}>Matched</th>
                <th style={{ padding: 8 }}>New notifications</th>
              </tr>
            </thead>
            <tbody>
              {matchPayload.results.map((row) => (
                <tr key={row.alertId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{row.alertName}</td>
                  <td style={{ padding: 8 }}>{row.totalJobs}</td>
                  <td style={{ padding: 8 }}>{row.matchedJobs}</td>
                  <td style={{ padding: 8 }}>{row.newMatches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

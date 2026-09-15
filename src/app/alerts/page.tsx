"use client";

import { useState } from "react";

interface ParsedFilters {
  roles: string[];
  skills: string[];
  industries: string[];
  locations: string[];
  remotePreference: "required" | "allowed" | "not_allowed";
  excludeTerms: string[];
  minSalary?: number;
}

interface ParseResult {
  success: boolean;
  filters: ParsedFilters | null;
  rawQuery: string;
  error?: string;
  observability: {
    model: string;
    provider: string;
    latencyMs: number;
    success: boolean;
  };
}

export default function AlertsPage() {
  const [query, setQuery] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editedFilters, setEditedFilters] = useState<ParsedFilters | null>(null);
  const [alertName, setAlertName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    if (!query.trim()) return;

    setParsing(true);
    setParseResult(null);
    setEditedFilters(null);
    setSaved(false);

    try {
      const response = await fetch("/api/alerts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setParseResult(data);
      if (data.filters) {
        setEditedFilters({ ...data.filters });
      }
    } catch (error) {
      console.error("Parse error:", error);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!editedFilters || !query) return;

    setSaving(true);
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: alertName || query.slice(0, 100),
          rawQuery: query,
          filters: editedFilters,
        }),
      });

      if (response.ok) {
        setSaved(true);
        setQuery("");
        setParseResult(null);
        setEditedFilters(null);
        setAlertName("");
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateFilter = (key: keyof ParsedFilters, value: unknown) => {
    if (!editedFilters) return;
    setEditedFilters({ ...editedFilters, [key]: value });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Create Job Alert
      </h1>

      {saved && (
        <div
          style={{
            padding: 12,
            background: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          Alert saved successfully!
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          Describe your ideal job:
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g., "Remote senior Python developer in fintech, excluding internships"'
          style={{
            width: "100%",
            minHeight: 80,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <button
          onClick={handleParse}
          disabled={!query.trim() || parsing}
          style={{
            marginTop: 8,
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: parsing ? "not-allowed" : "pointer",
            opacity: parsing ? 0.6 : 1,
          }}
        >
          {parsing ? "Parsing..." : "Parse with AI"}
        </button>
      </div>

      {parseResult && (
        <div
          style={{
            padding: 16,
            background: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>
            {parseResult.success ? "Parsed Successfully" : "Parse Result (Fallback)"}
          </h3>
          {parseResult.error && (
            <p style={{ color: "#dc3545", marginBottom: 8 }}>{parseResult.error}</p>
          )}
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Provider: {parseResult.observability.provider} | Model:{" "}
            {parseResult.observability.model} | Latency:{" "}
            {parseResult.observability.latencyMs}ms
          </div>
        </div>
      )}

      {editedFilters && (
        <div
          style={{
            padding: 16,
            border: "1px solid #dee2e6",
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Review & Edit Filters</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Alert Name:
            </label>
            <input
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Give your alert a name"
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Roles:
            </label>
            <input
              type="text"
              value={editedFilters.roles.join(", ")}
              onChange={(e) =>
                updateFilter(
                  "roles",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Skills:
            </label>
            <input
              type="text"
              value={editedFilters.skills.join(", ")}
              onChange={(e) =>
                updateFilter(
                  "skills",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Locations:
            </label>
            <input
              type="text"
              value={editedFilters.locations.join(", ")}
              onChange={(e) =>
                updateFilter(
                  "locations",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Industries:
            </label>
            <input
              type="text"
              value={editedFilters.industries.join(", ")}
              onChange={(e) =>
                updateFilter(
                  "industries",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Remote Preference:
            </label>
            <select
              value={editedFilters.remotePreference}
              onChange={(e) => updateFilter("remotePreference", e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            >
              <option value="allowed">Allowed</option>
              <option value="required">Required</option>
              <option value="not_allowed">Not Allowed</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              Exclude Terms:
            </label>
            <input
              type="text"
              value={editedFilters.excludeTerms.join(", ")}
              onChange={(e) =>
                updateFilter(
                  "excludeTerms",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Alert"}
          </button>
        </div>
      )}
    </div>
  );
}

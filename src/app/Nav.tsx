import Link from "next/link";

export default function Nav() {
  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #d0d5dd",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <Link href="/" style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 18 }}>
        Job Alert System
      </Link>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link
          href="/alerts"
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #0b57d0",
            background: "#0b57d0",
            color: "#ffffff",
            fontWeight: 600,
          }}
        >
          Create Alert
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #0b57d0",
            background: "#ffffff",
            color: "#0b57d0",
            fontWeight: 600,
          }}
        >
          Dashboard
        </Link>
      </nav>
    </header>
  );
}

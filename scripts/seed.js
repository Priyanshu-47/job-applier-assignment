const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const { createHash } = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/job_alerts",
});

function computeContentHash(job) {
  const content = JSON.stringify({
    title: job.title.toLowerCase().trim(),
    company: job.company.toLowerCase().trim(),
    description: job.description.toLowerCase().trim(),
    location: job.location.toLowerCase().trim(),
    remoteStatus: job.remoteStatus.toLowerCase().trim(),
    skills: job.skills.map((s) => s.toLowerCase().trim()).sort(),
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
  });
  return createHash("sha256").update(content).digest("hex");
}

const sampleJobs = [
  {
    externalId: "seed-001",
    title: "Senior Python Developer",
    company: "FinTech Corp",
    description: "We are looking for a senior Python developer with experience in Django and FastAPI to build our next-generation financial platform.",
    location: "Bengaluru, India",
    remoteStatus: "remote",
    skills: ["python", "django", "fastapi", "postgresql"],
  },
  {
    externalId: "seed-002",
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    description: "Full stack developer with React and Node.js experience needed for our growing team.",
    location: "San Francisco, CA",
    remoteStatus: "hybrid",
    skills: ["react", "node.js", "typescript", "mongodb"],
  },
  {
    externalId: "seed-003",
    title: "Python Data Engineer",
    company: "DataCo",
    description: "Build and maintain data pipelines using Python and Apache Spark for our analytics platform.",
    location: "Remote",
    remoteStatus: "remote",
    skills: ["python", "apache spark", "sql", "aws"],
  },
  {
    externalId: "seed-004",
    title: "Junior Python Developer",
    company: "JuniorTech",
    description: "Entry level Python position for recent graduates. Great opportunity to learn and grow.",
    location: "New York, NY",
    remoteStatus: "onsite",
    skills: ["python", "flask", "git"],
  },
  {
    externalId: "seed-005",
    title: "Senior Backend Engineer",
    company: "BigTech Inc",
    description: "Senior backend engineer with Go and Python experience to work on distributed systems.",
    location: "Seattle, WA",
    remoteStatus: "remote",
    skills: ["go", "python", "kubernetes", "docker"],
  },
  {
    externalId: "seed-006",
    title: "DevOps Engineer",
    company: "CloudFirst",
    description: "DevOps engineer with Kubernetes and AWS experience to manage our cloud infrastructure.",
    location: "Austin, TX",
    remoteStatus: "remote",
    skills: ["kubernetes", "aws", "docker", "terraform"],
  },
  {
    externalId: "seed-007",
    title: "Machine Learning Engineer",
    company: "AI Solutions",
    description: "ML engineer with Python and TensorFlow experience to build production ML models.",
    location: "Boston, MA",
    remoteStatus: "hybrid",
    skills: ["python", "tensorflow", "pytorch", "machine learning"],
  },
  {
    externalId: "seed-008",
    title: "Frontend Developer",
    company: "WebAgency",
    description: "Frontend developer with React and TypeScript experience for client projects.",
    location: "Chicago, IL",
    remoteStatus: "onsite",
    skills: ["react", "typescript", "css", "javascript"],
  },
  {
    externalId: "seed-009",
    title: "Cloud Architect",
    company: "Enterprise Corp",
    description: "Cloud architect with AWS and Azure experience to design enterprise solutions.",
    location: "Dallas, TX",
    remoteStatus: "remote",
    skills: ["aws", "azure", "kubernetes", "terraform"],
  },
  {
    externalId: "seed-010",
    title: "Python Intern",
    company: "InternTech",
    description: "Summer internship for Python developers. Learn from experienced engineers.",
    location: "Portland, OR",
    remoteStatus: "hybrid",
    skills: ["python", "git", "linux"],
  },
];

const sampleAlerts = [
  {
    name: "Remote Python Jobs",
    rawQuery: "Remote Python developer jobs in fintech, excluding internships",
    filters: {
      roles: ["python developer"],
      skills: ["python"],
      industries: ["fintech"],
      locations: [],
      remotePreference: "required",
      excludeTerms: ["internship"],
    },
  },
  {
    name: "Senior Full Stack",
    rawQuery: "Senior full stack developer with React and Node.js",
    filters: {
      roles: ["full stack developer", "senior developer"],
      skills: ["react", "node.js"],
      industries: [],
      locations: [],
      remotePreference: "allowed",
      excludeTerms: ["intern", "junior"],
    },
  },
  {
    name: "DevOps in Texas",
    rawQuery: "DevOps engineer in Austin or Dallas, remote allowed",
    filters: {
      roles: ["devops engineer"],
      skills: ["kubernetes", "aws", "docker"],
      industries: [],
      locations: ["Austin", "Dallas"],
      remotePreference: "allowed",
      excludeTerms: [],
    },
  },
];

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Seed jobs
    for (const job of sampleJobs) {
      const contentHash = computeContentHash(job);
      await client.query(
        `INSERT INTO jobs (id, external_id, title, company, description, location, remote_status, skills, content_hash, observed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (external_id) DO NOTHING`,
        [
          uuidv4(),
          job.externalId,
          job.title,
          job.company,
          job.description,
          job.location,
          job.remoteStatus,
          job.skills,
          contentHash,
        ]
      );
    }

    // Seed alerts
    for (const alert of sampleAlerts) {
      await client.query(
        `INSERT INTO alerts (id, user_id, name, raw_query, filters)
         VALUES ($1, 'default-user', $2, $3, $4)`,
        [uuidv4(), alert.name, alert.rawQuery, JSON.stringify(alert.filters)]
      );
    }

    await client.query("COMMIT");
    console.log("Seed completed successfully!");
    console.log(`- ${sampleJobs.length} jobs seeded`);
    console.log(`- ${sampleAlerts.length} alerts seeded`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

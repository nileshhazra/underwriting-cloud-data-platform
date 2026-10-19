# 🎙️ Technical Interview Preparation Guide
## End-to-End Insurance Underwriting Cloud Data Platform

This guide is designed for technical interviews (Data Engineer, Cloud Architect, Analytics Engineer, Full-Stack Data Developer). It covers the elevator pitch, architectural reasoning, trade-offs, and deep-dive answers.

---

## ⚡ 1. The 30-Second Elevator Pitch

> *"I designed and built an event-driven insurance underwriting data platform that decouples high-throughput operational intake (OLTP) from real-time analytics (OLAP). Submissions from a React portal pass through a Node.js API into Azure Cosmos DB for low-latency operational persistence, while simultaneously publishing an event to Azure Service Bus. A serverless Azure Function consumes the queue and streams date-partitioned JSON files into a Microsoft Fabric OneLake Bronze Lakehouse. Finally, PySpark notebooks transform the raw data into Silver (cleaned/flattened) and Gold (aggregated business KPIs) Delta tables, served directly to Power BI via zero-copy Direct Lake mode."*

---

## 🏛️ 2. Architectural Choices & Rationale

Interviewers look for **deliberate trade-offs**, not accidental tech selection.

### Q1: Why use Azure Cosmos DB (NoSQL) instead of a relational database like PostgreSQL or Azure SQL?
* **Polymorphic / Dynamic Schemas**: Insurance policies vary dramatically across lines. A *Cyber Risk* policy contains fields for MFA status, endpoint counts, and cloud residency, whereas a *Commercial Construction* policy requires hazard zoning and heavy equipment schedules. A NoSQL document store natively accommodates evolving, nested schemas without requiring table alters or null-padded columns.
* **Predictable Single-Digit Millisecond Latency**: Cosmos DB provides SLA-backed sub-10ms reads and writes regardless of data volume.
* **Horizontal Partitioning**: Partitioning on `/policyType` ensures queries against specific lines of business distribute workload evenly across physical partitions.

### Q2: Why insert Azure Service Bus between the API and the Lakehouse?
* **Decoupling OLTP from OLAP**: This is the most critical pattern in the system. If Microsoft Fabric OneLake is undergoing maintenance, throttled, or temporarily unreachable, the Underwriting Intake Portal **must never fail, freeze, or drop submissions**.
* **Shock Absorber / Buffering**: Service Bus queues buffer burst traffic (such as quarter-end underwriting rushes) and absorb spikes without overloading downstream lakehouse ingestion.
* **Built-in Resilience**: Provides guaranteed at-least-once delivery, configurable retry backoffs, and automatic Dead-Letter Queues (DLQ) for poisoned messages.
* **Instant API Latency**: The Express API commits the document to Cosmos DB, sends a message to Service Bus, and returns `HTTP 201 Created` in under 50ms without waiting for downstream storage writes.

### Q3: Why Azure Functions (Serverless Consumption) for ingestion?
* **Event-Driven Scale**: Underwriting submissions are bursty. Running a dedicated 24/7 container or VM would waste compute during idle hours.
* **True Zero-Idle Cost**: On Azure Consumption plan, the service scales down to zero instances when no submissions are active. The first 1,000,000 monthly executions are free.
* **Stateless Concurrency**: As the queue depth increases, Azure Functions scales out instances concurrently to process backlogged messages.

### Q4: Why adopt the Medallion Architecture (Bronze ➔ Silver ➔ Gold)?
* **Bronze (Raw Immutable Lakehouse Files)**: 
  - Preserves exact source JSON with full fidelity.
  - Acts as the single source of truth and audit log. If transformation business logic changes or a bug occurs, historical data can be reprocessed from scratch.
* **Silver (Cleaned & Flattened Delta Table: `silver_policies`)**:
  - Unpacks nested structs (`insured.*`, `coverage.*`, `riskAssessment.*`) into a structured columnar schema.
  - Casts strict data types (timestamps, doubles, integers).
  - Deduplicates on `policy_id` using Delta Lake ACID transactions.
* **Gold (Business Aggregated Delta Tables)**:
  - Pre-computes dimensional metrics (`gold_industry_risk_exposure` and `gold_underwriter_performance`).
  - Eliminates the need for analytical BI dashboards to scan and aggregate millions of raw rows on every query.

### Q5: Why Power BI Direct Lake mode instead of Import or DirectQuery?
| Mode | How it Works | Drawbacks |
| :--- | :--- | :--- |
| **Import Mode** | Loads data into Power BI memory cache. | Requires scheduled refreshes; duplicates gigabytes of data; refresh lag. |
| **DirectQuery** | Sends live SQL queries to the Lakehouse. | Slow visual rendering; heavy compute strain on the SQL analytics endpoint. |
| **Direct Lake (Ours)** | Reads Delta Parquet files in OneLake directly into the VertiPaq in-memory engine. | **Zero data copying, zero refresh lag, sub-second query performance.** |

---

## 📈 3. Scalability Analysis: Strengths vs. Bottlenecks

### What Scales Linearly:
1. **Cosmos DB**: Scales infinitely by distributing logical partition keys (`/policyType`) across physical partitions.
2. **Service Bus**: Basic/Standard handles millions of messages daily; Premium scales to hundreds of thousands of messages per second.
3. **Azure Functions**: Auto-scales dynamically to hundreds of parallel instances under heavy load.
4. **Fabric Direct Lake**: Power BI queries against Delta Lake Parquet files scale to billions of rows with sub-second response times.

### Honest Bottlenecks to Acknowledge:
1. **The "Small Files Problem" in Bronze**: Writing 1 JSON per policy produces millions of small files at high volume, degrading Spark file-scan performance. *(Mitigation: Compaction jobs or micro-batching into 128MB chunks).*
2. **Batch vs. Continuous Streaming**: Scheduled PySpark notebooks introduce a latency gap between Bronze landing and Gold availability. *(Mitigation: Spark Structured Streaming).*
3. **Queue Fan-Out**: Service Bus Queues support point-to-point consumption. If multiple downstream systems need the data (fraud ML model, email notifications, lakehouse), upgrade to **Service Bus Topics with Subscriptions**.

---

## 🎯 4. Quick-Fire Interview Responses

| Question | Winning Response |
| :--- | :--- |
| *"How did you handle security?"* | Strict `.gitignore` policy preventing credentials from reaching Git; credentials injected via environment variables; configured for migration to Azure Key Vault & Managed Identities. |
| *"What was the total infrastructure cost?"* | Under \$0.10 for the entire dev/test cycle using Cosmos DB Serverless, Service Bus Basic, Azure Functions Consumption, and Microsoft Fabric 60-day trial capacity. |
| *"How do you handle schema evolution?"* | Cosmos DB absorbs arbitrary JSON changes at the intake layer; the Bronze layer stores raw schema untouched; PySpark in Silver enforces versioned transformations. |

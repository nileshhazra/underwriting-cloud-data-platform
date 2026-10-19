# Fabric Notebook: Bronze to Silver Transformation
# Reads raw hierarchical JSON from OneLake, flattens structs, enforces typing, and creates Silver Delta table.

from pyspark.sql.functions import (
    col, to_timestamp, input_file_name, current_timestamp
)

print("Starting Bronze to Silver extraction...")

# 1. Path to raw JSON files in OneLake
bronze_path = "Files/bronze/policies/*/*/*/*.json"

# 2. Read the raw partitioned JSON files
raw_df = spark.read.option("multiline", "true").json(bronze_path)
print(f"Loaded {raw_df.count()} raw policy record(s) from Bronze.")

# 3. Flatten nested JSON into clean tabular Silver schema
silver_df = raw_df.select(
    # Primary Key & Identification
    col("id").alias("policy_id"),
    to_timestamp(col("submissionDate")).alias("submission_timestamp"),
    col("submissionYear").cast("int").alias("submission_year"),
    col("submissionMonth").cast("int").alias("submission_month"),
    col("submissionDay").cast("int").alias("submission_day"),
    
    # Insured Organization Details (Flattened from insured struct)
    col("insured.businessName").alias("insured_business_name"),
    col("insured.taxId").alias("insured_tax_id"),
    col("insured.industry").alias("insured_industry"),
    col("insured.annualRevenue").cast("double").alias("insured_annual_revenue"),
    col("insured.employeeCount").cast("int").alias("insured_employee_count"),
    col("insured.address.city").alias("insured_city"),
    col("insured.address.state").alias("insured_state"),
    col("insured.address.zipCode").alias("insured_zip"),
    
    # Coverage & Financial Terms (Flattened from coverage struct)
    col("coverage.policyType").alias("policy_type"),
    to_timestamp(col("coverage.effectiveDate")).alias("effective_date"),
    to_timestamp(col("coverage.expirationDate")).alias("expiration_date"),
    col("coverage.coverageLimit").cast("double").alias("coverage_limit"),
    col("coverage.deductible").cast("double").alias("deductible_amount"),
    col("coverage.quotedPremium").cast("double").alias("quoted_premium"),
    
    # Underwriting Assessment (Flattened from riskAssessment struct)
    col("riskAssessment.riskScore").cast("int").alias("risk_score"),
    col("riskAssessment.riskTier").alias("risk_tier"),
    col("riskAssessment.approvalStatus").alias("approval_status"),
    col("riskAssessment.riskFactors").alias("risk_factors"),
    
    # Underwriter Details
    col("underwriter.id").alias("underwriter_id"),
    col("underwriter.name").alias("underwriter_name"),
    col("underwriter.notes").alias("underwriter_notes"),
    
    # Metadata & Lineage
    current_timestamp().alias("silver_ingestion_timestamp")
)

# 4. Remove any duplicate policy_ids
silver_df_clean = silver_df.dropDuplicates(["policy_id"])

# 5. Display the cleaned flattened preview
display(silver_df_clean)

# 6. Write to Managed Delta Lake Table in Silver
silver_df_clean.write \
    .format("delta") \
    .mode("overwrite") \
    .saveAsTable("silver_policies")

print("Successfully written to Delta table: 'silver_policies'!")

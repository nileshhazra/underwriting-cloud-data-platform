# Fabric Notebook: Silver to Gold Transformation
# Generates aggregated business Delta tables for Industry Exposure and Underwriter Performance.

from pyspark.sql.functions import (
    col, count, sum, avg, round, when
)

print("Starting Silver to Gold transformation...")

# 1. Read from our cleaned Silver Delta table
silver_df = spark.read.table("silver_policies")

# ---------------------------------------------------------
# Gold Table 1: Industry Risk & Premium Exposure
# ---------------------------------------------------------
gold_industry_risk_exposure = silver_df.groupBy("insured_industry") \
    .agg(
        count("policy_id").alias("total_submissions"),
        sum(when(col("approval_status") == "Approved", 1).otherwise(0)).alias("approved_policies"),
        sum(when(col("approval_status") == "Declined", 1).otherwise(0)).alias("declined_policies"),
        round(sum("quoted_premium"), 2).alias("total_quoted_premium"),
        round(avg("quoted_premium"), 2).alias("avg_quoted_premium"),
        round(sum("coverage_limit"), 2).alias("total_exposure_limit"),
        round(avg("risk_score"), 1).alias("avg_risk_score"),
        sum(when(col("risk_tier") == "High Hazard", 1).otherwise(0)).alias("high_hazard_count")
    ) \
    .withColumn(
        "approval_rate_pct", 
        round((col("approved_policies") / col("total_submissions")) * 100, 1)
    )

display(gold_industry_risk_exposure)

# Save to Gold Delta Table
gold_industry_risk_exposure.write \
    .format("delta") \
    .mode("overwrite") \
    .saveAsTable("gold_industry_risk_exposure")

print("Created Delta table: 'gold_industry_risk_exposure'!")

# ---------------------------------------------------------
# Gold Table 2: Underwriter Performance & Productivity
# ---------------------------------------------------------
gold_underwriter_performance = silver_df.groupBy("underwriter_id", "underwriter_name") \
    .agg(
        count("policy_id").alias("total_reviews"),
        sum(when(col("approval_status") == "Approved", 1).otherwise(0)).alias("approved_count"),
        sum(when(col("approval_status") == "Declined", 1).otherwise(0)).alias("declined_count"),
        sum(when(col("approval_status") == "Under Review", 1).otherwise(0)).alias("pending_review_count"),
        round(sum("quoted_premium"), 2).alias("total_premium_reviewed"),
        round(sum(when(col("approval_status") == "Approved", col("quoted_premium")).otherwise(0)), 2).alias("approved_premium_written"),
        round(avg("risk_score"), 1).alias("avg_portfolio_risk_score")
    ) \
    .withColumn(
        "approval_rate_pct", 
        round((col("approved_count") / col("total_reviews")) * 100, 1)
    )

display(gold_underwriter_performance)

# Save to Gold Delta Table
gold_underwriter_performance.write \
    .format("delta") \
    .mode("overwrite") \
    .saveAsTable("gold_underwriter_performance")

print("Created Delta table: 'gold_underwriter_performance'!")

-- CreateEnum
CREATE TYPE "AnalysisJobStatus" AS ENUM ('prepared', 'analyzed', 'failed');

-- CreateTable
CREATE TABLE "analysis_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guest_id" TEXT,
    "status" "AnalysisJobStatus" NOT NULL DEFAULT 'prepared',
    "file_path" TEXT,
    "filename" TEXT,
    "contract_type" "ContractType",
    "text_raw" TEXT,
    "text_clean" TEXT,
    "text_length_raw" INTEGER,
    "text_length_clean" INTEGER,
    "text_tokens_approx" INTEGER,
    "pages" INTEGER,
    "meta" JSONB,
    "sections" JSONB,
    "result" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),

    CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_jobs_user_id_idx" ON "analysis_jobs"("user_id");
CREATE INDEX "analysis_jobs_guest_id_idx" ON "analysis_jobs"("guest_id");
CREATE INDEX "analysis_jobs_status_idx" ON "analysis_jobs"("status");
CREATE INDEX "analysis_jobs_created_at_idx" ON "analysis_jobs"("created_at");
CREATE INDEX "analysis_jobs_expires_at_idx" ON "analysis_jobs"("expires_at");

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_analysis_jobs_updated_at
    BEFORE UPDATE ON "analysis_jobs"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE "analysis_jobs" IS 'Durable storage for analysis pipeline state between /api/prepare and /api/analyze';

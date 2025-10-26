-- Add CHECK constraints to ensure data integrity
-- These constraints are not natively supported in Prisma schema

-- User table: credits must be non-negative
ALTER TABLE "users" ADD CONSTRAINT "users_credits_check" CHECK ("credits" >= 0);

-- Analysis table: riskScore must be between 0 and 100
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_riskScore_check" CHECK ("riskScore" >= 0 AND "riskScore" <= 100);

-- Analysis table: textLength must be non-negative
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_textLength_check" CHECK ("textLength" >= 0);

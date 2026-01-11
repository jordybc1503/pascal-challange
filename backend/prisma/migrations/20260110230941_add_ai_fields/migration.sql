-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "ai_metadata" JSONB,
ADD COLUMN     "ai_summary_updated_at" TIMESTAMP(3),
ADD COLUMN     "ai_summary_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ai_update_policy" JSONB,
ADD COLUMN     "messages_since_last_ai" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "ai_config" JSONB;

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('eu');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'live', 'ended');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "region" "Region" NOT NULL DEFAULT 'eu',
    "retention_days" INTEGER NOT NULL DEFAULT 90,
    "transcript_storage" BOOLEAN NOT NULL DEFAULT true,
    "glossary" JSONB NOT NULL DEFAULT '[]',
    "sso_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "meeting_id" UUID NOT NULL,
    "consent_accepted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "host_member_id" UUID NOT NULL,
    "room_id" VARCHAR(12) NOT NULL,
    "region" "Region" NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "languages_present" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recording" BOOLEAN NOT NULL DEFAULT false,
    "status" "MeetingStatus" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "member_id" UUID,
    "guest_id" UUID,
    "speaking_language" VARCHAR(8) NOT NULL,
    "listening_language" VARCHAR(8) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "members_workspace_id_idx" ON "members"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_workspace_id_key" ON "members"("user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "guests_meeting_id_idx" ON "guests"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_room_id_key" ON "meetings"("room_id");

-- CreateIndex
CREATE INDEX "meetings_workspace_id_idx" ON "meetings"("workspace_id");

-- CreateIndex
CREATE INDEX "participants_meeting_id_idx" ON "participants"("meeting_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_host_member_id_fkey" FOREIGN KEY ("host_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A participant is exactly one of a workspace member or a guest (ARCHITECTURE.md section 10).
ALTER TABLE "participants" ADD CONSTRAINT "participants_member_xor_guest"
  CHECK (("member_id" IS NOT NULL) <> ("guest_id" IS NOT NULL));

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyDigest" BOOLEAN NOT NULL DEFAULT true;

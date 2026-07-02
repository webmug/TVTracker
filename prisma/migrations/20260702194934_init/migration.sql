-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('WATCHING', 'PAUSED', 'FINISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "overview" TEXT,
    "posterPath" TEXT,
    "status" TEXT,
    "firstAirDate" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "season" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "overview" TEXT,
    "airDate" TIMESTAMP(3),

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "status" "FollowStatus" NOT NULL DEFAULT 'WATCHING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedThroughDate" TIMESTAMP(3),

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedEpisode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_email_key" ON "Invite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Show_tmdbId_key" ON "Show"("tmdbId");

-- CreateIndex
CREATE INDEX "Episode_airDate_idx" ON "Episode"("airDate");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_showId_season_number_key" ON "Episode"("showId", "season", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_showId_key" ON "Follow"("userId", "showId");

-- CreateIndex
CREATE INDEX "WatchedEpisode_userId_idx" ON "WatchedEpisode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedEpisode_userId_episodeId_key" ON "WatchedEpisode"("userId", "episodeId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedEpisode" ADD CONSTRAINT "WatchedEpisode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedEpisode" ADD CONSTRAINT "WatchedEpisode_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

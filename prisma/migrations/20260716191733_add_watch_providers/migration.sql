-- CreateTable
CREATE TABLE "ShowWatchProvider" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "providerName" TEXT NOT NULL,
    "logoPath" TEXT,

    CONSTRAINT "ShowWatchProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieWatchProvider" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "providerName" TEXT NOT NULL,
    "logoPath" TEXT,

    CONSTRAINT "MovieWatchProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowWatchProvider_providerId_idx" ON "ShowWatchProvider"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowWatchProvider_showId_providerId_key" ON "ShowWatchProvider"("showId", "providerId");

-- CreateIndex
CREATE INDEX "MovieWatchProvider_providerId_idx" ON "MovieWatchProvider"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieWatchProvider_movieId_providerId_key" ON "MovieWatchProvider"("movieId", "providerId");

-- AddForeignKey
ALTER TABLE "ShowWatchProvider" ADD CONSTRAINT "ShowWatchProvider_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatchProvider" ADD CONSTRAINT "MovieWatchProvider_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

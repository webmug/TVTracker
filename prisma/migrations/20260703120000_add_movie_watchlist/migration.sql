-- CreateTable
CREATE TABLE "WatchlistMovie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistMovie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistMovie_userId_idx" ON "WatchlistMovie"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistMovie_userId_movieId_key" ON "WatchlistMovie"("userId", "movieId");

-- AddForeignKey
ALTER TABLE "WatchlistMovie" ADD CONSTRAINT "WatchlistMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistMovie" ADD CONSTRAINT "WatchlistMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

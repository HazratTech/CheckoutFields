-- CreateTable
CREATE TABLE "TrialTracker" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "trialUsed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

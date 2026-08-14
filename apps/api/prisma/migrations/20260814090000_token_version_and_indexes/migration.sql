-- Session invalidation: bumped on password change so tokens minted before the
-- change stop verifying.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Foreign-key columns that were being filtered on without an index.
CREATE INDEX "PostTag_tagId_idx" ON "PostTag"("tagId");
CREATE INDEX "Media_uploadedById_idx" ON "Media"("uploadedById");
CREATE INDEX "Media_isOrphan_idx" ON "Media"("isOrphan");
CREATE INDEX "ApiKey_ownerId_idx" ON "ApiKey"("ownerId");

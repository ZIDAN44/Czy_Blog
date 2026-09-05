-- Uploads moved from local disk to S3: the column now holds the object key, not
-- a filesystem path. Rename in place to keep existing rows.
ALTER TABLE "Media" RENAME COLUMN "storagePath" TO "storageKey";

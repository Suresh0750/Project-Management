-- Signing out is now handled entirely by the Session table (one row per device).
-- AlterTable
ALTER TABLE `User` DROP COLUMN `tokenVersion`;

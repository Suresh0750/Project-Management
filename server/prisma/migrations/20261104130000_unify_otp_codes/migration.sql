-- One table for every one-time code. EmailVerification becomes OtpCode with a purpose column,
-- and the separate PasswordReset table is dropped (reset codes live here now).

-- RenameTable
RENAME TABLE `EmailVerification` TO `OtpCode`;

-- AlterTable: add the purpose; existing rows are sign-up codes, or email-change codes when newEmail is set
ALTER TABLE `OtpCode` ADD COLUMN `purpose` ENUM('SIGNUP', 'EMAIL_CHANGE', 'PASSWORD_RESET') NOT NULL DEFAULT 'SIGNUP';
UPDATE `OtpCode` SET `purpose` = 'EMAIL_CHANGE' WHERE `newEmail` IS NOT NULL;
ALTER TABLE `OtpCode` ALTER COLUMN `purpose` DROP DEFAULT;

-- One live code per user and purpose (the new unique index also serves the foreign key)
CREATE UNIQUE INDEX `OtpCode_userId_purpose_key` ON `OtpCode`(`userId`, `purpose`);
ALTER TABLE `OtpCode` DROP FOREIGN KEY `EmailVerification_userId_fkey`;
DROP INDEX `EmailVerification_userId_key` ON `OtpCode`;
ALTER TABLE `OtpCode` ADD CONSTRAINT `OtpCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Pending password-reset codes are short-lived; people simply request a new one
DROP TABLE `PasswordReset`;

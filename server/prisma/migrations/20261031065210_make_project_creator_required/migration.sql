/*
  Warnings:

  - Made the column `createdById` on table `project` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `project` DROP FOREIGN KEY `Project_createdById_fkey`;

-- DropIndex
DROP INDEX `Project_createdById_fkey` ON `project`;

-- AlterTable
ALTER TABLE `project` MODIFY `createdById` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `project` ADD COLUMN `createdById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

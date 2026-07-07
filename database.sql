-- SQL CREATE TABLE scripts for MySQL

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `Users` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `Name` VARCHAR(100) NOT NULL,
    `Email` VARCHAR(150) NOT NULL,
    `PasswordHash` VARCHAR(255) NOT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `UQ_Users_Email` UNIQUE (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS `Conversations` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `UserId` INT NOT NULL,
    `Title` VARCHAR(200) NOT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT `FK_Conversations_Users_UserId` FOREIGN KEY (`UserId`) 
        REFERENCES `Users` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS `Messages` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `ConversationId` INT NOT NULL,
    `Role` VARCHAR(50) NOT NULL,
    `Content` LONGTEXT NOT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `FK_Messages_Conversations_ConversationId` FOREIGN KEY (`ConversationId`) 
        REFERENCES `Conversations` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Indexes for optimized querying
CREATE INDEX `IX_Conversations_UserId` ON `Conversations` (`UserId`);
CREATE INDEX `IX_Messages_ConversationId` ON `Messages` (`ConversationId`);

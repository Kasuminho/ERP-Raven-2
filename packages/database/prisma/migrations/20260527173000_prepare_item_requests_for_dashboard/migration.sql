-- AlterTable
ALTER TABLE "ItemRequest" ALTER COLUMN "legacyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ItemRequest" ALTER COLUMN "threadId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ItemRequest" ALTER COLUMN "threadChannelId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "chatBotMetadata" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4f39f6',
    "welcome_message" TEXT NOT NULL DEFAULT 'Hi there, How can I help you today?',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatBotMetadata_pkey" PRIMARY KEY ("id")
);

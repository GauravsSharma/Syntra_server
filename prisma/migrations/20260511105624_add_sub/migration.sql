-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'NINJA', 'NINJA_PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "plan" "PlanType" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUsage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "lifetime_ai_messages_used" INTEGER NOT NULL DEFAULT 0,
    "monthly_ai_messages_used" INTEGER NOT NULL DEFAULT 0,
    "last_reset_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organization_id_key" ON "Subscription"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUsage_organization_id_key" ON "OrganizationUsage"("organization_id");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUsage" ADD CONSTRAINT "OrganizationUsage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

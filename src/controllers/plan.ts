import { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { PLANS } from "../data/pricing.js";
import { rozarPayInstance } from "../config/razorpay.js";
import crypto from "crypto";
import { PlanType,SubscriptionStatus } from "../../generated/prisma/client.js";


export const verifyPlanPayment = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    /// find subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        razorpay_order_id,
      },
      include: {
        organization: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }
    
    /// already active
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: "Subscription already active",
      });
    }

    /// verify signature
    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZARPAY_SECRET as string
      )
      .update(body)
      .digest("hex");

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
    const organization_id = subscription.organization_id;
    const plan = subscription.plan
    /// current period
    const currentPeriodStart = new Date();

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(
      currentPeriodEnd.getMonth() + 1
    );

    /// transaction
    await prisma.$transaction([
      prisma.organization.update({
        where: {
          id: organization_id,
        },
        data: {
          plan: plan as PlanType,
        },
      }),

      prisma.subscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          status: SubscriptionStatus.ACTIVE,
          razorpay_payment_id,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
        },
      }),

      prisma.organizationUsage.updateMany({
        where: {
          organization_id,
        },
        data: {
          monthly_ai_messages_used: 0,
          last_reset_at: new Date(),
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Plan activated successfully",
    });
  } catch (error) {
    console.error("VERIFY PLAN PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const upgradePlan = async (req: Request, res: Response) => {
    try {
        const { plan } = req.body as { plan: keyof typeof PLANS };
        const selectedPlan = PLANS[plan];
        if (!selectedPlan) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan selected."
            });
        }
        const organizationId = (req as any).user.organizationId;
        const options = {
            amount: selectedPlan.price * 100,
            currency: "USD",

            notes: {
                organizationId,
                plan,
            }
        }
        const razorpayOrder = await rozarPayInstance.orders.create(options);
        await prisma.subscription.update({
            where: {
                organization_id: (req as any).user.organizationId,
            },
            data: {
                razorpay_order_id: razorpayOrder.id,
                plan: plan as PlanType,
            }
        })
        return res.json({
            success: true,
            order: razorpayOrder,
        })
    } catch (error) {
        console.log(error);

        res.status(500).json({ error: "Internal server error" });
    }
}

export const getOrgCurrentPlan = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).user.organizationId;
     const organization = await prisma.organization.findUnique({
    where: {
        id: organizationId,
    },

    select: {
        plan: true,

        subscription: {
            select: {
                current_period_start: true,
                current_period_end: true,
                status: true,
            },
        },
    },
});
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found"
            })
        }
        let plan = PLANS[organization.plan]
        const currentPlan = {
            ...plan,
            current_period_start: organization.subscription?.current_period_start,
            current_period_end: organization.subscription?.current_period_end,
            subscription_status: organization.subscription?.status,
        }
        return res.status(200).json({
            success: true,
            plan: currentPlan,
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
}
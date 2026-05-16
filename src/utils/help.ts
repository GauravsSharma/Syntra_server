import { Resend } from "resend";
import { PlanType } from "../../generated/prisma/client";
import { PLANS } from "../data/pricing";
import { prisma } from "../lib/prisma";
type AIStatus = "ACTIVE" | "ESCALATED" | "EXPIRED"|"OPEN";

export interface AIResponse {
  status: AIStatus;
  mssg: string;
  user_email?: string | null;
}

const VALID_STATUS = ["ACTIVE", "ESCALATED", "EXPIRED","OPEN"] as const;

const isValidResponse = (data: any): data is AIResponse => {
  return (
    data &&
    typeof data === "object" &&
    VALID_STATUS.includes(data.status) &&
    typeof data.mssg === "string" &&
    (typeof data.user_email === "string" ||
      data.user_email === null ||
      data.user_email === undefined)
  );
};

export function parseAIResponse(rawText: string): AIResponse {
  const fallback: AIResponse = {
    status: "ACTIVE",
    mssg: "Something went wrong. Please try again.",
    user_email: null,
  };

  if (!rawText || typeof rawText !== "string") {
    return fallback;
  }

  const trimmed = rawText.trim();

  // Direct JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    
    if (isValidResponse(parsed)) {
      console.log("parsed json------->",parsed);
      return {
        status: parsed.status,
        mssg: parsed.mssg.trim(),
        user_email: parsed.user_email ?? null,
      };
    }
    else{
      return fallback
    }
  } catch {}
  // Final fallback
  return {
    status: "ACTIVE",
    mssg: trimmed,
    user_email: null,
  };
}

export const validateAccess = async (
  orgId: string
): Promise<boolean> => {
  try {
    const [subscription, usage] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          organization_id: orgId,
        },
        select: {
          plan: true,
        },
      }),

      prisma.organizationUsage.findFirst({
        where: {
          organization_id: orgId,
        },
        select: {
          lifetime_ai_messages_used: true,
          monthly_ai_messages_used: true,
        },
      }),
    ]);

    if (!subscription || !usage) {
      return true;
    }

    const plan = subscription.plan as PlanType;
    
    /// free plan -> lifetime usage
    if (plan === "FREE") {
      console.log(plan);
      console.log( usage.lifetime_ai_messages_used ,
        PLANS.FREE.aiMessages);
      
      return (
        usage.lifetime_ai_messages_used <
        PLANS.FREE.aiMessages
      );
    }

    /// paid plans -> monthly usage
    return (
      usage.monthly_ai_messages_used <
      PLANS[plan].aiMessages
    );
  } catch (error) {
    console.error("Access validation error:", error);
    throw new Error("Failed to validate access");
  }
};

const resend = new Resend(process.env.RESEND_API_KEY);
export const sendEmail = async(to_email:string,from_email:string)=>{
try {
  await resend.emails.send({
  from: "Syntra <onboarding@resend.dev>",
  to: to_email,
  subject: "New Escalated Conversation",
  html: `
    <h2>Conversation Escalated</h2>
    <p>A user requested human support.</p>
    <p>Customer email: ${from_email || "Email not provided."}</p>
  `,
});
} catch (error) {
  console.log(error);
  
}
}

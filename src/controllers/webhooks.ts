import { Request, Response } from "express";
import scalekit from "../config/scalkit";
import { prisma } from "../lib/prisma";

export const recieveInvitationConfimation = async (req: Request, res: Response) => {
    try {
        const body = req.body.toString();
        // Convert IncomingHttpHeaders to Record<string, string>
        const headers = Object.entries(req.headers).reduce<Record<string, string>>(
            (acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = Array.isArray(value) ? value.join(', ') : value;
                }
                return acc;
            },
            {}
        );
        const secret = process.env.SCALEKIT_WEBHOOK_SECRET;

        if (!secret) {
            return res.status(500).json({ error: 'Missing SCALEKIT_WEBHOOK_SECRET' });
        }

        // ✅ Correct method from SDK (as seen in your screenshot)
        try {
            scalekit.verifyWebhookPayload(secret, headers, body);
        } catch (error) {
            console.error('Invalid webhook signature:', error);
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Parse event after verification
        const event = JSON.parse(body);

        // Handle different event types
        switch (event.type) {
            case 'user.organization_membership_created':
                console.log("Invitattion accept kar lia yeehhh.");
                const params = event.data;
                await prisma.teamMember.update({
                    where: {
                        user_email_organization_id: {
                            user_email: params.user.email,
                            organization_id: params.organization.id
                        }
                    },
                    data: {
                        status: "active"
                    }
                });
                await prisma.user.create({
                    data: {
                        email: params.user.email,
                        name: params.user.name || params.user.email.split("@")[0],

                        organizations: {
                            connect: {
                                id: params.organization.id
                            }
                        }
                    }
                })
                break;
            default:
                console.log('Unhandled event type:', event.type);
        }
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}
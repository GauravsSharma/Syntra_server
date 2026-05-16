import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { jwtVerify, SignJWT } from "jose";
import { countConversatonToken, summarizeConversation ,generateReply} from "../utils/ai";
import { parseAIResponse, sendEmail, validateAccess } from "../utils/help";
import { io } from "..";
// import {  } from "../utils/a12";
import { countMessageTokens } from "../utils/token";
import { scheduleEscalationTimeout } from "../utils/escalationTimer";
import {  } from "../utils/a12";

export const createSession = async (req: Request, res: Response) => {
    try {
        const { widget_id } = req.body
        if (!widget_id) {
            return res.status(400).json({
                success: false,
                message: "Missing widget id."
            })
        }
        const chatbot = await prisma.chatBotMetadata.findUnique({
            where: { id: widget_id }
        })
        if (!chatbot) {
            return res.status(400).json({
                success: false,
                message: "Widget not found."
            })
        }
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const sessionId = crypto.randomUUID()
        const token = await new SignJWT(
            {
                widgetId: chatbot.id,
                ownerEmail: chatbot.user_email,
                sessionId,
                org_id: chatbot.organization_id
            }
        ).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
            .setExpirationTime("2h")
            .sign(secret)
        return res.status(200).json({
            success: true,
            token
        })
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}
export const config = async (req: Request, res: Response) => {
    try {
        const token = req.query.token as string;



        if (!token) {
            return res.status(404).json({
                success: false,
                message: "Missing token.",
            });
        }
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const { payload } = await jwtVerify(token, secret)
        const owner_email = payload.ownerEmail as string
        const chatBotId = payload.widgetId as string
        const chatbot = await prisma.chatBotMetadata.findUnique({
            where: { id: chatBotId, user_email: owner_email }
        })
        const sections = await prisma.section.findMany({
            where: { userEmail: owner_email },
            select: {
                id: true,
                name: true,
            }
        })
        return res.status(200).json({
            success: true,
            metadata: {
                sections,
                metadata: chatbot
            }
        })
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}
export const chatToBot = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1] as string;
        if (!token) {
            return res.status(404).json({
                success: false,
                message: "Missing token"
            })
        }
        let sessionId: string | undefined;
        let widgetId: string | undefined;
        let org_id: string | undefined
        try {
            const validate = await validateAccess(org_id!)
            if (!validate) {
                return res.status(403).json({
                    success: false,
                    message: "You are out of limit of AI messages for your current plan. Please upgrade your plan to continue using the service."
                })
            }
        
            
            const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
            const { payload } = await jwtVerify(token, secret)
            sessionId = payload.sessionId as string
            widgetId = payload.widgetId as string
            org_id = payload.org_id as string
            if (!sessionId || !widgetId) {
                throw new Error("Invalid token payload")
            }

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalide token validation"
            })
        }

        let { messages, sectionId } = req.body;

        if (!sectionId) {
            return res.status(400).json({
                success: false,
                message: "Required section ID",
            });
        }

        const lastMessage = messages[messages.length - 1];

        if (lastMessage.role !== "user") {
            return res.status(400).json({
                success: false,
                message: "Invalide Conversation.",
            });
        }
        let existingConversation = await prisma.conversation.findUnique({ where: { id: sessionId } })
        if (!existingConversation) {
            const forwarded = req.headers["x-forwarded-for"];
            const ip = Array.isArray(forwarded)
            ? forwarded[0]
                : forwarded?.split(",")[0] || req.socket?.remoteAddress || "Unknown IP";
            const visitorName = `visitor(${ip})`;

            existingConversation = await prisma.conversation.create({
                data: {
                    id: sessionId,
                    chatbot_id: widgetId,
                    visitor_ip: ip,
                    name: visitorName,
                    org_id
                }
            })
            const previousMessages = messages.slice(0, -1);
            if (previousMessages.length > 0) {
                for (let prev of previousMessages) {
                    await prisma.message.create({
                        data: {
                            conversation_id: sessionId,
                            role: prev.role as "user" | "assistant",
                            content: prev.content
                        }
                    })
                }
            }
        }
        if (lastMessage && lastMessage.role === "user") {
            await prisma.message.create({
                data: {
                    role: "user",
                    content: lastMessage.content,
                    conversation_id: sessionId
                }
            })
        }

        const section = await prisma.section.findUnique({
            where: {
                id: sectionId,
            },
            select: {
                id: true,
                tone: true,
                
                sourceIds: {
                    select: {
                        id: true,
                        content: true,
                    },
                },
            },
        });
       

        if (!section) {
            return res.status(404).json({
                success: false,
                message: "Section not found"
            })
        }
        let context = section.sourceIds.map((s) => s.content).filter(Boolean).join("\n\n");
    
        
        const tokenCount = countMessageTokens(messages);


        if (tokenCount > 600) {
            const recentMessage = messages.slice(-10);
            const olderMessage = messages.slice(0, -10);
            if (olderMessage.length > 0) {
                const summarizedMessages = await summarizeConversation(olderMessage)
                context = `${context} \n\n PREVIOUS CONVRSATION SUMMARY:\n${summarizedMessages}`
                messages = recentMessage;
            }
        }
        if (!existingConversation) {
            return res.status(400).json({
                success:false,
               message:"Conversation not found"
            })
        }
        const st = existingConversation?.status || "ACTIVE"

        const reply = await generateReply(context, messages, st, existingConversation.escalation_count);
console.log("AI----->",reply);

const { status, mssg, user_email } = parseAIResponse(reply)
console.log("MSSG----->",mssg);
        //store reply in db
    

        const endMssg = await prisma.message.create({
            data: {
                role: "assistant",
                content: mssg,
                conversation_id: sessionId
            }
        })

        if (status === 'ESCALATED' && existingConversation?.status === 'OPEN') {
            //status, id ,name ,time ,lastmessage
            scheduleEscalationTimeout(sessionId, org_id)
            const conv = {
                id: sessionId,
                status: "ESCALATED",
                name: existingConversation?.name || "Visitor(Unknown)",
                created_at: new Date(),
                messages: {
                    content: mssg,
                    created_at: new Date(),
                    role: "assistant",
                },
            }
            
            io.to(org_id).emit("new:escalation", conv)
            io.to(sessionId).emit("chat:escalated")
        
            await prisma.conversation.update({
                where: { id: sessionId },
                data: {
                    status: "ESCALATED",
                    escalated_at: new Date(),
                },
            });
        }
        const org = await prisma.organization.findUnique({
            where:{id:org_id},
            select:{
                owner_email:true
            }
        })
        if (status === "EXPIRED" && user_email) {
            sendEmail(org?.owner_email || "",user_email)      
            await prisma.conversation.update({
                where: { id: sessionId },
                data: {
                    client_email:user_email
                },
            });
        }

        const subscription = await prisma.subscription.findFirst({
            where: {
                organization_id: org_id!,
            },
            select: {
                plan: true,
            },
        });

        if (!subscription) {
            throw new Error("Subscription not found");
        }

        const plan = subscription.plan;

        const data =
            plan === "FREE"
                ? {
                    lifetime_ai_messages_used: {
                        increment: 1,
                    },
                }
                : {
                    monthly_ai_messages_used: {
                        increment: 1,
                    },
                };

        await prisma.organizationUsage.update({
            where: {
                organization_id: org_id!,
            },
            data,
        });



        return res.status(200).json({
            success: true,
            message: mssg,
            status
        })

    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: "Error in chat controller!" });
    }
}

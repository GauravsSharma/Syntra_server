import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { countConversatonToken } from "../utils/ai";
import { parseAIResponse } from "../utils/help";
import { generateReplyForTesting, summarizeConversation } from "../utils/a12";
import { countMessageTokens } from "../utils/token";

export const getMetaData = async (req: Request, res: Response) => {
    try {
        const user_email = (req as any).user.email;
        const org_id = (req as any).user.organizationId;
     

        let existingData = await prisma.chatBotMetadata.findFirst({
            where: { organization_id: org_id }
        })

        if (!existingData) {
            existingData = await prisma.chatBotMetadata.create({
                data: {
                    user_email,
                    organization_id: org_id
                }
            })
        }
        res.status(200).json({
            metadata: existingData,
            success: true
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal server error",
            success: true
        })

    }
}
export const saveChanges = async (req: Request, res: Response) => {
    try {
        const org_id = (req as any).user.organizationId;
        const user_email = (req as any).user.email;
        const role = (req as any).user.role;
        const { color, welcomeMessage } = req.body;
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can update chat bot settings."
            })
        }
        const updated = await prisma.chatBotMetadata.update({
            where: { user_email, organization_id: org_id },
            data: {
                color,
                welcome_message: welcomeMessage,
            }
        })

        res.status(200).json({
            success: true,
            data: updated
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal server error",
            success: true
        })

    }
}

export const testChatBot = async (req: Request, res: Response) => {
    try {
        let { messages, sectionId } = req.body;

        if (!sectionId) {
            return res.status(400).json({
                success: false,
                message: "Required section",
            });
        }

        const sources = await prisma.section.findUnique({
            where: {
                id: sectionId,
            },
            select: {
                tone: true,
                sourceIds: {
                    select: {
                        content: true, // sirf content field
                    },
                },
            },
        });
   
        if(!sources){
            return res.status(404).json({
                success: false,
                message: "Section not found",
            });
        }
        let context = sources?.sourceIds.map((s) => s.content).filter(Boolean).join("\n\n");        
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
        const reply = await generateReplyForTesting(context, messages);
        console.log("Ai reply",reply);
        const { mssg } = parseAIResponse(reply)
        console.log("mssg",mssg)
        return res.status(200).json({
            success: true,
            message: mssg
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Can't reached at this moment.",
            success: false
        })

    }
}
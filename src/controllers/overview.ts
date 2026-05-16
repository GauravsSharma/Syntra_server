import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getOverview = async (req: Request, res: Response) => {
    try {
        const org_id = (req as any).user.organizationId;
        const chatbot = await prisma.chatBotMetadata.findFirst({
            where: { organization_id:org_id },
            select: { id: true },
        });
        const [knowledgeCounts, sections, conversations] = await Promise.all([
            prisma.knowledgeSource.groupBy({
                by: ["type"],
                where: { org_id },
                _count: { type: true },
            }),
            prisma.section.findMany({
                where: { org_id },
                select: { name: true, id: true, sourceIds: true, tone: true },
            }),
           await prisma.conversation.findMany({
    where: {
        chatbot_id: chatbot?.id,
    },
    orderBy: {
        created_at: "desc", // latest conversations
    },
    take:3, // max 5 conversations
    select: {
        id: true,
        visitor_ip: true,
        name: true,
        created_at: true,
        status: true,
        messages: {
            orderBy: {
                created_at: "desc",
            },
            take: 1, // only last message
            select: {
                id: true,
                role: true,
                content: true,
                created_at: true,
            },
        },
    },
})
        ]);

        const knowledgeBaseCount = { website: 0, text: 0, file: 0 } as Record<"website" | "text" | "file", number>;
        for (const { type, _count } of knowledgeCounts) {
            if (type in knowledgeBaseCount) knowledgeBaseCount[type as keyof typeof knowledgeBaseCount] = _count.type;
        }

        const totalKnowledge = knowledgeCounts.reduce((sum, { _count }) => sum + _count.type, 0);

        const steps = {
            webscanned:       knowledgeBaseCount.website > 0,
            knowledge_added:  totalKnowledge > 0,
            section_added:    sections.length > 0,
            widget_installed: false,
        };
        const stepsArr = []
        if(steps.webscanned) stepsArr.push(0)
        if(steps.knowledge_added) stepsArr.push(1)
        if(steps.section_added) stepsArr.push(2)
        if(steps.widget_installed) stepsArr.push(3)
    
        return res.status(200).json({
            success: true,
            data: { steps: stepsArr, knowledgeBaseCount, sections,conversations },
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
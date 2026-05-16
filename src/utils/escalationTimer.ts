// lib/escalationTimer.ts
import { io } from '../index.js'
import { prisma } from '../lib/prisma.js';

const activeTimers = new Map<string, NodeJS.Timeout>() // conversationId → timer

export function scheduleEscalationTimeout(conversationId: string, orgId: string) {
    // Agar pehle se timer chal raha hai toh cancel karo
    if (activeTimers.has(conversationId)) {
        clearTimeout(activeTimers.get(conversationId)!)
    }

    const timer = setTimeout(async () => {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        })

        // Sirf tab expire karo agar abhi bhi ESCALATED hai (agent join nahi kiya)
        if (conversation?.status === 'ESCALATED') {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { status: 'EXPIRED' }
            })
            const expiryMessage = await prisma.message.create({
                data: {
                    conversation_id: conversationId,
                    role: 'assistant',
                    content: "Sorry, no agent was available right now. Could you please share your email so our team can follow up with you?"
                }
            })
            // User ko batao — ab email maango
            io.to(conversationId).emit('chat:expired', {
                role: "assistant",
                content: expiryMessage.content
            })

            // Dashboard se hatao
            io.to(orgId).emit('chat:expired', { conversationId })

            console.log(`Conversation ${conversationId} expired — no agent joined`)
        }

        activeTimers.delete(conversationId)
    }, 60 * 1000) // 10 minutes

    activeTimers.set(conversationId, timer)
}

// Agent join kare toh timer cancel karo
export function cancelEscalationTimeout(conversationId: string) {
    if (activeTimers.has(conversationId)) {
        clearTimeout(activeTimers.get(conversationId)!)
        activeTimers.delete(conversationId)
        console.log(`Timer cancelled for ${conversationId}`)
    }
}
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { jwtVerify } from "jose";
import { io } from "..";
import { cancelEscalationTimeout } from "../utils/escalationTimer";

export const getEscalatedConversationCount = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Missing chatbot id.",
            });
        }

        const escalatedCount = await prisma.conversation.count({
            where: {
                chatbot_id: id,
                status: "ESCALATED",
            },
        });

        return res.status(200).json({
            success: true,
            count: escalatedCount,
        });

    } catch (error) {
        console.error("Get escalated conversation count error:", error);
        return res.status(500).json({
            success: false,
            message: "Error in get escalated conversation count!",
        });
    }
};
export const getConversation = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Missing chatbot id.",
            });
        }

        const escalated = await prisma.conversation.findMany({
            where: {
                chatbot_id: id,
                status: "ESCALATED",
            },

            select: {
                id: true,
                status: true,
                name: true,
                created_at: true,

                messages: {
                    select: {
                        content: true,
                        created_at: true,
                        role: true,
                    },

                    orderBy: {
                        created_at: "desc",
                    },

                    take: 1,
                },
            },

            orderBy: {
                escalated_at: "desc",
            },
        });
        const open = await prisma.conversation.findMany({
            where: {
                chatbot_id: id,
                status: "OPEN"
            },
            select: {
                id: true,
                status: true,
                name: true,
                created_at: true,

                messages: {
                    select: {
                        content: true,
                        created_at: true,
                        role: true,
                    },

                    orderBy: {
                        created_at: "desc",
                    },

                    take: 1,
                },
            },
            orderBy: {
                escalated_at: "desc",
            },
            take: 10
        });
        const active = await prisma.conversation.findMany({
            where: {
                chatbot_id: id,
                status: "ACTIVE"
            },
            select: {
                id: true,
                status: true,
                name: true,
                created_at: true,

                messages: {
                    select: {
                        content: true,
                        created_at: true,
                        role: true,
                    },

                    orderBy: {
                        created_at: "desc",
                    },

                    take: 1,
                },
            },
            orderBy: {
                escalated_at: "desc",
            },
            take: 10
        });
      


        return res.status(200).json({
            success: true,
            conversations: [...escalated, ...open, ...active],
        });
    } catch (error) {
        console.error("Get conversation error:", error);
        return res.status(500).json({ error: "Error in get conversation controller!" });
    }
};
export const getConversationById = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Missing converation id.",
            });
        }

        const conversations = await prisma.conversation.findUnique({
            where: {
                id: id,
            },
            include: {
                messages: {
                    orderBy: {
                        created_at: "asc", // latest first
                    },
                    // only last message
                },
            },
        });
        return res.status(200).json({
            success: true,
            conversations,
        });
    } catch (error) {
        console.error("Get conversation error:", error);
        return res.status(500).json({ error: "Error in get conversation controller!" });
    }
};
export const updateConversationStatus = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const { status } = req.body
        const user_email = (req as any).user.email;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Missing converation id.",
            });
        }
        if (status !== "OPEN" && status !== "ESCALATED" && status !== "RESOLVED" && status != "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Given unknown status.",
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: user_email },

        })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found.",
            });
        }
        const conversation = await prisma.conversation.findUnique({
            where: { id },
            select: {
                escalated_at: true
            }
        });

        if (!conversation?.escalated_at) {
            return res.status(400).json({
                success: false,
                message: "Conversation not found or not escalated"
            });
        }

        const diff =
            Date.now() - new Date(conversation.escalated_at).getTime();

        const TEN_MINUTES = 10 * 60 * 1000;

        if (diff > TEN_MINUTES) {
            return res.status(400).json({
                success: false,
                message: "Status update time expired"
            });
        }
        // continue update logic
        await prisma.conversation.update({
            where: {
                id: id,
            },
            data: {
                status: status,
                resolved_at: new Date(),
                resolved_by: user_email
            }
        });
        if (status === "ACTIVE") {
            io.to(id).emit("agent:joined", {
                status: "active",
                user_name: user.name
            })
        }
        
        if (status === "RESOLVED") {
            io.to(id).emit("chat:resolved")
        }
         cancelEscalationTimeout(id)
        return res.status(200).json({
            success: true,
            message: "Conversation status updated",
        });
    } catch (error) {
        console.error("update conversation error:", error);
        return res.status(500).json({ error: "Error in update conversation controller!" });
    }
};
export const getClientConversation = async (req: Request, res: Response) => {
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
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
        const { payload } = await jwtVerify(token, secret)
        // console.log(payload);

        sessionId = payload.sessionId as string
        //  console.log(sessionId);

        const conversations = await prisma.conversation.findUnique({
            where: {
                id: sessionId,
            },
            include: {
                messages: {
                    orderBy: {
                        created_at: "asc", // latest first
                    },
                    // only last message
                },
            },
        });
        return res.status(200).json({
            success: true,
            conversations,
        });
    } catch (error) {
        console.error("Get conversation error:", error);
        return res.status(500).json({ error: "Error in get conversation controller!" });
    }
}
export const sendMessageToAgent = async (req: Request, res: Response) => {
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
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
        const { payload } = await jwtVerify(token, secret)
        sessionId = payload.sessionId as string
        console.log("sesssesssseeidddd",sessionId);
        
        const { message } = req.body;
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Missing message."
            })
        }
        console.log(sessionId, message);
        io.to(sessionId).emit("new:message", {
            role: "user",
            content: message
        })
        await prisma.message.create({
            data: {
                conversation_id: sessionId,
                content: message,
                role: "user"
            }
        })
        return res.status(200).json({
            success: true,
            message: "Message send."
        })
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: `Error in sendingggg mssg. ${error}`
        })
    }
}
export const sendMessageToUser = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Missing converation id.",
            });
        }
        const { message } = req.body;
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Missing message."
            })
        }
        console.log(id);
        
        io.to(id).emit("new:message", {
            role: "agent",
            content: message
        })
        await prisma.message.create({
            data: {
                conversation_id: id,
                content: message,
                role: "agent"
            }
        })
        return res.status(200).json({
            success: true,
            message: "Message send."
        })
    } catch (error) {
        return res.status(500).json({
            success: true,
            message: "Error in sending mssg."
        })
    }
}

export const expireConversation = async(req: Request, res: Response)=>{
 try {
    const {token} = req.body;
       if (!token) {
        console.log("token nai mila");
        return;
      }
      let sessionId: string | undefined;
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      const { payload } = await jwtVerify(token, secret)
      sessionId = payload.sessionId as string
      console.log("session id", sessionId);
      await prisma.conversation.update({
        where: { id: sessionId },
        data: {
          status: "EXPIRED"
        }
      })
       return res.status(200).json({
            success: true,
            message: "status updated"
        })
 } catch (error) {
    console.log(error);
    
  return res.status(500).json({
            success: true,
            message: "Error in expiring cnversation."
        })   
 }
}
import express from 'express';
import { createServer } from 'http';
import type { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import userRoute from './routes/user-route.js';
import knowledgeRouter from './routes/knowledge-route.js';
import chatBotRouter from './routes/chatBot-route.js';
import sectionRouter from './routes/sections-route.js';
import organizationRouter from './routes/organization-route.js';
import webhooks from './routes/webhook-route.js';
import widget from './routes/chatbot-config-route.js';
import plans from './routes/plans-route.js';
import conversationRouter from './routes/conversation-route.js';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
import { jwtVerify } from 'jose';
import { prisma } from './lib/prisma.js';
import { sendEmail } from './utils/help.js';
dotenv.config();

const app = express();
const httpServer = createServer(app); // ← wrap karo
const port = process.env.PORT || 5000
const openCors = cors({ origin: '*' });

// Socket.io setup
export const io = new Server(httpServer, {
  cors: {
    origin:"*",
    credentials: false
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on("join:org", (orgId) => {
    console.log(orgId);
    
    socket.join(orgId);

    const isJoined = socket.rooms.has(orgId);

    console.log("Joined:", isJoined); // true if success
  })

  socket.on("conversation:join", async (token) => {

    if (!token) {
      console.log("token nai mila");
      return;
    }

    let sessionId: string | undefined;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    sessionId = payload.sessionId as string
    console.log("session id", sessionId);
    socket.join(sessionId)
  })

  socket.on("escalation:expire", async (token: string) => {
    try {
      if (!token) {
        console.log("token nai mila");
        return;
      }

      let sessionId: string | undefined;
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      const { payload } = await jwtVerify(token, secret)
      sessionId = payload.sessionId as string
      console.log("session id", sessionId);
      const conv = await prisma.conversation.findUnique({
        where: { id: sessionId },
        select: {
          org_id: true
        }
      })
      const org = await prisma.organization.findUnique({
        where: { id: conv?.org_id },
        select: {
          owner_email: true
        }
      })
      if (!org?.owner_email) {
        return;
      }
      sendEmail(org?.owner_email, org.owner_email).then(() => {
        console.log("email send vro");
      })
    } catch (error) {
      console.log("Email sending error", error);

    }
  })

  socket.on("join:conversation", (conversationId) => {
    socket.join(conversationId)
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});
app.use(express.json());
app.use("/api/widget", openCors ,widget)


app.use(cors({
  origin: [process.env.CLIENT_URL!,"http://localhost:3000"],
  credentials: true,
}));

app.use('/webhooks/scalekit', express.raw({ type: 'application/json' }));
app.use(cookieParser());
app.use("/api/conversation", conversationRouter)
app.use("/api/auth", userRoute)
app.use("/api/knowledge", knowledgeRouter)
app.use("/api/section", sectionRouter)
app.use("/api/chatBot", chatBotRouter)
app.use("/api/organization", organizationRouter)
app.use("/webhooks", webhooks)
app.use("/api/plans", plans)

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Express!');
});
app.get('/test', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Express! oiooioioiioioi');
});
app.get(
  "/public",
  cors(), // ya origin: "*"
  (req, res) => {
    res.json({
      success: true,
      message: "Anyone can access this route",
    });
  }
);
httpServer.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});

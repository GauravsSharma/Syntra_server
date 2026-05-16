import { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { summarizeMarkdown } from "../utils/a12.js";

export const addKnowledge = async (req: Request, res: Response) => {
    try {
        const { type } = req.body;
        const role = (req as any).user.role;
        if(role !== "admin"){
            return res.status(403).json({
                success: false,
                message: "Only admins can add knowledge sources."
            })
        }
        if (!["website", "text", "file"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid knowledge type",
            });
        }
        let createdData;

        if (type === "file") {       
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: "No file provided",
                });
            }

            const fileContent = file.buffer.toString("utf-8");
        
            const lines = fileContent
                .split("\n")
                .filter((line) => line.trim());

            const headers = lines[0].split(",").map((h) => h.trim());

            const markdown = await summarizeMarkdown(fileContent);

            createdData = await prisma.knowledgeSource.create({
                data: {
                    user_email: (req as any).user.email,
                    type: "file",
                    name: file.originalname,
                    status: "active",
                    org_id: (req as any).user.organizationId,
                    content: markdown,
                    meta_data: JSON.stringify(
                        {
                            fileName: file.originalname,
                            fileSize: file.size,
                            rowCount: lines.length - 1,
                            headers,
                        }
                    ),
                },
            });
        }

        else if (type === "website") {
            const zenUrl = new URL("https://api.zenrows.com/v1/");

            zenUrl.searchParams.set("apikey", process.env.ZENROWS_API_KEY!);
            zenUrl.searchParams.set("url", req.body.url);
            zenUrl.searchParams.set("response_type", "markdown");

            const response = await fetch(zenUrl.toString(), {
                headers: { "User-Agent": "SyntraSupportBot/1.0" },
            });

            const html = await response.text();

            if (!html) {
                return res.status(502).json({
                    success: false,
                    message: "Failed to fetch website content",
                });
            }

            const summary = await summarizeMarkdown(html);

            createdData = await prisma.knowledgeSource.create({
                data: {
                    type: "website",
                    user_email: (req as any).user.email,
                    status: "active",
                    source_url: req.body.url,
                    org_id: (req as any).user.organizationId,
                    content: summary,
                    name: req.body.url,
                },
            });
        }

        else if (type === "text") {
            const content = req.body.content;

            let summary = content;
            if (content.length > 500) {
                summary = await summarizeMarkdown(content);
            }

            createdData = await prisma.knowledgeSource.create({
                data: {
                    type: "text",
                    user_email: (req as any).user.email,
                    status: "active",
                    content: summary,
                    org_id: (req as any).user.organizationId,
                    name: req.body.title || "Text Knowledge",
                },
            });
        }

        return res.status(201).json({
            success: true,
            message: "Knowledge added successfully",
            source: createdData,
        });

    } catch (error) {
        console.error("Error adding knowledge:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
export const getKnowledge = async (req: Request, res: Response) => {
    try {
        const knowledgeSources = await prisma.knowledgeSource.findMany({
            where: { org_id: (req as any).user.organizationId },
            orderBy: { created_at: "desc" },
        });
        return res.status(200).json({
            success: true,
            data: knowledgeSources,
        });
    }
    catch (error) {
        console.error("Error fetching knowledge sources:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
           }); 
    }   
}
export const deleteKnowledgeSource = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    const role = (req as any).user.role;
    const userEmail = (req as any).user.email;
    const organizationId = (req as any).user.organizationId;

    // only admin allowed
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have access to perform this action.",
      });
    }

    // verify org ownership
    const org = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        owner_email: true,
      },
    });

    if (!org || org.owner_email !== userEmail) {
      return res.status(403).json({
        success: false,
        message:
          "Only organization owner can perform this action.",
      });
    }

    // check knowledge source exists
    const knowledgeSource =
      await prisma.knowledgeSource.findUnique({
        where: {
          id,
        },
      });

    if (!knowledgeSource) {
      return res.status(404).json({
        success: false,
        message: "Knowledge source not found.",
      });
    }

    // optional extra safety
    if (knowledgeSource.org_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized action.",
      });
    }

    await prisma.knowledgeSource.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Knowledge source deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete knowledge source error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
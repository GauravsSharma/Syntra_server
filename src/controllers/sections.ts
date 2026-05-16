import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { PLANS } from "../data/pricing";
export const addSection = async (req: Request, res: Response) => {
    try {
        const role = (req as any).user.role;
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can add sections."
            })
        }
        const { name, description, data_sources, tone, allowed_topics, blocked_topics } = req.body;
        if (!name || !description || !tone) {
            return res.status(400).json({
                success: false,
                message: "Name, description and tone are required",
            });
        }
        if (!data_sources || !Array.isArray(data_sources) || data_sources.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one data source is required",
            });
        }

        const subscription = await prisma.subscription.findFirst({
            where: {
                organization_id: (req as any).user.organizationId,
            },
            select: {
                plan: true
            }
        });
        const plan = subscription?.plan as string;
        const knowledgeLength = PLANS[plan as keyof typeof PLANS].knowledgeSources;
        console.log(knowledgeLength, data_sources.length);

        if (knowledgeLength < data_sources.length) {
            return res.status(403).json({
                success: false,
                message: `Your current plan allows only ${knowledgeLength} knowledge sources. Please upgrade your plan to add more sources.`
            })
        }
        const existingSources = await prisma.knowledgeSource.findMany({
            where: {
                id: {
                    in: data_sources
                },
                org_id: (req as any).user.organizationId
            }
        });

        if (existingSources.length !== data_sources.length) {
            return res.status(400).json({
                success: false,
                message: "Some knowledge sources are invalid"
            })
        }
        const section = await prisma.section.create({
            data: {
                userEmail: (req as any).user.email,
                name,
                description,
                tone,
                org_id: (req as any).user.organizationId,
                allowedTopics: allowed_topics || [],
                blockedTopics: blocked_topics || [],
                sourceIds: {
                    connect: existingSources.map(source => ({
                        id: source.id
                    }))
                },
                status: "active",
            }
        });
        return res.status(201).json({
            success: true,
            message: "Section added successfully",
            data: {...section, sourceIds: existingSources },
        });
    } catch (error) {
        console.error("Error adding section:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
export const getSections = async (req: Request, res: Response) => {
    try {
        const sections = await prisma.section.findMany({
            where: { org_id: (req as any).user.organizationId},
            include: {
                sourceIds: true
            }
        });
        return res.status(200).json({
            success: true,
            data: sections,
        });
    }
    catch (error) {
        console.error("Error fetching sections:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const deleteSection = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const role = (req as any).user.role;
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can delete sections."
            })
        }
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Section ID is required",
            });
        }
        const section = await prisma.section.findFirst({
            where: {
                id: id,
                userEmail: (req as any).user.email,
            },
        });
        if (!section) {
            return res.status(404).json({
                success: false,
                message: "Section not found",
            });
        }
        if (section.userEmail !== (req as any).user.email) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this section",
            });
        }
        await prisma.section.deleteMany({
            where: {
                id,
                userEmail: (req as any).user.email,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Section deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting section:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
export const toggleSectionStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const sectionId = req.params.sectionId as string;

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
        message: "Only organization owner can perform this action.",
      });
    }

    // find section
    const section = await prisma.section.findUnique({
      where: {
        id: sectionId
      },
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found.",
      });
    }

    // toggle status
    const updatedSection = await prisma.section.update({
      where: {
        id: sectionId,
      },
      data: {
        status: section.status === "active" ? "inactive" : "active",
      },
       include: {
                sourceIds: true
            }
    });

    return res.status(200).json({
      success: true,
      message: `Section ${
        updatedSection.status === "active"
          ? "activated"
          : "deactivated"
      } successfully.`,
      section: updatedSection,
    });
  } catch (error) {
    console.error("Toggle section status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
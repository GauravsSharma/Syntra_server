import { Request, Response, CookieOptions } from "express";
import { prisma } from "../lib/prisma";
import scalekit from "../config/scalkit";
import crypto from "crypto";
import { sendOrganizationInvite } from "../utils/email";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
};

export const getOrganization = async (req: Request, res: Response) => {
    try {
        const email = (req as any).user.email;
        const cookie = req.cookies.user_metadata;
        let metadata;
        if (!cookie) {
            metadata = await prisma.metadata.findUnique({
                where: { user_email: email }
            })
        }
        else {
            metadata = JSON.parse(cookie);
        }

        const organization = {
            ...(metadata || []),
            id: (req as any).user.organizationId
        }

        return res.status(200).json({
            success: true,
            organization
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const addMemberToOrganization = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).user.organizationId
        const { name, member_email } = req.body;
        if (!member_email) {
            return res.status(400).json({
                success: false,
                message: "Member email is required."
            })
        }
        const pendingUser = await prisma.teamMember.findFirst({
            where: { user_email: member_email }
        })
        if (pendingUser) {
            return res.status(400).json({
                success: false,
                message: "User is already invited."
            })
        }
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { business_name: true, owner_email: true }
        })
        // todo: invitation table m entry karo, fir email bhejo
        const token = crypto.randomBytes(32).toString("hex");
        await prisma.invitation.create({
            data: {
                email: member_email,
                organizationId: organizationId,
                token,
                role: "member",
                invitedBy: (req as any).user.email,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            }
        })
        sendOrganizationInvite(member_email, token, org?.business_name || org?.owner_email?.split("@")[0] || "");

        const member = await prisma.teamMember.create({
            data: {
                user_email: member_email,
                name: name || member_email.split("@")[0],
                organization_id: organizationId
            }
        })
        return res.status(200).json({
            success: true,
            message: "Email sent successfully.",
            member
        })
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const verifyInvitation = async (
    req: Request,
    res: Response
) => {
    try {
        const token = req.params.token as string;
        const invitation =
            await prisma.invitation.findUnique({
                where: {
                    token,
                },
            });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found",
            });
        }

        if (invitation.acceptedAt) {
            return res.status(400).json({
                success: false,
                message: "Invitation already accepted",
            });
        }

        if (
            invitation.expiresAt <
            new Date()
        ) {
            return res.status(400).json({
                success: false,
                message: "Invitation expired",
            });
        }

        return res.status(200).json({
            success: true,
            invitation: {
                email: invitation.email,
                role: invitation.role,
                organizationId:
                    invitation.organizationId,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message:
                "Failed to verify invitation",
        });
    }
};

export const acceptInvitation = async (
    req: Request,
    res: Response
) => {
    try {
        const { token } = req.body;

        const invitation =
            await prisma.invitation.findUnique({
                where: {
                    token,
                },
            });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found",
            });
        }

        if (
            invitation.email.toLowerCase() !==
            (req as any).user!.email.toLowerCase()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This invitation belongs to another email",
            });
        }

        const member =
            await prisma.teamMember.findFirst({
                where: {
                    user_email: invitation.email,
                    organization_id:
                        invitation.organizationId,
                    status: "pending",
                },
            });

        if (!member) {
            return res.status(400).json({
                success: false,
                message:
                    "No pending invitation found",
            });
        }

        await prisma.$transaction([
            prisma.teamMember.update({
                where: {
                    id: member.id,
                },
                data: {
                    status: "active",
                },
            }),

            prisma.invitation.update({
                where: {
                    id: invitation.id,
                },
                data: {
                    acceptedAt: new Date(),
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            message:
                "Invitation accepted successfully",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to accept invitation",
        });
    }
};

export const getTeamMembers = async (req: Request, res: Response) => {
    try {
        const og_id = (req as any).user.organizationId;
        const team_members = await prisma.teamMember.findMany({
            where: { organization_id: og_id }
        })
        res.status(200).json({
            success: true,
            team_members
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}
export const getMyOrganizations = async (req: Request, res: Response) => {
    try {

        const user_email = (req as any).user.email;
        const teamMembers = await prisma.teamMember.findMany({
            where: {
                user_email
            },
            select: {
                organization_id: true
            }
        });
        const organizationIds = teamMembers.map(
            (member) => member.organization_id
        );

        const organizations = await prisma.organization.findMany({
            where: {
                id: {
                    in: organizationIds
                }
            }
        });
        const user_org = await prisma.organization.findFirst({
            where: { owner_email: user_email },
        })

        return res.status(200).json({
            success: true,
            organizations: [...organizations, user_org]

        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


export const switchOrganizations = async (req: Request, res: Response) => {
    try {
        const { org_id } = req.body;
        const user_email = (req as any).user.email as string;
        const role = (req as any).user.role as string;
        const orgId = (req as any).user.organizationId;
        // Check if user is the org owner
        const ownedOrg = await prisma.organization.findFirst({
            where: { owner_email: user_email, id: org_id },
        });
        if (org_id === orgId) {
            return res.status(400).json({
                success: true,
                message: "You cannot switch in same org."
            })
        }
        // Fall back to team membership check
        const membership = !ownedOrg
            ? await prisma.teamMember.findFirst({
                where: { user_email, organization_id: org_id },
                select: { organization_id: true, role: true },
            })
            : null;

        if (!ownedOrg && !membership) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this organization.",
            });
        }

        const userSession = {
            email: user_email,
            organizationId: ownedOrg ? ownedOrg.id : membership!.organization_id,
            role: ownedOrg ? "admin" : membership!.role,
        };

        const token = jwt.sign(
            userSession,
            process.env.JWT_SECRET!,
            {
                expiresIn: "7d",
            }
        );

        const organization = ownedOrg
            ? ownedOrg
            : await prisma.organization.findUnique({
                where: { id: membership!.organization_id },
            });

        const metadata = { ...organization, role: role === "member" ? "admin" : "member" }

        res.cookie("user_session",token, COOKIE_OPTIONS);
        res.cookie("user_metadata", JSON.stringify(metadata), COOKIE_OPTIONS);

        return res.status(200).json({ success: true, organization: metadata });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};


export const deleteOrg = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).user.organizationId;
        const user_email = (req as any).user.email;
        const role = (req as any).user.role;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "Organization id missing.",
            });
        }

        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "You don't have access to perform this action.",
            });
        }

        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                owner_email: true,
            },
        });

        if (!org) {
            return res.status(404).json({
                success: false,
                message: "Organization not found.",
            });
        }

        if (user_email !== org.owner_email) {
            return res.status(403).json({
                success: false,
                message: "You don't have access to perform this action.",
            });
        }

        await scalekit.organization.deleteOrganization(organizationId)
        await prisma.organization.delete({
            where: { id: organizationId },
        });
        // clear cookies
        res.clearCookie("user_metadata");
        res.clearCookie("user_session");

        return res.status(200).json({
            success: true,
            message: "Organization deleted successfully.",
        });

    } catch (error) {
        console.error("Delete org error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

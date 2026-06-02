import type { Request, Response } from 'express';
import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from '../lib/prisma.js';
import querystring from "querystring";

export const generateRedirectUrl = async (req: Request, res: Response) => {
    try {
        const inviteToken = req.query.invite as string || "";
        const params = querystring.stringify({
            client_id: process.env.CLIENT_ID,
            redirect_uri: process.env.CLIENT_REDIRECT_URI,
            response_type: "code",
            scope: "openid email profile",
            access_type: "offline",
            prompt: "consent",
            // invitation token preserve karne ke liye
            state: inviteToken,
        });

        const googleAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        res.redirect(googleAuthUrl);
    } catch (error) {
        res.status(500).json({ message: "Authentication failed", error })
    }
}

export const googleCallback = async (req: Request, res: Response) => {
    try {
        const code = req.query.code;
        const inviteToken =
            typeof req.query.state === "string"
                ? req.query.state
                : "";

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Authorization code missing",
            });
        }

        // Exchange code for access token
        const { data } = await axios.post(
            "https://oauth2.googleapis.com/token",
            {
                code,
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                redirect_uri: process.env.CLIENT_REDIRECT_URI,
                grant_type: "authorization_code",
            }
        );

        const accessToken = data.access_token;

        // Get user profile
        const googleUser = await axios.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const {
            email,
            name,
            picture,
        } = googleUser.data;
        console.log(email,name,picture);
        
        // Create/Get User
        let user = await prisma.user.findUnique({
            where: {
                email,
            },
        });
        let org;
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    image: picture,
                },
            });
            org =  await prisma.organization.create({
                data:{
                    owner_email: email,
                    owner_id:user.id
                }
            })
            await prisma.subscription.create({
                data:{
                    organization_id:org.id,
                }
            })
            await prisma.organizationUsage.create({
                data:{
                    organization_id:org.id,
                }
            })
        }
        else{
            org = await prisma.organization.findFirst({
                where:{
                    owner_email:email,
                }
            })
        }
        // Generate JWT
        const token = jwt.sign(
            {
                role:"admin",
                organizationId: org?.id,
                email: user.email,
            },
            process.env.JWT_SECRET!,
            {
                expiresIn: "7d",
            }
        );

        // Set Cookie
        res.cookie("user_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Invitation Handling
        if (inviteToken) {
            //   const invite =
            //     await prisma.invitation.findUnique({
            //       where: {
            //         token: inviteToken,
            //       },
            //     });

            //   if (
            //     invite &&
            //     invite.email.toLowerCase() ===
            //       user.email.toLowerCase()
            //   ) {
            //     const existingMember =
            //       await prisma.teamMember.findUnique({
            //         where: {
            //           user_email_organization_id: {
            //             user_email: user.email,
            //             organization_id:
            //               invite.organization_id,
            //           },
            //         },
            //       });

            //     if (!existingMember) {
            //       await prisma.teamMember.create({
            //         data: {
            //           user_email: user.email,
            //           name: user.name || "",
            //           organization_id:
            //             invite.organization_id,
            //           role: invite.role,
            //           status: "active",
            //         },
            //       });
            //     }

            //     // Optional:
            //     // Mark invitation accepted
            //   }
        }

        return res.redirect(
            `${process.env.CLIENT_URL}/dashboard`
        );
    } catch (error) {
        console.error(error);
        return res.redirect(
            `${process.env.CLIENT_URL}/login?error=google_auth_failed`
        );
    }
};

export const getUserInfo = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        console.log(user);

        const userInfo = await prisma.user.findUnique({
            where: { email: user.email },
            select: {
                email: true,
                name: true,

            }
        });
        return res.status(200).json({ user: userInfo });
    } catch (error) {
        res.status(500).json({ message: "Failed to get user info", error })
    }
}

export const addMetadata = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        const { businessName, websiteUrl, externalLinks } = req.body;
        if (!businessName || !websiteUrl) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const metaData = await prisma.organization.update({
            where: { id: user.organizationId },
            data: {
                business_name: businessName,
                website_url: websiteUrl,
                external_links: externalLinks,
                owner_email: user.email,
            }

        })
        res.cookie("user_metadata", JSON.stringify(metaData), {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
        });


        return res.status(200).json({ message: "Metadata added successfully", metaData });
    }
    catch (error) {
        console.log(error);

        res.status(500).json({ message: "Failed to add metadata", error })
    }
}

export const getMetadata = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const role = (req as any).user.role;
        console.log("lolllll", role);

        const cookie = req.cookies.user_metadata;
        if (cookie) {
            return res.status(200).json({ source: "cache", metadata: JSON.parse(cookie) });
        }
        let metadata = await prisma.organization.findUnique({
            where: { id: user.organizationId },
        })
        if (!metadata || !metadata.business_name || !metadata.website_url) {
            return res.status(404).json({ message: "Metadata not found" });
        }
        const data = { ...metadata, role }
        res.cookie("user_metadata", JSON.stringify(data), {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
        });
        return res.status(200).json({
            source: "database",
            metadata: data
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Failed to get metadata", error })
    }
}

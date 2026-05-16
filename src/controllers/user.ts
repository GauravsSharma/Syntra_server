import type { Request, Response } from 'express';
import crypto from "crypto";
import scalekit from '../config/scalkit.js';
import { prisma } from '../lib/prisma.js';
import { subscribe } from 'diagnostics_channel';

export const generateRedirectUrl = async (req: Request, res: Response) => {
    try {
        const state = crypto.randomBytes(16).toString("hex");
        res.cookie("sk_state", state, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
        })
        const redirectUrl = process.env.SCALEKIT_REDIRECT_URI!;
        const options = {
            scops: ["email", "profile", "openid", "offline_access"],
            state
        }
        const url = await scalekit.getAuthorizationUrl(redirectUrl, options);
        res.redirect(url);
    } catch (error) {
        res.status(500).json({ message: "Authentication failed", error })
    }
}
export const validateScalekitCallback = async (req: Request, res: Response) => {
    try {
        const incomingState = req.query.state;
        const cookieState = req.cookies.sk_state;
        if (incomingState !== cookieState) {
            return res.status(401).send("Invalid state");
        }
        const code = req.query.code as string;
        const error = req.query.error as string;
        const errorDescription = req.query.error_description as string;

        if (error) {
            return res.status(401).json({ error, errorDescription });
        }
        if (!code) {
            return res.status(400).json({ error: "No code provided" });
        }

        const redirectUri = process.env.SCALEKIT_REDIRECT_URI!;
        const authResult = await scalekit.authenticateWithCode(code, redirectUri);
        const { user, idToken } = authResult
        const claims = await scalekit.validateToken(idToken);
        let organizationId =
            (claims as any).organization_id ||
            (claims as any).org_id ||
            (claims as any).oid ||
            null;

        const userr = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (!userr) {
            const new_user = await prisma.user.create({
                data: {
                    email: user.email,
                    name: user.name || user.givenName,
                }
            })
            // yha check kaaro isAdmin
            const roles = (claims as any).roles || [];
            const isAdmin = roles.includes("admin");
            if(!isAdmin){
                const org = await scalekit.organization.createOrganization(user.email);
                organizationId = org.organization?.id;
            }
            const currentPeriodEnd = new Date();
            currentPeriodEnd.setFullYear(
                currentPeriodEnd.getFullYear() + 1
            );
            await prisma.organization.create({
                data: {
                    id: organizationId,
                    owner_id: new_user.id,
                    isPersonal: true,
                    owner_email: user.email,
                    usage: {
                        create: {}
                    },

                    subscription: {
                        create: {
                            current_period_start: new Date(),
                            current_period_end: currentPeriodEnd
                        }
                    }
                }
            });

        }
        const userSession = {
            email: user.email,
            organization_id: organizationId,
            role: "admin"
        }

        res.cookie("user_session", JSON.stringify(userSession), {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
        });

        res.redirect(process.env.CLIENT_URL!);
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Authentication failed", error })
    }
}
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
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
        console.log("lolllll",role);
        
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
        const data = {...metadata, role}
        res.cookie("user_metadata", JSON.stringify(data), {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: "/",
        });
        return res.status(200).json({
            source: "database",
            metadata:data
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Failed to get metadata", error })
    }
}
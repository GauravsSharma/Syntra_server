import type { Request, Response } from 'express';
import crypto from "crypto";
import scalekit from '../config/scalkit.js';
import { prisma } from '../lib/prisma.js';
import { subscribe } from 'diagnostics_channel';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, organization_id, role, name } = req.body;
        console.log(email, organization_id, role, name );
        
        const userr = await prisma.user.findUnique({
            where: { email: email }
        })

        if (!userr) {
            const new_user = await prisma.user.create({
                data: {
                    email: email,
                    name: name
                }
            })

            const isAdmin = role === "admin";
            if (!isAdmin) {
                const org = await scalekit.organization.createOrganization(email);
                organization_id;
            }
            const currentPeriodEnd = new Date();
            currentPeriodEnd.setFullYear(
                currentPeriodEnd.getFullYear() + 1
            );
            await prisma.organization.create({
                data: {
                    id: organization_id,
                    owner_id: new_user.id,
                    isPersonal: true,
                    owner_email: email,
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
        return res.status(200).json({
            success: true,
            message: "Login success"
        })


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
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
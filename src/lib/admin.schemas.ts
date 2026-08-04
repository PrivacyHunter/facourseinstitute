import { z } from "zod";

export const enrollmentDecisionSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
  message: z.string().trim().max(1000).nullable(),
});

export const addAdminSchema = z.object({
  email: z.string().trim().email().max(200),
});

export const removeAdminSchema = z.object({
  userId: z.string().uuid(),
});
import { z } from "zod";

export const enrollmentDecisionSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
  message: z.string().trim().max(1000).nullable(),
});
import { z } from "zod";

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), { message: "URL must start with https://" });

export const submissionSchema = z.object({
  walletAddress: z.string().min(24).max(80),
  chain: z.enum(["sol", "bsc"]),
  label: z.string().min(2).max(80),
  notes: z.string().max(800).optional().nullable(),
  twitter: httpsUrl.optional().nullable(),
  telegram: httpsUrl.optional().nullable(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const feedbackSchema = z.object({
  type: z.enum(["feedback", "removal_request"]),
  message: z.string().min(10).max(2000),
  walletAddress: z.string().min(24).max(96).optional().nullable(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

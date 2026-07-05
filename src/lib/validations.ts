import { z } from "zod";
import { CaseType, CasePriority } from "@/types";

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const caseSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseType: z.nativeEnum(CaseType),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  deadlineDate: z.string().optional(),
});

export type CaseInput = z.infer<typeof caseSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

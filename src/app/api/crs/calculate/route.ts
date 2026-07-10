import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api/errors";
import { calculateCRS } from "@/lib/crs/scoring";
import { z } from "zod";

const calculateSchema = z.object({
  age: z.number().min(17).max(100),
  levelOfEducation: z.enum(["secondary","oneYearDegree","twoYearDegree","bachelors","masters","phd"]),
  canadianWorkExperience: z.number().min(0).max(10),
  firstLanguage: z.object({ speaking: z.number(), listening: z.number(), reading: z.number(), writing: z.number() }),
  secondLanguage: z.object({ speaking: z.number(), listening: z.number(), reading: z.number(), writing: z.number() }).optional(),
  hasSpouse: z.boolean().optional().default(false),
  spouseLevelOfEducation: z.enum(["secondary","oneYearDegree","twoYearDegree","bachelors","masters","phd"]).optional(),
  spouseFirstLanguage: z.object({ speaking: z.number(), listening: z.number(), reading: z.number(), writing: z.number() }).optional(),
  spouseCanadianWorkExperience: z.number().min(0).max(10).optional(),
  canadianEducation: z.enum(["none","oneYear","twoYear","phd"]).optional().default("none"),
  canadianJobOffer: z.enum(["none","noc00","other"]).optional().default("none"),
  provincialNomination: z.boolean().optional().default(false),
  frenchProficiency: z.boolean().optional().default(false),
  siblingInCanada: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = calculateSchema.parse(body);
    const breakdown = calculateCRS(parsed);
    return successResponse(breakdown);
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

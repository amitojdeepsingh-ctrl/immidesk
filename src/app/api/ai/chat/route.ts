import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api/errors";
import { searchKnowledgeBase } from "@/lib/knowledge-base/search";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return handleApiError(new Error("Message is required"));
    }

    const results = searchKnowledgeBase(message, 3);

    if (results.length === 0) {
      return successResponse({
        reply: "I couldn't find information about that in my knowledge base. The Knowledge Assistant is grounded in IRPR/IRCC regulations and can only answer questions covered in those sources. Try rephrasing your question or asking about specific immigration programs, requirements, or procedures.",
        sources: [],
      });
    }

    const best = results[0];
    const citations = best.entry.citations
      .map((c) => c.section)
      .join(", ");

    let reply = best.entry.content;

    if (results.length > 1) {
      reply += "\n\n**Related information:**";
      for (let i = 1; i < results.length; i++) {
        const r = results[i];
        const citationLabels = r.entry.citations.map((c) => c.section).join(", ");
        if (r.highlights.length > 0) {
          reply += `\n• **${r.entry.title}** — ${r.highlights[0]} (${citationLabels})`;
        }
      }
    }

    return successResponse({
      reply,
      sources: [
        { title: best.entry.title, citations },
        ...results.slice(1).map((r) => ({
          title: r.entry.title,
          citations: r.entry.citations.map((c) => c.section).join(", "),
        })),
      ],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

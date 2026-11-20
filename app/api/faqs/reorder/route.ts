import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { toObjectId } from "@/lib/mongo-sanitize";
import { requireAdmin } from "@/lib/api-auth";
import { internalError } from "@/lib/api-error";
import { revalidatePath } from "next/cache";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import { validateCSRFToken } from "@/lib/csrf";

// PATCH - Batch update FAQ orders (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // CSRF protection
    const body = await request.json();
    const csrfToken = request.headers.get("X-CSRF-Token") || body._csrf;
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }
    
    // Remove CSRF token from body if present
    delete body._csrf;
    
    const { faqs } = body; // Array of { id, order } objects

    if (!Array.isArray(faqs) || faqs.length === 0) {
      return NextResponse.json(
        { error: "FAQs array is required" },
        { status: 400 }
      );
    }

    // Validate and sanitize FAQ data
    const sanitizedFaqs: { id: NonNullable<ReturnType<typeof toObjectId>>; order: number }[] =
      [];
    for (const faq of faqs as { id: string; order: number }[]) {
      const sanitizedId = sanitizeString(String(faq.id || ""), 50);
      const sanitizedOrder = Number(faq.order);
      const objectId = toObjectId(sanitizedId);

      if (!objectId) {
        return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
      }

      if (isNaN(sanitizedOrder) || sanitizedOrder < 0) {
        return NextResponse.json(
          { error: "Invalid order value" },
          { status: 400 }
        );
      }

      sanitizedFaqs.push({ id: objectId, order: sanitizedOrder });
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    // Batch update all FAQs with their new orders
    const bulkOps = sanitizedFaqs.map((faq) => ({
      updateOne: {
        filter: { _id: faq.id },
        update: {
          $set: {
            order: faq.order,
            updatedAt: new Date(),
            updatedBy: auth.user.id,
            updatedByName: auth.user.name || "Unknown",
          },
        },
      },
    }));

    const result = await faqsCollection.bulkWrite(bulkOps);

    // Revalidate paths
    revalidatePath("/faq");
    revalidatePath("/");

    triggerPusherEvent(PUSHER_EVENTS.FAQ_UPDATED);

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return internalError("Error batch updating FAQ orders:", error);
  }
}


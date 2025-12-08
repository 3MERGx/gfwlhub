import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// PATCH - Batch update FAQ orders (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const sanitizedFaqs = faqs.map((faq: { id: string; order: number }) => {
      const sanitizedId = sanitizeString(String(faq.id || ""), 50);
      const sanitizedOrder = Number(faq.order);
      
      if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
        throw new Error("Invalid FAQ ID");
      }
      
      if (isNaN(sanitizedOrder) || sanitizedOrder < 0) {
        throw new Error("Invalid order value");
      }
      
      return { id: sanitizedId, order: sanitizedOrder };
    });

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    // Batch update all FAQs with their new orders
    const bulkOps = sanitizedFaqs.map((faq) => ({
      updateOne: {
        filter: { _id: new ObjectId(faq.id) },
        update: {
          $set: {
            order: faq.order,
            updatedAt: new Date(),
            updatedBy: session.user.id,
            updatedByName: session.user.name || "Unknown",
          },
        },
      },
    }));

    const result = await faqsCollection.bulkWrite(bulkOps);

    // Revalidate paths
    revalidatePath("/faq");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    safeLog.error("Error batch updating FAQ orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


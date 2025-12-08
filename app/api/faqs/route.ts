import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// GET - Fetch all FAQs
export async function GET(request: Request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const faqs = await faqsCollection
      .find({})
      .sort({ order: 1, createdAt: 1 }) // Sort by order, then by creation date
      .toArray();

    return NextResponse.json(
      faqs,
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching FAQs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new FAQ (admin only)
export async function POST(request: NextRequest) {
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
    
    const { question, answer, order } = body;

    // Sanitize inputs
    const sanitizedQuestion = sanitizeString(String(question || ""), 500);
    const sanitizedAnswer = sanitizeString(String(answer || ""), 5000);
    const sanitizedOrder = order !== undefined ? Number(order) : 999;

    if (!sanitizedQuestion || !sanitizedAnswer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    if (isNaN(sanitizedOrder) || sanitizedOrder < 0) {
      return NextResponse.json(
        { error: "Invalid order value" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const newFAQ = {
      question: sanitizedQuestion.trim(),
      answer: sanitizedAnswer.trim(),
      order: sanitizedOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
      createdByName: session.user.name || "Unknown",
    };

    const result = await faqsCollection.insertOne(newFAQ);

    // Revalidate paths
    revalidatePath("/faq");
    revalidatePath("/");

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...newFAQ,
    });
  } catch (error) {
    safeLog.error("Error creating FAQ:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update an FAQ (admin only)
export async function PUT(request: NextRequest) {
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
    const { id, question, answer, order } = body;

    // Sanitize inputs
    const sanitizedId = sanitizeString(String(id || ""), 50);
    const sanitizedQuestion = sanitizeString(String(question || ""), 500);
    const sanitizedAnswer = sanitizeString(String(answer || ""), 5000);
    const sanitizedOrder = order !== undefined ? Number(order) : undefined;

    if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
      return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
    }

    if (!sanitizedQuestion || !sanitizedAnswer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    if (sanitizedOrder !== undefined && (isNaN(sanitizedOrder) || sanitizedOrder < 0)) {
      return NextResponse.json(
        { error: "Invalid order value" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const updateData: {
      question: string;
      answer: string;
      order?: number;
      updatedAt: Date;
      updatedBy: string;
      updatedByName: string;
    } = {
      question: sanitizedQuestion.trim(),
      answer: sanitizedAnswer.trim(),
      updatedAt: new Date(),
      updatedBy: session.user.id,
      updatedByName: session.user.name || "Unknown",
    };

    if (sanitizedOrder !== undefined) {
      updateData.order = sanitizedOrder;
    }

    const result = await faqsCollection.updateOne(
      { _id: new ObjectId(sanitizedId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    // Revalidate paths
    revalidatePath("/faq");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error updating FAQ:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an FAQ (admin only)
export async function DELETE(request: NextRequest) {
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
    const csrfToken = request.headers.get("X-CSRF-Token");
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Sanitize and validate
    const sanitizedId = id ? sanitizeString(String(id), 50) : "";

    if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
      return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const result = await faqsCollection.deleteOne({ _id: new ObjectId(sanitizedId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    // Revalidate paths
    revalidatePath("/faq");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error deleting FAQ:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


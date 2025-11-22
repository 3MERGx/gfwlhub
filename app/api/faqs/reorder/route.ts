import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH - Batch update FAQ orders (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { faqs } = body; // Array of { id, order } objects

    if (!Array.isArray(faqs) || faqs.length === 0) {
      return NextResponse.json(
        { error: "FAQs array is required" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    // Batch update all FAQs with their new orders
    const bulkOps = faqs.map((faq: { id: string; order: number }) => ({
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

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error batch updating FAQ orders:", error);
    return NextResponse.json(
      { error: "Failed to update FAQ orders" },
      { status: 500 }
    );
  }
}


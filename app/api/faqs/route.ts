import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Fetch all FAQs
export async function GET() {
  try {
    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const faqs = await faqsCollection
      .find({})
      .sort({ order: 1, createdAt: 1 }) // Sort by order, then by creation date
      .toArray();

    return NextResponse.json(faqs);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json(
      { error: "Failed to fetch FAQs" },
      { status: 500 }
    );
  }
}

// POST - Create a new FAQ (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, answer, order } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const newFAQ = {
      question: question.trim(),
      answer: answer.trim(),
      order: order !== undefined ? order : 999, // Default to end of list
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
      createdByName: session.user.name || "Unknown",
    };

    const result = await faqsCollection.insertOne(newFAQ);

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...newFAQ,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json(
      { error: "Failed to create FAQ" },
      { status: 500 }
    );
  }
}

// PUT - Update an FAQ (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, question, answer, order } = body;

    if (!id) {
      return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
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
      question: question.trim(),
      answer: answer.trim(),
      updatedAt: new Date(),
      updatedBy: session.user.id,
      updatedByName: session.user.name || "Unknown",
    };

    if (order !== undefined) {
      updateData.order = order;
    }

    const result = await faqsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json(
      { error: "Failed to update FAQ" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an FAQ (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    const db = await getGFWLDatabase();
    const faqsCollection = db.collection("faqs");

    const result = await faqsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json(
      { error: "Failed to delete FAQ" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// POST - Publish/enable a game (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    // Only admins can publish games
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

    const { slug } = await params;
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);

    if (!sanitizedSlug) {
      return NextResponse.json(
        { error: "Invalid game slug" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");

    // Get the game
    const game = await gamesCollection.findOne({ slug: sanitizedSlug });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Check if game has minimum required fields
    const hasRequiredFields = 
      game.title && 
      game.releaseDate && 
      game.developer && 
      game.publisher;

    if (!hasRequiredFields) {
      return NextResponse.json(
        { error: "Game does not have the minimum required fields to be published" },
        { status: 400 }
      );
    }

    // Update game to set featureEnabled to true
    await gamesCollection.updateOne(
      { slug: sanitizedSlug },
      {
        $set: {
          featureEnabled: true,
          publishedAt: new Date(),
          publishedBy: session.user.id,
        },
      }
    );

    // Revalidate paths
    revalidatePath("/dashboard/games");
    revalidatePath(`/games/${sanitizedSlug}`);
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error publishing game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


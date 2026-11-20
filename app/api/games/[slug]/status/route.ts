import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireSession } from "@/lib/api-auth";
import { canManageUsers } from "@/lib/crowdsource-service-mongodb";
import { internalError, jsonError } from "@/lib/api-error";

// GET - Get game status (check if it has required fields and is ready to publish)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const { slug } = await params;
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);

    if (!sanitizedSlug) {
      return jsonError("Invalid game slug", 400);
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");

    const game = await gamesCollection.findOne({ slug: sanitizedSlug });

    if (!game) {
      return jsonError("Game not found", 404);
    }

    const requiredFields = {
      title: !!game.title,
      releaseDate: !!game.releaseDate,
      developer: !!game.developer,
      publisher: !!game.publisher,
    };

    const hasRequiredFields =
      requiredFields.title &&
      requiredFields.releaseDate &&
      requiredFields.developer &&
      requiredFields.publisher;

    const status: {
      hasRequiredFields: boolean;
      requiredFields: typeof requiredFields;
      readyToPublish?: boolean;
      featureEnabled?: boolean;
    } = {
      hasRequiredFields,
      requiredFields,
    };

    if (canManageUsers(auth.user)) {
      status.readyToPublish = game.readyToPublish || false;
      status.featureEnabled = game.featureEnabled || false;
    }

    return NextResponse.json(status, {
      headers: {
        "Cache-Control": "private, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return internalError("Error fetching game status:", error);
  }
}

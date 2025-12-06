import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { addBannedProvider } from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

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

    // Only admins can ban providers
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
    
    const { userId, provider, providerAccountId, reason, notes } = body;

    // Sanitize inputs
    const sanitizedProvider = sanitizeString(String(provider || ""), 50);
    const sanitizedProviderAccountId = sanitizeString(String(providerAccountId || ""), 200);
    const sanitizedReason = sanitizeString(String(reason || ""), 2000);
    const sanitizedNotes = notes ? sanitizeString(String(notes), 2000) : undefined;
    const sanitizedUserId = userId ? sanitizeString(String(userId), 50) : undefined;

    if (!sanitizedProvider || !sanitizedProviderAccountId || !sanitizedReason) {
      return NextResponse.json(
        { error: "Provider, provider account ID, and reason are required" },
        { status: 400 }
      );
    }

    // Add to banned providers collection
    await addBannedProvider({
      provider: sanitizedProvider,
      providerAccountId: sanitizedProviderAccountId,
      userId: sanitizedUserId,
      reason: sanitizedReason,
      notes: sanitizedNotes,
      bannedBy: session.user.id,
      bannedByName: session.user.name || "Unknown",
    });

    // Revalidate paths
    revalidatePath("/dashboard/users");
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error banning provider:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


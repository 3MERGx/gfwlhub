/**
 * Google Safe Browsing API Integration
 * Free for non-commercial use
 * No billing/credit card required
 */

export interface SafeBrowsingResponse {
  matches?: Array<{
    threatType: string;
    platformType: string;
    threat: {
      url: string;
    };
    threatEntryType: string;
    cacheDuration: string;
  }>;
}

export interface SafeBrowsingError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Check if a URL is safe using Google Safe Browsing API
 * @param url The URL to check
 * @param apiKey Google Safe Browsing API key
 * @returns Object with isSafe boolean and threatType if unsafe
 */
export async function checkUrlSafety(
  url: string,
  apiKey: string
): Promise<{
  success: boolean;
  isSafe?: boolean;
  threatType?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client: {
            clientId: "gfwl-hub",
            clientVersion: "1.0",
          },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: Failed to check URL`;
      try {
        const errorData = (await response.json()) as SafeBrowsingError;
        errorMessage = errorData.error?.message || errorMessage;
        console.error("Google Safe Browsing API error:", errorData);
      } catch {
        const text = await response.text();
        console.error("Google Safe Browsing API error (non-JSON):", text);
        errorMessage = text || errorMessage;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = (await response.json()) as SafeBrowsingResponse;

    // If matches array exists and has items, URL is unsafe
    if (data.matches && data.matches.length > 0) {
      return {
        success: true,
        isSafe: false,
        threatType: data.matches[0].threatType,
      };
    }

    // No matches means URL is safe
    return {
      success: true,
      isSafe: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a human-readable threat type name
 */
export function getThreatTypeName(threatType: string): string {
  const threatNames: Record<string, string> = {
    MALWARE: "Malware",
    SOCIAL_ENGINEERING: "Phishing",
    UNWANTED_SOFTWARE: "Unwanted Software",
    POTENTIALLY_HARMFUL_APPLICATION: "Potentially Harmful Application",
  };
  return threatNames[threatType] || threatType;
}


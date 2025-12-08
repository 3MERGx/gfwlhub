/**
 * Common languages list for autocomplete
 * Based on ISO 639-1 language codes with common names
 */

export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Japanese",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Korean",
  "Arabic",
  "Hindi",
  "Dutch",
  "Polish",
  "Turkish",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Czech",
  "Romanian",
  "Hungarian",
  "Hebrew",
  "Ukrainian",
  "Malay",
  "Tagalog",
  "Bengali",
  "Urdu",
  "Persian",
  "Swahili",
  "Bulgarian",
  "Croatian",
  "Serbian",
  "Slovak",
  "Slovenian",
  "Lithuanian",
  "Latvian",
  "Estonian",
  "Catalan",
  "Basque",
  "Galician",
  "Icelandic",
  "Maltese",
  "Albanian",
  "Macedonian",
  "Bosnian",
  "Georgian",
  "Armenian",
  "Azerbaijani",
  "Kazakh",
  "Mongolian",
  "Nepali",
  "Sinhala",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Amharic",
  "Afrikaans",
  "Zulu",
  "Xhosa",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Somali",
  "Kinyarwanda",
  "Luganda",
  "Kiswahili",
  "Afar",
  "Oromo",
  "Tigrinya",
  "Welsh",
  "Irish",
  "Scottish Gaelic",
  "Breton",
  "Cornish",
  "Manx",
  "Esperanto",
].sort();

/**
 * Filter languages based on search query
 */
export function filterLanguages(query: string): string[] {
  if (!query.trim()) {
    return COMMON_LANGUAGES.slice(0, 10); // Show first 10 when empty
  }
  const lowerQuery = query.toLowerCase();
  return COMMON_LANGUAGES.filter((lang) =>
    lang.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit to 10 suggestions
}


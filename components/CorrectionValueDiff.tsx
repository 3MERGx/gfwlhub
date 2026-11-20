"use client";

type DiffValue = string | number | boolean | string[] | null | undefined;

interface CorrectionValueDiffProps {
  oldValue: DiffValue;
  newValue: DiffValue;
  /** Show clearing-field language for empty new values */
  showClearHint?: boolean;
}

function normalizeToLines(value: DiffValue): string[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "boolean") {
    return [value ? "Yes" : "No"];
  }
  const str = String(value);
  if (str.includes("\n")) {
    return str.split("\n").map((line) => line.trimEnd());
  }
  return [str];
}

function formatDisplay(
  value: DiffValue,
  isNewValue = false
): string {
  if (value === null || value === undefined || value === "") {
    return isNewValue ? "(clearing field)" : "N/A";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return isNewValue ? "(clearing field)" : "N/A";
    }
    return value.join("\n");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

/**
 * Side-by-side current vs proposed values with simple add/remove highlighting
 * for line-based and array fields.
 */
export default function CorrectionValueDiff({
  oldValue,
  newValue,
  showClearHint = true,
}: CorrectionValueDiffProps) {
  const oldLines = normalizeToLines(oldValue);
  const newLines = normalizeToLines(newValue);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const useLineDiff =
    oldLines.length > 1 ||
    newLines.length > 1 ||
    Array.isArray(oldValue) ||
    Array.isArray(newValue);

  const isClearing =
    newValue === null ||
    newValue === "" ||
    (Array.isArray(newValue) && newValue.length === 0);

  return (
    <div className="space-y-2">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
            Current value
          </h5>
          <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 min-h-[3rem]">
            {useLineDiff && oldLines.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {oldLines.map((line, index) => {
                  const removed = !newSet.has(line);
                  return (
                    <li
                      key={`old-${index}-${line.slice(0, 24)}`}
                      className={`whitespace-pre-wrap break-all rounded px-1 ${
                        removed
                          ? "bg-red-500/15 text-red-700 dark:text-red-300 line-through"
                          : "text-[rgb(var(--text-secondary))]"
                      }`}
                    >
                      {line || " "}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <pre className="text-[rgb(var(--text-secondary))] text-sm whitespace-pre-wrap break-all">
                {formatDisplay(oldValue)}
              </pre>
            )}
          </div>
        </div>
        <div>
          <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
            Proposed value
          </h5>
          <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 border-l-4 border-[#107c10] min-h-[3rem]">
            {useLineDiff && newLines.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {newLines.map((line, index) => {
                  const added = !oldSet.has(line);
                  return (
                    <li
                      key={`new-${index}-${line.slice(0, 24)}`}
                      className={`whitespace-pre-wrap break-all rounded px-1 ${
                        added
                          ? "bg-green-500/15 text-[#107c10] font-medium"
                          : "text-[#107c10]"
                      }`}
                    >
                      {line || " "}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <pre className="text-[#107c10] text-sm whitespace-pre-wrap break-all">
                {formatDisplay(newValue, true)}
              </pre>
            )}
          </div>
        </div>
      </div>
      {showClearHint && isClearing && (
        <p className="text-xs text-yellow-400">
          This will clear/remove the field value
        </p>
      )}
    </div>
  );
}

export function formatCorrectionValue(
  value: DiffValue,
  isNewValue = false
): string {
  return formatDisplay(value, isNewValue);
}

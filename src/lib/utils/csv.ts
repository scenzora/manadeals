/** Minimal CSV parser covering quoted fields and embedded commas. */
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((entry) => entry.some((cell) => cell.trim() !== ""));
  if (!header) return [];

  const keys = header.map((key) => key.trim());
  return body.map((entry) =>
    Object.fromEntries(keys.map((key, index) => [key, (entry[index] ?? "").trim()])),
  );
}

/**
 * Serialises rows to CSV. Cells that start with = + - @ are prefixed with an
 * apostrophe so a spreadsheet cannot run them as formulas.
 */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

/**
 * Minimal Markdown → HTML renderer for wiki pages.
 *
 * Deliberately not a full Markdown implementation: it covers the subset the
 * team actually writes (headings, lists, tables, code, links, emphasis) and
 * **escapes every input character first**, so an author cannot inject script
 * tags or event handlers through a wiki page. That removes the need for both a
 * Markdown parser and an HTML sanitiser dependency.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (character) => ESCAPES[character]!);
}

/** Only http(s), mailto and same-site paths may become links. */
function safeHref(href: string) {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:|\/)/i.test(trimmed)) return trimmed;
  return "#";
}

/** Inline formatting, applied to already-escaped text. */
function renderInline(text: string) {
  return text
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
      const url = safeHref(href);
      const external = /^https?:\/\//i.test(url);
      return `<a href="${url}"${
        external ? ' target="_blank" rel="noopener noreferrer"' : ""
      } class="md-link">${label}</a>`;
    });
}

function renderTableRow(line: string, cell: "td" | "th") {
  const cells = line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((value) => `<${cell}>${renderInline(value.trim())}</${cell}>`)
    .join("");
  return `<tr>${cells}</tr>`;
}

export function renderMarkdown(markdown: string): string {
  const lines = escapeHtml(markdown ?? "").split("\n");
  const html: string[] = [];

  let inCodeBlock = false;
  let listType: "ul" | "ol" | null = null;
  let inTable = false;

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  function closeTable() {
    if (inTable) {
      html.push("</tbody></table></div>");
      inTable = false;
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const trimmed = line.trim();

    // Fenced code blocks are emitted verbatim (already escaped).
    if (trimmed.startsWith("```")) {
      closeList();
      closeTable();
      html.push(inCodeBlock ? "</code></pre>" : '<pre class="md-pre"><code>');
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      html.push(line);
      continue;
    }

    if (trimmed === "") {
      closeList();
      closeTable();
      continue;
    }

    // Tables: | a | b |  followed by a separator row such as | --- | :--- |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const next = lines[index + 1]?.trim() ?? "";
      const isSeparator = /^\|[\s:|-]+\|$/.test(next) && next.includes("-");
      if (!inTable && isSeparator) {
        closeList();
        html.push('<div class="md-table-wrap"><table class="md-table"><thead>');
        html.push(renderTableRow(trimmed, "th"));
        html.push("</thead><tbody>");
        inTable = true;
        index += 1; // skip the separator row
        continue;
      }
      if (inTable) {
        html.push(renderTableRow(trimmed, "td"));
        continue;
      }
    } else {
      closeTable();
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      html.push(`<h${level} class="md-h${level}">${renderInline(heading[2]!)}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      closeList();
      html.push('<hr class="md-hr" />');
      continue;
    }

    if (trimmed.startsWith("&gt; ")) {
      closeList();
      html.push(`<blockquote class="md-quote">${renderInline(trimmed.slice(5))}</blockquote>`);
      continue;
    }

    const unordered = /^[-*]\s+(.*)$/.exec(trimmed);
    if (unordered) {
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="md-ul">');
        listType = "ul";
      }
      html.push(`<li>${renderInline(unordered[1]!)}</li>`);
      continue;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="md-ol">');
        listType = "ol";
      }
      html.push(`<li>${renderInline(ordered[1]!)}</li>`);
      continue;
    }

    closeList();
    html.push(`<p class="md-p">${renderInline(trimmed)}</p>`);
  }

  closeList();
  closeTable();
  if (inCodeBlock) html.push("</code></pre>");

  return html.join("\n");
}

/** Rough reading time, shown at the top of a wiki page. */
export function readingMinutes(markdown: string) {
  const words = (markdown ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Collects `##`/`###` headings so a page can render its own table of contents. */
export function extractHeadings(markdown: string) {
  const headings: { level: number; text: string; id: string }[] = [];
  let inCodeBlock = false;

  for (const line of (markdown ?? "").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.*)$/.exec(trimmed);
    if (!match) continue;

    const text = match[2]!.replace(/[*`]/g, "");
    headings.push({
      level: match[1]!.length,
      text,
      id: text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    });
  }

  return headings;
}

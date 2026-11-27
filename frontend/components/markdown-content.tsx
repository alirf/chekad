import type { ReactNode } from "react";

function renderInline(value: string): ReactNode[] {
  return value.split(/(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

export function MarkdownContent({ source }: { source: string }) {
  const lines = source.replace(/\\r\\n/g, "\\n").split("\\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("### ")) { blocks.push(<h3 key={index}>{renderInline(line.slice(4))}</h3>); index += 1; continue; }
    if (line.startsWith("## ")) { blocks.push(<h2 key={index}>{renderInline(line.slice(3))}</h2>); index += 1; continue; }
    if (line.startsWith("# ")) { blocks.push(<h2 key={index}>{renderInline(line.slice(2))}</h2>); index += 1; continue; }
    if (line.startsWith("> ")) { blocks.push(<blockquote key={index}>{renderInline(line.slice(2))}</blockquote>); index += 1; continue; }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\\s*[-*] /.test(lines[index])) { items.push(lines[index].replace(/^\\s*[-*] /, "")); index += 1; }
      blocks.push(<ul key={index}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,3} |[-*] |> )/.test(lines[index].trim())) { paragraph.push(lines[index].trim()); index += 1; }
    blocks.push(<p key={index}>{paragraph.map((part, partIndex) => <span key={partIndex}>{part}{partIndex < paragraph.length - 1 ? <br /> : null}</span>)}</p>);
  }
  return <div className="markdown-content">{blocks}</div>;
}

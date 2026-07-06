import React from 'react';
import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split text by triple backticks to isolate code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-800 dark:text-zinc-150 break-words">
      {parts.map((part, index) => {
        // Render Code Block
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          return <CodeBlock key={index} language={language} code={code} />;
        }

        // Render processed text blocks
        return <div key={index} className="space-y-2">{renderBlocks(part)}</div>;
      })}
    </div>
  );
};

// Represents a parsed block of content
type Block =
  | { type: 'p'; text: string }
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'spacer' };

function renderBlocks(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Headers
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.substring(2) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.substring(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.substring(4) });
      i++;
      continue;
    }

    // 2. Blockquotes
    if (trimmed.startsWith('>')) {
      let quoteText = trimmed.substring(1).trim();
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteText += ' ' + lines[i].trim().substring(1).trim();
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteText });
      continue;
    }

    // 3. Unordered list
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const items: string[] = [trimmed.substring(2)];
      i++;
      while (i < lines.length) {
        const nextTrimmed = lines[i].trim();
        if (nextTrimmed.startsWith('* ') || nextTrimmed.startsWith('- ')) {
          items.push(nextTrimmed.substring(2));
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 4. Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const dotIdx = trimmed.indexOf('.');
      const items: string[] = [trimmed.substring(dotIdx + 1).trim()];
      i++;
      while (i < lines.length) {
        const nextTrimmed = lines[i].trim();
        if (/^\d+\.\s/.test(nextTrimmed)) {
          const nextDotIdx = nextTrimmed.indexOf('.');
          items.push(nextTrimmed.substring(nextDotIdx + 1).trim());
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // 5. Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      // Check if next line is a separator row e.g. |---|---|
      let isTable = false;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith('|') && nextLine.endsWith('|') && nextLine.includes('-')) {
          isTable = true;
        }
      }

      if (isTable) {
        const headers = parseTableRow(line);
        const rows: string[][] = [];
        // Skip separator row
        i += 2;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine.startsWith('|') && nextLine.endsWith('|')) {
            rows.push(parseTableRow(lines[i]));
            i++;
          } else {
            break;
          }
        }
        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }

    // 6. Spacer
    if (!trimmed) {
      blocks.push({ type: 'spacer' });
      i++;
      continue;
    }

    // 7. Regular paragraph
    blocks.push({ type: 'p', text: line });
    i++;
  }

  return blocks.map((block, idx) => {
    switch (block.type) {
      case 'h1':
        return (
          <h1
            key={idx}
            className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-1"
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(block.text) }}
          />
        );
      case 'h2':
        return (
          <h2
            key={idx}
            className="text-lg font-bold mt-3 mb-1.5 text-gray-900 dark:text-white"
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(block.text) }}
          />
        );
      case 'h3':
        return (
          <h3
            key={idx}
            className="text-base font-semibold mt-2.5 mb-1 text-gray-900 dark:text-white"
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(block.text) }}
          />
        );
      case 'blockquote':
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-indigo-500 pl-4 py-1 my-3 bg-gray-50 dark:bg-zinc-900/40 text-gray-600 dark:text-zinc-400 italic rounded-r-lg"
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(block.text) }}
          />
        );
      case 'ul':
        return (
          <ul key={idx} className="list-disc pl-5 my-2 space-y-1 text-gray-700 dark:text-zinc-300">
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }} />
            ))}
          </ul>
        );
      case 'ol':
        return (
          <ol key={idx} className="list-decimal pl-5 my-2 space-y-1 text-gray-700 dark:text-zinc-300">
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }} />
            ))}
          </ol>
        );
      case 'table':
        return (
          <div key={idx} className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-zinc-850 shadow-sm max-w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-bold">
                  {block.headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-2.5 font-semibold" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(h) }} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-zinc-850">
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 text-gray-600 dark:text-zinc-400">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5" dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(cell) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'spacer':
        return <div key={idx} className="h-1.5" />;
      case 'p':
        return (
          <p
            key={idx}
            className="my-1.5 leading-relaxed text-gray-800 dark:text-zinc-200"
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(block.text) }}
          />
        );
      default:
        return null;
    }
  });
}

function parseTableRow(line: string): string[] {
  // strip leading and trailing |
  const content = line.trim().replace(/^\||\|$/g, '');
  return content.split('|').map((cell) => cell.trim());
}

// Simple utility function to parse bold (**), italic (*), inline code (`), and links ([text](url))
function parseInlineMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold (**text**)
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
  html = html.replace(/_([\s\S]+?)_/g, '<em>$1</em>');

  // Inline code (`code`)
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded font-mono text-[12px] bg-gray-150 dark:bg-zinc-800 text-rose-500 dark:text-rose-450 font-semibold">$1</code>'
  );

  // Links ([label](url))
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-650 dark:text-indigo-400 hover:underline font-semibold">$1</a>'
  );

  return html;
}

export default MarkdownRenderer;

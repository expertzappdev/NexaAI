import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useChat } from '../store/ChatContext';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useChat();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const highlightedHtml = highlightCode(code, language);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 font-mono text-[13px] text-zinc-800 dark:text-zinc-250 shadow-md">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-900 bg-gray-100/70 dark:bg-zinc-900/60 px-4 py-2 text-gray-500 dark:text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-[10px]">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 rounded-lg px-2.5 py-1 transition-all hover:bg-gray-200 dark:hover:bg-zinc-850 hover:text-gray-900 dark:hover:text-zinc-100 focus:outline-none"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Copy code</span>
            </>
          )}
        </button>
      </div>
      {/* Code Area */}
      <div className="overflow-x-auto p-4 leading-relaxed bg-white dark:bg-zinc-950/20">
        <pre className="select-text whitespace-pre overflow-x-auto">
          <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
      </div>
    </div>
  );
};

// Simple custom syntax highlighting engine
function highlightCode(code: string, language: string): string {
  const lang = (language || '').toLowerCase();
  
  // Escape HTML characters first
  let escaped = code
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (!lang) return escaped;

  // CSS classes for various token types
  const span = (cls: string, text: string) => `<span class="${cls}">${text}</span>`;
  
  const styles = {
    keyword: 'text-indigo-600 dark:text-indigo-400 font-semibold',
    string: 'text-emerald-600 dark:text-emerald-450',
    comment: 'text-gray-400 dark:text-zinc-550 italic',
    number: 'text-amber-600 dark:text-amber-400',
    type: 'text-blue-600 dark:text-sky-400',
    builtin: 'text-rose-500 dark:text-rose-400',
    tag: 'text-indigo-650 dark:text-indigo-405 font-medium',
    attr: 'text-violet-650 dark:text-violet-400',
  };

  // 1. Comments & Strings first to avoid breaking key words
  const placeholders: { [key: string]: string } = {};
  let placeholderCount = 0;

  const saveToken = (cls: string, text: string) => {
    const key = `___TOKEN_PLACEHOLDER_${placeholderCount++}___`;
    placeholders[key] = span(cls, text);
    return key;
  };

  // Extract comments
  if (lang === 'html' || lang === 'xml') {
    escaped = escaped.replace(/&lt;!--[\s\S]*?--&gt;/g, (match) => saveToken(styles.comment, match));
  } else if (lang === 'sql') {
    escaped = escaped.replace(/--.*/g, (match) => saveToken(styles.comment, match));
  } else if (lang === 'python') {
    escaped = escaped.replace(/#.*/g, (match) => saveToken(styles.comment, match));
    escaped = escaped.replace(/"""[\s\S]*?"""/g, (match) => saveToken(styles.comment, match));
  } else {
    // JS, TS, C#, Java, C++, CSS
    escaped = escaped.replace(/\/\*[\s\S]*?\*\//g, (match) => saveToken(styles.comment, match));
    escaped = escaped.replace(/\/\/.*/g, (match) => saveToken(styles.comment, match));
  }

  // Extract strings
  escaped = escaped.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => saveToken(styles.string, match));
  if (lang === 'javascript' || lang === 'typescript' || lang === 'python') {
    escaped = escaped.replace(/`[\s\S]*?`/g, (match) => saveToken(styles.string, match));
  }

  // Language specific rules
  if (lang === 'sql') {
    const sqlKeywords = /\b(SELECT|FROM|WHERE|JOIN|ON|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DATABASE|INDEX|ALTER|DROP|GROUP|BY|ORDER|HAVING|LIMIT|LEFT|RIGHT|INNER|OUTER|UNION|AS|IN|LIKE|IS|NULL|TRUE|FALSE)\b/gi;
    escaped = escaped.replace(sqlKeywords, (match) => span(styles.keyword, match.toUpperCase()));
    escaped = escaped.replace(/\b(\d+)\b/g, (match) => span(styles.number, match));
  } 
  else if (lang === 'html' || lang === 'xml' || lang === 'vue') {
    // Highlight tags & attributes
    escaped = escaped.replace(/(&lt;\/?)(\w+)(.*?)(&gt;)/g, (_, open, tag, attrs, close) => {
      const highlightedAttrs = attrs.replace(/(\w+)=/g, (__: string, attrName: string) => ` ${span(styles.attr, attrName)}=`);
      return open + span(styles.tag, tag) + highlightedAttrs + close;
    });
  } 
  else if (lang === 'css') {
    // Selectors, properties
    escaped = escaped.replace(/([^\s{]+)\s*\{/g, (_, selector) => `${span(styles.tag, selector)} {`);
    escaped = escaped.replace(/([\w-]+)\s*:/g, (_, prop) => `${span(styles.attr, prop)}:`);
    escaped = escaped.replace(/\b(\d+px|\d+rem|\d+em|\d+vh|\d+vw|\d+%|\d+ms|\d+s)\b/g, (match) => span(styles.number, match));
  } 
  else if (lang === 'python') {
    const pyKeywords = /\b(def|class|import|from|as|return|if|elif|else|for|while|in|is|not|and|or|try|except|finally|with|lambda|pass|break|continue|global|nonlocal|assert|yield)\b/g;
    escaped = escaped.replace(pyKeywords, (match) => span(styles.keyword, match));
    const pyBuiltins = /\b(print|len|range|str|int|float|dict|list|set|tuple|enumerate|zip|sum|min|max|abs|open|type|self)\b/g;
    escaped = escaped.replace(pyBuiltins, (match) => span(styles.builtin, match));
    escaped = escaped.replace(/\b(\d+)\b/g, (match) => span(styles.number, match));
  } 
  else {
    // C#, Java, JS, TS keywords
    const cKeywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|class|interface|struct|enum|public|private|protected|internal|static|readonly|volatile|async|await|try|catch|finally|throw|new|this|super|extends|implements|import|export|from|package|using|namespace|get|set|public|void|int|double|float|string|bool|boolean|char|var|typeof|instanceof)\b/g;
    escaped = escaped.replace(cKeywords, (match) => span(styles.keyword, match));
    escaped = escaped.replace(/\b(\d+)\b/g, (match) => span(styles.number, match));
  }

  // Restore comments and strings
  Object.keys(placeholders).forEach((key) => {
    escaped = escaped.replace(key, placeholders[key]);
  });

  return escaped;
}

export default CodeBlock;

import React, { useState, useEffect, useRef } from 'react';
import { Check, Copy, Download, Maximize2, Minimize2, Play, Terminal, ChevronDown, Loader2 } from 'lucide-react';
import { useChat } from '../store/ChatContext';

interface CodeBlockProps {
  language: string;
  code: string;
}

const languageExtensionMap: { [key: string]: string } = {
  java: '.java',
  csharp: '.cs',
  cs: '.cs',
  python: '.py',
  py: '.py',
  javascript: '.js',
  js: '.js',
  typescript: '.ts',
  ts: '.ts',
  html: '.html',
  css: '.css',
  sql: '.sql',
  json: '.json',
  xml: '.xml',
  bash: '.sh',
  sh: '.sh',
  rust: '.rs',
  rs: '.rs',
  go: '.go',
  cpp: '.cpp',
  c: '.c',
  yaml: '.yaml',
  yml: '.yaml',
  dockerfile: '.dockerfile',
  docker: '.dockerfile',
};

const languageDisplayNameMap: { [key: string]: string } = {
  java: 'Java',
  csharp: 'C#',
  cs: 'C#',
  python: 'Python',
  py: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  json: 'JSON',
  xml: 'XML',
  bash: 'Bash',
  sh: 'Bash',
  dockerfile: 'Dockerfile',
  docker: 'Dockerfile',
  yaml: 'YAML',
  yml: 'YAML',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  cpp: 'C++',
  c: 'C',
};

// --- Custom High-Performance Tokenizer Rules ---
interface Token {
  type: string;
  value: string;
}

const jsRules = [
  { type: 'comment', regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: 'string', regex: /^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'|^`(?:\\.|[^`\\])*`/ },
  { type: 'number', regex: /^\b0x[0-9a-fA-F]+\b|^\b\d+(?:\.\d+)?\b/ },
  { type: 'keyword', regex: /^\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|class|interface|struct|enum|public|private|protected|internal|static|readonly|volatile|async|await|try|catch|finally|throw|new|this|super|extends|implements|import|export|from|package|using|namespace|get|set|void|int|double|float|string|bool|boolean|char|typeof|instanceof|as|in|of|null|undefined|true|false)\b/ },
  { type: 'function', regex: /^[a-zA-Z_$][\w$]*(?=\s*\()/ },
  { type: 'operator', regex: /^=>|^[-+*/%=<>!&|^~?:;.,{}()[\]]/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'identifier', regex: /^[a-zA-Z_$][\w$]*/ }
];

const pyRules = [
  { type: 'comment', regex: /^#.*/ },
  { type: 'string', regex: /^"""[\s\S]*?"""|^'''[\s\S]*?'''|^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'/ },
  { type: 'number', regex: /^\b\d+(?:\.\d+)?\b/ },
  { type: 'keyword', regex: /^\b(def|class|import|from|as|return|if|elif|else|for|while|in|is|not|and|or|try|except|finally|with|lambda|pass|break|continue|global|nonlocal|assert|yield|None|True|False)\b/ },
  { type: 'builtin', regex: /^\b(print|len|range|str|int|float|dict|list|set|tuple|enumerate|zip|sum|min|max|abs|open|type|self)\b/ },
  { type: 'function', regex: /^[a-zA-Z_]\w*(?=\s*\()/ },
  { type: 'operator', regex: /^[-+*/%=<>!&|^~?:;.,{}()[\]]/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'identifier', regex: /^[a-zA-Z_]\w*/ }
];

const htmlRules = [
  { type: 'comment', regex: /^<!--[\s\S]*?-->/ },
  { type: 'tag', regex: /^<\/?[a-zA-Z0-9:-]+(?:\s+[a-zA-Z0-9:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'plain', regex: /^[^<]+/ }
];

const cssRules = [
  { type: 'comment', regex: /^\/\*[\s\S]*?\*\// },
  { type: 'selector', regex: /^[^\s{][^{]*(?=\s*\{)/ },
  { type: 'property', regex: /^[\w-](?=\s*:)/ },
  { type: 'number', regex: /^\b(?:\d+(?:\.\d+)?)(?:px|rem|em|vh|vw|%|ms|s|deg)?\b/ },
  { type: 'string', regex: /^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'/ },
  { type: 'operator', regex: /^[:;{}()[\]]/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'plain', regex: /^[a-zA-Z-0-9_#.]+/ }
];

const sqlRules = [
  { type: 'comment', regex: /^--.*|^\/\*[\s\S]*?\*\// },
  { type: 'string', regex: /^'(?:\\.|[^'\\])*'|^"(?:\\.|[^"\\])*"/ },
  { type: 'number', regex: /^\b\d+(?:\.\d+)?\b/ },
  { type: 'keyword', regex: /^\b(SELECT|FROM|WHERE|JOIN|ON|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DATABASE|INDEX|ALTER|DROP|GROUP|BY|ORDER|HAVING|LIMIT|LEFT|RIGHT|INNER|OUTER|UNION|AS|IN|LIKE|IS|NULL|TRUE|FALSE)\b/i },
  { type: 'operator', regex: /^[-+*/%=<>!&|^~?:;.,{}()[\]]/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'identifier', regex: /^[a-zA-Z_]\w*/ }
];

const bashRules = [
  { type: 'comment', regex: /^#.*/ },
  { type: 'string', regex: /^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'/ },
  { type: 'number', regex: /^\b\d+(?:\.\d+)?\b/ },
  { type: 'keyword', regex: /^\b(if|then|else|elif|fi|for|in|while|do|done|case|esac|function|exit|return|echo|sudo|cd|ls|grep|awk|sed|mkdir|rm|cp|mv)\b/ },
  { type: 'operator', regex: /^&&|^\|\||^[-+*/%=<>!&|^~?:;.,{}()[\]]/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'plain', regex: /^[a-zA-Z0-9_.-]+/ }
];

const yamlRules = [
  { type: 'comment', regex: /^#.*/ },
  { type: 'key', regex: /^\s*[a-zA-Z0-9_-]+(?=\s*:)/ },
  { type: 'string', regex: /^"(?:\\.|[^"\\])*"|^'(?:\\.|[^'\\])*'/ },
  { type: 'number', regex: /^\b\d+(?:\.\d+)?\b/ },
  { type: 'operator', regex: /^[-?:;.,{}[\]]/ },
  { type: 'whitespace', regex: /^\s+/ },
  { type: 'plain', regex: /^[a-zA-Z0-9_.-]+/ }
];

function tokenize(code: string, rules: { type: string; regex: RegExp }[]): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const len = code.length;

  while (index < len) {
    let matched = false;
    const remaining = code.slice(index);

    for (const rule of rules) {
      const match = remaining.match(rule.regex);
      if (match && match.index === 0) {
        const val = match[0];
        tokens.push({ type: rule.type, value: val });
        index += val.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const char = code[index];
      if (tokens.length > 0 && tokens[tokens.length - 1].type === 'plain') {
        tokens[tokens.length - 1].value += char;
      } else {
        tokens.push({ type: 'plain', value: char });
      }
      index++;
    }
  }

  return tokens;
}

function tokenizeHtmlTag(tagContent: string): string {
  const escape = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tagMatch = tagContent.match(/^(&lt;\/?)([a-zA-Z0-9:-]+)([\s\S]*?)(&gt;)$/);
  if (!tagMatch) return escape(tagContent);
  
  const [_, open, tagName, attrs, close] = tagMatch;
  const span = (cls: string, val: string) => `<span class="${cls}">${val}</span>`;
  
  let attrsHtml = '';
  let attrIdx = 0;
  while (attrIdx < attrs.length) {
    const remaining = attrs.slice(attrIdx);
    const nameMatch = remaining.match(/^\s*([a-zA-Z0-9:-]+)\s*=\s*/);
    if (nameMatch) {
      const valStart = attrIdx + nameMatch[0].length;
      attrsHtml += nameMatch[0].replace(nameMatch[1], span('text-[#c084fc]', nameMatch[1]));
      attrIdx = valStart;
      
      const remainingVal = attrs.slice(attrIdx);
      const dQuoteMatch = remainingVal.match(/^"[^"]*"/);
      const sQuoteMatch = remainingVal.match(/^'[^']*'/);
      const unquotedMatch = remainingVal.match(/^[^\s>]+/);
      
      if (dQuoteMatch) {
        attrsHtml += span('text-[#34d399]', escape(dQuoteMatch[0]));
        attrIdx += dQuoteMatch[0].length;
      } else if (sQuoteMatch) {
        attrsHtml += span('text-[#34d399]', escape(sQuoteMatch[0]));
        attrIdx += sQuoteMatch[0].length;
      } else if (unquotedMatch) {
        attrsHtml += span('text-[#34d399]', escape(unquotedMatch[0]));
        attrIdx += unquotedMatch[0].length;
      }
    } else {
      const spaceOrAttr = remaining.match(/^\s+|^[a-zA-Z0-9:-]+/);
      if (spaceOrAttr) {
        if (spaceOrAttr[0].trim()) {
          attrsHtml += span('text-[#c084fc]', escape(spaceOrAttr[0]));
        } else {
          attrsHtml += spaceOrAttr[0];
        }
        attrIdx += spaceOrAttr[0].length;
      } else {
        attrsHtml += escape(remaining[0]);
        attrIdx++;
      }
    }
  }
  
  return span('text-[#94a3b8]', open) + span('text-[#60a5fa] font-medium', tagName) + attrsHtml + span('text-[#94a3b8]', close);
}

function highlightCode(code: string, language: string): string {
  const lang = (language || '').toLowerCase();
  
  const escape = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let rules = jsRules;
  if (lang === 'python' || lang === 'py') {
    rules = pyRules;
  } else if (lang === 'html' || lang === 'xml' || lang === 'svg') {
    rules = htmlRules;
  } else if (lang === 'css') {
    rules = cssRules;
  } else if (lang === 'sql') {
    rules = sqlRules;
  } else if (lang === 'bash' || lang === 'sh') {
    rules = bashRules;
  } else if (lang === 'yaml' || lang === 'yml') {
    rules = yamlRules;
  }

  const tokens = tokenize(code, rules);

  return tokens.map(token => {
    const val = escape(token.value);
    
    switch (token.type) {
      case 'comment':
        return `<span class="text-[#9ca3af] italic">${val}</span>`;
      case 'string':
        return `<span class="text-[#34d399]">${val}</span>`;
      case 'number':
        return `<span class="text-[#fb923c]">${val}</span>`;
      case 'keyword':
        return `<span class="text-[#60a5fa] font-semibold">${val}</span>`;
      case 'builtin':
        return `<span class="text-[#2dd4bf] font-medium">${val}</span>`;
      case 'function':
        return `<span class="text-[#c084fc]">${val}</span>`;
      case 'tag':
        return tokenizeHtmlTag(val);
      case 'selector':
        return `<span class="text-[#38bdf8] font-semibold">${val}</span>`;
      case 'property':
        return `<span class="text-[#c084fc]">${val}</span>`;
      case 'key':
        return `<span class="text-[#60a5fa] font-semibold">${val}</span>`;
      case 'operator':
      case 'punctuation':
        return `<span class="text-[#94a3b8]">${val}</span>`;
      default:
        return val;
    }
  }).join('');
}

// --- Pyodide Dynamic Loader ---
let pyodidePromise: any = null;
async function getPyodide() {
  if (pyodidePromise) return pyodidePromise;
  
  pyodidePromise = new Promise(async (resolve, reject) => {
    if (!(window as any).loadPyodide) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
      script.async = true;
      document.body.appendChild(script);
      await new Promise((res) => {
        script.onload = res;
      });
    }
    
    try {
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
      });
      resolve(pyodide);
    } catch (err) {
      pyodidePromise = null;
      reject(err);
    }
  });
  
  return pyodidePromise;
}

// --- CodeBlock Component ---
const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<{ type: 'log' | 'error' | 'info' | 'warn'; text: string }[]>([]);
  const [executionTime, setExecutionTime] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'preview' | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { showToast } = useChat();

  const displayLanguage = languageDisplayNameMap[language?.toLowerCase()] || language || 'Code';

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

  const handleDownload = () => {
    const ext = languageExtensionMap[language?.toLowerCase()] || '.txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `snippet${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Code downloaded successfully', 'success');
  };

  const handleRun = async () => {
    const lang = (language || '').toLowerCase();
    
    if (lang === 'html') {
      setActiveTab('preview');
      return;
    }

    if (lang === 'javascript' || lang === 'js') {
      setOutput([]);
      setIsRunning(true);
      setActiveTab('output');
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'run', code }, '*');
        }
      }, 150);
      return;
    }

    if (lang === 'python' || lang === 'py') {
      setOutput([{ type: 'info', text: 'Initializing browser Python runtime (Pyodide)...' }]);
      setIsRunning(true);
      setActiveTab('output');
      setExecutionTime(null);
      
      const startTime = performance.now();
      try {
        const pyodide = await getPyodide();
        setOutput([{ type: 'info', text: 'Python engine ready. Executing code...' }]);
        
        pyodide.setStdout({
          batched: (text: string) => {
            setOutput(prev => [...prev, { type: 'log', text }]);
          }
        });
        pyodide.setStderr({
          batched: (text: string) => {
            setOutput(prev => [...prev, { type: 'error', text }]);
          }
        });
        
        await pyodide.runPythonAsync(code);
        
        const endTime = performance.now();
        const execTime = ((endTime - startTime) / 1000).toFixed(3);
        setExecutionTime(execTime);
        setOutput(prev => [...prev, { type: 'info', text: `\nProgram exited successfully in ${execTime} seconds.` }]);
      } catch (err: any) {
        setOutput(prev => [...prev, { type: 'error', text: err.message || String(err) }]);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // Placeholders for Java, C#, C++, SQL
    if (['java', 'csharp', 'cs', 'cpp', 'sql'].includes(lang)) {
      setOutput([]);
      setIsRunning(true);
      setActiveTab('output');
      setTimeout(() => {
        setOutput([
          { type: 'error', text: `${displayLanguage} execution is not configured.` },
          { type: 'info', text: 'Backend compilation and execution pipeline is required to run this language.' }
        ]);
        setIsRunning(false);
      }, 500);
      return;
    }
  };

  // JS Sandboxing messages listener
  useEffect(() => {
    const handleSandboxMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        const data = event.data;
        if (data.type === 'console') {
          setOutput(prev => [...prev, { type: data.logType, text: data.message }]);
        } else if (data.type === 'error') {
          setOutput(prev => [...prev, { type: 'error', text: `${data.message}${data.stack ? '\n' + data.stack : ''}` }]);
          setIsRunning(false);
        } else if (data.type === 'success') {
          if (data.result !== 'undefined') {
            setOutput(prev => [...prev, { type: 'info', text: `Return value: ${data.result}` }]);
          }
          setIsRunning(false);
        }
      }
    };

    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, []);

  // Keyboard shortcut & scrolling locks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  const highlightedHtml = highlightCode(code, language);
  const runnableLanguages = ['html', 'javascript', 'js', 'python', 'py', 'java', 'csharp', 'cs', 'cpp', 'sql'];
  const isRunnable = runnableLanguages.includes(language?.toLowerCase());

  return (
    <>
      {/* Hidden JS sandbox iframe */}
      {(language?.toLowerCase() === 'javascript' || language?.toLowerCase() === 'js') && (
        <iframe
          ref={iframeRef}
          style={{ display: 'none' }}
          sandbox="allow-scripts"
          srcDoc={`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <script>
                (function() {
                  window.addEventListener('message', function(e) {
                    if (e.data && e.data.type === 'run') {
                      const code = e.data.code;
                      
                      const sendLog = (type, args) => {
                        const message = args.map(arg => {
                          if (arg === null) return 'null';
                          if (arg === undefined) return 'undefined';
                          if (typeof arg === 'object') {
                            try { return JSON.stringify(arg); } catch (e) { return String(arg); }
                          }
                          return String(arg);
                        }).join(' ');
                        window.parent.postMessage({ type: 'console', logType: type, message }, '*');
                      };

                      console.log = function(...args) { sendLog('log', args); };
                      console.error = function(...args) { sendLog('error', args); };
                      console.warn = function(...args) { sendLog('warn', args); };
                      console.info = function(...args) { sendLog('info', args); };

                      window.onerror = function(message, source, lineno, colno, error) {
                        window.parent.postMessage({
                          type: 'error',
                          message: message,
                          line: lineno,
                          col: colno,
                          stack: error ? error.stack : null
                        }, '*');
                        return true;
                      };

                      try {
                        const result = new Function(code)();
                        window.parent.postMessage({
                          type: 'success',
                          result: result !== undefined ? String(result) : 'undefined'
                        }, '*');
                      } catch (err) {
                        window.parent.postMessage({
                          type: 'error',
                          message: err.message,
                          stack: err.stack
                        }, '*');
                      }
                    }
                  });
                })();
              </script>
            </head>
            <body></body>
            </html>
          `}
        />
      )}

      {/* Main Code Block Container */}
      <div className="my-4 overflow-hidden rounded-xl border border-zinc-800 bg-[#111827] font-mono text-[13px] text-white shadow-lg">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-2 text-zinc-400 select-none">
          <span className="font-semibold text-xs text-zinc-300">{displayLanguage}</span>
          
          {/* Action buttons (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center space-x-2">
            {isRunnable && (
              <button
                onClick={handleRun}
                disabled={isRunning}
                title="Run Code"
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-[#34d399]" />}
                <span className="text-[11px] font-medium">{isRunning ? 'Running...' : 'Run'}</span>
              </button>
            )}
            
            <button
              onClick={handleCopy}
              title="Copy Code"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-450" />
                  <span className="text-[11px] text-emerald-450 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              title="Download Code"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Download</span>
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              title="Expand to Fullscreen"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Expand</span>
            </button>
          </div>

          {/* Action Menu dropdown (Mobile) */}
          <div className="flex sm:hidden relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none cursor-pointer text-xs"
            >
              <span className="font-semibold">Actions</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-7 w-36 bg-[#1f2937] border border-zinc-800 rounded-lg shadow-xl py-1 z-20 font-sans text-xs">
                  {isRunnable && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleRun();
                      }}
                      disabled={isRunning}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left disabled:opacity-50"
                    >
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-[#34d399]" />}
                      <span>Run</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleCopy();
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDownload();
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsExpanded(true);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Code Content Area */}
        <div className="overflow-x-auto p-4 leading-relaxed bg-[#111827]">
          <pre className="select-text whitespace-pre overflow-x-auto scrollbar-thin">
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          </pre>
        </div>

        {/* HTML Inline Live Preview */}
        {activeTab === 'preview' && (
          <div className="border-t border-zinc-850 bg-[#0f172a] p-4">
            <div className="flex items-center justify-between mb-2 select-none">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Live Sandbox Preview</span>
              <button 
                onClick={() => setActiveTab(null)}
                className="text-[11px] text-zinc-400 hover:text-white font-medium transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
            <div className="w-full h-[260px] bg-white rounded-lg overflow-hidden border border-zinc-700">
              <iframe
                title="HTML Inline Preview"
                srcDoc={code}
                sandbox="allow-scripts"
                className="w-full h-full border-none bg-white"
              />
            </div>
          </div>
        )}

        {/* Console Output Panel */}
        {activeTab === 'output' && (
          <div className="border-t border-zinc-850 bg-[#0f172a] text-zinc-300 font-mono text-xs select-text">
            <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2 border-b border-zinc-800/60 select-none">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Console Output</span>
              </div>
              <div className="flex items-center space-x-3">
                {executionTime && (
                  <span className="text-[10px] text-zinc-500 font-medium">{executionTime}s</span>
                )}
                <button 
                  onClick={() => setActiveTab(null)}
                  className="text-zinc-400 hover:text-white text-[10px] font-medium transition cursor-pointer"
                >
                  Hide Panel
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[200px] space-y-1.5 leading-relaxed bg-[#0b0f19] scrollbar-thin">
              {output.length === 0 && !isRunning && (
                <div className="text-zinc-500 italic">No output. Press Run to execute the code.</div>
              )}
              {output.map((line, idx) => {
                let colorClass = 'text-[#e2e8f0]';
                if (line.type === 'error') colorClass = 'text-red-400 font-medium';
                else if (line.type === 'info') colorClass = 'text-blue-400 font-medium';
                else if (line.type === 'warn') colorClass = 'text-amber-400';
                
                return (
                  <pre key={idx} className={`whitespace-pre-wrap break-all ${colorClass}`}>
                    {line.text}
                  </pre>
                );
              })}
              {isRunning && (
                <div className="flex items-center space-x-2 text-blue-400 animate-pulse font-medium py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Modal (Modern IDE Layout) */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f19] p-4 md:p-6 overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 select-none">
            <div className="flex items-center space-x-3">
              <span className="bg-zinc-800 text-zinc-200 text-xs font-semibold px-2.5 py-1 rounded">
                {displayLanguage}
              </span>
              <span className="text-zinc-400 text-xs font-medium hidden sm:inline">Fullscreen IDE Editor</span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {isRunnable && (
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-[#34d399]" />}
                  <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>
              )}
              
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Split Panel Layout */}
          <div className={`flex-grow flex flex-col ${activeTab ? 'lg:grid lg:grid-cols-2 lg:gap-4' : ''} overflow-hidden`}>
            {/* Left Column: Code viewer */}
            <div className="flex-grow flex flex-col overflow-auto rounded-xl border border-zinc-855 bg-[#111827] font-mono text-sm leading-relaxed text-zinc-200 select-text p-4 md:p-6 min-h-[250px] scrollbar-thin">
              <pre className="whitespace-pre overflow-x-auto h-full">
                <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
              </pre>
            </div>

            {/* Right Column: Console / HTML Visual Live Preview */}
            {activeTab && (
              <div className="flex flex-col mt-4 lg:mt-0 rounded-xl border border-zinc-855 bg-[#0f172a] overflow-hidden min-h-[250px] lg:h-full">
                {/* Panel Tabs */}
                <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2.5 border-b border-zinc-800 select-none">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setActiveTab('output')}
                      className={`text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${activeTab === 'output' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-400 hover:text-zinc-200'} pb-0.5`}
                    >
                      Console Output
                    </button>
                    {(language?.toLowerCase() === 'html' || language?.toLowerCase() === 'js' || language?.toLowerCase() === 'javascript') && (
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${activeTab === 'preview' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-400 hover:text-zinc-200'} pb-0.5`}
                      >
                        Live Preview
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {executionTime && activeTab === 'output' && (
                      <span className="text-[10px] text-zinc-500 font-medium">{executionTime}s</span>
                    )}
                    <button
                      onClick={() => setActiveTab(null)}
                      className="text-zinc-400 hover:text-white text-[10px] font-medium transition cursor-pointer"
                    >
                      Hide Panel
                    </button>
                  </div>
                </div>

                {/* Tab Contents */}
                <div className="flex-grow p-4 overflow-y-auto bg-[#0b0f19] font-mono text-xs scrollbar-thin">
                  {activeTab === 'output' && (
                    <div className="space-y-1.5">
                      {output.length === 0 && !isRunning && (
                        <div className="text-zinc-500 italic">No output. Press Run Code to execute.</div>
                      )}
                      {output.map((line, idx) => {
                        let colorClass = 'text-[#e2e8f0]';
                        if (line.type === 'error') colorClass = 'text-red-400 font-medium';
                        else if (line.type === 'info') colorClass = 'text-blue-400 font-medium';
                        else if (line.type === 'warn') colorClass = 'text-amber-400';
                        
                        return (
                          <pre key={idx} className={`whitespace-pre-wrap break-all ${colorClass}`}>
                            {line.text}
                          </pre>
                        );
                      })}
                      {isRunning && (
                        <div className="flex items-center space-x-2 text-blue-400 animate-pulse font-medium py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Running...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'preview' && (
                    <div className="w-full h-full min-h-[220px] bg-white rounded-lg overflow-hidden border border-zinc-700">
                      <iframe
                        title="HTML Fullscreen Preview"
                        srcDoc={language?.toLowerCase() === 'html' ? code : `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="utf-8">
                            <style>body { font-family: sans-serif; padding: 20px; color: #333; }</style>
                          </head>
                          <body>
                            <h3>JavaScript Output</h3>
                            <div id="output" style="white-space: pre-wrap; font-family: monospace;"></div>
                            <script>
                              const outputDiv = document.getElementById('output');
                              const log = (...args) => {
                                outputDiv.textContent += args.join(' ') + '\\n';
                              };
                              try {
                                ${code}
                              } catch (err) {
                                outputDiv.innerHTML += '<span style="color: red;">Error: ' + err.message + '</span>\\n';
                              }
                            </script>
                          </body>
                          </html>
                        `}
                        sandbox="allow-scripts"
                        className="w-full h-full border-none bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CodeBlock;

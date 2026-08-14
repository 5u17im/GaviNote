'use client';

import React from 'react';

interface MarkdownContentProps {
  content: string;
  compact?: boolean;
  accentColor?: string;
  onWikilinkClick?: (targetTitle: string) => void;
  onToggleTask?: (taskText: string, completed: boolean) => void;
}

export function MarkdownContent({
  content,
  compact = false,
  accentColor = '#00E5FF',
  onWikilinkClick,
  onToggleTask,
}: MarkdownContentProps) {
  if (!content || !content.trim()) {
    return (
      <span className="text-white/40 italic font-sans text-xs">
        {compact ? 'Sin contenido...' : 'Escribe algo o usa [[Nota]] para enlazar ideas...'}
      </span>
    );
  }

  // Parse inline elements (Wikilinks, Tags, Bold, Italic, Strikethrough, Inline Code)
  const renderInlineText = (text: string) => {
    // Regex for tokens: wikilinks, inline code, bold, italic, strike, tags
    const tokenRegex = /(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|#[a-zA-Z0-9_\u00C0-\u017F]+)/g;

    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // 1. Wikilinks [[Title]] or [[Title|Alias]]
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const inner = part.slice(2, -2);
        const [targetTitle, alias] = inner.split('|').map((s) => s.trim());
        const displayText = alias || targetTitle;

        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWikilinkClick?.(targetTitle);
            }}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 my-0.5 mx-0.5 rounded text-[10px] font-mono font-medium tracking-tight transition-all duration-150 cursor-pointer pointer-events-auto border hover:scale-105 active:scale-95"
            style={{
              color: accentColor,
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
            }}
            title={`Saltar a [[${targetTitle}]]`}
          >
            <span className="opacity-60 text-[9px]">🔗</span>
            <span>{displayText}</span>
          </button>
        );
      }

      // 2. Inline code `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={index}
            className="px-1 py-0.5 rounded bg-black/40 text-emerald-400 font-mono text-[10px] border border-white/5"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // 3. Bold **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={index} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // 4. Italic *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={index} className="italic text-white/90">
            {part.slice(1, -1)}
          </em>
        );
      }

      // 5. Strikethrough ~~text~~
      if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
        return (
          <span key={index} className="line-through text-white/40">
            {part.slice(2, -2)}
          </span>
        );
      }

      // 6. Inline Hashtags #tag
      if (part.startsWith('#') && part.length > 1) {
        return (
          <span
            key={index}
            className="inline-block px-1 py-0.2 mx-0.5 rounded font-mono text-[9px] text-white/60 bg-white/5"
          >
            {part}
          </span>
        );
      }

      // Plain text
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  if (compact) {
    // In compact card view: show clean snippet with inline formatting
    return (
      <div className="text-[11px] leading-relaxed text-white/80 select-text overflow-hidden">
        {content.split('\n').slice(0, 3).map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // Check if line is a task
          const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
          if (taskMatch) {
            const isChecked = taskMatch[1].toLowerCase() === 'x';
            return (
              <div key={idx} className="flex items-center gap-1.5 truncate">
                <span className={`text-[10px] ${isChecked ? 'text-emerald-400' : 'text-white/40'}`}>
                  {isChecked ? '☑' : '☐'}
                </span>
                <span className={`truncate ${isChecked ? 'line-through text-white/40' : ''}`}>
                  {renderInlineText(taskMatch[2])}
                </span>
              </div>
            );
          }

          // Strip header markers for compact snippet
          const cleanLine = trimmed.replace(/^#{1,6}\s+/, '');
          return (
            <p key={idx} className="truncate">
              {renderInlineText(cleanLine)}
            </p>
          );
        })}
      </div>
    );
  }

  // Full Rich Markdown View (for Focus Drawer)
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        renderedElements.push(
          <div
            key={`code-${i}`}
            className="my-3 p-3 rounded bg-black/60 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto"
          >
            {codeBlockLang && (
              <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">
                {codeBlockLang}
              </div>
            )}
            <pre className="whitespace-pre">{codeBlockBuffer.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockBuffer = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      renderedElements.push(<div key={`blank-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="font-serif text-xl font-bold text-white mt-4 mb-2">
          {renderInlineText(trimmed.slice(2))}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="font-serif text-lg font-semibold text-white/95 mt-3 mb-1.5">
          {renderInlineText(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="font-serif text-base font-semibold text-white/90 mt-2 mb-1">
          {renderInlineText(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    // Task item "- [ ]" or "- [x]"
    const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const taskBody = taskMatch[2];
      renderedElements.push(
        <div
          key={`task-${i}`}
          className="flex items-start gap-2.5 my-1.5 group cursor-pointer"
          onClick={() => onToggleTask?.(taskBody, !isChecked)}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleTask?.(taskBody, !isChecked)}
            className="mt-1 w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-cyan-400 focus:ring-0 cursor-pointer accent-cyan-400"
          />
          <span
            className={`text-xs leading-relaxed transition-opacity ${
              isChecked ? 'line-through text-white/40' : 'text-white/85'
            }`}
          >
            {renderInlineText(taskBody)}
          </span>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3 border-l-2 text-xs italic text-white/70 bg-white/[0.02] py-1 rounded-r"
          style={{ borderColor: accentColor }}
        >
          {renderInlineText(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      renderedElements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 ml-2 my-0.5 text-xs text-white/80">
          <span className="text-white/40 select-none">•</span>
          <span>{renderInlineText(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Standard paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-white/80 my-1">
        {renderInlineText(line)}
      </p>
    );
  }

  return <div className="space-y-0.5 select-text">{renderedElements}</div>;
}

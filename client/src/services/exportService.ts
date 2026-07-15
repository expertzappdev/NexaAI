import { type Message } from '../types';

interface ExportBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

const parseContent = (content: string): ExportBlock[] => {
  // Clean up any think/thought tags first
  const thinkRegex = /<(think|thought)>([\s\S]*?)<\/(\1)>/gi;
  const contentWithoutThink = content.replace(thinkRegex, '').trim();

  const parts = contentWithoutThink.split(/(```[\s\S]*?```)/g);
  return parts.map((part) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const language = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);
      return { type: 'code', content: code.trim(), language };
    }
    return { type: 'text', content: part };
  });
};

const loadJsPDF = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf) {
      resolve((window as any).jspdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => {
      resolve((window as any).jspdf);
    };
    script.onerror = (err) => {
      reject(err);
    };
    document.body.appendChild(script);
  });
};

export const exportToMarkdown = (title: string, messages: Message[]) => {
  let md = `# ${title}\n`;
  md += `*Exported on: ${new Date().toLocaleString()}*\n\n`;
  md += `---\n\n`;

  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isUser) {
      md += `### **You** *(${timeStr})*\n\n`;
      md += `${msg.content}\n\n`;
    } else {
      const isSearchUsed = msg.model?.toLowerCase().includes('search') || msg.model?.toLowerCase().includes('+');
      const displayModel = msg.model
        ?.replace(/\s*\+\s*Search/i, '')
        .replace(/nexa-web-search/i, 'Nexa Search') || 'Nexa AI';
        
      md += `### **Nexa AI** *(${timeStr})*\n`;
      md += `* **Model:** \`${displayModel}\`\n`;
      if (isSearchUsed) {
        md += `* **Web Search:** Enabled 🌐\n`;
      }
      md += `\n${msg.content}\n\n`;
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_conversation.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToText = (title: string, messages: Message[]) => {
  let txt = `${title}\n`;
  txt += `Exported on: ${new Date().toLocaleString()}\n`;
  txt += `==================================================\n\n`;

  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isUser) {
      txt += `YOU (${timeStr}):\n`;
      txt += `${msg.content}\n`;
    } else {
      const isSearchUsed = msg.model?.toLowerCase().includes('search') || msg.model?.toLowerCase().includes('+');
      const displayModel = msg.model
        ?.replace(/\s*\+\s*Search/i, '')
        .replace(/nexa-web-search/i, 'Nexa Search') || 'Nexa AI';
        
      txt += `NEXA AI (${timeStr}):\n`;
      txt += `[Model: ${displayModel}${isSearchUsed ? ' | Web Search Used' : ''}]\n`;
      // Remove think/thought tags from plain text content
      const thinkRegex = /<(think|thought)>([\s\S]*?)<\/(\1)>/gi;
      const cleanContent = msg.content.replace(thinkRegex, '').trim();
      txt += `${cleanContent}\n`;
    }
    txt += `\n--------------------------------------------------\n\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_conversation.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (title: string, messages: Message[]) => {
  const jspdfModule = await loadJsPDF();
  const { jsPDF } = jspdfModule;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - 2 * margin;
  let y = 20;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39); // Slate-900
  const titleLines = doc.splitTextToSize(title, maxLineWidth);
  titleLines.forEach((line: string) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 8;
  });

  y += 2;

  // Metadata: Export Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // Slate-500
  doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, y);
  y += 8;

  // Horizontal separator line
  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Helper function to render paragraphs and wrap lines
  const addFormattedText = (text: string, fontStyle: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number]) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxLineWidth);
    lines.forEach((line: string) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += size * 0.35 + 2.5; // Adjusted line height spacing
    });
  };

  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Header for individual messages
    if (isUser) {
      addFormattedText(`YOU (${timeStr})`, 'bold', 10, [79, 70, 229]); // Indigo-600
    } else {
      const isSearchUsed = msg.model?.toLowerCase().includes('search') || msg.model?.toLowerCase().includes('+');
      const displayModel = msg.model
        ?.replace(/\s*\+\s*Search/i, '')
        .replace(/nexa-web-search/i, 'Nexa Search') || 'Nexa AI';
      
      const aiHeader = `NEXA AI (${timeStr})  |  Model: ${displayModel}${isSearchUsed ? '  |  Web Search: Enabled' : ''}`;
      addFormattedText(aiHeader, 'bold', 10, [13, 148, 136]); // Teal-600
    }
    
    y += 1;

    // Content blocks rendering
    const blocks = parseContent(msg.content);
    blocks.forEach((block) => {
      if (block.type === 'code') {
        // Monospace Courier code block with border and background
        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(31, 41, 55); // Gray-800
        
        const lines = doc.splitTextToSize(block.content, maxLineWidth - 10);
        const blockHeight = lines.length * 4.5 + 8; // Height calculation based on lines

        // Add page break if code block doesn't fit on page
        if (y + blockHeight > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }

        // Draw light gray background box
        doc.setFillColor(249, 250, 251); // Gray-50
        doc.rect(margin, y, maxLineWidth, blockHeight, 'F');
        
        // Draw light gray left border line
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.setLineWidth(0.4);
        doc.rect(margin, y, maxLineWidth, blockHeight, 'D');

        let codeY = y + 6;
        lines.forEach((line: string) => {
          doc.text(line, margin + 5, codeY);
          codeY += 4.5;
        });

        y += blockHeight + 5;
      } else {
        // Render regular text paragraphs
        const paragraphs = block.content.split('\n');
        paragraphs.forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) {
            addFormattedText(trimmed, 'normal', 10, [55, 65, 81]); // Gray-700
            y += 2;
          }
        });
      }
    });

    y += 5; // Spacing between messages
  });

  // Page Numbers Footer Addition
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(156, 163, 175); // Gray-400
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_conversation.pdf`);
};

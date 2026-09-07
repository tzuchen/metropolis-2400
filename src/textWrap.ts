/**
 * Smart word and character wrapper supporting both CJK (Chinese/Japanese/Korean) and Latin text.
 */
export function wrapText(text: string, maxWidth: number, measure: (str: string) => number): string[] {
  if (!text) return [];

  const lines: string[] = [];
  const hasCJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(text);

  if (!hasCJK) {
    // Standard Latin word wrapping
    const words = text.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      if (measure(testLine) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  } else {
    // Character-level wrapping for CJK and mixed sentences
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      if (measure(testLine) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

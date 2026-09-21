import fs from 'fs';
import path from 'path';

const indexPath = path.resolve(process.cwd(), 'index.html');

try {
  const htmlContent = fs.readFileSync(indexPath, 'utf-8');

  // Verify that the control-panel class exists
  const controlPanelRegex = /class="control-panel"/;
  if (!controlPanelRegex.test(htmlContent)) {
    throw new Error('Missing class="control-panel" in index.html');
  }

  // Extract the content within the control-panel div
  const controlPanelStart = htmlContent.indexOf('class="control-panel"');
  if (controlPanelStart === -1) {
    throw new Error('Could not find control-panel section');
  }

  // Find the start of the control-panel div
  const divStart = htmlContent.lastIndexOf('<div', controlPanelStart);
  
  // Find the matching closing </div> by counting nested divs
  let depth = 0;
  let divEnd = -1;
  let searchPos = divStart;
  
  while (searchPos < htmlContent.length) {
    const nextOpen = htmlContent.indexOf('<div', searchPos);
    const nextClose = htmlContent.indexOf('</div>', searchPos);
    
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      searchPos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        divEnd = nextClose;
        break;
      }
      searchPos = nextClose + 5;
    }
  }
  
  if (divStart === -1 || divEnd === -1) {
    throw new Error('Could not extract control-panel div content');
  }

  const controlPanelContent = htmlContent.substring(divStart, divEnd + 6);

  // List of required keyboard shortcuts
  const requiredKeys = ['P', 'Z', 'H', 'F', 'C', 'Q', '1', '2', '3', 'I', 'U', 'M', 'L', 'T', 'E', 'TAB'];

  // Check each required key
  const missingKeys: string[] = [];
  
  for (const key of requiredKeys) {
    // Create a regex to find the key in a span with class="key"
    // Use word boundary to ensure we match the key as a whole word, not part of another word
    const keyRegex = new RegExp(`<span\\s+class="key">\\s*${key}\\s*</span>`);
    if (!keyRegex.test(controlPanelContent)) {
      // For numeric keys that might be grouped (like "1 2 3"), check if they exist within any key span
      if (/^[0-9]$/.test(key)) {
        const allKeySpans = controlPanelContent.match(/<span\s+class="key">[^<]*<\/span>/g) || [];
        const found = allKeySpans.some(span => {
          const content = span.replace(/<span\s+class="key">/g, '').replace(/<\/span>/g, '').trim();
          const words = content.split(/\s+/);
          return words.includes(key);
        });
        if (!found) {
          missingKeys.push(key);
        }
      } else {
        missingKeys.push(key);
      }
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing keyboard shortcuts in control-panel: ${missingKeys.join(', ')}`);
  }

  console.log('✅ All control-panel bindings verified successfully!');
  console.log(`   Found all ${requiredKeys.length} required keyboard shortcuts: ${requiredKeys.join(', ')}`);
} catch (error) {
  if (error instanceof Error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } else {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

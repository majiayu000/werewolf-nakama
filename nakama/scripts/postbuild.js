#!/usr/bin/env node
/**
 * Post-build script to fix Nakama goja compatibility
 *
 * Transforms function expressions assigned to variables into
 * proper function declarations at global scope.
 *
 * Before: matchInit = function matchInit(ctx, ...) { ... }
 * After:  function matchInit(ctx, ...) { ... }
 */

const fs = require('fs');
const path = require('path');

const BUILD_FILE = path.join(__dirname, '../build/index.js');

// Match handler function names that need to be at global scope
const MATCH_HANDLERS = [
  'matchInit',
  'matchJoinAttempt',
  'matchJoin',
  'matchLeave',
  'matchLoop',
  'matchTerminate',
  'matchSignal'
];

function extractFunctionBody(content, startIndex) {
  // Find the matching closing brace for a function
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return i + 1; // Return index after closing brace
        }
      }
    } else {
      if (char === stringChar) {
        inString = false;
      }
    }
  }

  return -1; // Not found
}

function postProcess() {
  console.log('Post-processing build output for Nakama compatibility...');

  let content = fs.readFileSync(BUILD_FILE, 'utf8');
  const extractedFunctions = [];

  // Remove any existing banner
  content = content.replace(/^var matchInit,.*?;\n/, '');

  for (const fnName of MATCH_HANDLERS) {
    // Pattern: fnName = /* @__PURE__ */ __name(function fnName2(params) {
    // Note: esbuild may rename the inner function (e.g., matchInit -> matchInit2)
    const patterns = [
      // With __name wrapper and renamed function (fnName2)
      new RegExp(`${fnName} = \\/\\* @__PURE__ \\*\\/ __name\\(function ${fnName}\\d*\\(`, 'g'),
      // With __name wrapper and anonymous function
      new RegExp(`${fnName} = \\/\\* @__PURE__ \\*\\/ __name\\(function\\(`, 'g'),
      // Without __name, named function
      new RegExp(`${fnName} = function ${fnName}\\d*\\(`, 'g'),
      // Without __name, anonymous function
      new RegExp(`${fnName} = function\\(`, 'g'),
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const startOfAssignment = match.index;

        // Find the function body start (the opening brace of function body)
        let searchStart = match.index + match[0].length;

        // Skip past parameters to find the opening brace
        let parenCount = 1;
        let funcBodyStart = -1;
        for (let i = searchStart; i < content.length; i++) {
          if (content[i] === '(') parenCount++;
          else if (content[i] === ')') parenCount--;
          if (parenCount === 0) {
            // Found end of params, now find opening brace
            for (let j = i + 1; j < content.length; j++) {
              if (content[j] === '{') {
                funcBodyStart = j;
                break;
              }
            }
            break;
          }
        }

        if (funcBodyStart === -1) {
          console.log(`Could not find function body start for ${fnName}`);
          continue;
        }

        // Extract function body
        const funcBodyEnd = extractFunctionBody(content, funcBodyStart);
        if (funcBodyEnd === -1) {
          console.log(`Could not find function body end for ${fnName}`);
          continue;
        }

        // Find the end of the entire statement (including __name wrapper if present)
        let statementEnd = funcBodyEnd;
        // Check if there's a __name wrapper closing
        const afterBody = content.substring(funcBodyEnd, funcBodyEnd + 50);
        const nameWrapperEnd = afterBody.match(/^\s*,\s*"[^"]+"\s*\)/);
        if (nameWrapperEnd) {
          statementEnd = funcBodyEnd + nameWrapperEnd[0].length;
        }
        // Skip trailing semicolon if present
        if (content[statementEnd] === ';') {
          statementEnd++;
        }

        // Extract parameter list
        const paramStart = match.index + match[0].length - 1; // Start at opening paren
        let paramEnd = paramStart;
        parenCount = 1;
        for (let i = paramStart + 1; i < content.length && parenCount > 0; i++) {
          if (content[i] === '(') parenCount++;
          else if (content[i] === ')') parenCount--;
          paramEnd = i;
        }
        const params = content.substring(paramStart, paramEnd + 1);

        // Extract function body content
        const bodyContent = content.substring(funcBodyStart, funcBodyEnd);

        // Create proper function declaration
        const funcDeclaration = `function ${fnName}${params} ${bodyContent}`;
        extractedFunctions.push(funcDeclaration);

        // Remove the original assignment from content
        content = content.substring(0, startOfAssignment) +
                  `/* ${fnName} moved to global scope */` +
                  content.substring(statementEnd);

        console.log(`Extracted and hoisted ${fnName}`);
        break; // Move to next function
      }
    }
  }

  if (extractedFunctions.length === 0) {
    console.log('No functions to extract. Build may already be compatible or structure differs.');
    return;
  }

  // Build the final output
  const globalFunctions = extractedFunctions.join('\n\n');

  // Insert global function declarations at the top (after "use strict" if present)
  const strictMatch = content.match(/^("use strict";\n?)/);
  if (strictMatch) {
    const afterStrict = strictMatch[0].length;
    content = content.substring(0, afterStrict) + '\n' + globalFunctions + '\n\n' + content.substring(afterStrict);
  } else {
    content = globalFunctions + '\n\n' + content;
  }

  // Fix shorthand property syntax in registerMatch call
  // Replace { matchInit, ... } with { matchInit: matchInit, ... }
  for (const fnName of MATCH_HANDLERS) {
    // Replace shorthand: standalone "matchInit" followed by comma, newline, or closing brace
    // But NOT "matchInit:" (which is already explicit)
    const shorthandPattern = new RegExp(`\\b${fnName}\\b(?!\\s*:)([,\\n\\r}])`, 'g');
    content = content.replace(shorthandPattern, `${fnName}: ${fnName}$1`);
  }

  fs.writeFileSync(BUILD_FILE, content);
  console.log(`Post-processing complete! Hoisted ${extractedFunctions.length} functions to global scope.`);
}

try {
  postProcess();
} catch (err) {
  console.error('Post-processing failed:', err);
  process.exit(1);
}

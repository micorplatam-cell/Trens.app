#!/usr/bin/env node
/**
 * Fix for react-native-css-interop parseAspectRatio crash
 * This fixes: TypeError: Cannot read properties of undefined (reading '0')
 * Issue: parseAspectRatio doesn't handle undefined aspectRatio.ratio
 */

const fs = require('fs');
const path = require('path');

// Fix BOTH .ts source and .js compiled file
const files = [
  {
    path: path.join(
      __dirname,
      '..',
      'node_modules',
      'react-native-css-interop',
      'src',
      'css-to-rn',
      'parseDeclaration.ts'
    ),
    original: `function parseAspectRatio(
  // This is missing types
  aspectRatio: any,
): RuntimeValueDescriptor {
  if (aspectRatio.auto) {
    return "auto";
  } else {
    if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
      return 1;
    } else {
      return aspectRatio.ratio.join(" / ");
    }
  }
}`,
    fixed: `function parseAspectRatio(
  // This is missing types
  aspectRatio: any,
): RuntimeValueDescriptor {
  // Fix: Handle undefined aspectRatio or ratio
  if (!aspectRatio || !aspectRatio.ratio) {
    return undefined;
  }
  if (aspectRatio.auto) {
    return "auto";
  } else {
    if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
      return 1;
    } else {
      return aspectRatio.ratio.join(" / ");
    }
  }
}`,
  },
  {
    path: path.join(
      __dirname,
      '..',
      'node_modules',
      'react-native-css-interop',
      'dist',
      'css-to-rn',
      'parseDeclaration.js'
    ),
    original: `function parseAspectRatio(aspectRatio) {
    if (aspectRatio.auto) {
        return "auto";
    }
    else {
        if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
            return 1;
        }
        else {
            return aspectRatio.ratio.join(" / ");
        }
    }
}`,
    fixed: `function parseAspectRatio(aspectRatio) {
    // Fix: Handle undefined aspectRatio or ratio
    if (!aspectRatio || !aspectRatio.ratio) {
        return undefined;
    }
    if (aspectRatio.auto) {
        return "auto";
    }
    else {
        if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
            return 1;
        }
        else {
            return aspectRatio.ratio.join(" / ");
        }
    }
}`,
  },
];

let fixed = 0;
for (const file of files) {
  if (!fs.existsSync(file.path)) {
    continue;
  }

  let content = fs.readFileSync(file.path, 'utf8');

  if (content.includes('// Fix: Handle undefined aspectRatio or ratio')) {
    continue; // Already fixed
  }

  if (content.includes(file.original)) {
    content = content.replace(file.original, file.fixed);
    fs.writeFileSync(file.path, content);
    fixed++;
  }
}

if (fixed > 0) {
  console.log(`✅ react-native-css-interop patched (${fixed} files)`);
} else {
  console.log('✅ react-native-css-interop already patched');
}

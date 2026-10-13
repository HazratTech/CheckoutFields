import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetFiles = [
  path.join(__dirname, 'node_modules/@shopify/ui-extensions/build/esm/utilities/registration.mjs'),
  path.join(__dirname, 'node_modules/@shopify/ui-extensions/build/esnext/utilities/registration.esnext'),
  path.join(__dirname, 'node_modules/@shopify/ui-extensions/build/cjs/utilities/registration.js')
];

const safeCode = `
      console.log(\`[Fieldy DEBUG] extension invoked for target "\${target}". Arguments count: \${args.length}\`, args);
      if (args.length === 0) {
        console.warn(\`[Fieldy DEBUG] extension invoked with 0 arguments for target "\${target}". Returning safely.\`);
        return;
      }
      if (args.length === 1) {
        return implementation(...args);
      }
      const [firstArg, api] = args;
      if (!firstArg) {
        console.warn(\`[Fieldy DEBUG] firstArg is falsy for target "\${target}":\`, args);
        return;
      }
      if (typeof firstArg.createComponent === 'function' || typeof firstArg.mount === 'function') {
        console.log(\`[Fieldy DEBUG] firstArg is already a RemoteRoot for target "\${target}"\`);
        let renderResult = implementation(firstArg, api);
        if (typeof renderResult === 'object' && renderResult != null && 'then' in renderResult) {
          renderResult = await renderResult;
        }
        if (typeof firstArg.mount === 'function') {
          firstArg.mount();
        }
        return renderResult;
      }
      const { channel, components } = firstArg;
      if (!channel) {
        console.warn(\`[Fieldy DEBUG] firstArg has no channel for target "\${target}":\`, firstArg);
        return;
      }
      const root = createRemoteRoot(channel, {
        components,
        strict: true
      });
`;

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('[Fieldy DEBUG]')) {
    console.log('[Patch] Already patched:', file);
    continue;
  }
  // Replace the fragile destructuring
  const targetPattern = /if\s*\(args\.length\s*===\s*1\)\s*\{\s*return\s*implementation\(\.\.\.args\);\s*\}\s*const\s*\[\{\s*channel,\s*components\s*\}\s*,\s*api\]\s*=\s*args;\s*const\s*root\s*=\s*(?:core\.)?createRemoteRoot\(channel,\s*\{\s*components,\s*strict:\s*true\s*\}\);/;
  if (targetPattern.test(content)) {
    content = content.replace(targetPattern, safeCode.trim());
    fs.writeFileSync(file, content);
    console.log('[Patch] Successfully patched:', file);
  }
}

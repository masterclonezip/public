const fs = require('fs');
const { execSync } = require('child_process');

try {
    console.log("Syncing staticData.json & sitemaps from live Firestore before Vite build...");
    execSync('npx tsx scripts/prerender.ts --sync-only', { stdio: 'inherit' });
} catch (syncErr) {
    console.warn("Pre-build Firestore sync notice:", syncErr.message || syncErr);
}

// Generate api/index.js for Vercel serverless functions

if (!fs.existsSync('server.ts')) {
    console.log("server.ts not found. Skipping api/index.js generation.");
    process.exit(0);
}
console.log("Generating api/index.js from server.ts for Vercel...");
let content = fs.readFileSync('server.ts', 'utf8');
// 1. Rewrite imports and requires for api/ location
// 2. Extract the body of startServer
const startToken = 'async function startServer() {';
const startIdx = content.indexOf(startToken);
if (startIdx !== -1) {
    const prelude = content.substring(0, startIdx);
    let body = content.substring(startIdx + startToken.length);
    
    // Find the end of the function - it's before startServer();
    const endCall = 'startServer();';
    const endCallIdx = body.lastIndexOf(endCall);
    if (endCallIdx !== -1) {
        body = body.substring(0, endCallIdx);
        // Remove the last closing brace of startServer()
        const lastBraceIdx = body.lastIndexOf('}');
        if (lastBraceIdx !== -1) {
            body = body.substring(0, lastBraceIdx) + body.substring(lastBraceIdx + 1);
        }
    }
    content = prelude + body;
}

// 3. Replace app.listen with module.exports for Vercel
const listenStartIdx = content.indexOf('const server = app.listen');
if (listenStartIdx !== -1) {
    content = content.substring(0, listenStartIdx) + '\nmodule.exports = app;\n';
}

// 4. Strip Vite/Static block (not needed in Serverless Function)
const startComment = '// Vite middleware for development';
const endComment = '// Global Express Error Handler';
const vIdx = content.indexOf(startComment);
const eIdx = content.indexOf(endComment);
if (vIdx !== -1 && eIdx !== -1) {
    console.log('Stripping Vite/Static block from API build...');
    content = content.substring(0, vIdx) + '\n\n' + content.substring(eIdx);
}

// 5. Keep all admin and public routes intact for full Vercel serverless support
fs.writeFileSync('api_temp.ts', content);
fs.mkdirSync('api', { recursive: true });
console.log("Compiling api_temp.ts to api/index.js...");
execSync('npx esbuild api_temp.ts --bundle --platform=node --format=cjs --define:import.meta.env=process.env --packages=external --minify --outfile=api/index.js', { stdio: 'inherit' });
console.log("api/index.js generated successfully.");
if (fs.existsSync('api_temp.ts')) {
    fs.unlinkSync('api_temp.ts');
}

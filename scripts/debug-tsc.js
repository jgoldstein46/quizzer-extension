import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Debug: Checking TypeScript compilation...');
console.log(`Current directory: ${process.cwd()}`);
console.log(`Root directory: ${rootDir}`);

// Check if background.ts exists
const backgroundPath = path.join(rootDir, 'src', 'background', 'background.ts');
if (fs.existsSync(backgroundPath)) {
  console.log(`Found background.ts at: ${backgroundPath}`);
} else {
  console.error(`ERROR: background.ts not found at: ${backgroundPath}`);
}

// Check if content.ts exists
const contentPath = path.join(rootDir, 'src', 'content', 'content.ts');
if (fs.existsSync(contentPath)) {
  console.log(`Found content.ts at: ${contentPath}`);
} else {
  console.error(`ERROR: content.ts not found at: ${contentPath}`);
}

// Create a temporary tsconfig for the background script
const backgroundTsConfig = {
  compilerOptions: {
    target: "ES2020",
    module: "ES2020",
    moduleResolution: "node",
    esModuleInterop: true,
    strict: true,
    skipLibCheck: true,
    outDir: "dist/temp"
  },
  include: ["src/background/background.ts"]
};

// Write the temporary tsconfig
const backgroundConfigPath = path.join(rootDir, 'temp-debug-background-tsconfig.json');
fs.writeFileSync(
  backgroundConfigPath,
  JSON.stringify(backgroundTsConfig, null, 2)
);
console.log(`Created temporary config at: ${backgroundConfigPath}`);

// Run the TypeScript compiler with verbose output
console.log('\nCompiling background.ts with --listFiles to see all files being included...');
exec('npx tsc -p temp-debug-background-tsconfig.json --listFiles', 
  { cwd: rootDir }, 
  (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    if (error) {
      console.error(`Error compiling background script: ${error.message}`);
      // Try to analyze typescript errors by looking at the file
      console.log('\nAttempting to find TypeScript issues in background.ts...');
      try {
        const content = fs.readFileSync(backgroundPath, 'utf8');
        const lines = content.split('\n');
        console.log(`Background.ts has ${lines.length} lines`);
        console.log('First few imports:');
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          if (lines[i].includes('import')) {
            console.log(`Line ${i+1}: ${lines[i]}`);
          }
        }
      } catch (readError) {
        console.error(`Error reading background.ts: ${readError.message}`);
      }
    } else {
      console.log('TypeScript compilation succeeded!');
    }
    
    // Clean up temp file
    try {
      fs.unlinkSync(backgroundConfigPath);
      console.log('Cleaned up temporary config file');
    } catch (unlinkError) {
      console.warn(`Warning: Failed to clean up temporary config file: ${unlinkError.message}`);
    }
  }
); 
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const INPUT_FILE = process.argv[2] || 'images.json';
const OUTPUT_DIR = process.argv[3] || './downloaded-images';

// Fields to download
const FIELDS = ['sourceImgs', 'thumbnails', 'x1000Imgs', 'x500Imgs'];

// Statistics
let stats = {
  total: 0,
  downloaded: 0,
  failed: 0,
  skipped: 0
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Global console log function
function consoleLog(...args) {
  console.log(...args);
}

// Download image from URL with redirect following
async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    let currentUrl = url;
    const maxRedirects = 10;
    let redirectCount = 0;

    function makeRequest() {
      https.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error('Redirect without location header'));
            return;
          }

          redirectCount++;
          if (redirectCount > maxRedirects) {
            reject(new Error(`Too many redirects (${maxRedirects})`));
            return;
          }

          // Resolve redirect URL (handle relative URLs)
          if (redirectUrl.startsWith('/')) {
            const parsed = new URL(currentUrl);
            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
          }
          if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
            currentUrl = redirectUrl;
            makeRequest();
          } else {
            reject(new Error(`Invalid redirect URL: ${redirectUrl}`));
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error: ${response.statusCode}`));
          return;
        }

        // Check if response has a readable property (Node.js compatibility)
        const chunks = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(outputPath, buffer);
            resolve();
          } catch (err) {
            reject(new Error(`Failed to write file: ${err.message}`));
          }
        });

        response.on('error', (err) => {
          reject(new Error(`Response error: ${err.message}`));
        });
      }).on('error', (err) => {
        reject(new Error(`Request error: ${err.message}`));
      });
    }

    makeRequest();
  });
}

// Process images
async function processImages(data) {
  consoleLog(`📥 Downloading images from ${INPUT_FILE} to ${OUTPUT_DIR}`);
  consoleLog(`📊 Total images to download: ${data.total || 'Unknown'}`);
  consoleLog('');

  // Process each field
  for (const field of FIELDS) {
    const fieldData = data[field];
    if (!fieldData) {
      consoleLog(`⚠️  Field '${field}' not found or empty`);
      continue;
    }

    consoleLog(`📁 Processing field: ${field}`);

    for (const [postId, posts] of Object.entries(fieldData)) {
      for (const [imgId, imgData] of Object.entries(posts)) {
        const downloadUrl = imgData.downloadUrl;
        const imgPath = imgData.path;

        if (!downloadUrl || !imgPath) {
          consoleLog(`  ⚠️  Skipping ${field}/${postId}/${imgId}: missing downloadUrl or path`);
          stats.skipped++;
          continue;
        }

        // Create output directory structure
        const outputDir = path.join(OUTPUT_DIR, imgPath.split('/').slice(0, -1).join('/'));
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Build filename from path
        const filename = path.basename(imgPath);
        const outputPath = path.join(outputDir, filename);

        // Prevent overwriting existing files
        if (fs.existsSync(outputPath)) {
          consoleLog(`  ⏭️  Skipping ${field}/${postId}/${imgId}: already exists`);
          stats.skipped++;
          continue;
        }

        stats.total++;
        consoleLog(`  📥 ${field}/${postId}/${imgId} -> ${imgPath}`);

        try {
          await downloadImage(downloadUrl, outputPath);
          stats.downloaded++;
          consoleLog(`    ✅ Downloaded`);
        } catch (err) {
          stats.failed++;
          consoleLog(`    ❌ Error: ${err.message}`);
        }
      }
    }
  }

  // Print summary
  consoleLog('');
  consoleLog('═══════════════════════════════════════════════════════════');
  consoleLog(`📊 Download Summary:`);
  consoleLog(`   Total:    ${stats.total}`);
  consoleLog(`   Downloaded: ${stats.downloaded}`);
  consoleLog(`   Failed:   ${stats.failed}`);
  consoleLog(`   Skipped:  ${stats.skipped}`);
  consoleLog('═══════════════════════════════════════════════════════════');
  consoleLog(`💾 Images saved to: ${OUTPUT_DIR}`);
  consoleLog('');

  // Return stats for potential script exit codes
  return { stats, failed: stats.failed };
}

// Main
async function main() {
  try {
    // Check if input file exists
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ Error: Input file '${INPUT_FILE}' not found`);
      console.error('Usage: node download-images.js [input.json] [output-dir]');
      process.exit(1);
    }

    // Read input file
    consoleLog(`📖 Reading ${INPUT_FILE}...`);
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

    // Validate structure
    for (const field of FIELDS) {
      if (!data[field]) {
        console.error(`❌ Error: Missing field '${field}' in ${INPUT_FILE}`);
        process.exit(1);
      }
    }

    // Set total count from data
    data.total = Object.keys(data.sourceImgs || {}).reduce((count, postId) => {
      return count + Object.keys(data.sourceImgs[postId] || {}).length;
    }, 0);

    // Process and download images
    const result = await processImages(data);
    
    // Exit with error code if there were failures
    if (result.failed > 0) {
      process.exit(1);
    }
    
    process.exit(0);

  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();

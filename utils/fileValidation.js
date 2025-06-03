const crypto = require('crypto');
const { createReadStream } = require('fs');

class FileValidator {
  static ALLOWED_MIME_TYPES = [
    'text/csv',
    'application/csv',
    'text/plain'
  ];

  static CSV_SIGNATURES = [
    // UTF-8 BOM + CSV content patterns
    [0xEF, 0xBB, 0xBF], // UTF-8 BOM
    // Common CSV patterns (first few bytes)
    [0x22], // Starting with quote
    [0x2C], // Starting with comma (edge case)
  ];

  static MALICIOUS_PATTERNS = [
    // Script injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    // Formula injection patterns
    /^[\s]*[=@+\-]/,
    // Macro patterns
    /\bMacro\b/gi,
    /\bSUB\b|\bFUNCTION\b/gi,
    // Suspicious file paths
    /\.\.(\/|\\)/g,
    // Null bytes
    /\x00/g,
  ];

  static validateMimeType(mimeType) {
    return this.ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
  }

  static validateFileExtension(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'csv';
  }

  static async validateFileSignature(filePath) {
    return new Promise((resolve) => {
      const stream = createReadStream(filePath, { start: 0, end: 1023 });
      let buffer = Buffer.alloc(0);

      stream.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
      });

      stream.on('end', () => {
        // Check for suspicious binary patterns
        if (this.containsBinaryData(buffer)) {
          resolve(false);
          return;
        }

        // Validate CSV-like structure
        const text = buffer.toString('utf8');
        resolve(this.isValidCSVStructure(text));
      });

      stream.on('error', () => resolve(false));
    });
  }

  static async scanForMaliciousContent(filePath) {
    return new Promise((resolve) => {
      const stream = createReadStream(filePath, { encoding: 'utf8' });
      let content = '';
      let isClean = true;

      stream.on('data', (chunk) => {
        content += chunk;
        
        // Check for malicious patterns in chunks
        for (const pattern of this.MALICIOUS_PATTERNS) {
          if (pattern.test(content)) {
            isClean = false;
            stream.destroy();
            break;
          }
        }
      });

      stream.on('end', () => resolve(isClean));
      stream.on('error', () => resolve(false));
    });
  }

  static containsBinaryData(buffer) {
    // Check for excessive null bytes or control characters
    let controlChars = 0;
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
      const byte = buffer[i];
      if ((byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) || byte === 127) {
        controlChars++;
      }
    }
    return controlChars / Math.min(buffer.length, 512) > 0.1;
  }

  static isValidCSVStructure(text) {
    const lines = text.split('\n').slice(0, 10); // Check first 10 lines
    
    if (lines.length === 0) return false;
    
    // Check if it looks like CSV (has commas, consistent structure)
    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    if (firstLineCommas === 0) return false;

    // Check consistency across lines
    let consistentStructure = 0;
    for (const line of lines.slice(1)) {
      const commas = (line.match(/,/g) || []).length;
      if (Math.abs(commas - firstLineCommas) <= 1) {
        consistentStructure++;
      }
    }

    return consistentStructure / (lines.length - 1) > 0.7;
  }

  static generateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

module.exports = { FileValidator };
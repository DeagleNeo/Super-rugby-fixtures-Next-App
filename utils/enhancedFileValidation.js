const { SecurityScanner } = require('./securityScanner');

class EnhancedFileValidator {
  static async validateAndScan(filePath, fileName, options = {}) {
    const results = {
      valid: true,
      safe: true,
      errors: [],
      warnings: [],
      scanResults: null
    };

    console.log('=== FILE VALIDATION DEBUG ===');
    console.log('filePath:', filePath);
    console.log('fileName:', fileName);
    console.log('fileName type:', typeof fileName);

    // Check if fileName is provided
    if (!fileName) {
      results.valid = false;
      results.errors.push('File name is required');
      return results;
    }

    // Basic validation
    if (!this.validateFileExtension(fileName)) {
      results.valid = false;
      results.errors.push('Invalid file extension - only CSV files allowed');
      return results;
    }

    // File signature validation
    const isValidSignature = await this.validateFileSignature(filePath);
    if (!isValidSignature) {
      results.valid = false;
      results.errors.push('Invalid file format or suspicious binary content');
      return results;
    }

    // Security scanning
    const scanType = options.scanLevel || 'comprehensive'; // 'lightweight' | 'comprehensive'
    
    if (scanType === 'lightweight') {
      results.scanResults = await SecurityScanner.lightweightScan(filePath);
    } else {
      results.scanResults = await SecurityScanner.comprehensiveScan(filePath, {
        enableClamAV: options.enableClamAV !== false,
        enableVirusTotal: options.enableVirusTotal === true,
        virusTotalApiKey: options.virusTotalApiKey
      });
    }

    if (!results.scanResults.safe) {
      results.safe = false;
      results.errors.push('Malicious content detected');
    }

    // Add warnings for low confidence scans
    if (results.scanResults.overall && results.scanResults.overall.confidence === 'low') {
      results.warnings.push('Security scan had limited coverage - consider enabling additional scanners');
    }

    return results;
  }

  static validateFileExtension(fileName) {
    // Add null/undefined checks
    if (!fileName || typeof fileName !== 'string') {
      console.log('Invalid fileName provided to validateFileExtension:', fileName);
      return false;
    }

    try {
      const ext = fileName.toLowerCase().split('.').pop();
      return ext === 'csv';
    } catch (error) {
      console.error('Error in validateFileExtension:', error);
      return false;
    }
  }

  static async validateFileSignature(filePath) {
    // Reuse existing signature validation logic
    const fs = require('fs');
    return new Promise((resolve) => {
      const stream = fs.createReadStream(filePath, { start: 0, end: 1023 });
      let buffer = Buffer.alloc(0);

      stream.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
      });

      stream.on('end', () => {
        const text = buffer.toString('utf8');
        resolve(this.isValidCSVStructure(text) && !this.containsExcessiveBinaryData(buffer));
      });

      stream.on('error', () => resolve(false));
    });
  }

  static isValidCSVStructure(text) {
    const lines = text.split('\n').slice(0, 10);
    if (lines.length === 0) return false;
    
    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    if (firstLineCommas === 0) return false;

    let consistentStructure = 0;
    for (const line of lines.slice(1)) {
      const commas = (line.match(/,/g) || []).length;
      if (Math.abs(commas - firstLineCommas) <= 1) {
        consistentStructure++;
      }
    }

    return consistentStructure / (lines.length - 1) > 0.7;
  }

  static containsExcessiveBinaryData(buffer) {
    let controlChars = 0;
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
      const byte = buffer[i];
      if ((byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) || byte === 127) {
        controlChars++;
      }
    }
    return controlChars / Math.min(buffer.length, 512) > 0.1;
  }
}

module.exports = { EnhancedFileValidator };
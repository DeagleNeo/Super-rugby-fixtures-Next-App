const crypto = require('crypto');
const { createReadStream } = require('fs');
const { spawn } = require('child_process');
const { promises: fs } = require('fs');

class SecurityScanner {
  // Pattern-based detection for CSV-specific threats
  static CSV_SPECIFIC_PATTERNS = [
    // Formula injection patterns (more comprehensive)
    /^[\s]*[=@+\-]/m,
    /\bCONCATENATE\b/gi,
    /\bCHAR\b/gi,
    /\bCODE\b/gi,
    /\bHYPERLINK\b/gi,
    
    // Script injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    
    // Event handlers
    /on\w+\s*=/gi,
    
    // Macro patterns
    /\bMacro\b/gi,
    /\bSUB\b|\bFUNCTION\b/gi,
    /\bShell\b/gi,
    /\bCreateObject\b/gi,
    
    // Command injection
    /\bcmd\b|\bpowershell\b|\bbash\b|\bsh\b/gi,
    /\beval\b|\bexec\b/gi,
    
    // Path traversal
    /\.\.(\/|\\)/g,
    
    // Suspicious URLs
    /https?:\/\/[^\s,]+\.(exe|bat|cmd|scr|com|pif)/gi,
    
    // Null bytes and control characters
    /\x00/g,
    /[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g,
  ];

  // Quick pattern-based scan (fast, CSV-specific)
  static async quickPatternScan(filePath) {
    return new Promise((resolve) => {
      const stream = createReadStream(filePath, { encoding: 'utf8' });
      let content = '';
      let threats = [];
      let bytesScanned = 0;
      const maxScanSize = 10 * 1024 * 1024; // 10MB limit for pattern scan

      stream.on('data', (chunk) => {
        content += chunk;
        bytesScanned += Buffer.byteLength(chunk, 'utf8');
        
        // Check patterns in chunks to avoid memory issues
        for (let i = 0; i < this.CSV_SPECIFIC_PATTERNS.length; i++) {
          const pattern = this.CSV_SPECIFIC_PATTERNS[i];
          const matches = content.match(pattern);
          if (matches) {
            threats.push({
              type: 'pattern_match',
              pattern: pattern.toString(),
              matches: matches.slice(0, 3), // First 3 matches
              severity: this.getPatternSeverity(pattern)
            });
            
            // High severity threats should stop scanning immediately
            if (this.getPatternSeverity(pattern) === 'high') {
              stream.destroy();
              resolve({ 
                safe: false, 
                threats, 
                scanType: 'pattern',
                stoppedEarly: true 
              });
              return;
            }
          }
        }

        // Limit scan size to prevent memory issues
        if (bytesScanned > maxScanSize) {
          stream.destroy();
        }
      });

      stream.on('end', () => {
        resolve({ 
          safe: threats.length === 0, 
          threats, 
          scanType: 'pattern',
          bytesScanned 
        });
      });

      stream.on('error', () => {
        resolve({ 
          safe: false, 
          threats: [{ type: 'scan_error', message: 'Failed to scan file' }], 
          scanType: 'pattern' 
        });
      });
    });
  }

  static getPatternSeverity(pattern) {
    const highRiskPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /\bShell\b/gi,
      /\bcmd\b|\bpowershell\b/gi,
      /\beval\b|\bexec\b/gi
    ];

    for (const highRisk of highRiskPatterns) {
      if (pattern.toString() === highRisk.toString()) {
        return 'high';
      }
    }
    return 'medium';
  }

  // ClamAV integration (comprehensive malware detection)
  static async clamavScan(filePath) {
    return new Promise((resolve) => {
      // Check if ClamAV is available
      const clamScan = spawn('clamscan', ['--no-summary', '--infected', filePath]);
      let output = '';
      let errorOutput = '';

      clamScan.stdout.on('data', (data) => {
        output += data.toString();
      });

      clamScan.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      clamScan.on('close', (code) => {
        // ClamAV exit codes: 0 = clean, 1 = infected, 2 = error
        if (code === 0) {
          resolve({ 
            safe: true, 
            scanType: 'clamav',
            output: output.trim() 
          });
        } else if (code === 1) {
          resolve({ 
            safe: false, 
            threats: [{
              type: 'malware_detected',
              details: output.trim(),
              severity: 'high'
            }],
            scanType: 'clamav' 
          });
        } else {
          // ClamAV not available or error - fallback gracefully
          resolve({ 
            safe: null, 
            scanType: 'clamav',
            error: 'ClamAV not available or scan failed',
            fallback: true 
          });
        }
      });

      clamScan.on('error', () => {
        resolve({ 
          safe: null, 
          scanType: 'clamav',
          error: 'ClamAV not installed or not accessible',
          fallback: true 
        });
      });
    });
  }

  // VirusTotal API integration (cloud-based detection)
  static async virusTotalScan(filePath, apiKey) {
    if (!apiKey) {
      return { 
        safe: null, 
        scanType: 'virustotal',
        error: 'API key not provided',
        fallback: true 
      };
    }

    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // First, check if file hash exists in VirusTotal database
      const reportResponse = await fetch(`https://www.virustotal.com/vtapi/v2/file/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: apiKey,
          resource: fileHash
        })
      });

      const reportData = await reportResponse.json();

      if (reportData.response_code === 1) {
        // File found in database
        const positives = reportData.positives || 0;
        const total = reportData.total || 0;
        
        return {
          safe: positives === 0,
          threats: positives > 0 ? [{
            type: 'virustotal_detection',
            positives,
            total,
            scanDate: reportData.scan_date,
            permalink: reportData.permalink,
            severity: positives > 5 ? 'high' : 'medium'
          }] : [],
          scanType: 'virustotal'
        };
      } else {
        // File not in database - would need to upload for scanning
        // For CSV files, we'll skip actual upload due to privacy concerns
        return {
          safe: null,
          scanType: 'virustotal',
          message: 'File not in VirusTotal database',
          fallback: true
        };
      }
    } catch (error) {
      return {
        safe: null,
        scanType: 'virustotal',
        error: 'VirusTotal scan failed',
        fallback: true
      };
    }
  }

  // Composite scan using multiple methods
  static async comprehensiveScan(filePath, options = {}) {
    const {
      enableClamAV = true,
      enableVirusTotal = false,
      virusTotalApiKey = null,
      maxScanTime = 30000 // 30 seconds timeout
    } = options;

    const results = {
      overall: { safe: true, confidence: 'low' },
      scans: [],
      threats: [],
      timestamp: new Date().toISOString()
    };

    // Always do pattern scan (fast and CSV-specific)
    const patternResult = await this.quickPatternScan(filePath);
    results.scans.push(patternResult);
    
    if (!patternResult.safe) {
      results.overall.safe = false;
      results.threats.push(...patternResult.threats);
      results.overall.confidence = 'high'; // Pattern matching is reliable for CSV threats
    }

    // ClamAV scan if enabled
    if (enableClamAV) {
      const clamResult = await Promise.race([
        this.clamavScan(filePath),
        new Promise(resolve => setTimeout(() => resolve({
          safe: null,
          scanType: 'clamav',
          error: 'Scan timeout',
          fallback: true
        }), maxScanTime))
      ]);
      
      results.scans.push(clamResult);
      
      if (clamResult.safe === false) {
        results.overall.safe = false;
        results.threats.push(...clamResult.threats);
        results.overall.confidence = 'high';
      } else if (clamResult.safe === true) {
        results.overall.confidence = 'high';
      }
    }

    // VirusTotal scan if enabled
    if (enableVirusTotal && virusTotalApiKey) {
      const vtResult = await this.virusTotalScan(filePath, virusTotalApiKey);
      results.scans.push(vtResult);
      
      if (vtResult.safe === false) {
        results.overall.safe = false;
        results.threats.push(...vtResult.threats);
        results.overall.confidence = 'high';
      }
    }

    // Determine final confidence level
    const successfulScans = results.scans.filter(scan => scan.safe !== null).length;
    if (successfulScans >= 2) {
      results.overall.confidence = 'high';
    } else if (successfulScans === 1) {
      results.overall.confidence = 'medium';
    }

    return results;
  }

  // Lightweight scan for high-throughput scenarios
  static async lightweightScan(filePath) {
    const result = await this.quickPatternScan(filePath);
    return {
      safe: result.safe,
      threats: result.threats,
      scanType: 'lightweight',
      processingTime: 'fast'
    };
  }
}

module.exports = { SecurityScanner };
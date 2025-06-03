module.exports = {
  development: {
    scanLevel: 'lightweight',
    enableClamAV: false,
    enableVirusTotal: false
  },
  production: {
    scanLevel: 'comprehensive',
    enableClamAV: true,
    enableVirusTotal: true,
    virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY,
    maxScanTime: 30000 // 30 seconds
  }
};
import { UploadManager } from '@/utils/uploadManager';
import { EnhancedFileValidator } from '@/utils/enhancedFileValidation';
import clientPromise from '@/lib/mongodb';
import Papa from 'papaparse';
import { promises as fs } from 'fs';

// Security configuration
const securityConfig = {
  development: {
    scanLevel: 'lightweight',
    enableClamAV: false,
    enableVirusTotal: false
  },
  production: {
    scanLevel: 'comprehensive',
    enableClamAV: true,
    enableVirusTotal: true,
    virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId } = req.body;
    if (!uploadId) return res.status(400).json({ error: 'Upload ID required' });

    // Finalize upload (combine chunks)
    const uploadResult = await UploadManager.finalizeUpload(uploadId);
    if (!uploadResult.success) {
      return res.status(400).json({ error: uploadResult.error });
    }

    // Security validation
    const environment = process.env.NODE_ENV || 'development';
    const config = securityConfig[environment] || securityConfig.development;
  
    const validation = await EnhancedFileValidator.validateAndScan(
      uploadResult.filePath,
      uploadResult.fileName,
      config
    );

    if (!validation.valid || !validation.safe) {
      await fs.unlink(uploadResult.filePath);
      return res.status(400).json({ 
        error: 'File validation failed',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // Process CSV
    const csvText = await fs.readFile(uploadResult.filePath, 'utf8');
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase()
    });

    if (parsed.errors.length > 0) {
      await fs.unlink(uploadResult.filePath);
      return res.status(400).json({ 
        error: 'CSV parsing error', 
        details: parsed.errors 
      });
    }

    // Prepare fixtures
    const fixtures = parsed.data
      .filter(row => row.fixture_mid && row.home_team && row.away_team)
      .map(row => ({
        fixture_mid: row.fixture_mid,
        season: row.season,
        competition_name: row.competition_name,
        fixture_datetime: new Date(row.fixture_datetime),
        fixture_round: parseInt(row.fixture_round) || 0,
        home_team: row.home_team.trim(),
        away_team: row.away_team.trim(),
        created_at: new Date(),
        teams_combined: `${row.home_team.trim()} ${row.away_team.trim()}`.toLowerCase()
      }));

    if (fixtures.length === 0) {
      await fs.unlink(uploadResult.filePath);
      return res.status(400).json({ error: 'No valid fixtures found' });
    }

    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db('super_rugby_db');
    const collection = db.collection('fixtures');

    await collection.deleteMany({});
    const result = await collection.insertMany(fixtures);

    // Create indexes
    await collection.createIndex({ 
      home_team: "text", 
      away_team: "text",
      teams_combined: "text"
    });
    await collection.createIndex({ fixture_datetime: 1 });
    await collection.createIndex({ fixture_round: 1 });

    // Cleanup
    await fs.unlink(uploadResult.filePath);

    res.status(200).json({ 
      success: true,
      inserted: result.insertedCount,
      sample: fixtures.slice(0, 3)
    });

  } catch (error) {
    console.error('Finalization error:', error);
    res.status(500).json({ error: 'Server error during finalization' });
  }
}
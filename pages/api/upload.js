import clientPromise from '../../lib/mongodb';
import Papa from 'papaparse';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { csvData } = req.body;
    
    if (!csvData) {
      return res.status(400).json({ message: 'No CSV data provided' });
    }

    // Parse CSV data with proper handling for Super Rugby format
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings initially for better control
      transformHeader: (header) => header.trim().toLowerCase()
    });

    if (results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
      return res.status(400).json({ 
        message: 'CSV parsing error', 
        errors: results.errors 
      });
    }

    // Transform and validate the fixtures data
    const fixtures = results.data
      .filter(row => row.fixture_mid && row.home_team && row.away_team) // Filter out empty rows
      .map(row => ({
        fixture_mid: row.fixture_mid,
        season: row.season,
        competition_name: row.competition_name,
        fixture_datetime: new Date(row.fixture_datetime),
        fixture_round: parseInt(row.fixture_round) || 0,
        home_team: row.home_team?.trim(),
        away_team: row.away_team?.trim(),
        created_at: new Date(),
        // Create searchable text for easier querying
        teams_combined: `${row.home_team?.trim()} ${row.away_team?.trim()}`.toLowerCase()
      }));

    if (fixtures.length === 0) {
      return res.status(400).json({ message: 'No valid fixtures found in CSV' });
    }

    // Connect to MongoDB and insert data
    const client = await clientPromise;
    const db = client.db('super_rugby_db');
    const collection = db.collection('fixtures');

    // Clear existing data and insert new fixtures
    await collection.deleteMany({});
    const result = await collection.insertMany(fixtures);

    // Create indexes for better search performance
    await collection.createIndex({ 
      home_team: "text", 
      away_team: "text",
      teams_combined: "text"
    });
    await collection.createIndex({ fixture_datetime: 1 });
    await collection.createIndex({ fixture_round: 1 });

    res.status(200).json({ 
      message: 'Super Rugby fixtures uploaded successfully', 
      inserted: result.insertedCount,
      sample: fixtures.slice(0, 3) // Return first 3 fixtures as sample
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
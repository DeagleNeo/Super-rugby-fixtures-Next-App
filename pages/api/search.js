import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ fixtures: [] });
    }

    const client = await clientPromise;
    const db = client.db('super_rugby_db');
    const collection = db.collection('fixtures');

    // Create case-insensitive regex for team search
    const searchRegex = new RegExp(q.trim(), 'i');
    
    const fixtures = await collection.find({
      $or: [
        { home_team: { $regex: searchRegex } },
        { away_team: { $regex: searchRegex } }
      ]
    })
    .sort({ fixture_datetime: 1 })
    .limit(25)
    .toArray();

    // Format fixtures for display
    const formattedFixtures = fixtures.map(fixture => ({
      ...fixture,
      fixture_date: fixture.fixture_datetime.toISOString().split('T')[0],
      fixture_time: fixture.fixture_datetime.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Australia/Sydney'
      })
    }));

    res.status(200).json({ fixtures: formattedFixtures });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
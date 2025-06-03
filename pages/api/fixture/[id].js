import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid fixture ID' });
    }

    const client = await clientPromise;
    const db = client.db('super_rugby_db');
    const collection = db.collection('fixtures');

    const fixture = await collection.findOne({ _id: new ObjectId(id) });

    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }

    // Format the fixture for display
    const formattedFixture = {
      ...fixture,
      fixture_date: fixture.fixture_datetime.toLocaleDateString('en-AU'),
      fixture_time: fixture.fixture_datetime.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Australia/Sydney'
      }),
      fixture_day: fixture.fixture_datetime.toLocaleDateString('en-AU', {
        weekday: 'long'
      })
    };

    res.status(200).json({ fixture: formattedFixture });

  } catch (error) {
    console.error('Fixture fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
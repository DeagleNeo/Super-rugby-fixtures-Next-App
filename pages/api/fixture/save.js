import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'rugby_fixtures';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function saveFixtureToDatabase(fixture) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('saved_fixtures');

    // Check if fixture already exists to prevent duplicates
    const existingFixture = await collection.findOne({
      $or: [
        { fixture_mid: fixture.fixture_mid },
        { _id: fixture._id }
      ]
    });

    if (existingFixture) {
      return { success: false, error: 'Fixture already saved', fixture: existingFixture };
    }

    // Add metadata
    const fixtureToSave = {
      ...fixture,
      saved_at: new Date(),
      saved_by: 'user', // can add user authentication later
      original_id: fixture._id, // Keep original ID
    };

    // Remove the _id to let MongoDB generate a new one for saved fixtures
    delete fixtureToSave._id;

    const result = await collection.insertOne(fixtureToSave);
    
    const savedFixture = {
      ...fixtureToSave,
      _id: result.insertedId
    };

    return { success: true, fixture: savedFixture };
  } catch (error) {
    console.error('Database save error:', error);
    throw new Error('Failed to save fixture to database');
  }
}

async function getSavedFixtures(limit = 50, skip = 0) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('saved_fixtures');

    const fixtures = await collection
      .find({})
      .sort({ saved_at: -1 }) // Most recently saved first
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await collection.countDocuments();

    return { fixtures, total };
  } catch (error) {
    console.error('Database fetch error:', error);
    throw new Error('Failed to fetch saved fixtures');
  }
}

async function deleteSavedFixture(fixtureId) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('saved_fixtures');

    const result = await collection.deleteOne({ _id: new ObjectId(fixtureId) });
    
    return { success: result.deletedCount > 0 };
  } catch (error) {
    console.error('Database delete error:', error);
    throw new Error('Failed to delete saved fixture');
  }
}

async function clearAllSavedFixtures() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('saved_fixtures');

    const result = await collection.deleteMany({});
    
    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Database clear error:', error);
    throw new Error('Failed to clear saved fixtures');
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Save fixture
      const fixture = req.body;
      
      if (!fixture || !fixture.fixture_mid) {
        return res.status(400).json({ error: 'Invalid fixture data' });
      }

      const result = await saveFixtureToDatabase(fixture);
      
      if (!result.success) {
        return res.status(409).json(result); // 409 Conflict for duplicates
      }
      
      return res.status(200).json(result);
      
    } else if (req.method === 'GET') {
      // Get saved fixtures
      const { limit = 50, skip = 0 } = req.query;
      const result = await getSavedFixtures(parseInt(limit), parseInt(skip));
      
      return res.status(200).json(result);
      
    } else if (req.method === 'DELETE') {
      // Check if this is a clear all request
      const { clear } = req.query;
      
      if (clear === 'all') {
        const result = await clearAllSavedFixtures();
        return res.status(200).json(result);
      }
      
      // Delete single fixture
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Fixture ID required' });
      }
      
      const result = await deleteSavedFixture(id);
      return res.status(200).json(result);
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
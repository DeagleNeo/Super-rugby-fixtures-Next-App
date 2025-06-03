const { UploadManager } = require('../../../utils/uploadManager');
const formidable = require('formidable');
const { promises: fs } = require('fs');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new formidable.IncomingForm({
      maxFileSize: 2 * 1024 * 1024, // 2MB max chunk size
    });

    const [fields, files] = await form.parse(req);
    
    const uploadId = Array.isArray(fields.uploadId) ? fields.uploadId[0] : fields.uploadId;
    const chunkIndex = parseInt(Array.isArray(fields.chunkIndex) ? fields.chunkIndex[0] : fields.chunkIndex || '0');
    const checksum = Array.isArray(fields.checksum) ? fields.checksum[0] : fields.checksum;
    const chunk = Array.isArray(files.chunk) ? files.chunk[0] : files.chunk;

    if (!uploadId || !chunk || !checksum) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const chunkData = await fs.readFile(chunk.filepath);
    const result = await UploadManager.uploadChunk(uploadId, chunkIndex, chunkData, checksum);

    res.status(200).json(result);
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
}
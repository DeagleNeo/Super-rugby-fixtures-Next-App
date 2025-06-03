const { UploadManager } = require('../../../utils/uploadManager');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID is required' });
    }

    const success = UploadManager.cancelUpload(uploadId);
    res.status(200).json({ success });
  } catch (error) {
    console.error('Cancel upload error:', error);
    res.status(500).json({ error: 'Failed to cancel upload' });
  }
}
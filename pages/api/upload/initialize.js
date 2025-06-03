const { UploadManager } = require('../../../utils/uploadManager');
const { FileValidator } = require('../../../utils/fileValidation');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileSize, mimeType } = req.body;

    // Validate file type
    if (!FileValidator.validateMimeType(mimeType) || !FileValidator.validateFileExtension(fileName)) {
      return res.status(400).json({ error: 'Only CSV files are allowed' });
    }

    // File size limit (100MB)
    if (fileSize > 100 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB' });
    }

    const chunkSize = 1024 * 1024; // 1MB chunks
    const uploadId = await UploadManager.initializeUpload(fileName, fileSize, chunkSize);

    res.status(200).json({
      uploadId,
      chunkSize,
      totalChunks: Math.ceil(fileSize / chunkSize)
    });
  } catch (error) {
    console.error('Initialize upload error:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
}
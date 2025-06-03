const { promises: fs } = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FileValidator } = require('./fileValidation');

class UploadManager {
  static sessions = new Map();
  static UPLOAD_DIR = './uploads/temp';
  static SESSION_DIR = './uploads/sessions';
  static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  static cleanupTimers = new Map();

  // Initialize session directory
  static async init() {
    await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    await fs.mkdir(this.SESSION_DIR, { recursive: true });
    // console.log('UploadManager initialized');
  }

  // Save session to disk for persistence
  static async saveSessionToDisk(uploadId, session) {
    try {
      const sessionFile = path.join(this.SESSION_DIR, `${uploadId}.json`);
      const sessionData = {
        uploadId: session.uploadId,
        fileName: session.fileName,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks,
        uploadedChunks: Array.from(session.uploadedChunks),
        filePath: session.filePath,
        createdAt: session.createdAt.toISOString(),
        lastActivity: session.lastActivity.toISOString()
      };
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
      // console.log(`Session saved to disk: ${uploadId}`);
    } catch (error) {
      console.error(`Failed to save session to disk: ${uploadId}`, error);
    }
  }

  // Load session from disk
  static async loadSessionFromDisk(uploadId) {
    try {
      const sessionFile = path.join(this.SESSION_DIR, `${uploadId}.json`);
      const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf8'));
      
      const session = {
        uploadId: sessionData.uploadId,
        fileName: sessionData.fileName,
        fileSize: sessionData.fileSize,
        totalChunks: sessionData.totalChunks,
        uploadedChunks: new Set(sessionData.uploadedChunks),
        filePath: sessionData.filePath,
        createdAt: new Date(sessionData.createdAt),
        lastActivity: new Date(sessionData.lastActivity)
      };
      
      this.sessions.set(uploadId, session);
      // console.log(`Session loaded from disk: ${uploadId}`);
      return session;
    } catch (error) {
      console.error(`Failed to load session from disk: ${uploadId}`, error);
      return null;
    }
  }

  // Remove session file from disk
  static async removeSessionFromDisk(uploadId) {
    try {
      const sessionFile = path.join(this.SESSION_DIR, `${uploadId}.json`);
      await fs.unlink(sessionFile);
      // console.log(`Session file removed from disk: ${uploadId}`);
    } catch (error) {
      // Ignore error if file doesn't exist
    }
  }

  // Get or restore session
  static async getSession(uploadId) {
    let session = this.sessions.get(uploadId);
    
    if (!session) {
      // console.log(`Session not in memory, attempting to load from disk: ${uploadId}`);
      session = await this.loadSessionFromDisk(uploadId);
      
      if (session) {
        // Check if session has expired
        const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();
        if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
          // console.log(`Loaded session has expired: ${uploadId}`);
          await this.cleanupSession(uploadId);
          return null;
        }
        
        // Reschedule cleanup for restored session
        this.scheduleCleanup(uploadId);
      }
    }
    
    return session;
  }

  static async initializeUpload(fileName, fileSize, chunkSize) {
    await this.init(); // Ensure directories exist
    
    const uploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(fileSize / chunkSize);
    
    const session = {
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      uploadedChunks: new Set(),
      filePath: path.join(this.UPLOAD_DIR, `${uploadId}_${fileName}`),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(uploadId, session);
    await this.saveSessionToDisk(uploadId, session);
    this.scheduleCleanup(uploadId);
    
    // console.log(`Upload session created: ${uploadId}, Total chunks: ${totalChunks}`);
    // console.log(`Total active sessions after creation: ${this.sessions.size}`);
    return uploadId;
  }

  static async uploadChunk(uploadId, chunkIndex, chunkData, expectedChecksum) {
    // console.log(`Upload chunk request - ID: ${uploadId}, Chunk: ${chunkIndex}`);
    // console.log(`Active sessions in memory: ${Array.from(this.sessions.keys())}`);
    
    const session = await this.getSession(uploadId);
    
    if (!session) {
      console.error(`Upload session not found: ${uploadId}`);
      return { 
        success: false, 
        progress: 0, 
        error: 'Upload session not found',
        uploadId
      };
    }

    // Verify chunk integrity
    const actualChecksum = FileValidator.generateChecksum(chunkData);
    if (actualChecksum !== expectedChecksum) {
      console.error(`Chunk integrity check failed: ${uploadId}, chunk ${chunkIndex}`);
      return { success: false, progress: 0, error: 'Chunk integrity check failed' };
    }

    try {
      // Write chunk to temporary file
      const chunkPath = `${session.filePath}.chunk.${chunkIndex}`;
      await fs.writeFile(chunkPath, chunkData);
      
      session.uploadedChunks.add(chunkIndex);
      session.lastActivity = new Date();
      
      // Save updated session to disk
      await this.saveSessionToDisk(uploadId, session);
      
      // Reset cleanup timer since there's activity
      this.resetCleanupTimer(uploadId);
      
      const progress = (session.uploadedChunks.size / session.totalChunks) * 100;
      
      // console.log(`Chunk uploaded successfully: ${uploadId}, progress: ${progress.toFixed(2)}%`);
      return { success: true, progress };
    } catch (error) {
      console.error(`Failed to write chunk: ${uploadId}, chunk ${chunkIndex}`, error);
      return { success: false, progress: 0, error: 'Failed to write chunk' };
    }
  }

  static async finalizeUpload(uploadId) {
    // console.log(`=== FINALIZING UPLOAD: ${uploadId} ===`);
    // console.log(`Active sessions in memory: ${Array.from(this.sessions.keys())}`);
    // console.log(`Total active sessions: ${this.sessions.size}`);
    
    const session = await this.getSession(uploadId);
    
    if (!session) {
      console.error(`Upload session not found during finalization: ${uploadId}`);
      console.error(`Available sessions in memory: ${Array.from(this.sessions.keys())}`);
      console.error(`Cleanup timers active: ${Array.from(this.cleanupTimers.keys())}`);
      
      // Try to list session files on disk
      try {
        const sessionFiles = await fs.readdir(this.SESSION_DIR);
        console.error(`Session files on disk: ${sessionFiles}`);
      } catch (error) {
        console.error('Could not read session directory:', error.message);
      }
      
      return { success: false, error: 'Upload session not found' };
    }

    // Prevent cleanup during finalization
    this.clearCleanupTimer(uploadId);
    // console.log(`Cleared cleanup timer for session during finalization: ${uploadId}`);

    if (session.uploadedChunks.size !== session.totalChunks) {
      const missingChunks = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.uploadedChunks.has(i)) {
          missingChunks.push(i);
        }
      }
      console.error(`Missing chunks for ${uploadId}:`, missingChunks);
      
      // Reschedule cleanup since finalization failed
      this.scheduleCleanup(uploadId);
      return { 
        success: false, 
        error: `Missing chunks: ${missingChunks.join(', ')}`,
        missingChunks 
      };
    }

    try {
      // Combine chunks
      const writeStream = await fs.open(session.filePath, 'w');
      
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = `${session.filePath}.chunk.${i}`;
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.write(chunkData);
        await fs.unlink(chunkPath); // Clean up chunk
      }
      
      await writeStream.close();
      
      // Validate the complete file
      const isValid = await this.validateCompleteFile(session.filePath, session.fileName);
      
      if (!isValid.success) {
        await fs.unlink(session.filePath);
        await this.cleanupSession(uploadId);
        return { success: false, error: isValid.error };
      }
      
      // Move to final location
      const finalDir = './uploads/processed';
      await fs.mkdir(finalDir, { recursive: true });
      const finalPath = path.join(finalDir, `${Date.now()}_${session.fileName}`);
      await fs.rename(session.filePath, finalPath);
      
      // Clean up session
      await this.cleanupSession(uploadId);
      
      // console.log(`Upload finalized successfully: ${uploadId} -> ${finalPath}`);
      return { 
        success: true, 
        filePath: finalPath,
        fileName: session.fileName
      };
    } catch (error) {
      console.error(`Failed to finalize upload: ${uploadId}`, error);
      return { success: false, error: 'Failed to finalize upload' };
    }
  }

  static async validateCompleteFile(filePath, fileName) {
    // File extension check
    if (!FileValidator.validateFileExtension(fileName)) {
      return { success: false, error: 'Invalid file extension' };
    }

    // File signature validation
    const isValidSignature = await FileValidator.validateFileSignature(filePath);
    if (!isValidSignature) {
      return { success: false, error: 'Invalid file format or suspicious content detected' };
    }

    // Malicious content scan
    const isClean = await FileValidator.scanForMaliciousContent(filePath);
    if (!isClean) {
      return { success: false, error: 'Malicious content detected' };
    }

    return { success: true };
  }

  static async getUploadProgress(uploadId) {
    const session = await this.getSession(uploadId);
    if (!session) {
      console.warn(`Session not found for progress check: ${uploadId}`);
      return 0;
    }
    return (session.uploadedChunks.size / session.totalChunks) * 100;
  }

  static async getSessionInfo(uploadId) {
    const session = await this.getSession(uploadId);
    if (!session) return null;
    
    return {
      uploadId: session.uploadId,
      fileName: session.fileName,
      progress: (session.uploadedChunks.size / session.totalChunks) * 100,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks.size,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      timeRemaining: this.SESSION_TIMEOUT - (Date.now() - session.lastActivity.getTime())
    };
  }

  static async cancelUpload(uploadId) {
    const session = await this.getSession(uploadId);
    if (!session) {
      console.warn(`Cannot cancel upload - session not found: ${uploadId}`);
      return false;
    }

    // console.log(`Cancelling upload: ${uploadId}`);
    await this.cleanupSession(uploadId);
    return true;
  }

  static scheduleCleanup(uploadId) {
    // Clear existing timer if any
    this.clearCleanupTimer(uploadId);
    
    const timer = setTimeout(async () => {
      const session = await this.getSession(uploadId);
      if (session) {
        const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();
        // console.log(`Checking session ${uploadId} for cleanup - inactive for ${timeSinceLastActivity}ms (timeout: ${this.SESSION_TIMEOUT}ms)`);
        
        if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
          // console.log(`Cleaning up expired session: ${uploadId}`);
          await this.cleanupSession(uploadId);
        } else {
          // console.log(`Session ${uploadId} still active, rescheduling cleanup`);
          this.scheduleCleanup(uploadId);
        }
      } else {
        // console.log(`Session ${uploadId} already cleaned up`);
      }
    }, this.SESSION_TIMEOUT);
    
    this.cleanupTimers.set(uploadId, timer);
    // console.log(`Scheduled cleanup for session: ${uploadId} in ${this.SESSION_TIMEOUT}ms`);
  }

  static resetCleanupTimer(uploadId) {
    this.scheduleCleanup(uploadId);
  }

  static clearCleanupTimer(uploadId) {
    const timer = this.cleanupTimers.get(uploadId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(uploadId);
    }
  }

  static async cleanupSession(uploadId) {
    const session = this.sessions.get(uploadId);
    // console.log(`Cleaning up session: ${uploadId}`);

    try {
      if (session) {
        // Remove partial file
        await fs.unlink(session.filePath).catch(() => {});
        
        // Remove chunks
        for (let i = 0; i < session.totalChunks; i++) {
          const chunkPath = `${session.filePath}.chunk.${i}`;
          await fs.unlink(chunkPath).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Remove from memory and disk
    this.sessions.delete(uploadId);
    this.clearCleanupTimer(uploadId);
    await this.removeSessionFromDisk(uploadId);
  }

  // Utility methods for debugging
  static getActiveSessions() {
    return Array.from(this.sessions.keys());
  }

  static getSessionCount() {
    return this.sessions.size;
  }

  static async verifySessionExists(uploadId) {
    const inMemory = this.sessions.has(uploadId);
    const session = await this.getSession(uploadId);
    
    // console.log(`=== SESSION VERIFICATION FOR ${uploadId} ===`);
    // console.log(`- In memory: ${inMemory}`);
    // console.log(`- Session data: ${session ? 'present' : 'missing'}`);
    // console.log(`- All sessions in memory: ${Array.from(this.sessions.keys())}`);
    
    if (session) {
      // console.log(`- Created: ${session.createdAt}`);
      // console.log(`- Last activity: ${session.lastActivity}`);
      // console.log(`- Chunks uploaded: ${session.uploadedChunks.size}/${session.totalChunks}`);
      // console.log(`- Time since last activity: ${Date.now() - session.lastActivity.getTime()}ms`);
    }
    
    try {
      const sessionFiles = await fs.readdir(this.SESSION_DIR);
      // console.log(`- Session files on disk: ${sessionFiles}`);
    } catch (error) {
      // console.log(`- Could not read session directory: ${error.message}`);
    }
    
    return !!session;
  }

  static async cleanupAllSessions() {
    // console.log(`Cleaning up all ${this.sessions.size} sessions`);
    const uploadIds = Array.from(this.sessions.keys());
    for (const uploadId of uploadIds) {
      await this.cleanupSession(uploadId);
    }
  }
}

module.exports = { UploadManager };
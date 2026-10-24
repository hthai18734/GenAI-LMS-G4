const mongoose = require('mongoose');
const VideoProgress = require('../../../../../model/learning/VideoProgress');

class VideoProgressRepository {
  async findByStudentAndVideo(studentId, videoId) {
    if (!mongoose.isValidObjectId(studentId) || !videoId) return null;
    return VideoProgress.findOne({ studentId, videoId }).exec();
  }

  async findCompletedByStudentAndLesson(studentId, lessonId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(lessonId)) return null;
    return VideoProgress.findOne({ studentId, lessonId, completed: true }).exec();
  }

  async saveProgress(data) {
    const { studentId, videoId, lessonId, courseId } = data;
    return VideoProgress.findOneAndUpdate(
      { studentId, videoId },
      {
        $set: {
          lessonId,
          courseId,
          durationSec: data.durationSec,
          watchedSegments: data.watchedSegments,
          watchedSeconds: data.watchedSeconds,
          watchedPercent: data.watchedPercent,
          resumePositionSec: data.resumePositionSec,
          completed: data.completed,
          completedAt: data.completedAt,
          lastSeq: data.lastSeq,
          sessionId: data.sessionId,
          lastHeartbeatAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new VideoProgressRepository();

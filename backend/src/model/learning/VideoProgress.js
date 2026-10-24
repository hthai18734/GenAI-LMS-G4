const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  videoId: { type: String, required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  durationSec: { type: Number, default: 0 },
  watchedSegments: [
    {
      startSec: { type: Number, required: true },
      endSec: { type: Number, required: true },
    },
  ],
  watchedSeconds: { type: Number, default: 0 },
  watchedPercent: { type: Number, default: 0 },
  resumePositionSec: { type: Number, default: 0 },
  completed: { type: Boolean, default: false, index: true },
  completedAt: { type: Date, default: null },
  lastSeq: { type: Number, default: 0 },
  sessionId: { type: String, default: null },
  lastHeartbeatAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

videoProgressSchema.index({ studentId: 1, videoId: 1 }, { unique: true });
videoProgressSchema.index({ studentId: 1, lessonId: 1 });

const VideoProgress = mongoose.models.VideoProgress || mongoose.model('VideoProgress', videoProgressSchema);

module.exports = VideoProgress;

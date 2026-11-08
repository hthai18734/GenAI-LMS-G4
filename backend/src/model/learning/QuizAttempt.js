const mongoose = require('mongoose');

const ATTEMPT_STATUSES = ['in_progress', 'submitted'];

const questionSnapshotSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  questionText: { type: String, default: '' },
  answer: { type: String, default: null },
  isCorrect: { type: Boolean, required: true },
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null, index: true },
  status: { type: String, enum: ATTEMPT_STATUSES, default: 'in_progress', index: true },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  answers: { type: [answerSchema], default: [] },
  questionsSnapshot: { type: [questionSnapshotSchema], default: [] },
  score: { type: Number, default: null, min: 0, max: 100 },
  passed: { type: Boolean, default: null },
}, { timestamps: true, versionKey: false });

quizAttemptSchema.index({ userId: 1, quizId: 1, createdAt: -1 });

const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema);
QuizAttempt.ATTEMPT_STATUSES = ATTEMPT_STATUSES;

module.exports = QuizAttempt;

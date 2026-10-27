const test = require('node:test');
const assert = require('node:assert/strict');
const CreateAssignmentDTO = require('../../src/dto/assignment/CreateAssignmentDTO');
const LessonDTO = require('../../src/dto/course/LessonDTO');
const CreateQuizDTO = require('../../src/dto/quiz/CreateQuizDTO');
const UpdateQuizDTO = require('../../src/dto/quiz/UpdateQuizDTO');
const CreateQuestionDTO = require('../../src/dto/question/CreateQuestionDTO');
const UpdateQuestionDTO = require('../../src/dto/question/UpdateQuestionDTO');
const SubmitQuizDTO = require('../../src/dto/student/SubmitQuizDTO');
const CreateCategoryDTO = require('../../src/dto/category/CreateCategoryDTO');
const UpdateCategoryDTO = require('../../src/dto/category/UpdateCategoryDTO');
const RejectCourseDTO = require('../../src/dto/course/RejectCourseDTO');
const ReviewWriteDTO = require('../../src/dto/review/ReviewWriteDTO');
const UpdateProfileDTO = require('../../src/dto/student/UpdateProfileDTO');
const UpdateNotificationPreferencesDTO = require('../../src/dto/student/UpdateNotificationPreferencesDTO');
const UserWriteDTO = require('../../src/dto/admin/UserWriteDTO');
const RejectTeacherApplicationDTO = require('../../src/dto/admin/RejectTeacherApplicationDTO');
const CatalogQueryDTO = require('../../src/dto/student/CatalogQueryDTO');
const BrowseCoursesQueryDTO = require('../../src/dto/public/BrowseCoursesQueryDTO');
const HomepageQueryDTO = require('../../src/dto/public/HomepageQueryDTO');
const SearchCoursesQueryDTO = require('../../src/dto/public/SearchCoursesQueryDTO');
const FilterCoursesQueryDTO = require('../../src/dto/public/FilterCoursesQueryDTO');
const ReviewQueryDTO = require('../../src/dto/review/ReviewQueryDTO');
const UserQueryDTO = require('../../src/dto/admin/UserQueryDTO');
const TeacherApplicationQueryDTO = require('../../src/dto/admin/TeacherApplicationQueryDTO');

test('write DTOs convert malformed JSON payloads into validation errors instead of exceptions', () => {
  for (const DTO of [
    CreateAssignmentDTO, LessonDTO, CreateQuizDTO, UpdateQuizDTO, CreateQuestionDTO,
    UpdateQuestionDTO, SubmitQuizDTO, CreateCategoryDTO, UpdateCategoryDTO,
    RejectCourseDTO, ReviewWriteDTO, UpdateProfileDTO, UpdateNotificationPreferencesDTO,
    UserWriteDTO,
  ]) {
    assert.doesNotThrow(() => new DTO(null).validate());
    assert.ok(new DTO(null).validate().payload, `${DTO.name} must reject null`);
    assert.ok(new DTO([]).validate().payload, `${DTO.name} must reject arrays`);
  }

  const rejectTeacher = new RejectTeacherApplicationDTO({ id: 'app-1' }, null);
  assert.ok(rejectTeacher.validate().payload);
});

test('lesson and quiz DTOs reject boolean and collection numeric coercion', () => {
  assert.ok(new LessonDTO({ title: 'Lesson', content: 'Body', order: true }).validate().order);
  assert.ok(new LessonDTO({ duration: [] }, { partial: true }).validate().duration);
  assert.ok(new CreateQuizDTO({
    title: 'Quiz',
    timeLimit: true,
    passingScore: [],
    attemptLimit: {},
  }).validate().timeLimit);
  assert.ok(new UpdateQuizDTO({ passingScore: false }).validate().passingScore);
});

test('query DTOs reject malformed containers and collection coercion', () => {
  for (const DTO of [
    CatalogQueryDTO, BrowseCoursesQueryDTO, HomepageQueryDTO, SearchCoursesQueryDTO,
    FilterCoursesQueryDTO, ReviewQueryDTO, UserQueryDTO, TeacherApplicationQueryDTO,
  ]) {
    assert.doesNotThrow(() => new DTO(null).validate());
    assert.ok(new DTO(null).validate().payload, `${DTO.name} must reject null`);
  }

  assert.ok(new CatalogQueryDTO({ page: ['1'] }).validate().page);
  assert.ok(new BrowseCoursesQueryDTO({ limit: ['10'] }).validate().limit);
  assert.ok(new HomepageQueryDTO({ limit: true }).validate().limit);
  assert.ok(new SearchCoursesQueryDTO({ q: 'node', page: {} }).validate().page);
  assert.ok(new FilterCoursesQueryDTO({ minPrice: [] }).validate().minPrice);
  assert.ok(new ReviewQueryDTO({ limit: ['10'] }).validate().limit);
  assert.ok(new UserQueryDTO({ page: false }).validate().page);
});

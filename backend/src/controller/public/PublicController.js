const ResponseUtil = require('../../utils/common/ResponseUtil');
const { publicCatalogService: PublicCatalogService } = require('../../composition/services');
const HomepageQueryDTO = require('../../dto/public/HomepageQueryDTO');
const BrowseCoursesQueryDTO = require('../../dto/public/BrowseCoursesQueryDTO');
const SearchCoursesQueryDTO = require('../../dto/public/SearchCoursesQueryDTO');
const FilterCoursesQueryDTO = require('../../dto/public/FilterCoursesQueryDTO');
const CourseDetailQueryDTO = require('../../dto/public/CourseDetailQueryDTO');
const TeacherProfileQueryDTO = require('../../dto/public/TeacherProfileQueryDTO');
const { handleError } = require('../common/ControllerUtil');

class PublicController {
  validationError(res, errors, defaultMessage = 'Validation failed.') {
    return ResponseUtil.error(res, { status: 400, message: Object.values(errors)[0] || defaultMessage, errors });
  }
  async execute(res, next, action, message) {
    try { return ResponseUtil.success(res, { message, data: await action() }); }
    catch (error) { return handleError(res, next, error); }
  }
  parse(res, Dto, input) {
    const dto = new Dto(input);
    const errors = dto.validate();
    if (Object.keys(errors).length) { this.validationError(res, errors); return null; }
    return dto.toObject();
  }
  async getHomepage(req, res, next) {
    const input = this.parse(res, HomepageQueryDTO, req.query);
    if (!input) return undefined;
    return this.execute(res, next, () => PublicCatalogService.getHomepage(input), 'Homepage data retrieved successfully.');
  }
  async browseCourses(req, res, next) {
    const input = this.parse(res, BrowseCoursesQueryDTO, req.query);
    if (!input) return undefined;
    return this.execute(res, next, () => PublicCatalogService.browse(input), 'Courses retrieved successfully.');
  }
  async searchCourses(req, res, next) {
    const input = this.parse(res, SearchCoursesQueryDTO, req.query);
    if (!input) return undefined;
    try {
      const result = await PublicCatalogService.search(input);
      return ResponseUtil.success(res, { message: result.message, data: result.data });
    } catch (error) { return handleError(res, next, error); }
  }
  validateKeyword(keyword) {
    const dto = new SearchCoursesQueryDTO({ q: keyword });
    return dto.validate().keyword || null;
  }
  async filterAndSortCourses(req, res, next) {
    const input = this.parse(res, FilterCoursesQueryDTO, req.query);
    if (!input) return undefined;
    return this.execute(res, next, () => PublicCatalogService.filter(input), 'Filtered courses retrieved successfully.');
  }
  validateFilterParams(params = {}) { return Object.values(new FilterCoursesQueryDTO(params).validate())[0] || null; }
  async getCourseDetail(req, res, next) {
    const input = this.parse(res, CourseDetailQueryDTO, req.params);
    if (!input) return undefined;
    return this.execute(res, next, () => PublicCatalogService.getCourseDetail(input.courseId), 'Course details retrieved successfully.');
  }
  async getPublicCategories(req, res, next) {
    return this.execute(res, next, () => PublicCatalogService.getCategories(), 'Categories retrieved successfully.');
  }
  async getPublicTeacherProfile(req, res, next) {
    const input = this.parse(res, TeacherProfileQueryDTO, req.params);
    if (!input) return undefined;
    return this.execute(res, next, () => PublicCatalogService.getTeacherProfile(input.teacherId), 'Teacher profile retrieved successfully.');
  }
}
module.exports = new PublicController();

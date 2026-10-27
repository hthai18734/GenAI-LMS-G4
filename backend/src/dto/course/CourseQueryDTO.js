/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
const { COURSE_STATUSES } = require('../../domain/learning/CourseStatus');
const { unknownFields, isObjectPayload } = require('../common/DTOUtil');

const ALLOWED_FIELDS = ['search', 'status', 'category', 'page', 'limit', 'sortBy', 'sortOrder'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];
const MAX_PAGE = 1000000;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 100;

class CourseQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
  }
  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    const unknown = unknownFields(this.query, ALLOWED_FIELDS);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (this.query.page !== undefined && (typeof this.query.page !== 'string' || !/^\d+$/.test(this.query.page) || !Number.isSafeInteger(Number(this.query.page)) || Number(this.query.page) < 1 || Number(this.query.page) > MAX_PAGE)) errors.page = `Page must be an integer between 1 and ${MAX_PAGE}.`;
    if (this.query.limit !== undefined && (typeof this.query.limit !== 'string' || !/^\d+$/.test(this.query.limit) || !Number.isSafeInteger(Number(this.query.limit)) || Number(this.query.limit) < 1 || Number(this.query.limit) > MAX_LIMIT)) errors.limit = `Limit must be an integer between 1 and ${MAX_LIMIT}.`;
    if (this.query.search !== undefined && (typeof this.query.search !== 'string' || this.query.search.trim().length > MAX_SEARCH_LENGTH)) errors.search = `Search must be a string of at most ${MAX_SEARCH_LENGTH} characters.`;
    if (this.query.category !== undefined && (typeof this.query.category !== 'string' || this.query.category.trim().length > MAX_CATEGORY_LENGTH)) errors.category = `Category must be a string of at most ${MAX_CATEGORY_LENGTH} characters.`;
    if (this.query.status !== undefined && (typeof this.query.status !== 'string' || !COURSE_STATUSES.includes(this.query.status))) errors.status = 'Course status is invalid.';
    if (this.query.sortOrder !== undefined && (typeof this.query.sortOrder !== 'string' || !['asc', 'desc'].includes(this.query.sortOrder))) errors.sortOrder = 'Sort order must be asc or desc.';
    if (this.query.sortBy !== undefined && (typeof this.query.sortBy !== 'string' || !SORT_FIELDS.includes(this.query.sortBy))) errors.sortBy = 'Sort field is invalid.';
    return errors;
  }
  toObject() {
    return {
      search: typeof this.query.search === 'string' ? this.query.search.trim() : '',
      status: this.query.status || '',
      category: typeof this.query.category === 'string' ? this.query.category.trim() : '',
      page: Number(this.query.page) || 1,
      limit: Math.min(Number(this.query.limit) || 20, 100),
      sortBy: this.query.sortBy || 'updatedAt',
      sortOrder: this.query.sortOrder || 'desc',
    };
  }
}
module.exports = CourseQueryDTO;

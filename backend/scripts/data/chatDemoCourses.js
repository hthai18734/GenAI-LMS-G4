module.exports = [
  {
    slug: 'chat-demo-javascript',
    title: '[Chat Demo] JavaScript Fundamentals',
    description: 'Sample learning data for testing AI chat with variables, arrays, and asynchronous programming.',
    lessons: [
      {
        title: 'Variables, Data Types, and Comparisons',
        duration: 15,
        content: `OBJECTIVES
Distinguish let from const, identify common data types, and use strict comparison.

CONTENT
Use let for a variable that must be reassigned. const prevents reassignment of the variable, but referenced object properties may still change. For example, const student = { name: 'Alex' }; student.name = 'Sam' is valid, while student = {} causes an error.
Common data types include string, number, boolean, undefined, null, and object. undefined usually means a variable has not been assigned; null explicitly represents no value.
The === operator compares both type and value without coercion. Therefore, 5 === '5' is false while 5 == '5' is true.

EXAMPLE
A class has 24 learners and tuition is 150,000 VND per learner. Total tuition is 3,600,000 VND. After two learners join, the count becomes 26.

REMEMBER
Prefer const when reassignment is unnecessary, use let when values must change, and prefer === to avoid unintended coercion.

REVIEW
Why does changing student.name not violate const? What is the new tuition total after two learners join?`,
      },
      {
        title: 'Processing Lists with map, filter, and reduce',
        duration: 20,
        content: `OBJECTIVES
Choose the correct array method and calculate results from sample data.

CONTENT
map creates a new array by transforming every element and preserves its length. filter creates an array containing elements that satisfy a condition. reduce combines an array into one result such as a total, object, or grouped structure. These methods do not directly mutate the original array, although an unsafe callback can still mutate referenced objects.

DATA
const scores = [6, 8, 9, 4, 10];
scores.filter(score => score >= 8) returns [8, 9, 10], or 60% of learners.
scores.map(score => score * 10) returns [60, 80, 90, 40, 100].
scores.reduce((sum, score) => sum + score, 0) returns 37, so the average is 7.4.

COMMON ERROR
Omitting the reduce initial value can fail on an empty array. Check the array length before dividing to calculate an average.

REVIEW
Compare map with filter. How many learners pass if the threshold changes to 9?`,
      },
      {
        title: 'Promises, async/await, and API Error Handling',
        duration: 20,
        content: `OBJECTIVES
Understand asynchronous work and handle API failures.

CONTENT
A Promise represents a result that may arrive later and can be pending, fulfilled, or rejected. An async function always returns a Promise. await pauses that async function until a Promise settles without blocking the whole JavaScript runtime.
Example: const response = await fetch('/api/courses'); if (!response.ok) throw new Error('Unable to load courses'); const body = await response.json();
fetch does not reject only because an HTTP response is 404 or 500, so check response.ok. Use try/catch to display errors and finally to clear loading state.

SCENARIO
The application sends a question to model A and receives HTTP 429. It tries model B once and receives 200. If every model is over quota, tell the user to try later. Never retry forever or switch models to hide an invalid API key.

REMEMBER
Distinguish network failures from HTTP errors, preserve the question during retry, and avoid saving duplicate answers.

REVIEW
Why does a 404 response not necessarily enter catch? Which state should finally update?`,
      },
    ],
  },
  {
    slug: 'chat-demo-database',
    title: '[Chat Demo] Databases and Authorization',
    description: 'Sample learning data about MongoDB, enrollment, and chat-history access control.',
    lessons: [
      {
        title: 'Documents, Collections, and Data Relationships',
        duration: 15,
        content: `OBJECTIVES
Understand how MongoDB organizes courses and lessons.

CONTENT
MongoDB stores documents in collections. A document can contain fields such as title, content, and courseId, while _id identifies it. The courses collection stores courses and lessons stores lessons. Each lesson references its course through courseId.
To list lessons, filter by courseId and sort by order ascending. References keep related data in separate documents. Embedded data is suitable when it is small, bounded, and usually read together.

EXAMPLE
Course C01 has L01 at order 2, L02 at order 1, and L03 at order 3. The correct display order is L02, L01, L03.

REMEMBER
A course title is not a reliable identifier; use _id and verify that each lesson belongs to the requested course.

REVIEW
Why should records not be joined by title alone? Give the lesson order for C01.`,
      },
      {
        title: 'Authentication, Authorization, and Enrollment',
        duration: 20,
        content: `OBJECTIVES
Distinguish authentication, authorization, and resource ownership.

CONTENT
Authentication establishes who the user is, usually through a valid token. Authorization determines what that user may do with a specific resource. Checking a token without checking ownership is insufficient.
In this LMS, a student can read lessons only when the course enrollment is active or completed. A dropped enrollment grants no access. A teacher can read lessons in courses they own, and an administrator can inspect content through administrative permissions.
The backend must derive roles from the authenticated account and never trust a role supplied by the browser.

SCENARIO
Alex has an active enrollment in C01, Blake is not enrolled, Casey completed C01, and Drew dropped C01. Alex and Casey may read it; Blake and Drew may not.

REMEMBER
Check permissions on every request because access can change. Knowing a lesson ID does not grant permission to read it.

REVIEW
Why can Casey still read the course? What must the backend do if Blake sends role=admin?`,
      },
      {
        title: 'Protecting Chat History and Designing Indexes',
        duration: 20,
        content: `OBJECTIVES
Design queries that allow each user to read only their own chat history.

CONTENT
A conversation stores its owner in ownerId. Read it by filtering both _id and ownerId: findOne({ _id: conversationId, ownerId: currentUserId }). Filtering by conversationId alone lets another user probe IDs for data they do not own.
Attachments must include ownerId and conversationId and must not be stored in a public directory. Deleting a conversation should delete only its related documents.
An ownerId index supports account history queries. Choose compound indexes from real filters and sorts; excessive indexes increase write and storage costs.

EXAMPLE
Alex owns chats A and B while Blake owns chat C. Even if Blake knows A's ID, a query with Blake's ownerId cannot return A. Administrators also need an explicit policy before reading private history.

REVIEW
Write the query that protects chat A. Why does hiding a frontend button not replace backend authorization?`,
      },
    ],
  },
];

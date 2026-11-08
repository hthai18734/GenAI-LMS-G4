import { Link } from 'react-router-dom';

export default function CourseAssignments({ courseId, assignments }) {
  return (
    <section className="profile-card-panel course-assessment-card course-assignments" aria-labelledby="course-assignments-title">
      <header>
        <h3 id="course-assignments-title">Course Assignments</h3>
        <p>Edit assignment instructions or open submissions to review and grade student work.</p>
      </header>
      {assignments.length ? (
        <ul className="course-assessment-list" aria-label="Course assignments">
          {assignments.map(assignment => (
            <li key={assignment._id}>
              <h4>{assignment.title}</h4>
              <div className="assessment-actions">
                <Link className="assessment-button" aria-label={`Edit assignment: ${assignment.title}`} to={`/teacher/assignments/${assignment._id}/edit?courseId=${courseId}`}>Edit assignment</Link>
                <Link className="assessment-button assessment-button-primary" aria-label={`View submissions: ${assignment.title}`} to={`/teacher/assignments/${assignment._id}/submissions`}>View submissions</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="course-assessment-empty">No assignments yet. Create your first assignment to get started.</p>}
      <footer>
        <Link className="assessment-button" to={`/teacher/assignments/new?courseId=${courseId}`}>Create assignment</Link>
        <Link className="assessment-button" to={`/teacher/courses/${courseId}/gradebook`}>Open Course Gradebook <span aria-hidden="true">→</span></Link>
      </footer>
    </section>
  );
}

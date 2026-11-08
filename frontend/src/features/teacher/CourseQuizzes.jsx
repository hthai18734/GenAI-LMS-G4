import { Link } from 'react-router-dom';

export default function CourseQuizzes({ courseId, quizzes }) {
  return (
    <section className="profile-card-panel course-assessment-card course-quizzes" aria-labelledby="course-quizzes-title">
      <header>
        <h3 id="course-quizzes-title">Course Quizzes</h3>
        <p>Edit quiz questions, instructions and passing requirements.</p>
      </header>
      {quizzes.length ? (
        <ul className="course-assessment-list" aria-label="Course quizzes">
          {quizzes.map(quiz => (
            <li key={quiz._id}>
              <h4>{quiz.title}</h4>
              <div className="assessment-actions">
                <Link className="assessment-button" aria-label={`Edit quiz: ${quiz.title}`} to={`/teacher/quizzes/${quiz._id}`}>Edit quiz</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="course-assessment-empty">No quizzes yet. Create your first quiz to get started.</p>}
      <footer>
        <Link className="assessment-button" to={`/teacher/quizzes/new?courseId=${courseId}`}>Create quiz</Link>
      </footer>
    </section>
  );
}

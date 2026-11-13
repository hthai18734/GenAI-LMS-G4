export default function CourseProgressSummary({ progress, error, onRefresh }) {
  return <section className="student-progress-summary" aria-label="Course progress">
    <div className="student-summary-heading"><h3>Course progress</h3><button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>Refresh progress</button></div>
    {error ? <p role="alert">{error}</p> : !progress ? <p role="status">Loading progress…</p> : <>
      <p>{progress.completedRequired} of {progress.totalRequired} required activities completed · {progress.percentage}%</p>
      <progress max="100" value={progress.percentage} aria-label="Course completion percentage" />
      <div className="student-progress-types">{Object.entries(progress.byType || {}).map(([type, value]) => <div key={type}><strong>{{ LESSON: 'Lessons', QUIZ: 'Quizzes', ASSIGNMENT: 'Assignments' }[type] || type}</strong><span>{value.completed}/{value.total}</span></div>)}</div>
      <p>{progress.eligibleToComplete ? 'All requirements met. You can complete this course.' : progress.totalRequired ? 'Complete the remaining activities and meet their passing requirements.' : 'No required activities have been published yet.'}</p>
      {!!progress.remainingActivities?.length && <details><summary>Remaining requirements ({progress.remainingActivities.length})</summary><ul>{progress.remainingActivities.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
    </>}
  </section>;
}

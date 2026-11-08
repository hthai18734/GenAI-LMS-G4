import { groupCourseSections } from './learningModel.js';

export default function CourseSectionList({ sections, lessons, currentLesson, onSelect }) {
  return <nav aria-label="Course sections" className="student-sections">
    <h3>Course sections</h3>
    {groupCourseSections(sections, lessons).map(section => <details key={section.id} open>
      <summary><strong>{section.title}</strong> <small>{section.lessons.filter(l => l.status === 'completed').length}/{section.lessons.length} lessons completed</small></summary>
      {section.description && <p>{section.description}</p>}
      {!section.lessons.length && <p>No published lessons in this section yet.</p>}
      {section.lessons.map(lesson => <button type="button" key={lesson.id} aria-current={currentLesson?.id === lesson.id ? 'step' : undefined} onClick={() => onSelect(lesson)}>
        <span aria-hidden="true">{lesson.status === 'completed' ? '✓' : lesson.videoRef ? '▶' : '○'}</span>
        <span>{lesson.title}<small>{lesson.status === 'completed' ? 'Completed' : 'Not completed'}{lesson.duration ? ` · ${lesson.duration} min` : ''}</small></span>
      </button>)}
    </details>)}
    {!sections.length && !lessons.length && <p>No course sections available yet.</p>}
  </nav>;
}

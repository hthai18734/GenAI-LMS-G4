import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';
import { buildLessonQuizPlans, buildLessonQuizSource } from '../utils/quizSource';
import { buildLessonAssignmentPlans, buildLessonAssignmentSource } from '../utils/assignmentSource';

const tools = [
  ['course_outline', 'Plan a new course', 'Create modules and separate lessons from a course idea.'],
  ['lesson_content', 'Write a lesson', 'Turn a selected outline item or your notes into one complete lesson.'],
  ['quiz_questions', 'Build a quiz', 'Create a real quiz with questions, choices, answers, and explanations.'],
  ['supporting_content', 'Create an assignment or activity', 'Create work for students to complete after a lesson.'],
  ['material_summary', 'Create study notes', 'Turn teaching material into reusable revision notes that can be saved as a lesson.'],
];
const generateLabels = {
  course_outline: 'Generate course plan', lesson_content: 'Generate lesson content', quiz_questions: 'Generate quiz questions',
  supporting_content: 'Generate assignment or activity', material_summary: 'Generate study notes',
};
const languages = ['English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese', 'French', 'German', 'Spanish'];
const audiences = [
  'General learners',
  'Beginner students',
  'Intermediate students',
  'Advanced students',
  'University students',
  'Working professionals',
  'Teachers and instructors',
];
const firstHeading = (content, fallback) => content.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim().slice(0, 200) || fallback;
const plainText = markdown => markdown.replace(/```[\s\S]*?```/g, block => block.replace(/```[^\n]*\n?|```/g, ''))
  .replace(/^#{1,6}\s+/gm, '').replace(/\*\*|__|`/g, '').replace(/^[-*+]\s+/gm, '• ').replace(/\[(.*?)\]\([^)]*\)/g, '$1');

export default function TeacherAIContentPage() {
  const { addToast, confirmToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: 'course_outline', source: '', language: 'English', audience: 'General learners', instructions: '', count: 5, difficulty: 'medium', contentKind: 'assignment' });
  const [content, setContent] = useState('');
  const [artifact, setArtifact] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [quizScope, setQuizScope] = useState('lesson');
  const [quizBatch, setQuizBatch] = useState([]);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState('');
  const [assignmentScope, setAssignmentScope] = useState('lesson');
  const [assignmentBatch, setAssignmentBatch] = useState([]);
  const [activeAssignmentIndex, setActiveAssignmentIndex] = useState(0);
  const [target, setTarget] = useState({ courseId: '', lessonId: '', categoryId: '', title: '', lessonDuration: 60, publishLesson: true, timeLimit: 15, passingScore: 70, attemptLimit: 1 });
  const generatedContent = useRef('');
  const previewDocument = useRef(null);
  const selected = useMemo(() => tools.find(([key]) => key === form.type), [form.type]);
  const isAssignment = form.type === 'supporting_content' && form.contentKind === 'assignment';
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.type === 'number' ? Number(event.target.value) : event.target.value }));
  const updateTarget = event => {
    setSaveError('');
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setTarget(previous => ({ ...previous, [event.target.name]: value }));
  };
  const selectCourse = event => {
    const courseId = event.target.value;
    setLessons([]); setLessonsLoading(Boolean(courseId)); setSaveError('');
    setTarget(previous => ({ ...previous, courseId, lessonId: '', title: form.type === 'lesson_content' ? '' : previous.title }));
  };
  const selectLesson = event => {
    const lessonId = event.target.value;
    const lesson = lessons.find(item => (item._id || item.id) === lessonId);
    setSaveError('');
    setTarget(previous => ({ ...previous, lessonId, title: lesson?.title || '', lessonDuration: lesson?.duration || 60, publishLesson: lesson?.isPublished !== false }));
    if (lesson) setForm(previous => ({ ...previous, source: `Lesson: ${lesson.title}\nDuration: ${lesson.duration || 0} minutes\n\nCurrent outline or content:\n${lesson.content || '(No content yet)'}` }));
  };
  const discardGeneratedDraft = () => {
    setContent(''); setArtifact(null); setQuizBatch([]); setActiveQuizIndex(0); setAssignmentBatch([]); setActiveAssignmentIndex(0); generatedContent.current = ''; setSaveError(''); setSettingsChanged(false);
  };
  const confirmQuizSourceChange = () => !content || confirmToast('Change the quiz source? The current generated draft will be cleared.', { confirmLabel: 'Change source', cancelLabel: 'Keep draft' });
  const selectQuizCourse = async event => {
    const courseId = event.target.value;
    if (!await confirmQuizSourceChange()) return;
    setLessons([]); setLessonsLoading(Boolean(courseId)); setError(''); discardGeneratedDraft();
    setTarget(previous => ({ ...previous, courseId, lessonId: '', title: '' }));
    setForm(previous => ({ ...previous, source: '' }));
  };
  const selectQuizLesson = async event => {
    const selectedLessonId = event.target.value;
    if (!await confirmQuizSourceChange()) return;
    const lesson = lessons.find(item => (item._id || item.id) === selectedLessonId);
    const course = courses.find(item => (item._id || item.id) === target.courseId);
    discardGeneratedDraft(); setError('');
    setTarget(previous => ({ ...previous, lessonId: selectedLessonId, title: lesson ? `${lesson.title} Quiz` : '' }));
    setForm(previous => ({ ...previous, source: lesson ? buildLessonQuizSource(course, lesson) : '' }));
  };
  const selectQuizScope = async event => {
    const scope = event.target.value;
    if (!await confirmQuizSourceChange()) return;
    const course = courses.find(item => (item._id || item.id) === target.courseId);
    discardGeneratedDraft(); setError(''); setQuizScope(scope);
    setTarget(previous => ({ ...previous, lessonId: '', title: '' }));
    setForm(previous => ({ ...previous, source: scope === 'all_lessons' && course ? `${lessons.length} lessons will be processed separately from ${course.title}.` : '' }));
  };
  const selectAssignmentCourse = async event => {
    const courseId = event.target.value;
    if (!await confirmQuizSourceChange()) return;
    setLessons([]); setLessonsLoading(Boolean(courseId)); setError(''); discardGeneratedDraft(); setAssignmentBatch([]);
    setTarget(previous => ({ ...previous, courseId, lessonId: '', title: '' }));
    setForm(previous => ({ ...previous, source: '' }));
  };
  const selectAssignmentLesson = async event => {
    const selectedLessonId = event.target.value;
    if (!await confirmQuizSourceChange()) return;
    const lesson = lessons.find(item => (item._id || item.id) === selectedLessonId);
    const course = courses.find(item => (item._id || item.id) === target.courseId);
    discardGeneratedDraft(); setAssignmentBatch([]); setError('');
    setTarget(previous => ({ ...previous, lessonId: selectedLessonId, title: lesson ? `Assignment – ${lesson.title}` : '' }));
    setForm(previous => ({ ...previous, source: lesson ? buildLessonAssignmentSource(course, lesson) : '' }));
  };
  const selectAssignmentScope = async event => {
    const scope = event.target.value;
    if (!await confirmQuizSourceChange()) return;
    const course = courses.find(item => (item._id || item.id) === target.courseId);
    discardGeneratedDraft(); setAssignmentBatch([]); setError(''); setAssignmentScope(scope);
    setTarget(previous => ({ ...previous, lessonId: '', title: '' }));
    setForm(previous => ({ ...previous, source: scope === 'all_lessons' && course ? `${lessons.length} lessons will be processed separately from ${course.title}.` : '' }));
  };
  const updateGenerationSetting = event => {
    setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
    if (content) setSettingsChanged(true);
  };

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      teacherService.getCourses('', { signal: controller.signal }),
      teacherService.getCategories({ signal: controller.signal }),
    ]).then(([courseResult, categoryResult]) => {
    setCourses(courseResult.data?.courses || []); setCategories(categoryResult.data?.categories || []);
    }).catch(requestError => {
      if (requestError.name !== 'AbortError') setError(requestError.message);
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!target.courseId) return;
    const controller = new AbortController();
    teacherService.getLessons(target.courseId, { signal: controller.signal })
      .then(result => setLessons(result.data?.lessons || []))
      .catch(requestError => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLessonsLoading(false);
      });
    return () => controller.abort();
  }, [target.courseId]);
  useEffect(() => { const warn = event => { if (content && content !== generatedContent.current) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [content]);

  async function generate(event) {
    event.preventDefault();
    if (form.type === 'quiz_questions' && !target.courseId) { setError('Select the course that contains the quiz content.'); return; }
    if (form.type === 'quiz_questions' && quizScope === 'lesson' && !target.lessonId) { setError('Select the lesson that this quiz should test.'); return; }
    if (isAssignment && !target.courseId) { setError('Select the course that contains the assignment content.'); return; }
    if (isAssignment && assignmentScope === 'lesson' && !target.lessonId) { setError('Select the lesson for this assignment.'); return; }
    if (content && content !== generatedContent.current && !await confirmToast('Regenerate and replace your unsaved edits?', { confirmLabel: 'Regenerate', cancelLabel: 'Keep editing' })) return;
    setError(''); setBusy(true);
    let completedBatchCount = 0;
    try {
      if (isAssignment && assignmentScope === 'all_lessons') {
        const course = courses.find(item => (item._id || item.id) === target.courseId);
        const plans = buildLessonAssignmentPlans(course, lessons);
        const generated = [];
        for (let index = 0; index < plans.length; index += 1) {
          const plan = plans[index];
          setGenerationProgress(`Completed ${index} of ${plans.length}. Generating assignment ${index + 1}: ${plan.lessonTitle}`);
          const response = await teacherService.generateAIContent({ ...form, source: plan.source });
          generated.push({ ...plan, content: response.data.content, artifact: response.data.artifact });
          completedBatchCount = generated.length;
          setAssignmentBatch([...generated]);
          if (index === 0) {
            setActiveAssignmentIndex(0); setContent(generated[0].content); setArtifact(generated[0].artifact); setPreview(true);
            setTarget(previous => ({ ...previous, lessonId: generated[0].lessonId, title: generated[0].title }));
            generatedContent.current = generated[0].content;
          }
        }
        setAssignmentBatch(generated); setActiveAssignmentIndex(0);
        setContent(generated[0].content); setArtifact(generated[0].artifact); setPreview(true); setSettingsChanged(false);
        setTarget(previous => ({ ...previous, lessonId: generated[0].lessonId, title: generated[0].title }));
        generatedContent.current = generated[0].content;
        addToast(`${generated.length} different lesson assignments generated. Review them before saving.`, 'success');
        return;
      }
      if (form.type === 'quiz_questions' && quizScope === 'all_lessons') {
        const course = courses.find(item => (item._id || item.id) === target.courseId);
        const plans = buildLessonQuizPlans(course, lessons);
        const generated = [];
        for (let index = 0; index < plans.length; index += 1) {
          const plan = plans[index];
          setGenerationProgress(`Completed ${index} of ${plans.length}. Generating quiz ${index + 1}: ${plan.lessonTitle}`);
          const response = await teacherService.generateAIContent({ ...form, source: plan.source });
          generated.push({ ...plan, content: response.data.content, artifact: response.data.artifact });
          completedBatchCount = generated.length;
          setQuizBatch([...generated]);
          if (index === 0) {
            setActiveQuizIndex(0); setContent(generated[0].content); setArtifact(generated[0].artifact); setPreview(true);
            setTarget(previous => ({ ...previous, lessonId: generated[0].lessonId, title: generated[0].title }));
            generatedContent.current = generated[0].content;
          }
        }
        setQuizBatch(generated); setActiveQuizIndex(0);
        setContent(generated[0].content); setArtifact(generated[0].artifact); setPreview(true); setSettingsChanged(false);
        setTarget(previous => ({ ...previous, lessonId: generated[0].lessonId, title: generated[0].title }));
        generatedContent.current = generated[0].content;
        addToast(`${generated.length} different lesson quizzes generated. Review them before saving.`, 'success');
        return;
      }
      const response = await teacherService.generateAIContent(form);
      setContent(response.data.content); setArtifact(response.data.artifact || null); setPreview(true); setSettingsChanged(false);
      generatedContent.current = response.data.content;
      setTarget(previous => ({ ...previous, title: form.type === 'lesson_content' && previous.lessonId ? previous.title : response.data.artifact?.title || firstHeading(response.data.content, selected[1]) }));
      addToast('AI draft generated. Review it before saving to the LMS.', 'success');
    } catch (requestError) {
      const partialMessage = completedBatchCount > 0
        ? `${completedBatchCount} item(s) were generated and kept. ${requestError.message}`
        : requestError.message;
      setError(partialMessage); addToast(partialMessage, 'error');
    }
    finally { setBusy(false); setGenerationProgress(''); }
  }

  async function copy() { try { await navigator.clipboard.writeText(content); addToast('Draft copied.', 'success'); } catch { setError('Clipboard access was blocked.'); } }
  async function downloadDocx() {
    const { Document, Packer, Paragraph, HeadingLevel } = await import('docx');
    const children = content.split(/\r?\n/).map(line => new Paragraph({ text: plainText(line), ...(line.startsWith('# ') ? { heading: HeadingLevel.HEADING_1 } : line.startsWith('## ') ? { heading: HeadingLevel.HEADING_2 } : {}) }));
    const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${form.type}-${new Date().toISOString().slice(0, 10)}.docx`; anchor.click(); URL.revokeObjectURL(url); generatedContent.current = content;
  }
  async function downloadPdf() {
    if (!previewDocument.current) return;
    setError('');
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: `${form.type}-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(previewDocument.current).save();
    } catch { setError('Unable to download the PDF. Please try again.'); }
  }
  async function clearDraft() { if (content && !await confirmToast('Clear this generated draft?', { type: 'error', confirmLabel: 'Clear draft', cancelLabel: 'Keep draft' })) return; discardGeneratedDraft(); setError(''); }
  async function changeTool(event) { const type = event.target.value; if (content && !await confirmToast('Change content type? The current draft will be cleared.', { confirmLabel: 'Change type', cancelLabel: 'Keep draft' })) return; setForm(previous => ({ ...previous, type, source: '' })); setTarget(previous => ({ ...previous, lessonId: '', title: '' })); setQuizScope('lesson'); setAssignmentScope('lesson'); discardGeneratedDraft(); setError(''); }
  function continueWith(type, contentKind = form.contentKind, source = content) {
    setForm(previous => ({ ...previous, type, contentKind, source, instructions: '' }));
    if (type === 'quiz_questions') setQuizScope('lesson');
    setContent(''); setArtifact(null); setQuizBatch([]); setActiveQuizIndex(0); generatedContent.current = ''; setError(''); setPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addToast('The previous draft is now the source. Keep the relevant section, then generate.', 'success');
  }
  function writeNextLesson() {
    const currentIndex = lessons.findIndex(lesson => (lesson._id || lesson.id) === target.lessonId);
    const nextLesson = lessons[currentIndex + 1];
    if (!nextLesson) { addToast('This is the last lesson in the course.', 'success'); return; }
    setTarget(previous => ({ ...previous, lessonId: nextLesson._id || nextLesson.id, title: nextLesson.title, lessonDuration: nextLesson.duration || 60 }));
    setForm(previous => ({ ...previous, source: `Lesson: ${nextLesson.title}\nDuration: ${nextLesson.duration || 0} minutes\n\nCurrent outline or content:\n${nextLesson.content || '(No content yet)'}` }));
    setContent(''); setArtifact(null); generatedContent.current = ''; setError(''); setSaveError(''); setPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showQuiz(index) {
    const selectedQuiz = quizBatch[index];
    if (!selectedQuiz) return;
    setActiveQuizIndex(index); setContent(selectedQuiz.content); setArtifact(selectedQuiz.artifact);
    setTarget(previous => ({ ...previous, lessonId: selectedQuiz.lessonId, title: selectedQuiz.title }));
    generatedContent.current = selectedQuiz.content; setPreview(true);
  }

  function updateQuizTitle(event) {
    const title = event.target.value;
    setTarget(previous => ({ ...previous, title }));
    if (quizBatch.length) setQuizBatch(previous => previous.map((quiz, index) => index === activeQuizIndex ? { ...quiz, title } : quiz));
  }

  function showAssignment(index) {
    const selectedAssignment = assignmentBatch[index];
    if (!selectedAssignment) return;
    setActiveAssignmentIndex(index); setContent(selectedAssignment.content); setArtifact(selectedAssignment.artifact);
    setTarget(previous => ({ ...previous, lessonId: selectedAssignment.lessonId, title: selectedAssignment.title }));
    generatedContent.current = selectedAssignment.content; setPreview(true);
  }

  function updateAssignmentTitle(event) {
    const title = event.target.value;
    setTarget(previous => ({ ...previous, title }));
    if (assignmentBatch.length) setAssignmentBatch(previous => previous.map((assignment, index) => index === activeAssignmentIndex ? { ...assignment, title } : assignment));
  }

  async function saveToLms() {
    if (!target.title.trim()) { setSaveError('Enter a title before saving.'); return; }
    if (form.type === 'course_outline' && !target.categoryId) { setSaveError('Select a category for the new course.'); return; }
    if (form.type !== 'course_outline' && !target.courseId) { setSaveError('Select a destination course.'); return; }
    const destinationCourse = courses.find(course => (course._id || course.id) === target.courseId);
    const mustUnpublish = form.type !== 'course_outline' && destinationCourse?.status === 'PUBLIC';
    if (mustUnpublish && !await confirmToast(
      'This course is currently live. Unpublish it to save the generated content? Students will regain access after you publish it again.',
      { confirmLabel: 'Unpublish and save', cancelLabel: 'Keep course live' },
    )) return;
    setSaving(true); setSaveError('');
    try {
      if (mustUnpublish) {
        await teacherService.unpublish(target.courseId);
        setCourses(previous => previous.map(course => (course._id || course.id) === target.courseId ? { ...course, status: 'APPROVED' } : course));
        addToast('Course unpublished. Saving generated content now.', 'info');
      }
      if (form.type === 'course_outline') {
        if (!artifact?.modules?.length) throw new Error('Regenerate the outline before saving; structured modules are missing.');
        const description = [artifact.description, artifact.prerequisites ? `Prerequisites: ${artifact.prerequisites}` : '', `Learning outcomes:\n${artifact.learningOutcomes.map(item => `- ${item}`).join('\n')}`].filter(Boolean).join('\n\n');
        const result = await teacherService.createCourse({ title: target.title.trim(), description: description.slice(0, 5000), categoryId: target.categoryId, duration: artifact.estimatedDurationHours });
        const id = result.data?.course?._id;
        let order = 1;
        for (const module of artifact.modules) for (const lesson of module.lessons) {
          await teacherService.createLesson(id, { title: lesson.title, content: `Module: ${module.title}\n\nModule objective: ${module.objective}\n\nLesson objective: ${lesson.objective}`, order, duration: lesson.durationMinutes, isPublished: true });
          order += 1;
        }
        addToast(`Draft course created with ${order - 1} lessons.`, 'success'); if (id) navigate(`/teacher/courses/${id}/edit#details`);
      } else if (form.type === 'quiz_questions') {
        if (quizScope === 'all_lessons') {
          if (!quizBatch.length) throw new Error('Generate the lesson quizzes before saving.');
          for (const quizDraft of quizBatch) {
            const quizResult = await teacherService.createQuiz(target.courseId, { title: quizDraft.title.trim(), lessonId: quizDraft.lessonId, timeLimit: Number(target.timeLimit), passingScore: Number(target.passingScore), attemptLimit: Number(target.attemptLimit) });
            const createdQuizId = quizResult.data?.quiz?._id;
            for (const question of quizDraft.artifact?.questions || []) await teacherService.createQuestion(createdQuizId, { questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation });
          }
          addToast(`${quizBatch.length} lesson quizzes saved to the LMS.`, 'success');
          navigate(`/teacher/courses/${target.courseId}/edit#assessments`);
          return;
        }
        if (!artifact?.questions?.length) throw new Error('Regenerate this quiz before saving; structured questions are missing.');
        const result = await teacherService.createQuiz(target.courseId, { title: target.title.trim(), lessonId: target.lessonId || null, timeLimit: Number(target.timeLimit), passingScore: Number(target.passingScore), attemptLimit: Number(target.attemptLimit) });
        const quizId = result.data?.quiz?._id;
        for (const question of artifact.questions) await teacherService.createQuestion(quizId, { questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation });
        addToast(`Quiz created with ${artifact.questions.length} questions.`, 'success'); navigate(`/teacher/quizzes/${quizId}`);
      } else if (form.type === 'supporting_content' && form.contentKind === 'assignment') {
        if (assignmentScope === 'all_lessons') {
          if (!assignmentBatch.length) throw new Error('Generate the lesson assignments before saving.');
          for (const assignmentDraft of assignmentBatch) await teacherService.createAssignment(target.courseId, { title: assignmentDraft.title.trim(), content: assignmentDraft.content, lessonId: assignmentDraft.lessonId });
          addToast(`${assignmentBatch.length} lesson assignments saved to the LMS.`, 'success');
          navigate(`/teacher/courses/${target.courseId}/edit#assessments`);
          return;
        }
        await teacherService.createAssignment(target.courseId, { title: target.title.trim(), content, lessonId: target.lessonId }); addToast('Assignment created.', 'success'); navigate(`/teacher/courses/${target.courseId}/edit#assessments`);
      } else if (form.type === 'lesson_content' && target.lessonId) {
        await teacherService.updateLesson(target.courseId, target.lessonId, { title: target.title.trim(), content, isPublished: Boolean(target.publishLesson) });
        addToast('Selected lesson updated with the AI draft.', 'success');
        generatedContent.current = content;
        return;
      } else {
        const existing = await teacherService.getLessons(target.courseId); const order = (existing.data?.lessons?.length || 0) + 1;
        const result = await teacherService.createLesson(target.courseId, { title: target.title.trim(), content, order, duration: Number(target.lessonDuration), isPublished: Boolean(target.publishLesson) });
        const lessonId = result.data?.lesson?._id || ''; addToast('Lesson created in the selected course.', 'success'); navigate(`/teacher/courses/${target.courseId}/edit?lessonId=${lessonId}#lessons`);
      }
      generatedContent.current = content;
    } catch (requestError) { setSaveError(requestError.message); addToast(requestError.message, 'error'); }
    finally { setSaving(false); }
  }

  return <div className="ai-author-page">
    <header className="ai-author-hero"><div><span className="ai-author-kicker">Teacher workspace</span><h1>Create teaching content with AI</h1><p>Choose what to create, review the draft, then save it directly to your course.</p></div></header>
    <div className="ai-author-steps" aria-label="How it works"><span className="is-active"><b>1</b> Choose content</span><span className={form.source.trim() ? 'is-active' : ''}><b>2</b> Add your source</span><span className={content ? 'is-active' : ''}><b>3</b> Review and save</span></div>
    <div className="ai-author-layout"><form className="ai-author-form" onSubmit={generate}>
      <label>What do you want to create?<select name="type" value={form.type} onChange={changeTool}>{tools.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p className="ai-author-help">{selected?.[2]}</p>
      {form.type === 'lesson_content' && <div className="ai-author-existing-lesson">
        <strong>Choose the lesson to update</strong>
        <span>Selecting a lesson fills the source automatically. The reviewed AI draft will replace that lesson's content.</span>
        <label>Course<select name="courseId" value={target.courseId} onChange={selectCourse}><option value="">Select course</option>{courses.map(course => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select></label>
        <label>Existing lesson<select name="lessonId" value={target.lessonId} onChange={selectLesson} disabled={!target.courseId}><option value="">Create a new lesson instead</option>{lessons.map(lesson => <option key={lesson._id || lesson.id} value={lesson._id || lesson.id}>{lesson.order}. {lesson.title}</option>)}</select></label>
      </div>}
      {form.type === 'quiz_questions' && <div className="ai-author-existing-lesson">
        <strong>Choose what this quiz should test</strong>
        <span>The AI uses this selection as its source, and the finished quiz is saved to the same place.</span>
        <label>Course<select name="quizCourseId" value={target.courseId} onChange={selectQuizCourse}><option value="">Select course</option>{courses.map(course => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select></label>
        <fieldset className="ai-author-scope" disabled={!target.courseId || lessonsLoading}>
          <legend>Content to test</legend>
          <label><input type="radio" name="quizScope" value="lesson" checked={quizScope === 'lesson'} onChange={selectQuizScope} />Quiz for one lesson <small>Create one quiz from the selected lesson.</small></label>
          <label><input type="radio" name="quizScope" value="all_lessons" checked={quizScope === 'all_lessons'} onChange={selectQuizScope} />Quiz for every lesson <small>Create a different quiz for each lesson.</small></label>
        </fieldset>
        {quizScope === 'lesson' && <label>Lesson<select name="quizLessonId" value={target.lessonId} onChange={selectQuizLesson} disabled={!target.courseId || lessonsLoading}><option value="">{lessonsLoading ? 'Loading lessons…' : 'Select lesson'}</option>{lessons.map(lesson => <option key={lesson._id || lesson.id} value={lesson._id || lesson.id}>{lesson.order}. {lesson.title}</option>)}</select></label>}
        <p className="ai-author-source-summary"><strong>What will be created:</strong> {lessonsLoading ? 'loading course lessons' : quizScope === 'all_lessons' ? target.courseId ? `${lessons.length} separate quizzes — one different quiz for each lesson` : 'select a course first' : target.lessonId ? `one quiz for ${lessons.find(lesson => (lesson._id || lesson.id) === target.lessonId)?.title}` : 'select one lesson first'}.</p>
      </div>}
      {isAssignment && <div className="ai-author-existing-lesson">
        <strong>Choose what the assignment should cover</strong>
        <span>Each generated assignment is saved to the lesson used as its source.</span>
        <label>Course<select name="assignmentCourseId" value={target.courseId} onChange={selectAssignmentCourse}><option value="">Select course</option>{courses.map(course => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select></label>
        <fieldset className="ai-author-scope" disabled={!target.courseId || lessonsLoading}>
          <legend>Assignments to create</legend>
          <label><input type="radio" name="assignmentScope" value="lesson" checked={assignmentScope === 'lesson'} onChange={selectAssignmentScope} />Assignment for one lesson <small>Create one assignment from the selected lesson.</small></label>
          <label><input type="radio" name="assignmentScope" value="all_lessons" checked={assignmentScope === 'all_lessons'} onChange={selectAssignmentScope} />Assignment for every lesson <small>Create a different assignment for each lesson.</small></label>
        </fieldset>
        {assignmentScope === 'lesson' && <label>Lesson<select name="assignmentLessonId" value={target.lessonId} onChange={selectAssignmentLesson} disabled={!target.courseId || lessonsLoading}><option value="">{lessonsLoading ? 'Loading lessons…' : 'Select lesson'}</option>{lessons.map(lesson => <option key={lesson._id || lesson.id} value={lesson._id || lesson.id}>{lesson.order}. {lesson.title}</option>)}</select></label>}
        <p className="ai-author-source-summary"><strong>What will be created:</strong> {lessonsLoading ? 'loading course lessons' : assignmentScope === 'all_lessons' ? target.courseId ? `${lessons.length} separate assignments — one different assignment for each lesson` : 'select a course first' : target.lessonId ? `one assignment for ${lessons.find(lesson => (lesson._id || lesson.id) === target.lessonId)?.title}` : 'select one lesson first'}.</p>
      </div>}
      {form.type === 'material_summary' && <p className="ai-author-note"><strong>When should I use this?</strong> Use it to create editable study notes for a course. For a quick personal summary that stays only in chat history, use Summarize in Ask AI.</p>}
      {!(form.type === 'quiz_questions' && quizScope === 'all_lessons') && !(isAssignment && assignmentScope === 'all_lessons') && <label>{form.type === 'course_outline' ? 'Describe the course' : form.type === 'lesson_content' ? 'Lesson outline or notes' : form.type === 'quiz_questions' ? 'Content AI will use' : form.type === 'material_summary' ? 'Material to turn into study notes' : 'Lesson content and requirements'}<textarea name="source" required maxLength={20000} rows={10} value={form.source} onChange={update} placeholder="Paste or type the information AI should use…" /></label>}
      {form.type === 'quiz_questions' && quizScope === 'all_lessons' && <div className="ai-author-lesson-plan"><strong>{lessons.length} quizzes will be generated</strong>{lessons.map((lesson, index) => <span key={lesson._id || lesson.id}>{index + 1}. {lesson.title} → one unique quiz</span>)}</div>}
      {isAssignment && assignmentScope === 'all_lessons' && <div className="ai-author-lesson-plan"><strong>{lessons.length} assignments will be generated</strong>{lessons.map((lesson, index) => <span key={lesson._id || lesson.id}>{index + 1}. {lesson.title} → one unique assignment</span>)}</div>}
      <div className="ai-author-grid"><label>Output language<select name="language" value={form.language} onChange={updateGenerationSetting}>{languages.map(language => <option key={language}>{language}</option>)}</select></label><label>Target audience<select name="audience" value={form.audience} onChange={updateGenerationSetting}>{audiences.map(audience => <option key={audience}>{audience}</option>)}</select></label></div>
      {settingsChanged && <p className="ai-author-setting-note" role="status">Language or audience changed. Select Regenerate below to apply the new options.</p>}
      {form.type === 'quiz_questions' && <div className="ai-author-grid"><label>Questions<input name="count" type="number" min="1" max="20" value={form.count} onChange={update} /></label><label>Difficulty<select name="difficulty" value={form.difficulty} onChange={update}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>}
      {form.type === 'supporting_content' && <label>Content type<select name="contentKind" value={form.contentKind} onChange={update}><option value="assignment">Assignment</option><option value="worked explanation">Worked explanation</option><option value="practice activity">Practice activity</option></select></label>}
      <details className="ai-author-advanced"><summary>Optional instructions</summary><label>Anything else AI should follow?<textarea name="instructions" maxLength={1000} rows={3} value={form.instructions} onChange={update} placeholder="Example: include code examples and a 15-minute exercise" /></label></details>
      {error && <p className="ai-author-error" role="alert">{error}</p>}
      {generationProgress && <p className="ai-author-progress" role="status">{generationProgress}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? generationProgress || 'Generating…' : content ? quizScope === 'all_lessons' && form.type === 'quiz_questions' ? 'Regenerate all lesson quizzes' : isAssignment && assignmentScope === 'all_lessons' ? 'Regenerate all lesson assignments' : 'Regenerate draft' : quizScope === 'all_lessons' && form.type === 'quiz_questions' ? `Generate ${lessons.length} lesson quizzes` : isAssignment && assignmentScope === 'all_lessons' ? `Generate ${lessons.length} lesson assignments` : generateLabels[form.type]}</button>
      {form.type === 'quiz_questions' && content && <div className="ai-author-save ai-author-save-inline"><h3>{quizScope === 'all_lessons' ? `Save ${quizBatch.length} quizzes to LMS` : 'Save quiz to LMS'}</h3>
        {quizScope === 'lesson' && <label>Quiz title<input name="title" value={target.title} maxLength={200} onChange={updateQuizTitle} /></label>}
        <div className="ai-author-destination"><strong>Save to</strong><span>{courses.find(course => (course._id || course.id) === target.courseId)?.title}</span><small>{quizScope === 'all_lessons' ? `${quizBatch.length} separate quizzes, each linked to its own lesson.` : `Linked to lesson: ${lessons.find(lesson => (lesson._id || lesson.id) === target.lessonId)?.title}`}</small></div>
        <div className="ai-author-grid"><label>Minutes<input name="timeLimit" type="number" min="1" value={target.timeLimit} onChange={updateTarget} /></label><label>Pass score (%)<input name="passingScore" type="number" min="0" max="100" value={target.passingScore} onChange={updateTarget} /></label></div>
        <label>Attempt limit<input name="attemptLimit" type="number" min="1" value={target.attemptLimit} onChange={updateTarget} /></label>
        {saveError && <p className="ai-author-error" role="alert">{saveError}</p>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={saveToLms}>{saving ? 'Saving…' : quizScope === 'all_lessons' ? `Save all ${quizBatch.length} quizzes to LMS` : 'Save quiz to LMS'}</button>
      </div>}
      {isAssignment && content && <div className="ai-author-save ai-author-save-inline"><h3>{assignmentScope === 'all_lessons' ? `Save ${assignmentBatch.length} assignments to LMS` : 'Save assignment to LMS'}</h3>
        {assignmentScope === 'lesson' && <label>Assignment title<input name="title" value={target.title} maxLength={200} onChange={updateAssignmentTitle} /></label>}
        <div className="ai-author-destination"><strong>Save to</strong><span>{courses.find(course => (course._id || course.id) === target.courseId)?.title}</span><small>{assignmentScope === 'all_lessons' ? `${assignmentBatch.length} separate assignments, each linked to its own lesson.` : `Linked to lesson: ${lessons.find(lesson => (lesson._id || lesson.id) === target.lessonId)?.title}`}</small></div>
        {saveError && <p className="ai-author-error" role="alert">{saveError}</p>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={saveToLms}>{saving ? 'Saving…' : assignmentScope === 'all_lessons' ? `Save all ${assignmentBatch.length} assignments to LMS` : 'Save assignment to LMS'}</button>
      </div>}
    </form>
    <section className="ai-author-result"><div className="ai-author-result-head"><div><span>{form.type === 'quiz_questions' ? 'Quiz preview' : isAssignment ? 'Assignment preview' : 'Editable draft'}</span><strong>{quizBatch.length > 1 ? `${quizBatch.length} lesson quizzes` : assignmentBatch.length > 1 ? `${assignmentBatch.length} lesson assignments` : selected?.[1]}</strong></div><div><button type="button" onClick={() => setPreview(value => !value)} disabled={!content}>{preview ? 'Edit' : 'Preview'}</button><button type="button" onClick={copy} disabled={!content}>Copy</button><button type="button" onClick={downloadDocx} disabled={!content}>DOCX</button><button type="button" onClick={downloadPdf} disabled={!content}>PDF</button><button type="button" onClick={clearDraft} disabled={!content}>Clear</button></div></div>
      {!content ? <div className="ai-author-empty"><strong>Your generated draft will appear here</strong><span>Choose a tool, add source content, and generate.</span></div> : <>{quizBatch.length > 1 && <div className="ai-author-quiz-tabs"><strong>Review each lesson quiz</strong><span>{activeQuizIndex + 1} of {quizBatch.length}</span><div>{quizBatch.map((quiz, index) => <button type="button" className={index === activeQuizIndex ? 'is-active' : ''} key={quiz.lessonId} onClick={() => showQuiz(index)}>{index + 1}. {quiz.lessonTitle}</button>)}</div></div>}{assignmentBatch.length > 1 && <div className="ai-author-quiz-tabs"><strong>Review each lesson assignment</strong><span>{activeAssignmentIndex + 1} of {assignmentBatch.length}</span><div>{assignmentBatch.map((assignment, index) => <button type="button" className={index === activeAssignmentIndex ? 'is-active' : ''} key={assignment.lessonId} onClick={() => showAssignment(index)}>{index + 1}. {assignment.lessonTitle}</button>)}</div></div>}{preview ? <article ref={previewDocument} className="ai-author-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></article> : <><textarea className="ai-author-editor" value={content} onChange={event => { const value = event.target.value; setContent(value); if (quizBatch.length) setQuizBatch(previous => previous.map((quiz, index) => index === activeQuizIndex ? { ...quiz, content: value } : quiz)); if (assignmentBatch.length) setAssignmentBatch(previous => previous.map((assignment, index) => index === activeAssignmentIndex ? { ...assignment, content: value } : assignment)); }} /><article ref={previewDocument} style={{ position: 'fixed', left: '-100000px', width: '794px', background: '#fff', padding: '32px', color: '#172033' }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></article></>}
        {form.type !== 'quiz_questions' && !isAssignment && <div className="ai-author-next">
          {form.type === 'course_outline' ? <>
            <div className="ai-author-next-intro"><strong>Optional: create a lesson draft</strong><span>Select one lesson to generate its detailed content. This does not save a lesson yet; after reviewing the draft, choose a course and select Create lesson.</span></div>
            {artifact?.modules?.map((module, moduleIndex) => <div className="ai-author-module-actions" key={module.title}>
              <strong>Module {moduleIndex + 1}: {module.title}</strong>
              {module.lessons.map(lesson => <button key={lesson.title} type="button" onClick={() => continueWith('lesson_content', form.contentKind, `Course: ${artifact.title}\nModule: ${module.title}\nModule objective: ${module.objective}\nLesson: ${lesson.title}\nLesson objective: ${lesson.objective}\n\nRelevant course outline:\n${content}`)}>Write lesson: {lesson.title}</button>)}
            </div>)}
          </> : <strong>Continue creating</strong>}
          {form.type === 'lesson_content' && <><button type="button" onClick={() => continueWith('quiz_questions')}>Generate quiz from lesson</button><button type="button" onClick={() => continueWith('supporting_content', 'assignment')}>Generate assignment</button><button type="button" onClick={() => continueWith('material_summary')}>Summarize lesson</button></>}
          {form.type === 'lesson_content' && target.lessonId && <button type="button" onClick={writeNextLesson}>Write next lesson</button>}
          {form.type === 'material_summary' && <button type="button" onClick={() => continueWith('quiz_questions')}>Generate revision quiz</button>}
        </div>}
        {form.type !== 'quiz_questions' && !isAssignment && <div className="ai-author-save"><h3>Save to LMS</h3><label>Title<input name="title" value={target.title} maxLength={200} onChange={updateTarget} /></label>
          {form.type === 'course_outline' ? <label>Category<select name="categoryId" value={target.categoryId} onChange={updateTarget}><option value="">Select category</option>{categories.map(category => <option key={category._id || category.id} value={category._id || category.id}>{category.name}</option>)}</select></label> : form.type === 'lesson_content' ? <div className="ai-author-destination"><strong>Destination</strong><span>{courses.find(course => (course._id || course.id) === target.courseId)?.title || 'No course selected'} → {target.lessonId ? lessons.find(lesson => (lesson._id || lesson.id) === target.lessonId)?.title || 'Selected lesson' : 'New lesson'}</span><small>Change this selection in “Choose the lesson to update” above.</small></div> : <label>Course<select name="courseId" value={target.courseId} onChange={selectCourse}><option value="">Select course</option>{courses.map(course => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select></label>}
          {form.type === 'lesson_content' && !target.lessonId && <label>Lesson duration (minutes)<input name="lessonDuration" type="number" min="1" value={target.lessonDuration} onChange={updateTarget} /></label>}
          {form.type !== 'course_outline' && <label><input name="publishLesson" type="checkbox" checked={Boolean(target.publishLesson)} onChange={updateTarget} /> Publish lesson to students</label>}
          {saveError && <p className="ai-author-error" role="alert">{saveError}</p>}
          <button type="button" className="btn btn-primary" disabled={saving} onClick={saveToLms}>{saving ? 'Saving…' : form.type === 'course_outline' ? 'Create draft course' : form.type === 'quiz_questions' ? 'Create quiz and questions' : form.type === 'supporting_content' && form.contentKind === 'assignment' ? 'Create assignment' : form.type === 'lesson_content' && target.lessonId ? 'Update selected lesson' : 'Create lesson'}</button>
        </div>}</>}
    </section></div>
  </div>;
}

// Isolated real-browser smoke: never connects to an application/production database.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const backend = path.resolve(__dirname, '../../backend');
const root = path.resolve(__dirname, '../..');
const mongoose = require(path.join(backend, 'node_modules/mongoose'));
const { MongoMemoryServer } = require(path.join(backend, 'node_modules/mongodb-memory-server'));
const output = path.join(root, 'outputs/iteration3-thai');
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(check, message, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(100); }
  throw new Error(message);
}
async function main() {
  let mongo, vite, server, chrome, ws;
  const errors = [];
  const testFiles = [];
  try {
    fs.mkdirSync(output, { recursive: true });
    const cachedBinary = path.join(backend, 'node_modules/.cache/mongodb-memory-server/mongod-x64-win32-8.2.6.exe');
    mongo = await MongoMemoryServer.create(fs.existsSync(cachedBinary) ? { binary: { systemBinary: cachedBinary } } : {});
    await mongoose.connect(mongo.getUri(), { dbName: `ai_lms_browser_test_${crypto.randomBytes(6).toString('hex')}` });
    process.env.JWT_ACCESS_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.NODE_ENV = 'test';
    const User = require(path.join(backend, 'src/model/identity/User'));
    const Course = require(path.join(backend, 'src/model/learning/Course'));
    const Section = require(path.join(backend, 'src/model/learning/Section'));
    const Assignment = require(path.join(backend, 'src/model/learning/Assignment'));
    const Quiz = require(path.join(backend, 'src/model/learning/Quiz'));
    const Submission = require(path.join(backend, 'src/model/learning/AssignmentSubmission'));
    const Enrollment = require(path.join(backend, 'src/model/learning/Enrollment'));
    const Lesson = require(path.join(backend, 'src/model/learning/Lesson'));
    const Progress = require(path.join(backend, 'src/model/learning/Progress'));
    const password = `Aa1!${crypto.randomBytes(4).toString('hex')}`;
    const teacher = await User.create({ fullName: 'Browser Test Teacher', email: 'teacher@browser.test', passwordHash: await require(path.join(backend, 'src/utils/auth/PasswordUtil')).hash(password), role: 'teacher', emailVerifiedAt: new Date() });
    const student = await User.create({ fullName: 'Browser Test Student', email: 'student@browser.test', passwordHash: await require(path.join(backend, 'src/utils/auth/PasswordUtil')).hash(password), emailVerifiedAt: new Date() });
    const course = await Course.create({ title: 'Browser Test Course', teacherId: teacher._id, status: 'DRAFT' });
    const assignment = await Assignment.create({ courseId: course._id, title: 'Assignment', content: 'Instructions', maxScore: 10, passingScore: 5 });
    const [quiz] = await Quiz.create([
      { courseId: course._id, title: 'Practice quiz', timeLimit: 15, passingScore: 50, isPublished: false },
      { courseId: course._id, title: 'Review quiz with a longer title to verify that names wrap without overlapping the edit action', timeLimit: 20, passingScore: 50, isPublished: false },
    ]);
    await Enrollment.create({ courseId: course._id, userId: student._id });
    const lesson = await Lesson.create({ courseId: course._id, title: 'Introduction', content: 'Read the lesson', order: 1, isPublished: true });
    await Progress.create({ userId: student._id, courseId: course._id, lessonId: lesson._id, status: 'completed', completedAt: new Date() });
    const submission = await Submission.create({ courseId: course._id, assignmentId: assignment._id, studentId: student._id, answer: 'Student solution' });
    server = require(path.join(backend, 'src/index')).app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../node_modules/vite/dist/node/index.js')).href);
    vite = await createServer({ root: path.resolve(__dirname, '..'), configFile: path.resolve(__dirname, '../vite.config.js'), server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: `http://127.0.0.1:${server.address().port}`, changeOrigin: true } } } });
    await vite.listen();
    console.log('Browser smoke: isolated servers ready.');
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-lms-browser-test-'));
    const executable = process.env.TEST_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    chrome = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let endpoint = '';
    chrome.stderr.on('data', data => { const match = String(data).match(/DevTools listening on (ws:\/\/\S+)/); if (match) endpoint = match[1]; });
    await until(() => endpoint, 'Chrome CDP did not start');
    console.log('Browser smoke: Chrome ready.');
    ws = new WebSocket(endpoint); await new Promise((r, reject) => { ws.onopen = r; ws.onerror = reject; });
    let nextId = 0; const pending = new Map(); let sessionId;
    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.id) { const p = pending.get(data.id); if (p) { clearTimeout(p.timer); pending.delete(data.id); if (data.error) p.reject(new Error(data.error.message)); else p.resolve(data.result); } }
      if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
    };
    const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 15000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
    });
    console.log('Browser smoke: connecting to CDP target.');
    const target = await send('Target.createTarget', { url: 'about:blank' }, null);
    sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: output }, null);
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result.value;
    };
    const navigate = async suffix => { await send('Page.navigate', { url: origin + suffix }); };
    const text = () => evaluate('document.body.innerText');
    const clickText = async label => { assert.equal(await evaluate(`Boolean([...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.click() === undefined && [...document.querySelectorAll('button')].some(b => b.textContent.trim() === ${JSON.stringify(label)}))`), true); };
    const fill = async (selector, value) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await send('Input.insertText', { text: value }); };
    await navigate('/login'); await until(() => evaluate("Boolean(document.querySelector('input[name=email]'))"), 'Login did not render');
    await fill('input[name=email]', teacher.email); await fill('input[name=password]', password); await clickText('Sign in');
    await until(() => evaluate("location.pathname === '/teacher/dashboard'"), 'UI login failed');
    console.log('Browser smoke: real UI login passed.');
    const teacherSession = sessionId;
    await navigate(`/teacher/courses/${course._id}/sections/new`);
    await until(() => evaluate("Boolean(document.querySelector('#section-name:not(:disabled)'))"), 'Section screen did not render');
    await fill('#section-name', 'Practice section'); await fill('#section-description', 'Exercises and assignment preparation');
    await clickText('Create Section');
    await until(async () => await Section.countDocuments({ courseId: course._id, title: 'Practice section', description: 'Exercises and assignment preparation' }) === 1, 'Section UI did not persist');
    await until(() => evaluate("Boolean(document.querySelector('#lesson-section'))"), 'Did not return to lesson selector');
    assert.equal(await evaluate("Boolean(document.querySelector('input[aria-label=\"New section title\"]'))"), false);
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Quizzes & Assignments')).click()");
    await until(() => evaluate("Boolean(document.querySelector('[aria-label=\"Course assignments\"]'))"), 'Named assignment list missing', 5000);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Course assignments\"] li')?.textContent.includes('View submissions')"), true);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Course assignments\"] li a')?.getAttribute('href')"), `/teacher/assignments/${assignment._id}/edit?courseId=${course._id}`);
    assert.equal(await evaluate("document.querySelectorAll('[aria-label=\"Course quizzes\"] li').length"), 2);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Course quizzes\"] a')?.textContent"), 'Edit quiz');
    // Validate the card at desktop and narrow widths.
    for (const width of [1440, 1024, 768, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate("(() => { const card = document.querySelector('.course-assignments'); return card.scrollWidth <= card.clientWidth; })()"), true, `Assignment card overflows at ${width}px`);
      assert.equal(await evaluate("(() => { const card = document.querySelector('.course-quizzes'); return card.scrollWidth <= card.clientWidth; })()"), true, `Quiz card overflows at ${width}px`);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate("document.querySelector('.course-assignments').scrollIntoView({ block: 'center' })");
    fs.writeFileSync(path.join(output, 'course-assignments.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    fs.writeFileSync(path.join(output, 'course-quizzes.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    // The API sorts quizzes by recency; select the intended row by its resource URL.
    await evaluate(`document.querySelector('[aria-label="Course quizzes"] a[href="/teacher/quizzes/${quiz._id}"]').click()`);
    await until(() => evaluate(`location.pathname === '/teacher/quizzes/${quiz._id}' && document.body.innerText.includes('Save Quiz Configuration')`), 'Edit quiz did not open its existing workspace');
    assert.equal(await evaluate("document.querySelector('input[name=title]')?.value"), quiz.title);
    assert.equal(await evaluate("(() => { const form = document.querySelector('form.assessment-form').getBoundingClientRect(); const questions = document.querySelector('.assessment-section').getBoundingClientRect(); return Math.abs(form.width - questions.width) <= 1 && Math.abs(form.left - questions.left) <= 1; })()"), true, 'Quiz configuration and questions must have the same width and alignment');
    assert.equal(await evaluate("getComputedStyle([...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save Quiz Configuration')).backgroundColor"), 'rgb(30, 41, 59)');
    for (const width of [1440, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate("(() => { const form = document.querySelector('form.assessment-form').getBoundingClientRect(); const questions = document.querySelector('.assessment-section').getBoundingClientRect(); return Math.abs(form.width - questions.width) <= 1 && Math.abs(form.left - questions.left) <= 1; })()"), true, `Quiz panels misaligned at ${width}px`);
      assert.equal(await evaluate("(() => { const el = document.querySelector('.quiz-workspace'); return el.scrollWidth <= el.clientWidth; })()"), true, `Quiz workspace overflows at ${width}px`);
    }
    fs.writeFileSync(path.join(output, 'quiz-workspace-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate("(() => { const save = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save Quiz Configuration').getBoundingClientRect(); const chat = document.querySelector('.ai-chat-launcher').getBoundingClientRect(); return save.left < chat.right && save.right > chat.left && save.top < chat.bottom && save.bottom > chat.top; })()"), false, 'Ask AI overlaps the quiz save action');
    await evaluate("document.querySelectorAll('.toast-close').forEach(b => b.click())");
    fs.writeFileSync(path.join(output, 'quiz-workspace-empty.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await setValue('input[name=timeLimit]', '25'); await clickText('Save Quiz Configuration');
    await until(async () => (await Quiz.findById(quiz._id)).timeLimit === 25, 'Restyled quiz configuration did not save');
    await clickText('Create New Question');
    await until(() => evaluate("Boolean(document.querySelector('[role=dialog][aria-labelledby=quiz-question-dialog-title]'))"), 'Question editor dialog did not open');
    assert.equal(await evaluate("Number(getComputedStyle(document.querySelector('.quiz-dialog').parentElement).zIndex) > Number(getComputedStyle(document.querySelector('.ai-chat-root')).zIndex)"), true, 'Ask AI covers the question editor');
    await setValue('#quiz-question-text', 'Which statement is correct?');
    await setValue('#quiz-option-0', 'Correct option');
    await setValue('#quiz-option-1', 'Other option');
    await evaluate("(() => { const el = document.querySelector('#quiz-correct-answer'); el.value = 'Correct option'; el.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate("(() => { const el = document.querySelector('.quiz-dialog'); return el.scrollWidth <= el.clientWidth; })()"), true, 'Question editor overflows on mobile');
    await evaluate("document.querySelectorAll('.toast-close').forEach(b => b.click())");
    fs.writeFileSync(path.join(output, 'quiz-question-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await clickText('Save & Add to Quiz');
    await until(() => evaluate("!document.querySelector('.quiz-dialog') && document.querySelector('.assessment-question')?.textContent.includes('Which statement is correct?')"), 'Question creation failed after UI restyling');
    fs.writeFileSync(path.join(output, 'quiz-workspace.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await clickText('Edit');
    await until(() => evaluate("document.querySelector('#quiz-question-text')?.value === 'Which statement is correct?'"), 'Question edit did not load saved content');
    await setValue('#quiz-question-text', 'Updated question text'); await clickText('Update Question');
    await until(() => evaluate("!document.querySelector('.quiz-dialog') && document.querySelector('.assessment-question')?.textContent.includes('Updated question text')"), 'Question edit did not save');
    await clickText('Add from Question Bank');
    await until(() => evaluate("Boolean(document.querySelector('[aria-labelledby=quiz-bank-dialog-title]'))"), 'Question Bank dialog did not open');
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate("(() => { const el = document.querySelector('.quiz-dialog'); return el.scrollWidth <= el.clientWidth; })()"), true, 'Question Bank overflows on mobile');
    await clickText('Cancel');
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate(`/teacher/courses/${course._id}/edit#activities`);
    await until(() => evaluate("Boolean(document.querySelector('[aria-label=\"Course quizzes\"]'))"), 'Quiz list did not reload');
    await evaluate("document.querySelector('[aria-label=\"Course assignments\"] li a[href$=submissions]').click()");
    await until(() => evaluate("location.pathname.endsWith('/submissions')"), 'Assignment row action did not navigate');
    console.log('Browser smoke: separate section form and select-only lesson editor passed.');
    const documentFile = path.join(profile, 'Prompt.pdf');
    fs.writeFileSync(documentFile, '%PDF-1.4\nBrowser assignment document\n%%EOF'); testFiles.push(documentFile);
    async function selectFile(selector) {
      const doc = await send('DOM.getDocument');
      const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
      assert.ok(node.nodeId); await send('DOM.setFileInputFiles', { nodeId: node.nodeId, files: [documentFile] });
    }
    async function setValue(selector, value) {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    }
    for (const editPath of [
      `/teacher/assignments/${assignment._id}/edit?courseId=${course._id}`,
      `/teacher/assignments/new?assignmentId=${assignment._id}`,
    ]) {
      await navigate(editPath);
      await until(() => evaluate("Boolean(document.querySelector('#title')?.value) && document.body.innerText.includes('Cancel Editing')"), 'Assignment edit did not load for cancellation');
      await setValue('#title', 'Unsaved title to discard');
      await selectFile('#assignment-prompt-file');
      await clickText('Cancel Editing');
      await until(() => evaluate(`location.pathname === '/teacher/courses/${course._id}/edit' && location.hash === '#activities'`), 'Cancel Editing incorrectly stays on the creation form', 5000);
      await until(() => evaluate("Boolean(document.querySelector('[aria-label=\"Course assignments\"]'))"), 'Cancel did not return to Course Activities');
      assert.equal((await Assignment.findById(assignment._id)).title, assignment.title, 'Cancel must discard unsaved edits');
      assert.equal(Boolean((await Assignment.findById(assignment._id)).attachment), false, 'Cancel must not upload the selected document');
    }
    console.log('Browser smoke: Cancel Editing returns to the Course Activities tab and preserves saved content.');
    await navigate(`/teacher/assignments/${assignment._id}/edit?courseId=${course._id}`);
    await until(() => evaluate("Boolean(document.querySelector('#assignment-prompt-file')) && document.querySelector('#title')?.value.length > 0"), 'Assignment edit did not load');
    await selectFile('#assignment-prompt-file'); await clickText('Save Assignment Changes');
    await until(async () => Boolean((await Assignment.findById(assignment._id)).attachment), 'Prompt file did not persist');
    await until(() => evaluate("[...document.querySelectorAll('.toast.success')].some(t => t.textContent.includes('updated'))"), 'Assignment save toast missing');
    await Course.updateOne({ _id: course._id }, { status: 'PUBLIC' });
    const context = await send('Target.createBrowserContext', {}, null);
    const studentTarget = await send('Target.createTarget', { url: 'about:blank', browserContextId: context.browserContextId }, null);
    sessionId = (await send('Target.attachToTarget', { targetId: studentTarget.targetId, flatten: true }, null)).sessionId;
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate('/login'); await until(() => evaluate("Boolean(document.querySelector('input[name=email]'))"), 'Student login did not render');
    await fill('input[name=email]', student.email); await fill('input[name=password]', password); await clickText('Sign in');
    await until(() => evaluate("location.pathname === '/dashboard'"), 'Student UI login failed');
    await navigate(`/courses/${course._id}/learn`);
    await until(async () => (await text()).includes('Resubmit assignment'), 'English Student assignment actions missing');
    await until(() => evaluate("Boolean(document.querySelector('[aria-label=\"Course sections\"] details'))"), 'Section grouping missing');
    assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Course progress\"] progress'))"), true);
    await evaluate("document.querySelector('[aria-label=\"Course sections\"] summary').click()");
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Course sections\"] details').open"), false);
    await evaluate("document.querySelector('[aria-label=\"Course sections\"] summary').click()");
    await clickText('Refresh assignments & feedback');
    await until(() => evaluate("[...document.querySelectorAll('button')].some(b => b.textContent === 'Refresh assignments & feedback' && !b.disabled)"), 'Refresh failed');
    await clickText('Resubmit assignment');
    await until(() => evaluate("Boolean(document.querySelector('#assignment-answer-file'))"), 'File submission control missing');
    await setValue('#assignment-answer', '');
    await selectFile('#assignment-answer-file'); await clickText('Update submission');
    await until(async () => Boolean((await Submission.findById(submission._id)).attachment), 'Student file UI did not persist');
    assert.equal((await Submission.findById(submission._id)).answer, '');
    await until(() => evaluate("document.querySelector('[role=dialog] [role=status]')?.textContent.includes('Assignment submitted successfully')"), 'Persistent submission confirmation missing');
    assert.equal(await evaluate("document.querySelector('[role=dialog] [role=status]').textContent.includes('saved and is awaiting grading')"), true);
    assert.equal(await evaluate("Number(getComputedStyle(document.querySelector('.toast-container')).zIndex) > Number(getComputedStyle(document.querySelector('[role=dialog]').parentElement).zIndex)"), true, 'Toast is hidden behind the modal overlay');
    await evaluate("document.querySelector('.toast.success .toast-close').click()");
    assert.equal(await evaluate("Boolean(document.querySelector('.assignment-submission-notice.is-success'))"), true, 'Confirmation should remain after toast dismissal');
    assert.equal(await evaluate("document.querySelector('[role=dialog] [role=status]') === document.activeElement"), true, 'Confirmation should receive focus and scroll into view');
    fs.writeFileSync(path.join(output, 'student-submission.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    // A server-rejected resubmission must clear success and preserve the saved file.
    const savedRevision = (await Submission.findById(submission._id)).revision;
    await clickText('Edit / Resubmit');
    assert.equal(await evaluate("Boolean(document.querySelector('.assignment-submission-notice.is-success'))"), false);
    await Assignment.updateOne({ _id: assignment._id }, { deadline: new Date(Date.now() - 60000) });
    await selectFile('#assignment-answer-file'); await clickText('Update submission');
    await until(() => evaluate("Boolean(document.querySelector('.assignment-submission-notice.is-error'))"), 'Rejected submission needs a visible error');
    assert.equal(await evaluate("Boolean(document.querySelector('.assignment-submission-notice.is-success'))"), false);
    assert.equal((await Submission.findById(submission._id)).revision, savedRevision);
    await Assignment.updateOne({ _id: assignment._id }, { $unset: { deadline: 1 } });
    console.log('Browser smoke: Teacher prompt upload and Student file-only resubmission passed.');
    const studentSession = sessionId;
    sessionId = teacherSession;
    await navigate(`/teacher/assignments/${assignment._id}/submissions`);
    await until(async () => (await text()).includes('View / Grade'), 'Submission list did not render');
    await until(() => evaluate("[...document.querySelectorAll('.assessment-workspace a')].some(a => a.textContent.includes('Back to Course Activities'))"), 'Submission screen has no Back to Course Activities control', 5000);
    const backLink = "[...document.querySelectorAll('.assessment-workspace a')].find(a => a.textContent.includes('Back to Course Activities'))";
    assert.equal(await evaluate(`${backLink}.getAttribute('href')`), `/teacher/courses/${course._id}/edit#activities`);
    await evaluate(`${backLink}.click()`);
    await until(() => evaluate(`location.pathname === '/teacher/courses/${course._id}/edit' && location.hash === '#activities'`), 'Submission Back control returned to the wrong screen');
    await until(() => evaluate("Boolean(document.querySelector('[aria-label=\"Course assignments\"]'))"), 'Assignment list missing after Back');
    await navigate(`/teacher/assignments/${assignment._id}/submissions`);
    await until(async () => (await text()).includes('View / Grade'), 'Submission list did not reopen after Back');
    await clickText('View / Grade'); await until(async () => (await text()).includes('Submitted as a document.'), 'File submission detail missing');
    await fill('input[type=number]', '11'); await clickText('Save Grade and Feedback');
    await until(() => evaluate("[...document.querySelectorAll('.toast.error')].some(t => t.textContent.includes('scale'))"), 'Failed-save toast missing');
    await setValue('input[type=number]', '8'); await clickText('Save Grade and Feedback');
    await until(async () => (await Submission.findById(submission._id)).score === 8, 'Grade UI did not persist');
    await until(() => evaluate("[...document.querySelectorAll('.toast.success')].some(t => t.textContent.includes('Grade and feedback saved'))"), 'Successful-save toast missing');
    const savedBadge = () => evaluate("document.querySelector('.assessment-detail .assessment-status')?.textContent");
    assert.equal(await savedBadge(), 'Passed');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.assessment-detail .assessment-status')).color"), 'rgb(22, 101, 52)');
    await setValue('input[type=number]', '4');
    assert.equal(await savedBadge(), 'Passed', 'Unsaved score must not change the saved result');
    await clickText('Save Grade and Feedback');
    await until(async () => await savedBadge() === 'Not passed', 'Saved failing result badge missing');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.assessment-detail .assessment-status')).color"), 'rgb(185, 28, 28)');
    await evaluate("(() => { const el = document.querySelector('select'); el.value = 'needs_revision'; el.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await until(() => evaluate("Boolean(document.querySelector('tbody .assessment-status.is-failed'))"), 'Not passed filter did not return the failing submission');
    assert.equal(await evaluate("document.querySelector('select').selectedOptions[0].textContent"), 'Not passed');
    assert.equal(await evaluate("[...document.querySelector('select').options].some(o => /needs_revision|need.?revision/i.test(o.textContent))"), false);
    fs.writeFileSync(path.join(output, 'assignment-not-passed.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await navigate(`/teacher/courses/${course._id}/gradebook`);
    await until(() => evaluate("Boolean(document.querySelector('tbody .assessment-status.is-failed'))"), 'Gradebook failing result is not red');
    sessionId = studentSession;
    await navigate(`/courses/${course._id}/learn`);
    await until(() => evaluate("document.querySelector('.assessment-status.is-failed')?.textContent === 'Not passed'"), 'Student failed result missing');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.assessment-status.is-failed')).color"), 'rgb(185, 28, 28)');
    sessionId = teacherSession;
    await navigate(`/teacher/assignments/${assignment._id}/submissions`);
    await until(async () => (await text()).includes('View / Grade'), 'Could not reopen submission');
    await clickText('View / Grade'); await until(async () => await savedBadge() === 'Not passed', 'Persisted failure missing on reload');
    await setValue('input[type=number]', '8'); await clickText('Save Grade and Feedback');
    await until(async () => await savedBadge() === 'Passed', 'Passed result not updated after save');
    await fill('textarea', 'Good work'); await clickText('Save Feedback Only');
    await until(() => evaluate("[...document.querySelectorAll('.toast.success')].some(t => t.textContent.includes('Feedback saved'))"), 'Feedback save toast missing');
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Submission details\"]').textContent.includes('student@browser.test')"), true);
    sessionId = studentSession;
    await clickText('View submission');
    await until(() => evaluate("Boolean(document.querySelector('[role=dialog]'))"), 'Student submission did not open');
    await clickText('Refresh feedback');
    await until(() => evaluate("document.querySelector('[role=dialog]').textContent.includes('Good work')"), 'Fresh instructor feedback missing');
    await evaluate("document.querySelector('[aria-label=\"Close assignment\"]').click()");
    await clickText('Refresh progress');
    await until(() => evaluate("document.querySelector('[aria-label=\"Course progress\"]').textContent.includes('All requirements met')"), 'Student progress did not refresh');
    await navigate('/dashboard');
    await until(async () => (await text()).includes('Overall Learning Progress'), 'Overall progress missing');
    assert.equal((await text()).includes('Progress is not a final grade'), true);
    sessionId = teacherSession;
    fs.writeFileSync(path.join(output, 'assignment-grading.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    assert.equal(await evaluate("document.querySelector('.assessment-header a')?.textContent.includes('Open Course Gradebook')"), true);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.assessment-header a')).backgroundColor"), 'rgb(30, 41, 59)');
    await evaluate("document.querySelector('.assessment-header a').click()");
    await until(() => evaluate("location.pathname.endsWith('/gradebook')"), 'Header Gradebook button did not navigate');
    await until(async () => (await text()).includes('8/10') && (await text()).includes('Requirements met'), 'Unified Gradebook did not render');
    assert.equal((await text()).includes('Final Grade Policy'), false);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(output, 'gradebook.png'), Buffer.from(screenshot.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    fs.writeFileSync(path.join(output, 'gradebook-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await clickText('Download Report (PDF)');
    const filename = `grade-report-${course._id}.pdf`;
    await until(() => fs.existsSync(path.join(output, filename)), 'PDF download did not complete', 45000);
    assert.equal(fs.readFileSync(path.join(output, filename)).subarray(0, 4).toString(), '%PDF');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: 'Chrome headless', login: true, sectionCreated: true, gradeSaved: true, gradebookVerified: true, pdfDownloaded: true, runtimeErrors: errors.length, output: 'outputs/iteration3-thai' }));
  } catch (error) {
    console.error(`Browser smoke failed: ${error.message}`);
    throw error;
  } finally {
    ws?.close(); if (chrome) chrome.kill(); if (vite) await Promise.race([vite.close(), delay(5000)]);
    if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
    if (mongoose.connection.readyState === 1) {
      for (const model of ['Assignment','AssignmentSubmission']) for (const item of await mongoose.model(model).find({ 'attachment.storageKey': { $exists: true } }).lean()) {
        const filename = item.attachment.storageKey;
        if (/^\d{13}-[a-f0-9]{24}\.(pdf|doc|docx)$/.test(filename)) { const target = path.join(backend, 'uploads/assignment-documents', filename); if (fs.existsSync(target)) fs.unlinkSync(target); }
      }
      await mongoose.connection.dropDatabase(); await mongoose.disconnect();
    }
    for (const filename of testFiles) if (fs.existsSync(filename)) fs.unlinkSync(filename);
    if (mongo) await mongo.stop();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

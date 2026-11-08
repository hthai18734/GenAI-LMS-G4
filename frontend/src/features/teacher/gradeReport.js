import { assessmentStatus } from '../../shared/assessment/status.js';
export const assessmentStateLabel = state => assessmentStatus(state).label;
export function gradeReportRows(report) {
  return report.rows.map(row => [row.student.fullName || row.student.id, row.student.email || '',
    `${row.result.byType.LESSON.completed}/${row.result.byType.LESSON.total}`,
    ...row.cells.map(c => c.score == null ? assessmentStateLabel(c.state) : `${c.score}/${c.maxScore} — ${assessmentStateLabel(c.state)}`),
    row.result.eligibleToComplete ? 'Requirements met' : 'Incomplete', row.result.remainingActivities.join('; ') || '—']);
}
export async function exportGradePdf(report) {
  const { default: html2pdf } = await import('html2pdf.js');
  const host = document.createElement('article');
  host.style.cssText = 'font-family:Arial,sans-serif;font-size:10px;padding:16px;color:#15182d;background:white';
  const title = document.createElement('h1'); title.textContent = `Grade Report — ${report.course.title}`; host.append(title);
  const note = document.createElement('p'); note.textContent = `Generated ${new Date(report.generatedAt).toLocaleString()} · Latest submitted scores. Completion requires all lessons/videos and passing every quiz/assignment. Missing grades are not zero.`; host.append(note);
  const table = document.createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed';
  const appendRow = (values, header = false) => { const tr = document.createElement('tr'); for (const value of values) { const cell = document.createElement(header ? 'th' : 'td'); cell.textContent = String(value); cell.style.cssText = 'border:1px solid #ddd;padding:5px;overflow-wrap:anywhere;vertical-align:top'; tr.append(cell); } table.append(tr); };
  appendRow(['Student', 'Email', 'Lessons / Videos', ...report.assessments.map(a => a.title), 'Course completion', 'Remaining requirements'], true);
  gradeReportRows(report).forEach(row => appendRow(row)); host.append(table);
  if (!report.rows.length) { const empty = document.createElement('p'); empty.textContent = 'No enrolled students.'; host.append(empty); }
  // Existing PDF dependency; textContent keeps actor-supplied content inert.
  // https://ekoopmans.github.io/html2pdf.js/#usage
  await html2pdf().set({ filename: `grade-report-${report.course.id}.pdf`, margin: 8, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } }).from(host).save();
}

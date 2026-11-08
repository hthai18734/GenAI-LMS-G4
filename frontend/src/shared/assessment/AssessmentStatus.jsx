import { assessmentStatus } from './status.js';

export default function AssessmentStatus({ status }) {
  const { label, className } = assessmentStatus(status);
  return <span className={`assessment-status ${className}`}>{label}</span>;
}

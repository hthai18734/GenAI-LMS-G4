import React, { useCallback, useEffect, useState } from 'react';
import { studentService } from '../features/student/api.js';
import { useToast } from '../components/toastContext';

const PREF_INFO_MAP = {
  email: {
    icon: '📧',
    label: 'Email Digests',
    description: 'Receive learning progress summaries and important updates by email.',
  },
  course_update: {
    icon: '📚',
    label: 'Course & Lesson Updates',
    description: 'Get notified when new lessons, resources, or assignments are published.',
  },
  'Course & Lesson Updates': {
    icon: '📚',
    label: 'Course & Lesson Updates',
    description: 'Get notified when new lessons, resources, or assignments are published.',
  },
  enrollment: {
    icon: '🎓',
    label: 'Enrollment Confirmation',
    description: 'Receive confirmation when you enroll in or complete a course.',
  },
  system: {
    icon: '⚙️',
    label: 'System & Security Notifications',
    description: 'Receive unusual sign-in alerts, maintenance notices, and important platform updates.',
  },
  system_announcement: {
    icon: '📢',
    label: 'System & Platform Notifications',
    description: 'Get updates about new features, maintenance, and learning policies.',
  },
  assignment_reminder: {
    icon: '⏰',
    label: 'Task & Assignment Reminders',
    description: 'Receive reminders about assignment deadlines and lesson milestones.',
  },
  discussion_reply: {
    icon: '💬',
    label: 'Discussion Replies',
    description: 'Get notified when a teacher or classmate replies to your question.',
  },
};

const PREF_ORDER = ['course_update', 'email', 'enrollment', 'system'];

export default function SettingsPage() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingType, setTestingType] = useState(null);
  const { addToast } = useToast();

  const handleTestNotification = async (type) => {
    const current = preferences.find((p) => p.type === type);
    const label = PREF_INFO_MAP[type]?.label || type;
    if (!current?.enabled) {
      addToast(
        `⚠️ Cannot send test: "${label}" is currently DISABLED. Turn ON the switch first to receive notifications.`,
        'warning'
      );
      return;
    }
    setTestingType(type);
    try {
      const res = await studentService.sendTestNotification(type);
      addToast(
        res.message || `Test notification sent for "${label}"! Check the bell icon in top bar.`,
        'success'
      );
      window.dispatchEvent(new Event('notification-updated'));
    } catch (err) {
      addToast(err.message || 'Unable to send test notification.', 'error');
    } finally {
      setTestingType(null);
    }
  };

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentService.getNotificationPreferences();
      const raw = res.data?.preferences || [];
      const sorted = [...raw].sort((a, b) => {
        const idxA = PREF_ORDER.indexOf(a.type);
        const idxB = PREF_ORDER.indexOf(b.type);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
      setPreferences(sorted);
    } catch (err) {
      addToast(err.message || 'Unable to load notification settings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void Promise.resolve().then(fetchPreferences);
  }, [fetchPreferences]);

  const handleToggle = async (type) => {
    const prevPreferences = [...preferences];
    const updated = preferences.map((item) =>
      item.type === type ? { ...item, enabled: !item.enabled } : item
    );
    setPreferences(updated);
    const target = updated.find((p) => p.type === type);
    const isNowEnabled = target?.enabled;
    const label = PREF_INFO_MAP[type]?.label || type;

    try {
      await studentService.updateNotificationPreferences(updated);
      addToast(
        isNowEnabled
          ? `✓ Active: Notifications for "${label}" are now ENABLED.`
          : `✕ Inactive: Notifications for "${label}" are now DISABLED.`,
        isNowEnabled ? 'success' : 'info'
      );
    } catch (err) {
      addToast(err.message || 'Unable to update setting.', 'error');
      setPreferences(prevPreferences);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await studentService.updateNotificationPreferences(preferences);
      addToast('All notification preferences saved and active!', 'success');
    } catch (err) {
      addToast(err.message || 'Unable to update settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title" style={{ margin: '0 0 6px', fontSize: '22px' }}>
          Notification Settings & Learning Preferences
        </h2>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
          Choose your notification channels and preferences for a better learning experience
        </p>
      </div>

      {/* Balanced 2-Column Grid */}
      <div className="settings-grid-layout">
        {/* Left Column: Notification Toggles Form */}
        <div>
          <form onSubmit={handleSave}>
            <div className="profile-card-panel">
              <h3 className="profile-card-title">
                <span>🔔</span> Event Notification Preferences
              </h3>

              <div className="pref-list" style={{ marginBottom: '24px' }}>
                {preferences.map((pref) => {
                  const info = PREF_INFO_MAP[pref.type] || {
                    icon: '📌',
                    label: pref.type,
                    description: 'System notification preference',
                  };

                  return (
                    <div
                      key={pref.type}
                      className="pref-item"
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: pref.enabled ? '1px solid #eeeef6' : '1px dashed #e2e1ec',
                        background: pref.enabled ? '#ffffff' : '#fafafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        transition: 'all .2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: pref.enabled ? '#f4f3ff' : '#f3f4f6',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '20px',
                            flexShrink: 0,
                            filter: pref.enabled ? 'none' : 'grayscale(1)',
                            opacity: pref.enabled ? 1 : 0.7,
                          }}
                        >
                          {info.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="pref-label" style={{ fontSize: '15px', color: pref.enabled ? 'var(--ink)' : '#6b7280', fontWeight: 600 }}>
                              {info.label}
                            </span>
                            {pref.enabled ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  background: '#ecfdf5',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                                Active
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#b91c1c',
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="pref-desc" style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.5 }}>
                            {info.description}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-test-noti"
                          onClick={() => handleTestNotification(pref.type)}
                          disabled={testingType === pref.type}
                          style={
                            pref.enabled
                              ? {}
                              : {
                                  background: '#f3f4f6',
                                  borderColor: '#e5e7eb',
                                  color: '#9ca3af',
                                  cursor: 'not-allowed',
                                }
                          }
                          title={
                            pref.enabled
                              ? `Send test notification: "${info.label}"`
                              : `"${info.label}" is turned OFF. Turn ON switch to enable test notifications.`
                          }
                        >
                          {testingType === pref.type
                            ? 'Sending...'
                            : pref.enabled
                            ? '🔔 Send Test'
                            : '🔕 Send Test (Disabled)'}
                        </button>
                        <label className="toggle" style={{ flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={pref.enabled}
                            onChange={() => handleToggle(pref.type)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f0eff9' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {saving ? 'Saving settings...' : 'Save Notification Settings'}
                </button>
                <button
                  type="button"
                  onClick={fetchPreferences}
                  className="btn btn-secondary"
                >
                  Reset
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Tips & Channels Cards */}
        <div>
          <div className="side-info-card">
            <h4>
              <span>📬</span> Notification Channels
            </h4>
            <p style={{ marginBottom: '12px' }}>
              AI-LMS sends notifications through two main channels:
            </p>
            <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
              <li><strong>Email:</strong> Receive automated emails for new lessons or certificates.</li>
              <li><strong>In-app notifications:</strong> Check the notification bell in the top-right corner while learning.</li>
            </ul>
          </div>

          <div className="side-info-card" style={{ background: '#f8f7ff', border: '1px dashed #c7d2fe' }}>
            <h4 style={{ color: '#4338ca' }}>
              <span>💡</span> Learning Tips
            </h4>
            <p>
              Enable <strong>Course & Lesson Updates</strong> to keep up with important resources and maintain your learning progress toward a certificate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

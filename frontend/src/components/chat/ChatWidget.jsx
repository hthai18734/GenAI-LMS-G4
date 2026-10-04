import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../services/AuthContext';
import { chatService } from '../../services/chatService';
import { useChatContext } from './useChatContext';
import './chat.css';
import ChatLearningTools from './ChatLearningTools';
const ChatAnswer = lazy(() => import('./ChatAnswer'));

export default function ChatWidget() {
  const { user } = useAuth();
  const { lesson } = useChatContext();
  return (
    <ChatSession
      key={`${user?.id || user?._id}:${user?.role}:${lesson?.lessonId || 'general'}`}
      lesson={lesson}
      role={user?.role}
    />
  );
}

function ChatSession({ lesson, role }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [history, setHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState(null);
  const [style, setStyle] = useState('friendly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(null);
  const [activeTool, setActiveTool] = useState('');
  const abort = useRef(null);
  const mounted = useRef(true);
  const inputRef = useRef(null);
  const launcher = useRef(null);
  const endRef = useRef(null);
  const busyRef = useRef(false);
  const panelRef = useRef(null);
  const answerRef = useRef(null);
  const dragRef = useRef(null);
  const roles = {
    student: 'Gia sư học tập',
    teacher: 'Trợ lý giảng dạy',
    admin: 'Trợ lý nội dung',
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (activeTool) return;
    if (pending) endRef.current?.scrollIntoView({ block: 'nearest' });
    else answerRef.current?.scrollIntoView({ block: 'start' });
  }, [conversation?.turns?.length, pending, activeTool]);

  function quickAction(mode, selectedStyle = style) {
    if (
      !(conversation ? conversation.lessonId : lesson?.lessonId) &&
      !conversation?.documents?.length
    ) {
      setError('Hãy mở một bài học hoặc đính kèm tài liệu để dùng thao tác này.');
      return;
    }
    const question =
      mode === 'summary'
        ? 'Tóm tắt bài học và tài liệu đang chọn.'
        : 'Rút ra các ý chính cần ghi nhớ từ bài học và tài liệu đang chọn.';
    send({ text: question, mode, style: selectedStyle, requestId: crypto.randomUUID() });
  }

  function resizeStart(event) {
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function resizeMove(event) {
    if (!dragRef.current) return;
    const start = dragRef.current;
    setSize({
      width: Math.max(360, Math.min(window.innerWidth - 48, start.width + start.x - event.clientX)),
      height: Math.max(
        460,
        Math.min(window.innerHeight - 40, start.height + start.y - event.clientY),
      ),
    });
  }

  async function run(work) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    try {
      await work(controller.signal);
    } catch (err) {
      if (mounted.current && err.name !== 'AbortError')
        setError(err.message || 'Không thể kết nối chat.');
    } finally {
      if (mounted.current) {
        busyRef.current = false;
        setBusy(false);
        setPending(null);
      }
    }
  }
  async function refreshHistory(signal, more = false) {
    const result = await chatService.list({}, more ? nextCursor : null, signal);
    if (mounted.current) {
      setHistory((previous) =>
        more ? [...previous, ...(result.data?.items || [])] : result.data?.items || [],
      );
      setNextCursor(result.data?.nextCursor || null);
    }
  }
  function toggle() {
    if (!open) {
      setOpen(true);
      run(refreshHistory);
    } else close();
  }
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  async function ensureConversation(signal) {
    if (conversation) return conversation;
    const result = await chatService.create(
      lesson ? { courseId: lesson.courseId, lessonId: lesson.lessonId } : {},
      signal,
    );
    if (mounted.current) setConversation(result.data);
    return result.data;
  }
  async function send(retry) {
    const question = text.trim();
    if (!retry && !question) return;
    const payload = retry || { text: question, mode: 'ask', style, requestId: crypto.randomUUID() };
    await run(async (signal) => {
      setPending(payload.text);
      setFailed(payload);
      const current = await ensureConversation(signal);
      const result = await chatService.send(current.id, payload, signal);
      if (!mounted.current) return;
      setConversation((previous) => ({
        ...current,
        ...previous,
        turns: [
          ...(previous?.turns || current.turns || []).filter(
            (t) => t.requestId !== payload.requestId,
          ),
          result.data,
        ],
      }));
      if (!retry) setText('');
      setFailed(null);
      await refreshHistory(signal);
      if (!activeTool) inputRef.current?.focus();
    });
  }
  function selectHistory(id) {
    run(async (signal) => {
      if (!id) {
        setConversation(null);
        setFailed(null);
        return;
      }
      const result = await chatService.get(id, signal);
      if (mounted.current) {
        setConversation(result.data);
        setFailed(null);
      }
    });
  }
  function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Tài liệu không được vượt quá 10 MB.');
      return;
    }
    run(async (signal) => {
      const current = await ensureConversation(signal);
      const result = await chatService.upload(current.id, file, signal);
      if (mounted.current)
        setConversation((previous) => ({
          ...current,
          ...previous,
          documents: [...(previous?.documents || current.documents || []), result.data],
        }));
      await refreshHistory(signal);
    });
  }
  const contextLabel = conversation
    ? conversation.lessonId
      ? String(conversation.lessonId) === String(lesson?.lessonId)
        ? `Đang đọc: ${lesson.title}`
        : 'Đang dùng bài học gắn với hội thoại đã chọn'
      : 'Hội thoại chung · Hỏi về học tập hoặc đính kèm tài liệu'
    : lesson
      ? `Đang đọc: ${lesson.title}`
      : 'Hỏi về học tập hoặc đính kèm tài liệu';

  return (
    <div className="ai-chat-root">
      {open && (
        <section
          ref={panelRef}
          style={!expanded && size ? { width: size.width, height: size.height } : undefined}
          className={`ai-chat-panel ${expanded ? 'ai-chat-expanded' : ''} ${!activeTool ? 'ai-chat-general' : ''}`}
          role="dialog"
          aria-label="Trợ lý AI-LMS"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          {!expanded && (
            <div
              className="ai-chat-resize"
              title="Kéo để đổi kích thước"
              aria-hidden="true"
              onPointerDown={resizeStart}
              onPointerMove={resizeMove}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            />
          )}
          <header className="ai-chat-header">
            <div>
              <strong>Trợ lý AI-LMS</strong>
              <small>{roles[role]}</small>
            </div>
            <div className="ai-chat-window-actions">
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? 'Thu gọn cửa sổ' : 'Mở rộng cửa sổ'}
                title={expanded ? 'Thu gọn' : 'Mở rộng để đọc'}
              >
                {expanded ? '↙' : '⛶'}
              </button>
              <button type="button" onClick={close} aria-label="Đóng chat">
                ×
              </button>
            </div>
          </header>
          <div className="ai-chat-context">{contextLabel}</div>
          <div className="ai-chat-history">
            <select
              aria-label="Lịch sử trò chuyện"
              title="Tất cả hội thoại của bạn"
              value={conversation?.id || ''}
              disabled={busy}
              onChange={(e) => selectHistory(e.target.value)}
            >
              <option value="">Cuộc trò chuyện mới</option>
              {conversation && !history.some((c) => c.id === conversation.id) && (
                <option value={conversation.id}>{conversation.title}</option>
              )}
              {history.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.lessonId ? '[Bài học]' : '[Chat chung]'} {item.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !conversation}
              onClick={() => selectHistory('')}
              title="Cuộc trò chuyện mới"
            >
              ＋ Mới
            </button>
            <button
              type="button"
              disabled={busy || !conversation}
              onClick={() => {
                if (!window.confirm('Xóa cuộc trò chuyện và các tài liệu đính kèm?')) return;
                run(async (signal) => {
                  await chatService.remove(conversation.id, signal);
                  if (mounted.current) {
                    setConversation(null);
                    setFailed(null);
                  }
                  await refreshHistory(signal);
                });
              }}
              aria-label="Xóa cuộc trò chuyện"
            >
              Xóa
            </button>
          </div>
          {nextCursor && (
            <button
              type="button"
              className="ai-chat-load-more"
              disabled={busy}
              onClick={() => run((signal) => refreshHistory(signal, true))}
            >
              Tải thêm lịch sử
            </button>
          )}
          <ChatLearningTools
            busy={busy}
            onSend={send}
            style={style}
            mode={activeTool}
            onModeChange={setActiveTool}
            turns={conversation?.turns || []}
          />
          {!activeTool && (
            <div
              className="ai-chat-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {!conversation?.turns?.length && !pending && (
                <div className="ai-chat-welcome">
                  <strong>Tôi có thể giúp gì?</strong>
                  <p>
                    Đặt câu hỏi hoặc nhấn Tóm tắt / Rút ý chính bên dưới để thực hiện ngay, không
                    cần nhập câu hỏi.
                  </p>
                </div>
              )}
              {(conversation?.turns || []).map((turn, index) => (
                <div key={turn.requestId} className="ai-chat-turn">
                  <div className="ai-chat-user">
                    <small>Bạn</small>
                    {turn.question}
                  </div>
                  <div
                    ref={index === conversation.turns.length - 1 ? answerRef : undefined}
                    className="ai-chat-answer"
                  >
                    <small>Trợ lý AI</small>
                    <Suspense fallback={<p>Đang định dạng câu trả lời…</p>}>
                      <ChatAnswer text={turn.answer} />
                    </Suspense>
                  </div>
                </div>
              ))}
              {pending && (
                <div className="ai-chat-user">
                  <small>Bạn</small>
                  {pending}
                </div>
              )}
              {busy && (
                <p className="ai-chat-status" role="status">
                  Đang xử lý…
                </p>
              )}
              <div ref={endRef} />
            </div>
          )}
          {!activeTool && (
            <div className="ai-chat-documents">
              {(conversation?.documents || []).map((doc) => (
                <span key={doc.id} title={doc.name}>
                  {doc.name}
                  <button
                    disabled={busy}
                    aria-label={`Bỏ tài liệu ${doc.name}`}
                    onClick={() =>
                      run(async (signal) => {
                        await chatService.removeDocument(conversation.id, doc.id, signal);
                        if (mounted.current)
                          setConversation((current) => ({
                            ...current,
                            documents: current.documents.filter((d) => d.id !== doc.id),
                          }));
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {error && (
            <div className="ai-chat-error" role="alert">
              {error}
              {failed && (
                <button disabled={busy} onClick={() => send(failed)}>
                  Thử gửi lại
                </button>
              )}
            </div>
          )}
          {!activeTool && (
            <form
              className="ai-chat-compose"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <div className="ai-chat-options">
                <button type="button" disabled={busy} onClick={() => quickAction('summary')}>
                  Tóm tắt ngay
                </button>
                <button type="button" disabled={busy} onClick={() => quickAction('keypoints')}>
                  Rút ý chính
                </button>
                <label>
                  Văn phong
                  <select
                    aria-label="Văn phong"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    disabled={busy}
                  >
                    <option value="friendly">Dễ hiểu</option>
                    <option value="concise">Ngắn gọn</option>
                    <option value="academic">Học thuật</option>
                  </select>
                </label>
              </div>
              {conversation?.turns?.length > 0 && (
                <button
                  className="ai-chat-rewrite"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    send({
                      text: 'Viết lại câu trả lời gần nhất theo văn phong đã chọn, giữ nguyên ý nghĩa và nguồn.',
                      mode: 'ask',
                      style,
                      requestId: crypto.randomUUID(),
                    })
                  }
                >
                  Viết lại câu trả lời theo văn phong đã chọn
                </button>
              )}
              <textarea
                ref={inputRef}
                value={text}
                maxLength={4000}
                rows={1}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                placeholder="Hỏi thêm về bài học…"
                aria-label="Câu hỏi cho AI"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <div className="ai-chat-actions">
                <label className={`ai-chat-upload ${busy ? 'ai-chat-disabled' : ''}`}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    disabled={busy || (conversation?.documents?.length || 0) >= 3}
                    onChange={upload}
                    aria-label="Đính kèm tài liệu"
                  />
                  <span>＋ Tài liệu</span>
                </label>
                <small>{text.length}/4000</small>
                <button className="ai-chat-send" type="submit" disabled={busy || !text.trim()}>
                  Gửi ↗
                </button>
              </div>
              <details className="ai-chat-notice">
                <summary>Tài liệu & quyền riêng tư</summary>PDF, Word, TXT, MD · tối đa 10 MB/file,
                3 file. Nội dung bài học và file được gửi tới Gemini khi bạn gửi câu hỏi hoặc dùng
                thao tác nhanh. AI có thể trả lời sai.
              </details>
            </form>
          )}
        </section>
      )}
      <button
        hidden={open}
        ref={launcher}
        type="button"
        className="ai-chat-launcher"
        onClick={toggle}
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          width="25"
          height="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
          <path d="M8 11h8M8 15h5" />
        </svg>
        <span>Hỏi AI</span>
      </button>
    </div>
  );
}

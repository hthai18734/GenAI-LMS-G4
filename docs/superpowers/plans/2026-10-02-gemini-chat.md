# Gemini Chat Implementation Plan

> Use superpowers:executing-plans. Execution: directly in the existing workspace as requested by the user; preserve their existing changes.

**Goal:** Deliver authenticated AI chat bubble, lesson context, private documents and model fallback.
**Architecture:** Add chat routes/controller/DTO/service/DAO/model and React chat components; reuse AuthFilter, ResponseUtil, ServiceError and api.js.
**Tech Stack:** Express, Mongoose, React, Gemini REST API; mammoth for DOCX and word-extractor for DOC in a bounded worker.
**Spec:** ../specs/2026-10-02-gemini-chat-design.md

## Constraints and implementation refinements

- Keep current API contracts, course models and authentication unchanged.
- Documents use a private MongoDB collection (one document per file, 10 MB maximum), rather than disk; conversation embeds at most 40 message pairs. No public attachment URL.
- Up to 3 attachments, 4,000-character questions, 80,000 extracted characters/file, 120,000 total source characters; reject excessive text rather than silently truncating sources.
- Atomic per-conversation lease serializes send/upload/delete; request IDs prevent duplicate sends. Lease exceeds total provider timeout budget.
- Check lesson authorization again when reading or sending saved conversation; roles come from AuthFilter.
- Gemini/Gemma capability differences must not discard system policy or send PDFs to text-only fallbacks.

## Tasks

- [x] 1. Write authorization/validation and provider tests; run to establish missing behavior. Implement ChatContextService, ChatDTO, ChatPrompt and model compatibility.
- [x] 2. Implement private Conversation/Document models, ChatDAO, ChatService, controller and routes. Test owner isolation, unauthorized context, duplicate sends, error/lock release and bounded history using injected dependencies.
- [x] 3. Add parsers and upload middleware with MIME/signature/size validation, worker timeout/memory limits and DOCX expansion bound. Test real minimal fixtures, invalid formats and oversized inputs.
- [x] 4. Add ChatProvider, ChatWidget/CSS, chatService. Mount in authenticated Layout; CourseLearnPage publishes current lesson IDs. Provide history, deletion, attach/remove files, modes/styles, error/retry and keyboard/mobile support.
- [x] 5. Run backend suite, frontend build/lint and focused HTTP integration checks. Check current Gemini configuration with a small authorized live request if network permits. Document limitations and usage without secrets.

## Review focus

- Switching accounts/lessons while a request is pending: cancel client work and discard stale responses.
- Upload/delete during generation: serialize with lease, release on failure.
- Requests for another user's conversation/document: return 404 and never call provider.
- Changing permissions after a conversation exists: re-check access before returning stored lesson content.
- Provider quota, unsupported document model, safety refusal and invalid key: distinguish fallback from errors and never loop indefinitely.

## Verification commands

`npm --prefix backend test`, `npm --prefix frontend run build`, `npm --prefix frontend run lint`, `git diff --check`.

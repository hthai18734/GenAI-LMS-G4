# Thiết kế chat Gemini cho AI-LMS

Trạng thái: đã triển khai theo yêu cầu tiếp tục của người dùng. Chi tiết vận hành và các giới hạn thực tế: ../../gemini-chat.md. Kế hoạch triển khai ghi rõ các điều chỉnh về lưu file trong MongoDB và lịch sử nhúng trong hội thoại.

## Mục tiêu

Chatbox cho student, teacher và admin, trả lời theo vai trò và văn phong, hỏi đáp bài học hiện tại, tóm tắt tài liệu và rút ý chính. Hỗ trợ PDF, DOC, DOCX, TXT và Markdown. Giữ kiến trúc và các API hiện có.

## Khảo sát cấu trúc

- Backend: Express/CommonJS, MongoDB/Mongoose; routes → AuthFilter/RoleFilter → controller → DTO/service → DAO/model. ResponseUtil và ServiceError quy định response/lỗi. Có node:test.
- AuthFilter xác minh JWT rồi tải người dùng hiện tại từ database. Vai trò hợp lệ: student, teacher, admin. Không tin role gửi từ client.
- Model learning/Course là schema thống nhất; content/Course chỉ re-export. Không tạo thêm schema Course.
- Lesson có courseId, title, content, order, duration; chưa có trường tài liệu đính kèm.
- StudentController.getCourseLessons chấp nhận enrollment active hoặc completed. Teacher CourseService kiểm tra teacherId. CourseDAO loại course đã soft-delete.
- Upload hiện có dành cho ảnh; /uploads được phục vụ công khai. ErrorFilter có thông báo LIMIT_FILE_SIZE dành riêng cho ảnh. Chat cần upload riêng và chuyển đổi lỗi riêng.
- Frontend: React/Vite, React Router, AuthContext, ProtectedRoute; Layout dùng chung ba vai trò. CourseLearnPage giữ currentLesson trong state. services/api.js đã xử lý bearer token, FormData và 401.
- Giao diện dùng CSS chung với biến màu; chat dùng CSS có tiền tố riêng. Vite đã proxy /api.
- Có giao diện auth HTML trong backend; chat tích hợp vào React portal, không thay thế auth HTML.
- Hai package-lock.json đã có thay đổi trước nhiệm vụ; cần giữ nguyên thay đổi của người dùng.

## Các phương án

1. **Đề xuất:** module chat riêng trong backend hiện tại, lấy lesson theo quyền, xử lý tài liệu riêng, gọi Gemini với ngữ cảnh có giới hạn. Không cần dịch vụ database mới.
2. Gemini File Search hoặc hệ thống retrieval/vector: phù hợp kho tài liệu lớn, nhưng cần thêm vòng đời index, đồng bộ và kiểm soát quyền tìm kiếm. Để giai đoạn sau.
3. Chỉ chat và tải file trực tiếp từ frontend: ít code hơn nhưng không đáp ứng kiểm soát quyền và bảo vệ API key; không chọn.

## Phạm vi và hành vi

- Nút chat nổi trong Layout, responsive, mở/đóng bằng bàn phím; hiển thị trạng thái gửi, lỗi và thử lại.
- Trong CourseLearnPage, chat nhận ID và nhãn lesson đang chọn qua context dùng chung; backend tự tải nội dung. Khi đổi lesson, tách cuộc trò chuyện để tránh trộn ngữ cảnh.
- Có thao tác Hỏi đáp, Tóm tắt, Rút ý chính; tùy chọn văn phong Dễ hiểu, Ngắn gọn, Học thuật. Mặc định tiếng Việt.
- Student: giải thích từng bước và ví dụ; teacher: giải thích chuyên môn và gợi ý giảng dạy; admin: tóm tắt có cấu trúc và nhận xét nội dung.
- Chủ đề bám lesson hoặc tài liệu đã chọn. Khi chưa chọn nguồn, chỉ hỗ trợ chủ đề học tập/giảng dạy/LMS, không tuyên bố đã đọc dữ liệu chưa được cung cấp.
- Hiển thị tên nguồn; với PDF có thể yêu cầu dẫn trang nhưng không cam kết mọi trích dẫn của mô hình đều chính xác. Nếu thiếu nội dung thì trả lời rõ giới hạn.
- Chat không có quyền thay đổi điểm, tài khoản, vai trò hay nội dung course.
- Lưu hội thoại theo chủ sở hữu trong MongoDB; có tạo, xem lịch sử và xóa hội thoại. Không chia sẻ lịch sử với người dùng khác, kể cả admin.

## Quyền truy cập

- Mọi endpoint chat đi qua AuthFilter và RoleFilter.
- Student đọc lesson của course có enrollment active/completed; dropped hoặc chưa đăng ký bị từ chối.
- Teacher đọc lesson trong course mình sở hữu, dùng teacherId như CourseService hiện tại.
- Admin đọc lesson của course chưa bị xóa theo phạm vi kiểm duyệt nội dung.
- Xác minh lesson thuộc course, course chưa soft-delete, và quyền hiện tại ở mỗi lượt gửi; không chỉ kiểm tra lúc tạo hội thoại.
- File và hội thoại truy vấn kèm ownerId. Khi quyền lesson không còn hợp lệ, không trả lịch sử có chứa nội dung lesson đó.
- Nội dung file/lesson là dữ liệu, không phải chỉ dẫn có thể sửa system instruction. Quyền truy cập được bảo đảm bằng code trước khi gọi Gemini.

## Tài liệu

- Giới hạn đề xuất: mỗi file 10 MB, tối đa 3 file mỗi hội thoại; câu hỏi 4.000 ký tự; giới hạn tổng context và số lượt lịch sử gửi tới Gemini.
- PDF gửi dạng PDF cho Gemini để hỗ trợ cả trang scan. DOC/DOCX trích văn bản bằng parser chuyên dụng; TXT/MD đọc UTF-8. Không coi DOC nhị phân là DOCX hoặc plain text.
- Kiểm tra phần mở rộng, MIME và chữ ký định dạng; từ chối file lỗi, mã hóa hoặc không hỗ trợ với thông báo cụ thể.
- Parser chạy có timeout và giới hạn đầu ra/bộ nhớ; chống tài liệu nén bung quá lớn. Không thực thi macro hoặc tải URL nhúng.
- Lưu file trong collection MongoDB riêng tư, dùng ObjectId; metadata giữ tên gốc đã chuẩn hóa. Không tạo URL hoặc đường dẫn public cho tài liệu.
- Xóa hội thoại sẽ xóa file liên quan; dọn file lỗi/upload chưa được gắn với hội thoại. Tài liệu chỉ được gửi sang Gemini khi người dùng yêu cầu xử lý, với mô tả rõ trong giao diện tải file.
- Không bổ sung định dạng ngoài danh sách trên một cách ngầm định; có thể mở rộng bằng adapter sau.

## Thành phần và API đề xuất

- backend/src/routes/chatRoutes.js: /api/chat và /api/v1/chat.
- controller/chat/ChatController.js, dto/chat/*: validate dữ liệu, response theo chuẩn hiện tại.
- service/chat/ChatService.js: orchestration, ownership, hội thoại và context.
- service/chat/ChatContextService.js: kiểm tra quyền course/lesson, tải đúng nguồn.
- utils/ai/GeminiClient.js và ChatPrompt.js: gọi Gemini, system instruction theo role/style/mode, ánh xạ lỗi.
- utils/upload/ChatDocumentUpload.js, utils/document/*: upload và xử lý từng định dạng.
- dao/chat/*, model/chat/*: ChatConversation, ChatMessage, ChatDocument; không sửa schema course/lesson hiện tại.
- GET/POST /conversations; GET/DELETE /conversations/:id; POST /conversations/:id/documents; DELETE /conversations/:id/documents/:documentId; POST /conversations/:id/messages.
- Message nhận text, mode và style; nguồn được gắn với conversation phía server. Không chấp nhận system instruction hoặc assistant history tự do từ client.
- Ghi cặp user/assistant thành công nhất quán; khóa một lượt đang xử lý mỗi hội thoại, chống gửi trùng bằng request ID. Lỗi provider không tạo câu trả lời giả trong lịch sử.
- Frontend thêm components/chat, services/chatService.js và ChatContext; gắn provider/widget vào Layout; CourseLearnPage cung cấp/thu hồi context qua effect.

## Cấu hình và lỗi

- GEMINI_API_KEY chỉ ở backend/.env; GEMINI_MODEL cấu hình được và được chọn theo tài liệu Google tại thời điểm triển khai. Thêm file cấu hình mẫu không chứa secret.
- Nếu thiếu key: ứng dụng hiện tại vẫn khởi động; chat báo chưa cấu hình qua lỗi 503.
- Giới hạn tốc độ theo tài khoản, giới hạn request đồng thời và timeout provider; không tự retry vô hạn khi hết quota.
- Không trả raw provider error, key, nội dung tài liệu hoặc prompt vào log.
- Không stream ở bản đầu: response nguyên vẹn qua API client sẵn có; UI có trạng thái đang trả lời.

## Kiểm chứng trước bàn giao

- Chạy baseline backend tests và frontend build/lint, phân biệt lỗi có sẵn.
- Test ma trận role/enrollment/ownership, ID giả, course đã xóa và đổi quyền giữa các lượt; xác nhận request bị từ chối không gọi Gemini.
- Test upload DOC/DOCX/PDF/TXT/MD thực tế, sai định dạng, file lỗi/quá lớn; cleanup và quyền file.
- Mock Gemini để test prompt theo role/style, context đúng lesson, summary/key points, timeout/quota/thiếu key và phản hồi rỗng.
- Test hội thoại riêng tư, gửi trùng/đồng thời, chuyển lesson, đổi tài khoản, xóa và thử lại.
- Build/lint frontend; kiểm tra chat trên mobile/desktop và bàn phím. Gọi Gemini thật chỉ khi có key cấu hình hợp lệ; báo rõ nếu chưa kiểm chứng được API thật.

## Tài liệu tham khảo

- Google Gemini document understanding: https://ai.google.dev/gemini-api/docs/document-processing

## Giả định cần xác nhận

Đã dùng văn phong và chủ đề mặc định trên, lịch sử MongoDB và năm định dạng đã liệt kê. Tham khảo tài liệu vận hành để biết giới hạn đã triển khai.

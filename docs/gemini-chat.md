# Chat AI-LMS

## Sử dụng

1. Cấu hình `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` trong `backend/.env`; xem `backend/.env.chat.example`. Cấu hình người dùng cung cấp đã được giữ lại.
2. Chạy `npm run dev` ở thư mục gốc, hoặc chạy riêng backend và frontend.
3. Đăng nhập, nhấn **Hỏi AI** ở góc dưới bên phải trong portal student, teacher hoặc admin.
4. Trong trang học, chat tự lấy bài đang chọn. Đổi bài tách ngữ cảnh; lịch sử của bài cũ vẫn có khi quay lại bài đó.
5. Chọn Hỏi đáp / Tóm tắt / Rút ý chính và văn phong Dễ hiểu / Ngắn gọn / Học thuật. Enter gửi, Shift+Enter xuống dòng, Escape đóng.
6. Đính kèm PDF, DOC, DOCX, TXT hoặc MD rồi đặt câu hỏi. Nội dung được gửi tới Gemini khi gửi câu hỏi.

## Ba công cụ học tập bổ sung

Mở chat và chọn công cụ ở hàng nút ngay dưới lịch sử. Không cần nhập thêm câu hỏi trong ô chat thông thường; form có nút gửi riêng. Có thể chọn văn phong trước khi mở công cụ. Kết quả được lưu trong lịch sử riêng của tài khoản như các lượt chat khác.

- **Giải thích đáp án sai:** nhập đề bài, câu trả lời của bạn, đáp án tham khảo nếu có. AI đối chiếu thêm lesson/file của hội thoại và trả nhận xét, nguyên nhân, cách giải, bài luyện tập. Không mặc định câu trả lời sai. Đáp án do người dùng nhập không được coi là kết quả chấm chính thức. Repo hiện chưa có module quiz/attempt nên chưa có luồng tự lấy đáp án từ bài kiểm tra.
- **Gợi ý khóa học:** nhập mục tiêu và trình độ. Backend đọc enrollment của tài khoản đã xác thực, loại khóa active/completed, lấy khóa open/published chưa xóa và chọn tối đa 20 ứng viên từ tối đa 300 khóa catalog. AI đề xuất tối đa 3 khóa, backend kiểm tra ID, khóa trùng và tạo link từ dữ liệu thật. Không có ứng viên thì trả thông báo, không gọi AI. Giá và tình trạng có thể thay đổi; trang chi tiết khóa học là nguồn hiện tại khi đăng ký. Bản basic chưa dùng điểm quiz hoặc hồ sơ năng lực chi tiết.
- **Lập kế hoạch học:** nhập mục tiêu, trình độ, 1–12 tuần, 1–7 ngày/tuần, 15–180 phút/ngày. Trả kế hoạch từng tuần gồm chủ đề, nhiệm vụ và tiêu chí tự kiểm tra; tổng thời gian do backend tính. Liên kết khóa học được kiểm tra theo catalog. Khi không có khóa phù hợp có thể lập kế hoạch tự học. Đây là gợi ý, chưa có lịch nhắc việc hoặc đồng bộ calendar.

Chỉ vai trò, trình độ tự khai và thống kê enrollment được dùng làm hồ sơ AI; không gửi email, số điện thoại hoặc password hash. Form được validate và whitelist ở DTO. Output khóa học/kế hoạch được kiểm tra phía server trước khi lưu; AI trả JSON sai thì báo thử lại, không lưu lượt dở dang. Các mode mới vẫn dùng ownership, khóa xử lý, request ID và fallback hiện có.

## Quyền và dữ liệu (chi tiết)

- Dùng AuthFilter/RoleFilter hiện tại. Student cần enrollment active/completed; teacher cần sở hữu course; admin đọc lesson thuộc course chưa xóa.
- Backend tự tải lesson sau khi kiểm tra quyền. Role, system prompt và lịch sử giả mạo từ client không được dùng.
- ChatConversation và ChatDocument là hai collection mới. Tài liệu không có URL public. API lịch sử chỉ trả metadata file, không trả buffer/văn bản trích xuất.
- Lịch sử/file riêng từng tài khoản; admin không đọc được hội thoại người khác. Kiểm tra quyền lesson lại mỗi lần đọc/gửi.
- Xóa chat xóa file đi kèm. Gỡ file ngừng dùng file trong câu hỏi mới; nội dung đã xuất hiện trong câu trả lời cũ vẫn còn. Muốn bỏ cả nội dung đó, hãy xóa cuộc trò chuyện.
- API key chỉ ở backend. AI không có công cụ sửa điểm, tài khoản hoặc course.

## Giới hạn

- 10 MB/file, tối đa 3 file/chat; tổng PDF tối đa 12 MB để vừa payload inline.
- Word/TXT/MD tối đa 80.000 ký tự/file; tổng nguồn văn bản tối đa 120.000 ký tự. Word chỉ trích văn bản, không OCR ảnh trong Word. PDF gửi trực tiếp tới Gemini, có thể đọc trang scan tùy chất lượng file/model.
- Word dùng worker timeout 10 giây và giới hạn heap; DOCX tối đa 1.000 mục ZIP và 20 MB giải nén. Không chạy macro hoặc tải liên kết ngoài.
- Mỗi chat tối đa 40 lượt; gửi 8 lượt gần nhất làm ngữ cảnh. Câu hỏi tối đa 4.000 ký tự, phản hồi tối đa 2.048 output token.
- 15 thao tác ghi/phút/tài khoản, tối đa 4 tác vụ/process. Deployment nhiều replica cần bộ giới hạn tốc độ dùng chung.
- Khóa MongoDB ngăn gửi/upload/xóa chồng nhau; hết hạn sau 5 phút nếu process dừng. Request ID chống lặp lượt đã thành công khi thử lại.
- Lịch sử phân trang 30 mục theo lesson hoặc chat chung. Chưa stream; trang auth HTML cũ không có bong bóng chat.

## Fallback

Thử model chính rồi fallback theo thứ tự cấu hình, bỏ tên trùng. HTTP 429, 404, 500/502/503/504 chuyển sang model tiếp theo một lần. Không đổi model để né safety block, key sai hoặc request lỗi.

PDF bỏ qua Gemma trong integration này, giữ các Gemini model có khả năng đọc PDF native. Request văn bản vẫn dùng Gemma 4. System instruction được giữ khi chuyển model.

Timeout 15 giây/model. Lỗi mạng/timeout báo người dùng thử lại. Nếu tất cả model hết quota/không khả dụng, trả thông báo rõ ràng; đổi model không tạo thêm quota khi cả tài khoản/project đã hết lượt.

Tham khảo: [Gemini document understanding](https://ai.google.dev/gemini-api/docs/document-processing), [Gemma trên Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

## Kiểm chứng

```powershell
npm --prefix backend test
npm --prefix frontend run build
npm --prefix frontend run lint
```

Unit/HTTP tests dùng provider giả lập, không dùng key/dữ liệu production. Fixture Word công khai có giấy phép kèm theo. Đã kiểm tra Gemini thật bằng câu hỏi ngắn; MongoDB thật bằng bản ghi test được dọn sau chạy; desktop/mobile browser bằng API giả lập.

Multer được cập nhật trong major 2 để sửa lỗi upload đã biết. Dependency cũ ngoài chat còn cảnh báo npm audit; không chạy audit fix --force để tránh thay major ngoài yêu cầu.

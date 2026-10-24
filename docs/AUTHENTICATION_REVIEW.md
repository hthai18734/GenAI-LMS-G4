# Authentication review

## Phạm vi đã rà soát

- Backend: `authRoutes`, `AuthController`, `AuthFilter`, các Repository/model User, OTP, OAuthAccount, OAuthLoginTicket, RefreshSession; các tiện ích Password, OTP, JWT, OAuth và Email; luồng tạo/sửa tài khoản của admin.
- Frontend: `AppRoutes`, `ProtectedRoute`, `AuthContext`, `services/api`, các trang Login, Register, OTP, OAuthCallback, Forgot Password, Reset Password, Change Password và AdminUserForm.
- Các API xác thực giữ nguyên route và được phục vụ qua cả `/api/auth` và `/api/v1/auth`.

## Kết quả sửa

- Google OAuth không tạo User và không tự kích hoạt User đang pending. Email chưa tồn tại chuyển về `/register?reason=google_registration_required&email=...`; trang đăng ký điền sẵn email và giải thích các bước đăng ký mật khẩu, xác minh OTP.
- Google chỉ liên kết email Google đã xác minh với tài khoản có sẵn, active, có mật khẩu và đã xác minh email. Không cho đổi chủ sở hữu liên kết Google đã có.
- Đăng ký mới tiếp tục lưu thông tin tạm và mật khẩu đã hash trong OTP record. Chỉ tạo User sau khi OTP hợp lệ. Unique index email và xử lý lỗi duplicate bảo vệ các yêu cầu đồng thời.
- Login, OAuth ticket exchange, refresh và truy cập API có xác thực đều kiểm tra email đã xác minh.
- Với tài khoản có sẵn chưa xác minh (bao gồm tài khoản admin tạo), nhập đúng mật khẩu sẽ yêu cầu OTP và chuyển tới trang xác minh, không cấp phiên đăng nhập. OTP hợp lệ cập nhật chính tài khoản đó, giữ nguyên mật khẩu và quyền; cập nhật nguyên tử kiểm tra ID, email và trạng thái để tránh kích hoạt tài khoản đã thay đổi hoặc bị khóa.
- Admin thay email sẽ xóa dấu xác minh của email cũ, đồng thời giữ cơ chế thu hồi phiên/reset token hiện có. Email mới phải được xác minh lại.
- Tất cả 9 trường mật khẩu đều có nút con mắt: Login (1), Register (2), Reset Password (2), Change Password (3), AdminUserForm (1). Mặc định ẩn; nút không submit form và giữ nguyên giá trị. Bổ sung nhãn truy cập bằng bàn phím/trình đọc màn hình.

## Các file đã thay đổi

Backend:

- `backend/src/controller/auth/AuthController.js`
- `backend/src/controller/admin/AccountController.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/identity/UserRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/identity/OAuthAccountRepository.js`
- `backend/src/filter/AuthFilter.js`

Frontend:

- `frontend/src/components/PasswordInput.jsx` (mới)
- `frontend/src/index.css`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterPage.jsx`
- `frontend/src/pages/ResetPasswordPage.jsx`
- `frontend/src/pages/ChangePasswordPage.jsx`
- `frontend/src/pages/AdminUserFormPage.jsx`

Kiểm thử:

- `backend/tests/controller/Auth.integration.test.js`
- `backend/tests/controller/AuthQC.integration.test.js`
- `backend/tests/controller/UserReview.integration.test.js`
- `backend/tests/controller/Iteration2.integration.test.js`
- `backend/tests/controller/ChatRoutes.test.js`
- `backend/tests/controller/TeacherAssignmentRoutes.test.js`

Các fixture của tài khoản được xác thực trong kiểm thử được bổ sung `emailVerifiedAt` để kiểm thử phân quyền/nghiệp vụ vẫn đi qua điều kiện đăng nhập mới. Các trường hợp chưa xác minh được kiểm tra riêng.

## Kiểm chứng

Chạy từ thư mục gốc trong PowerShell:

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm --prefix backend test
npm --prefix backend run check
npm --prefix frontend run build
npm --prefix frontend run lint
git diff --check
```

- Backend: **259 pass, 0 fail, 0 skipped**. Kiểm thử integration sử dụng database MongoDB riêng có tên ngẫu nhiên và tự xóa database kiểm thử khi hoàn tất.
- Bao phủ Register, OTP sai/hết hạn/gửi lại/replay, đăng ký và xác minh đồng thời, email trùng, Google email chưa tồn tại, Google khi đăng ký chưa xong, tài khoản pending/chưa xác minh/bị khóa, bảo vệ liên kết Google, ticket hết hạn/dùng một lần, Login, Forgot Password, Reset Password và Change Password/thu hồi phiên.
- Kiểm tra UI bằng Playwright/Chromium qua script tạm: cả 9 trường giữ nguyên nội dung qua hai lần bật/tắt; hướng dẫn đăng ký Google và email điền sẵn; Register → OTP không cấp phiên; OTP → Login; Login chưa xác minh → OTP. Các phản hồi API trong kiểm tra trình duyệt được giả lập; nghiệp vụ API/DB được kiểm tra bằng integration tests riêng.
- Frontend build và backend syntax check thành công. Build còn cảnh báo bundle lớn; lint không có lỗi, còn các cảnh báo hiện có (bao gồm regex trong ChangePasswordPage).
- `git diff --check` thành công.
- Google provider exchange và gửi email được giả lập trong kiểm thử. Chưa kiểm chứng OAuth với tài khoản Google thật hoặc SMTP/email delivery thật.

module.exports = [
  {
    slug: 'chat-demo-javascript', title: '[Chat Demo] JavaScript căn bản',
    description: 'Dữ liệu học tập mẫu để kiểm tra chat AI: biến, mảng và lập trình bất đồng bộ.',
    lessons: [
      {
        title: 'Biến, kiểu dữ liệu và phép so sánh', duration: 15,
        content: `MỤC TIÊU
Phân biệt let và const; nhận biết kiểu dữ liệu; dùng phép so sánh nghiêm ngặt.

NỘI DUNG
let dùng cho biến có thể gán lại. const không cho gán lại biến, nhưng vẫn có thể thay đổi thuộc tính của object được tham chiếu. Ví dụ: const student = { name: 'Lan' }; student.name = 'Mai' là hợp lệ, còn student = {} sẽ gây lỗi.
Các kiểu thường gặp: string, number, boolean, undefined, null, object. undefined thường biểu thị biến chưa được gán giá trị; null là giá trị chủ động biểu thị không có dữ liệu.
Toán tử === so sánh cả kiểu và giá trị, không ép kiểu như ==. Vì vậy 5 === '5' là false, trong khi 5 == '5' là true.

VÍ DỤ RIÊNG CỦA BÀI
Lớp Sao Mai có 24 học viên. Học phí mỗi người là 150000 đồng. Tổng học phí là 24 * 150000 = 3600000 đồng. Sau khi thêm 2 học viên, biến số lượng cần tăng lên 26.

GHI NHỚ
Ưu tiên const khi không gán lại; dùng let khi cần thay đổi; ưu tiên === để tránh ép kiểu ngoài ý muốn.

CÂU HỎI ÔN TẬP
Vì sao thay đổi student.name không vi phạm const? Sau khi lớp thêm 2 người, tổng học phí là bao nhiêu?`,
      },
      {
        title: 'Xử lý danh sách bằng map, filter và reduce', duration: 20,
        content: `MỤC TIÊU
Chọn đúng phương thức xử lý mảng và tính kết quả từ dữ liệu mẫu.

NỘI DUNG
map tạo một mảng mới bằng cách biến đổi từng phần tử; số phần tử được giữ nguyên. filter tạo mảng chứa các phần tử thỏa điều kiện. reduce tổng hợp mảng thành một kết quả như tổng, object hoặc nhóm dữ liệu. Các phương thức này không tự sửa mảng gốc, nhưng callback vẫn có thể gây thay đổi object nếu viết không cẩn thận.

DỮ LIỆU CỦA BÀI
const scores = [6, 8, 9, 4, 10];
Điều kiện đạt là điểm >= 8. scores.filter(score => score >= 8) cho [8, 9, 10], tương ứng 3/5 học viên, tức 60%.
scores.map(score => score * 10) cho [60, 80, 90, 40, 100].
scores.reduce((sum, score) => sum + score, 0) cho 37; điểm trung bình là 37 / 5 = 7.4.

LỖI THƯỜNG GẶP
Quên giá trị khởi tạo của reduce có thể gây lỗi khi mảng rỗng. Khi mảng rỗng, cần kiểm tra độ dài trước khi chia để tính trung bình.

ÔN TẬP
So sánh map với filter. Tính số học viên đạt nếu ngưỡng đổi thành 9.`,
      },
      {
        title: 'Promise, async/await và xử lý lỗi API', duration: 20,
        content: `MỤC TIÊU
Hiểu tác vụ bất đồng bộ và xử lý lỗi khi gọi API.

NỘI DUNG
Promise biểu diễn kết quả có thể xuất hiện trong tương lai, với trạng thái pending, fulfilled hoặc rejected. Hàm async luôn trả về Promise. await chờ Promise hoàn thành bên trong hàm async mà không chặn toàn bộ luồng xử lý JavaScript.
Ví dụ: const response = await fetch('/api/courses'); if (!response.ok) throw new Error('Không tải được khóa học'); const body = await response.json();
fetch không tự reject chỉ vì HTTP 404 hoặc 500; cần kiểm tra response.ok. Dùng try/catch để hiển thị lỗi và finally để tắt trạng thái loading.

TÌNH HUỐNG MẪU
Ứng dụng gửi một câu hỏi tới model A. A trả HTTP 429 vì vượt quota. Ứng dụng thử model B một lần và B trả 200. Nếu tất cả model đều hết quota, cần báo người dùng thử lại sau. Không retry vô hạn; không tự chuyển model để bỏ qua lỗi API key sai.

GHI NHỚ
Phân biệt lỗi mạng với HTTP lỗi. Giữ nguyên câu hỏi khi retry và tránh lưu hai câu trả lời trùng.

ÔN TẬP
Vì sao fetch trả 404 không nhất thiết chạy vào catch? finally nên cập nhật trạng thái nào?`,
      },
    ],
  },
  {
    slug: 'chat-demo-database', title: '[Chat Demo] Cơ sở dữ liệu và phân quyền',
    description: 'Dữ liệu mẫu về MongoDB, enrollment và quyền truy cập lịch sử chat.',
    lessons: [
      {
        title: 'Document, collection và quan hệ dữ liệu', duration: 15,
        content: `MỤC TIÊU
Nhận biết cách tổ chức khóa học và bài học trong MongoDB.

NỘI DUNG
MongoDB lưu document trong collection. Một document có các trường như title, content và courseId. _id là định danh của document. Collection courses chứa khóa học; collection lessons chứa bài học. Mỗi lesson có courseId tham chiếu đến khóa học.
Ví dụ khóa học C01 tên 'Nhập môn dữ liệu' có hai lesson L01 và L02. Cả hai lesson đều mang courseId C01. Muốn liệt kê bài học, lọc lessons theo courseId rồi sắp xếp theo order tăng dần.
Reference giúp chia dữ liệu thành các document riêng. Embedded data phù hợp khi dữ liệu nhỏ, thường đọc cùng nhau và có kích thước giới hạn.

VÍ DỤ RIÊNG
Khóa C01 có các lesson: L01 order 2, L02 order 1, L03 order 3. Thứ tự hiển thị đúng là L02, L01, L03.

GHI NHỚ
Tên course không phải định danh đáng tin cậy; dùng _id để liên kết. Kiểm tra lesson thuộc đúng course trước khi trả nội dung.

ÔN TẬP
Vì sao không nên nối dữ liệu chỉ dựa vào title? Trình bày thứ tự bài học của C01.`,
      },
      {
        title: 'Xác thực, phân quyền và enrollment', duration: 20,
        content: `MỤC TIÊU
Phân biệt authentication, authorization và quyền sở hữu tài nguyên.

NỘI DUNG
Authentication trả lời người dùng là ai, thường dựa trên token hợp lệ. Authorization kiểm tra người dùng được phép làm gì trên tài nguyên cụ thể. Chỉ kiểm tra token mà bỏ qua chủ sở hữu là chưa đủ.
Trong tình huống LMS mẫu, student chỉ đọc lesson của course có enrollment active hoặc completed. Enrollment dropped không cho quyền đọc. Teacher đọc lesson thuộc course mình sở hữu. Admin kiểm tra nội dung course theo quyền quản trị.
Vai trò phải lấy từ tài khoản đã xác thực ở backend, không tin trường role do trình duyệt gửi lên.

BÀI TẬP TÌNH HUỐNG
Lan có enrollment active ở C01, Nam chưa đăng ký C01, Hà có enrollment completed ở C01 và Minh có enrollment dropped ở C01. Theo chính sách trên, Lan và Hà được đọc; Nam và Minh bị từ chối.

GHI NHỚ
Kiểm tra quyền ở từng request vì quyền có thể thay đổi. Biết ID bài học không đồng nghĩa có quyền đọc.

ÔN TẬP
Vì sao Hà vẫn được đọc? Nếu Nam sửa role thành admin trong request, backend phải làm gì?`,
      },
      {
        title: 'Bảo vệ lịch sử chat và thiết kế index', duration: 20,
        content: `MỤC TIÊU
Thiết kế truy vấn để mỗi người chỉ đọc lịch sử của mình.

NỘI DUNG
Conversation lưu ownerId là ID người sở hữu. Khi đọc một cuộc trò chuyện cần lọc đồng thời _id và ownerId, ví dụ findOne({ _id: conversationId, ownerId: currentUserId }). Nếu chỉ lọc theo conversationId, người khác có thể thử ID để đọc dữ liệu không thuộc mình.
Tài liệu đính kèm cần gắn ownerId và conversationId. Không đặt tài liệu riêng tư trong thư mục public. Khi xóa hội thoại, xóa các tài liệu liên quan; không tác động đến hội thoại của người khác.
Index trên ownerId hỗ trợ tìm lịch sử theo tài khoản. Index ghép cần chọn theo điều kiện lọc và sắp xếp thực tế; tạo quá nhiều index làm tăng chi phí ghi và dung lượng.

VÍ DỤ RIÊNG
Lan sở hữu chat A và B; Nam sở hữu chat C. Dù Nam biết ID của A, truy vấn với ownerId của Nam không tìm thấy A. Admin cũng không tự động được đọc lịch sử riêng của Lan nếu chính sách không cấp quyền đó.

ÔN TẬP
Viết điều kiện truy vấn bảo vệ chat A. Vì sao ẩn nút chat trong frontend không thay thế kiểm tra quyền backend?`,
      },
    ],
  },
];

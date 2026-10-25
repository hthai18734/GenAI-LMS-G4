# Cấu trúc và kiến trúc phát triển AI-LMS

> Tài liệu duy nhất để thành viên dựa vào khi thêm chức năng hoặc sửa lỗi.
> Code và test trên `main` là nguồn xác minh cuối cùng nếu tài liệu chưa kịp cập nhật.

## 1. Kiến trúc được chọn

- Frontend: React theo **feature-oriented architecture**, không áp dụng MVC máy móc.
- Backend: **Hexagonal Architecture / Ports and Adapters**.
- Database: MongoDB qua Mongoose.
- DTO được giữ tại biên HTTP để kiểm tra và chuẩn hóa input.
- Không dùng DAO. Truy cập dữ liệu đi qua Repository Port và Mongoose Repository Adapter.

Luồng tổng quát:

```text
React Page/Component
  -> features/<feature>/api.js
  -> shared/api/client.js
  -> Express Route
  -> Controller + DTO                 inbound adapter
  -> Application Service / Use Case
  -> Repository Port                  outbound port
  -> Mongoose Repository Adapter      outbound adapter
  -> Mongoose Model
  -> MongoDB
```

Dependency luôn hướng vào application/domain:

```text
HTTP/UI -> Application Service -> Repository Port <- Infrastructure Adapter
                         |
                         v
                       Domain

Composition root nối các thành phần, không chứa nghiệp vụ.
```

## 2. Cấu trúc backend

```text
backend/src/
├── application/
│   └── ports/outbound/                Repository contracts
├── composition/
│   ├── repositories.js                Khởi tạo và kiểm tra adapters
│   ├── services.js                    Inject repositories/gateways vào services
│   ├── http.js                        Inject services vào HTTP controllers
│   └── bootstrap.js                   Khởi động ứng dụng và seed dev tùy chọn
├── controller/                        HTTP inbound adapters
│   ├── admin/
│   ├── auth/
│   ├── chat/
│   ├── engagement/
│   ├── learning/
│   ├── public/
│   ├── student/
│   └── teacher/
├── domain/                            Policy, constant, state rule thuần
├── dto/                               Validate/normalize/whitelist HTTP input
├── filter/                            Auth, permission, error middleware
├── infrastructure/
│   └── persistence/mongoose/
│       └── repositories/              MongoDB/Mongoose adapters
├── model/                             Mongoose schemas và DB constraints
├── routes/                            Ghép middleware và controller
├── service/                           Application use cases
└── utils/                             Gateway kỹ thuật: JWT, OAuth, email, AI, upload
```

### Trách nhiệm từng layer

| Layer | Được làm | Không được làm |
|---|---|---|
| `routes` | Khai báo URL, middleware, controller | Nghiệp vụ, query DB |
| `controller` | Đọc `req`, gọi DTO/service, trả response | Import model/repository, gọi Mongoose |
| `dto` | Validate type/range/ID/allowed fields | Query DB, chứa nghiệp vụ |
| `service` | Use case, authorization nghiệp vụ, transaction flow | Import Express, Mongoose, infrastructure |
| `domain` | Rule và policy thuần | Import HTTP, Mongoose, service |
| `application/ports` | Khai báo capability service cần | Biết MongoDB/Mongoose |
| `infrastructure/.../repositories` | Query, populate, aggregate, transaction | Biết `req/res`, controller |
| `model` | Schema, index, DB constraint | Là DTO hoặc application service |
| `composition` | Khởi tạo và inject dependencies | Chứa business rule |

### Composition root

Chỉ `composition` được biết cả service và implementation cụ thể:

```text
repositories.js: Model -> Repository Adapter -> kiểm tra Repository Port
services.js:     Repository/Gateway -> Service constructor
http.js:         Service -> Controller factory và AuthFilter
bootstrap.js:    Startup dependency và development seed
```

Controller không được import `composition/services` như service locator. Route nhận controller đã được cấu hình từ `composition/http.js`.

### DTO, Repository và Model

```text
DTO
  Input từ HTTP -> plain validated object

Repository Port
  Capability theo ngôn ngữ use case, do application sở hữu

Mongoose Repository
  Implementation port, sở hữu mọi query MongoDB

Mongoose Model
  Schema/index/constraint lưu trữ
```

Không tạo lại thư mục `backend/src/dao`. Nếu service cần thao tác dữ liệu mới:

1. Mở rộng port trong `application/ports/outbound/RepositoryPorts.js`.
2. Thêm method vào repository adapter phù hợp.
3. Inject repository qua `composition/repositories.js` và `composition/services.js`.
4. Service gọi port, không gọi model trực tiếp.

## 3. Cấu trúc frontend

```text
frontend/src/
├── App.jsx                            Composition root của React
├── routes/                            Route configuration
├── pages/                             Màn hình theo route
├── components/                        UI dùng lại
├── features/
│   ├── admin/
│   ├── auth/
│   ├── chat/
│   ├── engagement/
│   ├── learning/
│   ├── public/
│   ├── student/
│   ├── teacher/
│   └── voucher/
├── shared/
│   ├── api/client.js                  HTTP client, token refresh, common errors
│   └── media/AuthenticatedVideo.jsx   Video cần Bearer token
└── architecture/Boundaries.test.js
```

Luồng dependency:

```text
App/Router -> Page/Component -> feature public API -> shared API client
```

Quy tắc:

1. Page/component gọi `features/<feature>/api.js`, không gọi Axios/fetch trực tiếp.
2. `shared` không import `features`, `pages` hoặc business component.
3. Một feature không import file implementation nội bộ của feature khác.
4. Logic dùng chung thật sự mới đặt trong `shared`; logic nghiệp vụ vẫn thuộc feature.
5. Provider toàn cục được ghép trong `App.jsx`.
6. Media bảo vệ phải đi qua authenticated client; không dùng URL static trực tiếp.

## 4. Quy trình thêm một chức năng

Ví dụ thêm use case `Complete Course`:

1. Xác định actor, input, output, authorization và trạng thái lỗi.
2. Tạo/cập nhật DTO cho input HTTP.
3. Thêm capability vào Repository Port nếu cần dữ liệu mới.
4. Implement capability trong Mongoose Repository.
5. Viết application service/use case; inject dependencies qua constructor.
6. Wire service trong `composition/services.js`.
7. Tạo controller mỏng và wire trong `composition/http.js`.
8. Ghép middleware/controller trong route.
9. Frontend thêm API facade vào feature tương ứng.
10. Page/component chỉ gọi feature API.
11. Thêm unit/regression tests và chạy toàn bộ quality gate.

Tên file nên phản ánh nghiệp vụ, ví dụ:

```text
dto/student/CompleteCourseDTO.js
service/learning/CourseCompletionService.js
infrastructure/.../learning/EnrollmentRepository.js
features/learning/api.js
```

Không tạo `CompleteCourseDAO.js`, không query `Enrollment.find()` trong controller/service.

## 5. Quy trình sửa lỗi

1. Tái hiện lỗi bằng request/test nhỏ nhất.
2. Xác định layer sở hữu nguyên nhân, không vá ở layer ngoài chỉ để che lỗi.
3. Thêm regression test thất bại trước khi sửa nếu có thể.
4. Sửa đúng contract tại layer sở hữu.
5. Kiểm tra các caller khác của contract.
6. Chạy targeted tests rồi chạy toàn bộ quality gate.

Hướng chẩn đoán nhanh:

| Triệu chứng | Kiểm tra đầu tiên |
|---|---|
| Route 404 | `routes`, mount trong `index.js`/composition |
| 400 validation | DTO và whitelist field |
| 401/403 | `AuthFilter`, role middleware, authorization trong service |
| `x is not a function` | Contract gateway/repository và wiring trong composition |
| Query sai hoặc thiếu populate | Mongoose Repository adapter |
| React gọi sai endpoint | Feature API và `shared/api/client.js` |
| Token refresh/logout lỗi | `AuthService`, `JWTUtil`, `RefreshSessionRepository` |
| Chỉ lỗi sau merge | Import cũ, file bị xóa/đổi tên, composition không đồng bộ |

Không sửa bằng cách:

- Cho controller/service import model trực tiếp.
- Khôi phục DAO cũ.
- Public thư mục upload chứa tài liệu/video học tập.
- Hard-code credential, token hoặc privileged account.
- Bỏ authorization chỉ để test chạy.
- Chọn toàn bộ “Accept Current/Incoming” khi chưa hiểu conflict.

## 6. Authentication và media security

- `AuthService` nhận `JWTUtil`, `OAuthUtil`, password, OTP, email qua dependency injection.
- Access token và refresh token khác `type`; refresh token có session ID (`sid`) và token version.
- OAuth redirect chỉ cho phép origin nằm trong cấu hình frontend/CORS.
- Startup không tạo tài khoản đặc quyền với mật khẩu cố định.
- Development seed mặc định tắt và luôn tắt trong production.
- Thumbnail khóa học có thể public.
- Material và lesson video phải qua authenticated endpoint và kiểm tra enrollment, course owner hoặc admin.

Development seed chỉ bật khi thật sự cần:

```env
ENABLE_DEVELOPMENT_SEED=true
DEV_SEED_ADMIN_EMAIL=...
DEV_SEED_ADMIN_PASSWORD=...
DEV_SEED_TEACHER_EMAIL=...
DEV_SEED_TEACHER_PASSWORD=...
```

Không commit giá trị thật của các biến trên.

## 7. Quality gate bắt buộc

Từ thư mục project:

```powershell
cd backend
npm install
npm run test:architecture
npm test

cd ../frontend
npm install
npm test
npm run lint
npm run build
```

Điều kiện trước khi push/merge:

- Architecture tests pass.
- Backend và frontend tests không fail.
- Lint không có error; warning phải được xem xét và ghi nhận.
- Production build thành công.
- `git diff --check` không báo lỗi.
- Không có `.env`, credential, `node_modules`, file build hoặc dữ liệu test ngẫu nhiên trong commit.

Test kiến trúc:

```text
backend/tests/architecture/LayerBoundaries.test.js
frontend/src/architecture/Boundaries.test.js
```

Nếu cần phá một boundary, phải cập nhật quyết định kiến trúc, test boundary và tài liệu này trong cùng thay đổi; không chỉ tắt test.

## 8. Checklist review Pull Request

- [ ] Chức năng nằm đúng feature/module.
- [ ] Controller mỏng và không gọi Mongoose.
- [ ] DTO whitelist input từ client.
- [ ] Service nhận dependency qua constructor.
- [ ] Query chỉ nằm trong repository adapter.
- [ ] Authorization kiểm tra trong use case, không chỉ ẩn nút frontend.
- [ ] Route có đúng auth/role middleware.
- [ ] API không trả password hash, token nội bộ hoặc field nhạy cảm.
- [ ] File upload được kiểm tra type, size, filename và quyền truy cập.
- [ ] Có test cho success, validation và permission/error path.
- [ ] Full quality gate đã chạy.

## 9. Quy tắc Git cho nhóm

Trước khi code:

```powershell
git switch <nhanh-ca-nhan>
git status --short
git fetch origin
git pull --no-rebase origin main
```

Sau khi code và test:

```powershell
git status --short
git diff --check
git add <cac-file-thuoc-chuc-nang>
git commit -m "<ThanhVien>_<TenChucNang>_Add|edit|delete"
git push origin <nhanh-ca-nhan>
```

Không dùng `git add -A` nếu working tree chứa thay đổi của nhiều chức năng. Merge PR bằng merge commit khi cần giữ lịch sử commit theo chức năng.

## 10. Khi tài liệu và code không khớp

1. Không đoán và không tạo thêm tài liệu kiến trúc thứ hai.
2. Kiểm tra architecture tests và composition root hiện tại.
3. Xác định code hay tài liệu bị lỗi.
4. Sửa `docs/ARCHITECTURE.md` trong cùng PR với thay đổi kiến trúc.

File này mô tả kiến trúc; test bảo vệ boundary; code thực thi hành vi.

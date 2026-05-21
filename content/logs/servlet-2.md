# Chap 3 JSON 처리 정리

## JSON이란

JavaScript Object Notation의 약자로, 클라이언트-서버 간 데이터 교환에 쓰이는 텍스트 포맷이다.

서블릿에서 JSON을 주고받을 때는 Content-Type을 `application/json`으로 설정한다.

---

## Jackson 라이브러리

Java에서 JSON 변환을 처리할 때 Jackson을 사용한다. `build.gradle`에 의존성을 추가해야 한다.

```groovy
implementation 'com.fasterxml.jackson.core:jackson-databind:2.x.x'
```

핵심 클래스는 `ObjectMapper`다.

### 역직렬화 (JSON → Java 객체)

```java
BufferedReader reader = req.getReader();
UserDTO user = new ObjectMapper().readValue(reader, UserDTO.class);
```

### 직렬화 (Java 객체 → JSON 문자열)

```java
String json = new ObjectMapper().writeValueAsString(user);
```

### DTO 작성 규칙

Jackson이 DTO를 변환하려면 아래 조건이 필요하다.

- **기본 생성자(no-arg constructor)** 가 반드시 있어야 한다
- **getter/setter** 가 있어야 필드에 접근할 수 있다
- JSON 키 이름과 필드 이름이 일치해야 한다

---

## JSON 요청/응답 흐름

```plain
클라이언트 (fetch)
  → JSON body 전송 (POST)
    → req.getReader()로 읽기
      → ObjectMapper.readValue()로 역직렬화
        → 비즈니스 로직 처리
          → ObjectMapper.writeValueAsString()로 직렬화
            → resp.getWriter().print(json)으로 응답
```

---

## 메모 API (인메모리 버전)

`static ArrayList`를 사용해서 서버가 살아있는 동안 데이터를 유지한다.

### GET /api/memos
전체 메모 목록을 JSON 배열로 반환한다. 상태 코드는 200.

### POST /api/memos
요청 body에서 `content`를 꺼내 메모를 추가하고 201 Created를 반환한다.
content가 비어있으면 400 Bad Request와 에러 메시지를 반환한다.

```java
resp.setStatus(HttpServletResponse.SC_CREATED); // 201
resp.setStatus(HttpServletResponse.SC_BAD_REQUEST); // 400
```

### HTTP 상태 코드 정리

| 코드 | 의미 |
|------|------|
| 200 OK | 조회 성공 |
| 201 Created | 생성 성공 |
| 400 Bad Request | 잘못된 요청 (유효성 실패 등) |

---

## 메모 API (JDBC 버전)

인메모리 대신 MySQL 데이터베이스에 저장하도록 확장한 버전이다.

### 레이어 구조

```plain
MemoApiServlet (HTTP 처리, JSON 변환)
    ↓
MemoService (비즈니스 로직)
    ↓
MemoDAO (SQL 실행)
    ↓
JDBCTemplate (Connection 관리)
```

각 계층이 역할을 나눠 가지기 때문에 변경이 생겨도 영향 범위가 좁다.

### DB 테이블 구조

```sql
CREATE TABLE tbl_memo (
    memo_id INT PRIMARY KEY AUTO_INCREMENT,
    content VARCHAR(255),
    created_at TIMESTAMP
);
```

### JDBCTemplate

`db.properties` 파일에서 드라이버와 접속 정보를 읽어 Connection을 제공하는 유틸리티 클래스다.

```properties
driver=com.mysql.cj.jdbc.Driver
url=jdbc:mysql://localhost:3306/memo_db
username=ohgiraffers
password=ohgiraffers
```

Connection, Statement, ResultSet을 닫는 메서드도 제공해서 리소스 누수를 막는다.

### MemoDAO 핵심 패턴

PreparedStatement로 SQL Injection을 방지한다.

```java
PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
pstmt.setString(1, content);
pstmt.executeUpdate();

ResultSet generatedKeys = pstmt.getGeneratedKeys();
generatedKeys.next();
int generatedId = generatedKeys.getInt(1);
```

`Statement.RETURN_GENERATED_KEYS`를 사용하면 AUTO_INCREMENT로 생성된 ID를 바로 가져올 수 있다.

### MemoService

DAO를 감싸는 레이어로 Connection 생명주기를 관리한다. 작업이 끝나면 반드시 Connection을 닫는다.

```java
public List<MemoDTO> findAllMemos() {
    Connection conn = JDBCTemplate.getConnection();
    List<MemoDTO> memos = dao.selectAllMemos(conn);
    JDBCTemplate.close(conn);
    return memos;
}
```

---

## 정리

- JSON 변환은 Jackson의 `ObjectMapper` 하나로 처리한다
- DTO에 기본 생성자와 getter/setter가 없으면 Jackson이 동작하지 않는다
- 상태 코드는 `resp.setStatus()`로 명시적으로 설정해야 클라이언트가 성공/실패를 구분할 수 있다
- JDBC를 쓸 때는 Servlet → Service → DAO 레이어를 나누고, Connection은 Service에서 열고 닫는다
- PreparedStatement를 써서 SQL Injection을 반드시 막아야 한다

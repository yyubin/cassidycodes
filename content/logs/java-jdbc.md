## 1. JDBC 개요와 학습의 목적

JDBC(Java Database Connectivity)는 자바 애플리케이션에서 관계형 데이터베이스(RDB)에 접속하고 SQL 문을 실행하기 위한 표준 자바 API다. 이번 학습의 핵심은 단순히 DB에 연결하는 법을 배우는 것이 아니라, 자바의 인터페이스와 각 벤더별 드라이버(Driver)가 어떻게 상호작용하는지 이해하고, 효율적이고 안전한 데이터 접근 로직을 설계하는 데 있었다.

### 1-1. 왜 JDBC를 배워야 하는가?
- 현재는 MyBatis나 JPA 같은 프레임워크가 널리 쓰이지만, 그 모든 기술의 뿌리는 JDBC다.
- JDBC의 동작 원리를 모르면 프레임워크에서 발생하는 복잡한 에러를 디버깅할 수 없다.
- 자원(Resource) 관리와 트랜잭션의 개념을 코드 레벨에서 명확히 잡을 수 있다.

---

## 2. 데이터베이스 연결 관리 (Connection)

가장 기초적이면서도 중요한 단계는 연결(Connection)을 생성하고 관리하는 일이었다. `chap01-connection` 프로젝트를 통해 이 과정을 실무적인 수준으로 발전시켰다.

### 2-1. 드라이버 로딩과 DriverManager
자바는 `java.sql` 패키지를 통해 인터페이스만 제공하고, 실제 구현체는 MySQL이나 Oracle에서 제공하는 드라이버 JAR 파일에 들어 있다.
- `Class.forName("com.mysql.cj.jdbc.Driver")`: 드라이버 클래스를 메모리에 로드한다. 이때 정적 블록(Static block)이 실행되며 드라이버가 등록된다.
- `DriverManager.getConnection()`: 전달된 URL, ID, PW를 바탕으로 실제 통신 통로인 Connection 객체를 생성한다.

### 2-2. 설정 정보의 분리 (Properties 활용)
소스 코드에 DB 접속 정보를 직접 적는 하드코딩은 유지보수를 지옥으로 만든다. `connection-info.properties` 파일을 도입하여 이를 해결했다.
- 파일에 설정값을 저장하고 자바의 `Properties` 객체로 로드했다.
- 환경이 개발 서버에서 운영 서버로 바뀔 때, 자바 코드를 수정하고 컴파일할 필요 없이 설정 파일만 바꾸면 된다는 점을 확인했다.

### 2-3. JDBCTemplate: 유틸리티 클래스 설계
매번 반복되는 연결 생성과 자원 해제 코드를 줄이기 위해 `JDBCTemplate`을 직접 만들었다.
- 모든 메소드를 `static`으로 선언하여 객체 생성 없이 바로 사용하게 했다.
- `close()` 메소드들을 오버로딩(Overloading)하여 ResultSet, Statement, Connection을 각각 또는 한꺼번에 닫을 수 있게 설계했다.
- 여기서 Connection은 반환만 하고 닫지 않는 구조를 가졌는데, 이는 '연결을 연 주체가 책임을 지고 닫는다'는 원칙을 지키기 위함이었다.

---

## 3. SQL 실행의 도구: Statement와 PreparedStatement

SQL을 실행하는 방식에 따라 보안과 성능이 어떻게 달라지는지 `chap02-statements`에서 실습했다.

### 3-1. Statement의 치명적인 단점
`Statement`는 SQL 구문과 사용자의 입력값을 문자열로 합쳐서 실행한다.
- **가독성 최악**: 따옴표와 플러스 연산자가 섞여 코드가 매우 지저분해졌다.
- **보안 취약점 (SQL Injection)**: 사용자가 `' OR '1'='1` 같은 값을 입력하면 쿼리 전체의 논리가 무너져 데이터가 유출되는 것을 확인했다.
- **성능 저하**: DB 입장에서 매번 새로운 쿼리로 인식하여 파싱과 컴파일을 반복한다.

### 3-2. PreparedStatement의 도입
이를 해결하기 위해 위치 홀더(`?`)를 사용하는 `PreparedStatement`를 도입했다.
- 쿼리 틀을 미리 DB에 보내 컴파일해두고 값만 나중에 채워 넣는다.
- 입력값이 단순한 데이터로 취급되므로 SQL Injection이 원천 차단된다.
- 반복 실행 시 이미 컴파일된 결과를 재사용하므로 훨씬 빠르다.

---

## 4. 데이터 결과 처리와 객체 매핑 (DTO)

DB의 데이터를 자바의 객체로 변환하는 과정은 객체 지향 프로그래밍의 핵심이었다.

### 4-1. ResultSet의 커서 제어
`ResultSet`은 DB에서 쿼리 결과를 받아온 임시 테이블이다.
- `rset.next()`가 호출될 때마다 커서가 한 행씩 아래로 내려간다.
- `getString()`, `getInt()` 등으로 데이터를 추출할 때 컬럼의 인덱스보다 컬럼명을 사용하는 것이 유지보수에 유리함을 배웠다.

### 4-2. DTO(Data Transfer Object) 패턴 적용
데이터를 행 단위로 묶어줄 `MenuDTO` 클래스를 만들었다.
- DB의 컬럼명과 자바의 필드명을 매핑했다. (예: `MENU_NAME` -> `menuName`)
- `ArrayList<MenuDTO>`에 데이터를 담아 한꺼번에 전달하는 방식을 통해, 데이터 전송의 효율성을 높였다.

---

## 5. 쿼리 외부 관리: XML과 프로퍼티

복잡한 SQL 문을 자바 코드에서 완전히 들어내어 XML 파일로 관리하는 법을 익혔다.

### 5-1. XML 기반 관리의 이점
- 자바 코드가 수백 줄의 SQL 문으로 오염되는 것을 막았다.
- SQL만 따로 모아 관리하므로 가독성이 비약적으로 좋아졌다.
- `loadFromXML()`을 통해 런타임에 동적으로 쿼리를 읽어오는 로직을 구현했다.

---

## 6. 트랜잭션 관리와 수동 커밋

JDBC에서 데이터의 무결성을 지키기 위한 트랜잭션 처리 방식을 이해했다.
- 기본적으로 JDBC는 `autoCommit`이 `true`로 설정되어 있다.
- 여러 작업을 하나의 단위로 묶으려면 `con.setAutoCommit(false)`로 설정한 뒤, 모든 작업이 성공하면 `con.commit()`, 하나라도 실패하면 `con.rollback()`을 호출해야 한다.
- 이번 프로젝트에서는 기본적인 SELECT 위주였지만, 이후 INSERT/UPDATE/DELETE 시 이 과정이 필수임을 인지했다.

---

## 7. JDBC의 한계와 MyBatis로의 진화

JDBC를 직접 써보며 느낀 고충은 코드의 중복(Boilerplate code)이 너무 심하다는 것이었다. 이를 해결하는 프레임워크가 바로 MyBatis다.

### 7-1. MyBatis는 무엇을 해주는가?
- **Connection 관리 자동화**: `JDBCTemplate`에서 직접 했던 연결 생성과 해제를 프레임워크가 대신 해준다.
- **매핑 자동화**: `ResultSet`에서 데이터를 하나하나 꺼내 `setXXX()`를 호출하던 노가다를 설정 하나로 끝내준다.
- **동적 쿼리 지원**: XML 안에서 if문이나 foreach문을 사용하여 상황에 따라 변하는 SQL을 쉽게 짤 수 있게 해준다.

### 7-2. JDBC 패턴과 MyBatis의 연결고리
- 우리가 직접 만든 `connection-info.properties`는 MyBatis의 `mybatis-config.xml` 설정으로 발전한다.
- 직접 구현한 `JDBCTemplate`은 MyBatis의 `SqlSession` 객체가 그 역할을 대신한다.
- `employee-query.xml`에 저장했던 쿼리 방식은 MyBatis의 Mapper XML 구조와 매우 유사하다.

---

## 8. 상세 실습 회고 (Deep Dive)

### 8-1. Connection Leak (연결 누수) 방지
- 실습 중 자원을 제대로 닫지 않으면 DB의 최대 연결 수를 초과하여 서버가 뻗을 수 있다는 것을 배웠다.
- `finally` 블록에서 `null` 체크를 하고 역순으로 닫아주는 정석적인 패턴을 몸에 익혔다.

### 8-2. 예외 처리 전략
- `SQLException`은 체크 예외(Checked Exception)이므로 반드시 처리해야 한다.
- 하지만 모든 곳에서 `try-catch`를 남발하기보다는, 적절한 계층으로 예외를 던져서 한곳에서 처리하는 전략이 필요함을 느꼈다.

### 8-3. LIKE 검색의 함정
- `PreparedStatement`에서 `LIKE '%?%'`는 동작하지 않는다.
- `CONCAT('%', ?, '%')`를 쓰거나 자바에서 키워드에 `%`를 붙여서 넘겨야 한다는 실무적인 팁을 얻었다.

---

## 9. JDBC 아키텍처와 디자인 패턴

학습한 코드를 구조적으로 뜯어보면 디자인 패턴이 녹아 있다.

### 9-1. Singleton 패턴 (Connection 관리)
- 실습 코드에서는 명시적인 싱글톤을 쓰진 않았지만, 커넥션 풀을 쓸 때는 하나의 풀 객체를 공유하는 싱글톤 방식이 주로 쓰인다는 것을 알게 되었다.

### 9-2. Template Method 패턴
- `JDBCTemplate`은 실행 흐름의 뼈대를 잡아주는 역할을 했다.

### 9-3. DAO(Data Access Object) 패턴의 필요성
- 비즈니스 로직(Application)과 데이터 접근 로직을 분리해야 코드가 깔끔해진다는 것을 깨달았다.
- 다음 프로젝트에서는 DAO 클래스를 따로 만들어 쿼리 실행 로직만 모아둘 계획이다.

---

## 10. 결론

모든 자동화된 프레임워크의 이면에는 이 원시적인 JDBC 코드가 돌고 있다. 이번 프로젝트를 통해 데이터베이스와 대화하는 가장 기초적인 언어를 배웠고, 왜 우리가 MyBatis나 JPA를 써야 하는지 그 당위성을 뼈저리게 느꼈다.

### 앞으로의 학습 방향
1. **Connection Pool**: 매번 연결을 생성하는 비용을 줄이기 위해 HikariCP 같은 라이브러리를 적용해볼 것
2. **Spring JDBC**: 스프링이 제공하는 JdbcTemplate을 써서 `try-catch-finally` 그만쓰기
3. **MyBatis**: XML 매퍼를 통해 SQL을 자바 코드와 완전히 격리하는 실무적인 아키텍처를 구축해볼 것

---

## [부록] JDBC 프로그래밍 7단계 요약

1. **드라이버 등록**: `Class.forName()`을 이용한 드라이버 로드.
2. **연결 생성**: `DriverManager.getConnection()`으로 DB 연결.
3. **문장 객체 생성**: `Statement` 또는 `PreparedStatement` 생성.
4. **쿼리 실행**: `executeQuery()` 또는 `executeUpdate()` 실행.
5. **결과 처리**: `ResultSet`을 사용하여 데이터 읽기.
6. **트랜잭션 관리**: `commit()` 또는 `rollback()` 처리.
7. **자원 해제**: 사용한 객체들을 `close()`로 반납.

---

### [심화 주제: SQL Injection과 PreparedStatement의 방어 기제]

Statement를 사용할 때 다음과 같은 입력을 받는다고 가정하자.
- 입력값: `admin' --`
- 완성된 쿼리: `SELECT * FROM USER WHERE ID = 'admin' --' AND PW = '...'`
- 결과: 뒷부분이 주석 처리되어 비밀번호 없이 로그인이 성공한다.

PreparedStatement는 입력값 `admin' --`를 하나의 문자열 값으로 처리하기 위해 따옴표를 이스케이프(`\'`) 처리한다.
- DB는 이를 문법이 아닌 순수한 데이터로 인식하므로 공격이 무력화된다.

이러한 보안 원리를 이해하는 것이 단순 코딩보다 훨씬 중요하다는 점을 가슴에 새겼다.

---

### [데이터 타입 매핑 테이블]

| SQL 타입 | 자바 타입 | ResultSet 메소드 |
| :--- | :--- | :--- |
| CHAR, VARCHAR | String | getString() |
| INT, INTEGER | int | getInt() |
| BIGINT | long | getLong() |
| DOUBLE | double | getDouble() |
| DATE, DATETIME | java.sql.Date / Timestamp | getDate() / getTimestamp() |



# MyBatis 강의록

## MyBatis란?

MyBatis는 Java 애플리케이션에서 SQL을 직접 작성하면서도 JDBC의 반복적인 보일러플레이트 코드(Connection 생성, PreparedStatement 준비, ResultSet 순회 등)를 없애주는 **SQL Mapper 프레임워크**다.

ORM(Object-Relational Mapping) 프레임워크인 JPA/Hibernate와는 다르다. JPA는 SQL을 프레임워크가 자동으로 생성하지만, MyBatis는 개발자가 SQL을 직접 작성한다. 복잡한 쿼리가 많은 프로젝트나 DBA와 협업하는 환경에서 MyBatis가 유리하다.

MyBatis가 처리해주는 것은 다음과 같다.
- `Connection`, `PreparedStatement`, `ResultSet` 생성과 반환
- SQL 파라미터 바인딩 (`?` 처리)
- `ResultSet`을 Java 객체로 변환 (ORM의 부분 기능)
- 트랜잭션 관리

---

## chap01 - MyBatis 연결 설정 (connection-config)

MyBatis를 처음 사용하려면 DB 연결 정보와 SQL을 어디서 읽어올지 설정해야 한다. 설정 방법은 **Java 코드 방식**과 **XML 방식** 두 가지가 있다.

### 프로젝트 의존성

```groovy
// build.gradle
dependencies {
    implementation 'org.mybatis:mybatis:3.5.19'
    implementation 'com.mysql:mysql-connector-j:9.7.0'
}
```

MyBatis 라이브러리와 MySQL JDBC 드라이버를 추가한다. MyBatis는 내부적으로 JDBC를 사용하기 때문에 JDBC 드라이버가 반드시 필요하다.

---

### Section 01 - Java 코드로 설정 (javaconfig)

MyBatis의 핵심 객체들을 Java 코드로 직접 조립하는 방식이다. 설정의 흐름을 코드로 이해하기에 좋다.

**전체 흐름**

```plain
1. Environment 생성 (트랜잭션 매니저 + DataSource)
        ↓
2. Configuration 생성 + Mapper 인터페이스 등록
        ↓
3. SqlSessionFactory 생성
        ↓
4. SqlSession 열기
        ↓
5. Mapper 가져와서 쿼리 실행
```

#### Environment

`Environment`는 MyBatis가 사용할 DB 환경 정보를 담는 객체다.

```java
Environment environment = new Environment(
    "dev",                                              // 환경 ID (식별자)
    new JdbcTransactionFactory(),                       // 트랜잭션 매니저
    new PooledDataSource(DRIVER, URL, USER, PASSWORD)   // DataSource
);
```

**트랜잭션 매니저 종류**

| 종류 | 설명 |
|------|------|
| `JdbcTransactionFactory` | 개발자가 `commit()` / `rollback()`을 직접 호출 |
| `ManagedTransactionFactory` | WAS나 Spring 같은 외부 컨테이너가 트랜잭션을 대신 관리 |

일반적인 순수 Java 환경에서는 `JdbcTransactionFactory`를 쓴다.

**DataSource 종류**

| 종류 | 설명 |
|------|------|
| `PooledDataSource` | 커넥션 풀(Connection Pool)을 사용. 실무 표준 |
| `UnpooledDataSource` | 요청마다 새 Connection을 생성하고 닫음. 테스트용 |

`PooledDataSource`는 미리 여러 개의 DB Connection을 만들어두고 재사용한다. 매번 Connection을 새로 만드는 비용(TCP 연결, 인증)이 없어서 성능이 좋다.

#### Configuration

`Configuration`은 MyBatis의 모든 설정을 담는 중앙 객체다.

```java
Configuration configuration = new Configuration(environment);
configuration.addMapper(Mapper.class);
```

`addMapper()`로 Mapper 인터페이스를 등록하면 MyBatis가 그 인터페이스를 관리한다. MyBatis는 내부적으로 **동적 프록시(Dynamic Proxy)**로 인터페이스의 구현 객체를 런타임에 자동 생성한다. 개발자는 인터페이스만 정의하면 된다.

#### SqlSessionFactory

```java
SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(configuration);
```

`SqlSessionFactory`는 `SqlSession`을 찍어내는 공장 역할을 한다. 애플리케이션 전체에서 **딱 하나만** 만들어야 한다. 생성 비용이 크기 때문에 싱글톤으로 관리한다.

`SqlSessionFactoryBuilder`는 `SqlSessionFactory`를 만든 뒤 더 이상 필요 없어지므로 지역 변수로 써도 된다.

#### SqlSession

```java
SqlSession sqlSession = sqlSessionFactory.openSession(false);
```

`SqlSession`은 실제 SQL을 실행하는 객체다. DB와 1:1로 연결된 세션이라고 보면 된다.

`openSession(false)`: auto-commit을 끈다. 이후 `commit()` 또는 `rollback()`을 직접 호출해야 변경 사항이 반영된다.  
`openSession(true)`: auto-commit을 켠다. 쿼리 실행 즉시 자동으로 DB에 반영된다.

`SqlSession`은 사용 후 반드시 `close()`를 호출해야 한다. 그렇지 않으면 커넥션 풀의 Connection이 반환되지 않아 풀이 고갈된다.

#### Mapper 인터페이스 (어노테이션 방식)

```java
public interface Mapper {
    @Select("SELECT CURDATE()")
    java.util.Date selectSysdate();
}
```

`@Select` 어노테이션으로 SQL을 메서드에 직접 붙인다. 메서드명이 쿼리의 ID 역할을 한다.

```java
Mapper mapper = sqlSession.getMapper(Mapper.class);
java.util.Date date = mapper.selectSysdate();
```

`getMapper()`로 Mapper 구현 객체를 받아서 메서드를 호출하면 MyBatis가 등록된 SQL을 실행하고 결과를 반환한다.

---

### Section 02 - XML 파일로 설정 (xmlconfig)

실무에서는 Java 코드 방식보다 XML 방식을 더 많이 쓴다. SQL과 설정이 코드와 분리되어 관리하기 편하기 때문이다.

#### mybatis-config.xml

MyBatis 설정의 중심 파일이다. `src/main/resources`에 위치한다.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration
        PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
    <environments default="dev">
        <environment id="dev">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <property name="driver" value="com.mysql.cj.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql://localhost/menudb"/>
                <property name="username" value="ohgiraffers"/>
                <property name="password" value="ohgiraffers"/>
            </dataSource>
        </environment>
    </environments>
    <mappers>
        <mapper resource="mapper.xml"/>
    </mappers>
</configuration>
```

`<!DOCTYPE configuration ...>` 선언은 MyBatis가 제공하는 DTD를 참조해서 XML 문법을 검증한다. 태그 순서나 오타가 있으면 파싱 단계에서 오류가 난다.

`<environments default="dev">`: 여러 환경(dev, prod 등)을 정의하고 기본값을 지정한다.  
`<transactionManager type="JDBC"/>`: Java 코드 방식의 `JdbcTransactionFactory`와 동일하다.  
`<dataSource type="POOLED">`: 커넥션 풀을 사용한다.  
`<mappers>`: SQL이 담긴 Mapper XML 파일의 위치를 등록한다.

#### mapper.xml

SQL 문을 작성하는 파일이다.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="mapper">
    <select id="selectSysdate" resultType="java.util.Date">
        SELECT CURDATE()
    </select>
</mapper>
```

`namespace`: 이 Mapper 파일의 고유 이름표다. Java 코드에서 쿼리를 호출할 때 `"namespace.id"` 형식으로 지정한다.  
`id`: 쿼리의 고유 식별자다.  
`resultType`: 쿼리 결과를 어떤 Java 타입으로 변환할지 지정한다.

#### Java 코드에서 XML 설정 읽기

```java
String resource = "mybatis-config.xml";
InputStream inputStream = Resources.getResourceAsStream(resource);
SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);
SqlSession session = sqlSessionFactory.openSession(false);

java.util.Date date = session.selectOne("mapper.selectSysdate");
```

`Resources.getResourceAsStream()`: MyBatis가 제공하는 유틸리티로 classpath에서 XML 파일을 읽어 `InputStream`으로 반환한다.

`session.selectOne("mapper.selectSysdate")`: Mapper 인터페이스 없이 `"namespace.id"` 문자열로 직접 쿼리를 실행한다. 결과가 1건이면 `selectOne`, 여러 건이면 `selectList`를 쓴다.

---

## chap02 - MyBatis 라이프사이클 (lifecycle)

MyBatis의 핵심 객체인 `SqlSessionFactory`와 `SqlSession`의 **생명 주기(Lifecycle)**를 이해하는 것이 중요하다.

### SqlSessionFactory의 라이프사이클 - 싱글톤

`SqlSessionFactory`는 생성 비용이 크고, 내부에 DB 연결 정보와 캐시를 모두 담고 있다. 그래서 **앱 실행 중 딱 하나만 만들어야 한다**.

```java
public class Template {

    private static SqlSessionFactory sqlSessionFactory;  // static 필드 = 싱글톤

    public static SqlSession getSqlSession() {

        if (sqlSessionFactory == null) {  // 최초 한 번만 생성
            String resource = "mybatis-config.xml";
            try {
                InputStream inputStream = Resources.getResourceAsStream(resource);
                sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        System.out.println("sqlSessionFactory " + sqlSessionFactory.hashCode());

        SqlSession sqlSession = sqlSessionFactory.openSession(false);
        System.out.println("sqlSession " + sqlSession.hashCode());

        return sqlSession;
    }
}
```

`static` 필드로 선언해서 클래스가 로딩될 때 메모리에 올라가고, 앱이 종료될 때까지 유지된다. `if (sqlSessionFactory == null)` 조건으로 두 번 이상 만들지 않는다.

### SqlSession의 라이프사이클 - 매번 새로 생성

`SqlSession`은 하나의 DB 작업 단위다. 요청마다 새로 열고, 사용이 끝나면 반드시 닫아야 한다.

```java
public class Application {
    public static void main(String[] args) {
        printAndCloseSession();
        printAndCloseSession();
        printAndCloseSession();
        printAndCloseSession();
        printAndCloseSession();
    }

    private static void printAndCloseSession() {
        SqlSession sqlSession = getSqlSession();
        try {
            System.out.println(sqlSession);
        } finally {
            sqlSession.close();  // 반드시 close
        }
    }
}
```

이 코드를 실행하면 콘솔에 다음과 같이 출력된다.

```plain
sqlSessionFactory 123456789  ← 항상 같은 해시코드
sqlSession 111111111         ← 매번 다른 해시코드

sqlSessionFactory 123456789
sqlSession 222222222

sqlSessionFactory 123456789
sqlSession 333333333
...
```

`sqlSessionFactory`의 해시코드는 5번 모두 동일하다. 같은 객체를 재사용한다는 증거다.  
`sqlSession`의 해시코드는 매번 다르다. 호출할 때마다 새로운 `SqlSession` 인스턴스가 만들어진다는 증거다.

### `finally` 블록에서 close()

```java
try {
    // DB 작업
} finally {
    sqlSession.close();
}
```

`finally`는 예외가 발생하더라도 반드시 실행되는 블록이다. DB 작업 중 예외가 나더라도 `close()`가 보장된다. 만약 `close()`를 빠뜨리면 커넥션 풀의 Connection이 계속 점유되어 결국 새 요청을 처리하지 못하게 된다.

### SqlSessionFactory vs SqlSession 비교

| 항목 | SqlSessionFactory | SqlSession |
|------|------------------|-----------|
| 생성 시점 | 앱 시작 시 1회 | 요청마다 |
| 생존 범위 | 앱 종료까지 | 요청 처리 완료까지 |
| 개수 | 1개 (싱글톤) | 여러 개 (요청마다) |
| 역할 | SqlSession 공장 | SQL 실행 |
| close() | 불필요 | 반드시 필요 |

---

## chap03 - CRUD 실습 (crud)

실제 메뉴 관리 기능을 3-Layer 아키텍처로 구현한다. 사용 DB 테이블은 `tbl_menu`이며 메뉴 조회 기능을 중심으로 MyBatis를 활용한다.

### 3-Layer 아키텍처

```plain
사용자 입력
    ↓
Application.java       ← 진입점 (main)
    ↓
MenuController         ← 사용자 요청 처리, 뷰 결정
    ↓
MenuService            ← 비즈니스 로직, 트랜잭션 관리
    ↓
MenuDAO                ← DB 접근, SQL 실행
    ↓
MyBatis (menu-mapper.xml)
    ↓
MySQL (tbl_menu)
```

각 레이어의 역할이 명확하게 분리되어 있다. Controller는 Service를 호출하고, Service는 DAO를 호출한다. DAO만 MyBatis를 직접 다룬다.

### 패키지 구조

```plain
com.ohgiraffers.section01.xmlconfig/
├── Application.java      # 진입점, 메뉴 UI 루프
├── MenuController.java   # 요청 처리 레이어
├── MenuService.java      # 비즈니스 로직 레이어
├── MenuDAO.java          # DB 접근 레이어
├── MenuDTO.java          # 데이터 전달 객체
├── PrintResult.java      # 화면 출력 담당
└── Template.java         # SqlSession 유틸리티

resources/com/ohgiraffers/section01/xmlconfig/
├── mybatis-config.xml    # MyBatis 설정
└── menu-mapper.xml       # SQL 정의
```

XML 파일의 경로(`resources/com/ohgiraffers/section01/xmlconfig/`)가 Java 소스 패키지 경로와 동일하다. 이렇게 맞추면 MyBatis 설정에서 경로를 지정할 때 혼란이 없다.

### MenuDTO - 데이터 전달 객체

```java
public class MenuDTO implements java.io.Serializable {

    private int code;
    private String name;
    private int price;
    private int categoryCode;
    private String orderableStatus;

    // 기본 생성자, 전체 생성자, getter/setter, toString()
}
```

DTO(Data Transfer Object)는 레이어 간 데이터를 담아 전달하는 객체다. DB에서 읽은 데이터를 이 객체에 담아 Controller까지 올라간다.

`Serializable`을 구현하면 이 객체를 바이트 스트림으로 직렬화할 수 있다. 네트워크 전송이나 세션 저장 시 필요하다.

필드명이 **camelCase**인 것에 주목해야 한다. DB 컬럼명은 보통 **snake_case**(`menu_code`, `menu_name`)를 쓰는데, MyBatis가 자동으로 매핑하지 못한다. 이 문제를 `resultMap`으로 해결한다.

### menu-mapper.xml - resultMap과 SQL

```xml
<mapper namespace="MenuMapper">

    <resultMap id="menuResultMap" type="com.ohgiraffers.section01.xmlconfig.MenuDTO">
        <id property="code" column="menu_code"/>
        <result property="name" column="menu_name"/>
        <result property="price" column="menu_price"/>
        <result property="categoryCode" column="category_code"/>
        <result property="orderableStatus" column="orderable_status"/>
    </resultMap>

    <select id="selectAllMenu" resultMap="menuResultMap">
        SELECT menu_code
             , menu_name
             , menu_price
             , category_code
             , orderable_status
        FROM tbl_menu
        WHERE orderable_status = "Y"
        ORDER BY menu_code
    </select>

</mapper>
```

#### resultMap

`resultMap`은 DB 컬럼명과 Java 객체 필드명이 다를 때 직접 매핑 규칙을 정의하는 태그다.

- `type`: 매핑할 Java 클래스를 풀패키지명으로 지정한다.
- `<id>`: PK 컬럼을 지정한다. `property`는 DTO 필드명, `column`은 DB 컬럼명이다.
- `<result>`: 일반 컬럼을 지정한다. `<id>`와 구조가 동일하다.

`<id>`와 `<result>`를 구분하는 이유는 MyBatis가 PK를 기준으로 객체 캐시를 관리하기 때문이다. PK를 명시하면 동일한 PK를 가진 결과를 중복 생성하지 않는다.

만약 컬럼명과 필드명이 완전히 일치하거나, mybatis-config.xml에서 `mapUnderscoreToCamelCase=true` 설정을 켜면 `resultMap` 없이 `resultType`만으로도 자동 매핑된다.

#### SELECT 쿼리

```sql
SELECT menu_code
     , menu_name
     , menu_price
     , category_code
     , orderable_status
FROM tbl_menu
WHERE orderable_status = "Y"
ORDER BY menu_code
```

`WHERE orderable_status = "Y"`: 주문 가능한 메뉴만 조회한다.  
`ORDER BY menu_code`: 메뉴 코드 기준 오름차순 정렬이다.

### MenuDAO - DB 접근 레이어

```java
public class MenuDAO {

    public List<MenuDTO> selectAllMenu(SqlSession sqlSession) {
        return sqlSession.selectList("MenuMapper.selectAllMenu");
    }
}
```

DAO(Data Access Object)는 DB와 직접 통신하는 유일한 레이어다. `SqlSession`을 받아서 `selectList()`를 호출한다.

`"MenuMapper.selectAllMenu"`: `namespace.id` 형식으로 실행할 SQL을 지정한다. `MenuMapper`는 `menu-mapper.xml`의 `namespace` 속성값이고, `selectAllMenu`는 `<select>` 태그의 `id` 속성값이다.

`selectList()`는 결과가 0개 이상일 때 사용한다. 결과가 없으면 빈 리스트를 반환한다 (null이 아니다).

### MenuService - 비즈니스 로직 레이어

```java
public class MenuService {

    private final MenuDAO menuDAO;

    public MenuService() {
        menuDAO = new MenuDAO();
    }

    public List<MenuDTO> selectAllMenu() {

        SqlSession sqlSession = getSqlSession();

        try {
            return menuDAO.selectAllMenu(sqlSession);
        } finally {
            sqlSession.close();
        }
    }
}
```

Service 레이어에서 `SqlSession`을 열고 닫는다. `SqlSession`의 생명 주기를 Service가 관리하는 것이다.

조회 작업은 DB 데이터를 변경하지 않기 때문에 `commit()`이나 `rollback()`이 필요 없다. 단순히 `close()`로 세션을 반환한다.

만약 INSERT, UPDATE, DELETE 작업이라면 다음과 같이 처리해야 한다.

```java
try {
    int result = menuDAO.insertMenu(sqlSession, menu);
    if (result > 0) {
        sqlSession.commit();
    } else {
        sqlSession.rollback();
    }
    return result;
} catch (Exception e) {
    sqlSession.rollback();
    throw e;
} finally {
    sqlSession.close();
}
```

### MenuController - 요청 처리 레이어

```java
public class MenuController {

    private final MenuService menuService;
    private final PrintResult printResult;

    public MenuController() {
        printResult = new PrintResult();
        menuService = new MenuService();
    }

    public void selectAllMenu() {
        List<MenuDTO> menuList = menuService.selectAllMenu();
        printResult.printMenuList(menuList);
    }
}
```

Controller는 사용자 입력을 받아서 Service를 호출하고, 결과를 `PrintResult`에 넘겨 화면에 출력한다. Service의 반환값에 따라 성공/실패 화면을 결정하는 역할도 Controller가 담당한다.

### PrintResult - 출력 담당

```java
public class PrintResult {

    public void printMenuList(List<MenuDTO> menuList) {
        menuList.forEach(System.out::println);
    }
}
```

`forEach(System.out::println)`은 메서드 참조(Method Reference) 문법이다. `menuList`의 각 요소에 대해 `System.out.println(element)`를 호출한다. `MenuDTO`의 `toString()`이 자동으로 호출된다.

### Application - 진입점

```java
public class Application {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        MenuController menuController = new MenuController();

        do {
            System.out.println(" ====== 메뉴관리 ======= ");
            System.out.println("1. 메뉴 전체 조회");
            System.out.println("2. 메뉴 코드로 메뉴 조회");
            System.out.println("3. 신규 메뉴 추가");
            System.out.println("4. 메뉴 수정");
            System.out.println("5. 메뉴 삭제");
            System.out.print("메뉴 관리 번호를 입력하세요 : ");
            int no = sc.nextInt();

            switch (no) {
                case 1: menuController.selectAllMenu(); break;
                default: System.out.println("잘못된 메뉴를 선택하셨습니다"); break;
            }
        } while (true);
    }
}
```

`do-while(true)` 무한 루프로 프로그램이 계속 실행된다. 사용자가 번호를 선택하면 해당 기능을 실행한다. 현재 구현은 1번(전체 조회)만 되어 있고, 나머지는 이후에 추가할 수 있는 구조로 작성되어 있다.

### Template - SqlSession 유틸리티

```java
public class Template {

    private static SqlSessionFactory sqlSessionFactory;

    public static SqlSession getSqlSession() {

        if (sqlSessionFactory == null) {
            String resource = "com/ohgiraffers/section01/xmlconfig/mybatis-config.xml";
            try {
                InputStream inputStream = Resources.getResourceAsStream(resource);
                sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        SqlSession sqlSession = sqlSessionFactory.openSession(false);
        return sqlSession;
    }
}
```

chap02에서 만든 Template 패턴을 그대로 이어받는다. `SqlSessionFactory`를 싱글톤으로 관리하고, `getSqlSession()`을 호출할 때마다 새 `SqlSession`을 반환한다. XML 파일 경로가 패키지 경로를 포함하는 것에 주의한다.

---

## 전체 정리

### MyBatis 설정 방식 비교

| 방식 | 장점 | 단점 |
|------|------|------|
| Java 코드 방식 | IDE 자동완성, 컴파일 타임 오류 검출 | 코드와 설정이 혼재 |
| XML 방식 | 설정과 코드 분리, 재컴파일 없이 수정 가능 | XML 문법 오류를 런타임에 발견 |

실무에서는 XML 방식이 표준이다. SQL을 별도 파일로 관리하면 DBA와 개발자가 분업하기 쉽고, 복잡한 쿼리도 가독성 있게 작성할 수 있다.

### 핵심 객체 정리

**SqlSessionFactoryBuilder**  
`SqlSessionFactory`를 만들기 위한 빌더다. 한 번 만들고 나면 더 이상 쓰지 않는다.

**SqlSessionFactory**  
앱 전체에서 하나만 존재하는 싱글톤 객체다. `SqlSession`을 생성하는 역할이다. 내부에 DB 연결 설정, Mapper 정보, 캐시를 담고 있다.

**SqlSession**  
하나의 DB 작업 세션이다. 요청마다 새로 생성하고, 작업이 끝나면 `close()`로 반환한다. 스레드 안전하지 않으므로(Not Thread-Safe) 여러 스레드에서 공유하면 안 된다.

**Mapper**  
SQL과 Java 메서드를 연결하는 인터페이스다. MyBatis가 동적 프록시로 구현체를 자동 생성해준다.

### resultMap 사용 기준

DB 컬럼명과 DTO 필드명이 다를 때 반드시 `resultMap`을 써야 한다. 

컬럼명과 필드명이 같거나, `mybatis-config.xml`에 아래 설정을 추가하면 자동 변환이 된다.

```xml
<settings>
    <setting name="mapUnderscoreToCamelCase" value="true"/>
</settings>
```

이 설정을 켜면 `menu_code` → `menuCode`, `category_code` → `categoryCode`처럼 snake_case를 camelCase로 자동 변환한다.

### 트랜잭션 처리 원칙

- **SELECT**: `commit()`/`rollback()` 불필요, `close()`만 한다.
- **INSERT / UPDATE / DELETE**: 성공 시 `commit()`, 실패 시 `rollback()`, 예외 발생 시도 `rollback()`, 최종적으로 `finally`에서 `close()`한다.

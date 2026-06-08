# MyBatis 심화 강의록: 동적 SQL과 Spring Boot 연동

MyBatis의 핵심인 **동적 SQL(Dynamic SQL)**의 활용법과, 현대적인 자바 백엔드 개발의 표준인 **Spring Boot와의 연동(Spring-MyBatis)** 과정을 기록하는 노트이다.

---

## 1. MyBatis의 탄생 배경

과거 JDBC(Java Database Connectivity) 기반 개발은 다음과 같은 문제가 있다.
*   **생산성 저하:** 반복되는 `Connection`, `PreparedStatement`, `ResultSet` 처리 코드
*   **가독성 최악:** Java 코드 사이에 뒤섞인 SQL 문자열
*   **유지보수 난해:** SQL 변경 시 자바 소스를 다시 컴파일

MyBatis(구 iBatis)는 이러한 페인 포인트를 해결하기 위한 것이다. **SQL을 코드에서 분리하여 XML이나 어노테이션으로 관리하자**는 것이 핵심 철학이다. 이를 통해 SQL은 DB 전문가나 쿼리 작성에 집중할 수 있고, 자바 개발자는 비즈니스 로직에만 전념할 수 있게 되었다.

---

## 2. Chapter 04: 동적 SQL (Dynamic SQL) 심층 분석

### 2.1 if 엘리먼트

| 속성 | 설명 |
| :--- | :--- |
| `test` | 해당 SQL 조각을 포함할지 결정하는 OGNL 표현식 |

**[코드 분석] 가격대별 검색 로직**
```xml
<select id="selectMenuByPrice" parameterType="hashmap" resultMap="menuResultMap">
    SELECT * FROM tbl_menu
    WHERE ORDERABLE_STATUS = 'Y'
    <if test="price gte 0 and price lte 10000">
        AND MENU_PRICE &lt; #{ price }
    </if>
    <if test="price gt 10000 and price lte 20000">
        AND MENU_PRICE BETWEEN 10000 and #{ price }
    </if>
</select>
```
* XML 내부에서 `<`, `>` 기호를 직접 쓰면 에러가 날 수 있다. `&lt;`, `&gt;` 엔티티를 쓰거나 `<![CDATA[ ]]>`로 감싸는 것이 정석이라고 한다

### 2.2 choose, when, otherwise
다중 `if-else` 구조다. 하나라도 만족하면 중단

**[코드 분석] 카테고리 필터링**
```xml
<choose>
    <when test="value == '식사'">
        AND CATEGORY_CODE IN (4, 5, 6, 7)
    </when>
    <when test="value == '음료'">
        AND CATEGORY_CODE IN (8, 9, 10)
    </when>
    <otherwise>
        AND CATEGORY_CODE IN (11, 12)
    </otherwise>
</choose>
```

### 2.3 foreach 엘리먼트
자바의 `for` 루프와 동일하며, 리스트나 배열을 SQL에 녹일 때 사용

| 속성 | 설명 |
| :--- | :--- |
| `collection` | 반복할 객체명 (Map의 key 혹은 List명) |
| `item` | 반복문 내부에서 사용할 변수명 |
| `open` | 전체 구문의 시작 문자열 |
| `close` | 전체 구문의 종료 문자열 |
| `separator` | 요소 간 구분자 |

**[코드 분석] 다중 코드 조회**
```xml
<select id="searchMenuByRandomMenuCode" parameterType="hashmap" resultMap="menuResultMap">
    SELECT * FROM tbl_menu
    WHERE MENU_CODE IN
    <foreach collection="randomMenuCodeList" item="menuCode" open="(" separator="," close=")">
        #{ menuCode }
    </foreach>
</select>
```

### 2.4 where와 trim: 접두사 관리
SQL을 동적으로 조립하다 보면 `WHERE` 키워드를 붙일지 첫 번째 조건의 `AND`를 뗄지 망설여 진다

1.  **`<where>`:** 
    *   내용물이 있으면 `WHERE` 자동 추가
    *   내용물이 `AND`나 `OR`로 시작하면 자동 제거
2.  **`<trim>`:** 
    *   `prefixOverrides`: 내용 맨 앞의 특정 단어 제거
    *   `suffixOverrides`: 내용 맨 뒤의 특정 단어 제거

**[팁]** `<where>`는 사실 `<trim prefix="WHERE" prefixOverrides="AND | OR">`의 축약형이다.

### 2.5 set 태그와 업데이트 전략
`UPDATE` 문에서 컬럼마다 콤마(,)를 붙이는 작업은 매우 까다롭다. `<set>`은 이를 자동으로 처리한다.

```xml
<update id="modifyMenu">
    UPDATE TBL_MENU
    <set>
        <if test="name != null">MENU_NAME = #{name},</if>
        <if test="status != null">ORDERABLE_STATUS = #{status},</if>
    </set>
    WHERE MENU_CODE = #{code}
</update>
```

---

## 3. MyBatis vs JPA

끊이지 않는 논쟁이다

| 구분 | MyBatis | JPA (Hibernate) |
| :--- | :--- | :--- |
| **성격** | SQL Mapper (SQL 중심) | ORM (객체 중심) |
| **장점** | SQL 튜닝 용이, 직관적 | 객체 지향적 설계, 생산성 폭발 |
| **단점** | 단순 CRUD도 직접 작성 | 학습 곡선이 높음, 성능 이슈 관리 |
| **추천** | 통계성 쿼리가 많거나 복잡한 SQL 중심 | 도메인 모델이 복잡하고 CRUD가 많은 경우 |

---

## 4. Chapter 05: Spring Boot와 MyBatis 연동

MyBatis를 Spring Boot에 적용해보자

### 4.1 @Mapper
인터페이스만 선언하고 `@Mapper`를 붙이면, Spring Boot가 부팅될 때 XML과 연결된 프록시 객체를 자동으로 빈(Bean)으로 등록한다.

### 4.2 application.yml
```yaml
mybatis:
  mapper-locations: classpath:mappers/**/*.xml
  configuration:
    map-underscore-to-camel-case: true  # menu_name -> name 자동 매핑
```

### 4.3 서비스 아키텍처 흐름
1.  **Controller:** 요청을 받고 응답 형식을 결정 (`ResponseEntity`).
2.  **Service:** `@Transactional`로 비즈니스 로직과 트랜잭션 경계 설정.
3.  **Mapper:** DB 쿼리 실행.

---

## 5. 트러블슈팅 가이드

### 5.1 #{} vs ${}
*   **`#{ }`**: `?` 파라미터 바인딩. 안전하다.
*   **`${ }`**: 문자열 치환. SQL Injection 위험이 크다. 오직 테이블명이나 정렬(ORDER BY) 컬럼을 동적으로 바꿀 때만 사용한다.

### 5.2 N+1 문제와 MyBatis
MyBatis에서도 연관 관계를 잘못 설정하면(예: `association`, `collection`의 지연 로딩) 성능 저하가 올 수 있다. `resultMap`을 활용해 한 번에 조인(Join)해서 가져오는 `fetch join` 전략을 주로 사용한다.

---

## 6. 부록: 소스 코드 상세 주해 (Appendix)

### 6.1 DynamicSqlMapper.xml (전체 분석)

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ohgiraffers.section01.DynamicSqlMapper">

    <!-- 1. 공통 결과 매핑: DB 컬럼명과 Java 필드명이 다를 때 필수 -->
    <resultMap id="menuResultMap" type="MenuDTO">
        <id property="code" column="MENU_CODE"/>
        <result property="name" column="MENU_NAME"/>
        <result property="price" column="MENU_PRICE"/>
        <result property="categoryCode" column="CATEGORY_CODE"/>
        <result property="orderableStatus" column="ORDERABLE_STATUS"/>
    </resultMap>

    <!-- 2. <if> 태그를 이용한 가격대별 동적 조회 -->
    <select id="selectMenuByPrice" parameterType="hashmap" resultMap="menuResultMap">
        SELECT A.MENU_CODE, A.MENU_NAME, A.MENU_PRICE, A.CATEGORY_CODE, A.ORDERABLE_STATUS
        FROM tbl_menu A
        WHERE A.ORDERABLE_STATUS = 'Y'
        
        <!-- price가 0~10,000원 사이일 때 -->
        <if test="price gte 0 and price lte 10000" >
            <![CDATA[ AND A.MENU_PRICE < #{ price } ]]>
        </if>
        
        <!-- price가 10,000~20,000원 사이일 때 -->
        <if test="price gt 10000 and price lte 20000">
            AND A.MENU_PRICE BETWEEN 10000 and #{ price }
        </if>
        
        ORDER BY A.MENU_CODE
    </select>

    <!-- 3. <choose>를 이용한 다중 조건 처리 -->
    <select id="selectMenuBySupCategory" parameterType="SearchCriteria" resultMap="menuResultMap">
        SELECT * FROM tbl_menu A
        WHERE A.ORDERABLE_STATUS = 'Y'
        <choose>
            <when test="value == '식사'">
                AND A.CATEGORY_CODE IN (4, 5, 6, 7)
            </when>
            <when test="value == '음료'">
                AND A.CATEGORY_CODE IN (8, 9, 10)
            </when>
            <otherwise>
                AND A.CATEGORY_CODE IN (11, 12)
            </otherwise>
        </choose>
        ORDER BY A.MENU_CODE
    </select>

    <!-- 4. <foreach>를 이용한 다중 코드 조회 -->
    <select id="searchMenuByRandomMenuCode" parameterType="hashmap" resultMap="menuResultMap">
        SELECT * FROM tbl_menu A
        WHERE A.MENU_CODE IN
        <foreach collection="randomMenuCodeList" item="menuCode" open="(" separator="," close=")">
            #{ menuCode }
        </foreach>
    </select>

    <!-- 5. <where>를 이용한 지능형 조건 조립 -->
    <select id="searchMenuByCodeOrSearchAll" parameterType="SearchCriteria" resultMap="menuResultMap">
        SELECT * FROM tbl_menu A
        <where>
            A.ORDERABLE_STATUS = 'Y'
            <if test="condition != null and condition eq 'menuCode'">
                AND A.MENU_CODE = #{ value }
            </if>
        </where>
    </select>

    <!-- 6. <trim>을 이용한 유연한 SQL 생성 -->
    <select id="searchMenuByNameOrCategory" parameterType="hashmap" resultMap="menuResultMap">
        SELECT * FROM tbl_menu A
        <trim prefix="WHERE" prefixOverrides="AND | OR">
            A.ORDERABLE_STATUS = 'Y'
            <if test="nameValue != null">
                AND A.MENU_NAME LIKE CONCAT ('%', #{ nameValue }, '%')
            </if>
            <if test="categoryValue != null">
                AND A.CATEGORY_CODE = #{ categoryValue }
            </if>
        </trim>
    </select>

    <!-- 7. <trim>을 이용한 동적 UPDATE -->
    <update id="modifyMenu" parameterType="hashmap">
        UPDATE TBL_MENU
        <trim prefix="SET" prefixOverrides=",">
            <if test="name != null and name != ''">
                MENU_NAME = #{ name }
            </if>
            <if test="categoryCode != null and categoryCode gt 0">
                , CATEGORY_CODE = #{ categoryCode }
            </if>
            <if test="orderableStatus != null and orderableStatus != ''">
                , ORDERABLE_STATUS = #{ orderableStatus }
            </if>
        </trim>
        WHERE MENU_CODE = #{ code }
    </update>

</mapper>
```

### 6.2 MenuMapper.xml (Spring MyBatis 연동형)
Spring 환경에서는 훨씬 간결하게 작성된다.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ohgiraffers.springmybatis.menu.model.dao.MenuMapper">

    <!-- resultMap은 재사용 가능하도록 설계 -->
    <resultMap id="menuResultMap" type="com.ohgiraffers.springmybatis.menu.model.dto.MenuDTO">
        <id property="code" column="menu_code"/>
        <result property="name" column="menu_name"/>
        <result property="price" column="menu_price"/>
        <result property="categoryCode" column="category_code"/>
        <result property="orderableStatus" column="orderable_status"/>
    </resultMap>

    <!-- 전체 조회: 간단하지만 필수적인 쿼리 -->
    <select id="findAllMenus" resultMap="menuResultMap">
        SELECT
            menu_code, menu_name, menu_price, category_code, orderable_status
        FROM tbl_menu
        WHERE orderable_status = 'Y'
        ORDER BY menu_code
    </select>

    <!-- ID별 단건 조회: 파라미터 바인딩 확인 -->
    <select id="findMenuById" resultMap="menuResultMap" parameterType="_int">
        SELECT
            menu_code, menu_name, menu_price, category_code, orderable_status
        FROM tbl_menu
        WHERE orderable_status = 'Y'
        AND menu_code = #{id}
    </select>

</mapper>
```

---

## 7. 요약

1.  **동적 SQL 태그:** `<if>`, `<choose>`, `<foreach>`, `<where>`, `<trim>`의 용도와 차이점.
2.  **Spring Boot 연동:** `@Mapper` 스캔과 `application.yml`을 이용한 설정 자동화
3.  **아키텍처 설계:** 컨트롤러-서비스-매퍼로 이어지는 표준 레이어드 아키텍처

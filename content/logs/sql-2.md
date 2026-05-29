## SUBQUERIES — 쿼리 안의 쿼리

서브쿼리는 하나의 SQL 문 안에 또 다른 SQL 문이 포함된 형태다. 괄호 `( )` 안에 작성되며, 바깥쪽 쿼리를 **메인 쿼리**, 안쪽에 중첩된 쿼리를 **서브쿼리**라고 부른다. 문제를 두 단계로 쪼개서 풀 때 유용하다.

### WHERE 절 서브쿼리

가장 기본적인 형태다. 서브쿼리가 단일 값을 반환하고, 그 값을 메인 쿼리의 조건에서 사용한다.

예를 들어 '민트미역국'과 같은 카테고리의 다른 메뉴들을 찾고 싶다고 하자. 먼저 민트미역국의 카테고리 코드를 알아야 하고, 그 다음 그 코드와 같은 카테고리 메뉴를 찾아야 한다. 이 두 단계를 서브쿼리로 한 번에 처리한다.

```sql
-- 메인쿼리
SELECT menu_name, category_code
FROM tbl_menu
WHERE
    category_code = (
        -- 서브쿼리: 민트미역국의 카테고리 코드를 가져온다
        SELECT category_code
        FROM tbl_menu
        WHERE menu_name = '민트미역국'
    );
```

서브쿼리가 먼저 실행되어 카테고리 코드 값을 반환하고, 메인 쿼리는 그 값을 조건으로 사용한다. 이처럼 서브쿼리가 독립적으로 실행되어 하나의 값을 반환하는 형태를 **단순 서브쿼리**라고 한다.

### FROM 절 서브쿼리 (파생 테이블)

서브쿼리를 `FROM` 절에 넣으면, 그 결과 자체가 임시 테이블처럼 동작한다. 이를 **파생 테이블(Derived Table)**이라고 부른다.

```sql
-- 메뉴 수가 가장 많은 카테고리의 메뉴 수를 구하기
SELECT MAX(count) AS '최대 메뉴 수'
FROM (
    -- 서브쿼리: 카테고리별 메뉴 개수를 먼저 계산
    SELECT COUNT(*) AS 'count'
    FROM tbl_menu
    GROUP BY category_code
) AS count_table;    -- 파생 테이블에는 반드시 별칭이 있어야 한다
```

서브쿼리가 만들어낸 카테고리별 메뉴 수 결과를 `count_table`이라는 가상 테이블로 취급하고, 거기서 다시 `MAX()`를 적용한다. 파생 테이블에는 반드시 별칭을 붙여야 한다는 점이 중요하다. 별칭이 없으면 에러가 발생한다.

### 상관 서브쿼리 (Correlated Subquery)

상관 서브쿼리는 안쪽 서브쿼리가 바깥쪽 메인 쿼리의 현재 행 값을 참조하는 형태다. 서브쿼리가 독립적으로 실행되지 않고, 메인 쿼리의 각 행마다 서브쿼리가 실행된다.

```sql
-- 각 메뉴가 속한 카테고리의 평균 가격보다 비싼 메뉴 조회
SELECT menu_code, menu_name, menu_price, category_code
FROM tbl_menu a
WHERE
    menu_price > (
        SELECT AVG(menu_price)
        FROM tbl_menu
        WHERE category_code = a.category_code    -- 바깥쪽 현재 행의 category_code 참조
    );
```

`a.category_code`는 바깥쪽 메인 쿼리에서 현재 처리 중인 행의 카테고리 코드다. 메인 쿼리가 각 행을 하나씩 검사할 때마다 서브쿼리도 해당 카테고리 코드로 평균을 다시 계산한다. 행이 많을수록 서브쿼리도 그만큼 많이 실행되므로, 성능에 부담이 생길 수 있다. 그래서 실무에서는 JOIN으로 대체하는 경우가 많다.

---

## SET OPERATORS — 집합 연산자

두 개의 SELECT 결과를 집합 개념으로 합치거나 교차시키는 연산자들이다. 핵심 조건이 있는데, 두 쿼리의 **컬럼 수와 데이터 타입이 일치**해야 한다.

### UNION — 합집합 (중복 제거)

두 SELECT 결과를 합치되, 중복 행은 하나만 남긴다.

```sql
-- 카테고리 코드가 10번인 메뉴들 + 가격 9000원 미만 메뉴들 (중복 제거)
SELECT menu_name, menu_price, category_code
FROM tbl_menu
WHERE category_code = 10
UNION
SELECT menu_name, menu_price, category_code
FROM tbl_menu
WHERE menu_price < 9000;
```

두 조건을 모두 만족하는 메뉴(카테고리가 10번이면서 9000원 미만)가 있어도 결과에 한 번만 나온다. UNION은 내부적으로 중복 제거를 위해 정렬 과정을 거치기 때문에 UNION ALL보다 느리다.

### UNION ALL — 합집합 (중복 포함)

두 SELECT 결과를 그냥 통째로 합친다. 중복이 있어도 제거하지 않는다.

```sql
SELECT menu_name, menu_price, category_code
FROM tbl_menu
WHERE category_code = 10
UNION ALL
SELECT menu_name, menu_price, category_code
FROM tbl_menu
WHERE menu_price < 9000;
```

두 조건을 모두 만족하는 메뉴는 결과에 두 번 나온다. 중복 제거 처리를 하지 않으므로 UNION보다 빠르다. 중복이 없다고 확신할 수 있거나 중복이 있어도 무방한 상황에서는 UNION ALL을 쓰는 게 성능상 낫다.

### 교집합 — MySQL에는 INTERSECT 없음

MySQL은 표준 SQL의 `INTERSECT` 연산자를 지원하지 않는다. 그래서 INNER JOIN이나 IN 서브쿼리로 교집합을 직접 구현해야 한다.

```sql
-- INNER JOIN으로 교집합 구현
SELECT a.menu_code, a.menu_name, a.menu_price, a.category_code
FROM tbl_menu a
INNER JOIN (
    SELECT menu_code, menu_name, menu_price, category_code
    FROM tbl_menu
    WHERE menu_price < 9000
) b ON (a.menu_code = b.menu_code)
WHERE a.category_code = 10;

-- IN 연산자로 교집합 구현
SELECT menu_code, menu_name, menu_price, category_code
FROM tbl_menu
WHERE
    category_code = 10
    AND menu_code IN (
        SELECT menu_code
        FROM tbl_menu
        WHERE menu_price < 9000
    );
```

두 방식 모두 '카테고리가 10번이면서 가격이 9000원 미만인 메뉴'를 찾는다.

### 차집합 — LEFT JOIN으로 구현

마찬가지로 MySQL에는 `MINUS` 연산자가 없다. LEFT JOIN을 활용해서 구현한다.

```sql
-- 카테고리 10번 메뉴 중에서, 가격 9000원 미만인 메뉴를 제외한 것
SELECT a.menu_code, a.menu_name, a.menu_price, a.category_code
FROM tbl_menu a
LEFT JOIN (
    SELECT menu_code, menu_name, menu_price, category_code
    FROM tbl_menu
    WHERE menu_price < 9000
) b ON (a.menu_code = b.menu_code)
WHERE
    a.category_code = 10
    AND b.menu_code IS NULL;    -- 오른쪽에서 매칭된 게 없는 행만
```

LEFT JOIN을 한 뒤 오른쪽 테이블에서 매칭된 값이 NULL인 행만 걸러내면, 오른쪽에는 없고 왼쪽에만 있는 행들, 즉 차집합이 된다. 이 패턴은 집합 연산 외에도 '어떤 조건을 만족하지 않는 행 찾기'에 두루 쓰인다.

---

## DML — 데이터 조작 언어

DML은 Data Manipulation Language의 약자로, 테이블 안의 데이터를 추가하고, 수정하고, 삭제하는 언어다. `INSERT`, `UPDATE`, `DELETE`, `REPLACE` 네 가지가 여기에 속한다. SELECT도 DML에 포함시키는 분류도 있지만, 일반적으로 DML 하면 데이터 변경 3총사를 가리킨다.

### INSERT — 행 추가

테이블에 새로운 행을 삽입한다.

```sql
-- 컬럼 순서에 맞춰 모든 값을 제공
INSERT INTO tbl_menu VALUES(null, '바나나해장국', 8500, 4, 'Y');
```

첫 번째 값이 `null`인 이유는 `menu_code`가 `AUTO_INCREMENT` 컬럼이라서 자동으로 번호가 채워지기 때문이다. NULL을 주면 DB가 알아서 다음 번호를 부여한다.

```sql
-- 특정 컬럼만 명시하여 삽입
INSERT INTO
    tbl_menu(menu_name, menu_price, category_code, orderable_status)
VALUES
    ('초콜릿죽', 6500, 7, 'N');
```

컬럼명을 직접 지정하면 순서가 달라도 되고, 명시하지 않은 컬럼은 DEFAULT 값이나 NULL이 들어간다. 이 방식이 더 안전하고 유지보수하기 좋다.

```sql
-- 한 번에 여러 행 삽입
INSERT INTO tbl_menu
VALUES
    (NULL, '초코맛아이스크림', 1700, 12, 'Y'),
    (NULL, '딸기맛아이스크림', 1500, 11, 'N'),
    (NULL, '바닐라맛아이스크림', 1200, 8, 'Y');
```

VALUES 뒤에 여러 묶음을 쉼표로 이어붙이면 한 번의 INSERT로 여러 행을 넣을 수 있다. 여러 번 INSERT를 따로 날리는 것보다 훨씬 효율적이다.

### UPDATE — 데이터 수정

이미 존재하는 행의 컬럼 값을 변경한다.

```sql
UPDATE tbl_menu
SET
    category_code = 7    -- 바꿀 내용
WHERE
    menu_code = 22;      -- 바꿀 대상
```

`SET` 절에 변경할 컬럼과 새 값을 쓰고, `WHERE` 절로 어느 행을 바꿀지 특정한다. **`WHERE` 절을 빠뜨리면 테이블의 모든 행이 수정된다.** 이건 매우 위험한 실수다. UPDATE를 날리기 전에 먼저 같은 WHERE 조건으로 SELECT를 해서 대상이 맞는지 확인하는 습관이 중요하다.

```sql
-- 먼저 이 SELECT로 바꿀 대상 확인
SELECT menu_code, category_code
FROM tbl_menu
WHERE menu_name = '바나나해장국';
```

### DELETE — 행 삭제

테이블에서 특정 행을 삭제한다.

```sql
DELETE FROM tbl_menu
WHERE menu_code = 22;
```

UPDATE와 마찬가지로 `WHERE` 절이 없으면 테이블의 모든 행이 삭제된다. 삭제 전에도 SELECT로 대상을 확인하는 게 안전하다.

### REPLACE — 중복 키 처리

PRIMARY KEY가 중복되는 상황에서 INSERT를 하면 에러가 발생한다. `REPLACE`는 이 상황을 해결해준다. 해당 키를 가진 데이터가 이미 있으면 기존 데이터를 삭제하고 새로운 데이터로 INSERT한다. 없으면 그냥 새로 INSERT한다.

```sql
-- 키가 중복되면 에러
INSERT INTO tbl_menu VALUES(17, '참기름소주', 5000, 10, 'Y');

-- REPLACE: 17번이 있으면 삭제 후 새로 삽입
REPLACE INTO tbl_menu VALUES(17, '참기름소주', 5000, 10, 'Y');
```

REPLACE는 내부적으로 DELETE + INSERT로 동작하기 때문에, AUTO_INCREMENT 값이 증가하는 부작용이 있다. 또 연결된 외래 키가 있는 경우 CASCADE 설정에 따라 연쇄적으로 영향을 줄 수 있으므로 주의해야 한다.

---

## TRANSACTION — 트랜잭션

트랜잭션은 **하나의 논리적인 작업 단위**다. "모두 성공하거나, 모두 실패해야 하는 작업 묶음"이라고 이해하면 된다. 은행 이체를 예로 들면, 내 계좌에서 돈이 빠져나가는 것과 상대방 계좌에 돈이 들어오는 것은 반드시 같이 성공하거나 같이 실패해야 한다. 중간에 하나만 성공하면 데이터가 망가진다.

```sql
SET autocommit = OFF;    -- 자동 커밋 끄기

START TRANSACTION;        -- 트랜잭션 시작 (수동 커밋 모드 전환)

-- 여기서부터 수행하는 DML은 임시 작업 상태
INSERT INTO tbl_menu VALUES(null, '추가된 메뉴', 9000, 4, 'Y');
UPDATE tbl_menu SET menu_name = '수정된 메뉴' WHERE menu_code = 24;
DELETE FROM tbl_menu WHERE menu_code = 26;

ROLLBACK;    -- 위의 모든 변경을 취소하고 트랜잭션 시작 전 상태로 복구

COMMIT;      -- 위의 모든 변경을 실제로 DB에 확정 저장
```

`START TRANSACTION`으로 시작하면, 그 이후의 DML 작업들은 실제 DB에 바로 반영되지 않고 임시 상태로 유지된다. `SELECT`로 보면 변경된 것처럼 보이지만 실제로 확정된 건 아니다.

`COMMIT`을 날리면 비로소 모든 변경이 영구적으로 저장된다. `ROLLBACK`을 날리면 `START TRANSACTION` 이후의 모든 작업이 취소되고 원래 상태로 돌아간다.

중요한 점은 **COMMIT 이후에는 ROLLBACK이 소용없다**는 것이다. 이미 확정된 변경은 되돌릴 수 없다.

MySQL의 기본 설정은 `autocommit = ON`이다. 이 상태에서는 DML을 실행하는 즉시 자동으로 COMMIT된다. 트랜잭션을 사용하려면 `SET autocommit = OFF`로 끄거나, `START TRANSACTION`으로 명시적으로 트랜잭션을 시작해야 한다.

트랜잭션의 4가지 성질을 **ACID**라고 부른다:

- **A (Atomicity, 원자성)**: 작업이 전부 성공하거나 전부 실패한다
- **C (Consistency, 일관성)**: 트랜잭션 전후로 데이터의 무결성이 유지된다
- **I (Isolation, 격리성)**: 동시에 여러 트랜잭션이 실행되어도 서로 간섭하지 않는다
- **D (Durability, 지속성)**: COMMIT된 데이터는 시스템 장애가 발생해도 유지된다

---

## DDL — 데이터 정의 언어

DDL은 Data Definition Language의 약자로, 테이블 자체를 만들고, 수정하고, 삭제하는 언어다. `CREATE`, `ALTER`, `DROP`, `TRUNCATE`가 여기에 속한다. DML이 데이터(행)를 다룬다면, DDL은 구조(테이블, 컬럼, 인덱스 등)를 다룬다.

### CREATE — 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS tb1 (
    pk   INT PRIMARY KEY,
    fk   INT,
    col1 VARCHAR(255),
    CHECK(col1 IN ('Y', 'N'))
) ENGINE=INNODB;
```

`IF NOT EXISTS`를 붙이면 이미 같은 이름의 테이블이 있어도 에러 없이 넘어간다. 없을 때만 생성한다. `ENGINE=INNODB`는 스토리지 엔진을 지정하는 것으로, InnoDB는 트랜잭션과 외래 키를 지원한다.

`AUTO_INCREMENT`는 INSERT 시 PRIMARY KEY 컬럼에 자동으로 순번을 매겨주는 속성이다. NULL을 입력하면 자동으로 다음 번호가 부여된다.

```sql
CREATE TABLE IF NOT EXISTS tb2 (
    pk   INT AUTO_INCREMENT PRIMARY KEY,
    fk   INT,
    col1 VARCHAR(255),
    CHECK(col1 IN ('Y', 'N'))
) ENGINE=INNODB;

INSERT INTO tb2 VALUES(null, 10, 'Y');    -- pk: 1
INSERT INTO tb2 VALUES(null, 20, 'Y');    -- pk: 2
```

### ALTER — 테이블 구조 변경

이미 만들어진 테이블의 구조를 변경할 때 쓴다. 모든 구조 변경 작업은 ALTER 명령어를 통한다.

```sql
-- 컬럼 추가
ALTER TABLE tb2
ADD col2 INT NOT NULL;

-- 컬럼 삭제
ALTER TABLE tb2
DROP COLUMN col2;

-- CHANGE: 컬럼명과 데이터 타입, 제약조건을 함께 변경
ALTER TABLE tb2
CHANGE COLUMN fk change_fk INT NOT NULL;

-- MODIFY: 컬럼명은 그대로 두고 데이터 타입이나 제약조건만 변경
ALTER TABLE tb2
MODIFY pk INT;
```

`CHANGE`는 컬럼 이름도 바꿀 수 있고 속성도 바꿀 수 있다. `MODIFY`는 이름은 유지하면서 속성만 변경할 때 쓴다.

AUTO_INCREMENT가 걸린 컬럼은 PRIMARY KEY를 바로 삭제할 수 없다. AUTO_INCREMENT 속성이 붙은 컬럼은 반드시 PRIMARY KEY여야 한다는 제약이 있어서, 먼저 `MODIFY`로 AUTO_INCREMENT 속성을 제거한 뒤 PRIMARY KEY를 삭제해야 한다.

```sql
ALTER TABLE tb2 MODIFY pk INT;         -- AUTO_INCREMENT 제거
ALTER TABLE tb2 DROP PRIMARY KEY;       -- 그다음 PK 삭제

ALTER TABLE tb2 ADD PRIMARY KEY(pk);    -- 다시 PK 추가
```

### DROP — 테이블 완전 삭제

테이블의 구조와 데이터를 모두 영구적으로 삭제한다. 되돌릴 수 없다.

```sql
DROP TABLE IF EXISTS tb3;
```

`IF EXISTS`를 붙이면 없는 테이블을 삭제하려 할 때 에러 대신 경고로 넘어간다. 여러 테이블을 한 번에 삭제할 때는 콤마로 구분하면 된다.

### TRUNCATE — 데이터만 초기화

테이블 구조는 남겨두고 데이터만 싹 지운다. AUTO_INCREMENT 카운터도 초기화된다.

```sql
TRUNCATE TABLE tb4;
```

`DELETE FROM tb4`와 달리 `TRUNCATE`는 WHERE 절을 쓸 수 없고 롤백도 불가능하다. 그냥 테이블을 DROP하고 다시 CREATE하는 것과 유사하게 동작한다. 훨씬 빠르지만 되돌릴 수 없으므로 주의가 필요하다.

DELETE와 TRUNCATE의 차이:

| 구분 | DELETE | TRUNCATE |
|------|--------|----------|
| WHERE 조건 | 사용 가능 | 불가능 |
| ROLLBACK | 가능 | 불가능 |
| AUTO_INCREMENT | 유지 | 초기화 |
| 속도 | 느림 | 빠름 |

---

## CONSTRAINTS — 제약조건

제약조건은 테이블에 저장되는 데이터의 무결성을 보장하기 위한 규칙들이다. 잘못된 데이터가 DB에 들어오는 걸 DB 레벨에서 막아준다.

### NOT NULL

NULL 값을 허용하지 않겠다는 제약이다. 해당 컬럼은 반드시 값이 있어야 한다.

```sql
CREATE TABLE IF NOT EXISTS user_notnull (
    user_no  INT         NOT NULL,
    user_id  VARCHAR(255) NOT NULL,
    user_pwd VARCHAR(255) NOT NULL,
    gender   VARCHAR(3)              -- NULL 허용
) ENGINE=INNODB;

-- NULL 시도 → 에러 발생
INSERT INTO user_notnull VALUES(2, 'user02', NULL, '남');
```

### UNIQUE

중복 값을 허용하지 않겠다는 제약이다. 해당 컬럼의 모든 값은 유일해야 한다.

```sql
CREATE TABLE IF NOT EXISTS user_unique (
    user_no INT         NOT NULL UNIQUE,     -- 컬럼 레벨 선언
    user_id VARCHAR(255) NOT NULL,
    user_pwd VARCHAR(255) NOT NULL,
    gender   VARCHAR(3),
    UNIQUE(user_id)                          -- 테이블 레벨 선언
) ENGINE=INNODB;
```

두 가지 선언 방식이 있다. 컬럼 정의 옆에 바로 `UNIQUE`를 붙이는 컬럼 레벨 방식, 또는 컬럼 정의를 다 나열한 뒤 따로 `UNIQUE(컬럼명)`으로 선언하는 테이블 레벨 방식이다. 여러 컬럼의 조합을 유일하게 만들고 싶을 때는 테이블 레벨 방식으로 `UNIQUE(col1, col2)` 형태로 쓴다.

UNIQUE 컬럼에는 NULL이 여러 개 들어갈 수 있다. NULL은 서로 같지도 다르지도 않은 상태이기 때문에 중복으로 보지 않는다.

### PRIMARY KEY — 기본 키

테이블에서 각 행을 고유하게 식별하는 컬럼이다. `NOT NULL + UNIQUE`의 의미를 가지고 있다. 테이블당 하나만 지정할 수 있고, 값이 없거나 중복되어서는 안 된다.

```sql
CREATE TABLE IF NOT EXISTS user_primarykey (
    user_no  INT          PRIMARY KEY,
    user_id  VARCHAR(255) NOT NULL,
    user_pwd VARCHAR(255) NOT NULL,
    gender   VARCHAR(3)
) ENGINE=INNODB;

-- NULL 시도 → 에러
INSERT INTO user_primarykey VALUES(NULL, 'user01', 'pass01', '남');

-- 중복 값 시도 → 에러
INSERT INTO user_primarykey VALUES(1, 'user01', 'pass01', '남');
INSERT INTO user_primarykey VALUES(1, 'user02', 'pass02', '여');
```

PRIMARY KEY는 테이블의 대표 식별자다. 외래 키가 참조하는 대상이 되기도 한다.

### FOREIGN KEY — 외래 키

두 테이블 사이에 관계를 맺어주는 제약조건이다. 외래 키 컬럼에는 참조하는 테이블에 존재하는 값만 입력할 수 있다.

```sql
-- 부모 테이블
CREATE TABLE IF NOT EXISTS user_grade (
    grade_code INT         PRIMARY KEY,
    grade_name VARCHAR(255) NOT NULL
) ENGINE=INNODB;

INSERT INTO user_grade VALUES(10, '일반회원'), (20, '우수회원'), (30, '특별회원');

-- 자식 테이블
CREATE TABLE IF NOT EXISTS user_foreignkey1 (
    user_no    INT PRIMARY KEY,
    grade_code INT,
    FOREIGN KEY(grade_code) REFERENCES user_grade(grade_code)
) ENGINE=INNODB;

INSERT INTO user_foreignkey1 VALUES(1, 10);    -- 성공: 10은 user_grade에 존재

-- 참조 컬럼에 없는 값 → 에러
INSERT INTO user_foreignkey1 VALUES(2, 50);    -- 실패: 50은 user_grade에 없음
```

### ON UPDATE / ON DELETE 옵션

부모 테이블의 참조 대상이 변경되거나 삭제될 때 자식 테이블이 어떻게 반응할지를 정한다.

- `SET NULL`: 부모 데이터가 변경/삭제되면 자식 테이블의 외래 키 컬럼을 NULL로 바꾼다.
- `CASCADE`: 부모 데이터가 변경되면 자식도 따라 바뀌고, 부모가 삭제되면 자식도 함께 삭제된다.

```sql
CREATE TABLE IF NOT EXISTS user_foreignkey2 (
    user_no    INT PRIMARY KEY,
    grade_code INT,
    FOREIGN KEY(grade_code) REFERENCES user_grade(grade_code)
    ON UPDATE SET NULL
    ON DELETE SET NULL
) ENGINE=INNODB;
```

`ON UPDATE SET NULL`로 설정한 상태에서 부모 테이블의 grade_code를 10에서 40으로 바꾸면, 자식 테이블에서 grade_code가 10이었던 행은 자동으로 NULL이 된다.

### CHECK

컬럼에 들어올 수 있는 값의 범위나 조건을 직접 지정한다.

```sql
CREATE TABLE IF NOT EXISTS user_check (
    user_no   INT          AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    gender    VARCHAR(3)   CHECK(gender IN ('남', '여')),
    age       INT          CHECK(age >= 19)
) ENGINE=InnoDB;

INSERT INTO user_check VALUES(null, '홍길동', '남', 25);     -- 성공

-- gender 조건 위반
INSERT INTO user_check VALUES(null, '홍길동', '남자', 25);   -- 실패

-- age 조건 위반
INSERT INTO user_check VALUES(null, '홍길동', '남', 10);     -- 실패
```

`gender`는 반드시 '남' 또는 '여'여야 하고, `age`는 19 이상이어야 한다. 이 조건을 어기면 INSERT가 거부된다.

### DEFAULT

INSERT 시 값을 주지 않았을 때 자동으로 채워질 기본값을 지정한다.

```sql
CREATE TABLE IF NOT EXISTS user_default (
    user_no   INT          AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) DEFAULT '아무개',
    add_day   DATE         DEFAULT(current_date)
) ENGINE=InnoDB;

-- DEFAULT 키워드로 기본값 사용
INSERT INTO user_default VALUES(null, DEFAULT, DEFAULT);
```

`user_name`을 명시하지 않으면 '아무개'가, `add_day`를 명시하지 않으면 오늘 날짜가 자동으로 들어간다. `DEFAULT` 키워드를 VALUES에서 직접 쓸 수도 있다.

---

## DATA TYPE — 데이터 타입과 형변환

데이터베이스에서 컬럼의 타입을 정하는 건 저장 효율과 데이터 무결성을 위해 중요하다. MySQL에서 자주 쓰이는 데이터 타입들:

- **INT**: 정수. 약 -21억 ~ +21억 범위
- **BIGINT**: 큰 정수
- **DECIMAL(전체 자릿수, 소수점 자릿수)**: 고정 소수점. 금액 같은 정밀한 값에 사용
- **VARCHAR(n)**: 가변 길이 문자열. 최대 n 바이트까지 저장
- **CHAR(n)**: 고정 길이 문자열
- **DATE**: 날짜 (YYYY-MM-DD)
- **DATETIME**: 날짜와 시간
- **BOOLEAN**: 0(false) 또는 1(true)

### CAST / CONVERT — 형변환

값을 원하는 데이터 타입으로 변환할 때 쓴다. 원본 데이터를 수정하는 게 아니라 조회 결과만 변환된 타입으로 보여준다.

```sql
-- CAST(값 AS 바꿀타입)
SELECT CAST(AVG(menu_price) AS SIGNED INTEGER)
FROM tbl_menu;

-- CONVERT(값, 바꿀타입)
SELECT CONVERT(AVG(menu_price), SIGNED INTEGER)
FROM tbl_menu;
```

`AVG()`는 소수점이 있는 실수 값을 반환한다. 이걸 `SIGNED INTEGER`로 캐스팅하면 정수로 변환된다. `CAST`와 `CONVERT`는 기능이 동일하고 문법만 다르다.

날짜 형변환도 가능하다.

```sql
SELECT CAST('2026-05-15' AS DATE);
```

문자열을 DATE 타입으로 변환한다. 날짜 연산이나 비교를 위해 타입을 맞춰야 할 때 사용한다.

`SIGNED`는 부호 있는 정수, `UNSIGNED`는 부호 없는 정수다. 음수가 될 수 없는 값(수량, 가격 등)에는 UNSIGNED를 쓰면 더 넓은 양수 범위를 사용할 수 있다.

---

## INDEX — 인덱스

인덱스는 데이터를 더 빠르게 찾기 위한 별도의 자료구조다. 책의 목차나 색인과 비슷한 역할이다. WHERE 조건에 자주 사용되는 컬럼에 인덱스를 만들어두면 전체 테이블을 처음부터 끝까지 스캔하지 않고 바로 원하는 위치로 점프할 수 있다.

```sql
CREATE TABLE phone (
    phone_code  INT          PRIMARY KEY,
    phone_name  VARCHAR(100) NOT NULL,
    phone_price DECIMAL(10, 2) NOT NULL
);

INSERT INTO phone VALUES
    (1, 'iPhone 17 Pro', 2000000),
    (2, 'Galaxy S26', 1900000),
    (3, 'Xiaomi', 1000000);
```

### EXPLAIN — 실행 계획 확인

인덱스가 실제로 사용되는지 확인할 때 `EXPLAIN`을 앞에 붙인다. 쿼리를 실행하는 게 아니라 어떤 방식으로 실행될지 계획을 보여준다.

```sql
EXPLAIN
SELECT *
FROM phone
WHERE phone_name = 'iPhone 17 Pro';
```

결과에서 `type` 컬럼이 `ALL`이면 풀 테이블 스캔(모든 행을 다 읽는 것)이고, `ref`나 `range` 같은 값이면 인덱스를 이용한 효율적인 조회다. 인덱스 없이 위 쿼리를 실행하면 `type: ALL`이 나온다.

### 인덱스 생성

```sql
CREATE INDEX idx_phone_name
ON phone(phone_name);
```

`idx_phone_name`이 인덱스 이름이고, `phone` 테이블의 `phone_name` 컬럼에 인덱스를 생성한다. 인덱스 생성 후 다시 `EXPLAIN`을 실행하면 `type`이 바뀌어 인덱스를 활용하는 게 보인다.

### 인덱스 확인

```sql
SHOW INDEX FROM phone;
```

테이블에 어떤 인덱스들이 있는지 확인한다. PRIMARY KEY도 자동으로 인덱스로 생성되어 있는 걸 볼 수 있다.

### 인덱스 삭제

```sql
DROP INDEX idx_phone_name
ON phone;
```

### 인덱스의 장단점

인덱스는 조회(SELECT) 성능을 올려준다. 하지만 공짜가 아니다.

**장점**:
- WHERE 절, JOIN 조건, ORDER BY에서 해당 컬럼이 사용될 때 조회 속도가 빨라진다.
- 데이터가 많을수록 효과가 크다.

**단점**:
- INSERT, UPDATE, DELETE 시 데이터가 바뀔 때마다 인덱스도 같이 업데이트해야 한다. 그만큼 쓰기 연산이 느려지고 부하가 생긴다.
- 인덱스 자체도 디스크 공간을 차지한다.
- 잘못 사용된 인덱스는 오히려 성능을 떨어뜨릴 수 있다.

그래서 인덱스는 조회가 잦고, 변경이 적은 컬럼에 거는 게 효과적이다. 무조건 많이 건다고 좋은 게 아니라 신중하게 선택해야 한다.

PRIMARY KEY는 자동으로 인덱스가 생성된다. UNIQUE 제약조건도 내부적으로 인덱스를 사용한다. 직접 만드는 인덱스는 보통 `WHERE` 조건에 자주 쓰이는 컬럼에 추가로 생성한다.

---

## 전체 개념 흐름 정리

8~15강은 데이터를 읽는 것에서 나아가 데이터를 관리하고 구조를 다루는 단계다.

서브쿼리는 하나의 쿼리로 복잡한 두 단계 문제를 해결한다. WHERE에 쓰는 단순 서브쿼리, FROM에 쓰는 파생 테이블, 바깥쪽 행을 참조하는 상관 서브쿼리로 나뉜다.

집합 연산자는 두 SELECT 결과를 집합 관점에서 합치거나 교차시킨다. MySQL에서는 UNION, UNION ALL만 직접 지원하고, 교집합과 차집합은 JOIN을 활용해서 구현한다.

DML의 INSERT, UPDATE, DELETE는 데이터를 추가, 수정, 삭제한다. WHERE 절 없는 UPDATE와 DELETE는 전체 행에 영향을 주므로 항상 주의해야 한다.

트랜잭션은 여러 DML을 하나의 작업으로 묶어서 All or Nothing을 보장한다. START TRANSACTION, COMMIT, ROLLBACK이 핵심이다.

DDL의 CREATE, ALTER, DROP, TRUNCATE는 테이블 자체의 구조를 정의하고 관리한다. DML과 달리 대부분 즉시 확정되어 롤백이 안 된다.

제약조건(NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK, DEFAULT)은 데이터 무결성을 DB 레벨에서 보장한다. 애플리케이션 코드에서만 유효성 검사를 하면 직접 DB에 쿼리를 날릴 때 무결성이 깨질 수 있으므로, DB 레벨의 제약조건이 최후의 방어선 역할을 한다.

형변환(CAST, CONVERT)은 타입이 다른 값을 비교하거나 연산할 때 원하는 타입으로 변환해준다. 인덱스는 조회 성능을 위한 자료구조로, EXPLAIN으로 실제 사용 여부를 확인할 수 있다.

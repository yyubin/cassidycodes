## SELECT — 데이터 조회의 시작

데이터베이스에서 데이터를 꺼내는 가장 기본적인 명령어가 `SELECT`다. 구조는 단순하다. `SELECT 컬럼명 FROM 테이블명;` 이 한 줄이 모든 조회의 뼈대가 된다.

단일 컬럼만 조회하고 싶을 때는 컬럼명을 하나만 쓰면 된다.

```sql
SELECT menu_name FROM tbl_menu;
```

여러 컬럼을 한 번에 조회할 때는 쉼표로 구분해서 나열한다.

```sql
SELECT
    menu_code,
    menu_name,
    menu_price
FROM
    tbl_menu;
```

`*`(애스터리스크)는 와일드카드로, 테이블의 모든 컬럼을 한꺼번에 가져올 때 사용한다.

```sql
SELECT * FROM tbl_menu;
```

실무에서 `SELECT *`는 편하긴 하지만 불필요한 컬럼까지 다 긁어오기 때문에 성능 면에서 좋지 않다. 필요한 컬럼만 명시적으로 적는 습관을 들이는 게 좋다.

`SELECT`는 반드시 테이블이 있어야만 동작하는 게 아니다. `FROM` 절 없이도 간단한 연산이나 내장 함수 실행이 가능하다.

```sql
SELECT 6 + 3;
SELECT 6 * 3;
SELECT NOW();           -- 현재 날짜와 시간 반환
SELECT CONCAT('홍', '길동');  -- 문자열 합치기 → '홍길동'
```

`NOW()`는 현재 시각을 반환하는 내장 함수다. `CONCAT()`은 여러 문자열을 하나로 붙여주는 함수다. 이런 내장 함수들은 FROM 없이도 바로 호출할 수 있다.

조회 결과의 컬럼명이 보기 불편하거나 표현이 명확하지 않을 때 **별칭(Alias)**을 붙인다. `AS` 키워드를 사용하고, 공백이 포함된 별칭은 반드시 따옴표로 감싸야 한다.

```sql
SELECT CONCAT('홍', '길동') AS name;
SELECT CONCAT('홍', '길동') AS 'Full name';
```

`AS`는 생략도 가능하지만, 가독성을 위해 붙여주는 게 좋다. 별칭은 결과 집합에서만 유효하며, 같은 쿼리의 `WHERE` 절에서는 사용할 수 없다는 점을 주의해야 한다.

---

## ORDER BY — 결과 정렬

`ORDER BY`는 조회 결과를 원하는 기준으로 정렬하는 절이다. `SELECT` 문의 가장 마지막에 위치하며, 쿼리 실행 순서상으로도 제일 마지막에 처리된다.

기본 정렬 방향은 **오름차순(ASC)**이다. `ASC`는 생략 가능하다. 반대로 **내림차순(DESC)**은 반드시 명시해야 한다.

```sql
-- 가격 오름차순 정렬
SELECT menu_code, menu_name, menu_price
FROM tbl_menu
ORDER BY menu_price ASC;

-- 가격 내림차순 정렬
SELECT menu_code, menu_name, menu_price
FROM tbl_menu
ORDER BY menu_price DESC;
```

정렬 기준을 여러 개 지정하는 것도 가능하다. 첫 번째 기준으로 정렬한 뒤, 값이 같은 행들 사이에서 두 번째 기준을 적용한다.

```sql
ORDER BY menu_price DESC, menu_name ASC;
```

가격이 같은 메뉴들 사이에서는 이름 기준으로 다시 오름차순 정렬하는 방식이다. 정렬 기준은 이론상 제한 없이 계속 추가할 수 있다.

컬럼 값 그대로 정렬하지 않고, 연산 결과로 정렬할 수도 있다. 이때 별칭을 활용하면 편하다.

```sql
SELECT
    menu_code,
    menu_price,
    menu_code * menu_price AS calculated_value
FROM tbl_menu
ORDER BY calculated_value DESC;
```

`ORDER BY`에서는 `SELECT`에서 정의한 별칭을 사용할 수 있다. 이는 쿼리 실행 순서상 `SELECT`가 `ORDER BY`보다 먼저 처리되기 때문이다.

**`FIELD()` 함수**는 특정 값을 내가 원하는 순서로 정렬할 때 사용한다. 컬럼 값이 지정된 목록에서 몇 번째 위치인지를 숫자로 반환하고, 그 숫자를 기준으로 정렬한다.

```sql
SELECT FIELD('B', 'A', 'B', 'C');  -- 결과: 2 (B는 목록의 2번째)

SELECT menu_name, orderable_status
FROM tbl_menu
ORDER BY FIELD(orderable_status, 'N', 'Y');
```

이 쿼리는 `orderable_status`가 `'N'`인 것을 1순위, `'Y'`인 것을 2순위로 정렬한다. 목록에 없는 값은 0을 반환하므로 맨 앞으로 온다는 점도 알아두면 좋다.

**NULL 값 정렬**은 별도로 신경 써야 한다. MySQL 기준으로 `ASC` 정렬 시 NULL이 맨 앞으로 오고, `DESC` 정렬 시 맨 뒤로 간다.

```sql
ORDER BY
    ref_category_code IS NULL DESC,  -- NULL이면 true(1), 아니면 false(0)
    ref_category_code DESC;
```

`ref_category_code IS NULL`은 NULL이면 1, 아니면 0을 반환한다. 이걸 `DESC`로 정렬하면 NULL인 행들이 맨 앞으로 오게 된다. 이 방식으로 NULL의 위치를 직접 컨트롤할 수 있다.

---

## WHERE — 조건 필터링

`WHERE` 절은 SELECT한 결과에서 조건을 만족하는 행만 추려내는 역할을 한다. 조건이 `true`인 행만 결과에 포함된다.

### 비교 연산자

`=`, `<>`, `>`, `<`, `>=`, `<=` 이 여섯 가지가 기본 비교 연산자다. 주의할 건 같지 않음을 나타낼 때 `!=`가 아니라 `<>`를 주로 사용한다는 점이다. 물론 `!=`도 동작하긴 한다.

```sql
-- orderable_status가 'Y'가 아닌 것만
WHERE orderable_status <> 'Y';

-- 가격이 13000 미만인 것만
WHERE menu_price < 13000;
```

### AND / OR 논리 연산자

조건을 여러 개 걸 때는 `AND` 또는 `OR`로 연결한다. `AND`는 두 조건이 모두 참일 때, `OR`는 둘 중 하나라도 참일 때 결과에 포함된다.

```sql
-- orderable_status가 'Y'이고, category_code가 10인 메뉴
WHERE orderable_status = 'Y' AND category_code = 10;

-- orderable_status가 'Y'이거나, category_code가 10인 메뉴
WHERE orderable_status = 'Y' OR category_code = 10;
```

`AND`와 `OR`를 혼용할 때는 괄호를 사용해서 의도를 명확히 해야 한다. `AND`가 `OR`보다 우선순위가 높기 때문에 괄호 없이 쓰면 예상과 다른 결과가 나올 수 있다.

### BETWEEN — 범위 조건

특정 범위 안의 값을 찾을 때 `BETWEEN A AND B`를 사용한다. A 이상, B 이하 (양끝 포함)다.

```sql
-- 1만원 이상 2만 5천원 이하 (AND 사용)
WHERE menu_price >= 10000 AND menu_price <= 25000;

-- BETWEEN으로 동일한 표현
WHERE menu_price BETWEEN 10000 AND 25000;

-- NOT BETWEEN으로 범위 밖 조회
WHERE menu_price NOT BETWEEN 10000 AND 25000;
```

`NOT`을 붙이면 해당 범위 밖의 값들이 걸러진다.

### LIKE — 패턴 매칭

문자열에서 특정 패턴을 포함하는 행을 찾을 때 `LIKE`를 쓴다. 와일드카드 문자 `%`는 0개 이상의 임의 문자를 의미한다.

```sql
-- '마늘'이 포함된 메뉴 이름
WHERE menu_name LIKE '%마늘%';

-- '마늘'로 끝나는 메뉴 이름
WHERE menu_name LIKE '%마늘';

-- '마늘'로 시작하는 메뉴 이름
WHERE menu_name LIKE '마늘%';
```

`%` 외에도 `_`(언더스코어)는 정확히 한 글자를 의미하는 와일드카드다. 예를 들어 `LIKE '마_'`는 '마'로 시작하는 두 글자 문자열을 찾는다. 부정은 `NOT LIKE`다.

### IN — 목록 조건

특정 값들의 목록 중 하나와 일치하는 행을 찾을 때 `IN`을 쓴다. `OR`로 여러 조건을 연결한 것과 같은 결과를 더 깔끔하게 표현할 수 있다.

```sql
-- category_code가 4, 5, 6 중 하나인 메뉴
WHERE category_code IN (4, 5, 6);

-- 부정: 4, 5, 6이 아닌 메뉴
WHERE category_code NOT IN (4, 5, 6);
```

### IS NULL — NULL 값 확인

NULL은 데이터베이스에서 특수한 상태다. '0'도 아니고 '빈 문자열'도 아니다. 그냥 값이 존재하지 않음을 나타내는 상태다. 그래서 일반 비교 연산자(`=`)로는 NULL을 비교할 수 없다. 반드시 `IS NULL` 또는 `IS NOT NULL`을 써야 한다.

```sql
-- ref_category_code가 NULL인 카테고리
WHERE ref_category_code IS NULL;

-- NULL이 아닌 카테고리
WHERE ref_category_code IS NOT NULL;
```

`WHERE ref_category_code = NULL`은 절대 원하는 결과를 돌려주지 않는다. NULL은 어떤 값과 비교해도 알 수 없음(UNKNOWN)을 반환하기 때문이다.

---

## DISTINCT — 중복 제거

`DISTINCT`는 조회 결과에서 중복된 값을 제거하고 유일한 값들만 보여준다. 특정 컬럼에 어떤 종류의 값들이 있는지 파악할 때 유용하다.

```sql
SELECT DISTINCT category_code
FROM tbl_menu
ORDER BY category_code;
```

이렇게 하면 `tbl_menu`에 어떤 카테고리 코드들이 사용되고 있는지 중복 없이 볼 수 있다.

NULL 값이 포함된 컬럼에 `DISTINCT`를 쓰면 NULL도 하나의 고유값으로 취급되어 결과에 한 번만 나타난다.

```sql
SELECT DISTINCT ref_category_code
FROM tbl_category;
```

여러 컬럼에 `DISTINCT`를 걸면, 선택된 모든 컬럼의 조합이 완전히 똑같을 때만 중복으로 간주한다. 컬럼 하나하나를 개별적으로 중복 체크하는 게 아니라 묶음으로 본다는 뜻이다.

```sql
SELECT DISTINCT
    category_code,
    orderable_status
FROM tbl_menu;
```

예를 들어 `(10, 'Y')`와 `(10, 'N')`은 `category_code`가 같더라도 `orderable_status`가 다르므로 중복이 아니다. 두 행 모두 결과에 나온다.

---

## LIMIT — 결과 개수 제한

`LIMIT`은 조회 결과의 개수를 제한하는 키워드다. 전체 결과 중 딱 필요한 만큼만 잘라서 가져올 때 쓴다.

```sql
-- 가격 내림차순으로 상위 5개만
SELECT menu_name, menu_price
FROM tbl_menu
ORDER BY menu_price DESC
LIMIT 5;
```

`LIMIT`에는 두 가지 형태가 있다. 하나는 개수만 지정하는 것이고, 다른 하나는 시작 위치와 개수를 함께 지정하는 것이다.

```sql
-- LIMIT [시작 위치(건너뛸 개수)], [개수]
LIMIT 1, 4;
```

`LIMIT 1, 4`는 1개를 건너뛰고(0-based index이므로 2번째 행부터), 4개를 가져오라는 의미다. 이 방식이 **게시판 페이징의 핵심 원리**다.

예를 들어 한 페이지에 10개씩 보여주는 게시판에서:

- 1페이지: `LIMIT 0, 10`
- 2페이지: `LIMIT 10, 10`
- 3페이지: `LIMIT 20, 10`

이런 식으로 응용하면 된다. `ORDER BY`와 함께 써야 일관된 페이징이 가능하다. 정렬 기준 없이 LIMIT만 쓰면 데이터베이스가 임의의 순서로 데이터를 반환할 수 있기 때문에 주의해야 한다.

---

## JOIN — 테이블 연결

`JOIN`은 두 개 이상의 테이블을 연결해서 하나의 결과로 조회하는 기법이다. 관계형 데이터베이스의 핵심 개념 중 하나다. 테이블 사이의 공통된 컬럼 값을 기준으로 연결한다.

JOIN을 사용할 때는 같은 이름의 컬럼이 여러 테이블에 존재할 수 있기 때문에, 어느 테이블의 컬럼인지 명확히 해야 한다. 이때 **테이블 별칭**이 필수적으로 쓰인다.

```sql
-- 테이블 별칭 사용
SELECT a.menu_name, a.menu_price
FROM tbl_menu AS a;
```

`AS`로 별칭을 붙인 뒤, 컬럼 앞에 `별칭.컬럼명` 형식으로 쓴다.

### INNER JOIN (내부 조인)

가장 기본적인 조인으로, 두 테이블에서 조인 조건을 만족하는 행들만 결과에 포함된다. 교집합이라고 생각하면 된다. `INNER` 키워드는 생략 가능해서 그냥 `JOIN`이라고만 써도 된다.

```sql
SELECT a.menu_name, b.category_name
FROM tbl_menu a
JOIN tbl_category b ON a.category_code = b.category_code;
```

`ON` 뒤에 두 테이블을 연결하는 조건을 쓴다. `tbl_menu`의 `category_code`와 `tbl_category`의 `category_code`가 같은 행들끼리 연결된다. 어느 한쪽에만 존재하는 값(매칭되지 않는 행)은 결과에 나타나지 않는다.

### OUTER JOIN (외부 조인)

OUTER JOIN은 한쪽 테이블의 데이터는 전부 보여주고, 다른 테이블에서 매칭되는 데이터가 없으면 `NULL`로 채워준다.

**LEFT JOIN**은 왼쪽(FROM 뒤에 나오는) 테이블을 기준으로 한다. 왼쪽 테이블의 모든 행은 무조건 결과에 포함되고, 오른쪽 테이블에서 매칭되는 행이 없으면 NULL이 들어간다.

```sql
SELECT a.category_name, b.menu_name
FROM tbl_category a
LEFT JOIN tbl_menu b ON a.category_code = b.category_code;
```

카테고리는 있지만 해당 카테고리에 속한 메뉴가 없으면, `menu_name`이 NULL로 표시된다. 반대로 INNER JOIN이었다면 그 카테고리 자체가 결과에서 사라진다.

**RIGHT JOIN**은 기준이 오른쪽 테이블이다. LEFT JOIN과 방향만 반대다. 실무에서는 대부분 LEFT JOIN으로 처리하고 RIGHT JOIN은 잘 안 쓰인다.

### SELF JOIN (자기 자신과 조인)

하나의 테이블을 두 개인 것처럼 취급해서 자기 자신과 조인하는 방식이다. 같은 테이블 안에서 행들 사이의 관계를 표현할 때 쓴다. 대표적인 예가 계층형 카테고리 구조다.

```sql
SELECT
    a.category_name AS '하위 카테고리',
    b.category_name AS '상위 카테고리'
FROM tbl_category a       -- 하위 카테고리 역할
JOIN tbl_category b ON a.ref_category_code = b.category_code;  -- 상위 카테고리 역할
```

`tbl_category` 하나를 `a`(하위)와 `b`(상위)로 두 번 참조한다. `a.ref_category_code`가 `b.category_code`와 같은 행들을 연결하면, 하위 카테고리와 그 부모 카테고리 이름을 함께 볼 수 있다.

SELF JOIN도 INNER JOIN이기 때문에 `ref_category_code`가 NULL인 최상위 카테고리는 결과에 포함되지 않는다. 최상위 카테고리까지 보고 싶다면 LEFT JOIN으로 바꿔야 한다.

---

## GROUP BY — 그룹화와 집계

`GROUP BY`는 지정된 컬럼의 값이 같은 데이터들을 하나의 그룹으로 묶는다. 그룹별로 집계 함수를 적용해서 통계를 낼 때 핵심적으로 사용된다.

```sql
SELECT category_code
FROM tbl_menu
GROUP BY category_code;
```

이렇게 하면 같은 `category_code`를 가진 메뉴들이 하나의 그룹으로 합쳐진다. `DISTINCT`와 유사한 결과처럼 보이지만, `GROUP BY`는 집계 함수와 함께 쓰기 위한 것이고 `DISTINCT`는 단순 중복 제거 목적이다.

`GROUP BY`를 쓸 때는 중요한 규칙이 있다. **`SELECT` 절에는 `GROUP BY`에 명시된 컬럼과 집계 함수만 올 수 있다.** 그룹화되지 않은 일반 컬럼을 `SELECT`에 쓰면 의미 없는 임의의 값이 나오거나 에러가 발생한다.

### 집계 함수

집계 함수는 그룹 단위로 계산을 수행하는 함수들이다.

```sql
SELECT
    category_code,
    COUNT(*) AS '메뉴 개수'    -- 각 그룹의 행 수 계산
FROM tbl_menu
GROUP BY category_code;
```

```sql
SELECT
    category_code,
    SUM(menu_price) AS '가격 총합',   -- 합계
    AVG(menu_price) AS '가격 평균'    -- 평균
FROM tbl_menu
GROUP BY category_code;
```

주요 집계 함수들:

- `COUNT(*)` : 그룹 내 행의 개수 (NULL 포함)
- `COUNT(컬럼명)` : NULL을 제외한 행의 개수
- `SUM(컬럼명)` : 합계
- `AVG(컬럼명)` : 평균
- `MAX(컬럼명)` : 최댓값
- `MIN(컬럼명)` : 최솟값

### HAVING — 그룹 조건 필터링

`HAVING`은 `GROUP BY`로 만들어진 그룹에 조건을 걸어서 필터링한다. `WHERE`가 그룹화 전에 원본 행들을 필터링한다면, `HAVING`은 그룹화가 끝난 결과에 조건을 적용한다.

```sql
SELECT
    category_code,
    COUNT(*)
FROM tbl_menu
GROUP BY category_code
HAVING COUNT(*) >= 3;
```

카테고리별 메뉴 수가 3개 이상인 카테고리만 보여준다. `HAVING`에는 집계 함수를 그대로 쓸 수 있는데, 이게 `WHERE`와 가장 큰 차이점이다. `WHERE` 절 안에서는 집계 함수를 쓸 수 없다.

쿼리 작성 순서와 실행 순서를 구분해서 이해해야 한다:

**작성 순서**: `SELECT` → `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `ORDER BY`

**실행 순서**: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY`

### ROLLUP — 소계와 총계

`WITH ROLLUP`을 추가하면 그룹별 집계 결과와 함께 전체 총계를 함께 보여준다.

```sql
SELECT
    category_code,
    SUM(menu_price)
FROM tbl_menu
GROUP BY category_code
WITH ROLLUP;
```

결과 맨 아래에 `category_code`가 NULL인 행이 하나 추가되는데, 이게 전체 합계다. ROLLUP이 만들어낸 집계 행에서는 그룹 컬럼이 NULL로 표시된다.

여러 기준으로 그룹화할 때 ROLLUP을 쓰면 계층적인 집계 결과를 볼 수 있다.

```sql
SELECT
    menu_price,
    category_code,
    SUM(menu_price)
FROM tbl_menu
GROUP BY menu_price, category_code
WITH ROLLUP;
```

이 경우에는 가격별-카테고리별 소계, 가격별 소계, 전체 총계까지 단계적으로 집계된 결과가 함께 나온다. 보고서나 통계 쿼리를 만들 때 유용하다.

---

## SQL 문장의 실행 순서 정리

여러 절이 함께 쓰이는 SELECT 문은 작성 순서와 실행 순서가 다르다. 이걸 이해하면 어디에서 무엇을 쓸 수 있는지 헷갈리지 않는다.

```plain
[실행 순서]
1. FROM       : 어떤 테이블에서 가져올지 결정
2. WHERE      : 행 단위로 조건 필터링
3. GROUP BY   : 특정 컬럼 기준으로 그룹화
4. HAVING     : 그룹 단위로 조건 필터링
5. SELECT     : 보여줄 컬럼 결정, 별칭 부여
6. ORDER BY   : 최종 결과 정렬
7. LIMIT      : 결과 개수 제한
```

`WHERE`에서 집계 함수를 못 쓰는 이유는 실행 순서 때문이다. `WHERE`는 `GROUP BY`보다 먼저 실행되므로, 아직 그룹이 만들어지기 전 단계에서 집계 결과를 참조하는 건 불가능하다.

`ORDER BY`에서 `SELECT`의 별칭을 쓸 수 있는 이유도 마찬가지다. `ORDER BY`는 `SELECT`보다 나중에 실행되므로 별칭이 이미 정의된 상태다.

---

## tbl_menu / tbl_category 테이블 구조

강의에서 사용하는 테이블들의 구조를 알아두면 쿼리를 이해하기 훨씬 쉽다.

**tbl_menu**
- `menu_code` : 메뉴 고유 번호 (PK)
- `menu_name` : 메뉴 이름
- `menu_price` : 메뉴 가격
- `category_code` : 카테고리 코드 (FK)
- `orderable_status` : 주문 가능 여부 ('Y' 또는 'N')

**tbl_category**
- `category_code` : 카테고리 고유 번호 (PK)
- `category_name` : 카테고리 이름
- `ref_category_code` : 상위 카테고리 코드 (NULL이면 최상위 카테고리)

이 두 테이블이 `category_code`를 기준으로 연결된다. `tbl_category`의 `ref_category_code`는 같은 테이블의 `category_code`를 참조하는 자기 참조 구조다. 이 때문에 SELF JOIN 예제에서 이 테이블이 사용된다.

---

## 주요 개념 흐름 정리

1~7강에서 배운 내용은 데이터를 **읽는** 것에 집중되어 있다. INSERT, UPDATE, DELETE 같은 데이터 변경은 이후 강의에서 다룬다.

`SELECT`로 조회를 시작해서, `WHERE`로 원하는 행을 필터링하고, `GROUP BY`로 묶어서 집계하고, `HAVING`으로 집계 결과를 다시 필터링하고, `ORDER BY`로 정렬하고, `LIMIT`으로 개수를 자른다. 이 흐름이 기본 SELECT 쿼리의 전체 구조다.

`JOIN`은 여러 테이블의 데이터를 합쳐서 하나의 결과로 만들 때 쓴다. INNER JOIN, LEFT JOIN, SELF JOIN 세 가지를 상황에 맞게 골라서 쓴다.

`DISTINCT`는 중복 제거, `LIMIT`은 결과 개수 제한이라는 각각의 뚜렷한 역할이 있다. 이 두 가지는 복잡한 조건 없이 단독으로도 자주 쓰인다.

데이터베이스의 힘은 이 절들을 조합하는 데서 나온다. 하나하나는 단순해 보여도 합쳐지면 복잡한 비즈니스 로직을 SQL 한 방으로 처리할 수 있다.

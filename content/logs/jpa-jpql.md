# JPQL 기초

JPQL은 테이블이 아니라 Entity 객체를 대상으로 작성하는 객체지향 쿼리 언어다. SQL과 문법은 비슷하지만, `tbl_menu` 같은 테이블명 대신 `Menu` 엔티티와 필드명을 사용한다.

## 기본 조회

```java
String jpql = "select m from Menu m where m.menuPrice > :price";
List<Menu> menus = entityManager.createQuery(jpql, Menu.class)
        .setParameter("price", 10000)
        .getResultList();
```

결과가 여러 건이면 `getResultList()`, 단건이면 `getSingleResult()`를 사용한다. 단건 조회는 결과가 없거나 둘 이상일 때 예외가 발생할 수 있어 상황에 맞게 처리해야 한다.

## 파라미터 바인딩

문자열을 직접 이어 붙여 조건을 만들면 SQL Injection 위험과 문법 오류가 커진다. JPQL에서는 이름 기반 파라미터 `:price`를 사용해 값을 바인딩하는 방식이 안전하다.

## Projection

필요한 컬럼만 DTO로 받고 싶을 때 생성자 표현식을 사용할 수 있다.

```java
select new com.example.MenuResponse(m.menuCode, m.menuName, m.menuPrice)
from Menu m
```

Entity 전체가 필요하지 않은 목록 화면에서는 DTO projection이 데이터 노출과 조회 비용을 줄이는 데 도움이 된다.

## 페이징

```java
query.setFirstResult(page * size);
query.setMaxResults(size);
```

JPQL 자체에 DB별 LIMIT 문법을 쓰지 않고 JPA API로 시작 위치와 개수를 지정한다. JPA 구현체가 DB 방언에 맞는 SQL로 변환한다.

## 정리

JPQL은 Entity 중심 조회가 필요할 때 유용하다. 단, 동적 조건이 많아질수록 문자열 조립이 복잡해지므로 Spring Data JPA, QueryDSL, Criteria 같은 대안을 함께 고려할 수 있다.

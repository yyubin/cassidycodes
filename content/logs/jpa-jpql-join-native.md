# JPQL Join과 Native Query

JPQL에서도 연관 관계를 기준으로 join을 작성할 수 있다. 객체 참조를 따라 조인하기 때문에 SQL보다 도메인 모델을 기준으로 읽힌다는 장점이 있다.

## 내부 조인과 외부 조인

```java
select m
from Menu m
join m.category c
where c.categoryName = :name
```

`join`은 매칭되는 연관 데이터가 있는 경우만 조회하고, `left join`은 연관 데이터가 없어도 기준 엔티티를 남긴다. SQL과 개념은 같지만 조인 대상은 테이블명이 아니라 엔티티 필드다.

## Fetch Join

```java
select m
from Menu m
join fetch m.category
```

fetch join은 연관 엔티티를 한 번에 함께 조회한다. LAZY 로딩으로 인해 반복 조회가 발생하는 N+1 문제를 줄일 때 자주 사용한다. 다만 컬렉션 fetch join과 페이징을 함께 사용할 때는 결과 왜곡에 주의해야 한다.

## Native Query

JPQL로 표현하기 어렵거나 DB 전용 기능을 사용해야 하면 Native Query를 사용할 수 있다.

```java
List<Menu> result = entityManager
    .createNativeQuery("select * from tbl_menu where menu_price > ?", Menu.class)
    .setParameter(1, 10000)
    .getResultList();
```

Native Query는 실제 SQL을 직접 작성하므로 DB 기능을 세밀하게 사용할 수 있다. 대신 DB 종속성이 커지고 Entity 필드 변경 시 SQL도 함께 관리해야 한다.

## 선택 기준

| 상황 | 적합한 방식 |
| --- | --- |
| Entity 중심의 일반 조회 | JPQL |
| 연관 객체를 함께 조회 | JPQL fetch join |
| DB 전용 함수/문법 필요 | Native Query |
| 단순 CRUD/조건 조회 | Spring Data JPA 메서드 |

조인은 성능과 데이터 모양을 동시에 바꾸는 기능이다. 필요한 연관 데이터가 무엇인지 먼저 정하고, 그에 맞는 조회 방식을 선택해야 한다.

# JPA 영속성 컨텍스트

JPA의 핵심은 SQL을 직접 작성하는 대신 Entity 객체의 상태 변화를 관리하는 것이다. 이때 EntityManager가 관리하는 1차 캐시 영역을 영속성 컨텍스트라고 한다.

## EntityManager 흐름

`EntityManagerFactory`는 애플리케이션에서 비용이 큰 객체라 보통 하나만 만들고, 실제 작업 단위마다 `EntityManager`를 생성한다. EntityManager는 Entity를 저장, 조회, 수정, 삭제하며 트랜잭션과 함께 동작한다.

## Entity 생명주기

| 상태 | 설명 |
| --- | --- |
| 비영속 | 아직 JPA가 관리하지 않는 새 객체 |
| 영속 | 영속성 컨텍스트에 등록된 객체 |
| 준영속 | 한 번 관리되었지만 현재는 분리된 객체 |
| 삭제 | 삭제 대상으로 등록된 객체 |

```java
Menu menu = new Menu();        // 비영속
entityManager.persist(menu);   // 영속
entityManager.detach(menu);    // 준영속
entityManager.remove(menu);    // 삭제
```

## 1차 캐시와 동일성

같은 트랜잭션 안에서 동일한 PK로 Entity를 다시 조회하면 DB를 매번 조회하지 않고 영속성 컨텍스트의 객체를 재사용할 수 있다. 따라서 같은 식별자의 Entity는 같은 객체 참조로 유지된다.

## 변경 감지

영속 상태의 Entity는 setter나 도메인 메서드로 값이 바뀌면 트랜잭션 커밋 시점에 UPDATE SQL이 자동 생성된다. 이를 dirty checking이라고 한다.

```java
Menu menu = entityManager.find(Menu.class, 1);
menu.modifyPrice(12000);
// commit 시 UPDATE 실행
```

## MyBatis와 비교

MyBatis는 SQL 중심이고 결과를 객체에 매핑한다. JPA는 객체 상태를 중심으로 SQL 생성을 위임한다. 복잡한 SQL 제어는 MyBatis가 직관적이고, 도메인 모델 중심의 CRUD와 변경 관리는 JPA가 강점을 가진다.

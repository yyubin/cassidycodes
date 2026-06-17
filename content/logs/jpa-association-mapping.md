# JPA 연관 관계 매핑

연관 관계 매핑은 객체의 참조 관계와 DB의 외래 키 관계를 연결하는 과정이다. JPA에서는 외래 키를 실제로 관리하는 쪽을 연관 관계의 주인으로 정해야 한다.

## 주요 어노테이션

| 어노테이션 | 의미 |
| --- | --- |
| `@ManyToOne` | 다대일 관계 |
| `@OneToMany` | 일대다 관계 |
| `@OneToOne` | 일대일 관계 |
| `@ManyToMany` | 다대다 관계 |
| `@JoinColumn` | 외래 키 컬럼 지정 |

## 다대일 매핑

```java
@Entity
public class Menu {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_code")
    private Category category;
}
```

실무에서는 N쪽에 FK가 있는 경우가 많으므로 `ManyToOne`이 가장 자연스럽다. 외래 키가 있는 엔티티가 관계의 주인이 되면 INSERT/UPDATE 흐름도 DB 구조와 잘 맞는다.

## 일대다 단방향의 주의점

```java
@OneToMany
@JoinColumn(name = "category_code")
private List<Menu> menuList;
```

일대다 단방향은 객체상으로는 편해 보이지만 FK는 상대 테이블에 있다. 관계 저장 시 추가 UPDATE가 발생할 수 있어 처음 설계에서는 다대일 단방향을 우선 고려하는 편이 좋다.

## Fetch 전략

| 전략 | 설명 |
| --- | --- |
| EAGER | 엔티티 조회 시 연관 객체도 즉시 조회 |
| LAZY | 실제 사용할 때 연관 객체 조회 |

기본값은 `ManyToOne`, `OneToOne`이 EAGER이고 `OneToMany`, `ManyToMany`가 LAZY다. 성능 예측을 쉽게 하려면 대부분 LAZY로 두고 필요한 조회에서 fetch join을 사용하는 방식이 안정적이다.

## Cascade

Cascade는 부모 엔티티의 저장/삭제 같은 상태 변화를 자식에게 전파한다. 편리하지만 생명주기가 완전히 종속된 관계에만 적용해야 한다. 독립적으로 관리되는 엔티티까지 cascade delete가 걸리면 데이터 손실 위험이 있다.

## 설계 기준

처음에는 단방향 관계로 시작하고, 반대 방향 탐색이 실제로 필요할 때 양방향을 추가하는 것이 좋다. 양방향을 만들었다면 주인 쪽 FK 변경과 반대편 컬렉션 동기화를 함께 관리해야 한다.

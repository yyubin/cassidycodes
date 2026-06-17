# JPA 엔티티 매핑

엔티티 매핑은 Java 클래스와 데이터베이스 테이블을 연결하는 작업이다. JPA는 어노테이션을 기준으로 테이블, 컬럼, 기본키, 제약 조건을 해석하고 SQL 생성에 반영한다.

## 기본 어노테이션

| 어노테이션 | 역할 |
| --- | --- |
| `@Entity` | JPA가 관리할 엔티티 클래스 지정 |
| `@Table` | 실제 테이블명 지정 |
| `@Id` | 기본키 필드 지정 |
| `@GeneratedValue` | 기본키 생성 전략 설정 |
| `@Column` | 컬럼명, 길이, null 허용 여부 등 지정 |
| `@Transient` | DB 매핑 대상에서 제외 |

## 기본키 전략

MySQL처럼 auto increment를 사용하는 DB에서는 `GenerationType.IDENTITY`를 자주 사용한다. Oracle sequence 기반 환경에서는 `SEQUENCE` 전략을 검토한다. PK 생성 방식은 DB 특성과 맞춰야 한다.

## Enum 매핑

```java
@Enumerated(EnumType.STRING)
private MemberRole role;
```

Enum은 `ORDINAL`보다 `STRING`을 쓰는 편이 안전하다. 순서 기반 저장은 enum 상수 순서가 바뀌면 기존 데이터 의미가 달라질 수 있다.

## Access 타입

JPA는 필드 또는 getter 중 하나를 기준으로 Entity 값에 접근한다. `@Id`가 필드에 있으면 필드 접근, getter에 있으면 프로퍼티 접근이 기본값이다. 혼란을 줄이려면 한 엔티티 안에서 접근 방식을 섞지 않는 것이 좋다.

## Embedded Type

값 타입을 별도 클래스로 묶고 싶을 때 `@Embeddable`과 `@Embedded`를 사용한다.

```java
@Embeddable
public class Price {
    private int regularPrice;
    private double discountRate;
    private int sellPrice;
}

@Entity
public class Book {
    @Embedded
    private Price price;
}
```

DB에는 여러 컬럼으로 풀려 저장되지만, Java 코드에서는 관련 값을 하나의 객체로 다룰 수 있어 응집도가 높아진다.

## 정리

엔티티는 단순한 테이블 복사본이 아니라 도메인 규칙을 담는 객체다. 컬럼 제약, 생성자 접근 제어, 값 타입 분리를 함께 고려하면 JPA가 관리하기 좋은 모델을 만들 수 있다.

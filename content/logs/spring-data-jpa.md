# Spring Data JPA

Spring Data JPA는 JPA Repository 구현을 직접 작성하지 않고 인터페이스 선언만으로 CRUD, 페이징, 정렬, 쿼리 메서드를 사용할 수 있게 해준다.

## JpaRepository

```java
public interface MenuRepository extends JpaRepository<Menu, Integer> {
}
```

`JpaRepository<엔티티, PK타입>`을 상속하면 `findById`, `findAll`, `save`, `delete`, `count` 같은 기본 메서드가 제공된다. Service는 Repository 인터페이스에 의존하고, 실제 구현체는 Spring Data JPA가 런타임에 만든다.

## 쿼리 메서드

```java
List<Menu> findByMenuPriceGreaterThan(Integer price);
List<Menu> findByMenuPriceGreaterThanOrderByMenuPriceDesc(Integer price);
Page<Menu> findByMenuPriceGreaterThan(Integer price, Pageable pageable);
```

메서드 이름 규칙을 해석해 JPQL을 자동 생성한다. 조건이 단순한 조회는 쿼리 메서드만으로도 충분하다.

## 페이징

```java
@GetMapping
public Page<MenuResponseDTO> findMenus(@PageableDefault(size = 30) Pageable pageable) {
    return menuService.findMenus(pageable);
}
```

`Pageable`은 page, size, sort 정보를 담고, Repository는 `Page<T>`로 데이터와 전체 개수 메타정보를 함께 반환할 수 있다. DTO 변환은 `Page.map()`을 사용하면 페이징 정보가 유지된다.

## DTO와 ModelMapper

요청 DTO와 응답 DTO를 분리하면 엔티티를 API에 직접 노출하지 않아도 된다. ModelMapper를 사용할 때는 private 필드 매칭 설정이 필요한 경우가 있다.

```java
modelMapper.getConfiguration()
        .setFieldAccessLevel(AccessLevel.PRIVATE)
        .setFieldMatchingEnabled(true);
```

## 엔티티 설계 포인트

JPA 엔티티는 `protected` 기본 생성자를 두고, 외부 생성은 Builder나 정적 팩토리로 제한하는 방식이 자주 사용된다. 값 변경도 setter를 무분별하게 열기보다 `modifyPrice`, `changeCategory`처럼 의도가 드러나는 메서드로 관리하는 편이 좋다.

## 정리

Spring Data JPA는 반복 Repository 코드를 줄여 주지만, 내부적으로는 JPA와 영속성 컨텍스트가 동작한다. 자동 생성 메서드에만 의존하기보다 Entity 설계, 트랜잭션 범위, fetch 전략을 함께 이해해야 안정적으로 사용할 수 있다.

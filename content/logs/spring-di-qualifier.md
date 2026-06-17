# Spring DI - Primary, Qualifier, Collection 주입

같은 타입의 Bean이 여러 개 등록되면 Spring은 어떤 Bean을 주입해야 할지 결정할 수 없다. 이때 사용하는 대표적인 해결책이 `@Primary`, `@Qualifier`, 그리고 컬렉션 주입이다.

## 같은 인터페이스의 여러 구현체

```java
public interface Pokemon {
    String attack();
}
```

`Pikachu`, `Squirtle`, `Charmander`가 모두 `Pokemon`을 구현하고 Bean으로 등록되어 있다면, `Pokemon pokemon` 하나만 요청했을 때 후보가 여러 개가 된다.

## @Primary

`@Primary`는 같은 타입 후보 중 기본 선택 대상을 지정한다.

```java
@Component
@Primary
public class Pikachu implements Pokemon { }
```

특정 타입의 기본 구현체가 명확할 때 편리하다. 다만 주입 지점마다 다른 구현체가 필요하다면 `@Qualifier`가 더 명확하다.

## @Qualifier

`@Qualifier`는 Bean 이름이나 별칭을 기준으로 원하는 구현체를 직접 지정한다.

```java
@Service
public class BattleService {
    private final Pokemon pokemon;

    public BattleService(@Qualifier("squirtle") Pokemon pokemon) {
        this.pokemon = pokemon;
    }
}
```

여러 구현체를 상황별로 분리해야 할 때 가장 의도가 잘 드러난다.

## Collection 주입

같은 타입의 Bean을 모두 받아야 한다면 `List`, `Set`, `Map`으로 주입할 수 있다.

```java
public BattleService(List<Pokemon> pokemons, Map<String, Pokemon> pokemonMap) {
    this.pokemons = pokemons;
    this.pokemonMap = pokemonMap;
}
```

`List<Pokemon>`은 등록된 모든 구현체를 순회할 때 좋고, `Map<String, Pokemon>`은 Bean 이름으로 전략을 선택할 때 유용하다.

## 선택 기준

| 상황 | 사용 방식 |
| --- | --- |
| 기본 구현체가 하나 필요 | `@Primary` |
| 주입 지점에서 구현체를 지정 | `@Qualifier` |
| 모든 구현체를 활용 | `List` / `Map` 주입 |
| 런타임 전략 선택 | `Map<String, 구현체>` |

DI 충돌을 단순히 없애는 것보다, 왜 그 구현체가 필요한지 코드에 드러나게 만드는 것이 중요하다.

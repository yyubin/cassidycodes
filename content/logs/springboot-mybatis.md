# Spring Boot와 MyBatis 통합

Spring Boot에서 MyBatis를 사용하면 반복적인 SqlSession 설정을 크게 줄일 수 있다. Mapper 인터페이스와 XML SQL을 연결하고, Service 계층에서는 Mapper를 주입받아 데이터 접근을 수행한다.

## 필요한 의존성

| 의존성 | 역할 |
| --- | --- |
| `mybatis-spring-boot-starter` | Spring Boot와 MyBatis 연동 |
| `mysql-connector-j` | MySQL JDBC 드라이버 |
| `spring-boot-starter-web` | REST API 구성 |
| `lombok` | DTO/Entity 보일러플레이트 감소 |

## application.yml 핵심 설정

```yaml
mybatis:
  mapper-locations: classpath:mappers/**/*.xml
  type-aliases-package: com.example.menu.dto
  configuration:
    map-underscore-to-camel-case: true
```

`mapper-locations`는 XML 파일 위치를 알려주고, `type-aliases-package`는 XML에서 긴 클래스명을 짧게 사용할 수 있게 해준다. `map-underscore-to-camel-case`는 DB의 `menu_code`를 Java의 `menuCode`로 매핑할 때 유용하다.

## Mapper 인터페이스

```java
@Mapper
public interface MenuMapper {
    List<MenuDTO> findAll();
    MenuDTO findByCode(int menuCode);
    int insertMenu(MenuDTO menu);
}
```

메서드 이름은 XML의 `<select id="findAll">`처럼 같은 id를 가진 SQL과 연결된다.

## XML Mapper 포인트

```xml
<select id="findAll" resultType="menuDTO">
    SELECT menu_code, menu_name, menu_price
    FROM tbl_menu
</select>
```

SQL을 XML로 분리하면 복잡한 조인이나 동적 조건을 Java 코드에서 떼어낼 수 있다. 대신 인터페이스 메서드명, XML id, 파라미터 이름이 어긋나지 않도록 관리해야 한다.

## 계층 흐름

Controller는 HTTP 요청을 받고, Service는 트랜잭션과 비즈니스 규칙을 담당하며, Mapper는 SQL 실행에 집중한다. Spring Boot에서는 Mapper가 Bean으로 등록되므로 생성자 주입으로 자연스럽게 연결할 수 있다.

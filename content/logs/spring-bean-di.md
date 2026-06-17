# Spring Bean 설정과 DI 기초

Spring을 사용하면 객체 생성과 의존 관계 조립을 개발자가 직접 하지 않고 컨테이너에 맡길 수 있다. 이 흐름을 이해하려면 Plain Java 방식과 Spring 설정 방식을 비교하는 것이 좋다.

## Plain Java 방식

```java
MemberDAO memberDAO = new MemberDAO();
MemberDTO member = memberDAO.selectMember(1);
```

직접 `new`로 객체를 만들면 단순하지만, 클래스가 구체 구현에 강하게 묶인다. 의존 객체가 바뀔 때 사용하는 쪽 코드까지 수정해야 하므로 규모가 커질수록 유지보수가 어려워진다.

## XML 설정

XML의 `<bean>` 태그로 객체를 선언하면 Spring 컨테이너가 해당 객체를 생성한다. 생성자 값은 `<constructor-arg>`, setter 값은 `<property>`로 주입한다.

```xml
<bean id="member" class="com.example.MemberDTO">
    <constructor-arg index="0" value="1" />
    <constructor-arg name="id" value="user01" />
</bean>
```

XML 방식은 설정이 코드 밖에 있어 변경 시 재컴파일 부담이 적다. 다만 문자열 기반 설정이 많아 오타를 컴파일 단계에서 잡기 어렵다.

## Java Config

`@Configuration` 클래스 안에서 `@Bean` 메서드를 선언하면 반환 객체가 Bean으로 등록된다.

```java
@Configuration
public class ContextConfiguration {
    @Bean
    public MemberDTO member() {
        return new MemberDTO(1, "user01", "pass01", "신짱구");
    }
}
```

Java Config는 타입 안정성과 IDE 지원을 받을 수 있고, 설정 흐름을 코드로 추적하기 쉽다.

## Component Scan

`@ComponentScan`은 지정 패키지 아래의 `@Component`, `@Repository`, `@Service`, `@Controller`를 자동 탐색한다. 반복적인 Bean 등록 코드를 줄이고 계층 역할을 어노테이션으로 드러낼 수 있다.

## DI 핵심

DI는 필요한 객체를 직접 만들지 않고 외부에서 전달받는 방식이다. 특히 생성자 주입은 필드를 `final`로 유지할 수 있고, 객체가 만들어질 때 의존성이 반드시 채워지므로 테스트와 유지보수에 유리하다.

```java
public class MemoService {
    private final MemoRepository repository;

    public MemoService(MemoRepository repository) {
        this.repository = repository;
    }
}
```

## 정리

| 항목 | 핵심 |
| --- | --- |
| IoC | 객체 제어권을 컨테이너로 넘김 |
| Bean | Spring이 생성하고 관리하는 객체 |
| DI | 필요한 의존 객체를 외부에서 주입 |
| XML | 외부 설정 중심 |
| Java Config | 타입 안정적인 코드 기반 설정 |
| Component Scan | 어노테이션 기반 자동 등록 |

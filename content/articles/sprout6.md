이전 `DIY AOP: Spring AOP 만들어보기` 에서는 `Advice`-`Pointcut`-`Advisor` 의 관계 보다는 프록시 시점과 DI가 어떻게 통합되는지, `AdvisorRegistry`에 언제 등록되어 찾고 캐싱을 어떻게 하는지 등등 위주의 설명이었다. 오늘은 보다 자세하게, `Sprout AOP`의 `Advice`-`Pointcut`-`Advisor` 설계와 코드에 대해 분석해 보려고 한다. 

# Spring AOP의 핵심을 단순화한 Sprout AOP 설계 분석

Spring Framework를 공부하다 보면 `AOP(Aspect-Oriented Programming)`라는 개념에 매료되곤 한다. 로깅, 트랜잭션, 보안 등 횡단 관심사를 비즈니스 로직에서 분리할 수 있다는 아이디어는 정말 매력적이기 때문이다. 하지만 막상 Spring AOP의 내부 구조를 들여다보면, `ProxyFactory`, `AdvisorChainFactory`, `AopProxyFactory` 등 수많은 컴포넌트들이 복잡하게 얽혀있어 구조를 파악하기엔 쉽지 않다.

Spring AOP의 핵심 개념과 설계 철학은 그대로 유지하되, 학습 목적에 맞게 불필요한 복잡성을 제거하고 각 컴포넌트의 역할을 명확히 하는 것이 목표였다. 이 글에서는 Sprout AOP가 어떤 설계 결정을 내렸는지, 그리고 왜 그렇게 설계했는지를 깊이 있게 살펴볼 것이다.

### AOP의 본질
1. 무엇을 할 것인가? (Advice) - 로깅을 할 것인가, 트랜잭션을 관리할 것인가?
2. 어디에 적용할 것인가? (Pointcut) - 어떤 클래스의 어떤 메서드에?
3. 어떤 순서로 적용할 것인가? (Order) - 여러 Advice가 있을 때 실행 순서는?

이에 질문들에 대한 답을 위해 다음과 같은 아키텍처를 사용하여 구성하였다.

```plain
@Aspect 클래스
    ↓
AdviceFactory → AdviceBuilder → Advice (실제 부가 기능)
    ↓                              ↓
Pointcut (적용 위치) ← PointcutFactory
    ↓
DefaultAdvisor (Advice + Pointcut + Order를 묶음)
    ↓
AdvisorRegistry (저장 및 매칭)
    ↓
프록시 생성 시 인터셉터 체인 구성
```
`AdviceFactory`는 어드바이스를 생성하는 것만, `AdvisorRegistry`는 생성된 어드바이저를 저장하고 검색하는 것만 담당한다. 명확하고 이해하기 어렵지 않도록 설계하기 위함이었다.

## 1. 통일된 Advice 인터페이스
Spring AOP를 공부하다 보면 `MethodBeforeAdvice`, `AfterReturningAdvice`, `ThrowsAdvice` 등 다양한 Advice 인터페이스가 있음을 확인할 수 있다. 

나는 Sprout를 만들면서 이 부분을 과감하게 단순화 시켰다.
```java
public interface Advice {
    Object invoke(MethodInvocation invocation) throws Throwable;
}
```

MethodInvocation은 실행 중인 메서드에 대한 모든 정보(타겟 객체, 메서드, 파라미터 등)를 담고 있으며, `proceed()` 메서드를 통해 다음 인터셉터나 실제 메서드를 호출할 수 있다. 이는 Chain of Responsibility 패턴의 구현이고 실제로 스프링에서도 많이 쓰이는 패턴이다.

이렇게 통일된 인터페이스를 사용하면 어떤 이점이 있을까?

내 생각엔 다음과 같다.

1. 코드의 일관성이다. Before든 After든 Around든, 모두 같은 방식으로 다룰 수 있다. 새로운 어드바이스 타입을 추가할 때도 같은 인터페이스만 구현하면 된다.

2. 체이닝의 유연성이다. invocation.proceed()를 호출하는 시점과 횟수를 자유롭게 제어할 수 있다. Before 어드바이스는 proceed() 전에 로직을 실행하고, After 어드바이스는 proceed() 후에 실행하고, Around 어드바이스는 양쪽 모두에서 실행할 수 있다.

물론 `Spring AOP`가 여러 인터페이스를 제공하는 데는 그만한 이유가 있다. 더 명시적인 타입 시스템을 통해 각 어드바이스의 의도를 코드 레벨에서 명확히 표현할 수 있기 때문이다.

## 2. 열거형 기반 타입 시스템
어드바이스 타입을 어떻게 표현할 것인가? 이는 단순해 보이지만 중요한 설계 결정이다. 나는 Java의 열거형(enum)을 활용했다.

```java
public enum AdviceType {
    AROUND(Around.class),
    BEFORE(Before.class),
    AFTER(After.class);

    private final Class<? extends Annotation> anno;

    AdviceType(Class<? extends Annotation> anno) {
        this.anno = anno;
    }

    public static Optional<AdviceType> from(Method m) {
        return Arrays.stream(values())
                .filter(t -> m.isAnnotationPresent(t.anno))
                .findFirst();
    }
}
```

 각 `AdviceType`은 해당하는 어노테이션 클래스를 필드로 가지고 있다. BEFORE는 `@Before` 어노테이션과, AROUND는 `@Around` 어노테이션과 매핑되는 것이다. 이런 설계를 통해 어노테이션과 타입이 명확하게 1:1로 대응된다.
 
`from()` 메서드는 정적 팩토리 메서드다. 주어진 메서드에 어떤 어드바이스 어노테이션이 붙어있는지 검사하고, 해당하는 AdviceType을 반환한다. 여기서 주목할 점은 `Optional`을 반환한다는 것이다. 어드바이스 어노테이션이 없을 수도 있기 때문이다. 이는 null 안전성을 보장하기 위한 스타일이다.

> 덤으로, `Optional` 은 **리턴 타입, 지역 변수 / 내부 계산에서의 임시 사용, Stream 파이프라인에서 중간 변환** 정도에서 자주 사용함. 메서드나 불변 인자(DTO, 엔티티 등)에서는 잘 사용하지 않는다. 직렬화에 문제가 발생할 가능성이 높고 애초에 “값이 있을 수도 없을 수도 있음”을 표현하는 리턴 결과용 컨테이너이기 때문

또한 이 설계는 확장에 열려있다. 새로운 어드바이스 타입을 추가하고 싶다면? 단순히 enum에 새로운 상수를 추가하면 된다.

```java
AFTER_RETURNING(AfterReturning.class),
AFTER_THROWING(AfterThrowing.class)
```

컴파일러가 자동으로 타입 안전성을 보장해주고, `from()` 메서드도 자동으로 새로운 타입을 처리한다. 

## 3. 팩토리 패턴과 전략 패턴의 조화
실제로 Advice를 생성하는 `AdviceFactory`를 살펴보자. 이 클래스는 팩토리 패턴과 전략 패턴을 결합하여 만들었다.

```java
@Component
public class AdviceFactory implements InfrastructureBean {
    private final Map<AdviceType, AdviceBuilder> builders;
    private final PointcutFactory pointcutFactory;

    public AdviceFactory(PointcutFactory pointcutFactory) {
        this.pointcutFactory = pointcutFactory;
        this.builders = Map.of(
            AdviceType.AROUND, new AroundAdviceBuilder(),
            AdviceType.BEFORE, new BeforeAdviceBuilder(),
            AdviceType.AFTER,  new AfterAdviceBuilder()
        );
    }

    public Optional<Advisor> createAdvisor(
            Class<?> aspectCls, Method m, Supplier<Object> sup) {
        return AdviceType.from(m)
                .map(type -> builders.get(type)
                    .build(aspectCls, m, sup, pointcutFactory));
    }
}
```
이 코드에는 여러 설계 결정이 숨어있다. 

먼저 `builders` 맵이다. `Map.of()`를 사용해서 불변 맵을 생성하고 있다. 이는 Java 9에서 추가된 편리한 팩토리 메서드인데, 여기서는 단순히 편의성을 넘어선 의미가 있다. 이 맵은 생성 시점에 완전히 초기화되고, 이후에는 절대 변경되지 않는다. 즉, 컴파일 타임에 모든 빌더가 등록되어 있음을 보장하는 것이다.

만약 맵이 가변이라면, 런타임에 누군가가 빌더를 추가하거나 제거할 수 있다. 그렇게 되면 예측 불가능한 동작이 발생할 수 있다. 하지만 불변 맵을 사용함으로써, 팩토리의 동작이 항상 일관됨을 보장할 수 있다.

다음은 생성자. `PointcutFactory`를 생성자 주입으로 받고 있다. 이는 의존성 주입(DI)의 사례다. 필드 주입이나 세터 주입 대신 생성자 주입을 사용하면, 객체가 생성되는 시점에 모든 의존성이 주입되므로, 불완전한 상태의 객체가 존재할 수 없다.

`createAdvisor()` 메서드는 함수형 프로그래밍 스타일인데 다음과 같다.
```java
return AdviceType.from(m)
    .map(type -> builders.get(type).build(...));   
```
이 체이닝은 다음과 같이 읽을 수 있다.

1. 메서드에서 어드바이스 타입을 찾는다 (AdviceType.from(m))
2. 타입이 있으면 해당 빌더를 가져와서 Advisor를 빌드한다 (.map(...))
3. 타입이 없으면 빈 Optional 반환

여기서 중요한 점은 null 체크가 전혀 없다는 것이다. Optional의 `map()` 메서드가 값이 있을 때만 함수를 적용하므로, null 안전성이 자동으로 보장된다. 이는 전통적인 null 체크 방식보다 훨씬 안전하고 깔끔해진다.

또한 이 팩토리는 단일 책임 원칙을 따른다. 팩토리는 "어떤 빌더를 사용할지" 결정만 하고, 실제 생성 로직은 각 빌더에게 위임한다. 이렇게 하면 새로운 어드바이스 타입을 추가할 때 팩토리를 수정할 필요가 거의 없다. 새 빌더를 만들고 맵에 추가만 하면 되기 때문이다.

### AdviceBuilder: 타입별로 특화된 생성 전략
각 어드바이스 타입은 서로 다른 특성과 제약사항을 가지고 있다. `Before` 어드바이스는 파라미터가 없거나 `JoinPoint` 하나만 받을 수 있고, `Around` 어드바이스는 반드시 `ProceedingJoinPoint`를 받아야 한다. 이런 타입별 특성을 어떻게 처리해야할까?

각 타입마다 전용 빌더를 제공하는 것으로 해결했다. `BeforeAdviceBuilder`를 먼저 살펴보자.
```java
public class BeforeAdviceBuilder implements AdviceBuilder {
    @Override
    public Advisor build(Class<?> aspectCls, Method method, 
                         Supplier<Object> aspectSup, PointcutFactory pf) {
        Before before = method.getAnnotation(Before.class);

        // 파라미터 검증: 0개 또는 JoinPoint 1개만 허용
        if (method.getParameterCount() > 1 ||
            (method.getParameterCount() == 1 &&
             !JoinPoint.class.isAssignableFrom(method.getParameterTypes()[0]))) {
            throw new IllegalStateException(
                "@Before method must have 0 or 1 JoinPoint param");
        }

        Pointcut pc = pf.createPointcut(
            before.annotation(), before.pointcut());

        // static 메서드는 인스턴스 불필요
        Supplier<Object> safe = Modifier.isStatic(method.getModifiers()) 
            ? () -> null : aspectSup;

        Advice advice = new SimpleBeforeInterceptor(safe, method);
        return new DefaultAdvisor(pc, advice, 0);
    }
}
```
이 코드를 자세히 뜯어보자.

먼저 파라미터 검증 부분이다. Before 어드바이스는 원본 메서드의 실행을 제어하지 않으므로, ProceedingJoinPoint가 필요 없다. 대신 메서드 정보만 필요하다면 JoinPoint를 받을 수 있다. 하지만 여러 개의 파라미터는 의미가 없다. 뭘 전달해야 할지 모호하기 때문이다.

이 검증 로직은 Fail-Fast 원칙을 따른다. 잘못된 설정을 런타임에 발견하는 것보다는, 애플리케이션 시작 시점에 발견하는 것이 훨씬 낫다. 그래서 예외를 던져서 즉시 문제를 알린다.

다음으로 Pointcut 생성이다. `@Before` 어노테이션에서 `annotation()`과 `pointcut()` 속성을 읽어서 `PointcutFactory`에 전달한다. 이렇게 포인트컷 생성을 별도 팩토리에 위임함으로써, 빌더는 포인트컷의 내부 구조를 전혀 알 필요가 없어진다.

그 다음은 static 메서드 처리이다. 이 부분이 제일 재밌는 부분이다.
```java
Supplier<Object> safe = Modifier.isStatic(method.getModifiers()) 
    ? () -> null : aspectSup;
```
어드바이스 메서드가 static이면 인스턴스가 필요 없다. 하지만 인스턴스 메서드라면 Aspect 빈의 인스턴스를 가져와야 한다. 여기서 `Supplier<Object>`를 사용한 것이 핵심이다. 이는 **지연 평가(Lazy Evaluation)**를 가능하게 한다.
  
왜 직접 객체를 전달하지 않고 Supplier를 사용할까? Aspect 빈이 아직 생성되지 않았다거나, 매번 새로운 인스턴스가 필요할 수도 있다. Supplier를 사용하면 실제로 필요한 시점에 인스턴스를 가져올 수 있다.
  
마지막으로 `SimpleBeforeInterceptor`를 생성하고, 이를 `DefaultAdvisor`로 감싸서 반환한다. Order는 0으로 설정되어 있는데, 이는 나중에 `@Order` 어노테이션을 통해 오버라이드될 수 있다.
  
### Around Advice의 특별함

이제 `AroundAdviceBuilder`를 보자. Around는 가장 강력하지만, 그만큼 엄격한 제약이 필요하다.
  
```java
public class AroundAdviceBuilder implements AdviceBuilder {
    @Override
    public Advisor build(Class<?> aspectCls, Method method,
                         Supplier<Object> sup, PointcutFactory pf) {
        Around around = method.getAnnotation(Around.class);

        // ProceedingJoinPoint 필수!
        if (method.getParameterCount() != 1 ||
            !ProceedingJoinPoint.class.isAssignableFrom(
                method.getParameterTypes()[0])) {
            throw new IllegalStateException(
                "Around advice must have exactly one " +
                "ProceedingJoinPoint parameter");
        }

        Pointcut pc = pf.createPointcut(
            around.annotation(), around.pointcut());
        Supplier<Object> safe = Modifier.isStatic(method.getModifiers())
            ? () -> null : sup;

        Advice advice = new SimpleAroundInterceptor(safe, method);
        return new DefaultAdvisor(pc, advice, 0);
    }
}
```
Before와 비교하면 파라미터 검증이 훨씬 엄격하다. 정확히 하나의 `ProceedingJoinPoint` 파라미터만 허용한다. 왜일까.

Around 어드바이스는 원본 메서드의 실행을 완전히 제어한다. 메서드를 호출할지 말지, 몇 번 호출할지, 파라미터를 변경할지, 반환값을 조작할지 모두 어드바이스가 결정한다. 이런 제어를 하려면 `proceed()` 메서드가 필요한데, 이는 `ProceedingJoinPoint`에만 있다.

예를 들어, 재시도 로직을 구현한다고 생각해보자.

```java
@Around(annotation = {Retry.class})
public Object retry(ProceedingJoinPoint pjp) throws Throwable {
    int attempts = 0;
    while (attempts < 3) {
        try {
            return pjp.proceed();  // 원본 메서드 호출
        } catch (Exception e) {
            attempts++;
            if (attempts >= 3) throw e;
        }
    }
    return null;
}
```

이런 로직은 Before나 After로는 불가능하다. `proceed()`를 여러 번 호출할 수 있어야 하기 때문이다.

반대로, Before 어드바이스에 `ProceedingJoinPoint`를 전달하면 어떻게 될까? Before는 원본 메서드 호출 전에만 실행되어야 하는데, `proceed()`를 호출할 수 있게 되면 이 계약이 깨진다. 그래서 Sprout은 타입별로 엄격하게 파라미터를 제한한다.

이런 설계는 컴파일 타임에는 체크할 수 없지만, 애플리케이션 시작 시점에 체크할 수 있는 제약사항을 구현한 예시이다.

## 인터셉터: Advice의 실제 구현체들
빌더가 생성하는 것은 결국 `Advice` 인터페이스의 구현체이다. 이제 각 타입의 인터셉터가 어떻게 동작하는지 자세히 살펴보자.

### SimpleBeforeInterceptor: 사전 실행
```java
public class SimpleBeforeInterceptor implements Advice {
    private final Supplier<Object> aspectProvider;
    private final Method adviceMethod;

    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        // 1. aspect 인스턴스 획득 (static이면 null)
        Object aspect = java.lang.reflect.Modifier.isStatic(adviceMethod.getModifiers())
                ? null : aspectProvider.get();

        try {
            // 2. 어드바이스 메서드 실행
            if (adviceMethod.getParameterCount() == 0) {
                adviceMethod.invoke(aspect);
            } else {
                JoinPoint jp = new JoinPointAdapter(invocation);
                adviceMethod.invoke(aspect, jp);
            }
        } catch (InvocationTargetException e) {
            throw e.getTargetException();
        }

        // 3. 원본 메서드 실행
        return invocation.proceed();
    }
}
```
**1단계: Aspect 인스턴스 획득**
먼저 어드바이스 메서드를 호출하려면 그 메서드가 속한 객체가 필요하다. static 메서드가 아니라면! 여기서 앞서 빌더에서 준비한 Supplier가 사용된다. aspectProvider.get()을 호출하면 실제 Aspect 빈 인스턴스가 반환된다.
static 메서드인 경우는? null을 전달한다. `Reflection API`에서 static 메서드를 호출할 때는 인스턴스가 필요 없기 때문이다.

**2단계: 어드바이스 메서드 실행**
이제 실제 어드바이스 로직을 실행한다. 여기서 파라미터 개수를 체크하는 것을 볼 수 있다. 파라미터가 없으면 그냥 호출하고, JoinPoint를 받는다면 어댑터를 만들어서 전달한다.
JoinPointAdapter는 MethodInvocation을 JoinPoint 인터페이스로 감싸는 어댑터이다. 왜 이렇게 할까? MethodInvocation은 인터셉터 체인에서 사용하는 내부 인터페이스이고, JoinPoint는 사용자에게 노출되는 공개 API이기 때문이다. 이렇게 분리함으로써 내부 구현을 숨길 수 있다.

예외 처리도 주목할 만하다.
```java
catch (InvocationTargetException e) {
    throw e.getTargetException();
}
```
`Method.invoke()`는 메서드 내부에서 발생한 예외를 `InvocationTargetException`으로 감싸서 던진다. 하지만 우리는 원본 예외를 그대로 전파하고 싶다. 그래서 `getTargetException()`으로 원본 예외를 추출해서 다시 던진다.

**3단계: 원본 메서드 실행**
어드바이스 로직이 끝났으니, 이제 원본 메서드를 실행한다. `invocation.proceed()`를 호출하면, 다음 인터셉터가 있다면 그것을 실행하고, 없다면 실제 타겟 메서드를 실행한다.
이 흐름이 Before 어드바이스의 본질이다. 어드바이스 먼저, 원본은 나중에

### SimpleAfterInterceptor: 예외 상황을 고려한 사후 처리
After 어드바이스는 Before보다 복잡하다. 왜냐하면 원본 메서드가 예외를 던질 수도 있기 때문이다.

```java
public class SimpleAfterInterceptor implements Advice {
    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        Object result;
        Throwable thrown = null;

        try {
            // 1. 원본 메서드 먼저 실행
            result = invocation.proceed();
        } catch (Throwable t) {
            thrown = t;  // 예외 보존
            result = null;
        }

        // 2. After 어드바이스 실행 (예외 발생 여부 무관)
        Object aspect = java.lang.reflect.Modifier.isStatic(adviceMethod.getModifiers())
                ? null : aspectProvider.get();

        try {
            if (adviceMethod.getParameterCount() == 0) {
                adviceMethod.invoke(aspect);
            } else {
                JoinPoint jp = new JoinPointAdapter(invocation);
                adviceMethod.invoke(aspect, jp);
            }
        } catch (InvocationTargetException e) {
            throw e.getTargetException();
        }

        // 3. 원본 예외가 있으면 다시 던지기
        if (thrown != null) throw thrown;
        return result;
    }
}
```
이 코드는 Java의 finally 블록과 유사한 시맨틱스를 구현한다. 원본 메서드가 성공하든 실패하든, 어드바이스는 반드시 실행되어야 한다.

**1단계: 원본 메서드 실행 및 예외 포착**
Before와 달리, 원본 메서드를 먼저 실행한다. 그리고 try-catch로 감싸서 예외를 포착한다. 중요한 점은 예외를 즉시 던지지 않고 thrown 변수에 저장한다는 것이다.

왜 이렇게 할까? 예외가 발생해도 어드바이스는 실행되어야 하기 때문이다. 만약 여기서 바로 예외를 던지면 어드바이스가 실행되지 않기 때문이다. 그래서 예외를 일단 보관해두고, 나중에 다시 던지는 것이다.

**2단계: After 어드바이스 실행**
이제 어드바이스를 실행한다. 원본 메서드가 성공했든 실패했든 상관없다. 이 부분의 로직은 Before 인터셉터와 거의 동일하다. Aspect 인스턴스를 가져오고, 파라미터에 따라 적절히 메서드를 호출하는 것.

여기서도 예외 처리가 있다. 어드바이스 메서드 자체가 예외를 던질 수 있기 때문이다. 이 경우는 어떻게 될까? `InvocationTargetException`을 벗겨서 원본 예외를 던진다. 이 예외는 원본 메서드의 예외보다 우선시 된다.

**3단계: 원본 예외 재전파**
모든 어드바이스 로직이 끝났으니, 이제 보관해둔 예외를 확인한다. thrown이 null이 아니면, 즉 원본 메서드가 예외를 던졌다면, 그 예외를 다시 던진다.

이런 설계는 미묘하지만 중요한 보장을 제공한다.

1. 어드바이스는 항상 실행된다 - 원본 메서드의 성공/실패와 무관
2. 원본 예외는 보존된다 - 호출자는 원본 메서드가 던진 예외를 받음
3. 어드바이스 예외가 우선한다 - 어드바이스가 실패하면 그 예외가 전파됨

이는 정확히 Java의 `try-finally` 동작과 일치하다고 볼 수 있다.

### SimpleAroundInterceptor: 완전한 제어
Around 인터셉터는 가장 강력하지만, 구현은 오히려 가장 단순하다.
```java
public class SimpleAroundInterceptor implements Advice {
    private final Supplier<Object> aspectProvider;
    private final Method adviceMethod;

    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        // 1. ProceedingJoinPoint 어댑터 생성
        ProceedingJoinPoint pjp = new PjpAdapter(invocation);

        // 2. aspect 인스턴스 획득
        Object aspect = java.lang.reflect.Modifier.isStatic(adviceMethod.getModifiers())
                ? null : aspectProvider.get();

        try {
            // 3. Around 어드바이스 메서드 실행 (원본 메서드 호출 제어권 넘김)
            adviceMethod.setAccessible(true);
            return adviceMethod.invoke(aspect, pjp);
        } catch (InvocationTargetException e) {
            throw e.getTargetException();
        }
    }
}
```
모든 제어를 어드바이스 메서드에게 넘기기 때문이다.

**1단계: ProceedingJoinPoint 생성**
PjpAdapter는 MethodInvocation을 ProceedingJoinPoint로 감싼다. ProceedingJoinPoint는 `proceed()` 메서드를 제공하는데, 이를 통해 원본 메서드를 호출할 수 있다.

**2단계: Aspect 인스턴스 획득**
다른 인터셉터들과 동일하게, static 여부를 확인하고 적절히 인스턴스를 가져온다.

**3단계: 어드바이스 메서드 실행**
여기가 핵심이다. 어드바이스 메서드에 `ProceedingJoinPoint`를 전달하고 호출. 이제 모든 제어권은 어드바이스 메서드에 있다.

어드바이스 메서드는 다음과 같은 일들을 할 수 있다.
```java
@Around(annotation = {Retry.class})
public Object retry(ProceedingJoinPoint pjp) throws Throwable {
    // proceed()를 호출하지 않을 수도 있음 (원본 메서드 실행 안 함)
    if (shouldSkip()) {
        return null;
    }
    
    // proceed()를 여러 번 호출할 수도 있음
    for (int i = 0; i < 3; i++) {
        try {
            return pjp.proceed();
        } catch (Exception e) {
            // 재시도
        }
    }
    
    // proceed() 전후에 로직 실행
    long start = System.currentTimeMillis();
    Object result = pjp.proceed();
    long elapsed = System.currentTimeMillis() - start;
    
    // 반환값을 변경할 수도 있음
    return transformResult(result);
}
```
이런 유연성 때문에 Around는 가장 강력한 어드바이스 타입이다. 하지만 그만큼 책임도 크다. `proceed()`를 호출하지 않으면 원본 메서드가 실행되지 않기 때문이다.

Before와 After는 인터셉터가 자동으로 `proceed()`를 호출해준다. 하지만 Around는 어드바이스 메서드가 직접 호출해야 한다. 이는 실수하기 쉬운 부분이지만, 동시에 Around의 핵심 특징이기도 하다.

## Advisor: 세 가지를 하나로

이제 Advice가 어떻게 생성되고 동작하는지 알게 되었다. 하지만 Advice만으로는 충분하지 않다. "어디에 적용할지"와 "어떤 순서로 실행할지"도 필요하다. 이 세 가지를 하나로 묶는 것이 바로 Advisor다.

```java
public interface Advisor {
    Pointcut getPointcut();
    Advice getAdvice();
    default int getOrder() {
        return Integer.MAX_VALUE;
    }
}
```
인터페이스는 정말 단순하다. 세 가지만 제공하면 된다. 여기서 `getOrder()`의 기본값이 `Integer.MAX_VALUE`인 것이 귀여운 포인트다. 이는 순서를 지정하지 않은 어드바이저는 가장 낮은 우선순위를 갖는다는 의미이다. Spring의 @Order 어노테이션과 같은 컨벤션을 따른 것이다.

실제 구현체인 `DefaultAdvisor`를 살펴보자.
```java
public class DefaultAdvisor implements Advisor {
    private final Pointcut pointcut;
    private final Advice advice;
    private final int order;

    public DefaultAdvisor(Pointcut pointcut, Advice advice, int order) {
        this.pointcut = pointcut;
        this.advice = advice;
        this.order = order;
    }

    @Override
    public Pointcut getPointcut() { return pointcut; }

    @Override
    public Advice getAdvice() { return advice; }

    @Override
    public int getOrder() { return order; }
}
```
모든 필드가 final이다. 이는 불변 객체(Immutable Object) 설계이다. 한번 생성되면 절대 변경할 수 없다.

왜 불변으로 만들었을까? 여러 이유가 있긴하다.

1. 스레드 안전성
Advisor는 여러 스레드에서 동시에 접근될 수 있다. 프록시 생성 시점에 조회되고, 메서드 호출 시점에 사용된다. 만약 가변 객체라면 동기화가 필요하지만, 불변 객체는 자연스럽게 스레드 안전하다.
2. 예측 가능성
한번 생성된 Advisor의 동작은 절대 변하지 않는다. 이는 디버깅을 훨씬 쉽게 만든다. "이 어드바이저가 왜 다르게 동작하지?"라는 질문을 할 필요가 없기 때문이다.
3. 캐싱 친화적
AdvisorRegistry는 메서드별로 적용 가능한 Advisor 리스트를 캐싱한다. 만약 Advisor가 가변이라면 캐시가 무효화될 때를 알기 어렵다.. 하지만 불변이라면? 캐시를 안전하게 재사용할 수 있다.
4. 함수형 프로그래밍 친화적
불변 객체는 함수형 프로그래밍 스타일과 잘 어울린다. 필터링, 매핑, 정렬 등의 작업을 안전하게 수행할 수 있기 때문이다.


이런 설계 철학은 현대 Java의 트렌드와 일치하기도 하다. Java의 String, Integer 등 주요 클래스들이 모두 불변인 이유와 같다고 볼 수 있다.

## AdvisorRegistry: 효율적인 저장소 만들기

모든 Advisor를 관리하는 중앙 저장소가 바로 AdvisorRegistry이다. 이 클래스는 단순하지만, 성능을 위한 나름의 최적화를 진행했다.

```java
@Component
public class AdvisorRegistry implements InfrastructureBean {
    private final List<Advisor> advisors = new ArrayList<>();
    private final Map<Method, List<Advisor>> cachedAdvisors = 
        new ConcurrentHashMap<>();

    public void registerAdvisor(Advisor advisor) {
        synchronized (this) {
            advisors.add(advisor);
            cachedAdvisors.clear();
            advisors.sort(Comparator.comparingInt(Advisor::getOrder));
        }
    }

    public List<Advisor> getApplicableAdvisors(
            Class<?> targetClass, Method method) {
        List<Advisor> cached = cachedAdvisors.get(method);
        if (cached != null) return cached;

        List<Advisor> applicable = new ArrayList<>();
        for (Advisor advisor : advisors) {
            if (advisor.getPointcut().matches(targetClass, method)) {
                applicable.add(advisor);
            }
        }

        cachedAdvisors.put(method, applicable);
        return applicable;
    }
}
```

### 메서드별 캐싱 전략
가장 눈에 띄는 것은 `cachedAdvisors` 맵이다. 이는 Method를 키로, 해당 메서드에 적용 가능한 Advisor 리스트를 값으로 가지는 캐시이다.

왜 이런 캐싱이 필요할까? Pointcut 매칭은 비교적 비싼 연산이다. 특히 AspectJ 표현식을 사용하는 경우 더욱 그렇다. 하지만 같은 메서드에 대해서는 항상 같은 결과를 반환한다. 그렇다면 한번 계산한 결과를 재사용하는 것이 합리적이다.

실제 애플리케이션을 생각해보자. `UserService.findById()` 메서드는 수백, 수천 번 호출될 수 있다. 매번 모든 `Advisor`를 순회하며 `Pointcut`을 체크한다면? 엄청난 오버헤드가 발생하기 쉬워진다. 하지만 첫 호출 시 결과를 캐싱해두면, 이후 호출들은 `O(1)` 시간에 적용 가능한 Advisor들을 찾을 수 있게 된다.

### ConcurrentHashMap의 선택
캐시 구현체로 `ConcurrentHashMap`을 사용한 것도 주목할 만한 점이기도 하다. 왜 일반 HashMap이 아닐까?

`getApplicableAdvisors()`는 동기화 없이 캐시를 조회한다. 여러 스레드가 동시에 이 메서드를 호출할 수 있다. 만약 일반 HashMap을 사용한다면? 동시 접근 시 데이터 손상이 발생할 수 있다.

`ConcurrentHashMap`은 읽기 작업에 락이 필요 없다. 여러 스레드가 동시에 읽어도 안전하다. 이는 성능에 큰 도움이 된다. 대부분의 작업은 조회(읽기)이고, 등록(쓰기)은 애플리케이션 시작 시에만 일어나기 때문이다.

### 등록 시 정렬
`registerAdvisor()` 메서드를 보면 등록 후 즉시 정렬하는 것을 볼 수 있다. 
```java
advisors.sort(Comparator.comparingInt(Advisor::getOrder));
```
왜 여기서 정렬하는 걸까? 나중에 조회할 때 정렬하는 게 더 자연스러워 보이는 거 같기도 하다.

이는 시간 복잡도 트레이드오프이기도 하다. 등록은 애플리케이션 시작 시 한번만 일어난다. 하지만 조회는 프록시 생성 시마다 일어난다. 만약 조회 시점에 정렬한다면, 같은 정렬을 수십, 수백 번 반복하게 된다.

반면 등록 시점에 정렬하면? 한번만 정렬하고, 이후 조회는 이미 정렬된 리스트를 반환한다. 

시간 복잡도 관점에서,

- 등록 시 정렬: `O(n log n)` × `1`회 = `O(n log n)`
- 조회 시 정렬: `O(n log n)` × `m`회 = `O(m × n log n)`

m(조회 횟수)이 클수록 차이가 커질 것이다.

### 캐시 무효화 전략
`registerAdvisor()`를 보면 `cachedAdvisors.clear()`를 호출한다. 새로운 Advisor가 추가되면 기존 캐시를 모두 지우는 것이다.

이는 보수적인 전략이기도 하다. 더 정교한 전략도 가능할 수 있다. 예를 들어, 새 Advisor의 Pointcut을 보고 영향받는 캐시 엔트리만 지울 수도 있다. 하지만 저는 단순함을 선택했습니다.

1.  Advisor 등록은 매우 드문 작업이다. 대부분 애플리케이션 시작 시에만 일어난다. 
2. 정교한 무효화 로직은 복잡도를 높이고 버그 가능성을 증가시킬 수 있다.
3. 캐시는 금방 다시 채워진다. 첫 조회 시 캐시 미스가 발생하고, 이후는 다시 캐시 적중된다.

이 정도의 트레이드오프는 학습용 프레임워크로서 감수할만하다고 생각했다.

### 동기화 전략
등록은 `synchronized`로 보호되지만, 조회는 그렇지 않다.
```java
public void registerAdvisor(Advisor advisor) {
    synchronized (this) {  // 등록은 동기화
        // ...
    }
}

public List<Advisor> getApplicableAdvisors(...) {
    // 조회는 동기화 없음
}
```
이는 읽기-쓰기 패턴 최적화다. 쓰기는 드물고, 읽기는 빈번하다. 모든 읽기에 락을 걸면 성능이 크게 저하된다.

대신 두 가지 메커니즘으로 안전성을 보장하도록 했다.

1. 불변 Advisor: Advisor 자체가 불변이므로, 리스트에 추가된 후에는 변경되지 않는다.
2. ConcurrentHashMap: 동시 읽기가 안전하다

유일한 위험은 등록 중에 조회가 일어나는 경우다. 하지만 이는 애플리케이션 시작 시점의 짧은 순간에만 가능하고, 최악의 경우 약간 오래된 데이터를 읽을 수 있을 뿐 데이터 손상은 일어나지 않는다.

### 시간 복잡도 분석
레지스트리의 주요 연산들을 분석해보자.

**Advisor 등록**
- 리스트 추가: `O(1) (amortized)`
- 캐시 클리어: `O(k), k = 캐시 엔트리 수`
- 정렬: `O(n log n), n = Advisor 수`
- 전체: `O(n log n)`

**적용 가능한 Advisor 조회 (캐시 적중)**

- HashMap 조회: `O(1)`
- 전체: `O(1)`

**적용 가능한 Advisor 조회 (캐시 미스)**

- 전체 Advisor 순회: `O(n)`
- 각 Advisor의 Pointcut 매칭: `O(m), m = 매칭 복잡도`
- 전체: `O(n × m)`

캐시의 효과가 극적이다. 캐시 적중 시 `O(1)`, 미스 시 `O(n × m)`. 실제 애플리케이션에서는 대부분 캐시 적중이므로, 평균적으로 거의 `O(1)`에 가깝게 동작 가능하다.

## Pointcut 시스템: 어디에 적용할 것인가
Advice가 "무엇을"을 정의한다면, Pointcut은 "어디에"를 정의한다.

### Pointcut 인터페이스
```java
public interface Pointcut {
    boolean matches(Class<?> targetClass, Method method);
}
```
이보다 더 단순할 수 없다. 클래스와 메서드가 주어지면, 매칭 여부를 boolean으로 반환한다.

이 단순한 인터페이스가 생각보다 높은 유연성을 제공한다. 어노테이션 기반 매칭, AspectJ 표현식, 정규식, 심지어 런타임 조건까지 모두 이 인터페이스로 표현할 수 있다.

인터페이스 설계에서 중요한 것은 **"필요하고 충분한가?"**라고 생각한다. Pointcut 인터페이스는 딱 필요한 만큼만 제공한다. 더 추가할 것도, 뺄 것도 없다.

### AnnotationPointcut: 어노테이션 기반 매칭
```java
public class AnnotationPointcut implements Pointcut {
    private final Class<? extends Annotation> annotationType;

    public AnnotationPointcut(Class<? extends Annotation> annotationType) {
        this.annotationType = annotationType;
    }

    @Override
    public boolean matches(Class<?> targetClass, Method method) {
        // 1. 메서드 레벨 체크
        if (method.isAnnotationPresent(annotationType)) {
            return true;
        }

        // 2. 메서드 선언 클래스 체크
        if (method.getDeclaringClass().isAnnotationPresent(annotationType)) {
            return true;
        }

        // 3. 실제 타겟 클래스 체크
        if (targetClass.isAnnotationPresent(annotationType)) {
            return true;
        }

        return false;
    }
}
```
이 구현은 Spring의 어노테이션 매칭 전략을 따르도록 하였다. 세 단계로 체크하는데, 각 단계마다 의미가 있다.

**1단계: 메서드 레벨**
```java
@Transactional
public void saveUser(User user) { ... }
```
이렇게 메서드에 직접 어노테이션이 붙어있으면 당연히 매칭된다. 가장 명시적이고 우선순위가 높은 방식이다.

**2단계: 메서드 선언 클래스**
```java
@Transactional
public class UserService {
    public void saveUser(User user) { ... }
}
```
클래스 레벨에 어노테이션이 있으면, 해당 클래스의 모든 메서드에 적용된다. 이는 중복을 줄이는 편리한 방식이다.

여기서 `method.getDeclaringClass()`를 사용하는 것이 중요하다. 이는 메서드가 _**선언된**_ 클래스를 반환한다.

**3단계: 실제 타겟 클래스**
```java
public interface UserRepository { ... }

@Transactional
public class UserRepositoryImpl implements UserRepository { ... }
```
프록시는 인터페이스 메서드를 호출하지만, 실제 구현체에 어노테이션이 있을 수 있다. 이를 처리하기 위해 `targetClass`도 체크한다.

이 세 단계 체크는 Spring의 실전 경험에서 나온 것이다. 개발자들이 어노테이션을 사용하는 다양한 패턴을 모두 지원하기 위한 설계인 것이다.

### AspectJPointcutAdapter: 강력한 표현식
어노테이션만으로는 복잡한 조건을 표현하기 어렵다. "특정 패키지의 모든 public 메서드", "특정 파라미터를 받는 모든 메서드" 같은 조건을 의미한다. 이를 위해 AspectJ 표현식을 지원하기로 했다.

```java
public final class AspectJPointcutAdapter implements Pointcut {
    private static final PointcutParser PARSER =
        PointcutParser.getPointcutParserSupportingAllPrimitivesAndUsingContextClassloaderForResolution();

    private final PointcutExpression expression;

    public AspectJPointcutAdapter(String expr) {
        this.expression = PARSER.parsePointcutExpression(expr);
    }

    @Override
    public boolean matches(Class<?> targetClass, Method method) {
        // 1. 클래스 레벨 사전 필터링
        if (!expression.couldMatchJoinPointsInType(targetClass)) {
            return false;
        }

        // 2. 메서드 매칭
        var sm = expression.matchesMethodExecution(method);
        return sm.alwaysMatches() || sm.maybeMatches();
    }
}
```
이 클래스는 AspectJ 라이브러리를 얇게 감싸는 어댑터이다. AspectJ는 매우 강력한 포인트컷 언어를 제공하지만, API가 복잡하다. Sprout에서는 이를 단순한 Pointcut 인터페이스로 감추도록 했다.

**정적 PointcutParser**
```java
private static final PointcutParser PARSER = ...
```
파서를 `static final`로 선언한 것이 중요하다. 파서 생성은 비용이 큰 작업이기 때문이다. 여러 개의 `AspectJPointcutAdapter` 인스턴스가 같은 파서를 공유함으로써 메모리와 생성 시간을 절약하도록 해야한다.

**두 단계 매칭**
AspectJ의 매칭은 두 단계로 이루어진다.

- 클래스 레벨 필터링: `couldMatchJoinPointsInType()`
- 메서드 레벨 매칭: `matchesMethodExecution()`

왜 두 단계일까? 이 또한 성능 최적화를 위한 것이다.

예를 들어, 포인트컷이 `execution(* com.example.service.*.*(..))`라고 가정하자. 이는 `com.example.service` 패키지의 모든 메서드를 의미한다. 만약 `com.example.repository.UserRepository` 클래스를 체크한다면? 패키지가 다르므로 절대 매칭될 수 없다.

클래스 레벨 사전 필터링은 이런 명백한 불일치를 빠르게 걸러내게 해준다. 패키지, 클래스 이름, 어노테이션 등을 먼저 체크해서, 가능성이 없는 경우 메서드 체크를 건너뛴다.

메서드 체크는 더 비싸다.. 메서드 시그니처, 파라미터 타입, 반환 타입 등을 모두 분석해야 하기 때문이다. 사전 필터링으로 불필요한 메서드 체크를 줄임으로써 성능을 향상시키도록 하였다.

**alwaysMatches vs maybeMatches**
```java
return sm.alwaysMatches() || sm.maybeMatches();
```
AspectJ는 매칭을 세 가지로 분류한다.

- alwaysMatches(): 항상 매칭됨 (확정)
- maybeMatches(): 런타임에 따라 매칭될 수 있음 (조건부)
- neverMatches(): 절대 매칭 안 됨

"항상" 또는 "어쩌면"이면 true를 반환한다. "절대 아님"만 false이다.
왜 "어쩌면"을 true로 처리할까? 이는 동적 포인트컷 때문이다. 예를 들어  if() 표현식을 사용하면 런타임 조건에 따라 매칭 여부가 달라지게 된다. Sprout은 정적 매칭만 지원하므로, "어쩌면"을 낙관적으로 처리하도록 상정했다.

## CompositePointcut: OR 조합
하나의 어드바이스를 여러 조건에 적용하고 싶을 때가 있다. `@Transactional` 또는 `@Async`가 붙은 메서드에 모두 로깅을 추가하고 싶다면? 이를 위해 `CompositePointcut`이 있다.

```java
public class CompositePointcut implements Pointcut {
    private final List<Pointcut> pointcuts;

    public CompositePointcut(List<Pointcut> pointcuts) {
        this.pointcuts = List.copyOf(pointcuts);  // 방어적 복사
    }

    @Override
    public boolean matches(Class<?> targetClass, Method method) {
        for (Pointcut pc : pointcuts) {
            if (pc.matches(targetClass, method)) {
                return true;  // 하나라도 매치되면 즉시 true
            }
        }
        return false;
    }
}
```

이 구현은 정말 단순하다. 여러 Pointcut을 순회하면서, 하나라도 매칭되면 true를 반환하면 된다. 논리 OR 연산이다.

**방어적 복사**
생성자에서 List.copyOf(pointcuts)를 사용하는 것을 보자. 이는 **방어적 복사(Defensive Copy)**이다. 외부에서 전달받은 리스트를 그대로 저장하지 않고, 복사본을 만든다.

왜 이렇게 할까? 만약 원본 리스트를 저장한다면, 외부에서 그 리스트를 변경할 수 있기 때문이다.

```java
List<Pointcut> pcs = new ArrayList<>();
pcs.add(new AnnotationPointcut(Transactional.class));

CompositePointcut composite = new CompositePointcut(pcs);

// 나중에 외부에서 리스트를 변경
pcs.clear();  // composite 내부 리스트도 비워짐!
```
방어적 복사를 사용하면 이런 문제를 방지할 수 있다. `List.copyOf()`는 불변 리스트를 생성하므로, 복사 후에는 절대 변경되지 않는다.

**Short-circuit 평가**
```java
if (pc.matches(targetClass, method)) {
    return true;
}
```
첫 번째 Pointcut이 매칭되면 즉시 true를 반환하고, 나머지는 체크하지 않는다. 이는 Short-circuit evaluation이라고 하는 최적화 기법이다.

> 실제로 자바의 if 문도 **Short-circuit**을 사용한다.

예를 들어, 5개의 Pointcut이 있고 두 번째가 매칭된다면? 나머지 3개는 체크하지 않는다. 특히 AspectJ 표현식처럼 비싼 매칭이 있다면, 이 최적화는 큰 효과를 낼 수 있다.

**AND는 왜 없지?**
OR 조합만 있고 AND는 없다. 왜일까? 실제로는 AND가 필요한 경우가 거의 없기 때문이다.

어노테이션 A 그리고 어노테이션 B가 모두 있어야 한다면? 커스텀 어노테이션을 만들고, 그 어노테이션에 A와 B를 메타 어노테이션으로 붙이는 것이 더 깔끔하다.

```java
@Transactional
@Async
@Retention(RetentionPolicy.RUNTIME)
public @interface TransactionalAsync { }
```
AspectJ 표현식으로도 AND 조건을 표현할 수 있다. `@annotation(Transactional) && @annotation(Async)`
필요하다면 `CompositePointcut`을 확장해서 AND 조합을 추가할 수도 있지만, 단순성을 위해 OR만 제공하기로 결정했다.

## PointcutFactory: 생성 전략
Pointcut을 생성하는 로직은 PointcutFactory에 캡슐화되어 있다. 이는 복잡한 생성 로직을 한 곳에 모아 관리하기 위한 설계이다.

```java
@Component
public class DefaultPointcutFactory implements PointcutFactory, InfrastructureBean {

    @Override
    public Pointcut createPointcut(
            Class<? extends Annotation>[] annotationTypes, 
            String aspectjExpr) {
        List<Pointcut> pcs = new ArrayList<>();

        // 1. 어노테이션 조건들 추가
        if (annotationTypes != null && annotationTypes.length > 0) {
            for (Class<? extends Annotation> anno : annotationTypes) {
                pcs.add(new AnnotationPointcut(anno));
            }
        }

        // 2. AspectJ 표현식 추가
        if (aspectjExpr != null && !aspectjExpr.isBlank()) {
            pcs.add(new AspectJPointcutAdapter(aspectjExpr.trim()));
        }

        // 3. 조건이 없으면 예외
        if (pcs.isEmpty()) {
            throw new IllegalArgumentException(
                "At least one of annotation[] or pointcut() must be provided.");
        }

        // 4. 단일 조건이면 직접 반환, 다중 조건이면 CompositePointcut
        return pcs.size() == 1 ? pcs.get(0) : new CompositePointcut(pcs);
    }
}
```
이 팩토리는 `@Before`, `@After`, `@Around` 어노테이션의 속성을 받아서 적절한 Pointcut을 생성한다. 

```java
@Before(
    annotation = {Transactional.class, Async.class},
    pointcut = "execution(* com.example..*.*(..))"
)
public void logBefore(JoinPoint jp) { ... }
```

이런 어노테이션이 있다면, 팩토리는

1. `@Transactional`을 위한 AnnotationPointcut 생성
2. `@Async`를 위한 AnnotationPointcut 생성
3. `execution(...)` 표현식을 위한 AspectJPointcutAdapter 생성
4. 이 세 개를 CompositePointcut으로 조합

즉, "Transactional이거나, Async이거나, 특정 패키지의 메서드"에 모두 적용된다.

**입력 검증**
```java
if (pcs.isEmpty()) {
    throw new IllegalArgumentException(...);
}
```

최소한 하나의 조건은 반드시 필요하다. 조건이 없는 Pointcut은 의미가 없기 때문이다. 모든 메서드에 적용하고 싶다면? `AspectJ 표현식으로 execution(* *(..))`를 사용하면 된다.

**최적화: 단일 조건 체크**
```java
return pcs.size() == 1 ? pcs.get(0) : new CompositePointcut(pcs);
```
조건이 하나만 있다면 `CompositePointcut`으로 감싸지 않고 직접 반환한다. 불필요한 래핑 계층을 제거하는 최적화라고 볼 수 있다.

이는 미세한 최적화처럼 보이지만, 대부분의 어드바이스가 단일 조건을 사용한다는 점을 고려하면 의미가 없진 않다. `CompositePointcut`의 순회 오버헤드를 없앨 수 있기 때문이다.

## 전체 생명주기: 시작부터 실행까지

이제 모든 컴포넌트를 살펴봤으니, 전체 흐름을 정리해보자. Aspect 클래스가 정의되어 있고, 애플리케이션이 시작되면 어떤 일이 일어날까?

### 1단계: Aspect 클래스 스캔
```java
@Aspect
@Component
public class LoggingAspect {
    
    @Before(annotation = Transactional.class)
    public void logBefore(JoinPoint jp) {
        System.out.println("Before: " + jp.getSignature());
    }
    
    @Around(pointcut = "execution(* com.example.service.*.*(..))")
    public Object logAround(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = pjp.proceed();
        long elapsed = System.currentTimeMillis() - start;
        System.out.println("Elapsed: " + elapsed + "ms");
        return result;
    }
}
```
컴포넌트 스캐닝 단계에서 @Aspect를 통해 이 클래스가 빈으로 등록된다. (실은 `@Component`여야 하지만, 더 간단한 사용을 위해 `@Aspect` 만 붙여도 스캐닝에 포함된다.) 그리고 @Aspect가 있으므로, AOP 시스템이 이 빈을 특별하게 처리해야 함을 알게 된다.

### 2단계: 메서드 분석
Aspect 빈의 모든 메서드를 스캔한다. 각 메서드에서 `@Before`, `@After`, `@Around` 어노테이션을 찾는다.

위 예시에서는 두 개의 어드바이스 메서드가 발견된다.

- `logBefore()`: `@Before` 어노테이션
- `logAround()`: `@Around` 어노테이션

### 3단계: AdviceType 결정
```java
AdviceType.from(logBeforeMethod)  // Optional[BEFORE]
AdviceType.from(logAroundMethod)  // Optional[AROUND]
```
각 메서드의 어노테이션을 보고 적절한 AdviceType을 결정한다.

### 4단계: AdviceBuilder 선택 및 Advisor 생성
```java
// logBefore 메서드 처리
BeforeAdviceBuilder builder = factory.builders.get(AdviceType.BEFORE);
Advisor advisor1 = builder.build(
    LoggingAspect.class,
    logBeforeMethod,
    () -> loggingAspectBean,
    pointcutFactory
);

// logAround 메서드 처리
AroundAdviceBuilder builder2 = factory.builders.get(AdviceType.AROUND);
Advisor advisor2 = builder2.build(
    LoggingAspect.class,
    logAroundMethod,
    () -> loggingAspectBean,
    pointcutFactory
);
```
각 빌더는,

- 파라미터 검증: 메서드 시그니처가 올바른지 체크
- Pointcut 생성: 어노테이션 속성을 파싱하여 Pointcut 생성
- Advice 생성: 적절한 인터셉터 생성
- Advisor 조립: Pointcut + Advice + Order를 담은 Advisor 반환

### 5단계: AdvisorRegistry에 등록
```java
registry.registerAdvisor(advisor1);
registry.registerAdvisor(advisor2);
```
생성된 모든 Advisor가 중앙 레지스트리에 등록된다. 등록 시점에 Order 기준으로 정렬되므로, 나중에 조회할 때는 이미 정렬된 상태가 된다.

### 6단계: 프록시 생성 대기
모든 준비가 끝났다. Advisor들은 레지스트리에서 대기 중이고, 실제 빈들이 생성될 때를 기다린다.

### 7단계: 타겟 빈 생성 시점
```java
@Service
@Transactional
public class UserService {
    public void saveUser(User user) { ... }
    public User findById(Long id) { ... }
}
```
`UserService` 빈이 생성될 때, `BeanPostProcessor`가 이 클래스를 분석한다.

### 8단계: 적용 가능한 Advisor 검색
```java
List<Advisor> applicableAdvisors = 
    registry.getApplicableAdvisors(UserService.class, saveUserMethod);
```
UserService의 각 메서드에 대해 적용 가능한 Advisor를 검색한다.

- `saveUser()`: 클래스에 @Transactional이 있으므로 advisor1 매칭
- `findById()`: 마찬가지로 advisor1 매칭

AspectJ 표현식 `execution(* com.example.service.*.*(..))`도 체크된다. UserService가 com.example.service 패키지에 있다면 advisor2도 매칭된다.

첫 조회는 캐시 미스다. 모든 Advisor를 순회하며 Pointcut을 체크한다. 하지만 결과는 캐시되므로, 같은 메서드에 대한 다음 조회는 `O(1)`이된다.

### 9단계: 인터셉터 체인 구성
매칭된 Advisor들의 Advice를 인터셉터 체인으로 구성한다.

```
saveUser() 호출 시 인터셉터 체인
1. SimpleAroundInterceptor (logAround)
2. SimpleBeforeInterceptor (logBefore)
3. 실제 saveUser() 메서드
```
Order가 낮을수록 먼저 실행되므로, 위와 같은 순서가 된다.

### 10단계: 프록시 생성 및 반환
CGLIB을 사용하여 프록시를 생성한다. 이에 대한 자세한 과정은 이전 포스팅을 참조하면 된다.

### 11단계: 런타임 실행
```java
userService.saveUser(user);
```
이 메서드 호출이 어떻게 진행될까?

1. 프록시 진입: 프록시의 InvocationHandler가 호출을 가로챔
2. MethodInvocation 생성: 타겟, 메서드, 파라미터, 인터셉터 체인을 담은 객체 생성
3. 첫 번째 인터셉터 실행: `SimpleAroundInterceptor.invoke()`
	- ProceedingJoinPoint 생성
	- `logAround()` 메서드 호출
	- `logAround()` 내부에서 `pjp.proceed()` 호출


4. 두 번째 인터셉터 실행: `SimpleBeforeInterceptor.invoke()`

	- JoinPoint 생성
	- `logBefore()` 메서드 호출
	- 자동으로 `invocation.proceed()` 호출


5. 실제 메서드 실행: 원본 `UserService.saveUser()` 호출
6. 반환값 전파: 체인을 거슬러 올라가며 반환값 전파
7. 최종 반환: 호출자에게 결과 반환

이 전체 과정에서 비즈니스 로직(saveUser)은 AOP 로직을 전혀 알지 못한다. 완벽한 분리가 이루어진 것이다.

이러한 과정들을 통해 스프링 AOP를 모방한 AOP 모듈에 대한 설명이 끝났다.

---

# 프로젝트 정보
> [깃허브 레포지토리 바로가기 ](https://github.com/yyubin/sprout)

> [공식 페이지 바로가기](https://yyubin.github.io/sprout/)

---

누군가 Spring AOP 재현의 이유를 묻는다면, 바퀴 두 번 만드는 것 그 자체가 재현의 이유이다. 일차적으론 Spring 내부를 이해해보기 위함 그 이상 그 이하도 아님. 코드를 그대로 가져다 붙이기도 사실 불가능하고 레퍼런스 찾아보면서 혹은 직접 코드를 보면서 최적화 기법같은 것도 많이 베껴온게 사실이긴함. 그렇기 때문에 장난으로라도 토이 프젝에서라도 해당 프로젝트를 프레임워크로 삼을 생각도 없음..

기존엔 코드 한줄씩 짚어가며 설명하는 건 사실 읽는 입장에서 너무 과한 정보일 것이라 생각해 지양했지만 지금 시점에서 해당 프로젝트는 내가 공부하는 프레임워크나 라이브러리 등을 얼기설기 붙인 혼종 프로젝트가 되었기 때문에 ㅋㅋ 나만의 장난감이자 운동장이 된 것 같다. 실제로 서버 부분은 톰캣보단 netty 느낌이 강한 것 같고, RFC 스펙을 준수한 웹소켓 라이브러리..도 붙였는데 이건 스프링의 범위도 아니긴 함.

아무튼 설명하는 투로 작성되었지만 스스로를 위한 문서임은 부정할 수 없을 것 같다. 자잘한 설계들은 사실 시간이 더 지나면 잊을 것 같아 급하게 문서화 하는 중이긴 함.

`Docusaurus`로 공식 페이지도 만들었는데 이에 대한 활용법을 차라리 별도의 포스팅으로 올려도 나쁘진 않을 것 같다.








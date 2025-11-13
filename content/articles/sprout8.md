이전에도 이에 대한 주제로 구조 및 구현에 대한 설명을 작성한 바 있지만, 추가로 구현된 부분 및 리팩토링한 지점들이 새로 생겨 새로이 작성하게 되었다.

# 들어가며
IoC(Inversion of Control) 컨테이너는 현대 애플리케이션 프레임워크의 핵심이기도 하다. 스프링 프레임워크의 성공 또한 강력한 IoC 컨테이너에 기반하고 있다. 하지만 스프링의 복잡성은 학습 곡선을 가파르게 하고 내부 동작을 이해하기 어렵게 하기도 한다.

해당 프로젝트는 스프링처럼 강력하지만 더 단순하고 이해하기 쉬운 IoC 컨테이너를 목표로 설계하였고, 이는 개인의 학습에 목적이 있다. 구현하면서 내가 작성한 IoC 컨테이너가 어떻게 설계되었는지, 왜 그렇게 결정하고 어떻게 확장 가능한 구조로 만들었는지 다루고자 한다.

## 개요
현재 구현 사항은 다음과 같다.
- **컴포넌트 스캔**: Reflections 라이브러리를 이용한 어노테이션 기반 클래스 자동 감지
- **생성자 주입**: 타입 안전한 의존성 해결 (필드 주입 미지원)
- **생명주기 관리**: 단계별(Phase) 빈 생성, 초기화, 소멸
- **순환 의존성 감지**: `BeanGraph`를 통한 위상 정렬과 순환 참조 감지
- **순서 지원**: `@Order`를 통한 빈 초기화 및 컬렉션 순서 제어
- **CGLIB 프록시**: `@Configuration` 클래스의 싱글톤 보장
- **전략 패턴 기반 확장성**: 빈 생성 전략과 의존성 해결 전략의 플러그인 구조

## 컨테이너 아키텍처

주요 컴포넌트들은 다음과 같다.

#### 컨텍스트 및 팩토리
- `SproutApplicationContext`: 메인 애플리케이션 컨텍스트
- `DefaultListableBeanFactory`: 핵심 빈 팩토리 구현
- `ClassPathScanner`: 클래스패스 스캔 및 빈 정의 생성
- `BeanGraph`: 의존성 그래프와 위상 정렬

#### 빈 생성 전략 (Strategy Pattern)
- `BeanInstantiationStrategy`: 빈 인스턴스화 전략 인터페이스
  - `ConstructorBasedInstantiationStrategy`: 생성자 기반 빈 생성
  - `FactoryMethodBasedInstantiationStrategy`: 팩토리 메서드 기반 빈 생성

#### 의존성 해결 전략 (Chain of Responsibility Pattern)
- `DependencyResolver`: 의존성 해결 인터페이스
  - `CompositeDependencyResolver`: 여러 resolver를 조합하는 복합 resolver
- `DependencyTypeResolver`: 타입별 의존성 해결 전략
  - `SingleBeanDependencyResolver`: 단일 빈 의존성 해결
  - `ListBeanDependencyResolver`: List 타입 의존성 해결

#### 생명주기 관리 (Phase Pattern)
- `BeanLifecycleManager`: 생명주기 단계 실행 관리자
- `BeanLifecyclePhase`: 생명주기 단계 인터페이스
  - `InfrastructureBeanPhase`: Infrastructure 빈 생성 (order=100)
  - `BeanPostProcessorRegistrationPhase`: BeanPostProcessor 등록 (order=200)
  - `ApplicationBeanPhase`: 애플리케이션 빈 생성 (order=300)
  - `ContextInitializerPhase`: ContextInitializer 실행 (order=400)

#### 타입 매칭 서비스
- `BeanTypeMatchingService`: 타입 기반 빈 검색 및 매칭 로직 중앙 관리

---

컨테이너는 서버 구동이전에 초기화가 진행되고, 크게는
**컴포넌트 스캔 -> 의존성 주입 -> 빈 정의 및 생성**의 단계로 진행된다.

추가적으로 인스턴스화 전략이 생성자 기반 or 팩토리 메서드 기반으로 분기되고, 의존성 주입에 대한 전략 패턴, 빈 전후 처리기, 컬렉션 주입, 생명주기 관리, 순환의존성 감지 등이 추가되지만.. 일단 크게는 저 3단계가 주요 단계라고 볼 수 있다. 

## 컨테이너 초기화 과정
최초에 부트스트랩이 진행되면 컨테이너 초기화 과정을 수행한다.
```java
public class SproutApplication {
    public static void run(Class<?> primarySource) throws Exception {
        // 1. 패키지 스캔 설정
        List<String> packages = getPackagesToScan(primarySource);
        
        // 2. 애플리케이션 컨텍스트 생성
        ApplicationContext applicationContext = 
            new SproutApplicationContext(packages.toArray(new String[0]));
        
        // 3. 컨텍스트 초기화 (refresh)
        applicationContext.refresh();
        
        // 4. 서버 시작
        HttpServer server = applicationContext.getBean(HttpServer.class);
        server.start(port);
    }
}
```
애플리케이션 컨텍스트를 생성한 후, 초기화 진행 이후, 서버가 시작되는 구조이다.

## 컴포넌트 스캔
#### 지원되는 어노테이션
```java
@Component         // 일반 컴포넌트
@Service          // 비즈니스 로직 계층
@Repository       // 데이터 접근 계층
@Controller       // 웹 계층
@Configuration    // 구성 클래스
@Aspect           // AOP 애스펙트
@ControllerAdvice // 글로벌 예외 처리
@WebSocketHandler // WebSocket 핸들러
```
해당 어노테이션이 있다면 **빈 생성 스캔 대상**이 된다.

### 스캔 과정
#### 1단계: 어노테이션 기반 클래스 탐색
```java
Set<Class<?>> componentCandidates = new HashSet<>();
for (Class<? extends Annotation> anno : componentAnnotations) {
    componentCandidates.addAll(r.getTypesAnnotatedWith(anno));
}
```
- `componentAnnotations` 파라미터로 전달된 어노테이션(상단 기재)을 순회
- Reflections 라이브러리를 사용하여 각 어노테이션이 붙은 모든 클래스를 찾음
- 찾은 클래스들을 `componentCandidates` Set에 수집!

이 과정에서 `@Service`가 붙은 `UserService` 같은 클래스들이 수집된다.

#### 2단계: 구체 클래스 필터링
```java
Set<Class<?>> concreteComponentTypes = componentCandidates.stream()
    .filter(clazz -> !clazz.isInterface() && 
                    !clazz.isAnnotation() && 
                    !Modifier.isAbstract(clazz.getModifiers()))
    .collect(Collectors.toSet());
```
- 인터페이스 제외: `!clazz.isInterface()` - 인터페이스는 인스턴스화 불가
- 어노테이션 제외: `!clazz.isAnnotation()` - 어노테이션 타입 제외
- 추상 클래스 제외: `!Modifier.isAbstract()` - 추상 클래스는 인스턴스화 불가

빈으로 등록하려면 실제 객체를 생성할 수 있는 구체 클래스여야 하기 때문이다. 

#### 3단계: `@Bean` 메서드 기반 빈 탐색
```java
Set<Class<?>> configClasses = r.getTypesAnnotatedWith(Configuration.class);
for (Class<?> configClass : configClasses) {
    for (Method method : configClass.getDeclaredMethods()) {
        if (method.isAnnotationPresent(Bean.class)) {
            beanMethodReturnTypes.add(method.getReturnType());
        }
    }
}
```
- `@Configuration` 어노테이션이 붙은 설정 클래스들을 모두 찾음
- 각 설정 클래스의 모든 메서드를 순회
- `@Bean` 어노테이션이 붙은 메서드의 반환 타입을 수집

**예시**
```java
@Configuration
public class AppConfig {
    
    @Bean
    public DataSource dataSource() {  // DataSource 타입 수집
        return new HikariDataSource();
    }
    
    @Bean
    public RestTemplate restTemplate() {  // RestTemplate 타입 수집
        return new RestTemplate();
    }
}
```

최종적으로 이 정보들을 `BeanDefinition` 컬렉션으로 변환하여 컨테이너에 등록할 빈 목록을 생성하는 것이다.

### 컴포넌트 스캔 활성화 방법?
```java
@ComponentScan("com.myapp")  // 특정 패키지 스캔
@ComponentScan({"com.myapp.web", "com.myapp.service"})  // 여러 패키지
public class Application {
    public static void main(String[] args) throws Exception {
        SproutApplication.run(Application.class);
    }
}
```
이런식으로 `Main.java`에 기재하면 된다. 패키지 명을 작성해야함. 스프링의 `@ComponentScan`과는 다르게 동작하긴 한다. 참고로 `sprout` 자체 모듈들도 스캔대상이 되어야 작동하기 때문에 반드시 기재되어 있어야 함.

> `@ComponentScan(basePackages = {"sprout", "app"})`

## 의존성 주입
현재 프로젝트에서는 **생성자 주입만** 지원한다(의존성 주입에서!!). 원래는 가장 많은 매개변수를 가진, 해결 가능한 생성자를 선택하여 처리하는 구조였다.

하지만 새로 리팩토링하여 의존성 해결에 **Chain of Responsibility** 패턴을 적용하여 확장성을 개선하였다.

### DependencyResolver 구조
```java
// 의존성 해결 인터페이스
public interface DependencyResolver {
    Object[] resolve(Class<?>[] dependencyTypes, Parameter[] params, BeanDefinition targetDef);
}

// 타입별 의존성 해결 전략
public interface DependencyTypeResolver {
    boolean supports(Class<?> type);
    Object resolve(Class<?> type, Parameter param, BeanDefinition targetDef);
}
```
#### 기본 제공 Resolver
1. **ListBeanDependencyResolver**: List 타입 의존성 처리
   - List 타입 파라미터를 감지하면 빈 리스트 생성
   - 제네릭 타입 정보를 추출하여 pending 목록에 등록
   - 나중에 `postProcessListInjections()`에서 실제 빈들을 주입

2. **SingleBeanDependencyResolver**: 단일 빈 의존성 처리
   - 일반적인 타입(List가 아닌)에 대해 BeanFactory에서 빈 조회
   - 타입 매칭 및 @Primary 선택 로직 활용

#### CompositeDependencyResolver

여러 `DependencyTypeResolver`를 체인으로 연결하여 순차적으로 시도하는 전형적인 책임 체인구조이다.

```java
public class CompositeDependencyResolver implements DependencyResolver {
    private final List<DependencyTypeResolver> typeResolvers;

    @Override
    public Object[] resolve(Class<?>[] dependencyTypes, Parameter[] params, BeanDefinition targetDef) {
        Object[] deps = new Object[dependencyTypes.length];

        for (int i = 0; i < dependencyTypes.length; i++) {
            Class<?> paramType = dependencyTypes[i];
            Parameter param = params[i];

            // 적절한 resolver를 찾아서 의존성 해결
            for (DependencyTypeResolver resolver : typeResolvers) {
                if (resolver.supports(paramType)) {
                    deps[i] = resolver.resolve(paramType, param, targetDef);
                    break;
                }
            }
        }
        return deps;
    }
}
```

이러한 구조에서는 확장이 매우 쉬워진다.

새로운 의존성 타입(예: Optional, Provider)을 지원하려면 `DependencyTypeResolver`를 구현하고 `DefaultListableBeanFactory` 생성자에 추가만 하면 되기 때문이다. 

```java
public class OptionalBeanDependencyResolver implements DependencyTypeResolver {
    @Override
    public boolean supports(Class<?> type) {
        return Optional.class.isAssignableFrom(type);
    }

    @Override
    public Object resolve(Class<?> type, Parameter param, BeanDefinition targetDef) {
        // Optional 처리 로직
        Class<?> genericType = extractGenericType(param);
        try {
            Object bean = beanFactory.getBean(genericType);
            return Optional.of(bean);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
```

OCP에 잘 부합하는 설계라고 볼 수 있다.

그리하여 사용시에는 다음과 같이 사용이 가능해진다.

```java
@Service
public class UserService {
    private final UserRepository repository;
    private final EmailService emailService;

    // 생성자 주입 - @Autowired 불필요
    public UserService(UserRepository repository, EmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }
}

@Repository
public class UserRepository {
    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
}
```
### 컬렉션 주입
특정 타입의 모든 빈을 `List`로 주입받아 사용하고 싶을 수 있다. 실제로 mvc에서 필터 리스트들이나, 인터셉터 리스트들, 혹은 argumentResolver들을 미리 생성해서 보유하고 있어야 하는 상황이 프레임워크 측에서도 잦다.

다음과 같은 예를 들어보자.
```java
public interface EventHandler {
    void handle(Event event);
}

@Component
@Order(1)
public class EmailEventHandler implements EventHandler {
    public void handle(Event event) { /* 이메일 처리 */ }
}

@Component
@Order(2)
public class LogEventHandler implements EventHandler {
    public void handle(Event event) { /* 로그 처리 */ }
}

@Service
public class EventProcessor {
    private final List<EventHandler> handlers;

    // 모든 EventHandler 빈이 @Order 순서대로 주입됨
    public EventProcessor(List<EventHandler> handlers) {
        this.handlers = handlers;
    }
    
    public void processEvent(Event event) {
        handlers.forEach(handler -> handler.handle(event));
    }
}
```
이러한 경우에 대응하기 위해 컬렉션 주입을 지원하도록 구성했다.

```java
// DefaultListableBeanFactory의 컬렉션 주입 후처리
protected void postProcessListInjections() {
    for (PendingListInjection pending : pendingListInjections) {
        Set<Object> uniqueBeansForList = new HashSet<>();
        for (Object bean : singletons.values()) {
            if (pending.getGenericType().isAssignableFrom(bean.getClass())) {
                uniqueBeansForList.add(bean);
            }
        }

        // @Order 어노테이션에 따라 정렬
        List<Object> sortedBeansForList = uniqueBeansForList.stream()
            .sorted(Comparator.comparingInt(bean -> {
                Class<?> clazz = bean.getClass();
                Order order = clazz.getAnnotation(Order.class);
                return (order != null) ? order.value() : Integer.MAX_VALUE;
            }))
            .toList();

        pending.getListToPopulate().clear();
        pending.getListToPopulate().addAll(sortedBeansForList);
    }
}
```
#### 1단계: 대기 중인 List 주입 처리
**`PendingListInjection`의 역할 **
- 생성자나 필드에서 `List<EventHandler>` 같은 컬렉션 타입을 발견했지만
- 아직 어떤 빈들을 주입할지 결정하지 못한 보류된 주입 정보를 담고 있음

예시 상황
```java
public EventProcessor(List<EventHandler> handlers) {
    // 이 List를 채워야 하는데, 아직 모든 EventHandler 빈이 준비 안됨
}
```
리스트 주입 후처리기가 동작할 즈음엔 모든 싱글톤 빈 생성이 완료되었기 때문에 List를 채울 수 있다.

#### 2단계: 타입 호환 빈 수집
```java
Set<Object> uniqueBeansForList = new HashSet<>();
for (Object bean : singletons.values()) {
    if (pending.getGenericType().isAssignableFrom(bean.getClass())) {
        uniqueBeansForList.add(bean);
    }
}
```
- `singletons.values()`: 컨테이너에 등록된 모든 싱글톤 빈을 순회
- `pending.getGenericType()`: List의 제네릭 타입 추출 (예: EventHandler)
- `isAssignableFrom()`: 해당 타입에 할당 가능한지 검사

이때 Set은 같은 빈이 여러 번 추가되는 것을 방지하기 위함이다.

#### 3단계: `@Order` 기반 정렬
```java
List<Object> sortedBeansForList = uniqueBeansForList.stream()
    .sorted(Comparator.comparingInt(bean -> {
        Class<?> clazz = bean.getClass();
        Order order = clazz.getAnnotation(Order.class);
        return (order != null) ? order.value() : Integer.MAX_VALUE;
    }))
    .toList();
```
- 각 빈의 클래스에서 `@Order` 어노테이션 탐색
- `@Order` 있으면 해당 value 사용
- `@Order`가 없으면 `Integer.MAX_VALUE` (맨 뒤로)
- 오름차순 정렬 (작은 숫자가 앞으로)

정렬 예시는 다음과 같다.
```java
@Component
@Order(1)
public class EmailEventHandler { }  // 우선순위: 1

@Component
@Order(2)
public class LogEventHandler { }    // 우선순위: 2

@Component
public class MetricEventHandler { } // 우선순위: Integer.MAX_VALUE
```

**정렬 결과:**
```
[EmailEventHandler, LogEventHandler, MetricEventHandler]
```

#### 4단계: List 채우기
```java
pending.getListToPopulate().clear();
pending.getListToPopulate().addAll(sortedBeansForList);
```
- `getListToPopulate()`: 실제 주입 대상 List 객체 반환
- `clear()`: 기존 내용 제거 (혹시 있을 임시 데이터 정리)
- `addAll()`: 정렬된 빈들을 List에 추가

여기까지의 생성과정을 시각화 하자면, 다음과 같다

### 생성 처리 과정 시각화
1. 빈 생성 단계
-    EmailEventHandler 생성 (@Order(1))
-    LogEventHandler 생성 (@Order(2))
-    MetricEventHandler 생성 (순서 없음)
-    EventProcessor 생성 시도
   → `List<EventHandler>` 주입 필요
   → `PendingListInjection`에 등록

2. `postProcessListInjections()` 호출
  ```
   ┌─ 모든 싱글톤 빈 스캔
   │  └─ EventHandler 타입 찾기
   │     ✅ EmailEventHandler
   │     ✅ LogEventHandler  
   │     ✅ MetricEventHandler
   │
   ├─ @Order로 정렬
   │  1. EmailEventHandler (order=1)
   │  2. LogEventHandler (order=2)
   │  3. MetricEventHandler (order=MAX)
   │
   └─ EventProcessor의 List에 주입
      handlers = [Email, Log, Metric]
  ```
  
  그럼 `EventProcessor`는 리스트 주입이 다 되어야 생성되나? 그렇진 않다. 사실 `PendingListInjection`에 등록만 해두고 빈 리스트를 가진채로  우선 생성한다. 그리고 List 객체에 정렬하여 추후에 넣어주는 사후 구조로 구성되어 있다. 실제 스프링도 이와 같이 동작한다.
  
## 빈 정의와 생성
  
앞서 의존성 주입시에는 생성자 주입만 지원한다고 하였는데, 빈 생성에는 다음과 같은 두가지 방식을 지원한다.
 
1. **생성자 기반 빈** (`ConstructorBeanDefinition`)
2. **팩토리 메서드 빈** (`MethodBeanDefinition`)

이 구조에서도 전략 패턴을 사용하여 다양한 생성 방식을 지원하도록 하였다.

**BeanInstantiationStrategy 인터페이스**
```java
public interface BeanInstantiationStrategy {
    Object instantiate(BeanDefinition def, DependencyResolver dependencyResolver, BeanFactory beanFactory) throws Exception;
    boolean supports(BeanCreationMethod method);
}
```
왜 이렇게 설계했냐고 묻는다면
- 빈 생성 방식이 여러가지이므로 각각을 독립적인 전략으로 분리하기 위함
- 새로운 생성 방식 추가 시 기존 코드 수정없이 확장 가능(OCP)
- `supports()` 메서드로 각 전략이 처리 가능한지 판단하기 위함

사실 앞서 봤던 구조와 다르지 않다

**메서드 설명**
`instantiate()`: 실제 빈 인스턴스 생성
`supports()`: 이 전략이 해당 생성 방식을 지원하는지 확인

### 생성자 기반 전략
```java
public class ConstructorBasedInstantiationStrategy implements BeanInstantiationStrategy {
    @Override
    public Object instantiate(BeanDefinition def, DependencyResolver dependencyResolver, 
                            BeanFactory beanFactory) throws Exception {
        Constructor<?> constructor = def.getConstructor();

        // 의존성 해결
        Object[] deps = dependencyResolver.resolve(
            def.getConstructorArgumentTypes(),
            constructor.getParameters(),
            def
        );

        // Configuration 클래스의 경우 CGLIB 프록시 생성
        if (def.isConfigurationClassProxyNeeded()) {
            Enhancer enhancer = new Enhancer();
            enhancer.setSuperclass(def.getType());
            enhancer.setCallback(new ConfigurationMethodInterceptor(beanFactory));
            return enhancer.create(def.getConstructorArgumentTypes(), deps);
        } else {
            constructor.setAccessible(true);
            return constructor.newInstance(deps);
        }
    }
}
```
#### 1단계: 생성자 정보 추출
```java
Constructor<?> constructor = def.getConstructor();
```
- BeanDefinition에서 사용할 생성자 획득
- Spring처럼 자동으로 선택된 생성자 정보가 담겨있다

스캔 수집단계에서 모아뒀던 생성자다. 생성자 선택은 **가장 많은 매개변수를 가진 생성자 중, 해결 가능한** 생성자를 선택한다.

#### 2단계: 의존성 해결
```java
Object[] deps = dependencyResolver.resolve(
    def.getConstructorArgumentTypes(),  // [EmailService.class, SmsService.class]
    constructor.getParameters(),         // Parameter 메타데이터
    def                                  // 현재 빈 정의
);
```
`NotificationService(EmailService, SmsService)` 을 생성한다고 해보자. `getConstructorArgumentTypes()` → `[EmailService.class, SmsService.class]`를 요구한다. resolver가 각 타입에 해당하는 빈을 `BeanFactory`에서 찾아 인스턴스를 반환받는다.

#### 3단계: 프록시 vs 일반 생성 분기
**일반 클래스 생성**
```java
constructor.setAccessible(true);
return constructor.newInstance(deps);
```
- `private` 생성자도 접근 가능하게 설정한다
- 리플렉션으로 인스턴스를 생성한다
- 의존성을 생성자 파라미터로 전달한다

**`@Configuration` 클래스 특별처리**
```java
if (def.isConfigurationClassProxyNeeded()) {
    Enhancer enhancer = new Enhancer();
    enhancer.setSuperclass(def.getType());
    enhancer.setCallback(new ConfigurationMethodInterceptor(beanFactory));
    return enhancer.create(def.getConstructorArgumentTypes(), deps);
}
```
실제로, 스프링에서도 `@Configuration` 클래스는 옵션을 명시하지 않는다면 기본적으로 프록시를 사용한다.

왜 프록시가 필요할까?
```java
@Configuration
public class AppConfig {
    @Bean
    public ServiceA serviceA() {
        return new ServiceA(serviceB());  // ⚠️ 여기서 serviceB() 호출
    }

    @Bean
    public ServiceB serviceB() {
        return new ServiceB();
    }
}
```
이러한 구조에서 프록시 없이 동작할 경우, 

serviceA() 실행
  → serviceB() 직접 호출하게 되어
  → 새로운 ServiceB 인스턴스를 생성하게 된다.
  
프록시를 적용하면,

serviceA() 실행
  → serviceB() 호출 (프록시가 가로챔)
  → ConfigurationMethodInterceptor 동작
  → BeanFactory에서 기존 serviceB 빈 반환

이 이루어지므로 싱글톤을 지키기 위해 필요한 것이다. 

추가로 CGLIB 프록시로 감싸진 내부 원리는 다음과 같다.
```java
// ConfigurationMethodInterceptor 개념
public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) {
    // @Bean 메서드인지 확인
    if (method.isAnnotationPresent(Bean.class)) {
        String beanName = resolveBeanName(method);
        
        // 이미 생성된 빈이 있으면 반환 (싱글톤)
        if (beanFactory.containsBean(beanName)) {
            return beanFactory.getBean(beanName);
        }
        
        // 없으면 원본 메서드 실행하여 생성
        Object bean = proxy.invokeSuper(obj, args);
        beanFactory.registerSingleton(beanName, bean);
        return bean;
    }
    
    // @Bean이 아니면 그냥 실행
    return proxy.invokeSuper(obj, args);
}
```
정리하자면,

1. `serviceA()` 빈 생성 시작
2. `serviceA()` 메서드 본문 실행
3. `serviceB()` 호출 발생
4. 프록시가 가로챔 (intercept)
5. beanFactory.containBean("ServiceB") 확인
	- 이미 있다면? 기존 빈 반환
    - 없다면? 새로 생성하는 게 스프링 전략이지만, 난 기본적으로 위상정렬로 미리 팩토리 메서드의 경우 파라미터에 대한 의존성 또한 미리 계산해둠. 그래서 없는 상황이 되기전에 순환 의존성에 대한 예외가 터질 것..
6. `ServiceA` 생성 완료! (동일한 `ServiceB` 사용)


### 팩토리 메서드 기반 전략
```java
public class FactoryMethodBasedInstantiationStrategy implements BeanInstantiationStrategy {
    @Override
    public Object instantiate(BeanDefinition def, DependencyResolver dependencyResolver, 
                            BeanFactory beanFactory) throws Exception {
        Object factoryBean = beanFactory.getBean(def.getFactoryBeanName());
        Method factoryMethod = def.getFactoryMethod();

        Object[] deps = dependencyResolver.resolve(
            def.getFactoryMethodArgumentTypes(),
            factoryMethod.getParameters(),
            def
        );

        factoryMethod.setAccessible(true);
        return factoryMethod.invoke(factoryBean, deps);
    }
}
```
동작 과정의 예시를 따라가보자.
```java
@Configuration
public class DataSourceConfig {
    @Bean
    public DataSource dataSource() {
        return new HikariDataSource();
    }
    
    @Bean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
```
같은 구조에서, 컨테이너가 `jdbcTemplate` 빈을 생성하려고 할 때, 다음과 같은 과정을 거치게 된다.

#### 1단계: 팩토리 빈 획득
```java
Object factoryBean = beanFactory.getBean("dataSourceConfig");
```
먼저 `@Bean` 메서드가 정의된 설정 클래스 자체의 인스턴스를 가져와야 한다.
`jdbcTemplate()` 메서드는 `DataSourceConfig` 클래스에 속해 있기 때문에 이 메서드를 호출하려면 `DataSourceConfig` 객체가 필요한 것.

`BeanFactory`에 `"dataSourceConfig"`라는 이름으로 요청하면, 컨테이너는 이미 생성해둔 `DataSourceConfig` 인스턴스를 반환한다. 이 인스턴스는 앞서 설명한 CGLIB 프록시로 감싸진 객체일 가능성이 높다.

#### 2단계: 팩토리 메서드 정보 추출
```java
Method factoryMethod = def.getFactoryMethod();
```
`BeanDefinition` 객체에는 빈을 생성할 때 사용할 메서드의 정보가 저장되어 있다. 여기에서는 `jdbcTemplate()` 메서드에 대한 리플렉션 정보(`Method` 객체)를 가져온다.

이 `Method` 객체에는 다음과 같은 정보들이 있다.
- 메서드 이름: `"jdbcTemplate"`
- 반환 타입: `JdbcTemplate.class`
- 파라미터 타입: `[DataSource.class]`
- 선언된 클래스: `DataSourceConfig.class`

즉, "어떤 메서드를 호출해야 하는지"에 대한 모든 정보를 갖고 있는 것이다.

#### 3단계: 메서드 파라미터의 의존성 해결
```java
Object[] deps = dependencyResolver.resolve(
    def.getFactoryMethodArgumentTypes(),  // [DataSource.class]
    factoryMethod.getParameters(),
    def
);
```
이제 `jdbcTemplate()` 메서드를 실제로 호출하기 위해 필요한 파라미터를 준비해야 한다. `jdbcTemplate(DataSource dataSource)` 메서드는 `DataSource` 타입의 파라미터를 받으므로, 컨테이너는 `DataSource` 타입의 빈을 찾아야 한다. 

이때의 의존성 해결 과정을 더 살펴보자면,
1. `getFactoryMethodArgumentTypes()`가 `[DataSource.class]`를 반환
2. `dependencyResolver`가 이 타입 정보를 받아서 처리 시작
3. `BeanFactory`에서 `DataSource` 타입의 빈을 검색
4. 앞서 생성된 `dataSource` 빈(`HikariDataSource` 인스턴스)을 찾음
5. 이를 배열에 담아 `deps = [dataSourceBean]` 형태로 반환

#### 4단계: 리플렉션을 통한 메서드 실행
```java
factoryMethod.setAccessible(true);
return factoryMethod.invoke(factoryBean, deps);
```
이제 모든 준비가 끝났다. 
호출할 객체는 `DataSourceConfig` 인스턴스, 호출할 메서드 (`factoryMethod`)는 `jdbcTemplate()`, 전달할 파라미터도 준비 되었음.

`setAccessible(true)`를 호출하여 메서드가 `private`이어도 접근할 수 있도록 설정한 후, `invoke()` 메서드로 실제 호출을 실행한다.

## 빈 팩토리의 전략 활용
```java
public class DefaultListableBeanFactory implements BeanFactory, BeanDefinitionRegistry {
    private final List<BeanInstantiationStrategy> instantiationStrategies;
    private final DependencyResolver dependencyResolver;

    public DefaultListableBeanFactory() {
        // 전략 목록 초기화
        this.instantiationStrategies = new ArrayList<>();
        this.instantiationStrategies.add(new ConstructorBasedInstantiationStrategy());
        this.instantiationStrategies.add(new FactoryMethodBasedInstantiationStrategy());

        // 의존성 resolver 초기화
        List<DependencyTypeResolver> typeResolvers = new ArrayList<>();
        typeResolvers.add(new ListBeanDependencyResolver(pendingListInjections));
        typeResolvers.add(new SingleBeanDependencyResolver(this));
        this.dependencyResolver = new CompositeDependencyResolver(typeResolvers);
    }
}
```
이와 같이 생성과 동시에 모든 전략을 보유하고 있다. 

전략 선택 메커니즘은 다음과 같다.
```java
private BeanInstantiationStrategy findStrategy(BeanDefinition def) {
    for (BeanInstantiationStrategy strategy : instantiationStrategies) {
        if (strategy.supports(def.getCreationMethod())) {
            return strategy;
        }
    }
    throw new IllegalArgumentException("No strategy found for: " + def.getCreationMethod());
}
```

일종의 체인을 순회하며 적절한 전략일 경우 해당 전략을 실행하는 것이다.
만약 `@Component` 클래스라면 빈 정보 수집단계에서 `BeanCreationMethod.CONSTRUCTOR`로 정의되었을 테니 `ConstructorBasedInstantiationStrategy.supports()`가 `true`가 되는 것임.

이와 같은 구조로 다음과 같은 통합 프로세스가 진행된다.

```java
public Object createBean(BeanDefinition def) {
    // 1. 적절한 전략 선택
    BeanInstantiationStrategy strategy = findStrategy(def);

    // 2. 전략을 사용하여 빈 생성
    Object beanInstance = strategy.instantiate(def, dependencyResolver, this);

    // 3. BeanPostProcessor 처리
    Object processedBean = applyBeanPostProcessors(beanInstance, def.getName());

    return processedBean;
}
```

빈 생성은 이와 같이 진행되는 것이다.
언급되지 않은 `BeanPostProcessor`는 추후에 더 설명하겠다.

---

# Sprout IoC vs. Spring Framework 핵심 컴포넌트 비교

| **Sprout 구현체** | **Spring 매칭 구현체** | **역할 및 설명** |
| --- | --- | --- |
| **`SproutApplication`** | **`SpringApplication`** (Spring Boot) 또는 **`AnnotationConfigApplicationContext`** 초기화 | 애플리케이션을 부트스트랩하고, IoC 컨테이너를 초기화하며, 패키지 스캔과 컨텍스트 리프레시를 수행하는 **진입점(Entry Point)**이다. Sprout는 간단한 run 메서드로 처리하며, Spring은 더 포괄적인 환경 설정(예: 프로파일, 배너)을 지원한다. |
| **`SproutApplicationContext`** | **`AnnotationConfigApplicationContext`** 또는 **`GenericApplicationContext`** | 메인 IoC 컨테이너로, 빈 정의 등록, 스캔, 의존성 주입, 생명주기 관리 등을 담당한다. Sprout는 단순화된 버전으로, Spring처럼 refresh() 메서드를 통해 초기화를 수행한다. |
| **`DefaultListableBeanFactory`** | **`DefaultListableBeanFactory`** | 핵심 빈 팩토리로, 빈 정의 등록, 인스턴스화, 의존성 해결을 처리한다. 이름과 역할이 거의 동일하며, Sprout는 전략 패턴을 강조하지만 Spring은 더 광범위한 스코프(예: prototype)와 캐싱을 지원한다. |
| **`ClassPathScanner`** | **`ClassPathBeanDefinitionScanner`** | 클래스패스를 스캔하여 @Component 등의 어노테이션이 붙은 클래스를 감지하고 빈 정의를 생성한다. Sprout는 Reflections 라이브러리를 사용하며, Spring은 내부 스캐너를 통해 유사하게 동작한다. |
| **`BeanGraph`** | **`DefaultSingletonBeanRegistry`** (내부 그래프 처리) 또는 **`BeanDefinition`** 의존성 분석 | 의존성 그래프를 구축하고 위상 정렬로 순환 의존성을 감지한다. Spring은 내부적으로 그래프 기반 분석을 사용하지만, 더 세밀한 예외 처리(예: CircularReferenceException)와 지연 로딩을 지원한다. |
| **`BeanInstantiationStrategy`** (인터페이스, e.g., `ConstructorBasedInstantiationStrategy`, `FactoryMethodBasedInstantiationStrategy`) | **`InstantiationStrategy`** (e.g., `SimpleInstantiationStrategy`, `CglibSubclassingInstantiationStrategy`) | 빈 인스턴스화 전략을 정의하며, 생성자나 팩토리 메서드를 통해 빈을 생성한다. 전략 패턴이 유사하며, Spring은 CGLIB를 기본으로 사용해 @Configuration 싱글톤을 보장한다. |
| **`DependencyResolver`** (인터페이스, e.g., `CompositeDependencyResolver`, `SingleBeanDependencyResolver`, `ListBeanDependencyResolver`) | **`DependencyResolver`** 또는 **`AutowireCandidateResolver`** (e.g., `SimpleAutowireCandidateResolver`) | 의존성 해결을 담당하며, Chain of Responsibility 패턴으로 타입별(단일, 리스트) 주입을 처리한다. Spring은 더 포괄적으로 @Autowired, @Qualifier, 컬렉션 주입을 지원하며, ResolvableType으로 제네릭을 처리한다. |
| **`BeanLifecycleManager`** 및 **`BeanLifecyclePhase`** (e.g., `InfrastructureBeanPhase`, `BeanPostProcessorRegistrationPhase`) | **`BeanFactoryPostProcessor`** 및 **`BeanPostProcessor`** (e.g., `CommonAnnotationBeanPostProcessor`) | 빈 생명주기(생성, 초기화, 소멸)를 단계별로 관리한다. Phase 패턴이 유사하며, Spring은 초기화(InitializingBean)와 소멸(DisposableBean) 훅을 더 세밀하게 제공한다. |
| **`BeanTypeMatchingService`** | **`ResolvableType`** 및 **`BeanFactory`** 내부 타입 매칭 로직 | 타입 기반 빈 검색과 매칭을 중앙 관리한다. Spring은 ResolvableType으로 제네릭과 상속을 처리하며, 더 강력한 타입 변환(TypeConverter)을 포함한다. |
| **`@Order`** (빈 순서 제어) | **`@Order`** 또는 **`Ordered`** 인터페이스 | 빈 초기화 순서나 컬렉션 정렬을 제어한다. 역할이 동일하며, Spring은 PriorityOrdered와 함께 더 계층적인 우선순위를 지원한다. |
| **`CGLIB 프록시` (@Configuration 싱글톤 보장)** | **`CglibSubclassingInstantiationStrategy`** 및 **`ConfigurationClassPostProcessor`** | @Configuration 클래스의 메서드 호출을 인터셉트하여 싱글톤을 보장한다. Spring은 기본적으로 CGLIB를 사용하며, 옵션으로 프록시를 비활성화할 수 있다. |
| **`PendingListInjection`** (컬렉션 지연 주입) | **`AutowiredAnnotationBeanPostProcessor`** 내부 컬렉션 처리 | 리스트 주입을 지연 처리하며, 모든 빈 생성 후 @Order로 정렬하여 채운다. Spring은 비슷하게 post-processing 단계에서 컬렉션을 주입하며, SmartList나 Set도 지원한다. |
| **`@Component`, `@Service`, `@Repository`, `@Controller`, `@Configuration`** 등 | **`@Component`, `@Service`, `@Repository`, `@Controller`, `@Configuration`** 등 | 컴포넌트 스캔 대상 어노테이션으로, 빈 등록을 표시한다. 이름과 역할이 동일하며, Spring은 더 많은 변형(예: @RestController)을 제공한다.

덧붙이자면, 스프링에서 의존성 주입을 할 땐 위상정렬보다 재귀에 가깝게 동작한다. `getBean()` 을 부를 때 없으면 그 시점에 생성하게 되는 식임. 

순환 의존성도 일부 조건하에(싱글톤+생성자주입X) 지원해주기도 하는데, 이때는 3레벨 캐싱 메커니즘을 사용하여 해결해줌. 간단하게 설명하자면,

**3레벨 캐시 내용**

- Level 1 (singletonObjects): 완성된 빈 (사용 가능).
- Level 2 (earlySingletonObjects): 반제품 빈 (인스턴스화만 된 상태, 주입/초기화 미완).
- Level 3 (singletonFactories): ObjectFactory를 저장. 이 팩토리가 빈을 생성 (프록시 포함)하고 Level 2로 이동.


객체 획득을 위해 Level 1 → Level 2 → Level 3 순으로 검색함. Level 3에서 생성되면 Level 2로 캐시하고 Level 3 삭제.

빈 생성시엔, 인스턴스화 → Level 3 추가 → 속성 주입 (populateBean) → 초기화 (initializeBean) → Level 1 추가.

그리고 컴포넌트 스캔시에는 ASM(바이트코드조작 라이브러리)를 사용하여 클래스 로더없이 스캔하기 때문에 성능최적화 면에서 훨씬 유리하다. 그렇다고 리플렉션을 아예 사용하지 않는 것은 아니고 일정 부분 사용한다.

---

여기까지 빈 스캔, 의존성 주입, 생성 전략에 대한 이야기였다. 사실 남은 내용도 한꺼번에 정리하려고 했지만, 가독성 갈수록 떨어지는 것 같아서 나눠 적기로 결심함. 

다음 포스팅은 **빈 생명주기와 그 단계, 구체적인 빈 생성 순서, `@Primary`와 빈 선택, 빈 후처리(`BeanPostProcessing`), 순환 의존성, 빈 등록과 검색, 그리고 기타 확장 포인트**에 대해서 기술할 예정이다. 우선 대략적인 빈 생성 주기에 대해서는 대부분 설명했고, 늘 한참 미뤄뒀던 리팩토링과 `@Configuration` 구현에 대해 설명을 마쳐서 개인적으로 홀가분함. 

리팩토링 이후에 확장 구조가 훨씬 개선되어 빈 스코프나 컬렉션 주입 등도 더 도입하기 쉬운 구조로 개선되었다. 근데 할지 안할지는 모름..

> https://github.com/yyubin/sprout


그리고 인터페이스와 추상클래스에 대한 주입을 하진 않지만, 나중에 최종적으로 등록할 때 해당 클래스가 구현하고 있는 인터페이스와 추상클래스들의 이름으로 인스턴스를 넣어줍니다. 리스트 가능.. 그래서 인터페이스와 추상클래스로 주입이 가능한 구조입니다.

`private final Map<Class<?>, Set<String>> typeToNamesMap = new HashMap<>();` 이런 자료구조에 이름으로 넣어두고 찾아쓰는 구조.
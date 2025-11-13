> 본 시리즈는 Sprout라는 IoC 컨테이너를 직접 구현하면서 얻게 된 인사이트를 정리한 글입니다.
Spring의 내부 동작을 직접 구현해보며 얻은 개념 정리를 목표로 하며, 코드 구현과 함께 실제 구동 로그를 바탕으로 설명합니다.

이전 포스트에서는 컴포넌트 스캔, 의존성 주입, 그리고 빈 생성 전략에 대해 다뤘다. 이번에는 빈의 생명주기 관리, 구체적인 빈 생성 순서, 빈 선택 로직, 후처리 메커니즘, 순환 의존성 처리, 그리고 다양한 확장 포인트들을 살펴보려 한다.

## 빈 생명주기(Bean Lifecycle)

### 생명주기란?
빈의 생명주기는 빈이 컨테이너에 등록된 순간부터 소멸할 때까지의 전체 과정을 의미한다. 스프링처럼 복잡하진 않지만, 내가 만든 컨테이너도 명확한 단계를 거쳐 빈을 관리한다.

전체 생명주기는 크게 다음과 같이 나뉜다.

1. **빈 정의 수집** (Bean Definition Scanning)
2. **의존성 그래프 구축** (Dependency Graph Building)
3. **빈 인스턴스화** (Bean Instantiation)
4. **빈 후처리** (Bean Post-Processing)
5. **초기화** (Initialization)
6. **사용 가능 상태** (Ready)
7. **소멸** (Destruction)

### Phase Pattern을 통한 생명주기 관리

생명주기를 여러 단계(Phase)로 나누어 관리한다. 각 단계는 특정 책임을 가지며, 순서가 보장된다.

```java
public interface BeanLifecyclePhase {
    int getOrder();
    void execute(PhaseContext context) throws Exception;
    
    class PhaseContext {
        private final BeanFactory beanFactory;
        private final BeanGraph beanGraph;
        private final List<BeanDefinition> beanDefinitions;
        private final String[] packages;
        // ...
    }
}
```

`BeanLifecycleManager`는 이러한 Phase들을 순서대로 실행한다.

```java
public class BeanLifecycleManager {
    private final List<BeanLifecyclePhase> phases = new ArrayList<>();
    
    public BeanLifecycleManager() {
        // 순서대로 Phase 등록
        phases.add(new InfrastructureBeanPhase());              // order=100
        phases.add(new BeanPostProcessorRegistrationPhase());   // order=200
        phases.add(new ApplicationBeanPhase());                 // order=300
        phases.add(new ContextInitializerPhase());              // order=400
    }
    
    public void executePhases(PhaseContext context) throws Exception {
        for (BeanLifecyclePhase phase : phases) {
            phase.execute(context);
        }
    }
}
```

## 구체적인 빈 생성 순서

컨테이너가 초기화되면서 빈들이 생성되는 구체적인 순서를 따라가보자.

### 1단계: 컨텍스트 초기화 (ApplicationContext.refresh())

```java
public void refresh() throws Exception {
    // 1. 빈 정의 스캔
    scanBeanDefinitions();
    
    // 2. 생명주기 단계별 실행
    BeanLifecyclePhase.PhaseContext context = new BeanLifecyclePhase.PhaseContext(
        beanFactory, beanGraph, beanDefinitions, packages
    );
    lifecycleManager.executePhases(context);
}
```

### 2단계: 빈 정의 스캔 (scanBeanDefinitions)

```java
private void scanBeanDefinitions() {
    // ClassPathScanner를 통해 모든 빈 정의 수집
    Collection<BeanDefinition> definitions = classPathScanner.scan(
        configBuilder,
        Component.class, Service.class, Repository.class,
        Controller.class, Configuration.class, Aspect.class,
        ControllerAdvice.class, WebSocketHandler.class
    );
    
    // BeanFactory에 등록
    for (BeanDefinition def : definitions) {
        beanFactory.registerBeanDefinition(def.getName(), def);
    }
    
    // 의존성 그래프 구축
    beanGraph.build(definitions);
}
```

### 3단계: InfrastructureBeanPhase (order=100)

인프라 빈들을 가장 먼저 생성한다. 인프라 빈은 `@Infrastructure` 어노테이션이 붙은 빈들로, 컨테이너 자체의 동작에 필요한 핵심 빈들이다. 마커 인터페이스를 사용하여 페이즈를 구분한 것이다. 

스프링 내부에서 사용하는 `Phase` 개념과 명확하게는 다르다. 구체적으로 뭐가 다른지는 스프링과의 비교 섹션에서 더 설명할 것.


```java
public class InfrastructureBeanPhase implements BeanLifecyclePhase {
    @Override
    public int getOrder() {
        return 100;
    }
    
    @Override
    public void execute(PhaseContext context) throws Exception {
        BeanFactory beanFactory = context.getBeanFactory();
        BeanGraph beanGraph = context.getBeanGraph();
        
        // Infrastructure 빈만 필터링
        List<String> infraBeanNames = beanGraph.getOrderedBeanNames().stream()
            .filter(name -> {
                BeanDefinition def = beanFactory.getBeanDefinition(name);
                return def.getBeanClass().isAnnotationPresent(Infrastructure.class);
            })
            .collect(Collectors.toList());
        
        // 생성
        for (String beanName : infraBeanNames) {
            beanFactory.getBean(beanName);
        }
    }
}
```

**인프라 빈의 예시**
```java
@Component
@Infrastructure
public class DefaultBeanPostProcessorRegistry implements BeanPostProcessorRegistry {
    // BeanPostProcessor들을 관리하는 레지스트리
}
```

### 4단계: BeanPostProcessorRegistrationPhase (order=200)

`BeanPostProcessor`들을 발견하고 등록한다. 이 단계가 중요한 이유는, 이후 생성되는 모든 빈들이 이 프로세서들의 처리를 받기 때문이다.

```java
public class BeanPostProcessorRegistrationPhase implements BeanLifecyclePhase {
    @Override
    public int getOrder() {
        return 200;
    }
    
    @Override
    public void execute(PhaseContext context) throws Exception {
        BeanFactory beanFactory = context.getBeanFactory();
        
        // BeanPostProcessor 타입의 빈들을 찾아서 등록
        String[] postProcessorNames = beanFactory.getBeanNamesForType(BeanPostProcessor.class);
        
        for (String beanName : postProcessorNames) {
            BeanPostProcessor processor = (BeanPostProcessor) beanFactory.getBean(beanName);
            beanFactory.addBeanPostProcessor(processor);
        }
    }
}
```

### 5단계: ApplicationBeanPhase (order=300)

이제 본격적으로 애플리케이션 빈들을 생성한다. 위상 정렬된 순서에 따라 의존성이 없는 빈부터 차례로 생성된다.

```java
public class ApplicationBeanPhase implements BeanLifecyclePhase {
    @Override
    public int getOrder() {
        return 300;
    }
    
    @Override
    public void execute(PhaseContext context) throws Exception {
        BeanFactory beanFactory = context.getBeanFactory();
        BeanGraph beanGraph = context.getBeanGraph();
        
        // 위상 정렬된 순서로 빈 생성
        List<String> orderedBeanNames = beanGraph.getOrderedBeanNames();
        
        for (String beanName : orderedBeanNames) {
            BeanDefinition def = beanFactory.getBeanDefinition(beanName);
            
            // Infrastructure 빈과 PostProcessor는 이미 생성됨
            if (def.getBeanClass().isAnnotationPresent(Infrastructure.class) ||
                BeanPostProcessor.class.isAssignableFrom(def.getBeanClass())) {
                continue;
            }
            
            // 빈 생성 (getBean은 없을 경우 자동으로 생성)
            beanFactory.getBean(beanName);
        }
        
        // List 주입 후처리
        beanFactory.postProcessListInjections();
    }
}
```

**위상 정렬 순서의 예시**

```java
// 의존성 관계
// UserController -> UserService -> UserRepository

// 위상 정렬 결과
["userRepository", "userService", "userController"]

// 생성 순서
1. UserRepository 생성 (의존성 없음)
2. UserService 생성 (UserRepository 주입)
3. UserController 생성 (UserService 주입)
```

### 6단계: ContextInitializerPhase (order=400)

마지막으로 `ContextInitializer` 인터페이스를 구현한 빈들의 초기화 메서드를 실행한다.

```java
public class ContextInitializerPhase implements BeanLifecyclePhase {

    @Override
    public String getName() {
        return "ContextInitializer Execution";
    }

    @Override
    public int getOrder() {
        return 400;
    }

    @Override
    public void execute(PhaseContext context) {
        BeanFactory beanFactory = context.getBeanFactory();

        // 모든 ContextInitializer를 찾아서 실행
        List<ContextInitializer> contextInitializers = beanFactory.getAllBeans(ContextInitializer.class);
        for (ContextInitializer initializer : contextInitializers) {
            initializer.initializeAfterRefresh(beanFactory);
        }
    }
}
```

**ContextInitializer 사용 예시**

```java
@Component
public class HandlerContextInitializer implements ContextInitializer {
    private final HandlerMethodScanner scanner;

    public HandlerContextInitializer(HandlerMethodScanner scanner) {
        this.scanner = scanner;
    }

    @Override
    public void initializeAfterRefresh(BeanFactory context) {
        scanner.scanControllers(context);
    }
}
```

익셉션 핸들러 레지스트리, 컨트롤러 레지스트리,  웹소켓 매핑 레지스트리 등 서버 구동 전 미리 채워둬야 하는 것들을 이 시점에서 채운다. 서버 구동 전, 미리 해둬야 할 게 있다면 이 인터페이스를 구현하여(`@Component`는 달아야함) 두기만 해도 작동할 수 있는 것임.

## @Primary와 빈 선택 로직

같은 타입의 빈이 여러 개 있을 때, 어떤 빈을 주입할지 결정하는 메커니즘이 필요하다.

### 문제 상황

```java
public interface MessageSender {
    void send(String message);
}

@Component
public class EmailSender implements MessageSender {
    // 이메일 발송 로직
}

@Component
public class SmsSender implements MessageSender {
    // SMS 발송 로직
}

@Service
public class NotificationService {
    private final MessageSender messageSender;  // 어떤 구현체?
    
    public NotificationService(MessageSender messageSender) {
        this.messageSender = messageSender;
    }
}
```

이 상황에서 `NotificationService`를 생성할 때 `EmailSender`와 `SmsSender` 중 어떤 것을 주입해야 할까?

### @Primary를 통한 우선순위 지정

```java
@Component
@Primary  // 우선적으로 선택됨
public class EmailSender implements MessageSender {
    // ...
}

@Component
public class SmsSender implements MessageSender {
    // ...
}
```

### 빈 선택 로직 구현

`BeanTypeMatchingService`가 이 로직을 담당한다.

```java
public class BeanTypeMatchingService {
    private final BeanDefinitionRegistry registry;
    private final Map<Class<?>, Set<String>> typeToNamesMap;
    
    public String choosePrimary(Class<?> requiredType, Set<String> candidateNames) {
        if (candidateNames.size() == 1) {
            return candidateNames.iterator().next();
        }
        
        // @Primary가 붙은 빈 찾기
        List<String> primaryBeans = candidateNames.stream()
            .filter(name -> {
                BeanDefinition def = registry.getBeanDefinition(name);
                return def.getBeanClass().isAnnotationPresent(Primary.class);
            })
            .collect(Collectors.toList());
        
        if (primaryBeans.size() == 1) {
            return primaryBeans.get(0);
        }
        
        if (primaryBeans.size() > 1) {
            throw new NoUniqueBeanDefinitionException(
                "Multiple @Primary beans found for type: " + requiredType
            );
        }
        
        // @Primary가 없으면 예외
        throw new NoUniqueBeanDefinitionException(
            "No @Primary bean found for type: " + requiredType + 
            ", candidates: " + candidateNames
        );
    }
}
```

### 인터페이스/추상 클래스 타입 매칭

Sprout은 빈을 등록할 때 구현하는 인터페이스와 상속하는 추상 클래스도 함께 매핑한다.

```java
public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition) {
    beanDefinitionMap.put(beanName, beanDefinition);
    
    Class<?> beanClass = beanDefinition.getBeanClass();
    
    // 클래스 자체 등록
    typeToNamesMap.computeIfAbsent(beanClass, k -> new HashSet<>()).add(beanName);
    
    // 구현하는 모든 인터페이스 등록
    for (Class<?> iface : beanClass.getInterfaces()) {
        typeToNamesMap.computeIfAbsent(iface, k -> new HashSet<>()).add(beanName);
    }
    
    // 상속하는 추상 클래스 등록
    Class<?> superClass = beanClass.getSuperclass();
    while (superClass != null && superClass != Object.class) {
        if (Modifier.isAbstract(superClass.getModifiers())) {
            typeToNamesMap.computeIfAbsent(superClass, k -> new HashSet<>()).add(beanName);
        }
        superClass = superClass.getSuperclass();
    }
}
```

이렇게 하면 인터페이스 타입으로도 주입이 가능하다.

```java
@Service
public class NotificationService {
    // MessageSender 인터페이스로 주입받아도 OK
    private final MessageSender messageSender;
    
    public NotificationService(MessageSender messageSender) {
        this.messageSender = messageSender;
    }
}
```

## BeanPostProcessor - 빈 후처리

`BeanPostProcessor`는 빈이 생성된 직후, 그리고 초기화 직후에 추가 처리를 할 수 있는 확장 포인트다.

### BeanPostProcessor 인터페이스

```java
public interface BeanPostProcessor {
    /**
     * 빈 초기화 전에 호출
     */
    default Object postProcessBeforeInitialization(String beanName, Object bean) {
        return bean;
    }
    
    /**
     * 빈 초기화 후에 호출
     */
    default Object postProcessAfterInitialization(String beanName, Object bean) {
        return bean;
    }
}
```

### BeanPostProcessor 실행 흐름

```java
public Object createBean(BeanDefinition def) {
    // 1. 적절한 전략 선택
    BeanInstantiationStrategy strategy = findStrategy(def);
    
    // 2. 전략을 사용하여 빈 생성
    Object beanInstance = strategy.instantiate(def, dependencyResolver, this);
    
    // 3. BeanPostProcessor - Before 단계
    Object processedBean = applyBeanPostProcessorsBeforeInitialization(
        beanInstance, def.getName()
    );
    
    // 4. 초기화 (현재는 별도 초기화 메서드 미지원)
    // initializeBean(processedBean, def);
    
    // 5. BeanPostProcessor - After 단계
    processedBean = applyBeanPostProcessorsAfterInitialization(
        processedBean, def.getName()
    );
    
    return processedBean;
}

private Object applyBeanPostProcessorsAfterInitialization(Object bean, String beanName) {
    Object result = bean;
    for (BeanPostProcessor processor : getBeanPostProcessors()) {
        result = processor.postProcessAfterInitialization(beanName, result);
        if (result == null) {
            return bean;  // null이면 원본 반환
        }
    }
    return result;
}
```

### 활용 예시 1: 프록시 생성

```java
@Component
public class TransactionalBeanPostProcessor implements BeanPostProcessor {
    @Override
    public Object postProcessAfterInitialization(String beanName, Object bean) {
        Class<?> targetClass = bean.getClass();
        
        // @Transactional이 있는지 확인
        if (targetClass.isAnnotationPresent(Transactional.class) || 
            hasTransactionalMethod(targetClass)) {
            
            // CGLIB 프록시 생성
            Enhancer enhancer = new Enhancer();
            enhancer.setSuperclass(targetClass);
            enhancer.setCallback(new TransactionInterceptor());
            
            return enhancer.create();
        }
        
        return bean;
    }
}
```
그냥 예시 중 하나, `@Transactional`을 Data 층에 만들어뒀지만 AOP 모듈을 사용했지 이렇게 구현하진 않았다.

### 활용 예시 2: 어노테이션 기반 설정

```java
@Component
public class ConfigurationPropertiesBeanPostProcessor implements BeanPostProcessor {
    private final Environment environment;
    
    @Override
    public Object postProcessBeforeInitialization(String beanName, Object bean) {
        Class<?> beanClass = bean.getClass();
        
        if (beanClass.isAnnotationPresent(ConfigurationProperties.class)) {
            ConfigurationProperties annotation = 
                beanClass.getAnnotation(ConfigurationProperties.class);
            String prefix = annotation.prefix();
            
            // Environment에서 값을 읽어 필드에 주입
            bindProperties(bean, prefix);
        }
        
        return bean;
    }
    
    private void bindProperties(Object bean, String prefix) {
        // 프로퍼티 바인딩 로직
    }
}
```

### 활용 예시 3: 검증 (Validation)

```java
@Component
public class BeanValidationPostProcessor implements BeanPostProcessor {
    private final Validator validator;
    
    @Override
    public Object postProcessAfterInitialization(String beanName, Object bean) {
        Class<?> beanClass = bean.getClass();
        
        if (beanClass.isAnnotationPresent(Validated.class)) {
            Set<ConstraintViolation<Object>> violations = validator.validate(bean);
            
            if (!violations.isEmpty()) {
                throw new ConstraintViolationException(
                    "Bean validation failed for " + beanName, violations
                );
            }
        }
        
        return bean;
    }
}
```

### BeanPostProcessor의 순서

여러 개의 `BeanPostProcessor`가 있을 때, `@Order` 어노테이션으로 순서를 제어할 수 있다:

```java
@Component
@Order(1)
public class ValidationPostProcessor implements BeanPostProcessor {
    // 먼저 실행
}

@Component
@Order(2)
public class TransactionalPostProcessor implements BeanPostProcessor {
    // 나중에 실행
}
```

## 순환 의존성 처리

순환 의존성은 두 개 이상의 빈이 서로를 의존하는 상황을 말한다.

### 순환 의존성의 문제

```java
@Service
public class ServiceA {
    private final ServiceB serviceB;
    
    public ServiceA(ServiceB serviceB) {
        this.serviceB = serviceB;
    }
}

@Service
public class ServiceB {
    private final ServiceA serviceA;
    
    public ServiceB(ServiceA serviceA) {
        this.serviceA = serviceA;
    }
}
```

이 상황에서,
1. `ServiceA`를 생성하려면 `ServiceB`가 필요
2. `ServiceB`를 생성하려면 `ServiceA`가 필요
3. → **무한 루프!**

### Sprout의 접근: 사전 감지 (Fail-Fast)

Sprout은 스프링과 달리 순환 의존성을 해결하려 하지 않고, **빈 생성 전에 감지**하여 명확한 에러를 발생시킨다.

```java
public class BeanGraph {
    private final Map<String, List<String>> dependencyGraph = new HashMap<>();
    private List<String> orderedBeanNames;
    
    public void build(Collection<BeanDefinition> beanDefinitions) {
        // 1. 의존성 그래프 구축
        for (BeanDefinition def : beanDefinitions) {
            String beanName = def.getName();
            List<String> dependencies = extractDependencies(def);
            dependencyGraph.put(beanName, dependencies);
        }
        
        // 2. 위상 정렬 시도
        try {
            orderedBeanNames = topologicalSort();
        } catch (CircularDependencyException e) {
            // 순환 의존성 발견!
            throw new BeanCreationException(
                "Circular dependency detected: " + e.getCycle()
            );
        }
    }
    
    private List<String> topologicalSort() {
        List<String> result = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        Set<String> visiting = new HashSet<>();  // 현재 방문 중인 노드
        
        for (String beanName : dependencyGraph.keySet()) {
            if (!visited.contains(beanName)) {
                dfs(beanName, visited, visiting, result);
            }
        }
        
        Collections.reverse(result);
        return result;
    }
    
    private void dfs(String beanName, Set<String> visited, 
                     Set<String> visiting, List<String> result) {
        if (visiting.contains(beanName)) {
            // 순환 의존성 발견!
            throw new CircularDependencyException(
                "Circular dependency: " + beanName
            );
        }
        
        if (visited.contains(beanName)) {
            return;
        }
        
        visiting.add(beanName);
        
        List<String> dependencies = dependencyGraph.get(beanName);
        if (dependencies != null) {
            for (String dep : dependencies) {
                dfs(dep, visited, visiting, result);
            }
        }
        
        visiting.remove(beanName);
        visited.add(beanName);
        result.add(beanName);
    }
}
```

### 순환 의존성 에러 메시지

```
BeanCreationException: Circular dependency detected in bean creation chain:
  ServiceA -> ServiceB -> ServiceA

Suggested solutions:
1. Break the cycle by introducing an intermediate service
2. Use event-driven communication instead of direct dependencies
3. Consider if one of the dependencies can be made optional or lazy
```

## 빈 등록과 검색

### 빈 등록 메커니즘

빈은 크게 두 가지 방식으로 등록된다.

#### 1. 컴포넌트 스캔을 통한 자동 등록

```java
@Service
public class UserService {
    // 자동으로 "userService"라는 이름으로 등록됨
}
```

#### 2. @Bean 메서드를 통한 수동 등록

```java
@Configuration
public class AppConfig {
    @Bean
    public DataSource dataSource() {
        // "dataSource"라는 이름으로 등록됨
        return new HikariDataSource();
    }
    
    @Bean(name = "primaryDB")  // 명시적 이름 지정
    public DataSource primaryDataSource() {
        return new HikariDataSource();
    }
}
```

### 검색 구현 상세

#### 이름 기반 검색

```java
@Override
public Object getBean(String name) {
    // 1. 싱글톤 캐시 확인
    if (singletonObjects.containsKey(name)) {
        return singletonObjects.get(name);
    }
    
    // 2. 빈 정의 확인
    BeanDefinition def = getBeanDefinition(name);
    if (def == null) {
        throw new NoSuchBeanDefinitionException("No bean named '" + name + "'");
    }
    
    // 3. 빈 생성
    Object bean = createBean(def);
    
    // 4. 싱글톤 캐시에 저장
    singletonObjects.put(name, bean);
    
    return bean;
}
```

스프링에서와 마찬가지로, 일종의 재귀 메커니즘이 들어갔다.
`createBean` 에서 또 다른 의존성을 찾기 위해 `getBean()`을 호출할 테고, 없으면 또 다시 `createBean()` 이 호출됨. 하지만 대부분의 경우 위상정렬로 순서를 지정하기에 문제없이 동작 가능할 것. 다만, AOP를 투과하여  자기 자신을 호출하는 경우, 문제될 소지가 있음. 솔직히 이 부분은 미리 검출하는 로직이 없다.(PR환영 ㅎㅎ..)

```
AAspectAOP 가 ServiceA를 의존하는데, ServiceA에 해당 AAspectAOP가 AOP로서 동작할 경우.
```

#### 타입 기반 검색

```java
@Override
public <T> T getBean(Class<T> requiredType) {
    // 1. 타입에 해당하는 모든 빈 이름 찾기
    Set<String> candidateNames = beanTypeMatchingService
        .findCandidateNamesForType(requiredType);
    
    if (candidateNames.isEmpty()) {
        throw new NoSuchBeanDefinitionException(
            "No bean of type " + requiredType + " found"
        );
    }
    
    // 2. @Primary가 있으면 선택, 없으면 유일한 빈 반환
    String beanName = beanTypeMatchingService.choosePrimary(
        requiredType, candidateNames
    );
    
    // 3. 빈 반환
    return (T) getBean(beanName);
}
```

#### 여러 빈 검색

```java
@Override
public <T> Map<String, T> getBeansOfType(Class<T> type) {
    Map<String, T> result = new HashMap<>();
    
    // 타입에 해당하는 모든 빈 이름 찾기
    Set<String> beanNames = beanTypeMatchingService
        .findCandidateNamesForType(type);
    
    // 각 빈을 가져와서 Map에 추가
    for (String name : beanNames) {
        T bean = (T) getBean(name);
        result.put(name, bean);
    }
    
    return result;
}
```

## 기타 확장 포인트

### 1. BeanDefinitionRegistrar

동적으로 빈 정의를 추가할 수 있는 확장 포인트다.

```java
public interface BeanDefinitionRegistrar {
    Collection<BeanDefinition> registerAdditionalBeanDefinitions(
        Collection<BeanDefinition> existingDefs
    );
}
```

**사용 예시: 조건부 빈 등록**

```java
@Component
public class ConditionalBeanRegistrar implements BeanDefinitionRegistrar {
    @Override
    public Collection<BeanDefinition> registerAdditionalBeanDefinitions(
            Collection<BeanDefinition> existingDefs) {
        
        List<BeanDefinition> additional = new ArrayList<>();
        
        // 환경 변수 확인
        String profile = System.getenv("PROFILE");
        
        if ("production".equals(profile)) {
            // 프로덕션 환경에서만 특정 빈 등록
            BeanDefinition def = new BeanDefinition(
                "productionMetrics",
                ProductionMetricsCollector.class,
                BeanCreationMethod.CONSTRUCTOR
            );
            additional.add(def);
        }
        
        return additional;
    }
}
```

실제 Security 모듈이 포함됨에도 불구하고 시큐리티 관련 인터페이스 구현이 없을 경우(구현체가 스캔 단계에서 없는 경우), auto configuration을 해당 확장 포인트를 활용하여 기본 모드를 만들어 넣어주었다.

### 2. ContextInitializer

컨텍스트 초기화 과정에 참여할 수 있는 인터페이스다.

```java
public interface ContextInitializer {
    void initializeAfterRefresh(BeanFactory context);
}
```

**사용 예시: 핸들러 매핑 초기화**

```java
@Component
public class HandlerContextInitializer implements ContextInitializer {
    private final HandlerMethodScanner scanner;

    public HandlerContextInitializer(HandlerMethodScanner scanner) {
        this.scanner = scanner;
    }

    @Override
    public void initializeAfterRefresh(BeanFactory context) {
        scanner.scanControllers(context);
    }
}
```

이 밖에도 `@Order` 및 컬렉션 주입, `@Configuration` 의 내용이 있지만 전편에서 상세히 설명하였으므로 건너 뛰겠다.

## 마무리

이번 포스트에서는 Sprout IoC 컨테이너의 생명주기 관리, 빈 선택 로직, 후처리 메커니즘, 순환 의존성 처리, 그리고 다양한 확장 포인트들을 살펴봤다.

### 핵심 내용 정리

1. **생명주기 관리**: Phase Pattern을 통해 Infrastructure → PostProcessor → Application → Initializer 순서로 단계적 초기화
2. **빈 생성 순서**: 위상 정렬을 통해 의존성 순서 보장
3. **@Primary**: 같은 타입의 빈이 여러 개일 때 우선순위 지정
4. **BeanPostProcessor**: 빈 생성 전후에 커스텀 처리 (프록시, 검증, 설정 주입 등)
5. **순환 의존성**: Fail-Fast 접근으로 사전 감지하여 명확한 에러 제공
6. **확장 포인트**: BeanDefinitionRegistrar, ContextInitializer, @Order 등으로 유연한 확장

### 스프링과의 주요 차이점

| 특징 | Sprout | Spring |
|------|--------|--------|
| 순환 의존성 | 사전 감지 및 에러 | 일부 지원 (3-level cache) |
| 컴포넌트 스캔 | Reflections 라이브러리 | 리플렉션 + ASM (바이트코드) |
| 의존성 해결 | 위상 정렬 + Eager | 재귀적 Lazy (getBean 호출 시) |
| 빈 스코프 | Singleton만 지원 | Singleton, Prototype 등 다양 |
| 필드 주입/세터 주입 | 미지원 | 지원 (@Autowired) |

#### 스프링 Phase 와 다른 점
> 스프링 공식 문서에서는 `SmartLifecycle.getPhase()` 를 통해 시작/종료 순서를 지정할 수 있다고 되어 있지만, 이 구조는 **애플리케이션 빈**들을 대상으로만 진행함. 더 내부적인 스프링 자체의 컴포넌트들은 다음과 같이 *미리*생성된다.
> **1. 일부 Spring 인프라 빈들은 특정 이름으로 자동 감지**
> **2. BeanPostProcessor와 BeanFactoryPostProcessor등, 프레임워크 레벨 컴포넌트들은 이런 특수 인터페이스를 통해 처리**

> - Spring 내부 인프라는 Phase로 관리하지 않는다
- 대신 컨테이너 초기화 과정에서 정해진 순서대로 특별히 처리
- SmartLifecycle/Phase는 사용자 애플리케이션 빈들의 시작/종료 순서를 제어하는 용도
https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html?utm_source=chatgpt.com

내가 구현할 때에는 더 명시적으로 단계를 구분하는게 *내가* 이해하기 쉬워서 그렇게 구성했던 것이다.. 용어가 혼동될 것 같아 추가로 설명했다.

그러니 내가 만든 Sprout의 라이프사이클 페이즈와 스프링의 라이프사이클 페이즈는 애초에 목적부터 다름. 만약 스프링의 라이프사이클 및 페이즈를 도입한다고 하면, `ApplicationBeanLifeCyclePhase` 와 같은 추상 클래스나 인터페이스를 추가로 도입하여 구현해야 할 것임.

> https://github.com/yyubin/sprout

---

**참고사항**
- 현재 구현은 싱글톤 스코프만 지원하며, Prototype 스코프는 추후 확장 가능
- 필드 주입은 생성자 주입 대비 테스트 용이성과 불변성 보장 측면에서 불리하여 미지원
- 인터페이스와 추상클래스 타입으로 주입이 가능하며, `typeToNamesMap`을 통해 구현체와 매핑됨
- 커스텀 초기화/소멸 메서드 지원 하고 있지 않다
- 전편에서도 설명했지만 애초에 구현체에 대해서만 프록시를 생성하고 해당 프록시 인스턴스를 인터페이스/추상클래스 타입에 매핑해주는 구조임. 그래서 인터페이스에 대한 명시적 프록시를 생성하지는 않는다. 그래서 JDK 동적 프록시가 아닌 CGLIB만 사용함.
- BeanPostProcessor의 실행 순서를 제어하는 코드가 보이지 않는데, 내부적으로 List를 지원함. 그리고 해당 프레임워크 구조로 프레임워크 컴포넌트들도 관리함. 그래서 `@Order`를 직접적으로 명시하고 사용하면 당연히 순서기반으로 동작 가능한 구조이다
- 인프라 빈 초기화 이후에 작동해야 하는 것들은 `ContextInitializer`를 사용하지 않고 `PostInfrastructureInitializer` 라는 별도의 인터페이스를 사용한다.


마지막으로 현재 프레임워크와 몇몇 테스트용 애플리케이션 빈들을 포함한 프로젝트를 구동하면 다음과 같은 로그를 확인할 수 있다.

```plain
{interface sprout.context.BeanFactory=beanFactory, class sprout.context.builtins.DefaultListableBeanFactory=beanFactory, interface sprout.context.BeanDefinitionRegistry=beanFactory}
{interface sprout.context.ApplicationContext=applicationContext, interface sprout.context.BeanFactory=beanFactory, class sprout.context.builtins.DefaultListableBeanFactory=beanFactory, interface sprout.context.BeanDefinitionRegistry=beanFactory, class sprout.context.builtins.SproutApplicationContext=applicationContext}
00:19:17.798 [main] INFO org.reflections.Reflections - Reflections took 78 ms to scan 1 urls, producing 104 keys and 434 values
→ BeanDefinition: Name=finalContinuationFrameHandler, Type=FinalContinuationFrameHandler
→ BeanDefinition: Name=throwableArgumentResolver, Type=ThrowableArgumentResolver
→ BeanDefinition: Name=jsonWebSocketMessageDispatcher, Type=JsonWebSocketMessageDispatcher
→ BeanDefinition: Name=compositeArgumentResolver, Type=CompositeArgumentResolver
→ BeanDefinition: Name=rawBinaryWebSocketMessageDispatcher, Type=RawBinaryWebSocketMessageDispatcher
→ BeanDefinition: Name=webSocketEndpointRegistry, Type=WebSocketEndpointRegistry
→ BeanDefinition: Name=voidResponseResolver, Type=VoidResponseResolver
→ BeanDefinition: Name=testUserRepository, Type=TestUserRepository
→ BeanDefinition: Name=authorizationAspect, Type=AuthorizationAspect
→ BeanDefinition: Name=sessionArgumentResolver, Type=SessionArgumentResolver
→ BeanDefinition: Name=securityDispatchHook, Type=SecurityDispatchHook
→ BeanDefinition: Name=httpHeaderParser, Type=HttpHeaderParser
→ BeanDefinition: Name=advisorRegistry, Type=AdvisorRegistry
→ BeanDefinition: Name=jsonPayloadArgumentResolver, Type=JsonPayloadArgumentResolver
→ BeanDefinition: Name=adviceFactory, Type=AdviceFactory
→ BeanDefinition: Name=transactionalAspect, Type=TransactionalAspect
→ BeanDefinition: Name=handlerMethodScanner, Type=HandlerMethodScanner
→ BeanDefinition: Name=controllerAdviceContextInitializer, Type=ControllerAdviceContextInitializer
→ BeanDefinition: Name=benchmarkController, Type=BenchmarkController
→ BeanDefinition: Name=pathVariableArgumentResolver, Type=PathVariableArgumentResolver
→ BeanDefinition: Name=serverConfiguration, Type=ServerConfiguration
→ BeanDefinition: Name=finalTextFrameHandler, Type=FinalTextFrameHandler
→ BeanDefinition: Name=responseEntityResolver, Type=ResponseEntityResolver
→ BeanDefinition: Name=handlerMappingImpl, Type=HandlerMappingImpl
→ BeanDefinition: Name=channelContextPropagator, Type=ChannelContextPropagator
→ BeanDefinition: Name=serviceWithDependency, Type=ServiceWithDependency
→ BeanDefinition: Name=jdbcTemplate, Type=JdbcTemplate
→ BeanDefinition: Name=httpRequestParser, Type=HttpRequestParser
→ BeanDefinition: Name=allHeaderArgumentResolver, Type=AllHeaderArgumentResolver
→ BeanDefinition: Name=initialBinaryFragmentHandler, Type=InitialBinaryFragmentHandler
→ BeanDefinition: Name=jdbcTransactionManager, Type=JdbcTransactionManager
→ BeanDefinition: Name=initialTextFragmentHandler, Type=InitialTextFragmentHandler
→ BeanDefinition: Name=requestLineParser, Type=RequestLineParser
→ BeanDefinition: Name=testUserService, Type=TestUserService
→ BeanDefinition: Name=handlerContextInitializer, Type=HandlerContextInitializer
→ BeanDefinition: Name=requestDispatcher, Type=RequestDispatcher
→ BeanDefinition: Name=inputStreamPayloadArgumentResolver, Type=InputStreamPayloadArgumentResolver
→ BeanDefinition: Name=defaultPointcutFactory, Type=DefaultPointcutFactory
→ BeanDefinition: Name=headerArgumentResolver, Type=HeaderArgumentResolver
→ BeanDefinition: Name=testAspect, Type=TestAspect
→ BeanDefinition: Name=continuationFragmentHandler, Type=ContinuationFragmentHandler
→ BeanDefinition: Name=httpProtocolDetector, Type=HttpProtocolDetector
→ BeanDefinition: Name=webSocketHandlerScanner, Type=WebSocketHandlerScanner
→ BeanDefinition: Name=objectBodyResponseResolver, Type=ObjectBodyResponseResolver
→ BeanDefinition: Name=closeCodeArgumentResolver, Type=CloseCodeArgumentResolver
→ BeanDefinition: Name=someController, Type=SomeController
→ BeanDefinition: Name=stringPayloadArgumentResolver, Type=StringPayloadArgumentResolver
→ BeanDefinition: Name=requestMappingRegistry, Type=RequestMappingRegistry
→ BeanDefinition: Name=nioHybridServerStrategy, Type=NioHybridServerStrategy
→ BeanDefinition: Name=handlerMethodInvoker, Type=HandlerMethodInvoker
→ BeanDefinition: Name=stringResponseResolver, Type=StringResponseResolver
→ BeanDefinition: Name=securityContextPropagator, Type=SecurityContextPropagator
→ BeanDefinition: Name=appConfig, Type=AppConfig
→ BeanDefinition: Name=defaultWebSocketFrameParser, Type=DefaultWebSocketFrameParser
→ BeanDefinition: Name=defaultConnectionManager, Type=DefaultConnectionManager
→ BeanDefinition: Name=securityContextInitializer, Type=SecurityContextInitializer
→ BeanDefinition: Name=testController, Type=TestController
→ BeanDefinition: Name=testUserController, Type=TestUserController
→ BeanDefinition: Name=classPathScanner, Type=ClassPathScanner
→ BeanDefinition: Name=controllerAdviceExceptionResolver, Type=ControllerAdviceExceptionResolver
→ BeanDefinition: Name=requestBodyArgumentResolver, Type=RequestBodyArgumentResolver
→ BeanDefinition: Name=requestParamArgumentResolver, Type=RequestParamArgumentResolver
→ BeanDefinition: Name=webSocketProtocolDetector, Type=WebSocketProtocolDetector
→ BeanDefinition: Name=testService, Type=TestService
→ BeanDefinition: Name=someComponent, Type=SomeComponent
→ BeanDefinition: Name=defaultEndpointConfig, Type=DefaultEndpointConfig
→ BeanDefinition: Name=defaultWebSocketFrameEncoder, Type=DefaultWebSocketFrameEncoder
→ BeanDefinition: Name=demoLoggingAspect, Type=DemoLoggingAspect
→ BeanDefinition: Name=webSocketContextInitializer, Type=WebSocketContextInitializer
→ BeanDefinition: Name=defaultWebSocketContainer, Type=DefaultWebSocketContainer
→ BeanDefinition: Name=defaultExceptionResolver, Type=DefaultExceptionResolver
→ BeanDefinition: Name=aspectPostProcessor, Type=AspectPostProcessor
→ BeanDefinition: Name=finalBinaryFrameHandler, Type=FinalBinaryFrameHandler
→ BeanDefinition: Name=queryStringParser, Type=QueryStringParser
→ BeanDefinition: Name=defaultWebSocketHandshakeHandler, Type=DefaultWebSocketHandshakeHandler
→ BeanDefinition: Name=objectMapperConfig, Type=ObjectMapperConfig
→ BeanDefinition: Name=controllerAdviceRegistry, Type=ControllerAdviceRegistry
→ BeanDefinition: Name=defaultWebSocketMessageParser, Type=DefaultWebSocketMessageParser
→ BeanDefinition: Name=corsFilter, Type=CorsFilter
→ BeanDefinition: Name=pathPathVariableArgumentResolver, Type=PathPathVariableArgumentResolver
→ BeanDefinition: Name=pathPatternResolver, Type=PathPatternResolver
→ BeanDefinition: Name=dataSourceConfig, Type=DataSourceConfig
→ BeanDefinition: Name=webSocketProtocolHandler, Type=WebSocketProtocolHandler
→ BeanDefinition: Name=httpServer, Type=HttpServer
→ BeanDefinition: Name=someServiceImpl, Type=SomeServiceImpl
→ BeanDefinition: Name=securityAutoConfigurationRegistrar, Type=SecurityAutoConfigurationRegistrar
→ BeanDefinition: Name=componentWithListDependency, Type=ComponentWithListDependency
→ BeanDefinition: Name=aopPostInfrastructureInitializer, Type=AopPostInfrastructureInitializer
→ BeanDefinition: Name=cglibProxyFactory, Type=CglibProxyFactory
→ BeanDefinition: Name=objectMapper, Type=ObjectMapper
→ BeanDefinition: Name=executorService, Type=RequestExecutorService
→ BeanDefinition: Name=httpProtocolHandler, Type=AcceptableProtocolHandler
→ BeanDefinition: Name=dataSource, Type=DataSource
No @EnableSproutSecurity found. Registering default security beans.
--- Executing Phase: Infrastructure Bean Initialization (order=100) ---
{defaultPointcutFactory=0, aspectPostProcessor=3, daoAuthenticationProvider=2, passwordEncoder=0, advisorRegistry=0, authenticationManager=0, aopPostInfrastructureInitializer=1, appConfig=0, corsFilter=1, cglibProxyFactory=0, adviceFactory=1, defaultRequestMatcher=0, securityAutoConfigurationRegistrar=0, userDetailsService=2, authenticationFilter=1}
instantiating primary: sprout.aop.advisor.DefaultPointcutFactory
instantiating primary: sprout.security.authentication.password.BCryptPasswordEncoder
instantiating primary: sprout.aop.advisor.AdvisorRegistry
instantiating primary: sprout.security.authentication.ProviderManager
instantiating primary: sprout.config.AppConfig
application.yml loaded successfully.
instantiating primary: sprout.aop.CglibProxyFactory
instantiating primary: sprout.security.web.util.matcher.AntPathRequestMatcher
instantiating primary: sprout.security.autoconfiguration.SecurityAutoConfigurationRegistrar
instantiating primary: sprout.aop.advice.AdviceFactory
instantiating primary: sprout.security.filter.AuthenticationFilter
instantiating primary: sprout.core.filter.cors.CorsFilter
instantiating primary: sprout.security.authentication.DefaultUserDetailsService
instantiating primary: sprout.aop.AspectPostProcessor
instantiating primary: sprout.security.authentication.DaoAuthenticationProvider
instantiating primary: sprout.aop.AopPostInfrastructureInitializer
--- Post-processing List Injections ---
  Populated List<sprout.security.authentication.AuthenticationProvider> in a bean with 1 elements.
  Populated List<sprout.security.web.util.matcher.RequestMatcher> in a bean with 1 elements.
initializers: [sprout.aop.AopPostInfrastructureInitializer@2177849e]
Initializing AspectPostProcessor with basePackages: [sprout, app]
00:19:17.988 [main] INFO org.reflections.Reflections - Reflections took 21 ms to scan 1 urls, producing 104 keys and 434 values
app.test.aop.TestAspect has 1 advisors: [sprout.aop.advisor.DefaultAdvisor@503d687a]
app.test.aop.DemoLoggingAspect has 2 advisors: [sprout.aop.advisor.DefaultAdvisor@273444fe, sprout.aop.advisor.DefaultAdvisor@33bc72d1]
sprout.data.transaction.aop.TransactionalAspect has 1 advisors: [sprout.aop.advisor.DefaultAdvisor@1a75e76a]
sprout.security.authorization.aop.AuthorizationAspect has 1 advisors: [sprout.aop.advisor.DefaultAdvisor@48bb62]
advisorRegistry#getAllAdvisors()[sprout.aop.advisor.DefaultAdvisor@503d687a, sprout.aop.advisor.DefaultAdvisor@273444fe, sprout.aop.advisor.DefaultAdvisor@33bc72d1, sprout.aop.advisor.DefaultAdvisor@1a75e76a, sprout.aop.advisor.DefaultAdvisor@48bb62]
--- Executing Phase: BeanPostProcessor Registration (order=200) ---
--- Executing Phase: Application Bean Initialization (order=300) ---
{handlerMappingImpl=1, requestDispatcher=2, pathVariableArgumentResolver=0, continuationFragmentHandler=0, controllerAdviceRegistry=0, stringPayloadArgumentResolver=0, webSocketContextInitializer=1, pathPatternResolver=0, testUserService=1, defaultWebSocketContainer=0, httpProtocolDetector=0, httpProtocolHandler=4, classPathScanner=0, defaultConnectionManager=0, demoLoggingAspect=0, jdbcTemplate=1, httpHeaderParser=0, dataSourceConfig=0, rawBinaryWebSocketMessageDispatcher=0, headerArgumentResolver=0, benchmarkController=0, testService=0, pathPathVariableArgumentResolver=0, testController=1, queryStringParser=0, controllerAdviceExceptionResolver=2, defaultWebSocketMessageParser=1, jsonWebSocketMessageDispatcher=1, voidResponseResolver=0, securityDispatchHook=0, allHeaderArgumentResolver=0, nioHybridServerStrategy=1, requestLineParser=0, transactionalAspect=1, someController=0, securityContextPropagator=0, finalContinuationFrameHandler=0, objectMapper=1, requestParamArgumentResolver=0, initialBinaryFragmentHandler=0, inputStreamPayloadArgumentResolver=0, testUserController=1, webSocketProtocolHandler=7, webSocketHandlerScanner=2, defaultWebSocketHandshakeHandler=0, dataSource=1, testUserRepository=0, testAspect=0, webSocketEndpointRegistry=0, channelContextPropagator=0, requestMappingRegistry=0, finalBinaryFrameHandler=0, compositeArgumentResolver=0, closeCodeArgumentResolver=0, executorService=1, handlerContextInitializer=1, httpRequestParser=3, objectMapperConfig=0, defaultWebSocketFrameEncoder=0, jsonPayloadArgumentResolver=0, serverConfiguration=0, defaultWebSocketFrameParser=0, requestBodyArgumentResolver=0, someComponent=0, responseEntityResolver=0, objectBodyResponseResolver=0, throwableArgumentResolver=0, defaultEndpointConfig=0, handlerMethodScanner=2, serviceWithDependency=1, webSocketProtocolDetector=0, httpServer=1, someServiceImpl=0, componentWithListDependency=0, handlerMethodInvoker=1, defaultExceptionResolver=0, authorizationAspect=0, finalTextFrameHandler=0, securityContextInitializer=0, jdbcTransactionManager=1, sessionArgumentResolver=0, initialTextFragmentHandler=0, controllerAdviceContextInitializer=1, stringResponseResolver=0}
instantiating primary: sprout.mvc.argument.builtins.PathVariableArgumentResolver
instantiating primary: sprout.server.websocket.framehandler.builtins.ContinuationFragmentHandler
instantiating primary: sprout.mvc.advice.ControllerAdviceRegistry
instantiating primary: sprout.server.argument.builtins.StringPayloadArgumentResolver
instantiating primary: sprout.mvc.mapping.PathPatternResolver
instantiating primary: sprout.server.websocket.DefaultWebSocketContainer
instantiating primary: sprout.server.builtins.HttpProtocolDetector
instantiating primary: sprout.scan.ClassPathScanner
instantiating primary: sprout.server.builtins.DefaultConnectionManager
instantiating primary: app.test.aop.DemoLoggingAspect
instantiating primary: sprout.mvc.http.parser.HttpHeaderParser
instantiating primary: sprout.data.core.DataSourceConfig
instantiating primary: sprout.server.websocket.message.builtins.RawBinaryWebSocketMessageDispatcher
instantiating primary: sprout.mvc.argument.builtins.HeaderArgumentResolver
instantiating primary: app.benchmark.BenchmarkController
instantiating primary: app.test.TestService
Applying AOP proxy to bean: testService (app.test.TestService)
instantiating primary: sprout.server.argument.builtins.PathPathVariableArgumentResolver
instantiating primary: sprout.mvc.http.parser.QueryStringParser
instantiating primary: sprout.mvc.http.resolvers.VoidResponseResolver
instantiating primary: sprout.security.web.SecurityDispatchHook
instantiating primary: sprout.mvc.argument.builtins.AllHeaderArgumentResolver
instantiating primary: sprout.mvc.http.parser.RequestLineParser
instantiating primary: app.test.SomeController
instantiating primary: sprout.security.context.SecurityContextPropagator
instantiating primary: sprout.server.websocket.framehandler.builtins.FinalContinuationFrameHandler
instantiating primary: sprout.mvc.argument.builtins.RequestParamArgumentResolver
instantiating primary: sprout.server.websocket.framehandler.builtins.InitialBinaryFragmentHandler
instantiating primary: sprout.server.argument.builtins.InputStreamPayloadArgumentResolver
instantiating primary: sprout.server.websocket.handler.DefaultWebSocketHandshakeHandler
instantiating primary: app.test.TestUserRepository
instantiating primary: app.test.aop.TestAspect
instantiating primary: sprout.server.websocket.endpoint.WebSocketEndpointRegistry
instantiating primary: sprout.server.context.ChannelContextPropagator
instantiating primary: sprout.mvc.mapping.RequestMappingRegistry
instantiating primary: sprout.server.websocket.framehandler.builtins.FinalBinaryFrameHandler
instantiating primary: sprout.mvc.argument.CompositeArgumentResolver
instantiating primary: sprout.server.argument.builtins.CloseCodeArgumentResolver
instantiating primary: sprout.config.ObjectMapperConfig
instantiating primary: sprout.server.websocket.DefaultWebSocketFrameEncoder
instantiating primary: sprout.server.argument.builtins.JsonPayloadArgumentResolver
instantiating primary: sprout.server.ServerConfiguration
instantiating primary: sprout.server.websocket.DefaultWebSocketFrameParser
instantiating primary: sprout.mvc.argument.builtins.RequestBodyArgumentResolver
instantiating primary: app.test.SomeComponent
instantiating primary: sprout.mvc.http.resolvers.ResponseEntityResolver
instantiating primary: sprout.mvc.http.resolvers.ObjectBodyResponseResolver
instantiating primary: sprout.server.argument.builtins.ThrowableArgumentResolver
instantiating primary: sprout.server.websocket.endpoint.DefaultEndpointConfig
instantiating primary: sprout.server.builtins.WebSocketProtocolDetector
instantiating primary: app.test.SomeServiceImpl
instantiating primary: app.test.ComponentWithListDependency
instantiating primary: sprout.mvc.exception.DefaultExceptionResolver
instantiating primary: sprout.security.authorization.aop.AuthorizationAspect
instantiating primary: sprout.server.websocket.framehandler.builtins.FinalTextFrameHandler
instantiating primary: sprout.security.context.SecurityContextInitializer
instantiating primary: sprout.server.argument.builtins.SessionArgumentResolver
instantiating primary: sprout.server.websocket.framehandler.builtins.InitialTextFragmentHandler
instantiating primary: sprout.mvc.http.resolvers.StringResponseResolver
instantiating primary: sprout.mvc.advice.ControllerAdviceContextInitializer
instantiating primary: sprout.server.builtins.NioHybridServerStrategy
instantiating primary: javax.sql.DataSource
instantiating primary: app.test.TestController
instantiating primary: sprout.mvc.http.parser.HttpRequestParser
instantiating primary: app.test.TestUserService
instantiating primary: sprout.server.websocket.endpoint.WebSocketHandlerScanner
instantiating primary: sprout.mvc.mapping.HandlerMappingImpl
instantiating primary: sprout.mvc.mapping.HandlerMethodScanner
instantiating primary: sprout.mvc.invoke.HandlerMethodInvoker
instantiating primary: com.fasterxml.jackson.databind.ObjectMapper
instantiating primary: sprout.server.RequestExecutorService
instantiating primary: app.test.ServiceWithDependency
instantiating primary: sprout.server.HttpServer
instantiating primary: sprout.data.jdbc.JdbcTransactionManager
instantiating primary: sprout.server.builtins.WebSocketProtocolHandler
instantiating primary: app.test.TestUserController
instantiating primary: sprout.server.websocket.WebSocketContextInitializer
instantiating primary: sprout.mvc.mapping.HandlerContextInitializer
instantiating primary: sprout.mvc.dispatcher.RequestDispatcher
instantiating primary: sprout.mvc.advice.ControllerAdviceExceptionResolver
instantiating primary: sprout.server.websocket.message.DefaultWebSocketMessageParser
instantiating primary: sprout.server.websocket.message.builtins.JsonWebSocketMessageDispatcher
instantiating primary: sprout.data.jdbc.JdbcTemplate
instantiating primary: sprout.data.transaction.aop.TransactionalAspect
instantiating primary: sprout.server.AcceptableProtocolHandler
Execution mode is NIO
--- Post-processing List Injections ---
  Populated List<sprout.security.authentication.AuthenticationProvider> in a bean with 1 elements.
  Populated List<sprout.security.web.util.matcher.RequestMatcher> in a bean with 1 elements.
  Populated List<sprout.server.ProtocolDetector> in a bean with 2 elements.
  Populated List<sprout.server.ProtocolHandler> in a bean with 2 elements.
  Populated List<sprout.server.argument.WebSocketArgumentResolver> in a bean with 7 elements.
  Populated List<sprout.mvc.argument.ArgumentResolver> in a bean with 5 elements.
  Populated List<sprout.server.websocket.endpoint.Encoder> in a bean with 1 elements.
  Populated List<sprout.server.websocket.endpoint.Decoder> in a bean with 0 elements.
  Populated List<app.test.SomeService> in a bean with 1 elements.
  Populated List<sprout.context.ContextPropagator> in a bean with 2 elements.
  Populated List<sprout.server.argument.WebSocketArgumentResolver> in a bean with 7 elements.
  Populated List<sprout.server.websocket.message.WebSocketMessageDispatcher> in a bean with 2 elements.
  Populated List<sprout.server.websocket.framehandler.FrameHandler> in a bean with 6 elements.
  Populated List<sprout.mvc.http.ResponseResolver> in a bean with 4 elements.
  Populated List<sprout.mvc.advice.ResponseAdvice> in a bean with 0 elements.
  Populated List<sprout.core.filter.Filter> in a bean with 2 elements.
  Populated List<sprout.core.interceptor.Interceptor> in a bean with 0 elements.
  Populated List<sprout.mvc.exception.ExceptionResolver> in a bean with 2 elements.
  Populated List<sprout.mvc.dispatcher.DispatchHook> in a bean with 1 elements.
  Populated List<sprout.mvc.http.ResponseResolver> in a bean with 4 elements.
  Populated List<sprout.server.argument.WebSocketArgumentResolver> in a bean with 7 elements.
--- Executing Phase: ContextInitializer Execution (order=400) ---
SecurityContextHolder initialized with ThreadLocal strategy.
102 beans found
found controller: app.benchmark.BenchmarkController
Registering request mapping for /benchmark/cpu with http method GET
Registering request mapping for /benchmark/latency with http method GET
Registering request mapping for /benchmark/hello with http method GET
Registering request mapping for /benchmark/json with http method GET
Registering request mapping for /benchmark/mixed with http method GET
Registering request mapping for /benchmark/health with http method GET
Registering request mapping for /benchmark/cpu-heavy with http method GET
found controller: app.test.TestController
Registering request mapping for /api/test with http method GET
Registering request mapping for /api/auth with http method GET
Registering request mapping for /api/test with http method POST
Registering request mapping for /api/test/{id} with http method GET
Registering request mapping for /api/test/{id}/{name} with http method GET
Registering request mapping for /api with http method GET
found controller: app.test.SomeController
found controller: app.test.TestUserController
Registering request mapping for /api/user/{id} with http method GET
Registering request mapping for /api/user with http method POST
NioHybridServerStrategy event loop started
NioHybridServerStrategy event loop running

```



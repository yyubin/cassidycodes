DI/IoC 컨테이너 리팩토링이 어느정도 되어서, 가져왔다.

스프링과 유사하게, 정확히는 스프링 부트와 유사하게 만드려고 했고 내가 구현한 부분을 설명하고, 스프링의 실제 구현과 다른점을 살펴본 후, 테스트로 검증을 해보는 순서로 진행하게 될 것 같다. 

스프링에선 `@ComponentScan`이 붙은 클래스와 동일 레벨 혹은 하위 패키지들을 전부 뒤져서 `@Component`(싱글톤으로 관리할 빈)이 붙은 것들을 미리 전부 생성한다. 실제로, `@Controller`나 `@Service`와 같은 어노테이션 안에 메타 어노테이션으로 `@Component`가 존재한다. 

그리고 이것들을 하나씩 읽으며 의존성을 파악한 후 생성해 줘야 한다. 이때 중요한 건 **생성과 동시에 의존성을 주입**한다는 것이다. 이게 보장되어야 객체의 불변성이 더욱 견고해진다. setter로 주입할거면 사실 구현은 훨씬 간단하다..

그러면, 어쩌면 당연하게도 의존성 관계를 미리 스프링이 알고 있어야 한다는 것이다. 다른 컴포넌트가 생성하기 전인데 해당 컴포넌트를 의존성으로 요구하는 경우를 생각해보면 알 수 있다. 실제로 스프링에선 아주 똑똑한 알고리즘을 사용하여 구성하는데, 나는 간단하게 *위상정렬* 알고리즘을 사용하여 구현해보았다.

> 위상 정렬(Topology Sort)은 '순서가 정해져있는 작업'을 차례로 수행해야 할 때 그 순서를 결정해주기 위해 사용하는 알고리즘이다.


```java
package sprout.beans;

import java.lang.reflect.Constructor;

public record BeanDefinition(
        Class<?> type,
        Constructor<?> constructor,
        Class<?>[] dependencies,
        boolean proxyNeeded
) {

    public BeanDefinition(Class<?> type, boolean proxyNeeded) throws NoSuchMethodException {
        this(type, type.getDeclaredConstructor(), new Class<?>[0], proxyNeeded);
    }
}
```
```java
package sprout.beans.internal;

import sprout.beans.BeanDefinition;

import java.lang.reflect.Modifier;
import java.util.*;


public class BeanGraph {
    private final Map<Class<?>, BeanDefinition> nodeMap = new HashMap<>();
    private final Map<Class<?>, List<Class<?>>> edges = new HashMap<>();
    private final Map<Class<?>, Integer> indegree = new HashMap<>();

    public BeanGraph(Collection<BeanDefinition> definitions) {
        definitions.forEach(d -> {
            nodeMap.put(d.type(), d);
            indegree.putIfAbsent(d.type(), 0);
        });
        buildEdges();
    }

    public List<BeanDefinition> topologicallySorted() {
        Deque<Class<?>> q = new ArrayDeque<>();
        indegree.forEach((cls, deg) -> {
            if (deg == 0) q.add(cls);
        });

        List<BeanDefinition> ordered = new ArrayList<>(nodeMap.size());
        while (!q.isEmpty()) {
            Class<?> cur = q.poll();
            ordered.add(nodeMap.get(cur));
            for (Class<?> next : edges.getOrDefault(cur, List.of())) {
                int d = indegree.merge(next, -1, Integer::sum);
                if (d == 0) q.add(next);
            }
        }

        if (ordered.size() != nodeMap.size()) {
            throw new CircularDependencyException("Circular dependency detected among application beans");
        }
        return ordered;
    }


    private void buildEdges() {
        for (BeanDefinition def : nodeMap.values()) {
            for (Class<?> dep : def.dependencies()) {
                // 수정된 로직: 의존성 타입이 인터페이스인 경우, 해당 인터페이스를 구현하는 빈을 찾음
                boolean dependencyFoundInNodeMap = false;
                Class<?> actualDependencyType = null; // 실제로 nodeMap에 존재하는 구현체 타입

                if (nodeMap.containsKey(dep)) { // 직접적으로 dep 타입이 nodeMap에 있는 경우 (대부분 구체 클래스)
                    dependencyFoundInNodeMap = true;
                    actualDependencyType = dep;
                } else if (dep.isInterface() || Modifier.isAbstract(dep.getModifiers())) {
                    // 의존성 타입이 인터페이스 또는 추상 클래스인 경우
                    // nodeMap에 있는 BeanDefinition들 중에서 이 인터페이스/추상 클래스를 구현하는 (또는 상속하는) 빈을 찾음
                    for (Class<?> candidateType : nodeMap.keySet()) {
                        if (dep.isAssignableFrom(candidateType)) { // candidateType이 dep를 구현/상속한다면
                            // 이 경우, 인터페이스에 대한 의존성은 해당 인터페이스의 "구현체"에 대한 의존성이 됨
                            // 여러 구현체가 있을 수 있지만, 위상 정렬 목적에서는 어느 하나가 먼저 생성되면 되므로
                            // 일단 찾은 첫 번째 구현체를 실제 의존성으로 간주함

                            actualDependencyType = candidateType;
                            dependencyFoundInNodeMap = true;
                            break;
                        }
                    }
                }

                if (!dependencyFoundInNodeMap) {
                    // 컨테이너가 관리하는 빈 중 의존성(또는 그 구현체)을 찾지 못한 경우
                    // (외부 의존성이거나, 잘못된 의존성)
                    continue;
                }

                // 이제 actualDependencyType이 nodeMap에 있는 실제 의존성 빈의 타입
                edges.computeIfAbsent(actualDependencyType, k -> new ArrayList<>()).add(def.type());
                indegree.merge(def.type(), 1, Integer::sum);
            }
        }
    }

    public static class CircularDependencyException extends RuntimeException {
        public CircularDependencyException(String message) {
            super(message);
        }
    }
}
```
## BeanDefinition
- type: Bean의 실제 타입 (예: UserService.class)
- constructor: 사용할 생성자 (주로 기본 생성자 or 의존성 생성자)
- dependencies: 생성자 파라미터로 요구되는 의존 타입들
- proxyNeeded: 프록시가 필요한 경우 true (AOP 구현 시 사용)

이 구조는 Bean을 정의하는 메타데이터이며, 그래프를 구성할 때 노드 정보로 사용한다.

## BeanGraph
필드의 의미는 아래와 같다.
- nodeMap: 실제 Bean의 타입 → 정의 정보
- edges: 의존성 방향 그래프. A → B는 "B가 A를 필요로 함" 의미
- indegree: 위상 정렬용 진입 차수

의존성이 인터페이스 또는 추상 클래스일 때도 적절한 구현체를 그래프에 연결하도록 신경써서 구현했다..

아래에서 테스트 코드로 검증하겠지만 이 덕분에 아래와 같은 코드에서도 잘 작동한다
```java
public class UserService {
    public UserService(UserRepository repo) { ... }
}
public interface UserRepository { ... }
public class MemoryUserRepository implements UserRepository { ... }
```

`topologicallySorted()` 메서드는 위상 정렬 알고리즘을 통해 Bean을 순서대로 생성할 수 있도록 리스트를 반환한다. 진입 차수가 0인(아무 의존성이 없는) 노드 부터 생성 시작하도록 한 후, 생성 가능한 Bean부터 차례로 의존 관계를 해소한다. 만약 모두 생성되지 못한 경우는 `CircularDependencyException`을 발생시키는데 이는 **순환 참조**이다.

여기까지에서 사실상 하는 것은 빈 생성 "순서"만을 결정하는 게 전부이다.
특별히 고려한 것은, 만약 인터페이스나 추상 클래스로 의존성을 받길 원하는 경우와 순환 참조 발생 여부를 확인하는 것이었다.

## 스프링과 다른점

지금 따라한 `BeanDefinition`도 사실상 스프링에 실제 존재하는 구현체인데, 실제 스프링에선 속성 값(key–value) PropertyBag 패턴(정확히는 `MutablePropertyValues` + `ConstructorArgumentValues`을 사용하여 맵 구조를 사용한다고 한다..)을 사용하며 모든 필드가 Optional이다. MutablePropertyValues, ConstructorArgumentValues 등으로 런타임에 자유롭게 추가 및 수정도 지원한다. 더불어 나는 ClassName을 식별자로 사용하는데 스프링에선 bean-name을 ID로 사용하여 하나의 클래스에서 여러 빈을 가질 수 있도록 지원한다.

의존성 탐색같은 경우도 지금 내가 만든 것은 생성자의 파라미터를 조사하는 것인데 실제론 파라미터+어노테이션+제네릭 타입까지 고려한다. 코드를 보면 `List<Interface>`와 같은 경우까진 지원하지만 스프링은 `Map<String, BeanType>`같이 컬렉션 주입도 자유롭게 사용 가능하다. 그리고 인터페이스나 추상 메서드를 주입할 땐, 모든 후보를 모아 필터링 하는데, ① `@Qualifier` ② `@Primary` ③ 우선순위 ④ 이름 일치 를 거쳐 최종 1개를 선택한다.

스프링에선 사실 위상 정렬을 사용하지 않고, 수요를 기반으로한 재귀 생성을 한다. createBean → resolveDependency → 필요하면 다른 bean 재귀 생성하는 식이다. 만약 위상 정렬에 실패하면 난 순환 참조 익셉션을 발생시켰는데, 스프링에서는 필드나 세터 주입시 proxy로 대체하여 순환 참조가 발생하지 않을 수 있다. 다만 필드나 세터 주입이 사실 권장 사항이 아니기 때문에 애초에 안만들었다..

사실상 이것 말고도, `DefaultListableBeanFactory` 에서 의존성을 탐색한 후 충돌을 처리하고, `AbstractAutowireCapableBeanFactory` 구현체에서 빈을 생성하고 의존성을 해결한다. 애초에 빈도 `BeanDefinitionRegistryPostProcessor`를 사용하여 동적으로 추가할 수도 있다. 기능이 추후에 추가되어도 key-value 형태이기에 무한으로 확장 가능하다.. 난 당장 AOP만 추가로 처리하려고 해도 `BeanDefinition`의 필드를 추가해야 한다는 단점이 있다.

---
다음은, 이제 서버 시작 후, 패키지 이름으로 클래스를 읽어와 생성 및 주입을 실질적으로 하는 단계를 살펴보자.

> 주요 개념 요약
1. @ComponentScan → ClassPathScanner가 BeanDefinition 목록 생성
2. SproutApplication.run()이 Container를 부트스트랩하고 HTTP 서버를 꺼내 구동
3. Container는 위상 정렬된 BeanDefinition을 순서대로 인스턴스화하면서 목록·인터페이스 주입까지 처리

```java

import sprout.beans.annotation.ComponentScan;
import sprout.boot.SproutApplication;

@ComponentScan(basePackages = {"app", "sprout"})
public class Main {

    public static void main(String[] args) throws Exception {
        SproutApplication.run(Main.class);
    }

}
```
```java
package sprout.boot;

import sprout.beans.annotation.ComponentScan;
import sprout.context.Container;
import sprout.server.HttpServer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class SproutApplication {

    public static void run(Class<?> primarySource) throws Exception { // Class<?> 를 인자로 받도록 변경
        // 1) 패키지 목록 로드 (ComponentScan 어노테이션에서 추출)
        List<String> packages = getPackagesToScan(primarySource);

        // 2) DI 컨테이너 부트스트랩
        Container ctx = Container.getInstance();
        ctx.bootstrap(packages);

        // 3) 서버 구동
        HttpServer server = ctx.get(HttpServer.class);
        server.start(8080);
    }

    private static List<String> getPackagesToScan(Class<?> primarySource) {
        ComponentScan componentScan = primarySource.getAnnotation(ComponentScan.class);
        if (componentScan != null) {
            List<String> packages = new ArrayList<>();
            packages.addAll(Arrays.asList(componentScan.value()));
            packages.addAll(Arrays.asList(componentScan.basePackages()));
            if (!packages.isEmpty()) {
                return packages;
            }
        }
        return List.of(primarySource.getPackage().getName());
    }
}
```
```java
package sprout.context;

import app.service.MemberAuthService;
import org.reflections.scanners.Scanners;
import org.reflections.util.ClasspathHelper;
import org.reflections.util.ConfigurationBuilder;
import org.reflections.util.FilterBuilder;
import sprout.aop.MethodProxyHandler;
import sprout.beans.BeanDefinition;
import sprout.beans.internal.BeanGraph;
import sprout.scan.ClassPathScanner;

import java.lang.reflect.Modifier;
import java.util.*;

public class Container {
    private static Container INSTANCE;
    private final Map<Class<?>, Object> singletons = new HashMap<>();
    private final List<PendingListInjection> pendingListInjections = new ArrayList<>();
    private final ClassPathScanner scanner;

    private static class PendingListInjection {
        final Object beanInstance; // List를 주입받을 빈의 실제 인스턴스
        final Class<?> genericType; // List<T>의 T 타입
        // 생성자 주입 시에는 Parameter 정보를 저장하여 해당 List 객체를 다시 찾아서 채워야 한다
        // 현재는 생성자에 List 인스턴스가 이미 넘어간 상태이므로,
        // 그 List 인스턴스 자체를 저장해서 나중에 addAll하는게 가장 편할 것 같다
        final List<Object> listToPopulate; // 생성자를 통해 주입된 비어있는 List 인스턴스

        PendingListInjection(Object beanInstance, List<Object> listToPopulate, Class<?> genericType) {
            this.beanInstance = beanInstance;
            this.listToPopulate = listToPopulate;
            this.genericType = genericType;
        }
    }

    private Container() {
        this.scanner = new ClassPathScanner();
    }
    public static synchronized Container getInstance() { return INSTANCE == null ? (INSTANCE = new Container()) : INSTANCE; }

    public void reset() {
        singletons.clear();
        pendingListInjections.clear();
    }

    public void bootstrap(List<String> basePackages) {
        ConfigurationBuilder configBuilder = new ConfigurationBuilder();
        for (String pkg : basePackages) {
            configBuilder.addUrls(ClasspathHelper.forPackage(pkg));
        }
        configBuilder.addScanners(Scanners.TypesAnnotated, Scanners.SubTypes);
        configBuilder.addClassLoaders(ClasspathHelper.contextClassLoader(), ClasspathHelper.staticClassLoader());

        FilterBuilder filter = new FilterBuilder();
        for (String pkg : basePackages) {
            filter.includePackage(pkg); // 해당 패키지 또는 하위 패키지에 속하는 클래스만 포함
        }
        configBuilder.filterInputsBy(filter);

        Collection<BeanDefinition> defs = scanner.scan(configBuilder);
        List<BeanDefinition> order = new BeanGraph(defs).topologicallySorted();
        order.forEach(this::instantiatePrimary);
        postProcessListInjections();
    }

    public <T> T get(Class<T> type) {
        // 1. 정확한 타입으로 등록된 빈을 먼저 찾기
        Object bean = singletons.get(type);
        if (bean != null) {
            return type.cast(bean);
        }

        // 2. 인터페이스나 추상 클래스를 요청했을 경우 구현체를 찾기
        if (type.isInterface() || Modifier.isAbstract(type.getModifiers())) {
            List<Object> candidates = new ArrayList<>();
            for (Object existingBean : singletons.values()) {
                if (type.isAssignableFrom(existingBean.getClass())) {
                    candidates.add(existingBean);
                }
            }

            if (candidates.size() == 1) {
                return type.cast(candidates.get(0));
            } else if (candidates.size() > 1) {
                throw new RuntimeException("No unique bean of type " + type.getName() + " found. Found " + candidates.size() + " candidates.");
            }
        }

        throw new RuntimeException("No bean of type " + type.getName() + " found in the container.");
    }

    public Collection<Object> beans() { return singletons.values(); }

    private void instantiatePrimary(BeanDefinition def) {
        if (singletons.containsKey(def.type())) return;
        System.out.println("instantiating primary: " + def.type().getName());

        try {
            Class<?>[] paramTypes = def.dependencies();
            var params = def.constructor().getParameters();
            Object[] deps = new Object[paramTypes.length];

            for (int i = 0; i < paramTypes.length; i++) {
                Class<?> paramType = paramTypes[i];

                if (List.class.isAssignableFrom(paramType)) {
                    List<Object> emptyList = new ArrayList<>();
                    deps[i] = emptyList;

                    var genericType = (Class<?>) ((java.lang.reflect.ParameterizedType) params[i].getParameterizedType())
                            .getActualTypeArguments()[0];

                    pendingListInjections.add(new PendingListInjection(null, emptyList, genericType));
                    System.out.println("  " + def.type().getName() + " needs List<" + genericType.getName() + ">, added to pending.");

                } else {
                    deps[i] = get(paramType);
                }
            }

            Object bean = def.constructor().newInstance(deps);

            // 프록시
            // if (def.proxyNeeded()) {
            //     bean = MethodProxyHandler.createProxy(bean, get(MemberAuthService.class));
            // }

            register(def.type(), bean);
            for (Class<?> iface : def.type().getInterfaces()) {
                register(iface, bean);
            }

        } catch (Exception e) {
            throw new RuntimeException("Bean instantiation failed for " + def.type().getName(), e);
        }
    }

    private void postProcessListInjections() {
        System.out.println("--- Post-processing List Injections ---");
        for (PendingListInjection pending : pendingListInjections) {
            Set<Object> uniqueBeansForList = new HashSet<>(); // Set을 사용하여 중복 방지
            for (Object bean : singletons.values()) {
                if (pending.genericType.isAssignableFrom(bean.getClass())) {
                    uniqueBeansForList.add(bean);
                }
            }

            pending.listToPopulate.clear();
            pending.listToPopulate.addAll(uniqueBeansForList);

            System.out.println("  Populated List<" + pending.genericType.getName() + "> in a bean with " + uniqueBeansForList.size() + " elements.");
        }
    }

    private void register(Class<?> key, Object bean) { singletons.put(key, bean); }
}
```
```java
package sprout.scan;

import org.reflections.scanners.SubTypesScanner;
import org.reflections.scanners.TypeAnnotationsScanner;
import org.reflections.util.ConfigurationBuilder;
import org.reflections.util.FilterBuilder;
import sprout.aop.annotation.BeforeAuthCheck;
import sprout.beans.BeanDefinition;
import org.reflections.Reflections;
import sprout.beans.annotation.*;

import java.lang.annotation.Annotation;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class ClassPathScanner {
    public Collection<BeanDefinition> scan(ConfigurationBuilder configBuilder) {
        Reflections r = new Reflections(configBuilder);

        Set<Class<?>> componentCandidates = new HashSet<>();
        componentCandidates.addAll(r.getTypesAnnotatedWith(Component.class));
        componentCandidates.addAll(r.getTypesAnnotatedWith(Controller.class));
        componentCandidates.addAll(r.getTypesAnnotatedWith(Service.class));
        componentCandidates.addAll(r.getTypesAnnotatedWith(Repository.class));

        Set<Class<?>> concreteBeanTypes = componentCandidates.stream()
                .filter(clazz -> !clazz.isInterface() && !clazz.isAnnotation() && !Modifier.isAbstract(clazz.getModifiers()))
                .collect(Collectors.toSet());
        Set<Class<?>> knownTypes = new HashSet<>(concreteBeanTypes);

        List<BeanDefinition> definitions = new ArrayList<>();

        for (Class<?> clazz : knownTypes) {
            try {
                Constructor<?> ctor = resolveUsableConstructor(clazz, knownTypes);
                boolean proxy = clazz.isAnnotationPresent(BeforeAuthCheck.class);
                definitions.add(new BeanDefinition(clazz, ctor, ctor.getParameterTypes(), proxy));
            } catch (NoSuchMethodException e) {
                throw new IllegalStateException("No usable constructor for class " + clazz.getName(), e);
            }
        }
        definitions.forEach(d -> System.out.println("→ "+ d.type()));

        return definitions;
    }

    private Constructor<?> resolveUsableConstructor(Class<?> clazz, Set<Class<?>> knownTypes) throws NoSuchMethodException {
        return Arrays.stream(clazz.getDeclaredConstructors())
                .filter(constructor -> Arrays.stream(constructor.getParameterTypes())
                        .allMatch(param -> isResolvable(param, knownTypes)))
                .max(Comparator.comparingInt(Constructor::getParameterCount))
                .orElseThrow(() -> new NoSuchMethodException("No usable constructor for " + clazz.getName()));
    }

    private boolean isResolvable(Class<?> paramType, Set<Class<?>> knownTypes) {
        if (knownTypes.contains(paramType)) {
            return true;
        }
        if (List.class.isAssignableFrom(paramType)) {
            return true; // 그냥 넘기고, 생성할 때 따로 해석
        }
        if (paramType.isInterface()) {
            return knownTypes.stream().anyMatch(c -> paramType.isAssignableFrom(c));
        }
        return false;
    }
}
```
### 진입점
```java
@ComponentScan(basePackages = {"app", "sprout"})
public class Main { … }
```
스프링과 동일하게 *패키지 루트*를 지정하게 하여 **자동 스캔**을 트리거한다. 직접 클래스 명시 대신, 컨벤션 기반 구성이 가능하게 하고 싶었다. 더불어 `SproutApplication.run(Main.class)` 덕분에 실행 클래스 하나로 서버까지 뜨는 Boot 경험을 모방해보고자 하였다.

### `SproutApplication.run()` – 미니 SpringApplication
해당하는 부분은 단계별로 나누어 설명하겠다.
1. **`getPackagesToScan()`**
이는 `@ComponentScan`를 파싱하여 패키지 목록을 확보한다. 스프링의 `SpringApplication#getPrimarySources()` + `ComponentScanAnnotationParser` 와 대응된다고 볼 수 있을 것 같다.
2. **`Container.bootstrap()`**
	DI 컨테이너를 초기화 시킨다. 스프링의 `AnnotationConfigApplicationContext#refresh()` API와 대응된다.
3. **`HttpServer` 빈 꺼내기**
`ctx.get(HttpServer.class).start(8080)`로 서버를 실행한다. 아직 리팩토링을 하진 않았지만 실제로 존재하는 서버다.. 스프링에선 `EmbeddedWebServerApplicationContext`으로 서버를 구동한다.

### `ClassPathScanner` – Reflections 기반 스캐너
```java
Reflections r = new Reflections(configBuilder);
Set<Class<?>> components = r.getTypesAnnotatedWith(Component.class) …;
```
이는 Reflections 라이브러리로 어노테이션 스캔을 간단하게 해결해보고자 하였다. JDK 기본 ClassLoader만으로도 충분할 것 같았기 때문이다. 또한 `resolveUsableConstructor()` 메서드를 사용하여 현재 주입 가능한 생성자만 골라 컴파일 타임 오류를 부트 시점으로 앞당겼다. 

스프링에선 `ClassPathBeanDefinitionScanner`가 메타 어노테이션까지 분석한다. 앞서 말한대로다. 이를 내부적으로 ASM을 사용하여 처리한다고 하는데(Spring은 MetadataReader → ASM 으로 클래스 메타데이터만 읽어 실제 Class 로딩 없이 스캔), 너무 어려워질 것 같아서 보류해뒀다. Spring과 다르게 나는 각각의 어노테이션(`@Service`, `@Controller` 등)도 전부 검사한다..

그리고 구체 클래스만 스캔하도록 했다. interface나 abstract 자체를 빈으로 등록하지 않는다. 물론 추후에 구현체를 넣어 interface로도 동작할 수 있게 조치해뒀지만 스캔 레벨에서 비교적 가볍다.


### `Container.bootstrap()` – Bean 그래프 → 인스턴스화

1. **스캔 결과 수집 후 BeanGraph 위상 정렬** 

해당 단계에서 순서를 선결정 하므로 생성 중 런타임 순환 참조가 발생하지 않는다. 또, 단일 인터페이스나 추상클래스에 여러 구현체를 넣을 경우 `List<interface>` 형식으로는 주입이 가능하지만 `interface`와 같이 단일한 경우엔 의도없음으로 판단하고 부트 시점에 예외를 발생시키도록 하였다.

2. **`instantiatePrimary()`**

이 단계에선 **생성자 주입만 지원**하여 불변 설계를 장려하였다. 만약 파라미터가 `List<T>` 일 경우 먼저 빈 컬렉션을 주입한 후 부트스트랩 이후 후처리로 채웠다.

 이렇게 하지 않으면 위상 정렬 단계에서 `List` 의존성을 가진 경우 차수를 조절한다던가 하는 식으로 굉장히 복잡해질 우려가 있었기 때문이다. 의존하는 타입을 전부 미리 생성한 뒤에 생성할 수 있도록 조절을 해야만 한다. (이 과정에서 해당 타입을 또 전부 읽어와 처리하거나 리스트에 따른 가중치를 준다고 하면 복잡성을 크게 야기할 위험이 있다고 생각했다.) 간단하게, 위상정렬 시 indegree 를 건드리지 않기 위해 List 주입은 post-processing으로 미룬 것이다. 실제로 스프링에서도 이런 경우 추후에 처리(지연 처리)하는 구조로 구성되어 있기에 그렇게 구현했다.

3. **`postProcessListInjections()`**  

스프링의 `ObjectProvider<List>` 대신 직접 간단하게 만든 리스트를 사용하여 `List<T>` 파라미터를 후처리 하는 메서드이다. 중복 방지를 위해 Set을 사용하여 같은 타입 빈이 여러 개여도 안정적이다. 중복 처리를 하지 않을 경우 `Service`를 구현한 `ServiceImpl` 둘 다 주입 가능한 자리로 판정하게 되는 경우가 있었다.


---
# 테스트 코드
해당 기능들을 검증하기 위해 아래와 같은 테스트 코드를 사용하였다.

```java
package sprout.beans.internal;

import org.junit.jupiter.api.Test;
import sprout.beans.BeanDefinition;

import java.lang.reflect.Constructor;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class BeanGraphTest {

    // 테스트를 위한 가상의 클래스들
    static class IndependentBean { // 의존성 없음
        public IndependentBean() {}
    }

    static class DependentBeanA { // BeanB에 의존
        public DependentBeanA(DependentBeanB b) {}
    }

    static class DependentBeanB { // BeanC에 의존
        public DependentBeanB(DependentBeanC c) {}
    }

    static class DependentBeanC { // 의존성 없음
        public DependentBeanC() {}
    }

    static class MultiDependentBean { // BeanA, BeanB에 의존
        public MultiDependentBean(DependentBeanA a, DependentBeanB b) {}
    }

    interface MyInterface {}
    static class MyImplementation implements MyInterface { // MyInterface 구현
        public MyImplementation() {}
    }
    static class InterfaceDependentBean { // MyInterface에 의존
        public InterfaceDependentBean(MyInterface myInterface) {}
    }

    // 순환 참조 테스트를 위한 클래스들
    static class CircularA {
        public CircularA(CircularB b) {}
    }

    static class CircularB {
        public CircularB(CircularA a) {}
    }

    private Collection<BeanDefinition> createBeanDefinitions(Class<?>... classes) throws NoSuchMethodException {
        List<BeanDefinition> defs = new ArrayList<>();
        for (Class<?> clazz : classes) {
            Constructor<?> ctor = null;
            Class<?>[] dependencies = new Class<?>[0];
            try {
                // 가장 파라미터가 많은 생성자를 찾으려는 시도 (혹은 기본 생성자)
                ctor = Arrays.stream(clazz.getDeclaredConstructors())
                        .max(Comparator.comparingInt(Constructor::getParameterCount))
                        .orElse(clazz.getDeclaredConstructor());
                dependencies = ctor.getParameterTypes();
            } catch (NoSuchMethodException e) {
                
                if (clazz.getDeclaredConstructors().length > 0) {
                    ctor = clazz.getDeclaredConstructors()[0];
                    dependencies = ctor.getParameterTypes();
                } else {
                    throw e;
                }
            }
            defs.add(new BeanDefinition(clazz, ctor, dependencies, false)); // proxyNeeded는 false로 고정
        }
        return defs;
    }

    @Test
    void topologicallySorted_shouldReturnCorrectOrderForSimpleDependencies() throws NoSuchMethodException {
        // 의존성: C -> B -> A
        // 예상 순서: C, B, A
        Collection<BeanDefinition> definitions = createBeanDefinitions(
                DependentBeanA.class,
                DependentBeanB.class,
                DependentBeanC.class,
                IndependentBean.class // 의존성 없는 빈도 포함
        );

        BeanGraph graph = new BeanGraph(definitions);
        List<BeanDefinition> ordered = graph.topologicallySorted();

        System.out.println("Simple Dependencies Order:");
        ordered.forEach(d -> System.out.println("  " + d.type().getSimpleName()));

        // 의존성 없는 빈은 순서에 구애받지 않지만, C, B, A의 상대적 순서는 유지되어야 함
        int indexC = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(DependentBeanC.class)).findFirst().orElse(null));
        int indexB = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(DependentBeanB.class)).findFirst().orElse(null));
        int indexA = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(DependentBeanA.class)).findFirst().orElse(null));

        assertTrue(indexC < indexB, "DependentBeanC should come before DependentBeanB");
        assertTrue(indexB < indexA, "DependentBeanB should come before DependentBeanA");
    }

    @Test
    void topologicallySorted_shouldHandleMultiDependencies() throws NoSuchMethodException {
        // 의존성: C -> B, B -> A, A -> MultiDependentBean
        //       B -> MultiDependentBean
        // 예상 순서 (상대적): C, B, A, MultiDependentBean (혹은 C, B, MultiDependentBean, A)
        // MultiDependentBean은 A와 B 모두에 의존하므로, A와 B가 모두 생성된 뒤에 와야 함
        Collection<BeanDefinition> definitions = createBeanDefinitions(
                MultiDependentBean.class,
                DependentBeanA.class,
                DependentBeanB.class,
                DependentBeanC.class
        );

        BeanGraph graph = new BeanGraph(definitions);
        List<BeanDefinition> ordered = graph.topologicallySorted();

        System.out.println("Multi Dependencies Order:");
        ordered.forEach(d -> System.out.println("  " + d.type().getSimpleName()));

        int indexC = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(DependentBeanC.class)).findFirst().orElse(null));
        int indexB = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(DependentBeanB.class)).findFirst().orElse(null));
        int indexA = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(DependentBeanA.class)).findFirst().orElse(null));
        int indexMulti = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(MultiDependentBean.class)).findFirst().orElse(null));

        assertTrue(indexC < indexB, "DependentBeanC should come before DependentBeanB");
        assertTrue(indexB < indexA || indexB < indexMulti, "DependentBeanB should come before DependentBeanA or MultiDependentBean");
        assertTrue(indexA < indexMulti, "DependentBeanA should come before MultiDependentBean");
        assertTrue(indexB < indexMulti, "DependentBeanB should come before MultiDependentBean"); // MultiDependentBean은 A, B 모두 뒤에 와야 함
    }

    @Test
    void topologicallySorted_shouldHandleInterfaceDependencies() throws NoSuchMethodException {
        // 의존성: MyInterface -> InterfaceDependentBean
        // 예상 순서: MyImplementation, InterfaceDependentBean
        Collection<BeanDefinition> definitions = createBeanDefinitions(
                InterfaceDependentBean.class,
                MyImplementation.class
        );

        BeanGraph graph = new BeanGraph(definitions);
        List<BeanDefinition> ordered = graph.topologicallySorted();

        System.out.println("Interface Dependencies Order:");
        ordered.forEach(d -> System.out.println("  " + d.type().getSimpleName()));

        // MyImplementation은 MyInterface를 구현하므로, MyImplementation이 InterfaceDependentBean보다 먼저 와야 함
        int indexImpl = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(MyImplementation.class)).findFirst().orElse(null));
        int indexDep = ordered.indexOf(definitions.stream().filter(d -> d.type().equals(InterfaceDependentBean.class)).findFirst().orElse(null));

        assertTrue(indexImpl < indexDep, "MyImplementation should come before InterfaceDependentBean");
    }

    @Test
    void topologicallySorted_shouldThrowExceptionForCircularDependency() throws NoSuchMethodException {
        // A -> B -> A 순환 참조
        Collection<BeanDefinition> definitions = createBeanDefinitions(
                CircularA.class,
                CircularB.class
        );

        BeanGraph graph = new BeanGraph(definitions);

        System.out.println("Circular Dependency Test:");
        // CircularDependencyException이 발생하는지 확인
        assertThrows(BeanGraph.CircularDependencyException.class, () -> {
            graph.topologicallySorted();
        }, "CircularDependencyException should be thrown for circular dependencies");
    }

}
```

```java
package sprout.scan;

import app.test.*;
import org.junit.jupiter.api.Test;
import org.reflections.scanners.Scanners;
import org.reflections.util.ClasspathHelper;
import org.reflections.util.ConfigurationBuilder;
import sprout.beans.BeanDefinition;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class ClassPathScannerTest {

    private ConfigurationBuilder createConfigBuilder(String basePackage) {
        return new ConfigurationBuilder()
                .addUrls(ClasspathHelper.forPackage(basePackage))
                .addScanners(Scanners.TypesAnnotated, Scanners.SubTypes)
                .addClassLoaders(ClasspathHelper.contextClassLoader(), ClasspathHelper.staticClassLoader());
    }

    @Test
    void scan_shouldDetectDirectComponentClasses() {
        ClassPathScanner scanner = new ClassPathScanner();
        ConfigurationBuilder configBuilder = createConfigBuilder("app.test"); // app.test 패키지 스캔
        Collection<BeanDefinition> defs = scanner.scan(configBuilder);

        List<Class<?>> componentTypes = defs.stream()
                .map(BeanDefinition::type)
                .collect(Collectors.toList());

        System.out.println("Detected Components (Direct): " + componentTypes);
        // SomeComponent는 @Component 직접 붙어있음
        assertTrue(componentTypes.contains(SomeComponent.class));
    }

    @Test
    void scan_shouldDetectMetaAnnotatedComponentClasses() {
        ClassPathScanner scanner = new ClassPathScanner();
        ConfigurationBuilder configBuilder = createConfigBuilder("app.test");
        Collection<BeanDefinition> defs = scanner.scan(configBuilder);

        List<Class<?>> componentTypes = defs.stream()
                .map(BeanDefinition::type)
                .collect(Collectors.toList());

        System.out.println("Detected Components (Meta-Annotated): " + componentTypes);
        // SomeServiceImpl은 @Service 어노테이션을 가지고 있고, @Service는 @Component를 메타 어노테이션으로 가짐
        assertTrue(componentTypes.contains(SomeServiceImpl.class));
    }

    @Test
    void scan_shouldGenerateCorrectBeanDefinitions() {
        ClassPathScanner scanner = new ClassPathScanner();
        ConfigurationBuilder configBuilder = createConfigBuilder("app.test");
        Collection<BeanDefinition> defs = scanner.scan(configBuilder);

        // SomeServiceImpl의 BeanDefinition 확인 (생성자, 의존성)
        BeanDefinition serviceImplDef = defs.stream()
                .filter(d -> d.type().equals(SomeServiceImpl.class))
                .findFirst()
                .orElseThrow(() -> new AssertionError("SomeServiceImpl BeanDefinition not found"));

        // SomeServiceImpl은 기본 생성자이므로 dependencies가 비어있어야 함
        assertEquals(0, serviceImplDef.dependencies().length);
        assertFalse(serviceImplDef.proxyNeeded()); // 프록시가 필요 없는지 확인

        // ServiceWithDependency의 BeanDefinition 확인
        BeanDefinition serviceWithDepDef = defs.stream()
                .filter(d -> d.type().equals(ServiceWithDependency.class))
                .findFirst()
                .orElseThrow(() -> new AssertionError("ServiceWithDependency BeanDefinition not found"));

        // ServiceWithDependency는 SomeService에 의존하므로 dependencies에 SomeService.class가 있어야 함
        assertEquals(1, serviceWithDepDef.dependencies().length);
        assertEquals(SomeService.class, serviceWithDepDef.dependencies()[0]);
    }

    @Test
    void scan_shouldFilterOutNonConcreteClasses() {
        ClassPathScanner scanner = new ClassPathScanner();
        ConfigurationBuilder configBuilder = createConfigBuilder("app.test");
        Collection<BeanDefinition> defs = scanner.scan(configBuilder);

        List<Class<?>> componentTypes = defs.stream()
                .map(BeanDefinition::type)
                .collect(Collectors.toList());

        // 인터페이스는 빈으로 등록되지 않아야 함
        assertFalse(componentTypes.contains(SomeService.class));
        // 어노테이션 타입 자체는 빈으로 등록되지 않아야 함
        assertFalse(componentTypes.contains(sprout.beans.annotation.Service.class));
    }
}
```
```java
package sprout.context;

import app.test.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import sprout.beans.internal.BeanGraph;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ContainerTest {

    private Container container;

    @BeforeEach
    void setUp() {
        container = Container.getInstance();
        container.reset();
    }

    @Test
    void container_shouldInstantiateAllBeans() {
        container.bootstrap(List.of("app.test")); // app.test 패키지 스캔

        // 각 컴포넌트들이 빈으로 잘 생성되었는지 확인
        assertNotNull(container.get(SomeComponent.class));
        assertNotNull(container.get(SomeServiceImpl.class));
        assertNotNull(container.get(ServiceWithDependency.class));
        assertNotNull(container.get(ComponentWithListDependency.class));
    }

    @Test
    void container_shouldPerformConstructorInjection() {
        container.bootstrap(List.of("app.test"));

        ServiceWithDependency serviceWithDep = container.get(ServiceWithDependency.class);
        assertNotNull(serviceWithDep);
        // 의존성이 제대로 주입되어 SomeService의 메서드를 호출할 수 있는지 확인
        assertEquals("Done", serviceWithDep.callService());
    }

    @Test
    void container_shouldPerformInterfaceInjection() {
        container.bootstrap(List.of("app.test"));

        // 인터페이스 타입으로 빈을 가져올 수 있는지 확인
        SomeService someService = container.get(SomeService.class);
        assertNotNull(someService);
        // 가져온 빈이 실제 구현체인지 확인 (SomeServiceImpl)
        assertTrue(someService instanceof SomeServiceImpl);
        assertEquals("Done", someService.doSomething());
    }

    @Test
    void container_shouldPerformListInjection() {
        container.bootstrap(List.of("app.test"));

        ComponentWithListDependency listDepComponent = container.get(ComponentWithListDependency.class);
        assertNotNull(listDepComponent);
        // SomeService 구현체(SomeServiceImpl)가 List에 제대로 주입되었는지 확인
        assertEquals(1, listDepComponent.getServiceCount()); // SomeServiceImpl만 구현했으므로 1개
        assertTrue(listDepComponent.getServices().get(0) instanceof SomeServiceImpl);
    }

    @Test
    void container_shouldDetectCircularDependency() {
        // 순환 참조가 있는 패키지를 스캔할 때 예외가 발생하는지 확인
        // 주의: CircularDependencyA와 B는 @Component가 붙어있으므로 ClassPathScanner에 의해 스캔됨
        // 이 테스트는 Container가 이 두 빈을 처리할 때 BeanGraph에서 예외가 발생하는지 확인

        assertThrows(BeanGraph.CircularDependencyException.class, () -> {
            container.bootstrap(List.of("app.circular")); // CircularDependencyA, B가 있는 패키지
        });
    }

}
```
![](https://velog.velcdn.com/images/cassidy/post/4f68819b-b037-4fdc-a6bd-c9b73552a13e/image.png)

![](https://velog.velcdn.com/images/cassidy/post/cf25cfe7-4334-4d62-80ed-cbb25927759b/image.png)

![](https://velog.velcdn.com/images/cassidy/post/b6cdc99f-39e0-4ea0-beb3-e899105917bd/image.png)

---
# 트러블 슈팅
### 1. Reflections의 메타 어노테이션 인식
#### 상황
`@Component` 어노테이션만 스캔이 되던 상황이 발생했다.

#### 원인
`@Service`, `@Controller` 같은 어노테이션이 `@Component`를 가지고 있더라도 Reflections가 기본적으로는 `@Component`만 찾지, `@Service`나 `@Controller`를 직접 찾아서 이들을 빈 후보에 포함시키진 않았다.

#### 해결 : 어노테이션을 명시적 나열
스프링에선 실제로 ASM과 같은 바이트코드 조작 방법을 사용하여 어노테이션의 메타 어노테이션을 처리한다는 것을 알게 되었지만, 명시적으로 나열하여 처리하더라도 현재 상황에서 어노테이션의 메타 어노테이션의 깊이나 활용도가 크지 않았기 때문에 명시적으로 나열하여 처리하였다. 다만, `@Inherited` + 재귀 탐색 같은 방식으로도 풀 수 있음을 깨닫게 되긴 하였다.


### 2. 패키지 탐색시 모든 패키지를 검사
#### 상황
순환참조를 위한 구조를 만들어 두고 `app.circular`에 위치시켰는데 `app`의 모든 패키지를 전부 검사하여 순환 참조가 계속 발생
#### 원인
`ClasspathHelper.forPackage(basePackage)`가 `basePackage`가 속한 JAR 파일이나 루트 디렉토리 자체를 URL로 추가하는 경향이 있다는 사실을 알게 되었다. 예를 들어, `app.test` 패키지가 `target/classes` 디렉토리 안에 있다면, `ClasspathHelper.forPackage("app.test")`는 `target/classes`의 URL을 추가할 수 있다는 것이다.
따라서 Reflections는 일단 `target/classes` 전체를 스캔 대상으로 간주하게 되고, 그 안에 있는 모든 `@Component` 계열 빈들을 찾아내게 되는 문제였다.

#### 해결 : `FilterBuilder`를 사용하여 스캔 범위 명시적 제한
가장 정확하게 스캔 범위를 제한하는 방법은 ConfigurationBuilder에 FilterBuilder를 사용하여 패키지 이름을 기준으로 클래스 파일을 필터링하는 것이었다. Container와 ContainerTest의 ConfigurationBuilder 구성 방식을 수정하여 `filterInputsBy`를 사용하여 패키지 이름을 걸러내도록 개선시켰다.


# 관련 스프링 공식 문서 및 레포지토리 정보
### 스프링 프레임워크 공식 레퍼런스 문서
> https://docs.spring.io/spring-framework/reference/core/beans/dependencies.html

첨부한 섹션에서 IoC 컨테이너가 어떻게 의존성을 해결하는지에 대한 전반적인 설명을 제공하고 있다.

### `DefaultSingletonBeanRegistry`
> https://github.com/spring-projects/spring-framework/blob/main/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultSingletonBeanRegistry.java

이 클래스는 싱글톤 빈의 라이프사이클을 관리하며 빈 인스턴스를 생성하고 캐시하는 핵심적인 역할을 한다. 특히 순환 참조를 해결하기 위한 "세 번째 수준의 캐시" (필드 및 세터 주입의 경우) 메커니즘이 이 클래스에 구현되어 있다. 빈 생성이 재귀적으로 호출될 때, 미완성된 빈을 임시로 노출하여 순환 참조를 끊는 부분이 여기에 포함되어 있다.

### `AbstractAutowireCapableBeanFactory`
> https://github.com/spring-projects/spring-framework/blob/main/spring-beans/src/main/java/org/springframework/beans/factory/support/AbstractAutowireCapableBeanFactory.java

이 클래스는 빈 인스턴스 생성, 속성 주입, 초기화 콜백 호출 등 실제 빈의 라이프사이클 관리를 담당하고 있다. createBean 및 populateBean, initializeBean 등의 메서드를 통해 빈이 생성되고 의존성이 주입되는 과정을 추적할 수 있긴하다.. 특히 doCreateBean 메서드 내부에서 의존성 주입을 위해 다른 빈을 getBean으로 다시 요청하는 방식이 재귀적인 생성 방식의 핵심이다.

```java
	@Override
	@SuppressWarnings("unchecked")
	public <T> T createBean(Class<T> beanClass) throws BeansException {
		// Use non-singleton bean definition, to avoid registering bean as dependent bean.
		RootBeanDefinition bd = new CreateFromClassBeanDefinition(beanClass);
		bd.setScope(SCOPE_PROTOTYPE);
		bd.allowCaching = ClassUtils.isCacheSafe(beanClass, getBeanClassLoader());
		return (T) createBean(beanClass.getName(), bd, null);
	}
```
실제 해당 레포지토리에서 발견할 수 있는 빈을 생성하는 진입점 중 하나이다. `RootBeanDefinition bd = new CreateFromClassBeanDefinition(beanClass);` beanClass로부터 RootBeanDefinition을 생성한다. 이 `BeanDefinition`은 빈의 메타데이터, 즉 어떻게 빈을 생성하고 관리할지(모방한 부분과 비슷한 역할을 한다)에 대한 정보를 담고 있다.
`bd.setScope(SCOPE_PROTOTYPE);` 생성되는 빈의 스코프를 PROTOTYPE으로 설정한다. 싱글톤이 아닌 프로토타입으로 설정함으로써 재귀적 의존성 해결 과정에서 이 빈이 다른 빈의 의존성으로 등록되는 것을 방지한다. 이는 순환 참조 문제를 회피하는 스프링의 전략 중 하나이다. `return (T) createBean(beanClass.getName(), bd, null);` 최종적으로 `createBean(String beanName, RootBeanDefinition mbd, @Nullable Object[] args)` 메서드를 다시 호출한다. 이 메서드가 바로 실제 빈 생성 로직을 수행하는 핵심 부분이다. 이 내부에서 `resolveDependencies`와 같은 과정을 통해 필요한 의존성을 찾고, 만약 해당 의존성이 아직 생성되지 않았다면 재귀적으로 그 의존성 빈을 생성하도록 요청하게 되는 것이다.

---

DI/IoC 컨테이너를 직접 구현하며 스프링의 핵심 메커니즘을 깊이 이해할 수 있었다. 특히 빈 스캔, 의존성 파악, 위상 정렬을 통한 안전한 빈 생성 순서 보장, 그리고 컬렉션 및 인터페이스 주입 처리는 많은 고민을 통해 만든 것이긴 하다.

물론 스프링의 방대한 기능과 견고함에는 비할 수 없지만, 이번 구현을 통해 DI 컨테이너의 본질과 복잡성을 체감할 수 있었다. 다음 단계에서는 이 컨테이너 위에 MVC 및 웹 계층을 구축하여 스프링의 Blocking I/O ThreadPool(nio는 나중에), `DispatcherServlet`, 요청 파서, `ArgumentResolver`, `RequestMappingRegistry` 등을 만들어 볼 예정이다. 

https://github.com/yyubin/sprout
*20250618 기준, 리드미는 아직 옛날 버전입니다..*
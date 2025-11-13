오늘은 예전에 만들어 뒀던, 유사 SpringFramework AOP를 소개하고 스프링 AOP와 어떤 점이 다른지, 스프링 AOP는 어떤 원리로 동작하는지 살펴보자.

이 글을 본다면, IoC 컨테이너의 생명주기, BeanPostProcessor의 역할, 그리고 CGLIB를 이용한 동적 프록시가 어떻게 어우러져 AOP를 구현하는지 이해하는데에 도움이 될 것이라 생각한다.

# 핵심 아키텍처
동작하는 전체적인 흐름은 다음과 같다. 각 단계는 글의 뒷부분에서 자세히 설명할 예정이니, 지금은 전체적인 개괄만 보이겠다.

1. IoC 컨테이너 부팅: `SproutApplicationContext`가 시작되며 빈(`Bean`) 관리를 준비

2. 빈(`Bean`) 스캔 및 정의: `@Component`, `@Aspect` 등 어노테이션이 붙은 클래스를 모두 찾아내어 '빈 정의(`BeanDefinition`)' 객체로 만든다.

3. 인프라 빈(`InfrastructureBean`) 우선 생성: AOP 적용 등 프레임워크의 핵심 기능을 담당하는 빈들(`AspectPostProcessor`, `AdvisorRegistry` 등)을 먼저 생성한다.

4. AOP 초기화: `AopPostInfrastructureInitializer`가 `AspectPostProcessor`에게 `@Aspect`를 스캔할 패키지 정보를 알려준다.

  `AspectPostProcessor`는 `@Aspect` 클래스를 분석하여 어떤 메서드에 어떤 부가 기능을 적용할지에 대한 정보 묶음인 **Advisor**를 생성하고 `AdvisorRegistry`에 등록한다.

5. 애플리케이션 빈(`ApplicationBean`) 생성: `@Service`, `@Controller` 등 일반적인 애플리케이션 빈들을 생성하기 시작한다.

6. 프록시 생성 (AOP 적용의 순간) ✨: 빈이 생성되고 초기화된 직후, **`AspectPostProcessor`**가 각 빈을 검사한다.

  만약 어떤 빈의 메서드가 등록된 Advisor의 조건(`Pointcut`)과 일치하면, 원본 빈 대신 CGLIB를 이용해 프록시(`Proxy`) 객체를 생성하여 반환한다.

7. 프록시 메서드 호출: 개발자가 프록시 객체의 메서드를 호출하면, 프록시는 원본 객체의 메서드를 바로 호출하지 않는다. 대신, 프록시에 연결된 **`BeanMethodInterceptor`**가 호출을 가로챈다.

8. 어드바이스(Advice) 실행: `BeanMethodInterceptor`는 `AdvisorRegistry`에서 현재 호출된 메서드에 적용할 Advisor 목록을 찾는다. **`MethodInvocation`**을 통해 `Advisor`에 정의된 부가 기능(`Advice`)들을 체인처럼 순서대로 실행하고, 마지막에 원본 메서드를 호출한다.

우선은, 이전에 DI/IoC 에 대해 소개한 글이 있지만, 지금은 많이 변화되었다..
더 자세한 이야기는 차례로 진행하겠다.

# 1. `SproutApplicationContext` : DI/IoC 컨테이너

IoC 컨테이너의 핵심인 `SproutApplicationContext`는 빈의 생명주기를 관리한다. 여기서 주목할 부분은 `refresh()` 메서드의 실행 순서이다.

```java
    @Override
    public void refresh() throws Exception {
        scanBeanDefinitions();
        instantiateInfrastructureBeans();
        instantiateAllSingletons();

        List<ContextInitializer> contextInitializers = getAllBeans(ContextInitializer.class);
        for (ContextInitializer initializer : contextInitializers) {
            initializer.initializeAfterRefresh(this);
        }
    }
```
이 부분이 실제로 초기화를 담당한다. 우선 빈들을 모두 스캔하고, 마커 인터페이스인 `InfrastructureBean`이 붙어있는 구현체들을 먼저 초기화 시킨다. 그 이후 일반 빈들을 초기화 하는 구조이다.

이는 2-Phased 초기화로, 실제 스프링도 이와 같이 동작한다.

일반 빈에 AOP를 적용할텐데, 이때 미리 구성되어 있어야만하는 `AdvisorRegistry`, `AspectPostProcessor` 등등을 먼저 생성하기 위함이다. 다른 빈의 생성 과정에 개입해야 하는 빈들은 애플리케이션 빈보다 먼저 준비되어 있어야 하기 때문이다.


# 2. BeanPostProcessor와 AspectPostProcessor: AOP 적용
`BeanPostProcessor`는 스프링 컨테이너가 제공하는 강력한 확장 포인트로, 빈의 초기화 전후에 원하는 로직을 추가할 수 있게 해준다. `AspectPostProcessor`는 바로 이 `BeanPostProcessor`의 구현체이다. 실제로 해당 문제를 해결하기 위해 사용했다. 여기에서 `BeanPostProcessor` 를 구현함으로써 모듈 문제도 해결 가능하다.(AOP만 컨테이너에 의존하고 그 역은 의존하지 않는다)
```java
    protected Object createBean(BeanDefinition def) {
        if (singletons.containsKey(def.getName())) return singletons.get(def.getName());
       
                // ... 생략

            ctorCache.put(beanInstance, new CtorMeta(def.getConstructorArgumentTypes(), deps));

            Object processedBean = beanInstance;
            for (BeanPostProcessor processor : beanPostProcessors) {
                Object result = processor.postProcessBeforeInitialization(def.getName(), processedBean);
                if (result != null) processedBean = result;
            }
            for (BeanPostProcessor processor : beanPostProcessors) {
                Object result = processor.postProcessAfterInitialization(def.getName(), processedBean);
                if (result != null) processedBean = result;
            }

            registerInternal(def.getName(), processedBean);
            return processedBean;
    }
```
실제 빈을 생성하는 메서드 중 일부이다. 미리 지정해둔 `BeanPostProcessor`을 통해 빈 생성 단계에서 개입하여 처리한다.
```java
    @Override
    public Object postProcessAfterInitialization(String beanName, Object bean) {
        Class<?> targetClass = bean.getClass();

        // 모든 메서드를 순회하며 해당 메서드에 적용될 Advisor가 있는지 확인
        boolean needsProxy = false;
        for (Method method : targetClass.getMethods()) {
            if (Modifier.isPublic(method.getModifiers()) && !Modifier.isStatic(method.getModifiers())) {
                if (!advisorRegistry.getApplicableAdvisors(targetClass, method).isEmpty()) {
                    needsProxy = true;
                    break;
                }
            }
        }

        if (needsProxy) {
            System.out.println("Applying AOP proxy to bean: " + beanName + " (" + targetClass.getName() + ")");
            CtorMeta meta = container.lookupCtorMeta(bean);
            return proxyFactory.createProxy(targetClass, bean, advisorRegistry, meta);
        }
        return bean;
    }
```
`postProcessAfterInitialization` 메서드는 모든 빈이 생성되고 의존성 주입까지 완료된 직후에 호출된다. `AspectPostProcessor`는 이 시점에서 빈을 가로채, AOP 적용이 필요한지 검사하고 필요하다면 원본 객체를 프록시 객체로 바꿔치기한다. 컨테이너에 등록되는 것은 원본이 아닌 프록시 객체이므로, 이후 해당 빈을 주입받는 곳에서는 모두 프록시를 사용하게 되는 것이다.

내 구현에서는 모두 `Cglib`을 사용하였지만, 실제 스프링에선 인터페이스엔 `Java Dynamic Proxy`, 구현체엔 `CGLIB`을 이용하여 프록시화 한다.

# 3. PostInfrastructureInitializer : 초기화 시점 문제 해결
한 가지 미묘한 문제가 있다. `AspectPostProcessor`는 `@Aspect` 클래스를 스캔해야 하는데, 어떤 패키지를 스캔해야 할지 어떻게 알 수 있을까? 이 정보는 `SproutApplicationContext`가 가지고 있다. 하지만 `AspectPostProcessor`는 인프라 빈이라 `ApplicationContext`보다 먼저 생성될 수 있다.

이 "닭이 먼저냐, 달걀이 먼저냐"와 같은 문제를 `PostInfrastructureInitializer`를 통해 해결한다.


```java
@Component
public class AopPostInfrastructureInitializer implements PostInfrastructureInitializer {
    private final AspectPostProcessor aspectPostProcessor;

    public AopPostInfrastructureInitializer(AspectPostProcessor aspectPostProcessor) {
        this.aspectPostProcessor = aspectPostProcessor;
    }

    @Override
    public void afterInfrastructureSetup(BeanFactory beanFactory, List<String> basePackages) {
        aspectPostProcessor.initialize(basePackages);
    }
}
```
이 클래스는 모든 인프라 빈 생성이 완료된 후에 호출되어, `AspectPostProcessor`에게 스캔할 패키지 정보를 전달하고 AOP 관련 초기화(`scanAndRegisterAdvisors`)를 수행하도록 한다. 실제, 이 시점에서 `AdvisorFactory` 등을 모두 채워둔다.

# 4. Advisor, Pointcut, Advice: AOP의 3요소

AOP를 구성하는 세 가지 핵심 개념이라 볼 수 있다.

- **`Pointcut`** (어디에?): 부가 기능을 어디에 적용할지 결정하는 필터링 규칙이다. 내가 만든 프레임워크에서는 AnnotationPointcut (특정 어노테이션이 붙은 곳)과 AspectJPointcutAdapter (AspectJ 표현식) 두 가지를 지원한다.

- **`Advice`** (무엇을?): Pointcut이 지정한 위치에서 실행될 실제 부가 기능 로직이다. (`@Before`, `@After`, `@Around` 로직)

- **`Advisor`** (조합): Pointcut과 Advice를 하나로 묶은 객체입니다. 즉, "이 Pointcut에 해당하는 곳에 저 Advice를 적용하라"는 하나의 완전한 AOP 규칙이다.

`AspectPostProcessor`는 `@Aspect` 클래스의 `@Around` 같은 어노테이션을 보고 이 `Advisor` 객체들을 만들어 `AdvisorRegistry`에 저장해 둔다.

# 5. CGLIB와 BeanMethodInterceptor

만약 프록시가 필요하다면, `ProxyFactory`에서 실제로 생성한다.

```java
@Component
public class CglibProxyFactory implements ProxyFactory, InfrastructureBean {
    @Override
    public Object createProxy(Class<?> targetClass, Object target, AdvisorRegistry registry, CtorMeta meta) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(targetClass);
        enhancer.setCallback(new BeanMethodInterceptor(target, registry));
        return enhancer.create(meta.paramTypes(), meta.args());
    }
}
```
`CGLIB`는 타겟 클래스를 상속받는 자식 클래스를 동적으로 생성하여 프록시를 생성한다. 여기서 핵심은 `setCallback`이다. 프록시 객체의 어떤 메서드를 호출하든, 그 호출은 `BeanMethodInterceptor`의 `intercept` 메서드로 연결되는 것이다.

```java
public class BeanMethodInterceptor implements MethodInterceptor {

    private final Object target; // Aspect 클래스의 인스턴스
    private final AdvisorRegistry advisorRegistry;

    public BeanMethodInterceptor(Object target, AdvisorRegistry advisorRegistry) {
        this.target = target;
        this.advisorRegistry = advisorRegistry;
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        List<Advisor> applicableAdvisors = advisorRegistry.getApplicableAdvisors(target.getClass(), method);

        if (applicableAdvisors.isEmpty()) {
            // 적용할 Advisor가 없으면 원본 메서드 호출
            return proxy.invoke(target, args);
        }

        // MethodInvocationImpl을 사용하여 Advice 체인 실행
        MethodInvocationImpl invocation = new MethodInvocationImpl(target, method, args, proxy, applicableAdvisors);
        return invocation.proceed();
    }
}
```
`intercept` 메서드는 AOP의 중앙 관제탑 역할이다. 적용할 `Advice`가 없다면 원본 메서드를 바로 호출하고, 있다면 `MethodInvocation`을 통해 `Advice` 체인을 실행시킨다.

# 6. MethodInvocation: 어드바이스 체인의 구현

하나의 메서드에 여러 `Advice`가 적용될 수 있다. (`@Before`,` @Around`, `@After` 등) 이들을 올바른 순서로 실행시켜주는 것이 `MethodInvocation`의 역할이다.

```java

public class MethodInvocationImpl implements MethodInvocation{
    private final Object target;           // 실제 메서드가 호출될 대상 객체
    private final Method method;           // 호출될 메서드의 Method 객체
    private final Object[] args;           // 메서드 호출 인자
    private final MethodProxy methodProxy; // CGLIB의 메서드 프록시 (실제 타겟 메서드 호출용)
    private final List<Advisor> advisors;  // 현재 적용 가능한 어드바이저 목록
    private int currentAdvisorIndex = -1;  // 현재 실행할 어드바이저의 인덱스

	// 생략

    @Override
    public Object proceed() throws Throwable {
        currentAdvisorIndex++; // 다음 어드바이저로 이동

        if (currentAdvisorIndex < advisors.size()) {
            // 다음 어드바이저의 Advice 실행
            Advisor advisor = advisors.get(currentAdvisorIndex);
            // advisor.getAdvice()는 sprout.aop.advice.Advice 인터페이스를 반환
            // Advice 인터페이스는 invoke(ProceedingJoinPoint pjp)를 가짐
            return advisor.getAdvice().invoke(this);
        } else {
            // 모든 어드바이저를 실행했으면 실제 타겟 메서드 호출
            return methodProxy.invoke(target, args);
        }
    }
}

```
`proceed()` 메서드는 재귀 호출과 비슷한 방식으로 동작한다.

1. 첫 번째 `Advice가` 실행.

2. `Advice` 로직 중간에 `proceed()`를 호출하면, 두 번째 `Advice`가 실행.

3. 이 과정이 반복되다가 마지막 `Advice`가 `proceed()`를 호출하면, 드디어 원본 메서드가 실행된다.

4. 원본 메서드 실행이 끝나면, 호출 역순으로 `Advice`들의 나머지 로직(e.g., `@Around`의 try-finally 블록)이 실행된다.

이 체인 구조 덕분에 `@Around`와 같은 강력한 `Advice` 타입 구현이 가능해지는 것이다..

# 7. 실제 호출을 해보자

```java
package app.test.aop;

import sprout.aop.JoinPoint;
import sprout.aop.ProceedingJoinPoint;
import sprout.aop.annotation.After;
import sprout.aop.annotation.Around;
import sprout.aop.annotation.Aspect;
import sprout.aop.annotation.Before;

@Aspect
public class DemoLoggingAspect {

    @Around(pointcut = "execution(* app.test.TestService.*(..))")
    public Object aroundSave(ProceedingJoinPoint pjp) throws Throwable {
        long t0 = System.nanoTime();
        try {
            return pjp.proceed();
        } finally {
            long elapsed = System.nanoTime() - t0;
            System.out.printf("[AROUND-SAVE] %s took %d µs%n",
                    pjp.getSignature().toLongName(), elapsed / 1_000);
        }
    }

    @After(pointcut = "execution(* app.test.TestService.*(..))")
    public void afterFind(JoinPoint jp) {
        System.out.println("[AFTER-FIND] " + jp.getSignature().toLongName());
    }
}

```

```java
package app.test.aop;

import sprout.aop.ProceedingJoinPoint;
import sprout.aop.annotation.Around;
import sprout.aop.annotation.Aspect;

@Aspect
public class TestAspect {
    @Around(annotation = {Auth.class})
    public Object authCheck(ProceedingJoinPoint joinPoint) throws Throwable {
        System.out.println("Auth Check");
        return joinPoint.proceed();
    }
    
}
```
```java
package app.test;

import sprout.beans.annotation.Service;
import app.test.aop.Auth;

@Service
public class TestService {

    public String test() {
        return "TestService Injection Success";
    }

    @Auth
    public String authCheck() {
        return "Auth Check Success";
    }

}
```
```java
package app.test;

import sprout.beans.annotation.Controller;
import sprout.mvc.annotation.*;

@Controller
@RequestMapping("/api")
public class TestController {

    private final TestService testService;

    public TestController(TestService testService) {
        this.testService = testService;
    }
    
    @GetMapping("/auth")
    public String authCheck() {
        return testService.authCheck();
    }

}
```

체이닝이 가능해야하므로 위와 같이 여러 `Aspect` 클래스를 만들었다.

![](https://velog.velcdn.com/images/cassidy/post/8ebfaf74-55b0-4a17-a4e4-8360ef2ddbc9/image.png)
실제 브라우저 요청은 이와 같이 확인 할 수 있다.
![](https://velog.velcdn.com/images/cassidy/post/d5d2bd30-aae7-4062-ab80-44bfc5ec1b9d/image.png)
실제 http 요청과, AOP로 요청 했던 로그들이 잘 나왔음을 확인할 수 있다.

```
Auth Check
[AFTER-FIND] public java.lang.String app.test.TestService.authCheck()
[AROUND-SAVE] public java.lang.String app.test.TestService.authCheck() took 2746 µs
```

# 8. 실제 스프링 구현체와 비교
| 역할 (Role) | 직접 구현한 AOP | Spring AOP (Framework Implementation) | 설명 |
| --- | --- | --- | --- |
| **AOP 총괄 처리기** | `AspectPostProcessor` | **`AnnotationAwareAspectJAutoProxyCreator`** | 빈 생성 시점에 프록시 객체를 만들지 결정하는 `BeanPostProcessor`. Spring의 구현체는 훨씬 더 정교하고 많은 기능을 담고 있습니다. |
| **프록시 생성 팩토리** | `CglibProxyFactory` | **`DefaultAopProxyFactory`** | 조건에 따라 JDK Dynamic Proxy 또는 CGLIB 프록시를 생성할지 결정하고 생성하는 팩토리입니다. |
| **프록시 생성기** | `CglibProxyFactory` 내부 로직 | **`CglibAopProxy`, `JdkDynamicAopProxy`** | 실제 CGLIB나 JDK 기술을 사용하여 프록시 객체를 만드는 클래스입니다. |
| **메서드 호출 가로채기** | `BeanMethodInterceptor` | **`DynamicAdvisedInterceptor` (CGLIB)**, **`JdkDynamicAopProxy` (JDK)** | 프록시 객체의 메서드 호출을 가로채 어드바이스 체인을 실행시키는 핵심 인터셉터(핸들러)입니다. |
| **어드바이스 체인 실행** | `MethodInvocationImpl` | **`ReflectiveMethodInvocation`** | 어드바이스 체인을 순차적으로 실행하고, 최종적으로 타겟 메서드를 호출하는 역할을 합니다. `org.aopalliance.intercept.MethodInvocation`의 구현체입니다. |
| **어드바이저 (조합)** | `DefaultAdvisor` | **`DefaultPointcutAdvisor`**, `InstantiationModelAwarePointcutAdvisor` | Pointcut과 Advice를 하나로 묶는 객체입니다. Spring은 다양한 종류의 Advisor를 가집니다. |
| **포인트컷 (적용 지점)** | `AnnotationPointcut`, `AspectJPointcutAdapter` | **`AspectJExpressionPointcut`** | AspectJ 표현식을 파싱하고 주어진 메서드가 포인트컷에 해당하는지 판단합니다. |
| **어드바이스 (부가 기능)** | `SimpleAroundInterceptor` | **`AspectJAroundAdvice`, `AspectJMethodBeforeAdvice`** 등 | `@Around`, `@Before` 등 각 어노테이션에 맞는 실제 부가 기능 로직을 담고 있습니다. 이 Advice들은 내부적으로 `MethodInterceptor`로 변환되어 처리됩니다. |
| **어드바이저 저장/관리** | `AdvisorRegistry` (별도 빈) | `AnnotationAwareAspectJAutoProxyCreator` **내부 캐시** | Spring에서는 AOP 총괄 처리기가 스캔한 Advisor들을 효율적으로 관리하기 위해 내부에 직접 캐싱합니다. |

# 마무리하며

정리하자면, AOP는 다음 기술들의 절묘한 조합이다.

- `BeanPostProcessor`: 빈 생성 과정에 개입하여 원본 객체를 프록시로 대체하는 '가로채기' 역할

- 동적 프록시 (`CGLIB`): 원본 객체인 척 행동하며 모든 메서드 호출을 특정 로직(`MethodInterceptor`)으로 보내는 '대리인' 역할

- `Advisor`, `Pointcut`, `Advice`: AOP의 적용 규칙과 실행 코드를 정의하는 '설계도' 역할

- `MethodInvocation`: 여러 `Advice`를 순서대로 실행시키는 '실행 체인' 역할

개인적으로 정말 만들기 어려웠던 부분이었다. AOP 처리를 위해 실제로 DI/IOC 컨테이너 리팩토링도 필수적으로 진행할 수 밖에 없었다. 초기화 시점이 꼬이고 최초 버전에선 컨테이너가 AOP 모듈을 강하게 의존하고 있었다. 이를 위해 생성 시점 사이사이에 훅을 만들어 인터페이스를 만들고 이를 구현하는 것으로 분리시켰다.

그리고 기본적으로 CGLIB 프록시는 기본 생성자(no-arg)로만 인스턴스를 만든다. Objenesis로 생성자 호출 없이 인스턴스를 만들던가, Container 단계에서 프록시를 만들면서 재사용했던 인수를 그대로 넘겨주는 방법 등이 생각이 났다. Objenesis를 쓰면 `final` 필드에 뒤늦게 주입해야만 하는데, 이는 jvm 옵션으로 강제로 열어서 리플렉션으로 주입하던가 해야만 했음.. 내가 만든 프레임워크에서는 순환 참조도 지원 안하는데, 강제로 주입하는 옵션을 이를 위해서 사용해야 하나 싶은 마음에, `Bean` 생성 시점에 생성자를 캐시하는 방법으로 해결했다. 그래서 프록시를 만들 때 인수를 전달해준다. 단점이라면, `AspectPostProcessor` 가 `Context` API 를 호출해 결합도가 생기는데, 이건 별 수 없다고 생각했다.. 반대로 `Context`가 `AOP`의 존재만 몰라도 만족하기로 타협했다..

그리고 Aspect로 지정한 클래스가 다른 클래스를 의존하는 경우에, 추가적으로 의존성 처리를 해줘야만 한다. A 클래스가 B 클래스의 프록시로 동작할 경우(A 클래스가 Aspect, B 클래스가 일반 빈 컴포넌트), B 클래스 생성을 위해선 A 클래스가 미리 있어야 하고 A 클래스가 있으려면 이미 그 안에 의존성들이 해결되어야 생성 가능하기 때문이다. 앞서 다른 포스팅에서, DI/IoC에서 설명하기를, 빈 생성 -> 후처리 적용 -> 빈 등록 로 진행했는데, 빈 생성 순서는 위상정렬을 사용했다. 만약 위상정렬 알고리즘 하나로 전부 해결하고 싶다면, Aop관련 Registry 정보들을 빈 그래프 알고리즘에 불러와서 그 부분도 추가 의존성 edges를 추가해줘야만 한다. 이는 기존 동작을 더욱이 복잡하게 했기 때문에 `BeanFactory`의 `getBean()` 메서드를 재귀적으로 사용하여, 생성을 가능하게 했다. 이 부분에선 나중에 추가로 포스팅 해도 좋을 것 같다

---
요즘은 다른 프로젝트 위주로 진행 중이어서, `Sprout` 리팩토링을 미루고 있었다. 원래는 모든 마음에 걸리는 부분을 전부 리팩토링 시키고 나서 글을 쓰고 싶었지만, 끝날 기미가 안보임😔 그래서 미리 가져왔다......


추후 더 AOP 부분에서 더 구현해볼만 한 것들은, `@Order`로 체이닝 정렬, 더 많은 어노테이션 지원 등이 있을 것 같지만. v1까지 이정도 기능에서 freeze 해볼 생각이다.

아마도 다음에 또 글을 쓴다면, server 스레드 전환 모델을 어떻게 만들었는지.. 혹은 nio? 또는 websocket 부분일 것이라 예상된다.

만약, 현재 부분을 직접 테스트 해보시길 원한다면, `data` 쪽에서 `database` 정보를 요구하는 `@Component`를 지우고 하셔야 할 것이다. 아니면 그 조건으로 데이터베이스를 찾습니다.

![](https://velog.velcdn.com/images/cassidy/post/07a8d36e-9197-456e-b4b9-27b6ab493824/image.png)



아주 훌륭하진 않지만, 테스트 코드도 많이 작성했다..
도저히 힘들어서 말을 해야겠음..

해당 프로젝트는 아래 레포지토리에서 확인 가능합니다.

> https://github.com/yyubin/sprout


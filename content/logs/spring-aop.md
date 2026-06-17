# Spring AOP 정리

AOP는 핵심 비즈니스 로직과 공통 관심사를 분리하기 위한 프로그래밍 방식이다. 로깅, 실행 시간 측정, 트랜잭션, 권한 검사처럼 여러 계층에 반복되는 코드는 AOP로 모아 관리할 수 있다.

## AOP가 필요한 이유

Service 메서드마다 실행 시간을 찍거나 예외 로그를 남기는 코드를 직접 넣으면 핵심 로직이 흐려진다. AOP는 이런 부가 기능을 별도 Aspect로 분리하고, 필요한 지점에 자동으로 끼워 넣는다.

## 핵심 용어

| 용어 | 의미 |
| --- | --- |
| Aspect | 공통 기능을 모아 둔 클래스 |
| Advice | 실제로 실행될 부가 동작 |
| Join Point | Advice가 끼어들 수 있는 지점 |
| Pointcut | Advice를 적용할 대상을 고르는 조건 |
| Weaving | 대상 객체에 Advice를 연결하는 과정 |

## Advice 종류

```java
@Before("execution(* com.example..*Service.*(..))")
public void beforeLog() { }

@AfterReturning(pointcut = "servicePointcut()", returning = "result")
public void afterReturn(Object result) { }

@Around("servicePointcut()")
public Object measure(ProceedingJoinPoint joinPoint) throws Throwable {
    long start = System.currentTimeMillis();
    try {
        return joinPoint.proceed();
    } finally {
        long time = System.currentTimeMillis() - start;
    }
}
```

`@Around`는 대상 메서드 실행 전후를 모두 감쌀 수 있어 실행 시간 측정이나 트랜잭션 처리 흐름을 이해하기 좋다.

## Pointcut 표현식

`execution(* 패키지..클래스.메서드(..))` 형태로 적용 범위를 지정한다. 범위를 너무 넓게 잡으면 예상하지 못한 메서드까지 영향을 받을 수 있으므로 계층과 명명 규칙을 기준으로 좁히는 것이 안전하다.

## 정리

AOP는 핵심 로직을 대체하는 기술이 아니라 반복되는 횡단 관심사를 정리하는 도구다. 적용 범위가 명확한 로깅, 성능 측정, 트랜잭션 같은 기능에 사용하면 코드 중복을 줄이고 서비스 코드를 더 읽기 쉽게 만들 수 있다.

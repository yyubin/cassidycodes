# Spring MVC Interceptor

Interceptor는 Controller 실행 전후에 공통 처리를 끼워 넣는 Spring MVC 기능이다. 인증 확인, 관리자 API 차단, 실행 시간 측정, 요청 로그 기록처럼 웹 요청 흐름과 가까운 작업에 적합하다.

## HandlerInterceptor 메서드

| 메서드 | 실행 시점 |
| --- | --- |
| `preHandle` | Controller 호출 전 |
| `postHandle` | Controller 실행 후, View 렌더링 전 |
| `afterCompletion` | 요청 처리가 완전히 끝난 뒤 |

`preHandle`이 `false`를 반환하면 Controller까지 요청이 전달되지 않는다. 인증 실패나 API Key 오류를 차단할 때 이 특성을 사용한다.

## 실행 시간 측정 예시

```java
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    request.setAttribute("startTime", System.currentTimeMillis());
    return true;
}

public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
    long start = (long) request.getAttribute("startTime");
    long elapsed = System.currentTimeMillis() - start;
}
```

요청 속도 로그는 `afterCompletion`에서 남기면 예외 발생 여부와 상관없이 마무리 기록을 남길 수 있다.

## API Key 검증

관리자 API처럼 특정 헤더가 필요한 경우 `preHandle`에서 검사하고, 실패 시 상태 코드와 JSON 응답을 직접 작성한 뒤 `false`를 반환한다.

## 등록 방식

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new ApiKeyInterceptor())
                .addPathPatterns("/admin/**")
                .excludePathPatterns("/admin/login");
    }
}
```

## Filter와 비교

Filter는 Servlet 컨테이너 레벨에서 동작하고, Interceptor는 Spring MVC의 HandlerMapping 이후에 동작한다. Spring Bean과 MVC 컨텍스트를 활용해야 하는 웹 계층 공통 로직은 Interceptor가 더 다루기 쉽다.

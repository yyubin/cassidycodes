오늘은 스프링 프레임워크의 핵심 요소 중 하나인 **`ArgumentResolver`**를 직접 구현해보면서 알아가보자. 바로 이전 포스팅에서 전체적인 구조와 DispatcherServlet(프론트 컨트롤러)에 대해 설명했으니, 이번 글에서는 ArgumentResolver가 어떻게 HTTP 요청의 다양한 데이터를 컨트롤러 메서드의 파라미터로 변환하는지 자세히 다루는 데 집중해보고자 한다.

**요청 파라미터는 어떻게 컨트롤러로 들어올까?**

# ArgumentResolver 파헤치기

## ArgumentResolver란?
우리가 웹 애플리케이션을 만들 때, 클라이언트로부터 HTTP 요청을 받게된다. 이 요청 안에는 경로(Path), 쿼리 파라미터(Query Parameters), 요청 바디(Request Body) 등 다양한 정보가 담겨 있다. 컨트롤러 메서드는 이러한 정보들을 필요로 하는데, 단순히 `HttpServletRequest` 객체를 통째로 받아서 일일이 파싱하는 것은 번거롭고 가독성도 떨어진다.

여기서 `ArgumentResolver`가 필요해진다. `ArgumentResolver`는 컨트롤러 메서드의 파라미터 타입을 분석하여, 해당 파라미터에 맞는 방식으로 HTTP 요청으로부터 데이터를 추출하고 적절한 타입으로 변환하여 메서드에 주입해 주는 역할을 한다.

이번에 내가 만든 프레임워크에서는 `sprout.mvc.argument.ArgumentResolver` 인터페이스를 정의하고 이를 구현하는 방식으로 ArgumentResolver를 확장할 수 있도록 했다.

```java
package sprout.mvc.argument;

import sprout.mvc.http.HttpRequest;
import java.lang.reflect.Parameter;
import java.util.Map;

public interface ArgumentResolver {
    boolean supports(Parameter parameter);
    Object resolve(Parameter parameter, HttpRequest<?> request, Map<String, String> pathVariables) throws Exception;
}
```

- **`supports(Parameter parameter)`**
이 ArgumentResolver가 특정 메서드 파라미터를 처리할 수 있는지 여부를 결정
- **`resolve(Parameter parameter, HttpRequest<?> request, Map<String, String> pathVariables)`**
supports 메서드가 true를 반환했을 때 호출되며, 실제 요청으로부터 데이터를 추출하고 변환하여 파라미터로 사용할 객체를 반환한다

이러한 형태의 `supports-resolve` 형식으로 이루어진 건, **Chain of Responsibility**이라는 디자인 패턴이기도 하다.

> **Chain of Responsibility**  어떤 요구가 발생했을 때 그 요구를 처리할 객체를 바로 결정할 수 없는 경우에는 다수의 객체를 사슬처럼 연결해 두고 객체의 사슬을 차례로 돌아다니면서 목적에 맞는 객체를 결정하는 패턴

## 다양한 ArgumentResolver 살펴보기
Sprout에선, 대표적인 웹 요청 데이터를 처리하기 위해 세 가지 `ArgumentResolver`를 구현했다.
### PathVariableArgumentResolver
```java
// sprout.mvc.argument.builtins.PathVariableArgumentResolver
@Component
public class PathVariableArgumentResolver implements ArgumentResolver {
    @Override
    public boolean supports(Parameter parameter) {
        return parameter.isAnnotationPresent(PathVariable.class);
    }

    @Override
    public Object resolve(Parameter parameter, HttpRequest<?> request, Map<String, String> pathVariables) throws Exception {
        PathVariable pathVariableAnnotation = parameter.getAnnotation(PathVariable.class);
        String variableName = pathVariableAnnotation.value();

        if (variableName.isEmpty()) {
            variableName = parameter.getName(); // 어노테이션에 이름이 없으면 파라미터 이름 사용
        }

        String value = pathVariables.get(variableName);
        if (value == null) {
            throw new IllegalArgumentException("Path variable '" + variableName + "' not found in path.");
        }
        return TypeConverter.convert(value, parameter.getType()); // 문자열 값을 파라미터 타입으로 변환
    }
}
```
URI 경로에 포함된 변수(예: `/users/{id}`)를 추출하여 컨트롤러 메서드의 파라미터로 주입하는 역할을 한다. `@PathVariable` 어노테이션이 붙은 파라미터를 지원한다.
#### Test
`PathVariableArgumentResolverTest`를 통해 이 리졸버가 어떻게 동작하는지 확인할 수 있다.
```java
@Test
@DisplayName("should resolve path variable using parameter name when value is empty")
void resolve_EmptyPathVariableName_ReturnsCorrectValue() throws Exception {
    Method method = TestController.class.getMethod("testMethodWithEmptyAnnotation", String.class);
    Parameter parameter = method.getParameters()[0]; // @PathVariable("") String userId
    Map<String, String> pathVariables = Map.of("userId", "user456"); // 경로 변수 맵
    
    Object resolvedValue = resolver.resolve(parameter, mockRequest, pathVariables);
    
    assertThat(resolvedValue).isEqualTo("user456");
    assertThat(resolvedValue).isInstanceOf(String.class);
}
```
이 테스트는 `@PathVariable` 어노테이션에 이름이 명시되지 않았을 때(예: `@PathVariable("") String userId`), 메서드 파라미터의 이름(`userId`)을 사용하여 경로 변수를 찾는 기능을 검증한다.

### RequestParamArgumentResolver
HTTP 요청의 쿼리 파라미터(예: `?name=value&age=10`)를 추출하여 컨트롤러 메서드의 파라미터로 주입한다. `@RequestParam` 어노테이션이 붙은 파라미터를 지원한다.
```java
// sprout.mvc.argument.builtins.RequestParamArgumentResolver
@Component
public class RequestParamArgumentResolver implements ArgumentResolver {
    @Override
    public boolean supports(Parameter parameter) {
        return parameter.isAnnotationPresent(RequestParam.class);
    }

    @Override
    public Object resolve(Parameter parameter, HttpRequest<?> request, Map<String, String> pathVariables) throws Exception {
        RequestParam requestParam = parameter.getAnnotation(RequestParam.class);
        String paramName = requestParam.value().isEmpty() ? parameter.getName() : requestParam.value();
        String paramValue = request.getQueryParams().get(paramName);

        if (paramValue == null) {
            if (requestParam.required()) { // 필수 파라미터인데 값이 없으면 예외 발생
                throw new IllegalArgumentException("Required request parameter '" + paramName + "' not found in request.");
            }
        }
        return TypeConverter.convert(paramValue, parameter.getType());
    }
}
```

#### Test
`RequestParamArgumentResolverTest`에서 필수 파라미터 누락에 대한 예외 처리를 확인할 수 있었다.
```java
@Test
@DisplayName("required=true인 필수 RequestParam이 없을 경우 예외를 던져야 한다")
void resolve_RequiredRequestParamNotFound_ThrowsException() throws NoSuchMethodException {
    Method method = TestController.class.getMethod("testMethodWithRequestParam", String.class, int.class);
    Parameter parameter = method.getParameters()[0]; // @RequestParam("userId") String userId (required=true가 기본값)
    
    when(mockRequest.getQueryParams()).thenReturn(Collections.emptyMap()); // 쿼리 파라미터에 'userId'가 없는 경우
    
    assertThrows(IllegalArgumentException.class, () ->
        resolver.resolve(parameter, mockRequest, Collections.emptyMap())
    );
}
```

### RequestBodyArgumentResolver
HTTP 요청의 바디(주로 JSON)를 읽어와서 특정 자바 객체로 변환하여 컨트롤러 메서드의 파라미터로 주입한다. `@RequestBody` 어노테이션이 붙은 파라미터를 지원하며, `ObjectMapper`를 사용하여 JSON 파싱을 수행한다.

```java
// sprout.mvc.argument.builtins.RequestBodyArgumentResolver
@Component
public class RequestBodyArgumentResolver implements ArgumentResolver {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean supports(Parameter parameter) {
        return parameter.isAnnotationPresent(RequestBody.class);
    }

    @Override
    public Object resolve(Parameter parameter, HttpRequest<?> request, Map<String, String> pathVariables) throws Exception {
        String rawBody = (String) request.getBody();

        if (rawBody == null || rawBody.isBlank()) {
            return null; // 바디가 없으면 null 반환
        }

        try {
            return objectMapper.readValue(rawBody.trim(), parameter.getType()); // JSON to Object
        } catch (Exception e) {
            throw new BadRequestException(
                    "Failed to parse request body as JSON or convert to '" + parameter.getType().getName() + "'. " +
                            "Check JSON format and target type. Cause: " + e.getMessage(), ResponseCode.BAD_REQUEST, e);
        }
    }
}
```
#### Test
`RequestBodyArgumentResolverTest`에서 유효하지 않은 JSON 형식에 대한 예외 처리를 검증한다.
```java
@Test
@DisplayName("유효하지 않은 JSON 형식일 때 BadRequestException을 던져야 한다")
void resolve_InvalidJsonFormat_ThrowsBadRequestException() throws NoSuchMethodException {
    String invalidJsonBody = "{name:\"test\"}"; // 유효하지 않은 JSON (키에 따옴표 없음)
    
    when(mockRequest.getBody()).thenReturn(invalidJsonBody);
    
    Method method = TestController.class.getMethod("handleUser", User.class);
    Parameter parameter = method.getParameters()[0];
    
    assertThrows(BadRequestException.class, () ->
        resolver.resolve(parameter, mockRequest, Collections.emptyMap())
    );
}
```

### CompositeArgumentResolver
개별 ArgumentResolver들이 각각의 역할에 충실하다면, 이들을 한데 모아 관리하고 적절한 리졸버를 찾아주는 것이 바로 `CompositeArgumentResolver`이다. `Dispatcher`는 직접 개별 ArgumentResolver를 호출하는 대신, `CompositeArgumentResolver`에게 요청 처리를 위임하는 구조로 작성했다.

```java
// sprout.mvc.argument.CompositeArgumentResolver
@Component
public class CompositeArgumentResolver {
    private final List<ArgumentResolver> delegates;

    public CompositeArgumentResolver(List<ArgumentResolver> delegates) {
        this.delegates = delegates;
    }

    public Object[] resolveArguments(Method method, HttpRequest<?> request, Map<String, String> pathVariables) throws Exception {
        Parameter[] params = method.getParameters();
        Object[] args = new Object[params.length];
        for (int i = 0; i < params.length; i++) {
            Parameter p = params[i];
            // 각 파라미터를 지원하는 ArgumentResolver를 찾아서 사용
            ArgumentResolver resolver = delegates.stream()
                    .filter(ar -> ar.supports(p))
                    .findFirst() // 가장 먼저 지원하는 ArgumentResolver 사용
                    .orElseThrow(() -> new IllegalStateException("No ArgumentResolver for parameter " + p));
            args[i] = resolver.resolve(p, request, pathVariables);
        }
        return args;
    }
}
```
`CompositeArgumentResolver`는 등록된 모든 `ArgumentResolver`들을 순회하며, 현재 처리하려는 메서드 파라미터를 지원하는(`supports()`가 `true`를 반환하는) 첫 번째 리졸버를 찾아 그 리졸버에게 실제 값 변환(`resolve()`)을 위임한다.

#### Test
`CompositeArgumentResolverTest`는 `CompositeArgumentResolver`가 어떻게 여러 ArgumentResolver를 관리하고 위임하는지 잘 보여준다.
```java
@Test
@DisplayName("각 파라미터를 지원하는 ArgumentResolver에게 성공적으로 위임해야 한다")
void resolveArguments_Success() throws Exception {
    Method method = TestController.class.getMethod("handleRequest", String.class, Integer.class);
    Parameter param1 = method.getParameters()[0]; // String
    Parameter param2 = method.getParameters()[1]; // Integer

    when(resolver1.supports(param1)).thenReturn(true);
    when(resolver1.resolve(param1, mockRequest, pathVariables)).thenReturn("resolvedString");
    
    when(resolver2.supports(param2)).thenReturn(true);
    when(resolver2.resolve(param2, mockRequest, pathVariables)).thenReturn(123);

    Object[] resolvedArgs = compositeResolver.resolveArguments(method, mockRequest, pathVariables);

    assertThat(resolvedArgs).containsExactly("resolvedString", 123);
    verify(resolver1, times(1)).resolve(param1, mockRequest, pathVariables);
    verify(resolver2, times(1)).resolve(param2, mockRequest, pathVariables);
}
```
이 테스트는 `CompositeArgumentResolver`가 두 개의 다른 파라미터를 각각 다른 `ArgumentResolver`에게 성공적으로 위임하는 과정을 명확하게 보여준다. verify를 통해 각 리졸버의 resolve 메서드가 정확히 한 번씩 호출되었음을 검증하여, 책임 분리가 잘 이루어졌음을 입증한다.

### TypeConverter
ArgumentResolver들이 HTTP 요청에서 문자열 형태의 값을 추출하면, 이 값들을 컨트롤러 메서드의 파라미터가 요구하는 실제 타입(예: long, int, boolean 등)으로 변환하는 작업이 필요하다. 이 역할을 전담하는 것이 바로 `TypeConverter`이다.

```java
// sprout.mvc.argument.TypeConverter
public final class TypeConverter {
    private TypeConverter() {} // 인스턴스화 방지

    public static Object convert(String value, Class<?> targetType) {
        if (value == null) { /* ... 생략 ... */ }

        if (targetType.equals(String.class)) {
            return value;
        } else if (targetType.equals(Long.class) || targetType.equals(long.class)) {
            return Long.parseLong(value);
        } else if (targetType.equals(Integer.class) || targetType.equals(int.class)) {
            return Integer.parseInt(value);
        } else if (targetType.equals(Boolean.class) || targetType.equals(boolean.class)) {
            return Boolean.parseBoolean(value);
        }
        throw new IllegalArgumentException("Cannot convert String value [" + value + "] to target class [" + targetType.getName() + "]");
    }
}
```

`TypeConverter`는 현재 `String`, `Long`, `Integer`, `Boolean` 타입에 대한 변환을 지원하며, 향후 더 다양한 타입을 지원하도록 확장될 수 있다. 

## ArgumentResolver의 역할과 중요성
`ArgumentResolver` 덕분에 컨트롤러 메서드는 HTTP 요청의 세부적인 파싱 로직에서 자유로워질 수 있다. 개발자는 `@PathVariable`, `@RequestParam`, `@RequestBody`와 같은 어노테이션을 사용하여 필요한 데이터를 선언적으로 명시하고, ArgumentResolver가 이 데이터를 자동으로 준비해 주기 때문에 비즈니스 로직에만 집중할 수 있게 되는 것이다.

이는 코드의 가독성을 높이고, 컨트롤러가 테스트하기 쉽게 만들어주며, 재사용 가능한 파라미터 처리 로직을 중앙 집중화하여 관리할 수 있게 한다.

# Spring 실제 구현체 비교
| 역할/클래스 | Sprout MVC 구현체 | Spring MVC 대응 구현체 | 설명 |
| --- | --- | --- | --- |
| **개념/인터페이스** | `ArgumentResolver` | `HandlerMethodArgumentResolver` | 컨트롤러 메서드의 특정 파라미터를 처리할 수 있는지 여부를 결정하고, 실제 값을 resolve 하는 인터페이스. |
| **경로 변수 처리** | `PathVariableArgumentResolver` | `PathVariableMethodArgumentResolver` | URL 경로 템플릿(예: `/users/{id}`)에서 변수 값을 추출하여 해당 이름의 파라미터에 바인딩한다. `@PathVariable` 어노테이션을 사용. |
| **쿼리 파라미터 처리** | `RequestParamArgumentResolver` | `RequestParamMethodArgumentResolver` | HTTP 요청의 쿼리 파라미터(예: `?name=value`)를 추출하여 해당 이름의 파라미터에 바인딩한다. `@RequestParam` 어노테이션을 사용. `required` 속성 처리도 유사함. |
| **요청 바디 처리** | `RequestBodyArgumentResolver` | `RequestResponseBodyMethodProcessor` | HTTP 요청의 바디(주로 JSON/XML)를 읽어와서 지정된 자바 객체로 역직렬화(Deserialize). `@RequestBody` 어노테이션을 사용하며, `ObjectMapper` (Jackson)와 같은 Message Converter를 내부적으로 활용. |
| **타입 변환 유틸리티** | `TypeConverter` | `ConversionService` (및 하위 Converter 구현체들) | 문자열 형태의 값을 대상 타입(숫자, boolean 등)으로 변환하는 유틸리티. Spring은 `ConversionService`라는 추상화된 계층을 통해 더욱 유연하고 확장 가능한 타입 변환 기능을 제공한다. |
| **복합 리졸버** | `CompositeArgumentResolver` | `HandlerMethodArgumentResolverComposite` | 여러 `ArgumentResolver` 구현체들을 하나로 묶어 관리하고, 각 파라미터에 대해 적절한 `ArgumentResolver`를 찾아 위임하는 역할을 한다. |
| **전반적인 흐름 제어** | `HandlerMethodInvoker` | `InvocableHandlerMethod` | `ArgumentResolver`들을 사용하여 메서드 파라미터를 준비하고, 최종적으로 컨트롤러 메서드를 호출하는 역할을 담당한다. |


---

스프링 프레임워크와 유사하게 웹 프레임워크에서 어떻게 HTTP 요청의 다양한 데이터가 컨트롤러 메서드의 파라미터로 "마법처럼" 주입되는지, 그 뒤에 숨겨진 `ArgumentResolver`의 동작 원리를 깊이 있게 살펴볼 수 있었다. 직접 만들게 되니`PathVariable`, `RequestParam`, `RequestBody` 각각의 데이터 타입을 처리하는 전용 `ArgumentResolver`들과 이들을 총괄하는 `CompositeArgumentResolver`의 역할이 잘 와닿았다.

스프링에서도 실제로 `ArgumentResolver` 같은 경우는 개발자가 필요한 경우 직접 구현하여 넣으면 동작하기도 하는, 접해볼 일이 많은 구현부라고 생각하여 따로 소개하게 되었다. 

다음은, `@Configuration` 과 `@Bean` 을 지원하면서, 컨테이너를 리팩토링하게 되었는데 그 부분을 다시 짚고 스프링 부트의 가장 강력한 기능 중 하나인 auto configuration이 어떤식으로 동작하고, 이 내부에선 어떤 방식으로 싱글톤을 유지시키는지에 대해 작성해볼 예정이다.


> https://github.com/yyubin/sprout

더 나은 영감, 인사이트, 개선 포인트가 있다면 댓글이든 이메일이든 혹은 PR이든 가리지 않고 환영합니다🤗
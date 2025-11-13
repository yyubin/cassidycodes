우선 지금까지의 구현 결과물 부터 보자.

### 개발 현황 소개
![](https://velog.velcdn.com/images/cassidy/post/209b0841-b504-44f8-95e5-e96ec6a8608c/image.png)

이렇게 보면 뭣도 없어보이지만.. 

```java
package test;

import sprout.beans.annotation.Controller;
import sprout.mvc.annotation.*;

@Controller
@RequestMapping("/api")
public class TestController {

    private final TestService testService;

    public TestController(TestService testService) {
        this.testService = testService;
    }

    @GetMapping("/")
    public String testServiceLayerInjection() {
        return testService.test();
    }


    @GetMapping("/test")
    public String test(@RequestParam String id, @RequestParam String name) {
        return "test success : " + id + ", " + name;
    }

    @GetMapping("/test/{id}")
    public String testWithPathVariable(@PathVariable String id) {
        System.out.println("test with path variable : " + id);
        return "test success : " + id;
    }

    @GetMapping("/test/{id}/{name}")
    public String testWithPathVariableAndQueryParam(@PathVariable String id, @PathVariable String name) {
        return "test with path variable and query param : " + id + ", " + name;
    }

    @PostMapping("/test")
    public String testWithPost(@RequestBody TestDto testDto) {
        return testDto.toString();
    }



}
```
이게 뭐 어쩌라고 싶겠지만.. 여기서 볼 것은, `import` 부분이다. 스프링을 **전혀 사용하지 않고 오로지 POJO로만(Reflection, CGLIB 등 사용함) 스프링과 똑같이 동작하게 구현했다.**(적어도 겉보기엔 같다..) 각각의 `@PathVariable`, `@RequestBody` 등 전부 어노테이션부터 전부 만들었고, 스프링의 ArgumentResolver 처럼 동작한다.(실제로 요청에서 파싱해서 넣어줌. 요청 파싱도 직접했음), 최초에 서버가 켜지면, 전부 스캔해서 의존성을 주입하고 **컨트롤러 매핑 정보**들은 미리 **RequestMappingRegistry**가 보유하도록 만들었다. `@PathVariable` 같은 `{id}`등의 패턴 처리도 전부 구현했다. 

DI 부분에선 `@Configuration` 과 `@Bean` 조합이 가능하도록 개선했다. 이걸 사용해서 사용자는 어떤 스레드 모델을 사용할 것인지 직접 설정 가능하게 해뒀고, 추후에 원하는 구현체를 선택할만한 구조라면, 이를 통해 주입시키도록 할 예정이다.

현재 스레드 모델 default 값은 JDK 21 이상부터 사용가능한 가상스레드로 설정해뒀다.(가상스레드에 대한 내용도 이전에 포스팅 해둔 바가 있다..) 만약 이보다 낮은 버전을 사용할 시, 특정 구현체(가상 스레드 구현체)를 지워야만 동작 가능할 것이다. 일반 스레드 풀 모델을 사용하고 싶다면 해당 `@Configuration` 부분 혹은 `application.yml` 에서 설정하면 된다..!

`application.yml`에서 파싱하여 `AppConfig`를 `Map` 형태로 관리하도록 설정해뒀다.. 이것도 `yaml` 을 직접 파싱해서 싱글톤으로 미리 생성된다.



그렇다고 `new` 키워드를 통해 어디선가 만들어서 직접 생성한 것도 아니다. 전부 자동으로 주입한다. 참고로 의존성 주입 부분은 전편에 있다. 추후에 `@Configuration` + `@Bean` 을 만들면서 수정 및 개선된 부분은 따로 포스팅 하겠다.

전체적인 흐름은, 정말 스프링과 유사하게 구현했다. 대부분의 구현체 이름이나 어노테이션 이름도 거의 동일하다. **오늘 자세히 살펴볼 부분은, `@Controller` 어노테이션 내부의 `path`, `value` 값이 어떻게 요청 값과 매핑되는지**이다. 참고로, 난 view resolver를 만들어서 html을 내려줄 예정은 없기 때문에, spring에서의 `@RestController`가 `@Controller`라고 생각하면 된다.

예전에 `@RequestMapping` 이 어떻게 작동되는지 가볍게 리플렉션으로 설명했던 포스팅이 있는데, 이의 연장선이라 생각할 수 있겠다.

# Spring `DispatcherServlet` 동작 원리

![](https://velog.velcdn.com/images/cassidy/post/a2daae51-3a17-4e04-b5ee-c31cc0f56153/image.png)

이게 실제 스프링의 `DispatcherServlet` 구조도인데, 아마 스프링을 자세히 공부하신 분들이라면 누구나 본 적 있을 것이다. 앞서 "뷰리졸버"를 안만들겠다고 했는데, 그건 그림에서 보이는 5번을 말하는 것이다.(물론 6번도 안만들 것) 오늘은 이 중에서도 1번, 2번, 3번(일부)을 어떻게 구현했고 어떤 게 스프링과 다르고 같은지 설명해보려고 한다.

**스프링 부트**는 서버로 내장 톰캣을 사용한다.
### 톰캣의 역할
1. **1차 요청 파싱**을 해서 **HttpServletRequest** 만들기
2. **HttpServletRequest** 객체를 스레드 풀의 스레드 하나에 할당
3. `web.xml`이나 어노테이션 설정에 따라 스프링의 `DispatcherServlet`에게 전달

**`DispatcherServlet`**의 역할은 **2차 파싱**으로 애플리케이션 데이터를 해석하는 것이다.

### `DispatcherServlet`의 역할
1. `request.getRequestURI()`로 얻은 `/api/users/123` 경로를 어떤 컨트롤러의 어떤 메서드가 처리할지(`@RequestMapping`) 찾아낸다.
2. `HandlerMapping`에서 해당 요청 메서드와 경로를 통해 적절한 컨트롤러를 찾는다
3. 쿼리 파라미터와 ArgumentResolver을 통해 파라미터 주입,`request.getQueryString()`으로 얻은 `name=yyubin` 같은 문자열을 해석하여 `@RequestParam`이 붙은 파라미터에 값을 매핑한다. 이 과정에서 내부적으로는 `request.getParameter()`를 호출하며, 이 때 톰캣이 파라미터를 파싱하기도 한다. 요청에 의해 지연(lazy) 파싱되는 구조이다.
4. `Request Body`라면 `HttpMessageConverter`를 사용하여 역직렬화를 진행한다. 헤더의 `Content-Type`이 `application/json`이면, `MappingJackson2HttpMessageConverter` (Jackson 라이브러리를 사용하는 변환기)를 선택한다. 이 컨버터가 request.getInputStream()을 통해 요청 본문(Body) 스트림을 처음으로 읽어서, Jackson 라이브러리를 사용해 JSON 텍스트를 **자바 객체(DTO)로 변환(역직렬화)**하는 것이다.


# Controller 매핑 정보 등록
### 부트스트랩

```java
public final class SproutApplication {

    public static void run(Class<?> primarySource) throws Exception {
        List<String> packages = getPackagesToScan(primarySource);

        Container ctx = Container.getInstance();
        ctx.bootstrap(packages);

        HandlerMethodScanner handlerMethodScanner = ctx.get(HandlerMethodScanner.class);
        handlerMethodScanner.scanControllers();

        HttpServer server = ctx.get(HttpServer.class);
        server.start(8080);
    }
```
`SproutApplication` 이 `run()` 하게 되면, 부트스트랩을 하며 모든 객체를 의존성 주입을 마친 채 생성한다.(이에 대한 자세한 과정은 전편에 있다) 그 후, `HandlerMethodScanner`을 꺼내, 모든 `scanControllers`를 진행하는데, 이때 모든 컨트롤러 정보들을 스캔하여 저장해둔다.

### HandlerMethodScanner & RequestMappingRegistry (핸들러 매핑)
```java
    public void scanControllers() {
        Collection<Object> beans = container.beans();
        for (Object bean : beans) {
            Class<?> beanClass = bean.getClass();
            if (beanClass.isAnnotationPresent(Controller.class)) {
                String classLevelBasePath = extractBasePath(beanClass);
                for (Method method : beanClass.getMethods()) {
                    RequestMappingInfoExtractor requestMappingInfoExtractor = findRequestMappingInfoExtractor(method);
                    if (requestMappingInfoExtractor != null) {
                        String methodPath = requestMappingInfoExtractor.getPath();
                        HttpMethod[] httpMethods = requestMappingInfoExtractor.getHttpMethods();

                        String finalPathString = combinePaths(classLevelBasePath, methodPath);
                        PathPattern pathPattern = pathPatternResolver.resolve(finalPathString);

                        for (HttpMethod httpMethod : httpMethods) {
                            requestMappingRegistry.register(pathPattern, httpMethod, bean, method);
                        }
                    }
                }
            }
        }
    }
```
1. Container에 등록된 Bean들 중에서 `@Controller` 어노테이션이 붙은 클래스를 찾아낸다.
2. 해당 컨트롤러의 모든 메서드를 스캔하여 `@RequestMapping` 계열 어노테이션이 있는지 확인하고, **URL 경로와 HTTP 메서드 정보를 추출**한다. 이때, `@RequestMapping` 계열 어노테이션이란, `@GetMapping`, `@PostMapping`, `@PutMapping` 등등이 있다.

```java
import sprout.beans.annotation.Component;
import sprout.mvc.http.HttpMethod;

import java.lang.reflect.Method;
import java.util.*;

@Component
public class RequestMappingRegistry {
    private final Map<PathPattern, Map<HttpMethod, RequestMappingInfo>> mappings = new LinkedHashMap<>();

    public void register(PathPattern pathPattern, HttpMethod httpMethod, Object controller, Method handlerMethod) {
        mappings.computeIfAbsent(pathPattern, k -> new EnumMap<>(HttpMethod.class))
                .put(httpMethod, new RequestMappingInfo(pathPattern, httpMethod, controller, handlerMethod));
    }

    public RequestMappingInfo getHandlerMethod(String path, HttpMethod httpMethod) {
        List<PathPattern> sortedPatterns = new ArrayList<>(mappings.keySet());
        Collections.sort(sortedPatterns, Comparator.comparingInt(PathPattern::getVariableCount));

        for (PathPattern registeredPattern : sortedPatterns) {
            if (registeredPattern.matches(path)) { // 매칭 확인
                Map<HttpMethod, RequestMappingInfo> methodMappings = mappings.get(registeredPattern);
                if (methodMappings != null) {
                    RequestMappingInfo info = methodMappings.get(httpMethod);
                    if (info != null) {
                        return info;
                    }
                }
            }
        }
        return null;
    }
}
```
3. `RequestMappingRegistry` 는, 스캔한 결과를 저장하는 중앙 저장소이다. `Map<PathPattern, Map<HttpMethod, RequestMappingInfo>>` 구조를 통해 "어떤 URL 패턴과 HTTP 메서드의 조합은 어떤 컨트롤러의 어떤 메서드가 처리한다"는 정보를 관리하는 것이다.
4. `getHandlerMethod` 호출 시, `Path Variable`이 적은 순서`(Comparator.comparingInt(PathPattern::getVariableCount))`로 정렬하여 **더 구체적인 경로가 먼저 매칭되도록** 하였다.

내가 만든 `PathPattern`은 아래와 같다.
```java
public class PathPattern {
    private final String originalPattern;
    private final Pattern regexPattern;
    private final List<String> variableNames;

    public PathPattern(String originalPattern) {
        this.originalPattern = originalPattern;
        this.variableNames = new ArrayList<>();
        this.regexPattern = compilePattern(originalPattern);
    }

    private Pattern compilePattern(String pattern) {
        StringBuilder regex = new StringBuilder();
        Matcher matcher = Pattern.compile("\\{([^/{}]+)}").matcher(pattern);
        int lastEnd = 0;

        while (matcher.find()) {
            regex.append(Pattern.quote(pattern.substring(lastEnd, matcher.start())));
            regex.append("([^/]+)");
            variableNames.add(matcher.group(1));
            lastEnd = matcher.end();
        }

        regex.append(Pattern.quote(pattern.substring(lastEnd)));
        return Pattern.compile("^" + regex + "$");
    }

    public boolean matches(String path) {
        return regexPattern.matcher(path).matches();
    }

    public Map<String, String> extractPathVariables(String path) {
        Matcher matcher = regexPattern.matcher(path);
        Map<String, String> result = new HashMap<>();

        if (matcher.matches()) {
            for (int i = 0; i < variableNames.size(); i++) {
                result.put(variableNames.get(i), matcher.group(i + 1));
            }
        }

        return result;
    }
```
일부만 발췌해 왔다.

### Spring과 차이점
Spring의 `PathPattern`이나 `AntPathMatcher는` 와일드카드`(*, **)` 등 훨씬 복잡한 패턴 매칭과 정교한 우선순위 결정을 지원한다. 이 프로젝트의 `PathPattern`은 `{variable}` 형태의 경로 변수에 집중하여 간결하게 구성했다.

# HttpServer & ConnectionHandler (내장 웹 서버)
```java
package sprout.server;

import sprout.beans.annotation.Component;
import sprout.mvc.dispatcher.RequestDispatcher;

import java.net.ServerSocket;
import java.net.Socket;

@Component
public class HttpServer {

    private final ThreadService threadService;
    private final RequestDispatcher dispatcher;

    public HttpServer(ThreadService threadService, RequestDispatcher dispatcher) {
        this.threadService = threadService;
        this.dispatcher = dispatcher;
    }

    public void start(int port) throws Exception {
        try (ServerSocket server = new ServerSocket(port)) {
            while (true) {
                Socket socket = server.accept();
                ConnectionHandler handler = new ConnectionHandler(socket, dispatcher);
                threadService.execute(handler);
            }
        } finally {
            threadService.shutdown();
        }
    }
}
```
1. `java.net.ServerSocket`을 사용하여 특정 포트에서 TCP 연결 요청을 계속해서 대기한다.
2. 연결이 수립되면`(server.accept())`, 해당 Socket을 `ConnectionHandler`에 넘기고 스레드 풀(ThreadService)에서 실행시킨다. 이때의 `ThreadService` 에는 현재 톰캣 BIO 모델인 스레드 풀 모델, 가상 스레드 모델이 있다.(default는 가상스레드)

```java
package sprout.server;

import sprout.mvc.dispatcher.RequestDispatcher;
import sprout.mvc.http.ResponseEntity;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class ConnectionHandler implements Runnable {
    private final Socket socket;
    private final RequestDispatcher dispatcher;

    public ConnectionHandler(Socket socket, RequestDispatcher dispatcher) {
        this.socket = socket; this.dispatcher = dispatcher;
    }

    @Override public void run() {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             BufferedWriter out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()))) {

            String raw = readRawRequest(in);
            if (raw.isBlank()) return;

            ResponseEntity<?> resp = dispatcher.dispatch(raw);
            writeResponse(out, resp);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private String readRawRequest(BufferedReader in) throws IOException {
        StringBuilder sb = new StringBuilder();
        String line; int contentLength = 0;

        while ((line = in.readLine()) != null && !line.isEmpty()) {
            sb.append(line).append("\r\n");
            if (line.startsWith("Content-Length:"))
                contentLength = Integer.parseInt(line.split(":")[1].trim());
        }
        if (contentLength > 0) {
            char[] buf = new char[contentLength];
            in.read(buf, 0, contentLength);
            sb.append("\r\n").append(buf);
        }
        return sb.toString();
    }
}

```
`ConnectionHandler`의 일부만 발췌해왔다.

3. `Socket`의 `InputStream`으로부터 `Raw HTTP Request` 문자열을 읽어들인다. 여기에선, `Content-Length` 헤더를 파싱하여 `Body`까지 읽도록 하였다.

4. 해당 문자열을 읽으면, 이 문자열을 `RequestDispatcher`에게 넘겨 처리하도록 위임한다.

5. `RequestDispatcher`로부터 `ResponseEntity`를 돌려받아, HTTP Response 포맷에 맞는 문자열로 변환하여 `OutputStream`에 쓰는 구조이다. 컨트롤러의 반환 타입과 관계없이, 최종 응답은 ResponseEntity로 통일하여 처리하도록 설계했다. body의 여부나 요청정보로 유추하여 적절하게 던질 수 있도록 구성해뒀다. (물론 유추라 부정확할 수 있음. 그냥 개발자가 `ResponseEntity`를 만들어서 내리면 받아줌. 응답을 반드시 획일화하고 싶었다..)

### Spring과 차이점
사실 스프링과 가장 큰 차이점이라면, Spring Boot는 `Tomcat`, 혹은 `Jetty` 와 같은 전문 서블릿 컨테이너를 내장한다는 것이다. 나는 `ServerSocket`을 이용해 직접 로우 레벨 HTTP 서버를 만들고자 하였다. Spring에서는 개발자가 `HttpServletRequest`나 `HttpServletResponse`라는 잘 추상화된 객체를 다루지만 현재 프로젝트에서는 `ConnectionHandler`가 직접 소켓 스트림과 Raw Text를 다루는 구조이다. 개인적으론 의미 있는 학습 포인트라고 생각한다.


# RequestDispatcher & HttpRequestParser (프론트 컨트롤러)
```java
package sprout.mvc.http.parser;

import sprout.beans.annotation.Component;
import sprout.mvc.http.HttpRequest;

@Component
public class HttpRequestParser {
    private final RequestLineParser lineParser;
    private final QueryStringParser qsParser;

    public HttpRequestParser(RequestLineParser lineParser, QueryStringParser qsParser) {
        this.lineParser = lineParser;
        this.qsParser = qsParser;
    }

    public HttpRequest<?> parse(String raw) {
        String[] parts = split(raw);
        String headerPart = parts[0];
        String bodyPart   = parts[1];
        String firstLine  = headerPart.split("\r?\n",2)[0];
        var rl    = lineParser.parse(firstLine);
        var query = qsParser.parse(rl.rawPath());
        return new HttpRequest<>(rl.method(), rl.cleanPath(), bodyPart, query);
    }
}
```
`HttpRequestParser`도 일부만 가져왔다.

1. `HttpRequestParser`는 `ConnectionHandler`가 읽어들인 Raw HTTP Request 문자열을 의미 있는 `HttpRequest` 객체로 파싱한다.(`RequestLineParser`, `QueryStringParser`를 조합하여 역할을 분리하여 설계했다.)

```java
@Component
public class RequestDispatcher {

    private final HttpRequestParser parser;
    private final HandlerMapping mapping;
    private final HandlerMethodInvoker invoker;
    private final List<ResponseResolver> responseResolvers;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RequestDispatcher(HttpRequestParser parser,
                             HandlerMapping mapping,
                             HandlerMethodInvoker invoker,
                             List<ResponseResolver> responseResolvers
    ) {
        this.parser = parser;
        this.mapping = mapping;
        this.invoker = invoker;
        this.responseResolvers = responseResolvers;
    }

    public ResponseEntity<?> dispatch(String raw) throws JsonProcessingException {
        try {
            HttpRequest<?> req = parser.parse(raw);
            HandlerMethod hm = mapping.findHandler(req.getPath(), req.getMethod());
            if (hm == null) throw new BadRequestException();
            Object returnValue = invoker.invoke(hm.requestMappingInfo(), req);
            for (ResponseResolver resolver : responseResolvers) {
                if (resolver.supports(returnValue)) {
                    // 찾으면 바로 변환하고 결과를 반환
                    return resolver.resolve(returnValue, req);
                }
            }
            throw new IllegalStateException("No suitable ResponseResolver found for return value: " + returnValue);
        } catch (UnsupportedHttpMethod | BadRequestException e) {
            return ResponseEntity.badRequest();
        } catch (Exception ex) {
            //String msg = exceptionProcessor.handleUndefinedException(ex);
            return ResponseEntity.badRequest();
        }
    }
}
```
`RequestDispatcher`는 **프론트 컨트롤러(Front Controller)** 패턴의 핵심 구현체다.

2. `HttpRequestParser`로 요청을 우선 파싱한다. 위의 구현체다.
3. `HandlerMapping`에 요청 Path와 Method를 전달하여 처리할 핸들러(`HandlerMethod`)를 찾아온다.
4. `HandlerMethodInvoker`를 통해 실제 컨트롤러 메서드를 실행한다.
5. 메서드 실행 결과를 `ResponseResolver`를 통해 클라이언트에게 보낼 최종 `ResponseEntity`로 변환한다.

해당 부분에서, 컨트롤러에서 요구하는 Argument들을 resolve하는 부분은, 다음 포스팅에서 설명하겠다. `ResponseEntity`로 반환하기 위한 resolver들도 있지만, Spring에선 없는 자체적으로 만든 기능이기에 설명은 생략하겠다.

현재 주석처리된 부분엔, 추후 `ExceptionProcessor`를 사용하여 개발자가 전역 예외처리를 하겠다면 지원해줄 수 있도록 추가해볼 예정이다.

### Spring과 차이점
우선은, Spring MVC의 `DispatcherServlet`과 역할, 책임, 동작 순서가 거의 일치한다. 이는 현대적인 MVC 프레임워크의 표준적인 설계 패턴이고 이를 구현해보고자 하였다. 다만, 이 프로젝트에서는 직접 만든 `HttpRequest` 객체를 다루지만 Spring의 `DispatcherServle`은 서블릿 컨테이너가 생성해준 표준 객체를 다룬다. 또한 예외처리나 응답 변환 부분이 훨씬 간결하게 구현되어 있다.



---

# Sprout MVC vs. Spring Framework 핵심 컴포넌트 비교

| **Sprout 프레임워크 구현체** | **Spring 프레임워크 매칭 구현체** | **역할 및 설명** |
| --- | --- | --- |
| **`SproutApplication`** | **`SpringApplication`** (in Spring Boot) | 애플리케이션을 시작하고, IoC 컨테이너를 설정하며, 웹 서버를 실행하는 **진입점(Entry Point)** 이다. |
| **`Container`** | **`ApplicationContext`** (e.g., `AnnotationConfigApplicationContext`) | `@Component` 등을 스캔하여 Bean을 등록하고, 의존성을 주입(DI)하며, 객체의 생명주기를 관리하는 **IoC 컨테이너**이다. |
| **`@Component`, `@Controller`** | **`@Component`, `@Controller`** | 클래스를 스캔하여 IoC 컨테이너에 Bean으로 등록하도록 표시하는 **스테레오타입 어노테이션**이다. (이름과 역할이 동일하다.) |
| **`RequestDispatcher`** | **`DispatcherServlet`** | 모든 HTTP 요청을 가장 먼저 받아 적절한 컨트롤러에 분배하는 **프론트 컨트롤러(Front Controller)** 이다. MVC 아키텍처의 핵심이기도 하다. |
| **`HandlerMappingImpl`**, **`RequestMappingRegistry`** | **`RequestMappingHandlerMapping`** | `@RequestMapping` 어노테이션 정보를 수집하여, 요청 URL과 HTTP 메서드를 처리할 컨트롤러 메서드(**`HandlerMethod`**)로 **매핑하는 역할**을 한다. |
| **`PathPattern`** | **`PathPattern`** / `AntPathMatcher` | `/users/{id}`와 같은 URL 패턴을 파싱하고, 실제 요청 경로와 일치하는지 확인하며, 경로 변수(Path Variable)를 추출한다. |
| **`HandlerMethodInvoker`** | **`RequestMappingHandlerAdapter`**, **`InvocableHandlerMethod`** | 매핑된 컨트롤러 메서드를 **실제로 실행(Invoke)**한다. 요청 데이터를 메서드 파라미터에 맞게 변환하고 주입하는 로직을 포함하고 있다. |
| **`CompositeArgumentResolver`**(개념) | **`HandlerMethodArgumentResolver`** | `@RequestBody`, `@RequestParam`, `HttpServletRequest` 등 컨트롤러 메서드의 다양한 파라미터를 해석하고, 적절한 값을 주입해주는 전략 인터페이스이다. |
| **`ResponseResolver`**(개념) | **`HandlerMethodReturnValueHandler`, `HttpMessageConverter`** | 컨트롤러 메서드가 반환한 값(`ResponseEntity`, `String`, 객체 등)을 실제 HTTP 응답(JSON, HTML 등)으로 변환하는 역할을 한다. |
| **`ResponseEntity`** | **`ResponseEntity`** | HTTP 응답의 상태 코드, 헤더, 본문(Body)을 포함하는 객체다. (이름과 역할이 동일하다.) |
| **`HttpServer`, `ConnectionHandler`** | **내장 서블릿 컨테이너**(Embedded **Tomcat**, Jetty, Undertow) | **로우-레벨(Low-Level)의 HTTP 요청을 직접 처리**하는 내장 웹 서버이다. Spring Boot는 Tomcat 같은 전문 WAS를 추상화하여 사용한다. |
| **`HttpRequestParser`, `HttpRequest`** | **`HttpServletRequest`** (Servlet API) | Raw HTTP 요청을 파싱하여 생성된 객체다. Spring은 서블릿 컨테이너가 파싱하여 만들어준 표준 `HttpServletRequest`를 사용하므로 직접 파싱하지 않는다. |

---

다음 편에서는 컨트롤러 파라미터 리졸버에 대해 이야기할 예정이다.
`@PathVariable`, `@RequestParam`, `@RequestBody`…
이 익숙한 어노테이션들이 어떻게 요청에서 데이터를 뽑아다 메서드에 꽂아주는지, 내가 직접 구현한 Argument Resolver 체계는 어떤 방식으로 동작하는지, 그리고 이 모든 것들이 진짜 요청을 받았을 때 어떤 순서로 움직이는지 살펴볼거다. 물론 스프링과의 비교도 해가면서.. 흐름상 이 글에서 덧붙이는게 나쁘지 않지만 솔직히 이거보다 더 줄일 수가 없는데 너무 긴 것 같아서 잘라 소개하기로 결정했다.


보다 더 구체적인 코드들은 다음의 레포지토리에서 확인 가능합니다.
> https://github.com/yyubin/sprout

특히 오늘 구현한 부분이 궁금하다면 아래의 경로로 가면됩니다.
>https://github.com/yyubin/sprout/tree/main/src/main/java/sprout/mvc

더 나은 영감, 인사이트, 개선 포인트가 있다면 댓글이든 이메일이든 혹은 PR이든 가리지 않고 환영합니다🤗

# 계기
해당 프로젝트 기간은 약 4일 정도로 굉장히 타이트 했음. 그만큼 가볍게 만들기를 권장 받았다. 
기존 프로젝트 기반으로 jdbc template / servlet 붙여서 간단하게 백엔드 붙이는게 요구사항이었음.
프론트는 supabase로 구현되어 있었고 해당 데이터베이스를 그대로 활용하기로 했다. 몰랐는데 `postgresql`을 사용하길래 걍 어려울것 없이 바로 사용 가능했음.

또 최근에는 스프링 위주의 과정과 실습이 이어지고 있어서 내장 톰캣의 서블릿 기반으로 이루어진 프레임워크라는 걸 체감하기에 좋은 환경이라고 생각했다. 나는 또한 기존의 `sprout` 프로젝트에서 pojo로 스프링 구현하기를 해보았기 때문에 아주 짧은 기간이지만 구현에는 무리 없을거라고 생각하고 진행했다.

앞으로의 실습에서 나중에 지금 프로젝트를 다시 스프링 부트를 마이그레이션 한다고 했는데, 추후에는 더 바꿀 것도 없이 `import`만 수정하면 바로 코드 활용할 수 있도록 유사성 위주의 초점을 맞췄다.

> 스프링 내부 구조를 공부하기 위해서.. 라는 뻔한 말은 좀 내려두자. 사실은 공개적인 곳에서 내가 쌓은 역량을 평가받고 싶었음

# 차이
또한 이전 `sprout`에서는 프레임워크 내부에서 사용되는 객체들도 전부 DI/IoC 컨테이너에서 관리하는 구조였는데, 이는 개발자가 추후 프레임워크 내부에 플러그인하거나 커스텀하기에 좋아지지만 빠르게 개발하기 위해서는 굳이 그럴 필요도 없고, 실제 스프링 동작과도 차이가 있기 때문에 그렇게 구현하지는 않았다.

또, 이번에 서버 부분은 내장 톰캣을 사용한다는게 가장 큰 차이점이라 볼 수 있겠다.

기본적인 `handlerMapping`, `argumentResolver`, `applicationContext` 및 의존성 해결 알고리즘은 기존 `sprout`를 거의 그대로 가져왔다고 봐도 좋을 듯 싶다.

# 구현 부분
- Xpring MVC Framework 설계 및 구현
- DispatcherServlet / HandlerMapping / HandlerAdapter 구현
- Reflection 기반 IoC Container 구현
- 위상정렬 기반 생성자 주입 및 순환 의존성 감지 구현
- ArgumentResolver 기반 @PathVariable, @RequestParam, @RequestBody, @CurrentUser 처리
- 정적/동적 라우팅 충돌 해결
- ThreadLocal 기반 인증 컨텍스트 전파 구조 구현
- 해당 프레임워크를 기반으로 한 API(좋아요/리뷰/상품 등) 구현
- CI/CD 구성 및 배포

# 사용 기술
- JAVA 21
- Postgresql
- JOOQ
- Tomcat 11
- Hikari CP
- JWT
- Vercel
- Render
- Supabase

### 배포 첨언
배포 기술 관련해서, 익숙한 아마존으로 하는게 나도 더 좋다.. 다만 장기적으로 열어둬서 팀원들이 추후에도 포폴로 사용할 수 있게(이런 경우 또 참여도도 좋았던 것 같다. 과거 경험상) 하기 위해 무료고 관리가 쉬운 조합으로 만들었다.

프론트는 Vercel / 백엔드는 Render / 데이터베이스는 Supabase 로 배포되어있다.
솔직히 이 조합으로 하니 아주아주 간단했고, 비용도 0이다. 정말 전혀 없다.

다만 백엔드 같은 경우 15분 이상 사용하지 않으면 서버를 내림. 그리고 요청이 들어오면 다시 켠다.
그래서 첫 요청의 경우 거의 1분정도 걸림 ㅋㅋ

이게 싫으면 13~14분마다 한번씩 요청 보내도록 cron-job을 설정하면 되지만 귀찮다..

### JOOQ 
이번에 처음 써봄. JPA나 querydsl 같은거 없이 쓰려면 정말 jdbc template이나 mybatis 정도 였는데 주크도 요즘엔 많이 쓰인다.. 생긴지 10년 됐지만 루키같은 느낌

사용 후기라면, 꽤괜인듯? 걍 나중에 N+1 같은거나 좀 정말 원하는 쿼리대로 가져오고 싶을때 사용해도 좋을 것 같다. 가독성 자체는 평범함. 모든 orm이 그렇고 sql 자체도 그러하듯이 그냥 저냥 괜찮음. 프론트에서 수퍼베이스 쓸때랑 비슷한 듯.

일단 추후에 데이터베이스가 바뀌어도 걍 방언 설정만 바꿔주면 바로 이어서 사용 가능한게 장점이긴 하다.
mybatis 같은 경우는 그렇지 못하지만 한국에서 여전히 인기가 많음. 그리고 개인적으론 xml을 안좋아함.

다만 팀원들이 지원하려는 회사들이 mybatis를 기술스택으로 선호하는 경우가 있어 앞서서 여쭤보았지만 승인해주셔서 그렇게 진행하긴 했다. 

### Hikari CP
사실 커넥션 풀을 직접 만들어볼까 하는 생각이 있었지만 멀티스레드에 그래도 나름 최종적으로 배포까지 할거니까 그런 지랄은 안하기로 결정하고 Hikari CP를 사용했다.

### JWT
해당 인증 기능 구현을 위해 스프링 시큐리티의 메커니즘을 차용해서 간단하게 만들었다.
`Filter`와 `Interceptor` 와 같은 스프링에서 배우는 개념들이 있는데, 사실 필터는 톰캣꺼다.
그래서 시큐리티 필터를 스프링 없이도 만들 수 있음.

```java
public abstract class SecurityFilter implements Filter {

    @Override
    public final void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        try {
            Authentication authentication = authenticate(req, resp);
            SecurityContextHolder.setAuthentication(authentication);
            chain.doFilter(request, response);
        } finally {
            // 요청 종료 시 반드시 정리 — 스레드 풀 재사용으로 인한 컨텍스트 누출 방지
            SecurityContextHolder.clearContext();
        }
    }

    /**
     * 요청에서 인증 정보를 추출해 반환한다.
     * 인증 불필요한 요청은 null을 반환하면 된다.
     */
    protected abstract Authentication authenticate(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException;
}
```
해당 추상 클래스를 만들어 넣어뒀다. 그리고 톰캣 서버 실행할때 필터 넣어주기만 하면 됨.

```java
public final class SecurityContextHolder {
    private static final ThreadLocal<SecurityContext> holder = new ThreadLocal<>();

    private SecurityContextHolder() {}

    public static SecurityContext getContext() {
        SecurityContext ctx = holder.get();
        if (ctx == null) {
            ctx = new SecurityContext();
            holder.set(ctx);
        }
        return ctx;
    }

    public static void setAuthentication(Authentication authentication) {
        getContext().setAuthentication(authentication);
    }

    public static Authentication getAuthentication() {
        return getContext().getAuthentication();
    }

    public static void clearContext() {
        holder.remove();
    }
}
```
이게 스레드 로컬을 사용한 `SecurityContextHolder`이다. 사실 시큐리티는 이 개념이 가장 핵심이고.. 물론 스레드 로컬 말고도 다른 전략 많지만 우선은?

```java
@Component
@RequiredArgsConstructor
public class JwtSecurityFilter extends SecurityFilter {

    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;

    @Override
    protected Authentication authenticate(HttpServletRequest request, HttpServletResponse response)
            throws IOException {

        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7);

        if (jwtProvider.isExpired(token)) {
            request.setAttribute("TOKEN_EXPIRED", true);
            return null;
        }

        if (jwtProvider.validateToken(token)) {
            Claims claims = jwtProvider.parseClaims(token);
            Long userId = Long.parseLong(claims.getSubject());

            Optional<User> userOpt = userRepository.findById(userId);

            if (userOpt.isPresent()) {
                return new JwtAuthentication(userOpt.get());
            }
        }
        return null;
    }
}
```
다른 팀원 분이 실제로 구현해주신 부분임. 실제 스프링 시큐리티때와 아주 크게 다를 것도 없다.

아무튼 해당 방법으로 JWT 구현했다.

추가로, `SecurityContextHolder`에 접근해서 인증정보를 가져오는게 일반적인데,
비지니스 로직 레이어에서 남발하는 경우 깔끔하지가 않음. 그래서 아래와 같은 처리로 일원화 하도록 했다.
```java
public class AuthenticationArgumentResolver implements ArgumentResolver {

    @Override
    public boolean supports(Parameter parameter) {
        return parameter.isAnnotationPresent(CurrentUser.class)
                || Authentication.class.isAssignableFrom(parameter.getType());
    }

    @Override
    public Object resolve(Parameter parameter, HttpServletRequest request, HttpServletResponse response,
                          Map<String, String> pathVariables) {
        Authentication auth = SecurityContextHolder.getAuthentication();

        // Authentication 타입 직접 주입
        if (Authentication.class.isAssignableFrom(parameter.getType())) {
            return auth;
        }

        // @CurrentUser → principal 반환, 토큰 만료/비인증이면 401
        if (auth == null) {
            if (Boolean.TRUE.equals(request.getAttribute("TOKEN_EXPIRED"))) {
                throw new TokenExpiredException();
            }
            throw new UnauthorizedException();
        }
        return auth.getPrincipal();
    }
}
```
ArgumentResolver를 안다면 바로 아실듯. 해당 개념이 지금 만들어둔 프로젝트에도 녹아 있다.
사용은 그냥 컨트롤러 파라미터 쪽에 어노테이션 붙이면 넣어주는 것.
지금 구현에서는 회원이 로그인 되어있다면 정보를 활용하고 그렇지 않다면 걍 스루 해주는 그러한 로직은 따로 없음. 만약 그런거 하려면 다른걸 만들거나 수정해야함. 지금은 인증없으면 익셉션이다.

# 공통 모듈
## ResponseEntity
```java
    public static <T> ResponseEntity<T> ok(T body) {
        return new ResponseEntity<>(HttpStatus.OK, body);
    }

    public static <T> ResponseEntity<T> created(T body) {
        return new ResponseEntity<>(HttpStatus.CREATED, body);
    }

    public static ResponseEntity<Void> noContent() {
        return new ResponseEntity<>(HttpStatus.NO_CONTENT, null);
    }

    public static <T> ResponseEntity<T> badRequest(T body) {
        return new ResponseEntity<>(HttpStatus.BAD_REQUEST, body);
    }

    public static <T> ResponseEntity<T> notFound(T body) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND, body);
    }
```
응답 일원화를 위한 `ResponseEntity` 객체다.

## 로깅
![](https://velog.velcdn.com/images/yyubin/post/bba67b1a-aa21-4d9e-aca7-11af9c3b70cf/image.png)

메인 시작하면 이런 아스키도 내려줌. 로그 형식도 스프링 처럼 보이도록 의도했다. 쫌 기여운듯

## 페이징 객체
```java
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {
    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return new PageResponse<>(
                content,
                page,
                size,
                totalElements,
                totalPages,
                page < totalPages - 1,
                page > 0
        );
    }
}
```
페이징 처리를 위해 사용. 

## ControllerAdvice
```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleProductNotFound(ProductNotFoundException e) {
        return ResponseEntity.notFound(ErrorResponse.of(ErrorCode.NOT_FOUND, e.getMessage()));
    }

    @ExceptionHandler(BrandNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleBrandNotFound(BrandNotFoundException e) {
        return ResponseEntity.notFound(ErrorResponse.of(ErrorCode.NOT_FOUND, e.getMessage()));
    }

    @ExceptionHandler(CartItemNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleCartItemNotFound(CartItemNotFoundException e) {
        return ResponseEntity.notFound(ErrorResponse.of(ErrorCode.NOT_FOUND, e.getMessage()));
    }
}
```
글로벌 익셉션 핸들러는 있는게 좋을 것 같아서 추가로 만듦.

## RequestParam required
```java
public class RequestParamArgumentResolver implements ArgumentResolver {

    @Override
    public boolean supports(Parameter parameter) {
        return parameter.isAnnotationPresent(RequestParam.class);
    }

    @Override
    public Object resolve(Parameter parameter, HttpServletRequest request, HttpServletResponse response,
                          Map<String, String> pathVariables) {
        RequestParam annotation = parameter.getAnnotation(RequestParam.class);
        String name = annotation.value();
        if (name.isEmpty()) name = parameter.getName();

        String value = request.getParameter(name);
        if (value == null && annotation.required()) {
            throw new MissingRequestParamException(name);
        }
        return TypeConverter.convert(value, parameter.getType());
    }
}
```
팀원 중 한분이 `required` 옵션을 만들어 달라고 요청 주셨다.
그래서 추가로 구현함. 뭔가 되게 재미있었음..

그리고 당연하지만 `@RequestBody`, `@RequestParam`, `@PathVariable` 전부 지원한다.
MVC 모듈 쪽에서 사실 파싱 로직이 제일 까다로운데 톰캣이 해주니까 편하긴 함.

나머진 뭐 상태코드라던가 이런 부분이니까 넘어가자.

# 컨벤션
해당 프로젝트 코드 자체는 스프링과 다를게 없다. 그래서 스프링.. 컨벤션과 유사한듯.
그리고 시간도 4일정도 였고, 마지막 하루는 바로 발표일이라 사실상 3일정도 였음. 별로 여유는 없었지만 기본적인 건 설정했다.

## Restful 규칙
- 복수형 사용 / 명사 사용 / 동사 X
- 끊어써야 하는 경우는 `-` 사용
  - `Java_collection` -> `java-collections`
- `fetch`/`put` 용도에 맞게 사용하기
  - `put`으로 받아서 하나만 수정하지 않기
  - `fetch`로 받아서 전부 수정하지 않기
- get 요청시 
  - 하나만 찾을 때 `/products/{id}`
  - 여러개 찾을 때 `/products`
  - 상위하위 관계 고려해서 설계
    - `/products/categories/1` 보다는
    - `/categories/1/products` 가 조금 더 직관적이고 정합적이지 않나 생각했다

## 삭제 규칙
- 대부분 논리삭제
  - 조회시 `deleted` 필터링
- 일부 물리삭제
  - 유저 좋아요 및 장바구니 데이터 물리삭제
  - 만약 해당 데이터 필요하면 별도 로깅 데이터 수집하는 걸로
  - 토글로 관리 시 이미 필요없는 데이터가 누적되어 조회 성능만 낮게 나옴
  - 관련 인덱싱 추가

## 익셉션
- 자바 기본 클래스 사용할 수 있는 경우는 해당 익셉션 사용

## 기타
- **static 클래스는 생성하지 않는다**
- 기본생성자 막아두기 (private)

개인적으로 코드 구경할 때 헉하는 부분이 api url이 restful하지 않은 경우,
static 클래스를 생성해서 사용하는 경우는.. 물론 요즘 JVM이 내부적으로 처리해주고 IDE에서도 잡아줘서 그런 경우는 거의 없지만
그냥 바보같아 보여서 싫다..

## 커밋 컨벤션/브랜치 컨벤션
### 커밋 컨벤션
| 시드 | 설명 |
| --- | --- |
| feat | 기능 추가 |
| refactor | 수정, 개선 |
| docs | 문서 수정 |
| chore | 배포, 정리 |
| fix | 버그 수정 |
| design | 디자인 변경/UI 변경 |
| test | 테스트 |

### 브랜치 컨벤션
| 시드 | 설명 |
| --- | --- |
| feat | 기능 추가 |
| refactor | 수정, 개선 |
| docs | 문서 수정 |
| chore | 배포, 정리 |
| fix | 버그 수정 |
| design | 디자인 변경/UI 변경 |
| test | 테스트 |

브랜치 컨벤션은 내가 제일 안지킨것 같다..

# 트러블슈팅
## 라우팅 — 정적 경로와 동적 경로 충돌
`/products/ranks`와 `/products/{id}` 두 핸들러가 있을 때, path variable의 Regex가 [^/]+이기 때문에 ranks라는 문자열도 `{id}`로 매칭된다. 처음엔 first-match 방식이었는데, 등록 순서에 따라 동작이 달라지는 게 말이 안 됨. 처음 설계할 때 놓쳤던 부분이다.

해결은 아래와 같이 했다.
1. **핸들러 등록 시 사전 정렬** — path variable이 적을수록(정적 세그먼트가 많을수록) 먼저 검사한다.
```java
handlers.sort(Comparator
    .comparingInt((HandlerMethod h) -> h.getPathVariableNames().size())
    .thenComparingInt(h -> -h.getPathTemplate().length()));
```

2. **best-match로 교체** — 정렬만으론 안전하지 않아서 루프에서 path variable이 가장 적은 핸들러를 최종 선택한다. 정적 경로(varCount == 0)가 매칭되면 즉시 확정

3. **타입 기반 Regex 세분화** — Long/Integer 파라미터는 `\d+`, 나머지는 `[^/]+`으로 컴파일한다. 숫자 ID와 문자열 slug가 서로 매칭되지 않는다.
```java
regex.append(isNumericParam(varName, params) ? "(\\d+)" : "([^/]+)");
```

## Generic 역직렬화 — 타입 소거의 함정
`@RequestBody List<CartItemRequest>` 파라미터를 역직렬화했는데 `List<LinkedHashMap>`이 반환됐다.
원인은 Java 타입 소거 때문이다. 런타임에 `parameter.getType()`은 `List.class`만 반환하고, 원소 타입 정보는 사라진다. Jackson은 원소 타입 없이 `List.class`만 받으면 각 원소를 기본 타입인 `LinkedHashMap`으로 역직렬화한다.

해결은 `getParameterizedType()`이었다.
```java
// Before: parameter.getType() → List.class (원소 타입 소실)
// After:
JavaType javaType = objectMapper.constructType(parameter.getParameterizedType());
return objectMapper.readValue(request.getInputStream(), javaType);
```
`getParameterizedType()`은 `List<CartItemRequest>` 전체 타입 정보를 보존한다. Jackson의 `constructType()`에 넘기면 제대로 역직렬화된다.

> 사실 트슈 내용들 `sprout`때 만들면서 이미 알던거다. 근데 만약 나중에 포폴쓰면 이 부분 트슈로 어필할 거임. 그리고 블로그까지는 안보더라 ㅇㅇ..

---

# 총평
재미있었다. 톰캣 기반이라 솔직히 걱정도 많이 덜었음. 나중에 스프링으로 마이그레이션 하기도 너무 쉬울듯? 근데 발표 끝나고 다른 분들 기죽지말라고 격려하시는 모습을 보니 좀 머쓱하기도 했다. 사실 정말 짧은 시간이었고 풀타임으로 주어진 시간도 아니었어서 좀 과한 볼륨은 맞긴하다. 내가 이전에 해봤던 경험이고 스프링 개발 경험이 있는 팀원분들이 계셔서 가능하지 않았나 싶다. 그리고 뭔가 발표에서 설명할 때 너무 기술적인 것만 쏟아냈나.. 싶기도 하다.

> https://github.com/next-fitory/backend

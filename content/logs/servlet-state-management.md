# Servlet 상태 관리 - Cookie와 Session

HTTP는 요청 하나가 끝나면 이전 요청 정보를 기억하지 않는 무상태 프로토콜이다. 로그인, 장바구니, 사용자 설정처럼 여러 요청에 걸쳐 유지해야 하는 값은 별도의 상태 관리 장치가 필요하다. Servlet에서는 대표적으로 Cookie와 Session을 사용한다.

## Cookie와 Session의 차이

| 구분 | Cookie | Session |
| --- | --- | --- |
| 저장 위치 | 브라우저 | 서버 메모리 |
| 보안 | 사용자가 확인/수정 가능 | 서버가 관리하므로 상대적으로 안전 |
| 저장 값 | 문자열 중심 | Java 객체 저장 가능 |
| 유지 기간 | Max-Age, Expires 설정 | 브라우저 종료 또는 세션 타임아웃 |
| 사용 예 | 아이디 저장, 팝업 숨김 | 로그인 사용자, 권한, 장바구니 |

Cookie는 클라이언트에 값을 맡기는 방식이고, Session은 서버에 값을 저장한 뒤 브라우저에는 `JSESSIONID`만 전달하는 방식이다. 인증처럼 신뢰가 필요한 데이터는 Session으로 다루는 편이 적합하다.

## Cookie 사용 흐름

```java
Cookie cookie = new Cookie("rememberId", "user01");
cookie.setMaxAge(60 * 60 * 24);
cookie.setPath("/");
cookie.setHttpOnly(true);
resp.addCookie(cookie);
```

서버가 응답에 쿠키를 실어 보내면 브라우저는 조건에 맞는 다음 요청마다 쿠키를 자동 전송한다. 경로, 만료 시간, HttpOnly 같은 옵션을 함께 설정해야 의도한 범위에서만 사용된다.

## Session 사용 흐름

```java
HttpSession session = req.getSession();
session.setAttribute("loginUser", loginId);
session.setMaxInactiveInterval(60 * 30);
```

로그아웃할 때는 `session.invalidate()`로 서버에 저장된 상태를 제거한다. 로그인 여부 확인 API에서는 `req.getSession(false)`를 사용해 기존 세션만 조회하면, 불필요한 새 세션 생성을 막을 수 있다.

## 인증 API 흐름

1. 클라이언트가 `/api/auth/login`으로 ID/PW를 JSON 전송한다.
2. 서버는 인증 성공 시 `HttpSession`을 만들고 사용자 정보를 저장한다.
3. 응답 헤더의 `Set-Cookie`로 `JSESSIONID`가 전달된다.
4. 이후 요청에는 브라우저가 `JSESSIONID`를 자동 포함한다.
5. `/api/auth/me`는 세션에 저장된 사용자 정보를 기준으로 로그인 상태를 판단한다.
6. `/api/auth/logout`은 세션을 무효화한다.

## Full-stack 관점 정리

Servlet은 Controller 역할로 요청/응답을 담당하고, Service는 비즈니스 로직, DAO/Repository는 DB 접근을 맡는다. 프론트엔드는 `fetch`로 JSON API를 호출하고, 받은 결과를 React/Zustand 같은 상태 계층에 반영한다. 핵심은 브라우저 상태와 서버 상태를 분리해서 보고, 인증처럼 중요한 값은 서버 세션을 기준으로 판단하는 것이다.

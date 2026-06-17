# Spring Exception Handler

웹 API에서 예외가 발생했을 때 HTML 에러 페이지가 내려가면 프론트엔드가 처리하기 어렵다. Spring에서는 `@ExceptionHandler`와 `@RestControllerAdvice`를 사용해 예외 응답을 JSON 형태로 통일할 수 있다.

## 기본 개념

`@ExceptionHandler`는 특정 예외가 발생했을 때 실행할 메서드를 지정한다. 컨트롤러 안에 둘 수도 있지만, 여러 컨트롤러에서 공통으로 쓰려면 `@RestControllerAdvice` 클래스로 분리하는 편이 좋다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleMemberNotFound(MemberNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("MEMBER_NOT_FOUND", e.getMessage()));
    }
}
```

## ErrorResponse DTO

```java
public class ErrorResponse {
    private String code;
    private String message;
    private LocalDateTime timestamp;
}
```

에러 응답 구조를 고정하면 클라이언트는 상태 코드와 응답 body를 기준으로 일관되게 분기할 수 있다.

## 커스텀 예외

도메인 상황을 표현하는 예외를 직접 만들면 컨트롤러 코드가 더 읽기 쉬워진다.

```java
public class MemberNotFoundException extends RuntimeException {
    public MemberNotFoundException(int memberId) {
        super("회원을 찾을 수 없습니다. id=" + memberId);
    }
}
```

## 처리 기준

| 예외 상황 | HTTP 상태 |
| --- | --- |
| 리소스 없음 | 404 Not Found |
| 잘못된 요청 값 | 400 Bad Request |
| 권한 없음 | 403 Forbidden |
| 서버 내부 오류 | 500 Internal Server Error |

예외 처리는 단순히 오류를 숨기는 작업이 아니다. 서버 내부 메시지는 적절히 제한하고, 클라이언트가 복구 가능한 정보를 안정적인 형식으로 받도록 API 계약을 만드는 과정이다.

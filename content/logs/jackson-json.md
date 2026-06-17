# Jackson과 JSON 처리

Jackson은 Java 객체와 JSON 문자열 사이의 변환을 담당하는 대표적인 라이브러리다. Spring MVC에서는 기본 JSON 컨버터로 자주 사용되며, Servlet 환경에서도 `ObjectMapper`를 직접 사용해 요청/응답 데이터를 처리할 수 있다.

## ObjectMapper 역할

```java
ObjectMapper mapper = new ObjectMapper();
MemberDTO dto = mapper.readValue(request.getReader(), MemberDTO.class);
mapper.writeValue(response.getWriter(), dto);
```

`readValue`는 JSON을 Java 객체로 바꾸는 역직렬화, `writeValue`는 Java 객체를 JSON으로 바꾸는 직렬화에 사용된다.

## DTO 설계 포인트

Jackson은 기본 생성자와 getter/setter를 기준으로 객체를 만들고 값을 채운다. 따라서 요청/응답 DTO에는 기본 생성자를 두고, JSON 필드명과 Java 필드명이 자연스럽게 매칭되도록 작성하는 것이 좋다.

## 날짜 포맷

```java
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Seoul")
private LocalDateTime createdAt;
```

날짜/시간 타입은 기본 출력 형식이 기대와 다를 수 있으므로 `@JsonFormat`으로 API 응답 형식을 명시할 수 있다.

## API 처리 흐름

1. 클라이언트가 JSON 요청 본문을 전송한다.
2. Controller 또는 Servlet이 `ObjectMapper`로 DTO를 생성한다.
3. Service 계층에서 비즈니스 로직을 수행한다.
4. 결과 DTO를 JSON으로 직렬화해 응답한다.

## 주의할 점

| 항목 | 설명 |
| --- | --- |
| 기본 생성자 | 역직렬화 시 객체 생성을 위해 필요 |
| 필드명 | JSON key와 DTO 필드명이 맞아야 매핑이 쉽다 |
| Content-Type | 요청 본문이 JSON이면 `application/json` 지정 |
| 민감 정보 | 비밀번호 같은 값은 응답 DTO에서 제외 |

JSON 처리는 단순 변환처럼 보이지만 API 계약의 중심이다. 요청 DTO와 응답 DTO를 분리하면 입력 검증과 데이터 노출 범위를 더 명확하게 관리할 수 있다.

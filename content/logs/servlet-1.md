# Chap 1-2 서블릿 기초 정리

## 서블릿이란

Serve + Applet의 합성어로, HTTP 요청을 처리하는 작은 서버 측 프로그램이다.

상속 구조는 `Servlet 인터페이스 → GenericServlet → HttpServlet → 커스텀 서블릿` 순이다.

URL 매핑은 `@WebServlet` 어노테이션으로 처리한다.

```java
@WebServlet(value = "/lifecycle", loadOnStartup = 1)
public class LifeCycleTestServlet extends HttpServlet { ... }
```

`loadOnStartup = 1`을 설정하면 서버 시작 시 바로 인스턴스를 생성한다(기본값은 첫 요청 시 생성).

---

## 서블릿 라이프사이클

Tomcat은 서블릿 객체를 **싱글톤**으로 관리한다. 즉, 인스턴스는 딱 하나만 만들어진다.

### 1. 생성자 (Constructor)
최초 요청이 들어올 때 한 번만 호출된다.

### 2. init(ServletConfig config)
생성 직후 한 번만 호출된다. 초기화 작업(DB 연결, 설정 로드 등)을 여기서 한다.

### 3. service(ServletRequest req, ServletResponse resp)
요청이 올 때마다 호출된다. 내부적으로 HTTP 메서드를 판별해서 `doGet()`, `doPost()` 등을 분기 호출한다.

### 4. destroy()
Tomcat이 종료될 때 한 번만 호출된다. 리소스 해제 작업을 여기서 한다.

```plain
요청 → [생성자 → init] (최초 1회) → service (매 요청) → destroy (종료 시)
```

---

## 응답 출력

`resp.getWriter()`로 `PrintWriter`를 받아서 HTML을 직접 출력한다.

```java
PrintWriter writer = resp.getWriter();
writer.println("<h1>Hello Servlet</h1>");
```

---

## HTTP 메서드 처리

### service()에서 직접 분기

`req.getMethod()`로 HTTP 메서드를 문자열로 받아서 직접 분기할 수 있다.

```java
protected void service(HttpServletRequest req, HttpServletResponse resp) {
    String method = req.getMethod();
    if (method.equals("GET")) {
        doGet(req, resp);
    } else if (method.equals("POST")) {
        doPost(req, resp);
    }
}
```

실제로 `HttpServlet`이 이 분기를 내부적으로 해주기 때문에, 보통은 `doGet()`, `doPost()`만 오버라이드하면 된다.

---

## 요청 파라미터 처리

### 단일 파라미터

```java
String name = req.getParameter("name");
```

### 다중 파라미터 (체크박스 등)

```java
String[] hobbies = req.getParameterValues("hobby");
```

### 헤더 읽기

```java
String userAgent = req.getHeader("User-Agent");
```

### 한글 깨짐 방지

POST 요청에서 한글이 깨지면 아래 설정을 맨 먼저 해야 한다.

```java
req.setCharacterEncoding("UTF-8");
resp.setContentType("text/html; charset=UTF-8");
```

---

## 정리

- 서블릿 인스턴스는 싱글톤이라 인스턴스 변수에 상태를 저장하면 안 된다
- 생명주기 메서드(init, destroy)는 각 1회, service는 요청마다 실행된다
- 파라미터는 `getParameter` / `getParameterValues`로 꺼내고, 한글이면 인코딩 설정을 먼저 한다

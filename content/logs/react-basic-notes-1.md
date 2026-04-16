## 1. createElement와 render

React는 브라우저의 실제 DOM을 직접 조작하는 대신, **React 엘리먼트**라는 자바스크립트 객체를 통해 UI를 표현합니다.

### 기본 구조

```html
<!-- React, ReactDOM CDN 로드 -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

<div id="root"></div>
```

### React.createElement()

```js
// React.createElement("태그명", 어트리뷰트 객체, 자식 노드)
const greeting = React.createElement(
  "h1",
  { className: "greeting" },
  "Hello, React!",
);
```

> HTML의 `class`는 JSX/createElement에서 `className`으로 작성한다. `class`는 자바스크립트 예약어이기 때문이다.

### ReactDOM.createRoot().render()

```js
// DOM의 #root 요소를 React 앱의 진입점으로 지정하고, 엘리먼트를 렌더링
ReactDOM.createRoot(document.getElementById("root")).render(greeting);
```

| 메서드                  | 역할                         |
| ----------------------- | ---------------------------- |
| `React.createElement()` | React 엘리먼트(JS 객체) 생성 |
| `ReactDOM.createRoot()` | 렌더링 루트 지정             |
| `.render()`             | 실제 DOM에 마운트            |

---

## 2. JSX

**JSX(JavaScript XML)** 는 자바스크립트 코드 안에 HTML과 유사한 문법을 작성할 수 있게 해준다. 내부적으로는 `React.createElement()` 호출로 변환된다.

> JSX를 사용하려면 **Babel** 트랜스파일러가 필요합니다.

```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel">
  // JSX 코드 작성
</script>
```

### JSX의 4가지 핵심 규칙

#### 1) `{}` 안에 자바스크립트 표현식을 넣을 수 있다

```jsx
const user = { name: "홍길동", age: 30 };

function introduce(user) {
  return `안녕하세요, 저는 ${user.name}이고 ${user.age}세 입니다.`;
}

<h3>이름: {user.name}</h3>
<h3>나이: {user.age}</h3>
<p>{introduce(user)}</p>
```

> `{}` 안에는 **표현식(값을 반환하는 코드)** 만 올 수 있습니다. `if`, `for` 같은 문(statement)은 직접 사용할 수 없습니다.

#### 2) HTML 속성은 camelCase로 작성한다

```jsx
// HTML          → JSX
// class         → className
// onclick       → onClick
// for           → htmlFor

<button className="my-button" onClick={handleClick}>
  클릭해보세요
</button>
```

#### 3) 인라인 스타일은 객체 형태로 전달한다

```jsx
const customStyle = {
  backgroundColor: "cornflowerblue", // CSS: background-color → camelCase
  color: "white",
  padding: "10px",
};

<p style={customStyle}>스타일 적용된 문단</p>;
```

#### 4) 모든 태그는 반드시 닫혀야 한다

```jsx
// 올바른 사용
<input type="text" />
<br />
<img src="..." />

// 잘못된 사용 (React에서 에러 발생)
<input type="text">
```

---

## 3. 렌더링과 Virtual DOM

### Virtual DOM이란?

React는 실제 DOM의 **복사본을 메모리 안에 유지**한다. 이것이 **Virtual DOM**(가상돔)이다.

```plain
상태 변경 → 새 Virtual DOM 생성 → 이전 Virtual DOM과 비교(Diffing) → 변경된 부분만 실제 DOM에 반영
```

### 렌더링 예시: 실시간 시계

```jsx
function clock() {
  return (
    <div>
      <h1>실시간 시계</h1>
      <h2>현재 시간: {new Date().toLocaleTimeString()}</h2>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));

function tick() {
  root.render(clock());
}

setInterval(tick, 1000); // 1초마다 렌더링
```

> React는 매번 전체 DOM을 갱신하지 않고, **변경된 부분(시간 텍스트)만** 업데이트한다.

---

## 4. 컴포넌트

**컴포넌트(Component)** 는 UI를 독립적이고 재사용 가능한 조각으로 나눈 것이다. React 앱은 컴포넌트들의 트리 구조로 이루어진다.

> **컴포넌트 이름은 반드시 대문자로 시작**해야 한다. 소문자로 시작하면 React가 HTML 태그로 인식한다.

### 클래스형 컴포넌트 (구식)

```jsx
class TitleClass extends React.Component {
  render() {
    return React.createElement(
      "h1",
      { className: "classComponent" },
      "클래스형 컴포넌트",
    );
  }
}
```

### 함수형 컴포넌트 (현대적, 권장)

```jsx
// createElement 방식
function OldWayComponent() {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", { className: "greeting" }, "createElement 방식"),
  );
}

// JSX 방식 (가독성 훨씬 좋음)
function NewWayComponent() {
  return (
    <div>
      <h1>JSX 방식</h1>
    </div>
  );
}
```

### 컴포넌트 조합

```jsx
function App() {
  return (
    // Fragment: 여러 요소를 하나로 묶어주는 빈 태그 (DOM에 실제 노드 추가 안 됨)
    <>
      <OldWayComponent />
      <hr />
      <NewWayComponent />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(App());
```

| 방식     | 특징                                            |
| -------- | ----------------------------------------------- |
| 클래스형 | `render()` 메서드 필수, 현재는 잘 사용하지 않음 |
| 함수형   | 간결하고 Hook 사용 가능, **현재 표준**          |

---

## 5. Props

**Props(Properties)** 는 부모 컴포넌트가 자식 컴포넌트에게 데이터를 전달하는 **단방향 통로**이다.

### 핵심 특성

- **읽기 전용(read-only)**: 자식 컴포넌트는 받은 Props를 수정할 수 없다.
- **단방향 흐름**: 데이터는 항상 부모 → 자식 방향으로만 흐른다.

### 기본 사용법

```jsx
// 구조 분해 할당으로 Props를 받음
// 기본값(default value)도 함께 지정 가능
function Greeting({ name = "기본이름", favoriteNumber, children }) {
  return (
    <>
      <h1>안녕하세요, {name}!</h1>
      <h2>제가 좋아하는 숫자는 {favoriteNumber} 입니다.</h2>
      <p>전달된 자식 요소(children): {children}</p>
    </>
  );
}

function App() {
  return (
    // JSX 태그 사이의 내용은 'children' prop으로 전달됨
    <Greeting name="홍길동" favoriteNumber={3}>
      React 공부 중이에요~!
    </Greeting>
  );
}
```

### children Props

```jsx
// 부모가 JSX 태그 사이에 전달한 내용은 자동으로 children으로 전달된다
<Greeting>React 공부 중이에요~!</Greeting>
//          ↑ 이 내용이 children
```

### PropTypes로 타입 검사

```jsx
// prop-types 라이브러리 필요
// <script src="https://unpkg.com/prop-types@15.8.1/prop-types.js"></script>

Greeting.propTypes = {
  name: PropTypes.string, // 문자열이어야 함
  favoriteNumber: PropTypes.number, // 숫자여야 함
};

// 잘못된 타입을 넘기면 브라우저 콘솔에 경고 표시
<Greeting name={123} favoriteNumber={3} />;
//         ↑ string이어야 하는데 number를 넘겨서 경고 발생
```

### 실전 예시: 컴포넌트 분리

```jsx
function NameCard({ name }) {
  return (
    <div>
      <h1>{name}</h1>
    </div>
  );
}

function UserInfo({ user }) {
  return (
    <div style={{ border: "1px solid black", padding: "10px" }}>
      <NameCard name={user.name} />
      {/* AgeCard, PhoneCard, EmailCard 등 */}
    </div>
  );
}

function App() {
  return (
    <>
      <UserInfo user={user1} />
      <UserInfo user={user2} />
      <UserInfo user={user3} />
    </>
  );
}
```

> 같은 `UserInfo` 컴포넌트에 다른 `user` props를 넘겨 여러 카드를 재사용하는 패턴이다.

---

## 6. useState

**useState**는 컴포넌트 내부에서 **상태(state)** 를 관리하기 위한 React Hook이다. 상태가 변경되면 해당 컴포넌트가 **자동으로 리렌더링**됩니다.

### 기본 문법

```jsx
const { useState } = React;

// [상태 값, 상태 변경 함수] = useState(초기값)
const [message, setMessage] = useState("초기 상태 메세지입니다.");
const [textColor, setTextColor] = useState("black");
```

### 기본 사용 예시

```jsx
function MessageManager() {
  const [message, setMessage] = useState("초기 상태 메세지입니다.");
  const [textColor, setTextColor] = useState("black");

  const handleEnter = () => {
    setMessage("안녕하세요! 환영합니다.");
    setTextColor("green");
  };

  return (
    <>
      <h2 style={{ color: textColor }}>{message}</h2>
      <button onClick={handleEnter}>입장</button>
    </>
  );
}
```

### 상태 업데이트의 주의사항: 비동기 배치 처리

React의 `setState`는 **즉시 실행되지 않고 배치(batch) 처리**된다.

```jsx
// 문제 있는 코드
<button
  onClick={() => {
    setNumber(number + 1); // 현재 number를 읽음 (예: 0)
    setNumber(number + 1); // 또 현재 number를 읽음 (여전히 0)
    // 결과: 1만 증가 (2가 아님)
  }}>
  +2(동작안함)
</button>;

// 올바른 코드: 함수형 업데이트 사용
const increaseByTwo = () => {
  setNumber((prevNumber) => prevNumber + 2);
  // prevNumber는 항상 가장 최신 상태 값을 받음
};
```

| 방식      | 예시                          | 특징                       |
| --------- | ----------------------------- | -------------------------- |
| 값 전달   | `setNumber(number + 1)`       | 현재 렌더링 시점의 값 사용 |
| 함수 전달 | `setNumber(prev => prev + 1)` | **최신 상태 값** 보장      |

> 이전 상태를 기반으로 새 상태를 계산할 때는 반드시 **함수형 업데이트**를 사용해야함

---

## 7. 이벤트 처리

React의 이벤트 처리는 HTML과 비슷하지만, **camelCase 이름**과 **함수 참조** 방식을 사용한다

### 기본 이벤트 처리

```jsx
function SignupFormBasic() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const handleSignup = () => {
    alert(`아이디: ${username}, 이메일: ${email} 회원 가입 완료`);
  };

  return (
    <div>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)} // e: 이벤트 객체
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleSignup}>가입하기</button>
    </div>
  );
}
```

> `value`와 `onChange`를 함께 사용하면 **제어 컴포넌트(Controlled Component)** 가 된다. 입력값이 React 상태와 항상 동기화된다.

### 효율적인 이벤트 처리: 객체로 상태 묶기

여러 입력값을 관리할 때 각각 `useState`를 쓰는 대신, **하나의 객체로 묶어서 관리**하면 더 효율적이다.

```jsx
function SignupFormAdvanced() {
  const [form, setForm] = useState({ username: "", email: "" });

  const handleChange = (e) => {
    const { name, value } = e.target; // input의 name 속성을 key로 활용
    setForm({ ...form, [name]: value }); // 스프레드로 기존 값 유지, 변경된 것만 덮어쓰기
  };

  const { username, email } = form;

  return (
    <div>
      <input
        type="text"
        name="username" // ← name 속성이 핵심
        value={username}
        onChange={handleChange}
      />
      <input
        type="email"
        name="email" // ← name 속성이 핵심
        value={email}
        onChange={handleChange}
      />
    </div>
  );
}
```

### Props로 이벤트 함수 전달하기

이벤트 핸들러도 Props를 통해 자식 컴포넌트에 전달할 수 있다.

```jsx
function CustomButton({ event, children = "인사" }) {
  return (
    <button
      onClick={() => event()}
      style={{ backgroundColor: "black", color: "white" }}>
      {children}
    </button>
  );
}

function App() {
  const showWelcomeMessage = () => {
    alert("우리 사이트에 오신 것을 환영합니다.");
  };

  return (
    <CustomButton event={showWelcomeMessage}>환영 메세지 보기</CustomButton>
  );
}
```

### HTML vs React 이벤트 비교

| 구분           | HTML                     | React                     |
| -------------- | ------------------------ | ------------------------- |
| 이벤트 이름    | `onclick`, `onchange`    | `onClick`, `onChange`     |
| 핸들러         | 문자열 `"handleClick()"` | 함수 참조 `{handleClick}` |
| 기본 동작 방지 | `return false`           | `e.preventDefault()`      |

---

## 정리: React 핵심 개념 한눈에 보기

```plain
React 앱
│
├── 컴포넌트 (Component)
│   ├── 함수형 컴포넌트 (권장)
│   └── 클래스형 컴포넌트 (구식)
│
├── JSX: HTML처럼 보이는 자바스크립트
│   ├── {} 안에 표현식 사용
│   ├── camelCase 속성명
│   └── 모든 태그 닫기
│
├── Props: 부모 → 자식 데이터 전달
│   ├── 읽기 전용
│   ├── children (태그 사이 내용)
│   └── PropTypes (타입 검사)
│
├── State (useState): 컴포넌트 내부 상태
│   ├── 변경 시 자동 리렌더링
│   └── 함수형 업데이트 권장
│
└── 이벤트 처리
    ├── camelCase 이벤트명
    ├── 제어 컴포넌트 패턴
    └── Props로 핸들러 전달
```

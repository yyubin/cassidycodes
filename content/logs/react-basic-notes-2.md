## 1. 리스트 렌더링

### 배열을 JSX로 렌더링하기

React에서 배열 데이터를 화면에 출력할 때는 `Array.map()`을 사용한다.

```jsx
const fruits = ["사과", "바나나", "포도", "오렌지"];

function FruitList() {
  return (
    <div>
      <h2>과일 목록</h2>
      <ul>
        {fruits.map((fruit, i) => (
          <li key={i}>{fruit}</li>
        ))}
      </ul>
    </div>
  );
}
```

### key prop

리스트를 렌더링할 때 각 항목에 **고유한 `key`** 를 반드시 설정해야 한다.

```jsx
const users = [
  { id: 1, name: "고래" },
  { id: 2, name: "상어" },
  { id: 3, name: "호랑이" },
];

function UserList() {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>  {/* id처럼 고유한 값을 key로 사용 */}
      ))}
    </ul>
  );
}
```

### key를 사용하는 이유

React는 리스트가 변경될 때 `key`를 기준으로 **어떤 항목이 추가/삭제/변경되었는지** 빠르게 파악한다.

| key 설정                    | 권장 여부     | 이유                        |
| --------------------------- | ------------- | --------------------------- |
| `key={index}` (배열 인덱스) | 권장하지 않음 | 순서 변경 시 버그 발생 가능 |
| `key={item.id}` (고유 ID)   | 권장          | 항목을 정확하게 식별 가능   |

---

## 2. 리스트 항목 추가 / 삭제

### 항목 추가 - 스프레드 연산자

기존 배열을 직접 변경하지 않고, **새 배열을 만들어** state를 업데이트한다.

```jsx
const handleAdd = () => {
  if (inputValue.trim() === "") return;
  setNames([...names, { id: nextId, text: inputValue }]); // 기존 배열 복사 + 새 항목 추가
  setNextId(nextId + 1);
  setInputValue("");
};
```

### 항목 삭제 - filter

`filter`는 콜백 함수가 `true`를 반환하는 요소만 모아 **새 배열을 반환**한다.

```jsx
const handleRemove = (idToRemove) => {
  // 삭제할 id와 일치하지 않는 항목만 남긴다
  const updateNames = names.filter((name) => name.id !== idToRemove);
  setNames(updateNames);
};
```

### 전체 코드

```jsx
const { useState } = React;

function NameList() {
  const [inputValue, setInputValue] = useState("");
  const [names, setNames] = useState([{ id: 1, text: "상어" }]);
  const [nextId, setNextId] = useState(2);

  const handleAdd = () => {
    if (inputValue.trim() === "") return;
    setNames([...names, { id: nextId, text: inputValue }]);
    setNextId(nextId + 1);
    setInputValue("");
  };

  const handleRemove = (idToRemove) => {
    const updateNames = names.filter((name) => name.id !== idToRemove);
    setNames(updateNames);
  };

  return (
    <>
      <input
        type="text"
        placeholder="이름을 입력하세요"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <button onClick={handleAdd}>추가</button>

      <ul>
        {names.map((name) => (
          <li key={name.id}>
            {name.text}
            <button onClick={() => handleRemove(name.id)}>삭제</button>
          </li>
        ))}
      </ul>
    </>
  );
}
```

### 불변성(Immutability)

React에서 배열/객체 state를 변경할 때는 **기존 값을 직접 수정하지 않고** 새 값을 만들어서 설정해야 한다.

```jsx
// 잘못된 방식 - 기존 배열 직접 수정
names.push({ id: nextId, text: inputValue });
setNames(names);

// 올바른 방식 - 새 배열 생성
setNames([...names, { id: nextId, text: inputValue }]);
```

> React는 참조값이 바뀌어야 리렌더링을 트리거한다. 같은 배열 객체를 수정하면 변경을 감지하지 못한다.

---

## 3. 실전 예제 - Todo List

### 컴포넌트 구조

```
App
├── Header
└── TodoList
    └── TodoItem (반복 렌더링)
```

### TodoItem - 개별 할 일 컴포넌트

```jsx
function TodoItem({ todo, remove, toggle }) {
  return (
    <div>
      <input
        type="checkbox"
        onChange={() => toggle(todo.id)}
        checked={todo.checked}
      />
      <span style={{ textDecoration: todo.checked ? "line-through" : "none" }}>
        {todo.text}
      </span>
      <button onClick={() => remove(todo.id)}>X</button>
    </div>
  );
}
```

### TodoList - 상태 관리 및 로직

```jsx
function TodoList() {
  const [nextId, setNextId] = useState(2);
  const [inputValue, setInputValue] = useState("");
  const [todoList, setTodoList] = useState([
    { id: 1, text: "react 공부하기", checked: false },
  ]);

  // 추가
  const handleAdd = () => {
    if (inputValue.trim() === "") return;
    setTodoList([
      ...todoList,
      { id: nextId, text: inputValue, checked: false },
    ]);
    setNextId(nextId + 1);
    setInputValue("");
  };

  // 삭제
  const handleRemove = (idToRemove) => {
    const updateList = todoList.filter((todo) => todo.id !== idToRemove);
    setTodoList(updateList);
  };

  // 완료 토글
  const handleToggle = (idToToggle) => {
    const updateList = [...todoList];
    updateList.map((todo) => {
      if (todo.id === idToToggle) {
        todo.checked = !todo.checked;
      }
    });
    setTodoList(updateList);
  };

  return (
    <>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <button onClick={handleAdd}>추가</button>

      <div>
        {todoList.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            remove={handleRemove}
            toggle={handleToggle}
          />
        ))}
      </div>
    </>
  );
}
```

### Props로 핸들러 전달

부모 컴포넌트(`TodoList`)에서 정의한 핸들러를 자식(`TodoItem`)에 props로 내려준다.

```plain
TodoList
  ├── handleRemove  →  TodoItem의 remove prop
  └── handleToggle  →  TodoItem의 toggle prop
```

자식은 이벤트가 발생하면 props로 받은 함수를 호출하고, 실제 상태 변경은 **부모가 처리**한다.

---

## 4. useEffect 기본 개념

### useEffect란?

함수형 컴포넌트에서 **렌더링이 완료된 이후** 특정 동작을 수행해야 할 때 사용하는 Hook이다.

> React는 컴포넌트를 렌더링한 뒤 화면을 업데이트하고, **그 이후**에 useEffect 내부 콜백을 실행한다.

### 기본 문법

```jsx
const { useEffect } = React;

useEffect(() => {
  // 렌더링 이후 실행할 코드
});
```

### 실행 순서 확인

```jsx
function MessagePrinter() {
  console.log("렌더링"); // 1. 렌더링 시점에 실행

  useEffect(() => {
    console.log("렌더링 이후 동작..."); // 3. 렌더링 완료 후 실행
  });

  return (
    <div>
      <h1>{console.log("렌더링 시 출력")}</h1> {/* 2. JSX 평가 시점 */}
    </div>
  );
}
```

**콘솔 출력 순서:**

```
렌더링
렌더링 시 출력
렌더링 이후 동작...
```

### 핵심 포인트

- `useEffect`의 콜백은 **렌더링이 끝난 뒤** 비동기적으로 실행된다
- 의존성 배열을 생략하면 **매 렌더링마다** 실행된다

---

## 5. useEffect 의존성 배열과 Mount

### 의존성 배열(Dependency Array)

`useEffect`의 두 번째 인자로 배열을 전달하면, **배열 내 값이 변경될 때만** useEffect가 실행된다.

```jsx
useEffect(() => {
  // 실행할 코드
}, [의존성1, 의존성2, ...]);
```

### 빈 배열 `[]` - Mount 시점에만 실행

```jsx
const { useState, useEffect } = React;

function TimePrinter() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    console.log("useEffect 동작");
    // 의존성 배열이 빈 배열이면 → 최초 렌더링(Mount) 시에만 실행
    // 버튼 클릭으로 time이 바뀌어도 다시 실행되지 않는다
  }, []);

  return (
    <div>
      <button onClick={() => setTime(new Date().toLocaleTimeString())}>
        현재 시간 확인하기
      </button>
      <h1>{time}</h1>
    </div>
  );
}
```

> **빈 배열 `[]`** = "이 effect는 아무 값에도 의존하지 않는다" → 처음 한 번만 실행

### 패턴 정리

| 패턴                     | 설명                                                |
| ------------------------ | --------------------------------------------------- |
| `useEffect(fn)`          | 매 렌더링마다 실행                                  |
| `useEffect(fn, [])`      | Mount 시 1회만 실행 (초기 데이터 로딩, API 호출 등) |
| `useEffect(fn, [value])` | `value`가 변경될 때마다 실행                        |

---

## 6. 컴포넌트 라이프사이클과 Cleanup

### 세 가지 useEffect 패턴

```jsx
const { useState, useEffect } = React;

function Counter() {
  const [count, setCount] = useState(0);
  const [otherCount, setOtherCount] = useState(0);

  // 패턴 1: 의존성 배열 생략 → 매 렌더링마다 실행
  useEffect(() => {
    console.log("렌더링 될 때마다 실행");
    document.title = `넌 ${count}번 클릭했어`;
  });

  // 패턴 2: 빈 배열 → Mount 시에만 실행
  useEffect(() => {
    console.log("컴포넌트가 처음 화면에 나타남(Mount)");
  }, []);

  // 패턴 3: 특정 값 지정 → 해당 값이 변경될 때만 실행
  useEffect(() => {
    console.log(`count 값이 ${count}로 변경되어, useEffect 실행`);
  }, [count]);

  return (
    <div>
      <p>{count}번 클릭 했습니다.</p>
      <p>OtherCount : {otherCount}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setOtherCount(otherCount + 1)}>
        OtherCount Up
      </button>
    </div>
  );
}
```

**OtherCount 버튼 클릭 시 동작 비교:**

| useEffect          | 실행 여부  | 이유                    |
| ------------------ | ---------- | ----------------------- |
| 패턴 1 (배열 없음) | 실행       | 렌더링 발생             |
| 패턴 2 (`[]`)      | 실행 안 함 | Mount 이후 무시         |
| 패턴 3 (`[count]`) | 실행 안 함 | `count`는 변경되지 않음 |

---

### Cleanup 함수 (Unmount 처리)

`useEffect`가 **반환하는 함수**를 Cleanup 함수라고 한다.  
컴포넌트가 화면에서 **사라지기 직전(Unmount)** 에 호출되며, 타이머/이벤트/구독 등을 정리할 때 사용한다.

```jsx
function Timer() {
  useEffect(() => {
    console.log("타이머가 시작되었습니다(Mount)");

    const timerId = setInterval(() => {
      console.log("..1초 경과..");
    }, 1000);

    // Cleanup 함수: 컴포넌트가 사라질 때(Unmount) 실행
    return () => {
      console.log("타이머를 정리합니다(Unmount)");
      clearInterval(timerId); // 타이머 해제
    };
  }, []);

  return (
    <div>
      <h3>타이머가 동작 중입니다. (콘솔 확인)</h3>
    </div>
  );
}

function App() {
  const [showTimer, setShowTimer] = useState(false);

  return (
    <>
      <button onClick={() => setShowTimer(!showTimer)}>
        타이머 보이기/숨기기
      </button>
      {showTimer && <Timer />} {/* 조건부 렌더링 */}
    </>
  );
}
```

### 라이프사이클 흐름

```
Mount   →  useEffect 실행 (최초 1회)
Update  →  의존성 값 변경 시 Cleanup → useEffect 재실행
Unmount →  Cleanup 함수 실행
```

> Cleanup 없이 타이머나 이벤트 리스너를 생성하면 컴포넌트가 사라진 후에도 계속 동작하는 **메모리 누수**가 발생한다.

---

## 정리

| 개념                  | 핵심                                               |
| --------------------- | -------------------------------------------------- |
| `key` prop            | 리스트 항목의 고유 식별자, 인덱스보다 고유 ID 권장 |
| 불변성                | 배열/객체 state는 항상 새 값으로 교체              |
| Props로 핸들러 전달   | 상태는 부모가 관리, 자식은 호출만 담당             |
| `useEffect`           | 렌더링 완료 후 실행되는 사이드 이펙트 처리         |
| 의존성 배열 생략      | 매 렌더링마다 실행                                 |
| 의존성 배열 `[]`      | Mount 시 1회 실행                                  |
| 의존성 배열 `[value]` | `value` 변경 시마다 실행                           |
| Cleanup 함수          | Unmount 시 타이머/이벤트 정리                      |

## 1. useCallback

### 1-1. 함수 메모이제이션

React 컴포넌트가 리렌더링되면 내부에 정의된 **함수도 매번 새로 생성**된다.  
`useCallback`은 의존성 배열의 값이 바뀌지 않는 한 **이전에 만든 함수를 재사용**한다.

```jsx
function App() {
  const [number, setNumber] = useState(0);
  const [toggle, setToggle] = useState(false);

  // toggle이 바뀌어도 number가 그대로라면 이 함수는 새로 만들어지지 않는다
  const printNumber = useCallback(() => {
    console.log("current number: ", number);
  }, [number]); // number가 바뀔 때만 새로 생성

  useEffect(() => {
    console.log("printNumber 함수가 변경 되었습니다.");
  }, [printNumber]);

  return (
    <>
      <input
        type="number"
        value={number}
        onChange={(e) => setNumber(parseInt(e.target.value))}
      />
      <button onClick={printNumber}>숫자 출력</button>
      <button onClick={() => setToggle(!toggle)}>토글 버튼</button>
    </>
  );
}
```

> **주의**: 함수 내부에서 사용하는 state나 props는 **반드시 의존성 배열에 포함**시켜야 한다.

---

### 1-2. 자식 컴포넌트 최적화

`useCallback`은 **함수를 props로 자식에게 전달할 때** 효과적이다.  
함수가 새로 생성되면 자식은 불필요하게 리렌더링된다.

```jsx
function Square({ genSquareStyles }) {
  const [style, setStyle] = useState({});

  useEffect(() => {
    setStyle(genSquareStyles()); // genSquareStyles가 바뀔 때만 스타일 업데이트
  }, [genSquareStyles]);

  return <div style={style}></div>;
}

function App() {
  const [size, setSize] = useState(200);
  const [isDark, setIsDark] = useState(false);

  // size가 바뀔 때만 새로운 함수 생성 → isDark만 바뀌면 Square는 리렌더링되지 않음
  const genSquareStyles = useCallback(() => {
    return {
      backgroundColor: "aqua",
      width: `${size}px`,
      height: `${size}px`,
    };
  }, [size]);

  return (
    <div style={{ backgroundColor: isDark ? "black" : "white" }}>
      <input
        type="range"
        value={size}
        onChange={(e) => setSize(parseInt(e.target.value))}
        min="100"
        max="300"
      />
      <button onClick={() => setIsDark(!isDark)}>배경 변경</button>
      <Square genSquareStyles={genSquareStyles} />
    </div>
  );
}
```

**`isDark` 버튼을 누르면?**

- `useCallback` 없을 때: `genSquareStyles`가 매번 새로 생성 → `Square`도 매번 리렌더링
- `useCallback` 있을 때: `size`가 안 바뀌면 `genSquareStyles` 재사용 → `Square` 리렌더링 안 함

---

## 2. useRef

### 2-1. useState vs 지역변수 vs useRef

React 컴포넌트에서 값을 저장하는 방법은 세 가지가 있다. 각 방식은 **리렌더링 여부**와 **값 유지 여부**가 다르다.

```jsx
function Counter() {
  const [count, setCount] = useState(0); // 1. useState
  let variable = 0; // 2. 지역 변수
  const countRef = useRef(0); // 3. useRef
}
```

|            | 리렌더링 유발 | 리렌더링 후 값 유지     |
| ---------- | ------------- | ----------------------- |
| `useState` | ✅ 유발       | ✅ 유지                 |
| 지역 변수  | ❌ 유발 안 함 | ❌ 사라짐 (매번 초기화) |
| `useRef`   | ❌ 유발 안 함 | ✅ 유지                 |

**동작 확인**

```jsx
const increaseCount = () => setCount(count + 1); // 화면 리렌더링 O
const increaseVariable = () => {
  variable += 1;
}; // 콘솔엔 찍히지만 화면 변화 없음
const increaseRef = () => {
  countRef.current += 1;
}; // 콘솔엔 찍히지만 화면 변화 없음
```

> `useRef`는 `.current` 프로퍼티로 값에 접근한다.  
> 값이 바뀌어도 컴포넌트가 다시 렌더링되지 않으므로, **화면에 표시할 필요 없는 값**을 저장할 때 적합하다.

---

### 2-2. useRef로 DOM 직접 접근

`useRef`의 또 다른 중요한 용도는 **DOM 요소에 직접 접근**하는 것이다.

```jsx
function App() {
  const [form, setForm] = useState({ username: "", password: "" });
  const usernameRef = useRef(); // 서랍 생성

  useEffect(() => {
    usernameRef.current.focus(); // 마운트 시 username 인풋에 자동 포커스
  }, []);

  const onClickHandler = () => {
    alert(`username: ${form.username}, password: ${form.password}`);
    setForm({ username: "", password: "" });
    usernameRef.current.focus(); // 로그인 후 다시 포커스
  };

  return (
    <>
      <input
        type="text"
        name="username"
        ref={usernameRef}  {/* ref 속성으로 연결 */}
        value={form.username}
        onChange={onChangeHandler}
      />
      <input type="password" name="password" ... />
      <button onClick={onClickHandler}>로그인</button>
    </>
  );
}
```

**흐름 요약**

1. `useRef()`로 ref 객체 생성
2. JSX의 `ref` 속성에 연결 → `ref.current`가 해당 DOM 요소를 가리킴
3. `ref.current.focus()`, `ref.current.value` 등 DOM API를 직접 호출

> **언제 쓰나?** 포커스 이동, 스크롤 제어, 외부 라이브러리 통합 등 React 상태로는 제어하기 어려운 DOM 조작이 필요할 때

---

## 3. 비동기 처리

### 3-1. 콜백 지옥 (Callback Hell)

JavaScript는 기본적으로 **비동기(non-blocking)** 방식으로 동작한다.  
예를 들어 `setTimeout`은 지정된 시간이 지난 뒤 콜백 함수를 실행하지만, 그 동안 다음 코드는 멈추지 않고 계속 진행된다.

```js
console.log("햄버거를 주문합니다."); // 1번째로 출력

setTimeout(() => {
  console.log("3초 뒤에 음식이 나왔습니다."); // 3초 뒤 출력
}, 3000);

console.log("감자튀김을 주문합니다."); // 2번째로 출력 (기다리지 않음)
```

**순차 실행이 필요한 경우** — 비동기 작업을 순서대로 실행하려면 콜백 안에 콜백을 중첩해야 한다.

```js
increase(0, (result) => {
  increase(result, (result) => {
    increase(result, (result) => {
      console.log("모든 작업이 끝났습니다.");
    });
  });
});
```

> **문제점**: 중첩이 깊어질수록 코드가 오른쪽으로 계속 들여써져 가독성이 극도로 떨어진다. 이를 **콜백 지옥**이라 부른다.

---

### 3-2. Promise

Promise는 콜백 지옥을 해결하기 위해 등장한 객체다.

> **핵심 개념**: "비동기 작업이 끝나면 성공(`resolve`)했는지 실패(`reject`)했는지 꼭 알려줄게"라고 약속하는 **약속 증서 객체**

**Promise 생성**

```js
function increase(number) {
  const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
      const result = number + 10;

      if (result > 50) {
        reject(new Error("숫자가 너무 큽니다!"));
      }

      resolve(result); // 성공 시 resolve 호출
    }, 1000);
  });
  return promise;
}
```

**Promise 체이닝**

`.then()`, `.catch()`, `.finally()`를 체이닝해서 순차 처리를 **평평하게** 표현할 수 있다.

```js
increase(0)
  .then((number) => {
    console.log(number); // 10
    return increase(number);
  })
  .then((number) => {
    console.log(number); // 20
    return increase(number);
  })
  .catch((error) => {
    console.log(error); // 숫자가 너무 큽니다!
  })
  .finally(() => {
    console.log("모든 작업이 끝났습니다."); // 성공/실패 무관하게 항상 실행
  });
```

| 메서드               | 실행 시점                                      |
| -------------------- | ---------------------------------------------- |
| `.then(callback)`    | `resolve`가 호출되었을 때                      |
| `.catch(callback)`   | `.then()` 체인 어디서든 `reject`가 발생했을 때 |
| `.finally(callback)` | 성공/실패 무관하게 항상 마지막에 실행          |

---

### 3-3. async / await

Promise 체이닝도 길어지면 여전히 읽기 어렵다.  
`async/await`는 **비동기 코드를 동기 코드처럼** 읽히게 해준다.

```js
async function run() {
  try {
    let result = await increase(0); // Promise가 끝날 때까지 기다린 뒤 결과를 받아온다
    console.log(result); // 10

    result = await increase(result);
    console.log(result); // 20

    result = await increase(result);
    console.log(result); // 30

    // ...
  } catch (e) {
    console.log(e); // reject 발생 시 catch
  } finally {
    console.log("작업완료"); // 항상 실행
  }
}

run();
```

> `await`는 `async` 함수 안에서만 사용할 수 있다.  
> 에러 처리는 `try / catch / finally`로 한다.

**세 방식 비교**

| 방식        | 가독성 | 에러 처리   | 특징                           |
| ----------- | ------ | ----------- | ------------------------------ |
| 콜백        | 나쁨   | 복잡        | 중첩이 깊어져 콜백 지옥 발생   |
| Promise     | 보통   | `.catch()`  | 체이닝으로 가독성 개선         |
| async/await | 좋음   | `try/catch` | 동기 코드처럼 읽혀 가장 직관적 |

---

## 4. Custom Hook

### 개념

커스텀 훅은 **`use`로 시작하는 이름을 가진 일반 JavaScript 함수**다.  
내부에서 `useState`, `useEffect` 등 React Hook을 자유롭게 사용할 수 있으며, **반복되는 상태 로직을 재사용 가능한 단위로 추출**하는 것이 목적이다.

### 예시: useDelayTimer

```jsx
function useDelayTimer(delay) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log(`${delay}ms 타이머 시작!`);

    const timer = setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => clearTimeout(timer); // 언마운트 시 타이머 정리 (메모리 누수 방지)
  }, [delay]);

  return isReady; // 상태값을 반환
}
```

**사용**

```jsx
function App() {
  const isReady = useDelayTimer(3000); // 커스텀 훅 호출

  return (
    <>
      {isReady ? (
        <h2 style={{ color: "blue" }}>준비 완료!</h2>
      ) : (
        <h2 style={{ color: "red" }}>잠시만 기다려주세요...</h2>
      )}
    </>
  );
}
```

**정리**

| 항목      | 내용                                          |
| --------- | --------------------------------------------- |
| 이름 규칙 | 반드시 `use`로 시작                           |
| 내부      | `useState`, `useEffect` 등 Hook 사용 가능     |
| 목적      | 여러 컴포넌트에서 반복되는 상태 로직 재사용   |
| 반환값    | 자유롭게 정의 (값, 함수, 객체 등)             |
| 클린업    | `useEffect` 내부에서 타이머·구독 등 정리 필수 |

> **언제 만드나?** 같은 `useState + useEffect` 조합이 두 개 이상의 컴포넌트에서 반복된다면 커스텀 훅으로 분리할 타이밍이다.

---

## 핵심 요약

| 개념             | 한 줄 요약                                                    |
| ---------------- | ------------------------------------------------------------- |
| 콜백 지옥        | 비동기 순차 처리를 콜백 중첩으로 해결할 때 생기는 가독성 문제 |
| Promise          | 비동기 작업의 성공/실패를 `.then/.catch`로 평평하게 처리      |
| async/await      | Promise를 동기 코드처럼 읽히게 하는 문법                      |
| useRef (값 저장) | 리렌더링 없이 값을 유지하는 변수 상자                         |
| useRef (DOM)     | `ref` 속성으로 DOM 요소에 직접 접근                           |
| useCallback      | 함수를 메모이제이션해 불필요한 함수 재생성 방지               |
| Custom Hook      | 재사용 가능한 상태 로직을 `use`로 시작하는 함수로 분리        |

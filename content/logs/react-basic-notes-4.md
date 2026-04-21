## 1. 비동기란 무엇인가?

### 동기(Synchronous) vs 비동기(Asynchronous)

```plain
[동기 방식]
작업1 완료 → 작업2 완료 → 작업3 완료  (순서 보장, 앞이 끝나야 다음으로)

[비동기 방식]
작업1 시작 → 작업2 시작 → 작업3 시작
      ↓(나중에 완료)   ↓(나중에 완료)
```

JavaScript는 **싱글 스레드** 언어다. 네트워크 요청처럼 오래 걸리는 작업을 동기로 처리하면 브라우저 전체가 멈춘다. 그래서 API 통신은 **항상 비동기**로 처리한다.

### Promise란?

`Promise`는 **"미래에 완료될 작업"을 나타내는 객체**다.

```javascript
const promise = fetch("https://jsonplaceholder.typicode.com/users");
console.log(promise); // Promise { <pending> }
```

- `pending` → 요청 진행 중
- `fulfilled` → 요청 성공
- `rejected` → 요청 실패

> Promise 내부 값(`[[PromiseResult]]`)은 슬롯(내부 슬롯)이라 **직접 접근 불가능**하다.  
> 반드시 `.then()` 또는 `await`로 꺼내야 한다.

---

## 2. Promise와 fetch 기본

### fetch 기본 문법

```javascript
let promise = fetch(url, [options]);
```

| 파라미터  | 설명                                        |
| --------- | ------------------------------------------- |
| `url`     | 요청할 API 주소                             |
| `options` | method, headers, body 등 (생략 시 GET 요청) |

### fetch 요청 흐름

```javascript
async function callApi() {
  // 1단계: Promise 객체만 반환됨 (아직 데이터 없음)
  const promise = fetch("https://jsonplaceholder.typicode.com/users");
  console.log(promise); // Promise { <pending> }

  // 2단계: await로 Response 객체 수신 (HTTP 헤더만 도착한 상태)
  const response = await fetch("https://jsonplaceholder.typicode.com/users");
  console.log(response); // Response { status: 200, ok: true, ... }

  console.log(`본문 사용 여부: ${response.bodyUsed}`); // false

  // 3단계: 본문(body)을 JSON으로 파싱 → JS 객체로 변환
  const responseJson = await response.json();
  console.log(responseJson); // [{ id: 1, name: "Leanne Graham", ... }, ...]

  console.log(`본문 사용 여부: ${response.bodyUsed}`); // true
}
```

### ❗ 핵심 개념: bodyUsed와 스트림

| 개념                | 설명                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| `response.bodyUsed` | 본문 스트림을 이미 읽었는지 여부                                                 |
| `response.json()`   | 본문을 JSON으로 파싱. **비동기**이므로 `await` 필수                              |
| 스트림 1회 제한     | 본문은 **딱 한 번만** 읽을 수 있다. `bodyUsed`가 `true`가 된 후 다시 읽으면 에러 |

```javascript
const data1 = await response.json(); // ✅ 성공
const data2 = await response.json(); // ❌ TypeError: body stream already read
```

---

## 3. then 체이닝 vs async/await

같은 로직을 두 가지 방식으로 작성할 수 있다. 결과는 동일하다.

### 방식 1: .then() 체이닝

```javascript
const API_URL = "https://jsonplaceholder.typicode.com/users";

function fetchDataWithThen() {
  fetch(API_URL)
    // 1단계: Response 객체 수신
    .then((response) => {
      console.log(response);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json(); // Promise 반환 → 다음 .then으로 전달
    })
    // 2단계: 파싱된 데이터 수신
    .then((data) => {
      console.log(data);
    })
    // 에러 처리: 위 .then() 중 어느 단계에서든 에러 발생 시 캐치
    .catch((error) => {
      console.error("데이터를 가져오는데 실패했습니다: ", error);
    });
}
```

**흐름 시각화:**

```plain
fetch(url)
    └─ .then(response → response.json())   ← HTTP 응답 처리
           └─ .then(data → console.log)    ← JSON 파싱 결과 처리
                  └─ .catch(error → ...)   ← 에러 처리
```

### 방식 2: async/await

```javascript
async function fetchDataWithAsyncAwait() {
  try {
    const response = await fetch(API_URL);
    console.log(response);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.log("데이터를 가져오는데 실패했습니다: ", error);
  }
}
```

### 비교 정리

| 항목      | .then() 체이닝       | async/await                       |
| --------- | -------------------- | --------------------------------- |
| 가독성    | 체인이 길어지면 복잡 | 동기 코드처럼 읽힘                |
| 에러 처리 | `.catch()`           | `try/catch`                       |
| 내부 동작 | 동일 (Promise 기반)  | 동일 (Promise 기반)               |
| 권장 상황 | 간단한 단일 요청     | 여러 await가 연속되는 복잡한 로직 |

---

## 4. Axios - fetch의 대안

### Axios 설치 (CDN 방식)

```html
<script src="https://unpkg.com/axios/dist/axios.min.js"></script>
```

### fetch vs axios 비교

```javascript
const API_URL = "https://jsonplaceholder.typicode.com/users";

// fetch 방식
async function callApiWithFetch() {
  try {
    const response = await fetch(API_URL);
    // response.ok 체크 필수 (4xx, 5xx도 reject가 아닌 resolve로 처리되므로)
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json(); // .json() 파싱 필수
    console.log(data);
  } catch (e) {
    console.log(e);
  }
}

// axios 방식
async function callApiWithAxios() {
  try {
    const response = await axios.get(API_URL); // HTTP 메서드를 메서드명으로 표현
    const data = response.data; // JSON 파싱 자동 완료
    console.log(data);
  } catch (e) {
    console.log(e); // 4xx, 5xx 응답도 catch로 잡힘
  }
}
```

### fetch vs axios 상세 비교표

| 항목           | fetch                                           | axios                                          |
| -------------- | ----------------------------------------------- | ---------------------------------------------- |
| 내장 여부      | 브라우저 내장                                   | 별도 라이브러리 필요                           |
| JSON 파싱      | `await response.json()` 직접 호출               | `response.data`로 자동 제공                    |
| HTTP 에러 처리 | 4xx/5xx를 **reject 하지 않음** → 수동 체크 필수 | 4xx/5xx를 **자동으로 reject** → catch에서 처리 |
| 요청 메서드    | `fetch(url, { method: 'POST' })`                | `axios.post(url, data)`                        |
| 요청 취소      | AbortController 필요                            | `CancelToken` 또는 `AbortController`           |
| 인터셉터       | 없음                                            | 요청/응답 인터셉터 지원                        |
| 타임아웃       | 없음 (직접 구현)                                | `timeout` 옵션 기본 제공                       |

> **fetch의 함정**: HTTP 상태 코드가 404, 500이어도 `catch`로 떨어지지 않는다.  
> 네트워크 자체가 끊겼을 때만 reject된다. **반드시 `response.ok` 또는 `response.status` 체크**가 필요하다.

---

## 5. React에서 API 연동하기

### 핵심 패턴: useEffect + 상태 관리

React에서 API를 호출하는 기본 구조는 아래와 같다.

```javascript
const { useState, useEffect } = React;

function MyComponent() {
  const [data, setData] = useState([]); // 서버 데이터
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  useEffect(() => {
    // 비동기 함수를 useEffect 내부에서 정의 후 즉시 호출
    async function fetchData() {
      try {
        const response = await fetch("https://api.example.com/data");
        if (!response.ok) throw new Error("네트워크 오류");
        const result = await response.json();
        setData(result);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false); // 성공/실패 무관하게 로딩 종료
      }
    }
    fetchData();
  }, []); // 빈 배열 = 컴포넌트 마운트 시 1회만 실행

  // Early Return 패턴
  if (error) return <p>오류: {error.message}</p>;
  if (loading) return <p>로딩 중...</p>;

  return <div>{/* 데이터 렌더링 */}</div>;
}
```

### ❗ useEffect에서 async 직접 사용 금지

```javascript
// ❌ 잘못된 방법
useEffect(async () => {
    const data = await fetch(...);
}, []);
// useEffect의 콜백은 cleanup 함수를 반환해야 하는데
// async 함수는 Promise를 반환하므로 경고 발생

// ✅ 올바른 방법
useEffect(() => {
    async function load() { ... }
    load(); // 내부에서 정의하고 즉시 호출
}, []);
```

### 상태 3종 세트 패턴

API 연동 시 항상 이 세 가지 상태를 함께 관리한다.

```plain
data    → 서버에서 받아온 실제 데이터
loading → 요청이 진행 중인가? (스켈레톤 UI, 스피너 표시용)
error   → 에러가 발생했는가? (에러 메시지 표시용)
```

---

## 6. 실습 예제 분석

### 예제 1: 회원 목록 (01_itemList.html)

컴포넌트 구조:

```plain
App
 ├── Title       (단순 UI, 상태 없음)
 └── ItemList    (데이터 패칭, 상태 관리)
       └── Item  (props만 받아서 렌더링)
```

**핵심 코드 분석**

```javascript
function ItemList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/users")
      .then((response) => {
        if (!response.ok) throw new Error("네트워크 응답 문제가 있습니다.");
        return response.json();
      })
      .then((responseUsers) => setUsers(responseUsers))
      .catch((e) => setError(e))
      .finally(() => setLoading(false)); // 성공/실패 모두 로딩 해제
  }, []);

  if (error) return <p>오류가 발생했습니다: {error.message}</p>;

  return (
    <div>
      {loading && <p>로딩 중...</p>}
      {!loading && users.map((user) => <Item key={user.id} user={user} />)}
    </div>
  );
}
```

**포인트**

- `finally()`로 로딩 상태를 항상 해제 → 에러가 나도 스피너가 멈춤
- `key={user.id}` → React가 리스트 항목을 추적할 수 있도록 **고유 key 필수**
- `user.company?.name` → **옵셔널 체이닝**으로 `null` 접근 에러 방지

---

### 예제 2: GitHub 이모지 검색기 (04_github-imoji.html)

컴포넌트 구조

```plain
App                  (전체 상태 관리: emojiList, emoji, loading)
 ├── SearchBox       (입력 받아 부모에게 검색 이벤트 전달)
 └── ImageBox        (검색 결과 이미지 표시)
```

**상태 흐름**

```plain
1. 마운트 → useEffect → API 호출 → emojiList 저장 (전체 이모지 목록, 객체 형태)
2. 사용자 입력 → SearchBox → search(value) 콜백 호출
3. App의 emojiSearch → emojiList[value]로 URL 찾기 → setEmoji 업데이트
4. ImageBox → emoji URL로 이미지 표시
```

**핵심 코드**

```javascript
// App 컴포넌트
const [emojiList, setEmojiList] = useState(null); // { "smile": "https://...", ... }
const [emoji, setEmoji] = useState("");
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function search() {
    try {
      const response = await axios.get(API_URL);
      setEmojiList(response.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }
  search();
}, []);

// 검색 함수 (자식에게 props로 전달)
const emojiSearch = (value) => {
  if (!emojiList || value.trim() === "") {
    setEmoji(null);
    return;
  }
  const selectedEmoji = emojiList[value]; // 객체에서 키로 검색
  setEmoji(selectedEmoji || null); // 없으면 null
};
```

**SearchBox 컴포넌트 - 제어 컴포넌트 패턴**

```javascript
function SearchBox({ search }) {
  // search는 부모가 내려준 함수
  const [inputValue, setInputValue] = useState("");

  const keyDownHandler = (e) => {
    if (e.key === "Enter") search(inputValue); // Enter 키로도 검색
  };

  return (
    <>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)} // 제어 컴포넌트
        onKeyDown={keyDownHandler}
      />
      <button onClick={() => search(inputValue)}>검색</button>
    </>
  );
}
```

---

### 예제 3: 포켓몬 목록 (02_pockemon-api.html)

이 예제는 **페이지네이션**과 **중첩 API 호출** 패턴을 다룬다.

**데이터 흐름**

```plain
1. pokeapi.co/api/v2/pokemon 호출
   → { results: [{ name, url }, ...], next, previous } 반환

2. results 각 항목의 url로 개별 포켓몬 API 재호출
   → { id, name, sprites, abilities } 반환

3. 가공된 데이터를 배열에 누적
```

**핵심 코드**

```javascript
// 페이지 상태 관리
const [page, setPage] = useState({
  now: API_URL,
  prev: "",
  next: "",
});
const [url, setUrl] = useState(API_URL);

// url이 변경될 때마다 재실행
useEffect(() => {
  async function storePokemons(pokemon) {
    const data = await axios.get(pokemon.url);
    const res = data.data;
    const newPokemon = {
      id: res.id,
      name: res.name,
      img: res.sprites.other.dream_world.front_default,
      abilities: res.abilities,
    };
    // 함수형 업데이트: 이전 상태를 기반으로 누적
    setPockmons((prev) => [...prev, newPokemon]);
  }

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      setPage({ now: url, prev: data.previous, next: data.next });
      for (let i = 0; i < 20; i++) {
        storePokemons(data.results[i]); // 20개 병렬 호출
      }
    })
    .finally(() => setLoading(false));
}, [url]); // url을 의존성으로 → 페이지 이동 시 재실행

// 이전 페이지 이동
const previousPageHandler = () => {
  if (!page.prev) {
    alert("이전 페이지 없음");
    return;
  }
  setPockmons([]); // 목록 초기화
  setLoading(true); // 로딩 재시작
  setUrl(page.prev); // url 변경 → useEffect 재실행 트리거
};
```

**useEffect 의존성 배열 활용**

```plain
useEffect(() => { ... }, [url])
                           ↑
              url이 바뀔 때마다 effect 재실행
              → 페이지네이션 구현의 핵심
```

---

## 7. 자주 하는 실수와 주의사항

### ❌ 실수 1: fetch의 에러 처리 누락

```javascript
// ❌ 잘못된 코드 - 404도 정상 처리됨
async function bad() {
  const response = await fetch(url);
  const data = await response.json(); // 404여도 여기까지 실행됨
}

// ✅ 올바른 코드
async function good() {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const data = await response.json();
}
```

### ❌ 실수 2: response.json() await 누락

```javascript
// ❌ Promise 객체가 data에 담김
const data = response.json();

// ✅ 실제 데이터
const data = await response.json();
```

### ❌ 실수 3: useEffect에서 async 직접 사용

```javascript
// ❌ React 경고 발생
useEffect(async () => { ... }, []);

// ✅ 내부 함수 정의 후 호출
useEffect(() => {
    async function load() { ... }
    load();
}, []);
```

### ❌ 실수 4: key prop 누락

```javascript
// ❌ React 경고 + 렌더링 성능 저하
{
  users.map((user) => <Item user={user} />);
}

// ✅ 고유한 key 필수
{
  users.map((user) => <Item key={user.id} user={user} />);
}
```

### ❌ 실수 5: 함수형 업데이트 누락 (누적 상태)

```javascript
// ❌ 비동기 환경에서 이전 값을 못 잡을 수 있음
setPokemons([...pokemons, newPokemon]);

// ✅ 함수형 업데이트로 안전하게 누적
setPokemons((prev) => [...prev, newPokemon]);
```

### 💡 옵셔널 체이닝으로 안전한 접근

```javascript
// 중첩 객체 접근 시 null/undefined 에러 방지
user.company?.name; // company가 없으면 undefined 반환
res.sprites?.other?.dream_world?.front_default;
```

---

## 정리: 패턴 요약

```plain
API 연동 체크리스트
═══════════════════════════════════
□ fetch 사용 시 response.ok 확인
□ response.json() await 처리
□ useEffect 내부에서 async 함수 정의
□ loading / error / data 상태 3종 세트
□ finally()로 로딩 상태 항상 해제
□ 리스트 렌더링 시 key prop 지정
□ 함수형 업데이트로 안전한 상태 누적
□ 중첩 객체 접근 시 옵셔널 체이닝
```

---

_참고 API_

- JSONPlaceholder: https://jsonplaceholder.typicode.com
- GitHub Emoji API: https://api.github.com/emojis
- PokeAPI: https://pokeapi.co/api/v2/pokemon

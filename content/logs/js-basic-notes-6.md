## 1. 이벤트 핸들러 등록 / 제거

### 세 가지 방식 비교

| 방식                              | 특징                                   | 권장 여부 |
| --------------------------------- | -------------------------------------- | --------- |
| 어트리뷰트 `onclick="..."`        | HTML 안에 JS 혼재                      | 사용 금지 |
| 핸들러 프로퍼티 `el.onclick = fn` | 하나의 핸들러만 등록 가능 — 덮어씌워짐 | 비권장    |
| `addEventListener`                | 하나의 이벤트에 여러 핸들러 등록 가능  | 표준      |

```js
// 방법 2: 두 번째 할당이 첫 번째를 덮어씀
$btn.onclick = () => console.log("첫 번째"); // 무시됨
$btn.onclick = () => console.log("두 번째"); // 이것만 실행

// 방법 3: 둘 다 실행됨
$btn.addEventListener("click", () => console.log("첫 번째"));
$btn.addEventListener("click", () => console.log("두 번째"));
```

### 핸들러 제거

익명 함수는 참조를 보관할 수 없어 제거가 불가능하다. 제거할 핸들러는 반드시 변수에 저장한다.

```js
const mission = () => alert("수행 완료");

$btn.addEventListener("click", mission);
$btn.removeEventListener("click", mission); // 동일 참조여야 제거됨

// 익명 함수는 추가는 되지만 제거할 방법이 없다
$btn.addEventListener("click", () => alert("이 이벤트는 제거 불가"));
$btn.removeEventListener("click", () => alert("이 이벤트는 제거 불가")); // 무의미
```

---

## 2. 이벤트 객체와 this

### 이벤트 객체 (e)

이벤트 발생 시 브라우저가 생성한 '사건 보고서'. 핸들러의 첫 번째 인자로 자동 전달된다.

| 프로퍼티                | 설명                          |
| ----------------------- | ----------------------------- |
| `e.target`              | 이벤트가 실제로 발생한 요소   |
| `e.currentTarget`       | 이벤트 리스너가 부착된 요소   |
| `e.clientX / e.clientY` | 클릭한 마우스 좌표            |
| `e.key / e.code`        | 누른 키 문자 / 물리적 키 코드 |

```js
document.addEventListener("click", (e) => {
  console.log(e.clientX, e.clientY); // 클릭 좌표
  console.log(e.target); // 실제 클릭된 요소
  console.log(e.currentTarget); // 리스너가 부착된 요소 (여기선 document)
});
```

### this vs e.currentTarget

| 함수 종류       | `this`가 가리키는 것                               |
| --------------- | -------------------------------------------------- |
| 일반 `function` | 이벤트를 부착한 요소 (= `e.currentTarget`)         |
| 화살표 함수     | 상위 스코프의 `this` (= `window` 또는 `undefined`) |

`e.currentTarget`은 함수 종류와 무관하게 항상 리스너가 부착된 요소를 가리킨다.
`this` 대신 `e.currentTarget`을 사용하는 것이 버그를 줄이는 가장 안전한 습관이다.

```js
// 권장 패턴
$btn.addEventListener("click", (e) => {
  const btn = e.currentTarget; // 화살표 함수에서도 안전하게 요소 참조
  btn.style.backgroundColor = "skyblue";
});
```

---

## 3. 이벤트 전파와 위임

### 버블링

자식 요소에서 발생한 이벤트가 부모 → 조부모 → ... → `window`까지 전파되는 현상.
부모에 달린 핸들러는 자식 클릭에도 반응한다.

```js
$parent.addEventListener("click", (e) => {
  console.log(e.target); // 실제로 클릭된 요소 (자식일 수 있음)
  console.log(e.currentTarget); // 리스너가 부착된 요소 (항상 $parent)
});
```

### 이벤트 위임

버블링을 활용해 자식 각각에 핸들러를 달지 않고, 부모 하나에만 등록해 모든 자식의 이벤트를 처리하는 패턴.
동적으로 추가된 자식에도 자동으로 작동한다는 것이 핵심 장점이다.

```js
// 각 li가 아닌 부모 ul에만 핸들러 등록
$ul.addEventListener("click", (e) => {
  if (e.target.matches("li")) {
    // 클릭된 것이 li일 때만 처리
    e.target.classList.toggle("highlight");
  }
});

// 나중에 동적으로 추가된 li에도 위 핸들러가 자동 적용됨
const $newLi = document.createElement("li");
$newLi.textContent = "사이다";
$ul.appendChild($newLi);
```

---

## 4. 이벤트 제어

### preventDefault — 기본 동작 막기

브라우저가 이벤트에 대해 갖고 있는 '기본 동작'을 취소한다.
대표적인 사례는 폼 제출 시 페이지 새로고침 방지다.

```js
$form.addEventListener("submit", (e) => {
  e.preventDefault(); // 새로고침 막기

  // 유효성 검사 수행
  if ($usernameInput.value.trim() === "") {
    $errorMessage.textContent = "아이디를 입력해주세요!";
    return;
  }

  console.log(`서버로 제출할 아이디: ${$usernameInput.value}`);
});
```

기본 동작이 있는 주요 이벤트 예시

| 이벤트         | 브라우저 기본 동작          |
| -------------- | --------------------------- |
| `form submit`  | 페이지 새로고침 (서버 전송) |
| `a 태그 click` | 지정된 href로 페이지 이동   |
| `contextmenu`  | 브라우저 우클릭 메뉴 표시   |

### stopPropagation — 버블링 막기

이벤트가 부모로 전파되는 것을 차단한다.
모달 내부 클릭이 배경 클릭으로 전파돼 모달이 닫히는 상황이 대표적인 사례다.

```js
// 배경 클릭 시 모달 닫기
$modalBackground.addEventListener("click", () => {
  $modalBackground.style.display = "none";
});

// 모달 내부 클릭은 배경까지 전파되지 않도록 차단
$modalContent.addEventListener("click", (e) => {
  e.stopPropagation();
});
```

---

## 5. 마우스 / 키보드 이벤트

### 마우스 이벤트

| 이벤트        | 발생 시점                                        |
| ------------- | ------------------------------------------------ |
| `click`       | 왼쪽 버튼 눌렀다 뗐을 때                         |
| `dblclick`    | 더블클릭                                         |
| `mousedown`   | 버튼 누르는 순간 (`e.button`: 0=좌, 1=중, 2=우)  |
| `mouseup`     | 버튼 떼는 순간                                   |
| `contextmenu` | 우클릭 (기본 메뉴 차단 시 `preventDefault` 사용) |
| `mousemove`   | 커서 이동할 때마다                               |

```js
$btn.addEventListener("mousedown", (e) => {
  console.log(e.button); // 0: 좌클릭, 2: 우클릭
});

$btn.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // 브라우저 기본 우클릭 메뉴 차단
});
```

### 키보드 이벤트

| 이벤트    | 발생 시점                                     |
| --------- | --------------------------------------------- |
| `keydown` | 키를 누르는 순간 (누르고 있는 동안 계속 발생) |
| `keyup`   | 키에서 손을 떼는 순간                         |

| 프로퍼티 | 예시                    | 설명                        |
| -------- | ----------------------- | --------------------------- |
| `e.key`  | `'a'`, `'A'`, `'Enter'` | 입력된 문자 (대소문자 구분) |
| `e.code` | `'KeyA'`, `'Enter'`     | 물리적 키 위치 코드         |

```js
$input.addEventListener("keydown", (e) => {
  console.log(e.key, e.code);

  if (e.key === "Enter") {
    // Enter 키 입력 시 검색 실행
  }
});
```

---

## 6. 폼 이벤트

### 폼 요소 접근

```js
const $form = document.forms.joinForm; // name 속성으로 폼 접근
const $username = $form.username; // 폼 내 요소도 name으로 접근
const $hobbies = $form.hobby; // 동일 name → NodeList 반환
```

### 폼 관련 이벤트 정리

| 이벤트   | 발생 시점                 | 주요 용도                   |
| -------- | ------------------------- | --------------------------- |
| `focus`  | 요소에 포커스 진입        | 입력 필드 강조 스타일       |
| `blur`   | 요소에서 포커스 이탈      | 입력값 유효성 검사          |
| `input`  | 값 변경될 때마다 (실시간) | 글자 수 카운터, 실시간 검색 |
| `change` | 값 변경 후 포커스 이탈    | 셀렉트박스, 체크박스 반영   |
| `submit` | 폼 제출 버튼 클릭         | 유효성 검사 후 서버 전송    |

### submit 유효성 검사 패턴

```js
$form.addEventListener("submit", (e) => {
  // 1. 이름 유효성 검사
  if ($username.value.trim().length < 2) {
    e.preventDefault();
    $error.textContent = "이름은 두 글자 이상 입력해주세요.";
    return;
  }

  // 2. 체크박스 유효성 검사
  let checkedCount = 0;
  $hobbies.forEach((hobby) => {
    if (hobby.checked) checkedCount++;
  });

  if (checkedCount < 2) {
    e.preventDefault();
    $error.textContent = "관심사는 2개 이상 선택해주세요.";
    return;
  }

  // 모든 검사 통과 시 기본 동작(서버 전송)이 실행됨
});
```

---

## 7. BOM — 브라우저 제어

`window`는 브라우저의 최상위 전역 객체. 생략 가능 — `alert()`는 실제로 `window.alert()`다.

### 대화 상자

| 메서드                 | 반환값           | 설명                         |
| ---------------------- | ---------------- | ---------------------------- |
| `alert(msg)`           | 없음             | 메시지 표시                  |
| `confirm(msg)`         | `boolean`        | 확인/취소 → `true` / `false` |
| `prompt(msg, default)` | `string \| null` | 텍스트 입력받기              |

```js
const answer = confirm("결제를 진행하시겠습니까?");
if (answer) {
  /* 확인 */
} else {
  /* 취소 */
}

const name = prompt("이름을 입력하세요", "홍길동");
if (name) console.log(`반갑습니다. ${name}님.`);
```

### location 객체 — 페이지 이동

| 사용법                  | 특징                                     |
| ----------------------- | ---------------------------------------- |
| `location.href = url`   | 이동 — 방문 기록에 남음 (뒤로 가기 가능) |
| `location.replace(url)` | 이동 — 방문 기록 대체 (뒤로 가기 불가)   |
| `location.reload()`     | 현재 페이지 새로고침                     |

### history 객체 — 방문 기록 제어

```js
history.back(); // 뒤로 가기
history.forward(); // 앞으로 가기
history.go(-2); // 2 페이지 뒤로
```

---

## 8. 비동기 프로그래밍

### 동기 vs 비동기

| 구분                  | 특징                                                      | 문제점                                 |
| --------------------- | --------------------------------------------------------- | -------------------------------------- |
| 동기 (Synchronous)    | 앞 작업이 끝날 때까지 다음 작업 대기                      | 오래 걸리는 작업 시 페이지 전체 블로킹 |
| 비동기 (Asynchronous) | 오래 걸리는 작업을 브라우저에 위임 후 즉시 다음 코드 실행 | 결과 순서 예측이 어려움                |

### 타이머 함수

| 함수                  | 동작                       | 취소                |
| --------------------- | -------------------------- | ------------------- |
| `setTimeout(fn, ms)`  | ms 후 fn을 딱 한 번 실행   | `clearTimeout(id)`  |
| `setInterval(fn, ms)` | ms 간격으로 fn을 반복 실행 | `clearInterval(id)` |

```js
const timerId = setTimeout(() => {
  console.log("3초 후 실행");
}, 3000);

clearTimeout(timerId); // 실행 전에 취소 가능

let count = 0;
const intervalId = setInterval(() => {
  console.log(`${count}초 경과`);
  if (count++ === 5) clearInterval(intervalId);
}, 1000);
```

### 이벤트 루프 동작 원리

자바스크립트는 싱글 스레드지만, 브라우저가 비동기 작업을 대신 처리해주는 구조로 동시성을 구현한다.

| 구성요소   | 역할                                                        |
| ---------- | ----------------------------------------------------------- |
| Call Stack | 코드가 실행되는 단일 스택                                   |
| Web API    | `setTimeout`, `fetch` 등 오래 걸리는 작업을 브라우저가 처리 |
| Task Queue | Web API 완료 후 콜백이 대기하는 줄                          |
| Event Loop | Call Stack이 비면 Task Queue에서 콜백을 꺼내 실행           |

```js
console.log("시작");
setTimeout(() => console.log("타이머"), 0); // 0ms여도 Queue로 이동
console.log("끝");

// 출력 순서: 시작 → 끝 → 타이머
```

> `setTimeout(fn, 0)`이라도 콜백은 반드시 현재 Call Stack이 모두 비워진 후에 실행된다.

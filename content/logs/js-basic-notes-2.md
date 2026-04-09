## 1. 변수 선언 — var / let / const

### var의 문제점

| 문제 | 설명 |
|------|------|
| 중복 선언 허용 | 같은 이름으로 재선언해도 에러 없이 덮어씌워짐 |
| 함수 레벨 스코프 | `for`문 안에서 선언한 `var i`가 외부 변수를 오염시킴 |
| 변수 호이스팅 | 선언 전에 참조해도 `undefined`로 동작 -> 예측 불가 |

### let

- 중복 선언 금지 (재할당은 가능)
- **블록 레벨 스코프** — `{}` 안에서만 유효
- 호이스팅은 일어나지만, 선언 전 접근 시 `ReferenceError` 발생

### const

- 선언과 동시에 초기화 필수
- 재할당 불가
- 단, **객체의 프로퍼티 변경은 가능** (참조값 자체가 바뀌는 것이 아니므로)

### 권장 규칙

> 기본은 `const` → 값이 바뀌어야 할 때만 `let` → `var`는 사용하지 않는다.

---

## 2. 제어문 — continue / break

| 키워드 | 동작 |
|--------|------|
| `continue` | 현재 반복의 나머지를 건너뛰고 다음 반복으로 이동 |
| `break` | 반복문 자체를 즉시 종료 |

- 중첩 반복문에서 `continue`는 **가장 가까운 안쪽 반복문**에만 영향
- `for...of` — 배열/이터러블 순회에 사용 (ES6+)

```js
for (const number of [1, 2, 3, 4, 5]) {
    if (number % 2 === 0) continue; // 짝수 건너뜀
    console.log(number); // 1, 3, 5
}
```

---

## 3. 객체 (Object)

### 개념

- JS는 원시 값을 제외한 모든 것이 객체
- **프로퍼티** = 키(key) + 값(value)
- **메서드** = 프로퍼티 값이 함수인 것

```js
const student = {
    name: '권판다',   // 프로퍼티
    age: 1,
    getInfo() {       // 메서드
        return `${this.name}(은)는 ${this.age}세입니다.`;
    }
};
```

### 프로퍼티 접근

| 방법 | 사용 시점 |
|------|-----------|
| `obj.key` | 일반적인 경우 |
| `obj['key']` | 키에 특수문자/하이픈 포함, 또는 키가 변수에 담긴 경우 |

```js
const prop = 'name';
console.log(dog[prop]); // 변수로 키 접근 시 반드시 대괄호 사용
```

### 프로퍼티 추가 / 수정 / 삭제 

```js
dog.age = 1;       // 추가 (존재하지 않는 키에 할당)
dog.name = '두부'; // 수정 (이미 있는 키에 재할당)
delete dog.age;    // 삭제
```

- `const` 객체도 **프로퍼티 변경은 가능**, 객체 자체 재할당만 불가

### 프로퍼티 존재 확인 & 순회

```js
'name' in dog;            // true/false 반환

for (const key in dog) {
    console.log(key, dog[key]);
}
```

---

## 4. 함수 (Function)

### 함수 선언문 vs 함수 표현식

| 구분 | 호이스팅 | 특징 |
|------|----------|------|
| 함수 선언문 | O — 선언 전 호출 가능 | `function foo() {}` |
| 함수 표현식 | X — 선언 이후에만 호출 가능 | `const foo = function() {}` |

> 예측 가능한 코드를 위해 **함수 표현식**을 선호하는 경향이 있음

### 매개변수(Parameter) & 인수(Argument)

- 인수가 부족하면 → `undefined` (에러 아님)
- 인수가 초과하면 → 무시됨 (`arguments` 객체로 접근은 가능)
- **기본값 설정**: `function hi(name = '아무개') {}`

### return

- 값을 반환하거나 함수를 종료
- 생략 시 `undefined` 반환
- **Early Return 패턴** — 조건 불충족 시 조기 종료하여 중첩 줄이기

```js
function registerUser(nickname) {
    if (nickname.length < 2) return; // 조기 종료
    if (nickname === 'admin') return;
    console.log(`${nickname}님 환영합니다.`);
}
```

---

## 5. 함수의 종류

### 일급 객체로서의 함수

JS의 함수는 **값**으로 취급된다 -> 아래 4가지가 가능

1. 변수에 할당
2. 객체의 프로퍼티(메서드)로 할당
3. 다른 함수의 인자로 전달
4. 함수의 반환값으로 사용

### 콜백 함수 (Callback Function)

- 다른 함수(고차 함수)의 인자로 전달되어, **호출 시점을 위임**하는 함수
- 배열 메서드 (`sort`, `forEach`, `map`, `filter` 등)에서 자주 활용

```js
function calculator(cb, a, b) {
    return cb(a, b); // 콜백 호출 시점을 calculator가 결정
}
calculator((a, b) => a + b, 10, 5); // 15
```

### 즉시 실행 함수 (IIFE)

- 정의와 동시에 딱 한 번 실행
- 내부 변수가 외부로 노출되지 않아 **스코프 오염 방지**에 유용

```js
(function() {
    let secret = '비밀';
    console.log(secret);
})();
// 외부에서 secret 접근 불가
```

### 재귀 함수 (Recursive Function)

- 함수가 자기 자신을 호출
- **반드시 종료 조건(base case)** 이 있어야 무한 루프 방지

```js
function factorial(n) {
    if (n <= 1) return 1;       // 종료 조건
    return n * factorial(n - 1); // 재귀 호출
}
factorial(5); // 120
```

---

## 핵심 요약

| 주제 | 핵심 포인트 |
|------|-------------|
| 변수 선언 | `const` 기본, 변경 필요 시 `let`, `var` 사용 금지 |
| 스코프 | `let`/`const`는 블록 레벨, `var`는 함수 레벨 |
| 객체 | 프로퍼티 = 상태, 메서드 = 동작 / `const`여도 내부 변경 가능 |
| 함수 | 일급 객체 — 값처럼 전달·반환 가능 |
| 콜백 | 호출 시점을 고차 함수에 위임 |
| IIFE | 일회성 실행 + 스코프 격리 |
| 재귀 | 종료 조건 필수 |
## 1. DOM이란?

브라우저는 HTML 문서를 파싱해서 **트리 구조의 객체 모델(Document Object Model)** 로 변환한다.  
이 트리의 각 노드가 자바스크립트로 조작할 수 있는 DOM 노드다.

- **HTML 문서** → 텍스트 파일
- **DOM** → 자바스크립트가 다룰 수 있는 살아있는 객체 트리

### 노드의 종류

| nodeType | 종류          | 예시                               |
| -------- | ------------- | ---------------------------------- |
| `1`      | Element Node  | `<div>`, `<p>`                     |
| `3`      | Text Node     | 태그 사이 텍스트, 줄바꿈·공백 포함 |
| `8`      | Comment Node  | `<!-- 주석 -->`                    |
| `9`      | Document Node | `document` 객체 자체               |

> **주의:** 텍스트 노드에는 줄바꿈과 공백도 포함된다. 노드 탐색 시 `childNodes` 대신 `children`, `firstElementChild` 같은 **Element 전용 프로퍼티**를 써야 혼란이 없다.

---

## 2. 요소 선택

### querySelector / querySelectorAll — 이것만 쓰면 된다

CSS 선택자 문법을 그대로 사용한다. 가장 강력하고 일관성 있는 방법이다.

```js
// 첫 번째 일치 요소 하나만 반환 → HTMLElement
const $apple = document.querySelector("#apple");
const $first = document.querySelector(".fruit");

// 모든 일치 요소 반환 → NodeList (정적)
const $fruits = document.querySelectorAll(".fruit");
$fruits.forEach((el) => {
  el.style.border = "1px solid blue";
});
```

### 구식 메서드와 HTMLCollection의 함정

`getElementsByClassName` 등은 **살아있는(live) HTMLCollection** 을 반환한다.  
반복문 도중 DOM이 바뀌면 컬렉션도 실시간으로 업데이트되어 예상치 못한 버그가 생긴다.

```js
// 문제 상황 — HTMLCollection live 버그
const $texts = $box.getElementsByClassName("text"); // live!

for (let i = 0; i < $texts.length; i++) {
  $texts[i].classList.remove("text");
  // i=0 제거 → $texts 즉시 갱신 → [0]이 원래 [1]이 됨 → 두 번째 요소 건너뜀!
}
```

```js
// 해결 — 배열로 변환 후 사용
const arr = [...document.getElementsByClassName("text")]; // 스냅샷
arr.forEach((el) => el.classList.remove("text")); // 안전
```

> **결론:** `querySelectorAll`이 반환하는 NodeList는 정적(static)이라 이 문제가 없다.  
> 가능하면 `querySelector` / `querySelectorAll`만 쓰자.

---

## 3. 노드 탐색

특정 요소를 기준으로 부모·자식·형제를 탐색할 수 있다.  
**Element 전용 프로퍼티**를 사용하면 텍스트/주석 노드를 건너뛰어 안전하다.

### 탐색 프로퍼티 정리

| 프로퍼티                  | 설명                                | 비고             |
| ------------------------- | ----------------------------------- | ---------------- |
| `.children`               | 자식 **요소** 목록 (HTMLCollection) | 텍스트 노드 제외 |
| `.firstElementChild`      | 첫 번째 자식 요소                   | —                |
| `.lastElementChild`       | 마지막 자식 요소                    | —                |
| `.parentElement`          | 부모 요소                           | —                |
| `.nextElementSibling`     | 다음 형제 요소                      | 없으면 `null`    |
| `.previousElementSibling` | 이전 형제 요소                      | 없으면 `null`    |

```js
const $family = document.querySelector("#family");

$family.firstElementChild.style.color = "blue"; // 첫째
$family.lastElementChild.style.color = "green"; // 막내

const $me = document.querySelector("#me");
$me.parentElement.style.border = "1px solid black";
$me.nextElementSibling.style.color = "orange"; // 바로 다음 형제
$me.previousElementSibling; // → null (첫 번째라 이전 형제 없음)
```

---

## 4. 텍스트 조작

### textContent vs nodeValue vs innerText

| 방법           | 특징                                                                    | 추천      |
| -------------- | ----------------------------------------------------------------------- | --------- |
| `.textContent` | 요소 노드에 직접 사용. 내부 HTML 태그 무시하고 텍스트만. XSS 걱정 없음. | 권장      |
| `.nodeValue`   | 텍스트 노드에만 사용 가능. 요소 노드에서 `null` 반환. 번거로움.         | 비추천    |
| `.innerText`   | CSS 스타일 영향 받음 (hidden 요소 제외 등). 리플로우 유발 가능.         | ⚠️ 비추천 |

```js
const $el = document.querySelector("#content-area");

// 읽기: HTML 태그는 제거하고 텍스트만 반환
console.log($el.textContent); // "여기는 굵은 글씨가 있는 영역입니다."

// 쓰기: 내부를 모두 지우고 텍스트로 교체 (HTML 태그도 그냥 문자로 처리)
$el.textContent = "새로운 내용 <span>태그 무시됨</span>";
```

---

## 5. DOM 조작 · 추가

### 방법 1 — innerHTML (내부 전체 교체)

요소 내부를 HTML 문자열로 한 번에 교체한다. 빠르고 간편하지만 **XSS 취약점**에 주의해야 한다.

```js
$area.innerHTML = "<ul><li>새 항목</li></ul>";

// 사용자 입력을 직접 넣으면 XSS 공격 가능!
$area.innerHTML = userInput; // 절대 금지
```

> **XSS 경고:** 사용자 입력값을 `innerHTML`에 직접 넣으면 악성 스크립트가 실행될 수 있다.  
> 사용자 입력은 반드시 `textContent`를 사용하자.

---

### 방법 2 — insertAdjacentHTML (위치 지정 삽입)

기존 내용을 유지하면서 4가지 위치 중 하나에 HTML을 끼워 넣는다.

```plain
← beforebegin
<div id="target">
  ← afterbegin
    기존 컨텐츠
  ← beforeend
</div>
← afterend
```

```js
$target.insertAdjacentHTML("beforebegin", "<p>div 시작 전</p>");
$target.insertAdjacentHTML("afterbegin", "<p>div 내부 맨 앞</p>");
$target.insertAdjacentHTML("beforeend", "<p>div 내부 맨 뒤</p>");
$target.insertAdjacentHTML("afterend", "<p>div 끝난 후</p>");
```

---

### 방법 3 — createElement + appendChild (가장 안전한 정석)

자바스크립트로 요소를 만들고 조립한다. `textContent`로 텍스트를 넣으면 XSS 걱정이 없다.

```js
// 단일 요소 추가
const $li = document.createElement("li");
$li.textContent = "콜라";
$list.appendChild($li);

// 여러 요소를 한 번에 → DocumentFragment로 리플로우 최소화
const $frag = document.createDocumentFragment();
["사이다", "우유", "환타"].forEach((text) => {
  const $item = document.createElement("li");
  $item.textContent = text;
  $frag.appendChild($item);
});
$list.appendChild($frag); // DOM 업데이트 1회만 발생
```

> **DocumentFragment란?** 메모리 안의 임시 DOM 컨테이너다.  
> 여러 요소를 여기서 먼저 조립한 뒤 실제 DOM에 한 번만 붙이면 리플로우(reflow)가 1번만 발생해 성능이 좋아진다.

---

### 노드 삽입 · 이동 · 교체 · 삭제

| 메서드                          | 동작                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `parent.insertBefore(new, ref)` | `ref` 앞에 `new` 삽입                                 |
| `parent.appendChild(node)`      | 마지막 자식으로 추가. 이미 DOM에 있는 노드면 **이동** |
| `parent.replaceChild(new, old)` | `old`를 `new`로 교체                                  |
| `parent.removeChild(node)`      | `node` 삭제                                           |

> **이동 팁:** `appendChild(기존노드)`를 호출하면 복사가 아니라 이동이다.  
> 원래 위치에서 사라지고 새 위치에 붙는다.

```js
// 스테이크를 피자 앞에 삽입
$foodList.insertBefore($steak, $pizza);

// 피자를 drink-list로 이동 (원래 자리에서 사라짐)
$drinkList.appendChild($pizza);

// drink-list 첫 요소를 오렌지주스로 교체
$drinkList.replaceChild($oj, $drinkList.firstElementChild);

// 파스타 삭제
$foodList.removeChild($pasta);
```

---

## 6. 어트리뷰트(Attribute) vs 프로퍼티(Property)

|          | HTML 어트리뷰트                     | DOM 프로퍼티                         |
| -------- | ----------------------------------- | ------------------------------------ |
| **비유** | 최초 설계도                         | 실시간 현황판                        |
| **정의** | HTML에 작성된 초기값                | 자바스크립트 객체가 가진 현재 상태값 |
| **변화** | 사용자가 바꿔도 처음 값 그대로 유지 | 사용자 입력 즉시 반영                |

### 기본 어트리뷰트 조작

```js
const $input = document.querySelector("#username");

$input.getAttribute("value"); // 읽기
$input.setAttribute("value", "hihi"); // 쓰기
$input.hasAttribute("class"); // 존재 확인 → boolean
$input.removeAttribute("value"); // 삭제
```

### 어트리뷰트 vs 프로퍼티 핵심 차이

```js
$input.oninput = () => {
  console.log($input.value); // 프로퍼티: 실시간 현재값
  console.log($input.getAttribute("value")); // 어트리뷰트: 처음 값 그대로
};

// checkbox 예시
$checkbox.getAttribute("checked"); // → '' (빈 문자열, 존재만 확인)
$checkbox.checked; // → true/false (실제 상태)
```

> **실전 규칙:** 사용자 입력값을 읽을 때는 반드시 **프로퍼티**(`.value`, `.checked`)를 사용하자.  
> 어트리뷰트는 초기값이라 실제 상태를 반영하지 않는다.

### data 어트리뷰트 — 요소에 데이터 숨기기

HTML 표준 속성 외에 커스텀 데이터를 저장할 때 `data-*` 어트리뷰트를 사용한다.  
JS에서는 `.dataset`으로 접근한다.

```html
<li data-board-id="13" data-category-name="맛집">송파 맛집 추천</li>
```

```js
$boardList.onclick = (e) => {
  if (e.target.tagName !== "LI") return;

  // data-board-id → dataset.boardId (자동으로 camelCase 변환)
  console.log(e.target.dataset.boardId); // "13"
  console.log(e.target.dataset.categoryName); // "맛집"
};
```

> **네이밍 규칙:** HTML `data-category-name` (케밥케이스) → JS `dataset.categoryName` (카멜케이스)으로 자동 변환된다.

---

## 7. CSS 제어

### 방법 1 — 인라인 스타일 (element.style)

요소에 직접 인라인 스타일을 적용한다. CSS 속성명은 **카멜케이스**로 작성한다.

```js
$box.style.width = "200px";
$box.style.backgroundColor = "green"; // background-color → backgroundColor
$box.style.fontSize = "20px"; // font-size → fontSize
```

> **단점:** 스타일이 HTML에 직접 박혀서 유지보수가 어렵다.  
> 단순 일회성 동적 효과에만 사용하고, 복잡한 스타일은 클래스로 관리하는 게 낫다.

---

### 방법 2 — classList 제어 (권장)

스타일은 CSS에 정의하고, JS에서는 클래스를 붙였다 떼는 방식이 **가장 현대적이고 유지보수가 좋다.**

| 메서드                         | 동작                                                |
| ------------------------------ | --------------------------------------------------- |
| `.classList.add('a', 'b')`     | 클래스 추가 (여러 개 동시 가능)                     |
| `.classList.remove('a')`       | 클래스 제거                                         |
| `.classList.toggle('a')`       | 있으면 제거, 없으면 추가. 반환값: 추가됐으면 `true` |
| `.classList.contains('a')`     | 클래스 존재 여부 → `boolean`                        |
| `.classList.replace('a', 'b')` | `a`를 `b`로 교체                                    |

```js
// 클래스 추가
$box.classList.add("circle", "red-bg");

// 토글 (버튼으로 on/off 구현에 최적)
const isAdded = $box.classList.toggle("red-bg");
console.log(isAdded); // true: 추가됨 / false: 제거됨

// 포함 여부 확인
$box.classList.contains("circle"); // true / false
```

> `$box.className = 'circle'` → 기존 클래스를 **전부 덮어씀**  
> `$box.classList.add('circle')` → 기존 클래스 유지하면서 추가

---

## 전체 요약

| 주제                   | 핵심 결론                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| 요소 선택              | `querySelector` / `querySelectorAll`만 쓰면 된다                          |
| 노드 탐색              | `firstElementChild` 등 Element 전용 프로퍼티를 써야 텍스트 노드 혼란 없음 |
| 텍스트 조작            | `textContent` 사용. XSS 안전                                              |
| DOM 추가 안전 순서     | `createElement` > `insertAdjacentHTML` > `innerHTML`                      |
| 대량 추가 성능         | `DocumentFragment`로 묶어서 한 번에 DOM에 붙임                            |
| 어트리뷰트 vs 프로퍼티 | 사용자 입력은 반드시 프로퍼티(`.value`)로 읽기                            |
| CSS 제어               | `classList` 메서드 권장. `className` 직접 할당은 기존 클래스 날아감       |

## Part 1. HTML — 웹 페이지의 구조 잡기

### 1-1. 텍스트 태그

**제목 / 단락**

| 태그 | 설명 |
|------|------|
| `h1` ~ `h6` | 제목 (숫자가 클수록 작아짐) |
| `p` | 문단 |
| `br` | 줄바꿈 |
| `hr` | 수평선 구분선 |
| `pre` | 공백·줄바꿈을 그대로 출력 |

**인라인 강조**

| 태그 | 설명 |
|------|------|
| `b` / `strong` | 굵게 / 의미 있는 강조 |
| `i` / `em` | 기울임 / 의미 있는 강조 |
| `mark` | 형광펜 효과 |
| `del` | 삭제 표시 |

> `strong`, `em`은 단순 시각 효과가 아닌 **의미(시맨틱) 강조**다.

---

### 1-2. 목록

```html
<!-- 순서 없는 목록 -->
<ul>
  <li>항목</li>
</ul>

<!-- 순서 있는 목록 -->
<ol>
  <li>첫 번째</li>
</ol>
```

---

### 1-3. 표 (Table)

```html
<table>
  <caption>표 제목</caption>
  <thead>
    <tr>
      <th>헤더</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">세로 2칸 병합</td>
      <td colspan="2">가로 2칸 병합</td>
    </tr>
  </tbody>
</table>
```

- `rowspan` — 아래 행과 합치기
- `colspan` — 오른쪽 열과 합치기

---

### 1-4. 링크

```html
<!-- 외부 사이트 -->
<a href="https://google.com">구글</a>

<!-- 새 탭으로 열기 -->
<a href="https://naver.com" target="_blank">네이버</a>

<!-- 페이지 내부 이동 -->
<a href="#section-id">바로가기</a>
```

---

### 1-5. 미디어

```html
<img src="image.png" alt="이미지 설명" width="300">

<!-- 이미지 + 설명을 의미적으로 묶기 -->
<figure>
  <img src="photo.png" alt="사진">
  <figcaption>사진 설명</figcaption>
</figure>

<audio src="audio.mp3" controls></audio>
<video src="video.mp4" controls></video>
```

> `alt` 속성은 이미지 로드 실패 시 대체 텍스트이자 스크린리더용 설명이므로 필수다.

---

### 1-6. 폼 (Form)

```html
<form action="/submit" method="post">
  <fieldset>
    <legend>그룹 제목</legend>

    <!-- label for ↔ input id 연결 → 클릭 편의성 향상 -->
    <label for="user-id">아이디</label>
    <input id="user-id" name="userId" type="text" placeholder="입력">

    <input type="password" name="pw">
    <input type="radio" name="group" value="a"> <!-- 하나만 선택 -->
    <input type="checkbox" name="hobby" value="html"> <!-- 복수 선택 -->

    <textarea name="memo" rows="5"></textarea>

    <button type="submit">제출</button>
    <button type="reset">초기화</button>
  </fieldset>
</form>
```

- `action` — 데이터를 보낼 서버 주소
- `name` — 서버에서 데이터를 받을 때 쓰는 키값

---

### 1-7. 레이아웃 태그

**범용 컨테이너**

| 태그 | 특성 | 설명 |
|------|------|------|
| `div` | 블록 | 한 줄 전체 차지 |
| `span` | 인라인 | 내용 크기만큼만 차지 |

**시맨틱 태그** — `div` 대신 의미 있는 이름을 붙인 태그

```html
<header>머리말</header>
<main>
  <section>소개</section>
  <section>기술 스택</section>
</main>
<footer>저작권</footer>
```

> 검색엔진(SEO)·스크린리더에 구조를 명확히 전달한다.

---

## Part 2. CSS — 디자인 입히기

### CSS 적용 방식 3가지

| 방식 | 예시 | 비고 |
|------|------|------|
| 인라인 | `<p style="color:red">` | 우선순위 최고, 유지보수 어려움 |
| 내부 스타일시트 | `<style>` 태그 내부 | 해당 파일에만 적용 |
| 외부 파일 | `<link rel="stylesheet" href="style.css">` | **실무 기본** |

---

### 2-1. 선택자와 우선순위

```css
/* 태그 선택자 */
h2 { color: red; }

/* 클래스 선택자 (.): 여러 요소에 별명 */
.highlight { background: yellow; }

/* 아이디 선택자 (#): 페이지에서 유일한 요소 */
#main-title { font-size: 2rem; }

/* 후손 선택자 (띄어쓰기): 하위 모든 요소 */
#list li { font-weight: bold; }

/* 자손 선택자 (>): 직계 자식만 */
ul > li:last-child { color: green; }
```

**우선순위:** 태그 < `.class` < `#id` < 인라인 `style`

---

### 2-2. 박스 모델

모든 HTML 요소는 사각형 박스 구조를 가진다.

```
[ margin ]
  [ border ]
    [ padding ]
      [ content ]
```

```css
.box {
  width: 300px;
  height: 150px;

  padding: 20px;           /* 안쪽 여백 */
  border: 2px solid green; /* 테두리 */
  margin: 30px;            /* 바깥 여백 */

  border-radius: 15px;     /* 모서리 둥글게 */
  box-shadow: 5px 5px 30px rgba(0,0,0,0.4); /* 그림자 */
  background-color: bisque;
}
```

---

### 2-3. 텍스트 스타일

```css
body {
  font-family: "IBM Plex Sans KR", sans-serif;
  font-size: 16px;   /* rem 단위 권장: 1rem = 기본 16px */
  font-weight: 400;
  line-height: 1.8;
  color: #333;
  text-align: left;
}
```

> Google Fonts는 `<link>` 태그로 불러온 뒤 `font-family`에 적용한다.

---

### 2-4. 레이아웃

#### Flexbox — 1차원 (행 또는 열)

```css
.flex-container {
  display: flex;
  justify-content: space-around; /* 주축 (가로) 정렬 */
  align-items: center;           /* 교차축 (세로) 정렬 */
}
```

#### Grid — 2차원 (행 + 열 동시)

```css
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr; /* 1:1:2 비율 */
  grid-template-rows: 2fr 1fr;
  gap: 10px;
}

/* 특정 아이템이 여러 칸 차지 */
.item:first-child {
  grid-column: 1 / 3; /* 1번~3번 열 경계까지 */
}
```

#### Position — 절대 위치 지정

```css
.container {
  position: relative; /* 기준점 설정 */
}
.child {
  position: absolute; /* 기준점으로부터 좌표 지정 */
  top: 50px;
  left: 50px;
}
```

---

### 2-5. 인터랙션

```css
.button {
  transition: all 0.3s ease; /* 변화를 부드럽게 */
}

/* 마우스 올렸을 때 */
.button:hover {
  background-color: teal;
  transform: translateY(-10px); /* 위로 10px 이동 */
  box-shadow: 0 5px 15px rgba(0,0,0,0.4);
}

/* 클릭 중일 때 */
.button:active {
  transform: translateY(-2px);
}
```

- `transition` — 상태 변화를 애니메이션으로 이어줌
- `transform` — 요소의 위치·크기·회전 변형 (레이아웃에 영향 없음)
- `:hover` / `:active` — 가상 클래스 선택자

---

## 핵심 요약

| 구분 | 역할 |
|------|------|
| HTML | 웹 페이지의 **구조**와 **내용** |
| CSS | 웹 페이지의 **스타일**과 **레이아웃** |
| 시맨틱 태그 | 의미 있는 구조 → SEO·접근성 향상 |
| 박스 모델 | 모든 요소는 margin·border·padding·content 구조 |
| Flexbox | 1차원 정렬의 기본 |
| Grid | 2차원 복잡 레이아웃 |
| transition + :hover | 인터랙션의 기본 패턴 |
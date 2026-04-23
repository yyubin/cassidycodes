# React 강의록 — Next.js App Router & Zustand 상태 관리

> 실습 프로젝트: `04_movie-practice`, `05_zustand`

## 1. 클라이언트 컴포넌트 vs 서버 컴포넌트

App Router에서 모든 컴포넌트는 기본적으로 **서버 컴포넌트**다.  
`useState`, `useEffect`, 이벤트 핸들러 같은 브라우저 기능을 쓰려면 파일 맨 위에 `"use client"`를 선언해야 한다.

```jsx
"use client"; // 이 선언이 없으면 서버 컴포넌트
import { useState, useEffect } from "react";

export default function MoviePage() {
  const [movieList, setMovieList] = useState([]);
  // ...
}
```

| 구분                 | 서버 컴포넌트           | 클라이언트 컴포넌트          |
| -------------------- | ----------------------- | ---------------------------- |
| 선언                 | 없음 (기본)             | 파일 최상단에 `"use client"` |
| useState / useEffect | 사용 불가               | 사용 가능                    |
| 이벤트 핸들러        | 사용 불가               | 사용 가능                    |
| 렌더링 위치          | 서버                    | 브라우저                     |
| 데이터 페칭          | `async/await` 직접 가능 | `useEffect` 활용             |

---

## 2. API 통신 패턴

### 환경변수 관리 (.env)

API URL과 키처럼 민감하거나 자주 바뀌는 값은 `.env` 파일로 분리한다.

```bash
# .env
NEXT_PUBLIC_DAILY_BOX_OFFICE_URL=http://www.kobis.or.kr/.../searchDailyBoxOfficeList.json
NEXT_PUBLIC_MOVIE_API_KEY=ade0cfdd62eaa3f395bf1eb2a1214436
```

- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트(브라우저)에서도 접근 가능하다.
- 코드에서는 `process.env.NEXT_PUBLIC_MOVIE_API_KEY`로 읽는다.

### 공통 fetch 유틸리티

```js
// src/utils/apiUtils.js
export const get = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
```

반복되는 fetch 로직을 한 곳에 모아두면 유지보수가 쉬워진다.

### URL 쿼리 파라미터 생성

```js
// src/utils/urlUtils.js
export const urlParamFactory = (url, params) => {
  const queryString = new URLSearchParams(params).toString();
  return `${url}?${queryString}`;
};

// 사용 예
const url = urlParamFactory(BASE_URL, {
  key: API_KEY,
  targetDt: "20240101",
});
// → "https://...?key=ade0...&targetDt=20240101"
```

### 날짜 유틸리티

```js
// src/utils/dateUtils.js
export const formatDate = (date, separator = "") => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${separator}${month}${separator}${day}`;
};

export const getYesterday = (isFullFormat = false) => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDate(date, isFullFormat ? "-" : "");
};
```

박스오피스 API는 어제 날짜를 기본으로 조회하기 때문에 `getYesterday()`를 활용한다.

---

## 3. 영화 정보 실습 프로젝트 (04_movie-practice)

> 한국영화진흥위원회(KOBIS) API를 활용한 박스오피스 & 영화인 조회 앱

### 전체 구조

```plain
src/
├── apis/
│   ├── MovieApi.js      ← 영화 관련 API 함수
│   └── PeopleApi.js     ← 영화인 관련 API 함수
├── app/
│   ├── layout.js
│   ├── page.js          ← 홈 (링크 페이지)
│   ├── movie/
│   │   ├── page.jsx         ← 박스오피스 목록
│   │   └── [movieCode]/page.jsx ← 영화 상세
│   └── people/
│       ├── page.jsx         ← 영화인 검색
│       └── [peopleCode]/page.jsx ← 영화인 상세
├── component/
│   ├── MovieCard.jsx
│   ├── PersonCard.jsx
│   ├── PeopleList.jsx
│   └── FilmoCard.jsx
└── utils/
    ├── apiUtils.js
    ├── dateUtils.js
    └── urlUtils.js
```

### API 레이어 분리

```js
// src/apis/MovieApi.js
import { get } from "@/utils/apiUtils";
import { urlParamFactory } from "@/utils/urlUtils";

const BASE_URL = process.env.NEXT_PUBLIC_DAILY_BOX_OFFICE_URL;
const API_KEY = process.env.NEXT_PUBLIC_MOVIE_API_KEY;

export const getMovieListByDate = async (date) => {
  const url = urlParamFactory(BASE_URL, { key: API_KEY, targetDt: date });
  const data = await get(url);
  return data.boxOfficeResult.dailyBoxOfficeList;
};

export const getMovieDetail = async (movieCode) => {
  const url = urlParamFactory(DETAIL_URL, { key: API_KEY, movieCd: movieCode });
  const data = await get(url);
  return data.movieInfoResult.movieInfo;
};
```

API 호출 로직을 `apis/` 폴더에 분리.

### 영화 목록 페이지 — 날짜 선택 & 데이터 페칭

```jsx
// src/app/movie/page.jsx
"use client";
import { useState, useEffect } from "react";
import { getMovieListByDate } from "@/apis/MovieApi";
import { getYesterday } from "@/utils/dateUtils";
import MovieCard from "@/component/MovieCard";

export default function MoviePage() {
  const [date, setDate] = useState(getYesterday()); // 조회 날짜 (YYYYMMDD)
  const [inputValue, setInputValue] = useState(getYesterday(true)); // input 표시용 (YYYY-MM-DD)
  const [movieList, setMovieList] = useState([]);

  useEffect(() => {
    getMovieListByDate(date).then(setMovieList);
  }, [date]); // date가 바뀔 때마다 API 재호출

  const handleDateChange = (e) => {
    const selected = e.target.value; // "2024-01-01"
    setInputValue(selected);
    setDate(selected.replaceAll("-", "")); // "20240101"
  };

  return (
    <div>
      <input type="date" value={inputValue} onChange={handleDateChange} />
      <div>
        {movieList.map((movie) => (
          <MovieCard key={movie.movieCd} movie={movie} />
        ))}
      </div>
    </div>
  );
}
```

**핵심 흐름**

1. 사용자가 날짜 선택 → `date` 상태 업데이트
2. `useEffect`가 `date` 변경 감지 → API 호출
3. 결과를 `movieList`에 저장 → 화면 렌더링

### 영화 상세 페이지 — 동적 라우트 파라미터 활용

```jsx
// src/app/movie/[movieCode]/page.jsx
"use client";
import { useParams, useRouter } from "next/navigation";

export default function MovieDetailPage() {
  const { movieCode } = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    getMovieDetail(movieCode).then(setMovie);
  }, [movieCode]);

  return (
    <div>
      <button onClick={() => router.push("/movie")}>← 목록으로</button>
      {movie && (
        <>
          <h1>
            {movie.movieNm} ({movie.movieNmEn})
          </h1>
          <p>장르: {movie.genres.map((g) => g.genreNm).join(", ")}</p>
          <p>개봉일: {movie.openDt}</p>
          <p>감독: {movie.directors.map((d) => d.peopleNm).join(", ")}</p>
        </>
      )}
    </div>
  );
}
```

### 영화인 검색 페이지 — 검색 & 페이징

```jsx
// src/app/people/page.jsx
"use client";
import { useState } from "react";
import { searchPeople } from "@/apis/PeopleApi";

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [peopleList, setPeopleList] = useState([]);
  const [page, setPage] = useState({ total: 0, now: 1 });

  const handleSearch = async (pageNum = 1) => {
    const result = await searchPeople(pageNum, query);
    setPeopleList(result.peopleList);
    setPage({
      total: Math.ceil(result.totalCount / 10), // 10개씩 페이징
      now: pageNum,
    });
  };

  const maxPage = page.total;

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => handleSearch(1)}>검색</button>

      <PeopleList peopleList={peopleList} />

      <button
        disabled={page.now <= 1}
        onClick={() => handleSearch(page.now - 1)}>
        이전
      </button>
      <span>
        {page.now} / {maxPage}
      </span>
      <button
        disabled={page.now >= maxPage}
        onClick={() => handleSearch(page.now + 1)}>
        다음
      </button>
    </div>
  );
}
```

---

## 4. 전역 상태 관리 — Zustand 기초

> 실습 프로젝트: `05_zustand/01_zustand-basic`

### Prop Drilling 문제

컴포넌트 트리가 깊어지면 상위 상태를 하위 컴포넌트에 전달하기 위해 중간 컴포넌트들이 쓰지도 않는 props를 계속 전달해야 한다.

```plain
Parent (count 보유)
  └── Child (count를 쓰지 않지만 전달해야 함)
        └── GrandChild (실제로 count를 사용)
```

이 문제를 **Prop Drilling**이라 하고 Zustand는 이를 해결한다.

### Zustand 설치

```bash
npm install zustand
```

### 스토어 생성

```js
// src/store/useStore.js
import { create } from "zustand";

export const useStore = create((set) => ({
  // 상태 (state)
  count: 0,
  text: "",

  // 액션 (action) — set()을 호출해 상태를 업데이트
  increase: () => set((state) => ({ count: state.count + 1 })),
  decrease: () => set((state) => ({ count: state.count - 1 })),
  setText: (value) => set({ text: value }),
}));
```

- `create()`에 콜백을 넘기면 스토어가 생성된다.
- `set()`은 Zustand가 제공하는 상태 업데이트 함수다.
- 이전 상태를 참조해야 할 때는 `set((state) => ...)` 형태를 쓴다.

### 컴포넌트에서 스토어 사용

```jsx
// src/component/GrandChild.js
"use client";
import { useStore } from "@/store/useStore";

export default function GrandChild() {
  const { count, text, increase, decrease, setText } = useStore();
  //      ↑ 필요한 상태와 액션만 구조분해할당

  return (
    <div>
      <h2>{count}</h2>
      <button onClick={increase}>+1</button>
      <button onClick={decrease}>-1</button>

      <h1>{text}</h1>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}
```

Parent → Child → GrandChild로 props를 전달할 필요 없이, **GrandChild가 스토어에 직접 접근**한다.

### Zustand 동작 원리 요약

```plain
스토어 (전역 저장소)
  ├── count: 0
  ├── text: ""
  ├── increase()
  └── setText()
      ↕ useStore() 훅으로 구독
컴포넌트들 (어디서든 접근 가능)
```

1. `useStore()`를 호출하면 해당 컴포넌트가 스토어를 **구독**한다.
2. 액션을 호출하면 스토어의 상태가 업데이트된다.
3. 상태가 변경되면 구독 중인 컴포넌트만 자동으로 **리렌더링**된다.

---

## 5. Zustand 심화 — 다중 스토어 & 비동기

### 관심사별 스토어 분리

스토어를 하나로 만들지 않고, **역할별로 분리**하면 유지보수가 쉬워진다.

```plain
store/
├── useCartStore.js    ← 장바구니
├── useUIStore.js      ← 모달, 사이드바 등 UI 상태
└── useUserStore.js    ← 사용자 정보 & 인증
```

#### useCartStore.js — 배열 상태와 불변성

```js
import { create } from "zustand";

export const useCartStore = create((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item], // 스프레드로 새 배열 생성 (불변성 유지)
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  clearCart: () => set({ items: [] }),
}));
```

> **불변성(Immutability)**: 기존 배열을 직접 수정하면(`push`, `splice`) React가 변경을 감지하지 못한다.  
> 항상 **새로운 배열/객체를 반환**해야 리렌더링이 제대로 동작한다.

```js
// 잘못된 패턴 — React가 변경을 감지 못함
set((state) => {
  state.items.push(item); // 직접 수정
  return state;
});

// 올바른 패턴 — 새 배열 반환
set((state) => ({
  items: [...state.items, item], // 새 배열 생성
}));
```

#### useUIStore.js — UI 상태

```js
import { create } from "zustand";

export const useUIStore = create((set) => ({
  isModalOpen: false,
  isSidebarOpen: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
```

#### useUserStore.js — 비동기 액션

```js
import { create } from "zustand";

export const useUserStore = create((set) => ({
  user: null,
  loading: false,

  login: (userData) => set({ user: userData }),
  logout: () => set({ user: null }),

  // 비동기 액션: async 함수를 그대로 쓸 수 있다
  fetchUser: async () => {
    set({ loading: true });
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/users/3");
      const data = await res.json();
      set({ user: data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ loading: false });
    }
  },
}));
```

Zustand는 **미들웨어 없이도 비동기 액션을 지원**한다. 액션 함수를 `async`로 선언하고 내부에서 `set()`을 여러 번 호출하면 된다.

### 비동기 로딩 패턴

```jsx
// src/app/async/page.js
"use client";
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";

export default function AsyncPage() {
  const { user, loading, fetchUser } = useUserStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) return <h1>데이터 로딩중...</h1>; // 로딩 중 UI

  return (
    <>
      {user ? (
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <p>{user.phone}</p>
        </div>
      ) : (
        <p>유저 정보가 없습니다.</p>
      )}
      <button onClick={fetchUser}>다시 불러오기</button>
    </>
  );
}
```

**로딩 상태 관리 흐름**:

```plain
fetchUser() 호출
  → loading: true  (로딩 스피너 표시)
  → fetch 요청
  → 성공: user 업데이트
  → finally: loading: false  (스피너 숨김)
```

### 여러 스토어를 한 컴포넌트에서 사용

```jsx
// src/app/page.js
"use client";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUiStore";
import { useUserStore } from "@/store/useUserStore";

export default function Home() {
  const { isModalOpen, openModal, closeModal } = useUIStore();
  const { user, login, logout } = useUserStore();
  const { items, addItem } = useCartStore();

  return (
    <>
      {/* 사용자 섹션 */}
      <section>
        <h2>User: {user ? user.name : "로그인 전"}</h2>
        <button onClick={() => login({ name: "yyubin" })}>로그인</button>
        <button onClick={logout}>로그아웃</button>
      </section>

      {/* 장바구니 섹션 */}
      <section>
        <h2>장바구니: {items.length}개</h2>
        <button onClick={() => addItem({ id: Date.now(), name: "아이템" })}>
          상품 추가
        </button>
      </section>

      {/* 모달 섹션 */}
      <section>
        <button onClick={openModal}>공지 보기</button>
        {isModalOpen && (
          <div style={{ backgroundColor: "yellow", padding: "20px" }}>
            <p>공지사항 모달입니다!</p>
            <button onClick={closeModal}>닫기</button>
          </div>
        )}
      </section>
    </>
  );
}
```

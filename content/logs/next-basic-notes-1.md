## 1. Custom Hook (커스텀 훅)

### 개념

- 반복적으로 사용하는 상태 로직을 별도의 함수로 추출하는 패턴
- 이름이 반드시 `use`로 시작해야 함 (React 규칙)
- 내부적으로 `useState`, `useEffect` 등 기존 Hook을 조합해서 만듦

### useFetch 커스텀 훅

API 통신 로직(로딩, 에러, 데이터)을 재사용 가능하게 추출한 훅

```js
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("네트워크 응답 문제가 있습니다.");
        return response.json();
      })
      .then((responseData) => setData(responseData))
      .catch((e) => {
        if (e.name === "AbortError") {
          console.log("통신이 정상적으로 중단되었습니다.");
        } else {
          setError(e);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort(); // 클린업: 컴포넌트 언마운트 시 요청 취소
  }, [url]);

  return { data, loading, error };
}
```

### 핵심 포인트

| 항목                 | 설명                                                            |
| -------------------- | --------------------------------------------------------------- |
| `AbortController`    | fetch 요청을 중단시키는 Web API                                 |
| `controller.signal`  | fetch에 전달해서 취소 신호를 연결                               |
| `controller.abort()` | 클린업 함수에서 호출 → 컴포넌트 언마운트 시 진행 중인 요청 취소 |
| Early Return 패턴    | 에러/로딩 상태를 먼저 처리해 메인 렌더링 로직을 깔끔하게 유지   |

### 사용 예시

```jsx
function ItemList() {
  const {
    data: users,
    loading,
    error,
  } = useFetch("https://jsonplaceholder.typicode.com/users");

  if (error) return <p>오류가 발생했습니다: {error.message}</p>;

  return (
    <div>
      {loading && <p>로딩 중...</p>}
      {!loading && users.map((user) => <Item key={user.id} user={user} />)}
    </div>
  );
}
```

### 옵셔널 체이닝 (`?.`)

```jsx
<p>company: {user.company?.name}</p>
```

- `user.company`가 `null`이나 `undefined`여도 에러 없이 `undefined` 반환

---

## 2. Next.js 소개

> 파일: `Next.md`, `05_router/`

### Next.js 주요 특징

1. **서버 사이드 렌더링 (SSR)** — 서버에서 HTML을 완성해서 전송
2. **파일 기반 라우팅** — `app/` 폴더 구조가 곧 URL 구조
3. **정적 사이트 생성 (SSG) & 하이브리드 렌더링** — 페이지별로 렌더링 방식 선택 가능
4. **풀스택 개발 환경** — API Route로 백엔드 코드도 같은 프로젝트에서 작성

### 프로젝트 생성

```bash
npx create-next-app@latest
```

### 디렉토리 구조

```plain
src/
└── app/
    ├── layout.js      ← 공통 레이아웃 (루트)
    ├── page.js        ← / 경로
    ├── about/
    │   └── page.js    ← /about 경로
    ├── menu/
    │   └── page.js    ← /menu 경로
    └── dashboard/
        ├── layout.js  ← 대시보드 전용 레이아웃 (중첩)
        └── page.js    ← /dashboard 경로
```

### 클라이언트 Hook 사용 조건

Next.js에서 아래 Hook들은 **클라이언트 컴포넌트(`"use client"`)에서만** 사용 가능

| Hook                | 역할                            |
| ------------------- | ------------------------------- |
| `usePathname()`     | 현재 URL 경로를 문자열로 반환   |
| `useParams()`       | 동적 라우트의 파라미터 값 반환  |
| `useSearchParams()` | 쿼리스트링 파라미터 값 반환     |
| `useRouter()`       | 프로그래밍 방식으로 페이지 이동 |

---

## 3. Next.js 파일 기반 라우팅

> 파일: `05_router/01_next-app/`

### Link 컴포넌트

```jsx
import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>메인 페이지 입니다!</h1>
      <nav>
        <Link href="/">HOME</Link>
        <Link href="/about">소개</Link>
        <Link href="/menu">메뉴</Link>
      </nav>
    </>
  );
}
```

- `<a>` 태그 대신 `<Link>`를 사용 → 클라이언트 사이드 이동(페이지 새로고침 없음)

### RootLayout

```jsx
// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- 모든 페이지를 감싸는 최상위 레이아웃
- `children`에 각 `page.js` 내용이 들어감
- `metadata` 객체로 `<title>`, `<meta>` 태그 설정 가능

---

## 4. 레이아웃 & 공통 컴포넌트

> 파일: `05_router/02_next-app/`

### 공통 컴포넌트 분리

```plain
src/
├── app/
│   └── layout.js       ← <Layout> 삽입
└── component/
    ├── Layout.jsx       ← Header + Navbar 조합
    ├── Header.jsx       ← 공통 헤더
    └── Navbar.jsx       ← 공통 내비게이션
```

```jsx
// component/Layout.jsx
import Header from "./Header";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <>
      <Header />
      <Navbar />
    </>
  );
}
```

### usePathname으로 활성 메뉴 표시

```jsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname(); // 현재 경로: "/", "/about", ...
  const isActive = (path) => pathname === path;

  const activeStyle = { backgroundColor: "yellow", color: "red" };

  return (
    <ul>
      <li>
        <Link style={isActive("/") ? activeStyle : undefined} href="/">
          메인
        </Link>
      </li>
      <li>
        <Link
          style={isActive("/about") ? activeStyle : undefined}
          href="/about">
          소개
        </Link>
      </li>
      <li>
        <Link style={isActive("/menu") ? activeStyle : undefined} href="/menu">
          메뉴
        </Link>
      </li>
    </ul>
  );
}
```

- `usePathname()`은 클라이언트 훅이므로 맨 위에 `"use client"` 선언 필수

### 중첩 레이아웃 (Nested Layout)

```jsx
// app/dashboard/layout.js
export default function DashboardLayout({ children }) {
  return (
    <>
      <h3>대시보드 메뉴</h3>
      <ul>
        <li>통계</li>
        <li>사용자</li>
        <li>설정</li>
      </ul>
      {children}
    </>
  );
}
```

- `app/dashboard/` 폴더 안에 `layout.js`를 두면 해당 경로 하위에서만 적용되는 레이아웃 추가
- 루트 레이아웃 → 대시보드 레이아웃 → 페이지 순으로 중첩

---

## 5. 동적 라우팅 & URL 파라미터

> 파일: `05_router/03_next-params/`

### 동적 라우트 세그먼트

폴더명에 `[변수명]`을 사용하면 동적 URL 세그먼트가 됨

```plain
app/
└── menu/
    ├── page.js              ← /menu
    ├── search/
    │   └── page.js          ← /menu/search
    └── [menuCode]/
        └── page.js          ← /menu/1, /menu/2, ...
```

### useParams — 경로 파라미터 읽기

```jsx
// app/menu/[menuCode]/page.js
"use client";
import { useParams } from "next/navigation";
import { getMenuByMenuCode } from "@/lib/MenuAPI";

export default function MenuDetail() {
  const { menuCode } = useParams(); // URL의 [menuCode] 값
  const [menu, setMenu] = useState();

  useEffect(() => {
    setMenu(getMenuByMenuCode(menuCode));
  }, []);

  return (
    <div>
      <h1>상세페이지</h1>
      <h3>{menu?.menuName}</h3>
      <p>종류: {menu?.categoryName}</p>
      <p>가격: {menu?.menuPrice}</p>
      <img src={menu?.detail.image} alt="" style={{ maxWidth: 500 }} />
    </div>
  );
}
```

### useSearchParams — 쿼리스트링 읽기

URL: `/menu/search?menuName=아메리카노`

```jsx
// app/menu/search/page.js
"use client";
import { useSearchParams } from "next/navigation";

export default function MenuSearch() {
  const searchParams = useSearchParams();
  const menuName = searchParams.get("menuName"); // "아메리카노"

  // ...
}
```

### useRouter — 프로그래밍 방식으로 페이지 이동

```jsx
"use client";
import { useRouter } from "next/navigation";

export default function Menu() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const onClickHandler = () => {
    router.push(`/menu/search?menuName=${searchValue}`);
  };

  return (
    <>
      <input
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      <button onClick={onClickHandler}>검색</button>
    </>
  );
}
```

| 메서드                | 설명                                     |
| --------------------- | ---------------------------------------- |
| `router.push(url)`    | 히스토리에 추가하며 이동 (뒤로가기 가능) |
| `router.replace(url)` | 히스토리 교체하며 이동 (뒤로가기 불가)   |
| `router.back()`       | 뒤로 이동                                |

### 데이터 유틸 함수 분리 (`lib/`)

```js
// lib/MenuAPI.js
import menus from "../data/menu-detail.json";

export const getMenuList = () => menus;

export const getMenuByMenuCode = (menuCode) =>
  menus.find((menu) => menu.menuCode === parseInt(menuCode));

export const searchMenu = (menuName) =>
  menus.filter((menu) => menu.menuName.match(menuName));
// match(): 문자열이 포함되면 객체 반환, 없으면 null
```

### MenuItem 링크 컴포넌트

```jsx
// item/MenuItem.jsx
import Link from "next/link";

export default function MenuItem({ menu }) {
  return (
    <Link href={`/menu/${menu.menuCode}`}>
      <div>
        <h3>메뉴 이름: {menu.menuName}</h3>
      </div>
    </Link>
  );
}
```

---

## 정리 — Next.js App Router 핵심 규칙

| 규칙                 | 내용                                     |
| -------------------- | ---------------------------------------- |
| `app/폴더/page.js`   | 해당 URL의 페이지 컴포넌트               |
| `app/폴더/layout.js` | 해당 URL 하위 공통 레이아웃              |
| `app/[변수]/page.js` | 동적 라우트 세그먼트                     |
| `"use client"`       | 클라이언트 Hook/이벤트 사용 시 필수 선언 |
| `Link`               | 클라이언트 사이드 페이지 이동            |
| `@/`                 | `src/` 디렉토리 기준 절대 경로 alias     |

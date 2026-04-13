## 1. 클래스 (Class)

### 개념

ES6에서 도입된 **객체를 만들기 위한 설계도 양식**이다.  
기존의 생성자 함수와 기능은 동일하지만, 더 명확하고 체계적인 문법을 제공한다.

### 기본 구조

```js
class Student {
    // constructor: new 키워드로 객체를 만들 때 딱 한 번 실행되는 함수
    constructor(name, group) {
        this.name = name;
        this.group = group;
    }

    // 메서드: Student.prototype에 저장됨 (객체마다 복사 X)
    introduce() {
        console.log(`안녕하세요! ${this.group}반 ${this.name} 입니다.`);
    }
}

const stuA = new Student('상어', 'A');
const stuB = new Student('호랑이', 'B');

stuA.introduce(); // 안녕하세요! A반 상어 입니다.
stuB.introduce(); // 안녕하세요! B반 호랑이 입니다.
```

### 핵심 포인트: 메서드는 공유

```js
console.log(stuA.introduce === stuB.introduce); // true
```

- 생성자 함수 방식에서는 객체를 만들 때마다 메서드도 새로 생성됐다.
- 클래스 메서드는 `Student.prototype`에 한 번만 저장되고, 모든 인스턴스가 **공유**한다.
- 메모리 절약 + 성능 효율이 목적이다.

### 주의사항

```js
// new 키워드 없이 호출하면 에러 발생
const stuC = Student('치타', 'C');
// TypeError: Class constructor Student cannot be invoked without 'new'
```

---

## 2. 화살표 함수 (Arrow Function)

### 개념

ES6에서 도입된 **함수를 간결하게 표현하는 문법**이다.  
단순히 짧아진 것이 아니라, **`this`를 다루는 방식이 근본적으로 다르다.**

### 기본 변환 규칙

```js
// 기존 함수
const message = function() { return 'hello'; };

// 화살표 함수
const arrowMsg = () => { return 'hello'; };

// 본문이 return 한 줄이면, 중괄호 {} 와 return 동시 생략 가능
const arrowMsg2 = () => 'hello simple arrow!';
```

### 매개변수 규칙

```js
// 매개변수가 하나일 때: 소괄호 생략 가능
const arrowPower = x => x * x;

// 매개변수가 없거나 두 개 이상: 소괄호 필수
const greet = () => 'hello!';
const sum = (a, b) => a + b;
```

### 주의: 객체 리터럴 반환

```js
// 잘못된 예 (중괄호를 함수 몸체로 오해함)
const createUser = (id, name) => { id, name };

// 올바른 예: 소괄호로 감싸야 한다
const createUser = (id, name) => ({ id, name });
```

### 고차 함수와 함께 사용

```js
const numbers = [1, 2, 3, 4, 5];

// 기존 방식
const mapped1 = numbers.map(function(val) { return val * 10; });

// 화살표 함수
const mapped2 = numbers.map(e => e * 10);

console.log(mapped2); // [10, 20, 30, 40, 50]
```

### 핵심 포인트: `this` 바인딩 차이

| 구분 | 일반 함수 | 화살표 함수 |
|---|---|---|
| `this` 결정 시점 | 호출할 때 결정 (누가 부르냐에 따라 바뀜) | 선언할 때 결정 (바깥 스코프의 `this`를 그대로 사용) |
| 자신만의 `this` | O | X |

#### 콜백 함수 안에서의 `this`

```js
const theater = {
    store: '가락시장점',
    titles: ['실목지', '패왕별희', '왕과 사는 남자'],

    showMovieList() {
        // 화살표 함수: 바깥 this(theater)를 물려받음
        this.titles.forEach(title => {
            console.log(`${this.store}: ${title}`); // 정상 출력
        });

        // 일반 함수: this가 window/global을 가리킴
        // this.titles.forEach(function(title) {
        //     console.log(`${this.store}: ${title}`); // undefined
        // });
    }
}
```

#### 객체 메서드로는 일반 함수를 써야 한다

```js
const obj = {
    name: 'kwon',
    // 화살표 함수: this가 전역(window/global)을 가리킴
    sayHi: () => {
        console.log(this.name); // undefined
    }
};

// 객체 메서드는 일반 함수(또는 메서드 축약형)로 작성할 것
const obj2 = {
    name: 'kwon',
    sayHi() {
        console.log(this.name); // 'kwon'
    }
};
```

> **정리**: 화살표 함수는 콜백에서, 일반 함수는 객체 메서드에서 쓴다.

---

## 3. 이터러블 (Iterable)

### 개념

**'순회 가능한' 데이터 컬렉션을 위한 통일된 규약(프로토콜)**이다.  
`for...of` 반복문을 사용할 수 있으면 이터러블이다.

- 이터러블 예시: 배열, 문자열, Map, Set

### `for...of` 사용

```js
const array = ['사과', '바나나', '딸기'];
for (const item of array) {
    console.log(item);
}

const string = '안녕하세요';
for (const char of string) {
    console.log(char); // 한 글자씩 순회
}
```

### 이터러블 vs 유사 배열

| 구분 | 이터러블 | 유사 배열 |
|---|---|---|
| 정의 | `for...of` 사용 가능한 객체 | 인덱스와 `length`가 있는 객체 |
| `for...of` | ✅ 가능 | ❌ 불가능 |
| 예시 | 배열, 문자열, NodeList | `arguments`, DOM HTMLCollection |

```js
const arrayLike = {
    0: '배열인듯',
    1: '배열아닌',
    2: '유사 배열 객체',
    length: 3
};

// for (const item of arrayLike) { } // ❌ TypeError: not iterable
```

### `Array.from()`으로 진짜 배열로 변환

```js
const realArray = Array.from(arrayLike);
console.log(realArray); 

// 변환과 동시에 map처럼 활용: 1~5 배열 만들기
const fiveArray = Array.from({ length: 5 }, (v, i) => i + 1);
console.log(fiveArray); // [1, 2, 3, 4, 5]

// 같은 결과를 map으로도 만들 수 있다
const fiveArray2 = [0, 0, 0, 0, 0].map((_, i) => i + 1);
```

---

## 4. Rest 파라미터 & Spread 문법

### 개념

둘 다 점 세 개(`...`)를 사용하지만, **위치에 따라 반대 역할**을 한다.

| 문법 | 위치 | 역할 |
|---|---|---|
| **Rest 파라미터** | 함수 매개변수 | 여러 값 → 배열로 **모으기** |
| **Spread 문법** | 함수 인수, 배열/객체 리터럴 | 배열/객체 → 개별 값으로 **펼치기** |

### Rest 파라미터

```js
// 반드시 매개변수 목록의 마지막에 위치해야 한다
function merge(first, ...args) {
    console.log(`첫 번째: ${first}`);
    console.log(`나머지(배열): ${args}`);
}

merge(1, 2, 3, 4, 5);
// 첫 번째: 1
// 나머지(배열): [2, 3, 4, 5]
```

### Spread 문법

#### 함수 인수로 사용

```js
const numbers = [10, 20, 30];

// Math.max는 낱개의 숫자를 인수로 받는다
console.log(Math.max(numbers));    // NaN (배열 자체를 전달)
console.log(Math.max(...numbers)); // 30 (펼쳐서 전달)
```

#### 배열 합치기 / 복사

```js
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

// 합치기
const merged = [...arr1, ...arr2, 7, 8];
console.log(merged); // [1, 2, 3, 4, 5, 6, 7, 8]

// 얕은 복사
const arr1Copy = [...arr1];
console.log(arr1 === arr1Copy); // false (새로운 배열)
```

#### 객체 합치기 / 복사

```js
const obj1 = { name: '판다', age: 5 };
const obj2 = { job: '강사' };

const mergedObj = { ...obj1, ...obj2, location: '서울' };
console.log(mergedObj); // { name: '판다', age: 5, job: '강사', location: '서울' }

// 복사 후 수정해도 원본에 영향 없음 (원시값 프로퍼티의 경우)
const objCopy = { ...obj1 };
objCopy.age = 3;
console.log(obj1.age); // 5 (변경 없음)
```

> **주의**: Spread는 **얕은 복사**다. 프로퍼티 값이 객체라면, 그 객체의 참조(주소)가 복사된다.

---

## 5. 구조 분해 할당 (Destructuring)

### 개념

배열이나 객체의 값을 **개별 변수에 간결하게 꺼내는 문법**이다.

### 배열 구조 분해 — 순서가 기준

```js
const nameArr = ['Panda', 'Kwon'];

// 기존 방식
const firstName = nameArr[0];
const lastName  = nameArr[1];

// 구조 분해 할당
const [firstName, lastName] = nameArr;
console.log(`성: ${lastName}, 이름: ${firstName}`);
```

#### 요소 건너뛰기

```js
const [name1, ] = nameArr;       // 첫 번째만
const [, name2] = ['Kwon', 'Panda']; // 두 번째만
```

#### Rest로 나머지 모으기

```js
const [leader, ...members] = ['팀장', '팀원1', '팀원2', '팀원3'];
console.log(leader);  // '팀장'
console.log(members); // ['팀원1', '팀원2', '팀원3']
```

#### 기본값 설정

```js
const [user1, user2 = '기본값'] = ['사용자1'];
console.log(user2); // '기본값' (할당할 값이 없을 때 사용)
```

### 객체 구조 분해 — 키 이름이 기준

```js
const student = {
    name_: '판다',
    age_: 5,
    major_: '영화감상'
};

// 키 이름으로 자동 매칭 (순서 무관)
const { name_, age_ } = student;

// 콜론(:)으로 새로운 변수명 지정
const { name_: studentName, age_ } = student;
console.log(studentName); // '판다'

// 기본값 설정
const { name_: sName = '이름', job = '학생' } = student;
console.log(job); // '학생' (student에 job 없으므로 기본값)

// Rest로 나머지 모으기
const { age_: studentAge, ...restInfo } = student;
console.log(restInfo); // { name_: '판다', major_: '영화감상' }
```

### 함수 매개변수 구조 분해 — 실전에서 사용 잦음

```js
const product = {
    id: 'p-001',
    name: '노트북',
    price: 1500000,
    spec: { cpu: 'i7', ram: '16GB' }
};

// 매개변수에서 바로 구조 분해 + 중첩 객체 + 기본값
function printProductInfo({ id, price, spec: { cpu, ram }, producer = '삼성' }) {
    console.log(`상품 아이디: ${id}`);
    console.log(`상품 가격: ${price}`);
    console.log(`cpu: ${cpu}`);
    console.log(`ram: ${ram}`);
    console.log(`제조사: ${producer}`);
}

printProductInfo(product);
```

> 매개변수 순서를 신경 쓸 필요가 없고, 어떤 값을 쓰는지 명시적으로 드러나 **가독성이 크게 높아진다.**

---

## 6. DOM 요소 선택

### `querySelector` / `querySelectorAll`

CSS 선택자를 그대로 사용하는, **가장 일관성 있는 방법**이다.

```html
<ul>
    <li id="apple" class="fruit red">사과</li>
    <li class="fruit">바나나</li>
    <li>딸기</li>
</ul>
```

```js
// querySelector: 조건에 맞는 첫 번째 요소 하나만 반환
const $apple = document.querySelector('#apple');
$apple.style.fontWeight = 'bold';

const $fruitFirst = document.querySelector('.fruit');
$fruitFirst.style.color = 'red';

// querySelectorAll: 조건에 맞는 모든 요소를 NodeList로 반환
const $fruits = document.querySelectorAll('.fruit');
console.log($fruits); // NodeList(2) [li.fruit.red, li.fruit]

// NodeList는 유사 배열 -> forEach 사용 가능
$fruits.forEach((item) => {
    item.style.backgroundColor = 'aqua';
});
```

### NodeList는 이터러블이다

- `forEach` 사용 가능
- `for...of` 사용 가능
- 단, 배열 메서드(`map`, `filter` 등)는 직접 사용 불가 → `Array.from()`으로 변환 필요

---

## 7. 실습 문제 풀이

### 문제 1: Rest & Spread 활용

```js
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

// Rest 파라미터로 가변 인수 합계
const sumAll = (...args) => args.reduce((a, c) => a + c, 0);

// Spread로 배열 합치기
const mergeArrays = (a, b) => [...a, ...b];

console.log(`합계: ${sumAll(...arr1, ...arr2)}`); // 합계: 21
console.log(`병합된 배열:`, mergeArrays(arr1, arr2)); // [1, 2, 3, 4, 5, 6]
```

### 문제 2: 구조 분해 할당 활용

```js
const user = { name: '홍길동', age: 30, location: '송파' };

// 매개변수 구조 분해
const distribute = ({ name, age }) => {
    console.log(`${name}은 ${age}살 입니다.`);
};
distribute(user); // 홍길동은 30살 입니다.

// 배열 구조 분해 + Rest
const [first, ...rest] = [1, 2, 3, 4, 5];
console.log(`첫 번째 요소: ${first}`); // 1
console.log(`나머지 요소:`, rest);     // [2, 3, 4, 5]
```

### 문제 3: 클래스 + 구조 분해 할당

```js
class Student {
    constructor(name, age, score) {
        this.name = name;
        this.age = age;
        this.score = score;
    }
}

const students = [
    new Student('유관순', 3, '90'),
    new Student('홍길동', 3, '80'),
    new Student('장보고', 3, '70'),
];

let stNames = [];
let stScores = [];

// map + 구조 분해 할당으로 데이터 추출
students.map(({ name, score }) => {
    stNames.push(name);
    stScores.push(score);
});

console.log(`학생 이름:`, stNames);  // ['유관순', '홍길동', '장보고']
console.log(`학생 점수:`, stScores); // ['90', '80', '70']
```

---

## 핵심 요약

| 문법 | 핵심 한 줄 |
|---|---|
| **클래스** | 객체 설계도. 메서드는 prototype에 공유되어 메모리 효율적 |
| **화살표 함수** | 콜백에서 사용. 객체 메서드로 쓰면 `this`가 전역을 가리킴 |
| **이터러블** | `for...of`를 쓸 수 있으면 이터러블. 유사 배열과 구분 |
| **Rest / Spread** | `...`이 매개변수면 Rest(모으기), 인수/리터럴이면 Spread(펼치기) |
| **구조 분해 할당** | 배열은 순서, 객체는 키 이름이 기준. 함수 매개변수에서 쓰면 가독성 좋음 |
| **DOM 선택** | `querySelector` / `querySelectorAll` |
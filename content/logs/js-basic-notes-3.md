## 1. 생성자 함수

같은 구조의 객체를 여러 개 만들어야 할 때, 객체 리터럴을 반복 작성하면 코드가 중복된다. 생성자 함수는 이 문제를 해결하기 위한 패턴이다.

```js
// 객체 리터럴 반복 — 비효율적
const student1 = { name: '판다', age: 5, genInfo: function() { ... } };
const student2 = { name: '코알라', age: 3, genInfo: function() { ... } };
```

### 규칙

1. 함수 이름의 첫 글자는 대문자로 짓는다. (관례, 일반 함수와 구분)
2. `this` 키워드는 "앞으로 생성될 객체"를 가리킨다.
3. `new` 키워드와 함께 호출해야 인스턴스가 생성된다.

```js
function Student(name, age) {
    this.name = name;
    this.age = age;
    this.getInfo = function() {
        return `${this.name}은 ${this.age}세 입니다.`;
    };
}

const student3 = new Student('상어', 7);
const student4 = new Student('호랑이', 10);

console.log(student3);
console.log(student4.getInfo());
```

---

## 2. 인스턴스 생성 과정

`new`로 생성자 함수를 호출했을 때 엔진 내부에서 다음 세 단계가 자동으로 실행된다.

1. 빈 객체 `{}`가 암묵적으로 생성되고 `this`에 할당된다. (`const this = {};`가 맨 위에 있는 것처럼 동작)
2. `this`에 속성과 메서드를 추가하며 초기화한다.
3. 완성된 `this`가 암묵적으로 반환된다. (`return this;`가 맨 마지막에 있는 것처럼 동작)

> `new` 없이 호출하면 일반 함수로 동작한다. 이 경우 함수 내부의 `this`는 전역 객체(`window` / Node.js에서는 `global`)를 가리키게 되어, 전역 공간에 의도치 않은 변수가 생긴다.

### new.target으로 안전장치 만들기

`new.target`은 함수가 `new`와 함께 호출됐을 때는 함수 자신을, 그냥 호출됐을 때는 `undefined`를 반환한다.

```js
function Dog(name, age) {
    if (!new.target) {
        console.log('new 없이 호출했네요! new를 붙여서 다시 실행합니다.');
        return new Dog(name, age);
    }
    this.name = name;
    this.age = age;
}

const dog = Dog('aa', 3);    // new 없이 호출해도 안전하게 동작
const dog2 = new Dog('gg', 3);
```

---

## 3. 프로토타입 기초

자바스크립트는 클래스 기반이 아닌 프로토타입 기반 상속 언어다. 모든 객체는 `[[Prototype]]`이라는 내부 연결고리를 가지며, 이 연결고리가 가리키는 객체를 프로토타입이라고 한다.

### 프로토타입 설정

```js
const user = {
    id: 'user',
    activate: true,
    login: function() {
        console.log(`${this.id} 로그인 되었습니다.`);
    }
};

const student = { passion: true };

// student가 user를 프로토타입으로 상속받도록 설정
Object.setPrototypeOf(student, user);

console.log(student.activate); // true (프로토타입 체인으로 접근)
student.login();               // 'user 로그인 되었습니다.'
```

### 중요 원칙

> 읽기는 프로토타입 체인을 타고 올라가지만, 쓰기(속성 할당)는 프로토타입에 영향을 주지 않는다. 자기 자신에게 새 프로퍼티를 만들 뿐이다.

```js
student.id = '상어';
student.login(); // '상어 로그인 되었습니다.'
// this는 login을 호출한 주체(student)를 가리킨다.
```

---

## 4. 생성자 함수와 프로토타입

모든 생성자 함수는 `prototype` 프로퍼티를 가진다. `new`로 객체를 만들 때, 해당 객체의 `[[Prototype]]`이 생성자 함수의 `prototype`으로 자동 연결된다.

```js
function Student(name) {
    this.name = name;
}

Student.prototype = user; // 새로 만들어질 객체들이 바라볼 프로토타입 지정

const st1 = new Student('상어');
// st1.__proto__ === user

console.log(st1.activate); // true (user에서 상속)
```

> `Student.prototype`을 변경하더라도, 이미 생성된 인스턴스의 `[[Prototype]]`은 바뀌지 않는다. 새로 생성되는 인스턴스에만 적용된다.

---

## 5. 배열

배열은 여러 값을 순차적으로 나열한 자료구조다. 각 요소는 0부터 시작하는 인덱스를 가진다. `typeof`로 확인하면 `"object"`가 반환된다.

```js
const fruits = ['바나나', '사과', '복숭아'];

console.log(fruits[0]);      // '바나나'
console.log(fruits.length);  // 3
console.log(typeof fruits);  // 'object'

for (let i = 0; i < fruits.length; i++) {
    console.log(fruits[i]);
}
```

---

## 6. 배열 메서드 — 기초

| 메서드 | 동작 | 원본 변경 |
|---|---|:---:|
| `push(값)` | 맨 뒤에 요소 추가 | O |
| `pop()` | 맨 뒤 요소 제거 및 반환 | O |
| `unshift(값)` | 맨 앞에 요소 추가 | O |
| `shift()` | 맨 앞 요소 제거 및 반환 | O |
| `indexOf(값)` | 첫 번째 일치 인덱스 반환, 없으면 -1 | X |
| `includes(값)` | 포함 여부를 true/false로 반환 | X |
| `slice(start, end)` | start부터 end 전까지 복사해서 새 배열 반환 | X |
| `splice(index, 제거수, ...추가값)` | index 위치에서 요소 제거 및 삽입 | O |
| `join(구분자)` | 요소를 구분자로 이어 문자열 반환 | X |
| `reverse()` | 요소 순서를 뒤집음 | O |

### slice vs splice

```js
const front = ['HTML', 'CSS', 'JavaScript', 'React'];

// slice — 원본 유지
console.log(front.slice(1, 3)); // ['CSS', 'JavaScript']
console.log(front);             // 원본 그대로

// splice — 원본 변경
front.splice(2, 2, 'Redux');    // 인덱스 2부터 2개 제거, 'Redux' 삽입
console.log(front);             // ['HTML', 'CSS', 'Redux']
```

---

## 7. 정렬 (sort)

`sort()`는 원본 배열을 직접 변경한다. 인자 없이 호출하면 요소를 문자열로 변환하여 유니코드 순서로 정렬하기 때문에 숫자 배열에서 예상치 못한 결과가 나온다.

```js
const numbers = [3, 1, 10, 4, 15, 5];

numbers.sort();
console.log(numbers); // [1, 10, 15, 3, 4, 5] — 문자열 기준 정렬

// 비교 함수(compare function) 전달
numbers.sort((a, b) => a - b); // 오름차순
numbers.sort((a, b) => b - a); // 내림차순
```

> 비교 함수가 음수를 반환하면 a가 앞에, 양수를 반환하면 b가 앞에 온다. 0이면 순서를 바꾸지 않는다.

---

## 8. forEach

배열의 각 요소에 대해 콜백 함수를 실행한다. 반환 값은 없다(`undefined`). 단순 순회가 목적일 때 사용한다.

```js
const names = ['판다', '코알라', '상어', '원숭이'];

names.forEach(name => console.log(name));

// 내부 동작 원리 (개념적)
for (let i = 0; i < names.length; i++) {
    const name = names[i];
    console.log(name); // 콜백이 이 위치에서 실행됨
}
```

---

## 9. map / filter

### map

배열의 모든 요소에 콜백을 적용하고, 그 결과로 새로운 배열을 만든다. 원본은 변경되지 않는다.

```js
const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(e => e * e);
console.log(squared); // [1, 4, 9, 16, 25]

const student = [
    { name: '판다', score: 90 },
    { name: '코알라', score: 80 }
];
const names = student.map(e => e.name);
console.log(names); // ['판다', '코알라']
```

### filter

콜백의 반환값이 `true`인 요소만 골라 새로운 배열을 만든다.

```js
const numbers2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const even = numbers2.filter(e => e % 2 === 0);
console.log(even); // [2, 4, 6, 8, 10]

// 체이닝: filter 후 map 연결
const highScorers = student
    .filter(st => st.score >= 85)
    .map(st => st.name);
console.log(highScorers); // ['판다']
```

---

## 10. reduce / find / some / every

| 메서드 | 설명 | 반환값 |
|---|---|---|
| `reduce(콜백, 초기값)` | 모든 요소를 순회하며 하나의 값으로 누적 | 누적 결과값 |
| `find(콜백)` | 조건을 만족하는 첫 번째 요소를 반환 | 요소 또는 undefined |
| `some(콜백)` | 조건을 만족하는 요소가 하나라도 있으면 true | boolean |
| `every(콜백)` | 모든 요소가 조건을 만족하면 true | boolean |

```js
const numbers = [1, 2, 3, 4, 5];

// reduce: 누적값(accumulator)에 현재값(current)을 더함. 초기값 0.
const sum = numbers.reduce((acc, cur) => acc + cur, 0);
console.log(sum); // 15

// find: 3보다 큰 첫 번째 숫자
const found = numbers.find(e => e > 3);
console.log(found); // 4

// some: 짝수가 하나라도 있는지
const hasEven = numbers.some(e => e % 2 === 0);
console.log(hasEven); // true

// every: 모든 요소가 0보다 큰지
const allPositive = numbers.every(e => e > 0);
console.log(allPositive); // true
```

---

## 11. 표준 내장 객체

자바스크립트가 기본적으로 제공하는 유용한 객체들이다.

### String

| 메서드 | 설명 |
|---|---|
| `indexOf(값)` | 문자열에서 처음 등장하는 인덱스 반환 |
| `includes(값)` | 포함 여부를 boolean으로 반환 |
| `slice(start, end)` | 부분 문자열 추출 |
| `split(구분자)` | 구분자 기준으로 쪼개어 배열 반환 |
| `trim()` | 앞뒤 공백 제거 |

```js
const fileName = 'my-profile.jpg';
console.log(fileName.slice(11));                        // 'jpg'
console.log(fileName.slice(0, 10));                     // 'my-profile'

const ext = fileName.slice(fileName.indexOf('.') + 1);
console.log(ext); // 'jpg'

const tags = '#자바스크립트#개발자#꿀팁';
console.log(tags.split('#')); // ['', '자바스크립트', '개발자', '꿀팁']

const userId = '      user123         ';
console.log(userId.trim()); // 'user123'
```

### Math

| 메서드 | 설명 |
|---|---|
| `Math.random()` | 0 이상 1 미만의 무작위 소수 반환 |
| `Math.floor(n)` | 소수점 아래를 버림 |
| `Math.ceil(n)` | 소수점 아래를 올림 |
| `Math.round(n)` | 반올림 |

```js
// 1부터 50까지 정수 무작위 생성 (관용 공식)
const rand = Math.floor(Math.random() * 50) + 1;

console.log(Math.round(3.24)); // 3
console.log(Math.floor(3.99)); // 3
console.log(Math.ceil(3.01));  // 4
```

### Date

날짜와 시간을 다루는 내장 객체다. `new Date()`로 현재 시각의 인스턴스를 생성한다.

```js
const now = new Date();

console.log(now.toLocaleString('ko-KR')); // '2025. 4. 10. 오전 10:00:00'

console.log(now.getFullYear()); // 연도
console.log(now.getMonth() + 1); // 월 (0부터 시작하므로 +1 필요)
console.log(now.getDate());     // 일
```

> `getMonth()`는 0부터 시작한다. 1월이 0, 12월이 11이다. 실제 월을 얻으려면 반드시 `+1`을 해야 한다.
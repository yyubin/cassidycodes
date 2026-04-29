## 01. 리터럴과 변수

### 1-1. 리터럴(Literal)

리터럴이란 **소스코드에 직접 표현된 고정 값** 자체를 말한다.

| 종류 | 표현 방식 | 예시 |
|------|----------|------|
| 정수 | 숫자 그대로 | `123` |
| 실수 | 소수점 포함 | `1.23` |
| 문자 | 홑따옴표(`'`) | `'a'` |
| 문자열 | 쌍따옴표(`"`) | `"안녕하세요"` |
| 논리값 | `true` / `false` | `true` |

```java
System.out.println(123);        // 정수
System.out.println(1.23);       // 실수
System.out.println('a');        // 문자 — 반드시 한 글자
System.out.println("안녕하세요"); // 문자열
System.out.println(true);       // 논리값
```

> **주의**
> - `'ab'` — 문자는 반드시 한 글자. 두 글자 이상이면 컴파일 에러
> - `''` — 빈 문자도 컴파일 에러. 빈 값은 `""` (문자열) 사용

---

### 1-2. 리터럴 연산

#### 숫자 연산

```java
System.out.println(123 + 456);   // 정수 + 정수 → 정수
System.out.println(1.12 + 1.23); // 실수 + 실수 → 실수
System.out.println(123 + 0.23);  // 정수 + 실수 → 항상 실수
```

#### 문자 연산

```java
System.out.println('a' + 'b');  // 내부적으로 아스키코드 숫자로 처리 → 195 출력
```

문자는 내부적으로 **유니코드(정수)** 로 취급되므로 산술 연산이 가능하다.

#### 문자열 연산

```java
System.out.println("hello" + "world");  // "helloworld" — 문자열 이어 붙이기
System.out.println("hello" + 123);      // "hello123"   — 다른 타입도 문자열로 합쳐짐
System.out.println("hello" + 'a');      // "helloa"
System.out.println(true + "a");         // "truea"
```

> **규칙**: 문자열과 `+` 연산 → **항상 문자열 연결**. `+` 외 다른 연산자(`-`, `*`, `/`)는 문자열에 사용 불가.

#### 논리값 연산

```java
// 논리값은 문자열과의 + 연산만 허용
System.out.println(true + "a");   // "truea"
// true + false, true + 1 등은 모두 컴파일 에러
```

---

### 1-3. 변수(Variable)

변수란 **값을 저장하기 위해 메모리에 확보한 공간**으로, 자료형과 이름을 지정하여 선언한다.

```
자료형 변수명;          // 선언
자료형 변수명 = 값;     // 선언 + 초기화
```

#### 기본 자료형 8가지

| 분류 | 자료형 | 크기 | 범위(참고) |
|------|--------|------|-----------|
| 정수 | `byte` | 1 byte | -128 ~ 127 |
| 정수 | `short` | 2 byte | -32,768 ~ 32,767 |
| 정수 | `int` | 4 byte | 약 ±21억 |
| 정수 | `long` | 8 byte | 매우 큰 수 |
| 실수 | `float` | 4 byte | 소수점 약 7자리 |
| 실수 | `double` | 8 byte | 소수점 약 15자리 |
| 문자 | `char` | 2 byte | 유니코드 문자 1개 |
| 논리 | `boolean` | 1 byte | `true` / `false` |

> `String`은 기본 자료형이 아닌 **참조 자료형(클래스)** 이다.

```java
byte   bnum;
short  snum;
int    inum;
long   lnum;
float  fnum;
double dnum;
char   ch;
boolean isTrue;
String  str;     // 참조 자료형

isTrue = true;           // 초기화 (선언 후 최초 값 대입)
int point = 100;         // 선언과 동시에 초기화
```

---

### 1-4. 변수 명명 규칙

#### 컴파일 에러가 발생하는 규칙 (반드시 준수)

```java
// 1. 동일 범위 내 동일 이름 금지
int age = 20;
// int age = 20;  // 에러

// 2. 예약어(키워드) 사용 금지
// int true = 1; // 에러
// int for = 20; // 에러

// 3. 대/소문자 구분 (다른 변수로 취급)
int Age  = 20;  // OK
int True = 10;  // OK

// 4. 숫자로 시작 불가
// int 1age = 20;  // 에러
int age1 = 20;   // OK

// 5. 특수기호는 '_' 와 '$' 만 허용
// int sh@ap = 10;  // 에러
int _age = 20;
int $anda = 20;
```

#### 암묵적 컨벤션 (개발자 약속)

```java
// 합성어: 첫 단어 소문자, 이후 단어 첫 글자 대문자 (camelCase)
int maxAge = 20;        // 권장
int max_age = 20;       // 비권장 (snake_case는 Java 스타일 아님)

// 의미 있는 이름 사용
String name;            // 권장
String s;               // 비권장

// boolean 은 긍정형 네이밍 권장
boolean isAlive = true; // 권장
boolean isDead = false; // 비권장
```

---

### 1-5. 상수(Constant)

상수는 **한 번 초기화하면 값을 변경할 수 없는** 저장 공간이다. `final` 키워드로 선언한다.

```java
final int AGE;
AGE = 20;    // 초기화 (한 번만 가능)
// AGE = 30; // 에러 — 재대입 불가
```

#### 상수 명명 컨벤션

```java
final int MAX_AGE = 50;   // 전부 대문자 + 단어 구분은 언더스코어(_)
```

---

### 1-6. 오버플로우(Overflow)

자료형의 저장 범위를 초과하면 **오버플로우**가 발생한다. 최댓값을 넘으면 최솟값으로, 최솟값을 넘으면 최댓값으로 순환된다.

```java
byte num1 = 127;
num1++;
System.out.println(num1);  // -128 (오버플로우)

byte num2 = -128;
num2--;
System.out.println(num2);  // 127 (언더플로우)
```

```java
int firstNum  = 1000000;  // 100만
int secondNum = 700000;   // 70만

int  multi  = firstNum * secondNum;   // 이미 int 범위 내에서 계산 → 오버플로우
long result = (long)firstNum * secondNum;  // 계산 전 형변환 → 정확한 값
```

---

### 1-7. 형변환(Type Casting)

#### 자동 형변환 (묵시적)

작은 자료형 → 큰 자료형으로는 **자동** 변환된다.

```plain
byte → short → int → long → float → double
```

```java
byte  bnum = 1;
short snum = bnum;  // 자동 형변환
int   inum = snum;
long  lnum = inum;

int   num1 = 10;
long  num2 = 10L;
long  result = num1 + num2;  // int → long 으로 자동 변환 후 계산
```

> `boolean`은 형변환 규칙에서 제외 — 어떤 타입으로도 변환 불가

#### 강제 형변환 (명시적)

큰 자료형 → 작은 자료형, 실수 → 정수는 **캐스트 연산자**를 사용해야 한다. **데이터 손실 가능성**에 주의.

```java
long lnum1  = 8L;
int  inum1  = (int)lnum1;   // 강제 형변환

float fnum  = 4.0123f;
long  lnum3 = (long)fnum;   // 소수점 이하 버림 → 4
```

---

## 02. 연산자

### 2-1. 산술 연산자

| 연산자 | 설명 |
|--------|------|
| `+` | 덧셈 |
| `-` | 뺄셈 |
| `*` | 곱셈 |
| `/` | 몫 |
| `%` | 나머지 |

- 연산 방향: **왼쪽 → 오른쪽**

#### 산술 복합 대입 연산자

```java
int num = 12;
num += 3;   // num = num + 3  → 15
num -= 3;   // num = num - 3
num *= 2;
num /= 2;
num %= 5;
```

#### 증감 연산자

```java
num++;  // 후위 증가: 다른 연산을 먼저 수행한 뒤 1 증가
++num;  // 전위 증가: 먼저 1 증가한 뒤 다른 연산 수행

int firstNum = 20;
int result = firstNum++ * 3;  // 20 * 3 = 60 먼저 계산, 이후 firstNum은 21
System.out.println(result);   // 60
System.out.println(firstNum); // 21
```

---

### 2-2. 비교 연산자

결과는 항상 `boolean`(`true` / `false`) 이다.

| 연산자 | 의미 |
|--------|------|
| `==` | 같음 |
| `!=` | 같지 않음 |
| `>` | 초과 |
| `<` | 미만 |
| `>=` | 이상 |
| `<=` | 이하 |

```java
int num1 = 10, num2 = 20;
System.out.println(num1 == num2);  // false
System.out.println(num1 != num2);  // true

char ch1 = 'a';  // 유니코드 97
char ch2 = 'A';  // 유니코드 65
System.out.println(ch1 >= ch2);    // true
```

#### 문자열 비교 주의사항

```java
String str1 = "java";
String str2 = "java";
System.out.println(str1 == str2);  // true — String Pool 재사용으로 같은 주소

String str3 = new String("java");
String str4 = new String("java");
System.out.println(str3 == str4);  // false — new는 항상 새 객체 생성 (다른 주소)

// 문자열 값 비교는 반드시 .equals() 사용
System.out.println(str1.equals(str4));  // true
System.out.println(str3.equals(str4));  // true
```

> `==` 는 **주소값** 비교, `.equals()` 는 **내용(값)** 비교

---

### 2-3. 논리 연산자

#### 논리 연결 연산자

| 연산자 | 이름 | 설명 |
|--------|------|------|
| `&&` | AND | 두 조건 **모두** 참이어야 참 |
| `\|\|` | OR | 두 조건 **중 하나라도** 참이면 참 |

```java
int a = 10, b = 20, c = 30, d = 40;

System.out.println(a < b && c > d);  // true && false → false
System.out.println(a < b || c > d);  // true || false → true

// 범위 확인 예시
int num = 29;
System.out.println(num >= 1 && num <= 100);  // true
```

#### 단축 평가 (Short-circuit Evaluation)

```java
// && : 앞이 false 이면 뒤는 평가하지 않음
// || : 앞이 true  이면 뒤는 평가하지 않음
int num3 = 10;
int result = (false && ++num3 > 0) ? num3 : num3;  // ++num3 실행 안 됨
```

#### 논리 부정 연산자

```java
boolean isOn = true;
System.out.println(!isOn);  // false
```

---

### 2-4. 삼항 연산자

```
(조건식) ? 참일 때 값 : 거짓일 때 값
```

```java
int num1 = 10;
int num2 = -20;

String result = (num1 > 0) ? "양수다." : "양수가 아니다.";
System.out.println(result);  // "양수다."
```

`if-else` 를 한 줄로 표현할 수 있다.

---

## 03. 메소드와 API

### 3-1. 메소드(Method)란?

메소드는 **특정 작업을 수행하는 명령문의 집합**이다. 코드 중복을 줄이고 재사용성을 높인다.

```plain
[접근제어자] [static] 반환타입 메소드명(매개변수) {
    // 실행 코드
    return 반환값;  // 반환타입이 void가 아닐 경우 필수
}
```

---

### 3-2. 메소드 호출 흐름

```java
public class Application {
    public static void main(String[] args) {
        Application app = new Application();
        app.methodA();  // methodA → methodB → methodC 순서로 호출
    }

    public void methodA() {
        methodB();
    }

    public void methodB() {
        methodC();
    }

    public void methodC() {
        System.out.println("methodC 실행");
    }
}
```

메소드는 **스택(Stack) 구조**로 호출된다 — 마지막에 호출된 메소드가 먼저 종료된다.

---

### 3-3. 매개변수(Parameter)와 전달인자(Argument)

- **전달인자(Argument)**: 메소드 호출 시 넘겨주는 값
- **매개변수(Parameter)**: 그 값을 받기 위해 메소드에 선언된 변수

```java
// 메소드 정의
public void printAge(int age) {           // age → 매개변수
    System.out.println("나이: " + age);
}

public void printUserInfo(String name, int age, char gender) {
    System.out.println("이름: " + name + ", 나이: " + age + "세, 성별: " + gender);
}

// 메소드 호출
app.printAge(30);                          // 30 → 전달인자
app.printAge(myAge);                       // 변수도 전달인자로 사용 가능
app.printUserInfo("판다", 5, '여');        // 타입, 개수, 순서를 정확히 맞춰야 함
```

---

### 3-4. 반환값(Return)

```java
public String createProfile(String name, int age) {
    String profile = name + "님의 나이는 " + age + "세 입니다.";
    return profile;  // String 타입 반환
}

// 호출 측
String message = app.createProfile("코알라", 3);
System.out.println(message);
```

- 반환타입이 `void` → `return` 생략 가능
- `void` 가 아닌 경우 → 반드시 해당 타입의 값을 `return` 해야 함

---

### 3-5. static 메소드

`static` 키워드가 붙으면 **클래스에 속한 메소드**가 되어 객체 생성 없이 호출할 수 있다.

```java
public class Application3 {
    public static void main(String[] args) {
        // 같은 클래스 내 static 메소드 호출 — 클래스명 생략 가능
        System.out.println(Application3.sumTwoNumbers(10, 20));
        System.out.println(sumTwoNumbers(20, 30));  // 클래스명 생략
    }

    public static int sumTwoNumbers(int a, int b) {
        return a + b;
    }
}
```

| 구분 | 호출 방법 |
|------|----------|
| non-static 메소드 | `객체참조변수.메소드명()` |
| static 메소드 | `클래스명.메소드명()` |

---

### 3-6. 다른 클래스의 메소드 호출

```java
// Calculator.java
public class Calculator {
    public int minNumberOf(int first, int second) {          // non-static
        return (first < second) ? first : second;
    }
    public static int maxNumberOf(int first, int second) {   // static
        return (first < second) ? second : first;
    }
}

// Application4.java
Calculator calc = new Calculator();
int min = calc.minNumberOf(20, 5);             // non-static: 객체로 호출
int max = Calculator.maxNumberOf(25, 18);      // static: 클래스명으로 호출
int max2 = calc.maxNumberOf(3, 1);            // 가능하지만 권장하지 않음
```

---

### 3-7. 패키지(Package)와 import

**패키지**는 관련 클래스들을 묶어 관리하는 폴더 개념이다.

```java
// 패키지 선언 (파일 최상단)
package com.ohgiraffers.section02.package_and_import;
```

다른 패키지의 클래스를 사용하려면 **전체 경로를 명시**하거나 `import` 를 사용한다.

```java
// 전체 경로 명시 (import 없이)
com.ohgiraffers.section01.method.Calculator calc
    = new com.ohgiraffers.section01.method.Calculator();

// import 사용 (권장)
import com.ohgiraffers.section01.method.Calculator;
Calculator calc2 = new Calculator();

// static import — static 멤버를 클래스명 없이 사용
import static com.ohgiraffers.section01.method.Calculator.maxNumberOf;
int max = maxNumberOf(30, 20);  // 클래스명 생략 가능하지만 출처 파악이 어려워 비권장
```

---

### 3-8. 주요 내장 API

#### java.lang.Math

`java.lang` 패키지는 **자동으로 import** 되므로 별도 선언 없이 사용 가능하다.

```java
System.out.println(Math.min(10, 20));   // 최솟값: 10
System.out.println(Math.max(10, 20));   // 최댓값: 20
System.out.println(Math.PI);            // 원주율: 3.141592...
System.out.println(Math.random());      // 0.0 이상 1.0 미만 난수

// 1 ~ 10 난수 공식: (int)(Math.random() * 범위) + 최솟값
int random = (int)(Math.random() * 10) + 1;
```

#### java.util.Random

```java
import java.util.Random;

Random random1 = new Random();
int num = random1.nextInt(10);      // 0 ~ 9
int num2 = random1.nextInt(26) + 20; // 20 ~ 45
```

---

## 핵심 정리

| 챕터 | 핵심 개념 | 포인트 |
|------|----------|--------|
| 01 | 리터럴 | 타입별 표현 방식과 연산 결과 |
| 01 | 기본 자료형 | 8가지, 크기 차이, boolean은 형변환 불가 |
| 01 | 형변환 | 작은→큰 자동, 큰→작은 강제(데이터 손실 가능) |
| 01 | 오버플로우 | 범위 초과 시 반대 극값으로 순환 |
| 02 | 산술/비교 연산자 | `==`는 주소 비교, 문자열은 `.equals()` 사용 |
| 02 | 논리 연산자 | 단락 평가로 불필요한 연산 건너뜀 |
| 02 | 삼항 연산자 | 조건식 `?` 참값 `:` 거짓값 |
| 03 | 메소드 | 선언/호출/반환값, static vs non-static |
| 03 | 패키지/import | 전체 경로 또는 import, static import |
| 03 | 내장 API | `Math`, `Random` — 자주 쓰는 유틸리티 |

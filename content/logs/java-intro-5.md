## 1. Section 06 — static 키워드

### 개념

| 구분                           | 위치                     | 생성 시점               | 공유 여부          |
| ------------------------------ | ------------------------ | ----------------------- | ------------------ |
| **인스턴스 필드** (non-static) | Heap                     | `new` 호출 시마다       | 객체별 독립        |
| **클래스 필드** (static)       | Method Area(static 영역) | 프로그램 시작 시 단 1회 | 모든 인스턴스 공유 |

> **비유** — 인스턴스 필드는 학생마다 따로 있는 **개인 사물함**, static 필드는 학과 전체가 함께 쓰는 **공용 사물함**.

---

### static 필드

```java
public class UniversityStudent {
    private int personalLocker;        // 개인 사물함 (인스턴스 필드)
    private static int sharedLocker;   // 공용 사물함 (static 필드)

    public int getSharedLocker() {
        return UniversityStudent.sharedLocker; // 클래스명.필드명으로 접근
    }
}
```

**실행 흐름 (Application.java)**

```plain
student1 생성 → 개인: 0, 공용: 0
student1.increaseSharedLocker() → 공용: 1

student2 생성 → 개인: 0, 공용: 1  ← 공용은 공유되어 1로 시작
student2.increaseSharedLocker() → 공용: 2
```

static 필드는 `student2`를 새로 만들어도 `student1`이 올렸던 값이 유지된다.

---

### static 메서드

```java
public class CampusActivity {
    private int personalLocker;

    public void openPersonalLocker() {
        this.personalLocker++;   // this 사용 가능 (인스턴스 메서드)
    }

    public static void libraryAnnouncement() {
        // this 사용 불가 — 객체 인스턴스가 존재하지 않음
        System.out.println("도서관 공지 방송입니다.");
    }
}
```

- **static 메서드**는 `클래스명.메서드명()` 으로 호출 (객체 없이도 가능)
- static 메서드 내부에서는 `this`를 사용할 수 없고, 인스턴스 필드에도 접근할 수 없다

```java
CampusActivity.libraryAnnouncement();   // 객체 없이 클래스명으로 호출
```

---

### 핵심 정리

```plain
static 필드/메서드
├── 클래스가 JVM에 로딩될 때 단 한 번 생성
├── 모든 인스턴스가 공유
├── 클래스명.멤버명 으로 접근 (권장)
└── static 메서드 안에서는 this·인스턴스 멤버 접근 불가
```

---

## 2. Section 06 — final 키워드

### final의 4가지 사용처

| 적용 대상          | 의미                                       |
| ------------------ | ------------------------------------------ |
| **지역 변수/필드** | 한 번 값을 넣으면 변경 불가                |
| **인스턴스 필드**  | 생성자에서 딱 한 번 초기화, 이후 변경 불가 |
| **메서드**         | 자식 클래스에서 오버라이딩 불가            |
| **클래스**         | 어떤 클래스도 이 클래스를 상속할 수 없음   |

---

### 상수 (public static final)

```java
public class MathConstant {
    // 공유하고(static) + 절대 못 바꾸는(final) 값 = 상수
    // 이름 규칙: 전부 대문자, 단어 구분은 _ (SNAKE_CASE)
    public static final double PI = 3.14;
}
```

```java
System.out.println(MathConstant.PI);  // 3.14
```

---

### final 인스턴스 필드

```java
public class Person {
    final String ssn;   // 주민등록번호 — 생성 후 절대 변경 불가
    private String name;

    public Person(String ssn, String name) {
        this.ssn = ssn;   // 생성자에서 단 한 번 초기화
        this.name = name;
    }
}
```

---

### final 메서드 & sealed 클래스

```java
// sealed 클래스: 상속을 허가할 자식을 명시적으로 지정
public sealed class Parent permits Child {

    // final 메서드: 자식이 오버라이딩 불가
    public final void coreMethod() {
        System.out.println("이것은 부모의 핵심 로직입니다. 절대 바꾸지 마세요.");
    }
}

// non-sealed: sealed 계층에서 벗어나 자유로운 상속 허용
public non-sealed class Child extends Parent { }
```

```java
// final 클래스: 아무도 상속 불가
final class SealedClass {
    public void showInfo() {
        System.out.println("저는 final 클래스라 상속이 불가능합니다.");
    }
}
```

> **Java 17+ `sealed`** — `permits` 뒤에 나열한 클래스만 상속 가능. 나열된 자식은 반드시 `final`, `sealed`, 또는 `non-sealed` 중 하나를 명시해야 한다.

---

### 핵심 정리

```plain
final
├── 변수   → 값 변경 불가 (상수)
├── 필드   → 생성자에서 1회 초기화 후 고정
├── 메서드 → 오버라이딩 금지
└── 클래스 → 상속 금지
```

---

## 3. Section 06 — 싱글톤 패턴

### 디자인 패턴이란?

자주 등장하는 문제를 효과적으로 해결하기 위한 **검증된 설계 템플릿**.

### 싱글톤(Singleton) 패턴

> 프로그램 전체에서 특정 클래스의 인스턴스가 **단 하나만** 존재하도록 보장한다.  
> (예: DB 연결, 로그 시스템, 앱 전역 설정값)

**구현 3원칙**

| 원칙                             | 방법                   |
| -------------------------------- | ---------------------- |
| 외부에서 `new` 생성 금지         | 생성자를 `private`으로 |
| 클래스 스스로 인스턴스 하나 보관 | `private static` 필드  |
| 그 인스턴스를 외부에 전달할 창구 | `public static` 메서드 |

---

### Eager Initialization (이른 초기화)

```java
public class EagerSingleton {
    // 클래스가 로딩되는 즉시 인스턴스를 딱 하나 미리 생성해 보관
    private static final EagerSingleton INSTANCE = new EagerSingleton();

    private EagerSingleton() {}   // 외부에서 new 불가

    public static EagerSingleton getInstance() {
        return INSTANCE;
    }
}
```

- **장점**: 스레드 안전 (JVM 클래스 로딩 과정이 동기화됨)
- **단점**: 실제로 쓰이지 않아도 무조건 생성됨 (메모리 낭비 가능)

---

### Lazy Initialization (지연 초기화)

```java
public class LazySingleton {
    private static LazySingleton INSTANCE;

    private LazySingleton() {}

    public static LazySingleton getInstance() {
        if (INSTANCE == null) {          // 처음 요청될 때만 생성
            INSTANCE = new LazySingleton();
        }
        return INSTANCE;
    }
}
```

- **장점**: 실제 사용될 때 생성 (메모리 효율적)
- **단점**: 멀티스레드 환경에서 동시 진입 시 인스턴스가 2개 생길 수 있음 (단순 구현 기준)

---

### 동일성 확인

```java
EagerSingleton e1 = EagerSingleton.getInstance();
EagerSingleton e2 = EagerSingleton.getInstance();
System.out.println(e1.hashCode() == e2.hashCode()); // true — 같은 객체

LazySingleton l1 = LazySingleton.getInstance();
LazySingleton l2 = LazySingleton.getInstance();
System.out.println(l1.hashCode() == l2.hashCode()); // true — 같은 객체
```

---

## 4. Section 07 — 변수의 종류

### 세 가지 변수

| 종류              | 선언 위치                | 저장 영역   | 초기값                        | 생존 범위               |
| ----------------- | ------------------------ | ----------- | ----------------------------- | ----------------------- |
| **인스턴스 변수** | 클래스 블록 (non-static) | Heap        | 자동 기본값                   | 객체가 살아 있는 동안   |
| **클래스 변수**   | 클래스 블록 (static)     | Method Area | 자동 기본값                   | 프로그램 종료 시까지    |
| **지역 변수**     | 메서드·생성자 블록       | Stack       | **없음 (반드시 직접 초기화)** | 해당 블록이 끝날 때까지 |

```java
public class KindOfVariable {
    private int instanceNum;         // 인스턴스 변수 — Heap에 객체별로 생성
    private static int classNum;     // 클래스 변수 — static 영역에 하나만

    public void method(int num) {    // num: 매개변수 (지역 변수의 일종)
        int localNum;                // 지역 변수
        System.out.println(num);
        // System.out.println(localNum); // 컴파일 에러 — 초기화 안 됨
    }

    public void method2() {
        System.out.println(instanceNum); // 같은 클래스 어느 메서드에서든 접근 가능
        System.out.println(classNum);
        // System.out.println(localNum); // 다른 블록 — 접근 불가
    }
}
```

---

### 중요 포인트

- 인스턴스/클래스 변수는 JVM이 기본값으로 자동 초기화 (int → 0, boolean → false, 참조형 → null)
- **지역 변수는 기본값이 없다** — 초기화 전 사용하면 컴파일 에러 발생
- 매개변수(parameter)도 지역 변수와 동일하게 Stack에 생성되고 메서드 종료 시 사라진다

---

## 5. Section 07 — 초기화 블록

### 명시적 초기화

```java
public class Product {
    // 필드 선언과 동시에 값 할당
    // 객체 생성 시 가장 먼저 이 값으로 초기화된다.
    private String name = "shark";
    private int price = 1000;
    private static String brand = "삼송";
}
```

**초기화 순서**

```plain
(static 필드) 명시적 초기화 → static 초기화 블록
(인스턴스 필드) 명시적 초기화 → 인스턴스 초기화 블록 → 생성자
```

---

## 6. Chap07 — 객체 배열

### 객체 배열이란?

배열의 각 요소가 **기본형 값이 아닌 객체 참조(주소)** 를 담는 배열.

```plain
carArr → [ ref0 | ref1 | ref2 ]
              ↓      ↓      ↓
           Audi  Benz   BMW   (Heap의 Car 인스턴스들)
```

---

### Car 클래스

```java
// section01.init.Car
public class Car {
    private String carName;
    private int maxSpeed;

    public Car(String carName, int maxSpeed) {
        this.carName = carName;
        this.maxSpeed = maxSpeed;
    }

    public void getInfo() {
        System.out.println("Car Name: " + carName + " Max Speed: " + maxSpeed);
    }
}
```

---

### 객체 배열 선언·생성·사용

```java
// 1. 배열 선언만 하면 모든 요소는 null (Car 객체가 없는 상태)
Car[] carArr = new Car[3];

// 2. 각 요소에 실제 Car 객체를 할당
carArr[0] = new Car("Audi", 150);
carArr[1] = new Car("Mercedes", 180);
carArr[2] = new Car("BMW", 200);

// 3. 향상된 for문으로 순회
for (Car c : carArr) {
    c.getInfo();
}
```

**출력**

```plain
Car Name: Audi Max Speed: 150
Car Name: Mercedes Max Speed: 180
Car Name: BMW Max Speed: 200
```

---

### 단일 객체 vs 객체 배열 비교

```java
Car car = new Car("BMW", 200);   // 단일 객체
car.getInfo();

Car[] carArr = new Car[3];       // 객체 배열 (참조형 배열)
// 선언 직후 carArr[0] ~ carArr[2] 는 모두 null
```

> 객체 배열을 `new Car[3]`으로 만든다고 Car 인스턴스가 3개 생기는 게 아니다.  
> **참조를 담을 공간** 3칸을 만드는 것이므로, 각 칸에 반드시 `new Car(...)` 로 실제 객체를 넣어야 한다.

---

## 7. 실습 — 배열 문제 풀이

### Practice 1 — 홀수 입력 후 산 모양 배열 출력

**문제 요약**: 홀수인 양의 정수를 입력받아 `1 2 3 ... n ... 3 2 1` 형태의 배열을 만들어 출력한다.

```java
public class Practice1 {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (true) {
            System.out.print("홀수인 양의 정수를 입력하세요 : ");
            String raw = sc.nextLine();
            int num;
            try {
                num = Integer.parseInt(raw);
                if (num % 2 == 0) throw new Exception();  // 짝수면 예외
            } catch (Exception e) {
                System.out.println("양수 혹은 홀수만 입력해야 합니다.");
                continue;
            }

            int now = 1;
            int half = num / 2;
            int[] arr = new int[num];

            for (int i = 0; i < num; i++) {
                arr[i] = now;
                if (i >= half) now -= 1;  // 중간 이후 감소
                else           now += 1;  // 중간 이전 증가
            }

            for (int i : arr) System.out.print(i + " ");
            System.out.println();
        }
    }
}
```

**실행 예시**

```plain
홀수인 양의 정수를 입력하세요 : 5
1 2 3 2 1
홀수인 양의 정수를 입력하세요 : 7
1 2 3 4 3 2 1
```

**핵심 로직**

```plain
num=5, half=2
i=0 → arr[0]=1, now=2
i=1 → arr[1]=2, now=3
i=2 (== half) → arr[2]=3, now=2  ← 방향 전환
i=3 → arr[3]=2, now=1
i=4 → arr[4]=1
```

---

### Practice 2 — 숫자 야구 게임

**문제 요약**: 0~9 중 4개를 무작위 선택 → 사용자가 최대 10번 안에 맞추는 숫자 야구 게임.

```java
public class Practice2 {
    public static void main(String[] args) {
        // 0~9 셔플 후 앞 4개 추출
        List<Integer> list = new ArrayList<>();
        for (int i = 0; i <= 9; i++) list.add(i);
        Collections.shuffle(list);

        int[] randomArray = new int[4];
        for (int i = 0; i < 4; i++) randomArray[i] = list.get(i);

        Scanner sc = new Scanner(System.in);
        int count = 10;
        boolean isWin = false;

        while (count > 0) {
            System.out.print(count + "회 남으셨습니다. 4자리 숫자를 입력하세요: ");
            String rawNum = sc.nextLine();

            int[] inputNum = new int[4];
            try {
                for (int j = 0; j < 4; j++) {
                    int tmp = Character.getNumericValue(rawNum.charAt(j));
                    if (tmp < 0 || tmp > 9) throw new Exception();
                    inputNum[j] = tmp;
                }
            } catch (Exception e) {
                System.out.println("4자리의 정수를 입력해야 합니다.");
                continue;
            }

            int strike = 0, ball = 0;
            for (int j = 0; j < 4; j++) {
                for (int k = 0; k < 4; k++) {
                    if (inputNum[j] == randomArray[k]) {
                        if (j == k) strike++;  // 위치·값 모두 일치
                        else        ball++;    // 값만 일치
                    }
                }
            }

            if (strike == 4) { isWin = true; break; }
            System.out.println("아쉽네요. " + strike + "S, " + ball + "B 입니다.");
            count--;
        }

        if (!isWin) System.out.println("10번의 기회를 모두 소진하셨습니다.");
    }
}
```

**게임 규칙**

| 결과       | 조건                    |
| ---------- | ----------------------- |
| **Strike** | 값과 위치가 모두 같음   |
| **Ball**   | 값은 같지만 위치가 다름 |
| **정답**   | 4 Strike                |

**구현 포인트**

- `Collections.shuffle()` 로 중복 없는 무작위 4자리 생성
- `Character.getNumericValue()` 로 문자 → 숫자 변환 + 유효성 검증
- 이중 `for`문으로 strike / ball 판별

---

## 8. 실습 — DTO 객체 배열 문제 풀이

### Level 01 — StudentDTO 배열

**StudentDTO**: 학년, 반, 이름, 국어/영어/수학 점수를 가지는 학생 데이터 클래스

```java
public class StudentDTO {
    private int grade, classroom;
    private String name;
    private int kor, eng, math;

    public StudentDTO() {}
    public StudentDTO(int grade, int classroom, String name, int kor, int eng, int math) { ... }

    public void printInformation() {
        int avg = (kor + eng + math) / 3;
        System.out.println("학년=" + grade + ", 반=" + classroom + ", 이름=" + name
            + ", 국어점수=" + kor + ", 영어점수=" + eng + ", 수학점수=" + math + ", 평균=" + avg);
    }
}
```

**Application**: 학생을 최대 10명 입력받아 배열에 저장, y/n로 계속 여부 결정 후 전체 출력

```java
StudentDTO[] students = new StudentDTO[10];
int idx = 0;

while (idx < 10) {
    // 학년, 반, 이름, 점수 입력
    students[idx++] = new StudentDTO(grade, classNum, name, kor, eng, math);

    System.out.print("계속 추가할 겁니까? (y/n)");
    if (!sc.nextLine().equalsIgnoreCase("y")) break;
}

for (int i = 0; i < idx; i++) students[i].printInformation();
```

- `idx` 변수로 실제 입력된 학생 수를 추적 → 배열 크기(10)와 분리
- `sc.nextLine()` 으로 버퍼 처리 (nextInt 후 줄바꿈 문자 소비)

---

### Level 02 — BookDTO 다중 생성자 (오버로딩)

```java
public class BookDTO {
    private String title, publisher, author;
    private int price;
    private double discountRate;

    public BookDTO() {}                                               // 기본 생성자

    public BookDTO(String title, String publisher, String author) {   // 3인자
        this.title = title; this.publisher = publisher; this.author = author;
    }

    public BookDTO(String title, String publisher, String author,     // 5인자
                   int price, double discountRate) { ... }

    public void printInformation() {
        System.out.println(title + ", " + publisher + ", " + author
                         + ", " + price + ", " + discountRate);
    }
    // + getter/setter
}
```

**사용 예시**

```java
BookDTO book1 = new BookDTO();                              // null, null, null, 0, 0.0
BookDTO book2 = new BookDTO("자바의 정석", "도우출판", "남궁성");
BookDTO book3 = new BookDTO("홍길동전", "활빈당", "허균", 5000000, 0.5);

book1.printInformation(); // null, null, null, 0, 0.0
book2.printInformation(); // 자바의 정석, 도우출판, 남궁성, 0, 0.0
book3.printInformation(); // 홍길동전, 활빈당, 허균, 5000000, 0.5
```

- 생성자 오버로딩으로 다양한 초기화 방식 제공
- 기본 생성자가 명시되면 JVM이 자동 제공하지 않으므로 직접 작성 필요
- getter/setter 로 캡슐화 유지

---

## 전체 개념

```plain
클래스와 객체
├── 멤버의 종류
│   ├── static (클래스 공유)
│   │   ├── static 필드  → 프로그램 시작 시 1회 생성, 모든 인스턴스 공유
│   │   └── static 메서드 → this 없음, 클래스명으로 직접 호출
│   └── non-static (인스턴스별 독립)
│
├── final 키워드
│   ├── 변수 → 상수 (SNAKE_CASE, public static final 조합)
│   ├── 필드 → 생성 시 1회 초기화 후 고정
│   ├── 메서드 → 오버라이딩 금지
│   └── 클래스 → 상속 금지 (sealed는 허가 클래스 지정 가능)
│
├── 디자인 패턴 — 싱글톤
│   ├── Eager: 클래스 로딩 시 즉시 생성 (스레드 안전)
│   └── Lazy: 최초 호출 시 생성 (메모리 효율)
│
├── 변수의 종류
│   ├── 인스턴스 변수 → Heap, 객체별 독립
│   ├── 클래스 변수  → static 영역, 공유
│   └── 지역 변수    → Stack, 초기화 필수
│
└── 객체 배열
    ├── new ClassName[n] → 참조 공간 n개 생성 (객체 X)
    ├── 각 요소에 new ClassName(...) 으로 객체 할당
    └── 향상된 for문으로 순회
```

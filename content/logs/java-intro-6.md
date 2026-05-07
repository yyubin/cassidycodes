## 1. 상속 (Inheritance)

### 상속이란 무엇인가

**상속(Inheritance)** 은 기존의 클래스를 재사용하여 새로운 클래스를 작성하는 자바의 핵심 기술이다.  
부모 클래스의 멤버(필드, 메서드)를 자식 클래스가 물려받아 자신의 것처럼 사용할 수 있으며, 여기에 새로운 기능을 추가(확장)할 수 있다.

```plain
부모 클래스 (Super/Parent Class) → 상속을 해주는 클래스
자식 클래스 (Sub/Child Class)   → 상속을 받는 클래스
```

### 상속의 특징 및 문법

```java
// 문법: extends 키워드 사용
public class 자식클래스 extends 부모클래스 { ... }
```

1. **코드 재사용성**: 중복되는 코드를 부모 클래스에 한 번만 작성하여 관리할 수 있다.
2. **확장성**: 부모의 기능을 그대로 쓰면서 자식만의 고유한 기능을 추가할 수 있다.
3. **단일 상속**: 자바는 클래스 간 다중 상속을 지원하지 않는다 (부모는 오직 하나).

### 상속 적용 예시

```java
// Car.java (부모 클래스)
public class Car {
    private boolean runningStatus;

    public void run() {
        runningStatus = true;
        System.out.println("자동차가 달립니다.");
    }

    protected boolean isRunning() { // 같은 패키지 + 자식 클래스에서 접근 허용
        return runningStatus;
    }
}

// FireCar.java (자식 클래스)
public class FireCar extends Car {
    @Override
    public void soundHorn() {
        if(isRunning()) { // 부모의 protected 메서드 사용 가능
            System.out.println("빠아아아아아앙!!@!@!@@@");
        }
    }

    public void sprayWater() { // 자식만의 고유 기능 추가
        System.out.println("물을 뿌립니다 =============>>>>>>");
    }
}
```

---

## 2. super 키워드

### super()와 super.

`this`가 나 자신을 가리킨다면, `super`는 부모 객체를 가리키는 참조 변수다.

- **super()**: 부모의 생성자를 호출한다. 자식 객체 생성 시 부모 객체가 먼저 생성되어야 하므로 자식 생성자 첫 줄에 반드시 위치해야 한다 (생략 시 컴파일러가 자동 추가).
- **super.**: 부모 클래스의 멤버(필드/메서드)에 접근할 때 사용한다. 자식 클래스에서 오버라이딩된 메서드 대신 부모의 원본 메서드를 호출하고 싶을 때 유용하다.

### 생성자 호출 순서

```java
// Computer.java
public class Computer extends Product {
    private String cpu;
    private int ram;

    public Computer(String code, String brand, String name, int price, Date manufacturingDate, String cpu, int ram) {
        // 1. 부모의 생성자를 호출하여 부모 필드 초기화
        super(code, brand, name, price, manufacturingDate);

        // 2. 자식만의 필드 초기화
        this.cpu = cpu;
        this.ram = ram;
    }
}
```

---

## 3. 메서드 오버라이딩 (Method Overriding)

### 오버라이딩이란 무엇인가

부모 클래스로부터 물려받은 메서드의 내용을 자식 클래스에서 자신에 맞게 **재정의**하는 것이다.

### 오버라이딩 성립 조건

1. 메서드 이름, 반환 타입, 매개변수 목록이 부모와 완전히 동일해야 한다.
2. 접근 제한자는 부모보다 좁은 범위로 변경할 수 없다 (부모가 `protected`면 자식은 `protected`나 `public`).
3. 부모의 `private` 메서드와 `final` 메서드는 오버라이딩할 수 없다.

### @Override 어노테이션

이 어노테이션을 붙이면 컴파일러가 오버라이딩 규칙을 제대로 지켰는지 검사해준다. 오타 등으로 인해 오버라이딩이 아닌 새로운 메서드가 정의되는 실수를 방지해준다.

```java
// CoffeeVendingMachine.java
@Override
public String vend() {
    return "따듯한 아메리카노"; // 부모의 "밀크 커피" 대신 새로운 결과 반환
}
```

---

## 4. 다형성 (Polymorphism)

### 다형성이란 무엇인가

하나의 타입(부모)으로 여러 가지 타입의 객체(자식들)를 참조할 수 있는 성질이다. 자바 객체지향의 꽃이라고 불릴 만큼 중요하다.

### 핵심 개념

1. **업캐스팅 (Upcasting)**: 자식 객체를 부모 타입의 변수에 대입하는 것 (자동 형변환).
   ```java
   Animal a1 = new Cat();  // Cat은 Animal이다.
   ```
2. **동적 바인딩 (Dynamic Binding)**: 컴파일 시점에는 부모의 메서드를 호출하는 것처럼 보이지만, 실행 시점에는 실제 객체의 오버라이딩된 메서드가 호출되는 원리.
3. **다운캐스팅 (Downcasting)**: 부모 타입으로 변환된 객체를 다시 원래의 자식 타입으로 되돌리는 것 (명시적 형변환).
   ```java
   ((Cat) a1).jump(); // Animal에는 없는 Cat만의 jump()를 호출할 때 필요
   ```

### instanceof 연산자

다운캐스팅 시 실제 어떤 객체인지 확인하여 에러(`ClassCastException`)를 방지한다.

```java
if (a1 instanceof Cat) {
    ((Cat) a1).jump();
}
```

---

## 5. 추상 클래스 (Abstract Class)

### 미완성 설계도

**추상 클래스**는 미완성된 기능(추상 메서드)을 포함하고 있어 직접 객체를 생성할 수 없는 클래스다. `abstract` 키워드를 사용한다.

- **추상 메서드**: 선언부만 있고 몸통(`{}`)이 없는 메서드. 자식 클래스에게 해당 메서드의 구현을 강제한다.
- **목적**: 자식 클래스들이 공통적으로 가져야 할 규격을 정의하고, 반드시 재정의해야 할 기능을 명시하는 용도다.

```java
public abstract class Player {
    public abstract void attack(); // 자식(Warrior, Wizard)은 반드시 이 메서드를 만들어야 함

    public void levelUp() { // 일반 메서드도 포함 가능
        System.out.println("레벨업!");
    }
}
```

---

## 6. 인터페이스 (Interface)

### 표준 규격서 (계약)

인터페이스는 클래스가 구현해야 할 메서드 목록을 정의한 **표준 규격**이다. 클래스 간의 결합도를 낮추고 다중 상속과 유사한 효과를 낸다.

- **모든 변수**: `public static final` (상수)
- **모든 메서드**: `public abstract` (추상 메서드, Java 8부터 default/static 메서드 가능)
- **다중 구현**: 한 클래스가 여러 인터페이스를 한꺼번에 `implements` 할 수 있다.

```java
public interface IConnectable {
    void connect(); // 자동으로 public abstract

    default void showStatus() { // 기본 구현 제공 가능
        System.out.println("장치가 대기 상태입니다.");
    }
}
```

---

## 7. 상속 vs 컴포지션 (Inheritance vs Composition)

객체 지향 설계에서 클래스 간의 관계를 맺는 두 가지 주요 방법이다.

### Is-A 관계 (상속)

- 클래스 간의 강한 결합.
- "자식은 부모의 일종이다" (예: 소방차는 자동차이다).
- 부모의 코드를 그대로 물려받아 재사용성이 높지만, 부모의 변경이 자식에게 큰 영향을 미친다.

### Has-A 관계 (컴포지션/합성)

- 클래스가 다른 클래스의 객체를 필드로 포함하는 관계.
- "A는 B를 소유한다" (예: 레이서는 자동차를 가지고 있다).
- 객체 간의 결합도가 낮아 유연하며, 실행 시점에 포함하는 객체를 교체할 수도 있다.

```java
// 컴포지션 예시
public class CarRacer {
    private final Car myCar = new Car(); // 레이서는 자동차를 소유함

    public void drive() {
        myCar.run(); // 자동차에게 달리는 기능을 요청(위임)
    }
}
```

### 무엇을 선택해야 할까?

- **상속**은 명확한 계층 구조가 필요할 때 사용한다.
- **컴포지션**은 단순히 기능을 재사용하고 싶거나, 객체 간의 독립성을 유지하고 싶을 때 권장된다.
- 현대적인 설계에서는 "상속보다는 합성(Composition)을 선호하라"는 원칙을 많이 따른다.

---

## 8. 실습 과제 해설

학습한 상속과 다형성 개념을 실제 프로젝트에 적용해본 사례를 분석한다.

### 과제 1: 상속을 이용한 회원 관리 (Person - Student/Employee)

이 과제는 부모 클래스인 `Person`의 공통 필드를 자식 클래스들이 물려받아 재사용하는 **Is-A 관계**의 전형적인 사례다.

- **부모 클래스 (Person):** 이름, 나이, 키, 몸무게 등 모든 사람의 공통 속성을 정의한다.
- **자식 클래스 (Student, Employee):** 부모의 속성을 물려받고, 각각 '학년/전공' 또는 '급여/부서'와 같은 고유한 속성을 확장한다.

**핵심 포인트:**

- `super()`를 사용하여 부모의 필드를 초기화한다.
- `information()` 메서드를 오버라이딩하여 부모의 정보 출력 기능에 자식만의 정보를 추가한다.

```java
// Student.java 오버라이딩 예시
@Override
public String information() {
    return super.information() + ", 학년: " + grade + ", 전공: " + major;
}
```

### 과제 2: 다형성을 이용한 도서 관리 시스템 (Book - AniBook/CookBook)

이 과제는 부모 타입의 배열 하나로 서로 다른 자식 객체들을 관리하는 **다형성(Polymorphism)**의 강력함을 보여준다.

- **부모 클래스 (Book):** 제목, 저자, 출판사 정보를 가진다.
- **자식 클래스 (AniBook, CookBook):** 만화책(제한 나이), 요리책(쿠폰 여부) 등 특수 속성을 가진다.

**핵심 포인트:**

- **업캐스팅:** `Book[] bList` 배열 하나에 `AniBook`과 `CookBook` 객체를 모두 담아 통합 관리한다.
- **instanceof와 다운캐스팅:** 대여 처리 시, 실제 객체가 어떤 타입인지 확인하여 타입별 특수 로직(나이 제한 체크, 쿠폰 적립)을 실행한다.

```java
// LibraryManager.java 다형성 활용 예시
public int rentBook(int index) {
    Book book = bList[index]; // 부모 타입으로 객체 꺼내기

    if (book instanceof AniBook) { // 실제 타입 확인
        AniBook aniBook = (AniBook) book; // 다운캐스팅
        if (member.getAge() < aniBook.getAccessAge()) return 1; // 나이 제한 체크
    }

    if (book instanceof CookBook) {
        CookBook cookBook = (CookBook) book;
        if (cookBook.isCoupon()) { // 쿠폰 여부 체크
            member.setCouponCount(member.getCouponCount() + 1);
            return 2;
        }
    }
    return 0;
}
```

---

## 정리

| 개념            | 핵심 키워드               | 주요 특징                              |
| --------------- | ------------------------- | -------------------------------------- |
| **상속**        | `extends`                 | 부모의 기능을 물려받고 확장함 (Is-A)   |
| **super**       | `super()`, `super.`       | 부모의 생성자나 멤버에 접근함          |
| **오버라이딩**  | `@Override`               | 부모의 메서드를 자식에 맞게 재정의함   |
| **다형성**      | `Upcasting`, `instanceof` | 부모 타입 하나로 여러 자식 객체를 다룸 |
| **추상 클래스** | `abstract`                | 미완성 설계도, 자식에게 구현을 강제함  |
| **인터페이스**  | `implements`              | 표준 규격(계약), 다중 구현 지원        |
| **컴포지션**    | `Has-A`                   | 다른 객체를 소유하여 기능을 위임함     |

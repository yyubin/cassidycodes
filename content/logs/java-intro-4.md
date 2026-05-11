# Chapter 06. 클래스와 객체

## 1. 사용자 정의 자료형

### 클래스란 무엇인가

Java에서 `int`, `String`, `char` 같은 기본/내장 자료형은 언어가 제공한다.  
하지만 현실의 사물이나 개념을 표현하려면 이것만으로는 부족하다.  
예를 들어 "회원(Member)"은 아이디, 비밀번호, 이름, 나이, 성별, 취미를 함께 묶어서 표현해야 한다.

**클래스(Class)** 는 이런 연관된 데이터들을 하나로 묶어 새로운 자료형을 정의하는 설계도다.

```plain
클래스  → 설계도 (붕어빵 틀)
객체    → 설계도대로 만들어진 실제 결과물 (붕어빵)
인스턴스 → 특정 클래스로부터 생성된 객체를 지칭할 때 쓰는 말
```

### 클래스 정의

```java
// Member.java
public class Member {
    String id;
    String pwd;
    String name;
    int age;
    char gender;
    String[] hobby;
}
```

위 클래스는 "회원"이라는 개념을 표현하기 위해 여러 자료형의 변수(필드)를 하나로 묶은 것이다.

### 객체 생성 및 사용

```java
// Application.java
Member member = new Member();  // Heap 메모리에 객체 생성, 주소를 참조변수에 저장

member.id = "user01";
member.pwd = "pass01";
member.name = "홍길동";
member.age = 20;
member.gender = '남';
member.hobby = new String[]{"축구", "볼링", "테니스"};

System.out.println(member.id);
System.out.println(member.gender);
```

객체 생성의 3단계를 정리하면 다음과 같다.

```plain
1. 클래스(설계도)를 작성한다.
2. new 연산자로 설계도대로 실제 객체를 Heap 메모리에 생성한다.
3. 참조 변수(reference variable)를 선언하고, 생성된 객체의 주소를 저장한다.

문법: 자료형 변수명 = new 클래스명();
```

### 참조 변수의 특성

```plain
기본 자료형 변수: 값 자체를 저장한다.   예) int age = 20;
참조 자료형 변수: 객체의 주소를 저장한다. 예) Member member = new Member();

member 변수는 Member 객체의 실제 데이터가 있는 Heap 주소를 가리킨다.
점(.) 연산자(참조 연산자)를 통해 해당 주소의 필드에 접근한다.
```

---

## 2. 캡슐화

### 접근 제한자

**접근 제한자(Access Modifier)** 는 클래스나 클래스 멤버에 참조 연산자로 접근할 수 있는 범위를 제한하기 위한 키워드다.

| 접근 제한자 | 기호 | 접근 허용 범위                                                |
| ----------- | ---- | ------------------------------------------------------------- |
| `public`    | +    | 모든 패키지에서 접근 허용                                     |
| `protected` | #    | 동일 패키지 + 상속 관계의 다른 패키지                         |
| `default`   | ~    | 동일 패키지 내에서만 접근 허용 (키워드를 쓰지 않으면 default) |
| `private`   | -    | 해당 클래스 내부에서만 접근 허용                              |

```plain
주의: 클래스 선언 시 사용 가능한 접근 제한자는 public과 default만 가능하다.
      필드, 메서드, 생성자에는 네 가지 모두 사용할 수 있다.
```

### 캡슐화란 무엇인가

Section 01의 `Member` 클래스는 모든 필드가 `default`(패키지 공개) 상태여서 외부에서 직접 접근하고 변경할 수 있다.  
이 경우 잘못된 값(`age = -100` 등)이 들어와도 막을 방법이 없다.

**캡슐화(Encapsulation)** 는 필드를 `private`으로 감추고, 검증 로직을 포함한 `public` 메서드(getter/setter)를 통해서만 접근하게 만드는 설계 원칙이다.  
유지보수성을 높이고 데이터의 무결성을 지키기 위한 기본 원칙이다.

### getter와 setter

```plain
Getter(접근자): 내부 필드의 값을 외부로 반환하는 메서드 (읽기 전용)
Setter(변경자): 외부에서 전달받은 값으로 내부 필드를 설정하거나 변경하는 메서드
               유효성 검사(validation) 로직을 이 안에 포함시킬 수 있다.
```

```java
// Children.java
public class Children {

    private String nickname;
    private int age;

    // Setter: 유효성 검사 포함
    public void setAge(int age) {
        if (age >= 0) {
            this.age = age;  // this: 현재 객체 자신을 가리키는 참조 변수
        } else {
            System.out.println("나이는 음수일 수 없다!");
            this.age = 0;
        }
    }

    // Getter: 값 반환
    public int getAge() {
        return this.age;
    }
}
```

### this 키워드

`this`는 현재 생성된 객체 자기 자신을 가리키는 참조 변수다.  
setter에서 매개변수 이름과 필드 이름이 같을 때 이를 구분하기 위해 주로 사용한다.

```plain
this.age = age;
  ^              ^
필드(나 자신의 age)  매개변수(전달받은 age)
```

### 캡슐화 적용 예시

```java
// Applicaion.java
Children child1 = new Children();

// child1.age = -30;  // 컴파일 에러: private 필드에 직접 접근 불가

child1.setAge(-10);   // setter 호출 -> 내부에서 유효성 검사 후 0으로 설정
System.out.println("어린이 나이 : " + child1.getAge() + " 세");  // 0 출력
```

---

## 3. 추상화

### 추상화란 무엇인가

**추상화(Abstraction)** 는 복잡한 내부 구현을 숨기고, 외부에는 꼭 필요한 기능만 공개하는 설계 원칙이다.  
사용자는 내부가 어떻게 동작하는지 몰라도 메서드를 호출해서 원하는 결과를 얻을 수 있다.

자동차를 운전할 때 엔진 내부 구조를 알 필요 없이 핸들, 엑셀, 브레이크만 조작하는 것과 같다.

### 상태를 가진 클래스 설계

```java
// Car.java
public class Car {

    private boolean isOn;  // 내부 상태: 시동 여부
    private int speed;     // 내부 상태: 현재 시속

    public void startUp() {
        if (isOn) {
            System.out.println("이미 시동이 걸려 있습니다.");
        } else {
            this.isOn = true;
            System.out.println("시동을 걸었습니다. 출발 준비 완료~");
        }
    }

    public void go() {
        if (isOn) {
            this.speed += 10;
            System.out.println("현재 시속은 " + this.speed + "입니다.");
        } else {
            System.out.println("시동을 먼저 걸어주세요~");
        }
    }

    public void stop() {
        if (isOn) {
            if (this.speed > 0) {
                this.speed = 0;
                System.out.println("차가 서서히 멈춥니다.");
            } else {
                System.out.println("차가 이미 멈춰있는 상태입니다.");
            }
        } else {
            System.out.println("시동이 걸려있지 않습니다.");
        }
    }

    public void turnOff() {
        if (isOn) {
            if (speed > 0) {
                System.out.println("차를 먼저 멈춰주세요");
            } else {
                this.isOn = false;
                System.out.println("시동을 끕니다.");
            }
        } else {
            System.out.println("이미 시동이 꺼져있는 상태입니다.");
        }
    }
}
```

`isOn`, `speed` 는 `private` 이므로 외부에서 직접 바꿀 수 없다.  
외부는 오직 `startUp()`, `go()`, `stop()`, `turnOff()` 메서드만 호출할 수 있다.  
상태 전환 순서를 지키지 않으면 메서드 내부에서 오류 메시지를 출력하며 거부한다.

### Has-A 관계와 위임(Delegation)

**Has-A 관계** 는 한 클래스가 다른 클래스의 객체를 필드로 소유하는 관계다.

```java
// CarRacer.java
public class CarRacer {

    // CarRacer는 Car를 소유한다 (has-a 관계)
    private final Car myCar = new Car();

    public void startUp() {
        // 레이서는 시동 거는 방법을 직접 모른다.
        // 자신의 차에게 요청(메시지 전송)할 뿐이다.
        myCar.startUp();
    }

    public void stepAccelator() {
        myCar.go();
    }

    public void stepBreak() {
        myCar.stop();
    }

    public void turnOff() {
        myCar.turnOff();
    }
}
```

```plain
사용자 → CarRacer에게 요청 → CarRacer가 Car에게 위임

사용자는 Car의 존재를 몰라도 된다.
CarRacer는 Car의 내부 구현을 몰라도 된다.
각 클래스는 자신의 역할만 담당한다.
```

### 실행 흐름 예시

```java
// Application.java (section03/abstraction)
CarRacer racer = new CarRacer();
Scanner sc = new Scanner(System.in);

while (true) {
    System.out.println("1. 시동 걸기");
    System.out.println("2. 엑셀 밟기");
    System.out.println("3. 브레이크 밟기");
    System.out.println("4. 시동 끄기");
    System.out.println("9. 프로그램 종료");
    int no = sc.nextInt();

    switch (no) {
        case 1: racer.startUp(); break;
        case 2: racer.stepAccelator(); break;
        case 3: racer.stepBreak(); break;
        case 4: racer.turnOff(); break;
        case 9: System.out.println("프로그램을 종료합니다."); return;
    }
}
```

### DTO 패턴

**DTO(Data Transfer Object)** 는 데이터를 담아서 전달하기 위한 목적만 가진 클래스다.  
비즈니스 로직 없이 필드와 getter/setter만 존재한다.

```java
// MemberDTO.java
public class MemberDTO {

    private int number;
    private String name;
    private int age;
    private char gender;
    private double height;
    private double weight;
    private boolean isActivated;

    // getter/setter 쌍으로 구성
    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    // boolean 타입의 getter는 get 대신 is를 사용하는 것이 관례
    public boolean isActivated() { return isActivated; }
    public void setActivated(boolean activated) { isActivated = activated; }

    // ... (나머지 필드 동일한 패턴)
}
```

```plain
boolean 타입 getter 네이밍 규칙:
  일반 타입: getAge(), getName()
  boolean 타입: isActivated(), isOn()
```

DTO 사용 예시

```java
// Application.java (section03/dto)
MemberDTO member = new MemberDTO();  // 빈 데이터 상자 생성

// setter로 데이터를 담는다
member.setNumber(1);
member.setName("홍길동");
member.setAge(20);
member.setHeight(180.5);
member.setWeight(80.6);
member.setActivated(true);

// getter로 데이터를 꺼낸다
System.out.println(member.getAge());       // 20
System.out.println(member.isActivated());  // true
System.out.println(member.getHeight());    // 180.5
```

---

## 4. 생성자

### 생성자란 무엇인가

**생성자(Constructor)** 는 `new` 연산자로 객체가 Heap 메모리에 생성될 때, 가장 먼저 단 한 번 호출되는 초기화 메서드다.  
주목적은 객체의 필드를 원하는 값으로 초기화하는 것이다.

### 생성자 작성 규칙

```plain
1. 이름이 클래스명과 반드시 동일해야 한다.
2. 반환 타입(void, int 등)을 쓰지 않는다.

문법:
접근제한자 클래스명(매개변수) {
    필드 초기화 코드
}
```

### 기본 생성자와 매개변수 있는 생성자

```java
// User.java
public class User {

    private String id;
    private String pwd;
    private String name;
    private java.util.Date enrollDate;

    // 1. 기본 생성자 (매개변수 없음)
    public User() {
        System.out.println("User 클래스의 기본 생성자 호출됨...");
    }

    // 2. 매개변수 있는 생성자 (3개)
    public User(String id, String pwd, String name) {
        this.id = id;
        this.pwd = pwd;
        this.name = name;
        System.out.println("id, pwd, name을 초기화 하는 생성자 호출");
    }

    // 3. 매개변수 있는 생성자 (4개) + 생성자 체이닝
    public User(String id, String pwd, String name, java.util.Date enrollDate) {
        this(id, pwd, name);  // 같은 클래스의 다른 생성자 호출
        this.enrollDate = enrollDate;
        System.out.println("모든 필드를 초기화하는 생성자 호출됨...");
    }
}
```

### 중요: 기본 생성자 자동 생성 규칙

```plain
매개변수 없는 생성자(기본 생성자)는 개발자가 생성자를 하나도 작성하지 않았을 때
컴파일러가 자동으로 추가해준다.

단, 매개변수 있는 생성자를 하나라도 직접 작성하면
컴파일러는 기본 생성자를 자동으로 생성하지 않는다.
이 경우 기본 생성자가 필요하다면 개발자가 직접 명시적으로 작성해야 한다.
```

### this()를 이용한 생성자 체이닝

`this()`는 같은 클래스 내의 다른 생성자를 호출하는 구문이다.  
코드 중복을 줄이고 초기화 로직을 한 곳에 모을 수 있다.

```plain
규칙: this()는 반드시 생성자 내부의 첫 번째 줄에 작성해야 한다.
```

4개짜리 생성자가 호출되면 다음 순서로 실행된다.

```plain
User("user03", "pass03", "이순신", new Date()) 호출
  → this(id, pwd, name) 호출 (3개짜리 생성자 실행)
    → id, pwd, name 필드 초기화
  → enrollDate 필드 초기화
```

### 생성자 사용 패턴 비교

```java
// Application.java (section04/constructor)

// 패턴 1: 기본 생성자 + setter로 개별 초기화
User user = new User();
user.setId("user01");
user.setPwd("pass01");
user.setName("홍길동");

// 패턴 2: 매개변수 있는 생성자로 한번에 초기화
User user1 = new User("user02", "pass02", "유관순");

// 패턴 3: 모든 필드를 한번에 초기화
User user2 = new User("user03", "pass03", "이순신", new Date());
System.out.println(user2.getInformation());
```

---

## 5. 메서드 오버로딩

### 문제 상황: 이름이 다른 유사 메서드들

덧셈 기능을 제공하는 계산기를 만든다고 가정하자.  
오버로딩을 모른다면 아래처럼 각각 다른 이름의 메서드를 만들어야 한다.

```java
// BadCalculator.java
public class BadCalculator {

    public int addTowInts(int num1, int num2) {
        return num1 + num2;
    }

    public double addTwoDoubles(double num1, double num2) {
        return num1 + num2;
    }

    public int addThreeInts(int num1, int num2, int num3) {
        return num1 + num2 + num3;
    }
}
```

```java
// Problem.java
BadCalculator bc = new BadCalculator();
bc.addTowInts(10, 20);        // 메서드 이름을 외워야 함
bc.addTwoDoubles(10.5, 20.5); // 또 다른 이름
bc.addThreeInts(10, 20, 30);  // 또 다른 이름
```

```plain
문제점: 동일한 "더하기" 기능인데 메서드 이름이 세 개다.
        개발자가 타입과 개수에 맞는 메서드 이름을 모두 기억해야 한다.
        메서드가 늘어날수록 이름 관리가 어렵다.
```

### 메서드 시그니처와 오버로딩

**메서드 시그니처(Method Signature)** 는 메서드를 식별하는 고유한 정보다.

```plain
메서드 시그니처 = 메서드 이름 + 매개변수의 타입, 개수, 순서

반환 타입과 접근 제한자, 매개변수 이름은 시그니처에 포함되지 않는다.
```

**메서드 오버로딩(Method Overloading)** 은 이름은 같지만 시그니처(매개변수)가 다른 메서드를 여러 개 정의하는 기술이다.  
컴파일러가 호출 시 전달된 인자를 보고 어떤 메서드를 실행할지 자동으로 결정한다.

### 오버로딩 적용

```java
// Calculator.java
public class Calculator {

    public int add(int num1, int num2) {
        System.out.println("정수를 2개 더하는 add()");
        return num1 + num2;
    }

    public double add(double num1, double num2) {
        System.out.println("실수 2개를 더하는 add()");
        return num1 + num2;
    }

    public int add(int num1, int num2, int num3) {
        System.out.println("정수 3개를 더하는 add()");
        return num1 + num2 + num3;
    }
}
```

```java
// Solution.java
Calculator calc = new Calculator();

// 컴파일러가 인자를 보고 알맞는 메서드를 자동으로 선택한다
calc.add(10, 20);        // → int add(int, int)  호출
calc.add(10.5, 20.5);   // → double add(double, double) 호출
calc.add(10, 20, 30);   // → int add(int, int, int) 호출
```

### 오버로딩 성립 조건

```java
// OverloadingRules.java
public class OverloadingRules {

    public void test() {}                    // 기준

    public void test(int num) {}             // 성립: 매개변수 개수 다름

    public void test(String str) {}          // 성립: 매개변수 타입 다름

    public void test(int num, String str) {} // 성립: 순서 포함 다름

    public void test(String str, int num) {} // 성립: 순서가 다름

//  public int test() {}                    // 불성립: 반환 타입은 시그니처 아님
//  private void test() {}                  // 불성립: 접근 제한자는 시그니처 아님
//  public void test(int num2) {}           // 불성립: 매개변수 이름은 시그니처 아님
}
```

```plain
오버로딩 성립 조건 정리:
  성립: 매개변수의 개수가 다른 경우
  성립: 매개변수의 타입이 다른 경우
  성립: 매개변수의 순서가 다른 경우

  불성립: 반환 타입만 다른 경우
  불성립: 접근 제한자만 다른 경우
  불성립: 매개변수 이름만 다른 경우
```

---

## 6. 메서드 매개변수 전달 방식

### 핵심 개념: 값 복사 vs 주소 복사

메서드를 호출할 때 인자를 전달하는 방식은 자료형에 따라 다르게 동작한다.

```plain
기본 자료형 (int, double, char, boolean 등)
  → 값(value) 자체가 복사되어 전달된다.
  → 메서드 내부에서 매개변수를 변경해도 원본 변수에 영향 없다.

참조 자료형 (배열, 객체 등)
  → 객체의 주소(reference)가 복사되어 전달된다.
  → 메서드 내부에서 같은 주소를 통해 객체를 수정하면 원본에도 반영된다.
```

### 기본 자료형 - 값 복사

```java
// MethodParameterTest.java
public void testPrimitiveType(int num) {
    System.out.println("전달받은 num : " + num);  // 20
    num = 99;  // 복사된 값만 변경
    System.out.println("변경 후 num : " + num);   // 99
}
```

```java
// Application.java
int num = 20;
System.out.println("호출 전 main의 num : " + num);  // 20
pt.testPrimitiveType(num);
System.out.println("호출 후 main의 num : " + num);  // 20 (변화 없음)
```

```plain
num = 20 이라는 값이 복사되어 메서드 안으로 들어간다.
메서드 안에서 num을 99로 바꿔도, 그것은 복사본을 바꾼 것이다.
main의 num은 여전히 20이다.
```

### 배열(참조 자료형) - 주소 복사

```java
// MethodParameterTest.java
public void testArrayParameter(int[] arr) {
    System.out.println("전달 받은 arr = " + Arrays.toString(arr));  // [1,2,3,4,5]
    arr[0] = 99;  // 원본 배열의 0번째 요소를 변경
    System.out.println("변경 후 arr = " + Arrays.toString(arr));    // [99,2,3,4,5]
}
```

```java
// Application.java
int[] iarr = {1, 2, 3, 4, 5};
System.out.println("호출 전: " + Arrays.toString(iarr));  // [1, 2, 3, 4, 5]
pt.testArrayParameter(iarr);
System.out.println("호출 후: " + Arrays.toString(iarr));  // [99, 2, 3, 4, 5]
```

```plain
iarr가 가리키는 배열 객체의 주소가 복사되어 전달된다.
메서드 안의 arr와 main의 iarr는 같은 배열 객체를 가리킨다.
arr[0] = 99는 그 공유된 배열을 직접 수정하므로 main에서도 변경이 보인다.
```

### 객체(참조 자료형) - 주소 복사

```java
// MethodParameterTest.java
public void testObjectParameter(Rectangle rect) {
    System.out.println("변경 전 사각형 너비 = " + rect.getWidth());  // 12.5
    rect.setWidth(100);  // 원본 객체의 필드를 변경
    System.out.println("변경 후 사각형 너비 = " + rect.getWidth());  // 100.0
}
```

```java
// Application.java
Rectangle r1 = new Rectangle(12.5, 22.5);
System.out.println("호출 전 너비: " + r1.getWidth());  // 12.5
pt.testObjectParameter(r1);
System.out.println("호출 후 너비: " + r1.getWidth());  // 100.0
```

```plain
배열과 동일한 원리다.
r1이 가리키는 Rectangle 객체의 주소가 메서드로 복사된다.
rect.setWidth(100)은 공유된 객체를 직접 수정하므로 원본에 반영된다.
```

### 가변 인자 (Varargs)

매개변수의 개수가 유동적인 경우 `...` 문법을 사용한다.

```java
// MethodParameterTest.java
// toppings: 0개 이상의 선택 매개변수, 메서드 내부에서 배열로 취급됨
public void orderPizza(String customerName, String... toppings) {
    System.out.println(customerName + "고객님!!!");
    System.out.println("주문하신 피자 토핑: " + Arrays.toString(toppings));
}
```

```java
// Application.java
pt.orderPizza("홍길동");                              // 토핑 0개: []
pt.orderPizza("유관순", "불고기");                    // 토핑 1개: [불고기]
pt.orderPizza("이순신", "치즈", "페퍼로니", "올리브"); // 토핑 3개: [치즈, 페퍼로니, 올리브]
```

```plain
가변 인자 규칙:
  - 타입 뒤에 ... 을 붙인다: String... toppings
  - 메서드 내부에서는 배열처럼 사용된다.
  - 가변 인자는 매개변수 목록의 마지막에 위치해야 한다.
  - 하나의 메서드에 가변 인자는 하나만 사용할 수 있다.
```

---

## 정리

| 섹션        | 개념               | 핵심                                                    |
| ----------- | ------------------ | ------------------------------------------------------- |
| Section 01  | 사용자 정의 자료형 | 클래스로 설계도를 만들고, new로 객체를 생성한다         |
| Section 02  | 캡슐화             | private 필드 + public getter/setter로 데이터를 보호한다 |
| Section 03  | 추상화             | 내부 구현을 숨기고 필요한 기능만 외부에 공개한다        |
| Section 04  | 생성자             | 객체 생성 시 필드를 초기화하는 특수 메서드              |
| Section 05a | 메서드 오버로딩    | 이름이 같고 시그니처가 다른 메서드를 여러 개 정의한다   |
| Section 05b | 매개변수 전달      | 기본형은 값 복사, 참조형은 주소 복사                    |

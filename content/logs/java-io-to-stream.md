## 목차
1. [Chapter 14. 입출력 (IO)](#chapter-14-입출력-io)
2. [Chapter 15. 열거형 (Enum)](#chapter-15-열거형-enum)
3. [Chapter 16. 람다식 (Lambda Expression)](#chapter-16-람다식-lambda-expression)
4. [Chapter 17. 스트림 (Stream API)](#chapter-17-스트림-stream-api)

---

# Chapter 14. 입출력 (IO)

## 1. 핵심 개념 및 상세 설명

### 1-1. 스트림의 분류와 특징
- **방향에 따른 분류**: 
    - **InputStream / Reader**: 외부에서 프로그램을 데이터를 읽어옴.
    - **OutputStream / Writer**: 프로그램에서 외부로 데이터를 내보냄.
- **단위에 따른 분류**:
    - **바이트 스트림 (`Stream` 계열)**: `byte` 단위 처리. 이미지, 오디오, 비디오 등 모든 바이너리 데이터에 사용.
    - **문자 스트림 (`Reader/Writer` 계열)**: `char` 단위(2byte) 처리. 텍스트 데이터 전용이며 유니코드(UTF-8 등) 인코딩을 자동으로 처리.

### 1-2. 보조 스트림 (Filter Stream)의 활용
보조 스트림은 성능 향상(`Buffered`), 기본형 데이터 처리(`Data`), 객체 직렬화(`Object`) 등의 기능을 추가합니다.
```java
// 객체 직렬화와 보조 스트림 결합 예시
try (ObjectOutputStream oos = new ObjectOutputStream(new BufferedOutputStream(new FileOutputStream("user.dat")))) {
    User user = new User("admin", "1234");
    oos.writeObject(user); // 객체를 파일에 저장
} catch (IOException e) {
    e.printStackTrace();
}
```

## 2. 실전 예제 보충
**파일 복사 예제 (성능 비교 체감)**
```java
public void copyFile(String src, String dest) {
    // Buffered를 사용하면 내부적으로 8KB 크기의 버퍼를 사용하여 속도가 수십 배 빠름
    try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(src));
         BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(dest))) {
        
        byte[] buffer = new byte[1024];
        int len;
        while ((len = bis.read(buffer)) != -1) {
            bos.write(buffer, 0, len);
        }
    } catch (IOException e) {
        e.printStackTrace();
    }
}
```

## 3. 주의사항 및 유의사항
- **자원 반납 (Resource Leak)**: 스트림을 열었다면 반드시 `close()`를 호출해야 한다. `try-with-resources` 문법을 사용하는 것이 가장 안전하고 권장된다.
- **flush()의 중요성**: 출력 스트림(특히 Buffered 계열)은 버퍼가 다 차지 않으면 데이터가 실제로 나가지 않을 수 있다. 작업 종료 전이나 중간에 `flush()`를 호출하여 데이터를 강제로 밀어내야 한다.
- **직렬화 (Serializable)**: `ObjectOutputStream`을 사용해 객체를 저장하려면 해당 클래스가 `java.io.Serializable` 인터페이스를 구현해야 한다. (구현하지 않으면 `NotSerializableException` 발생)
- **경로 구분자**: Windows(`\`)와 Unix/Mac(`/`)의 경로 구분자가 다르다. `File.separator`를 사용하면 운영체제에 독립적인 코드를 작성할 수 있다.

---

# Chapter 15. 열거형 (Enum)

## 1. 핵심 개념 및 상세 설명

### 1-1. Enum은 클래스다
Java의 Enum은 단순한 상수가 아니라 `java.lang.Enum`을 상속받는 **특수한 클래스**입니다. 따라서 메서드, 생성자, 필드를 가질 수 있으며 인터페이스 구현도 가능합니다.

### 1-2. 싱글톤 패턴과 Enum
Enum은 인스턴스가 JVM 내에 단 하나만 존재함을 보장합니다. 따라서 멀티스레드 환경에서도 안전한 가장 완벽한 **싱글톤(Singleton)** 구현 방법 중 하나로 꼽힙니다.

## 2. 실전 예제 보충
**상수별 메서드 구현 (전략 패턴)**
```java
public enum Operation {
    PLUS  { public double apply(double x, double y) { return x + y; } },
    MINUS { public double apply(double x, double y) { return x - y; } };

    public abstract double apply(double x, double y);
}

// 사용 시
double result = Operation.PLUS.apply(10, 20); // 30.0
```

## 3. 주의사항 및 유의사항
- **ordinal() 사용 지양**: `ordinal()`은 선언된 순서를 반환하지만, 상수의 순서가 바뀌면 로직이 깨질 위험이 크다. 순서값이 필요하다면 직접 별도의 필드(`private final int value`)를 선언해 관리해야한다.
- **switch 문 활용**: Enum과 `switch` 문은 궁합이 매우 괜찮다. 가독성을 높이고 모든 케이스를 처리했는지 확인하기 좋다.
- **생성자 접근 제한**: Enum의 생성자는 암시적으로 `private`이며, 외부에서 `new`로 생성할 수 없다.

---

# Chapter 16. 람다식 (Lambda Expression)

## 1. 핵심 개념 및 상세 설명

### 1-1. 변수 캡처 (Variable Capture)
람다식 내부에서 외부 지역 변수를 사용할 때, 그 변수는 **final**이거나 **effectively final**(값이 한 번도 바뀌지 않은 변수)이어야 합니다. 이는 람다가 실행될 때 지역 변수가 사라진 후에도 값을 참조할 수 있도록 복사본을 유지하기 때문입니다.

### 1-2. 타겟 타입 추론
컴파일러는 람다식이 대입되는 인터페이스의 추상 메서드 시그니처를 보고 파라미터 타입과 반환 타입을 추론합니다.

## 2. 실전 예제 보충
**복합 조건 Predicate 결합**
```java
Predicate<String> startWithA = s -> s.startsWith("A");
Predicate<String> lengthFive = s -> s.length() == 5;

// 두 조건을 AND 결합 (A로 시작하면서 길이가 5인 문자열)
Predicate<String> combined = startWithA.and(lengthFive);

System.out.println(combined.test("Apple")); // true
System.out.println(combined.test("Banana")); // false
```

## 3. 주의사항 및 유의사항
- **가독성 저해**: 람다가 너무 길어지면(예: 5줄 이상) 오히려 가독성이 떨어질 수 있다. 이럴 때는 별도의 메서드로 분리하고 **메서드 참조**를 사용하는 것이 좋다.
- **디버깅의 어려움**: 람다는 익명 함수이므로 스택 트레이스에서 위치를 찾기가 일반 메서드보다 어렵다
- **함수형 인터페이스 확인**: 람다를 쓰려는 인터페이스에 추상 메서드가 2개 이상이면 안 된다. `@FunctionalInterface` 어노테이션을 붙여 실수를 방지한다.

---

# Chapter 17. 스트림 (Stream API)

## 1. 핵심 개념 및 상세 설명

### 1-1. 중간 연산 vs 최종 연산
- **중간 연산**: `filter`, `map`, `sorted`, `peek` 등. 연산 결과가 다시 스트림이므로 체이닝(Chaining)이 가능합니다.
- **최종 연산**: `forEach`, `collect`, `count`, `reduce` 등. 스트림을 소모하며 결과를 반환합니다.

### 1-2. 병렬 스트림 (Parallel Stream)
`parallelStream()`을 사용하면 대량의 데이터를 멀티 코어를 활용해 병렬로 처리할 수 있습니다. 하지만 오버헤드가 발생할 수 있으므로 데이터가 아주 많을 때만 신중히 사용해야 합니다.

## 2. 실전 예제 보충
**flatMap을 이용한 리스트 평탄화**
```java
List<List<String>> complexList = Arrays.asList(
    Arrays.asList("A", "B"),
    Arrays.asList("C", "D")
);

// [["A", "B"], ["C", "D"]] -> ["A", "B", "C", "D"]
List<String> flatList = complexList.stream()
    .flatMap(Collection::stream)
    .collect(Collectors.toList());
```

## 3. 주의사항 및 유의사항
- **재사용 불가**: 스트림은 한 번 최종 연산을 수행하면 닫힌다. 다시 사용하려면 스트림을 새로 생성해야 한다.
- **지연 연산 (Lazy Evaluation)**: 최종 연산이 호출되기 전까지는 중간 연산이 아무것도 수행하지 않는다. `peek()` 같은 메서드로 로그를 찍을 때 최종 연산이 없으면 로그가 남지 않음
- **상태 유지 연산 주의**: `sorted()`, `distinct()` 같은 연산은 스트림의 모든 요소를 버퍼에 쌓아야 하므로 메모리 사용량이 급증할 수 있다. 무한 스트림에서는 주의가 필요하다.
- **사이드 이펙트 지양**: `forEach` 내부에서 외부 변수를 수정하는 행위는 지양해야 한다. 대신 `collect`나 `reduce`를 사용해 결과값을 반환받아서 사용.

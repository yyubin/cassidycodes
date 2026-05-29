# 예외 처리 & 입출력 (IO)

## 1. 예외 처리(Exception Handling)

### 예외(Exception)란 무엇인가

프로그램 실행 도중 발생하는 예상치 못한 오류를 **예외(Exception)**라고 한다.  
컴파일 에러와 달리 실행 중에 발생하며, 적절히 처리하지 않으면 프로그램이 강제 종료된다.

### try-catch-finally

예외가 발생할 가능성이 있는 코드를 `try` 블록에 넣고, 발생한 예외를 `catch` 블록에서 처리한다.

```java
try {
    // 예외 발생 가능성이 있는 코드
    et.checkEnoughMoney(3000, 1000);
    System.out.println("상품 구입 성공"); // 예외 발생 시 실행 안 됨
} catch (Exception e) {
    // 예외 발생 시 실행되는 코드
    System.out.println("상품 구입 실패: " + e.getMessage());
} finally {
    // 예외 발생 여부와 상관없이 무조건 실행되는 코드
    System.out.println("프로그램을 종료합니다.");
}
```

### throws와 throw

- **throws**: 메서드 선언부에 작성하며, 해당 메서드에서 발생한 예외를 호출한 쪽으로 떠넘긴다.
- **throw**: 개발자가 명시적으로 예외를 발생시킨다.

```java
public void checkEnoughMoney(int price, int money) throws Exception {
    if(money < price) {
        throw new Exception("돈이 부족합니다!!"); // 예외 던지기
    }
}
```

---

## 2. 사용자 정의 예외

Java가 제공하는 기본 예외 클래스 외에도 비즈니스 로직에 맞는 전용 예외 클래스를 직접 만들 수 있다.

### 사용자 정의 예외 클래스 작성

```java
public class NotEnoughMoneyException extends Exception {
    public NotEnoughMoneyException(String message) {
        super(message);
    }
}
```

### multi-catch

여러 예외를 하나의 `catch` 블록에서 처리할 때 `|` 기호를 사용한다.

```java
try {
    et.checkEnoughMoney(3000, 1000);
} catch (PriceNegativeException | MoneyNegativeException e) {
    System.out.println("입력값 오류: " + e.getMessage());
} catch (NotEnoughMoneyException e) {
    System.out.println("잔액 부족: " + e.getMessage());
}
```

---

## 3. 예외와 상속

오버라이딩 시 자식 클래스의 메서드는 부모 메서드가 던지는 예외보다 더 포괄적인(부모 타입의) 예외를 던질 수 없다.

```java
public class SuperClass {
    public void method() throws IOException {}
}

public class SubClass extends SuperClass {
    // 1. 부모와 동일한 예외 가능
    // 2. 부모 예외의 자식 타입(구체적인 예외) 가능
    @Override
    public void method() throws FileNotFoundException {}

    // 3. 예외를 던지지 않는 것도 가능

    // 4. 불가능: 부모보다 더 상위의 예외(Exception 등)나 다른 종류의 예외
}
```

---

## 4. File 클래스

파일이나 디렉토리에 대한 메타데이터(파일 크기, 경로, 이름 등)를 관리하는 클래스다.

```java
File file = new File("test.txt");

try {
    boolean isCreated = file.createNewFile(); // 실제 파일 생성
    System.out.println("상대 경로: " + file.getPath());
    System.out.println("절대 경로: " + file.getAbsolutePath());
    System.out.println("파일 삭제: " + file.delete());
} catch (IOException e) {
    e.printStackTrace();
}
```

---

## 5. 입출력 스트림(IO Stream)

데이터가 이동하는 통로를 **스트림(Stream)**이라고 한다.

### 바이트 스트림 (Byte Stream)

- 1바이트 단위로 데이터를 주고받는다.
- 이미지, 동영상, 텍스트 등 모든 파일에 사용 가능하다.
- `FileInputStream`, `FileOutputStream`

```java
// try-with-resources: 자원을 자동으로 반납(close)해주는 문법
try (FileOutputStream fout = new FileOutputStream("test.txt")) {
    fout.write(97); // 'a' 출력
} catch (IOException e) {
    e.printStackTrace();
}
```

### 문자 스트림 (Character Stream)

- 2바이트(char) 단위로 데이터를 주고받는다.
- 텍스트 파일 처리에 최적화되어 있다.
- `FileReader`, `FileWriter`

```java
try (FileWriter fw = new FileWriter("test.txt")) {
    fw.write("안녕하세요 반가워요");
} catch (IOException e) {
    e.printStackTrace();
}
```

---

## 6. 보조 스트림(Buffered Stream)

기본 스트림에 버퍼(Buffer)라는 임시 저장 공간을 추가하여 입출력 성능을 향상시키는 스트림이다.

- `BufferedReader`: `readLine()` 메서드를 통해 한 줄씩 읽기가 가능하다.
- `BufferedWriter`: 버퍼에 데이터를 모았다가 한 번에 출력한다.

```java
try (BufferedWriter bw = new BufferedWriter(new FileWriter("buffered.txt"));
     BufferedReader br = new BufferedReader(new FileReader("buffered.txt"))) {

    bw.write("버퍼를 이용한 출력입니다.");
    bw.flush(); // 버퍼의 내용을 강제로 비움

    String line;
    while((line = br.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
}
```

---

## 정리

| 개념             | 설명                           | 핵심 키워드                       |
| ---------------- | ------------------------------ | --------------------------------- |
| **Exception**    | 실행 중 발생하는 오류 처리     | `try-catch`, `throws`, `throw`    |
| **finally**      | 예외 발생 여부와 관계없이 실행 | 자원 반납 (close)                 |
| **File**         | 파일의 정보를 다루는 객체      | `createNewFile()`, `delete()`     |
| **Stream**       | 데이터가 흐르는 통로           | 단방향, FIFO                      |
| **Byte vs Char** | 1바이트 vs 2바이트 단위 처리   | `Input/Output` vs `Reader/Writer` |
| **Buffered**     | 성능 향상을 위한 임시 저장소   | `readLine()`, `flush()`           |

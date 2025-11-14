# Rust의 특별한 메모리 관리 방식
C/C++의 수동 메모리 관리는 완벽한 제어를 프로그래머에게 제공할 수 있지만, 그만큼 실수도 허용한다. Microsoft와 Google의 보안 보고서에 따르면, 심각한 보안 취약점의 약 70%가 메모리 안전성 문제에서 비롯된다고 밝혀진 바 있다.

반면 GC 언어들은 안전하지만, GC pause로 인한 예측 불가능한 지연, 메모리 오버헤드, 실시간 시스템이나 임베디드에서 사용이 어려운 문제들도 존재한다.  

**Rust의 아이디어**는 메모리 안전성 문제의 대부분을 패턴화 시켜, 이를 타입 시스템과 컴파일러로 강제할 수 있다는 것에서 촉발한다.

## 1. 메모리 레이아웃의 실제 구조
### 1-1. Stack vs Heap
```rust
fn example() {
    let x = 5;                          // Stack
    let s = String::from("hello");      // Stack + Heap
}
```

#### Stack 메모리 특징
- 컴파일 타임에 크기 결정
- LIFO 구조
- 함수 호출마다 스택 프레임 생성
- 매우 빠름 (단순 포인터 이동)
- 자동으로 정리됨 (함수 종료 시)

**레이아웃**
```plain
┌─────────────────┐  ← Stack Pointer (SP)
│ s (ptr, len,    │  String의 메타데이터
│    capacity)    │  24 bytes (64bit 기준)
├─────────────────┤
│ x = 5           │  4 bytes
├─────────────────┤
│ return address  │
└─────────────────┘
```

#### Heap 메모리 특징
- 런타임에 크기 결정
- 비선형적 할당
- 명시적 할당/해제 필요
- Stack 보다 느림 (allocator 호출)
- 크기 제한이 훨씬 큼

**레이아웃**
```plain
┌─────────────────────┐
│  "hello"의 실제       │  ← s.ptr이 가리키는 곳
│  바이트들: [104,       │     5 bytes (UTF-8)
│  101, 108, 108, 111]│
└─────────────────────┘
```

### 1-2. String의 내부 구조 (실제 메모리 배치)
```rust
pub struct String {
    vec: Vec<u8>,
}

pub struct Vec<T> {
    ptr: *mut T,      // 8 bytes (64bit): 힙 데이터의 주소
    cap: usize,       // 8 bytes: 할당된 용량
    len: usize,       // 8 bytes: 현재 길이
}
```

#### 예제
```rust
let mut s = String::from("hello");
s.push_str(" world");
```
```plain
초기 상태
Stack:                  Heap:
┌──────┬─────┬─────┐   ┌─────────────┐
│ ptr  │ len │ cap │──→│ "hello"     │
│ 0x.. │  5  │  5  │   │ [5 bytes]   │
└──────┴─────┴─────┘   └─────────────┘

push_str 후 (재할당 발생)
Stack:                  Heap:
┌──────┬─────┬─────┐   ┌─────────────────┐
│ ptr  │ len │ cap │──→│ "hello world"   │
│ 0x.. │ 11  │ 12  │   │ [11 bytes 사용]  │
└──────┴─────┴─────┘   │ [1 byte 여유]    │
                       └─────────────────┘
                        (이전 5byte 영역은 해제)
```
#### 중요 포인트
- `String`을 복사하면 24bytes만 복사됨 (포인터, 길이, 용량)
- 실제 문자열 데이터는 힙에 그대로 남음
- 이게 `shallow copy` 이자 rust에서는 `move`라고 부름

## 2. Ownership의 상세 규칙 
### 2-1. 소유권의 실제 의미
```rust
let s1 = String::from("hello");
```
- s1이 힙 메모리의 생명주기를 책임진다.
- s1이 스코프를 벗어나면 메모리가 해제된다.
- s1을 통해서만 이 메모리를 수정할 수 있다.

### 2-2. Move의 내부 동작(비트)
```rust
let s1 = String::from("hello");
let s2 = s1;  // Move 발생
```

#### 내부에서 발생하는 일
**move 이전**
```plain
s1: [ptr: 0x1000, len: 5, cap: 5] <- Stack
     │
     └──→ [h, e, l, l, o]  <- Heap (0x1000 주소)
```

**move 이후**
```plain
s1: [INVALID - 컴파일러가 사용 금지 조치]
s2: [ptr: 0x1000, len: 5, cap: 5]  <- Stack (24 bytes 복사됨)
     │
     └──→ [h, e, l, l, o]  <- Heap (똑같은 주소!)
```

#### s1을 무효화하는 이유
만약 s1을 계속 사용하도록 허용해주면,
```rust
// 만약 이게 가능했다면 (실제로는 컴파일 에러 발생함)
let s1 = String::from("hello");
let s2 = s1;
drop(s1);  // 힙 메모리 해제
println!("{}", s2);  // 사용 이후 해제
```

### 2-3. 함수 호출시, 소유권 이동
```rust
fn process_string(s: String) {
    println!("{}", s);
    // s가 여기서 drop됨
}

fn main() {
    let my_string = String::from("hello");
    process_string(my_string);  // 소유권 이동
    // my_string은 이제 사용 불가
}
```

#### 어셈블리 수준에서 보면
```asm
; main에서
; my_string을 stack에 구성 (24 bytes)
; process_string 호출 시 그 24 bytes를 인자로 복사
; 복사 후 my_string은 "moved" 상태로 표시 (컴파일러 추적)

; process_string에서
; 인자로 받은 s를 사용
; 함수 종료 시 s의 drop 호출
; → 힙 메모리 해제
```

#### 소유권을 돌려받으려면?
```rust
fn process_and_return(s: String) -> String {
    println!("{}", s);
    s  // 소유권을 다시 리턴
}

fn main() {
    let s1 = String::from("hello");
    let s2 = process_and_return(s1);  // s1 → 함수 → s2
    println!("{}", s2);  // 문제 없음
}
```

## 3. Copy vs Clone vs Move
### 3-1. Copy 트레이트의 조건과 동작
```rust
// Copy 가능한 타입들
let x: i32 = 5;
let y = x;  // 비트 단위 복사
println!("{}, {}", x, y);  // 둘 다 사용 가능

// Copy 불가능한 타입들
let s1 = String::from("hello");
let s2 = s1;  // Move
// println!("{}", s1);  // 컴파일 에러 발생
```

#### Copy 트레이트를 구현할 수 있는 조건
1. 모든 필드가 Copy 여야 함
2. Drop 트레이트를 구현하지 않아야 함 (Copy와 Drop은 상호배타적이다)

```rust
#[derive(Copy, Clone)]
struct Point {
    x: i32,
    y: i32,
}

// 하지만 이건 안 됨
// struct Container {
//     data: String,  // String은 Copy가 안됨
// }
```

> `#[derive(Copy, Clone)]` 은 그 구조체(또는 enum)에 대해 Copy와 Clone 트레이트 구현을 컴파일러가 자동으로 생성해달라는 뜻

#### 왜 Copy와 Drop이 동시에 불가능한가?
```rust
// 만약 가능하다면,
struct Dangerous {
    data: String,
}

impl Drop for Dangerous {
    fn drop(&mut self) {
        // 힙 메모리 해제
    }
}

impl Copy for Dangerous {}  // 여기에서 허용 안 함

fn main() {
    let d1 = Dangerous { data: String::from("hello") };
    let d2 = d1;  // 만약 Copy였다면??
    // d1 drop → 힙 해제
    // d2 drop → 같은 힙 다시해제 (두번 해제됨)
}
```

### 3-2. Clone의 명시적 복사
```rust
let s1 = String::from("hello");
let s2 = s1.clone();  // 힙 데이터까지 전부 복사

println!("{}, {}", s1, s2);  // 둘 다 사용 가능
```

#### Clone이 하는 일(String의 경우)
```rust
impl Clone for String {
    fn clone(&self) -> String {
        // 1. 새로운 힙 메모리 할당
        // 2. 기존 데이터를 새 메모리로 복사
        // 3. 새로운 String 구조체 생성
        String {
            vec: self.vec.clone(),  // Vec도 deep copy
        }
    }
}
```

```plain
s1: [ptr: 0x1000, len: 5, cap: 5] → [h,e,l,l,o] (0x1000)
s2: [ptr: 0x2000, len: 5, cap: 5] → [h,e,l,l,o] (0x2000)
                                     ↑ 완전히 별개의 메모리 사용됨
```

#### 성능 비교
- Copy: 스택 복사만(매우 빠름, 보통 수 ns)
- Move: 스택 복사만(Copy와 동일한 속도)
- Clone: 스택 + 힙 복사(크기에 비례함)

## 4. Borrowing Deepdive..
### 4-1. 불변 참조의 내부 구조
```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}

let s1 = String::from("hello");
let len = calculate_length(&s1);
```

#### 메모리 레이아웃
```plain
Stack
s1: [ptr: 0x1000, len: 5, cap: 5]  (소유자)
     │
     └──→ Heap: [h,e,l,l,o] (0x1000)

calculate_length의 스택 프레임
s: [0xA000]  ← s1의 주소를 담은 참조 (8 bytes)
    │
    └──→ s1 (Stack의 0xA000 위치)
```

**중요한 점**
- 참조 자체는 8bytes이다. (64비트 시스템 기준)
- 참조는 소유권이 없음 -> drop 되더라도 힙 메모리 해제 안함
- 읽기만 가능, 수정 불가 (수정 가능한 참조는 추후 설명)

### 4-2. 가변 참조의 독점 규칙
```rust
let mut s = String::from("hello");
let r1 = &mut s;
// let r2 = &mut s;  // 컴파일 에러: 두 번째 가변 참조 불가능

r1.push_str(" world");
```

#### 왜 &mut는 하나만 허용되는가?
결론적으로는 경쟁 조건 방지를 위해서이다.
```rust
// 만약 여러 &mut이 가능했다면
let mut vec = vec![1, 2, 3];
let r1 = &mut vec;
let r2 = &mut vec;

r1.push(4);  // vec 재할당 가능 (내부 포인터 변경)
println!("{}", r2[0]);  // r2가 가리키는 메모리는 이미 해제됨!
```

#### NLL (Non-Lexical Lifetimes) 덕분에 가능한 패턴
> Rust 2018 에서 도입
```rust
let mut s = String::from("hello");

let r1 = &s;
let r2 = &s;
println!("{} {}", r1, r2);  // r1, r2의 마지막 사용

let r3 = &mut s;  // OK: r1, r2가 더 이상 사용되지 않음
r3.push_str(" world");
```

**Rust 2018 이전에서**
```rust
let mut s = String::from("hello");

let r1 = &s;
let r2 = &s;
// let r3 = &mut s;  // 여기서 에러 발생 (r1, r2가 스코프 내에 있음)
println!("{} {}", r1, r2);
```

**NLL 덕분에 r1/r2가 실제로 더 이상 사용되지 않는 시점에 borrow가 종료된 것으로 처리되어 중간에 가변 빌림을 허용할 수 있게 되는 것이다**

#### 참조는 항상 유효해야 함 (dangling reference 금지)
```rust
fn dangle() -> &String {  // 컴파일 에러 발생..
    let s = String::from("hello");
    &s  // s가 drop되므로 참조가 무효화됨
}  // s dropped here

// 올바른 방법
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 소유권 이동
}
```

## 5. Drop 트레이트의 분석
### 5-1. Drop의 호출 순서
```rust
struct Outer {
    inner: Inner,
    name: String,
}

struct Inner {
    data: Vec<i32>,
}

impl Drop for Outer {
    fn drop(&mut self) {
        println!("Dropping Outer: {}", self.name);
        // 이후 자동으로 필드들의 drop 호출
    }
}

impl Drop for Inner {
    fn drop(&mut self) {
        println!("Dropping Inner");
    }
}

fn main() {
    let outer = Outer {
        inner: Inner { data: vec![1, 2, 3] },
        name: String::from("test"),
    };
}
```
```plain
// 출력
// Dropping Outer: test
// Dropping Inner
// (Vec의 drop)
// (String의 drop)
```

#### Drop 순서 규칙
1. 변수의 `Drop::drop()` 호출 (구현된 경우에)
2. 필드들을 선언 순서대로 drop
3. 내부 타입들의 drop은 재귀적으로 호출

### 5-2. 조기 Drop과 std::mem::drop
```rust
let s = String::from("hello");
// drop(s);  // Drop::drop을 직접 호출 불가

std::mem::drop(s);  // 소유권을 가져가서 즉시 버림
// println!("{}", s);  // s는 이미 move되어 컴파일 에러
```

#### std::mem::drop의 구현 (매우 단순함)
```rust
pub fn drop<T>(_x: T) {
    // 실제로 아무것도 안 한다
    // 인자로 소유권을 받았으므로 함수 종료 시 자동으로 drop됨
}
```

### 5-3. Drop과 Panic Safety
```rust
impl Drop for MyType {
    fn drop(&mut self) {
        // drop 중에는 panic하면 안 된다.
        // panic이 발생하면 abort됨
        
        // 안전한 방법
        if let Err(e) = self.cleanup() {
            eprintln!("Cleanup failed: {}", e);
            // 에러 로깅만 하고 계속 진행하기
        }
    }
}
```

## 6. 스마트 포인터 상세
### 6-1. Box<T>의 활용 및 성능
```rust
// 재귀 타입 정의 (Box 없이는 불가능)
enum List {
    Cons(i32, Box<List>),
    Nil,
}

// 왜 Box가 필요한가?
// enum List {
//     Cons(i32, List),  // 무한 크기
//     Nil,
// }
// 컴파일러는 List의 크기를 알 수 없음
```

#### Box의 메모리 레이아웃
```plain
Stack                 Heap 
┌─────────┐          ┌─────────┐
│ Box ptr │─────────→│  value  │
└─────────┘          └─────────┘
 8 bytes              sizeof(T)
```
**성능 특성**
- 할당: `malloc` 호출 -> 느림
- 역참조: 단일 포인터 접근 -> 빠름
- 해체: `free` 호출 -> 느림

```rust
// 성능 비교
let stack_value = 42;           // 매우 빠름
let box_value = Box::new(42);   // 힙 할당 오버헤드

// 하지만 큰 데이터는 Box가 더 나을 수 있음
let huge = [0; 1000000];        // 스택 오버플로우 위험이 있기 때문에
let huge_box = Box::new([0; 1000000]);  // 안전
```

### 6-2. Rc<T>의 내부 구조와 동작
```rust
use std::rc::Rc;

let a = Rc::new(String::from("hello"));
let b = Rc::clone(&a);  // 참조 카운트만 증가
let c = a.clone();      // 위와 동일

println!("Count: {}", Rc::strong_count(&a));  // 3
```

#### Rc의 실제 메모리 구조
```rust
struct RcBox<T> {
    strong: Cell<usize>,  // 강한 참조 카운트
    weak: Cell<usize>,    // 약한 참조 카운트
    value: T,
}
```
```plain
Stack:              Heap:
a: [ptr]────────→ ┌──────────────┐
b: [ptr]────────→ │ strong: 3    │
c: [ptr]────────→ │ weak: 0      │
                  │ value: "..." │
                  └──────────────┘
```

#### Rc의 clone vs 일반 clone
```rust
let s = String::from("hello");
let s_clone = s.clone();  // 실제 데이터 복사

let rc = Rc::new(String::from("hello"));
let rc_clone = Rc::clone(&rc);  // 포인터만 복사, 카운트 +1
```
둘 다 이름은 `clone`이지만, 
- String::clone() -> 힙 데이터 전체를 깊은 복사
- Rc::clone() -> String은 복사하지 않고, Rc의 참조 카운트만 +1, 포인터만 복사

#### Rc의 한계
**Rc는 멀티스레드에서 사용 할 수 없다.**
```rust
// use std::thread;
// 
// let rc = Rc::new(5);
// thread::spawn(move || {
//     println!("{}", rc);  // 컴파일 에러: Rc는 Send가 아님
// });
```

> Rc는 내부의 참조 카운트를 원자적으로(atomic) 증가/감소하지 않기 때문에,
> 멀티스레드 환경에서는 데이터 레이스가 발생할 수 있어서 Send/Sync가 아니다.

태생적으로 데이터 레이스가 가능 해서 Send/Sync 구현이 불가능하다.

### 6-3. Arc<T>의 원자성 보장
```rust
use std::sync::Arc;
use std::thread;

let data = Arc::new(vec![1, 2, 3]);

let handles: Vec<_> = (0..3)
    .map(|_| {
        let data_clone = Arc::clone(&data);
        thread::spawn(move || {
            println!("{:?}", data_clone);
        })
    })
    .collect();

for handle in handles {
    handle.join().unwrap();
}
```
#### Arc::new(vec![1,2,3]) — 힙에 데이터 + Arc 헤더 생성
- `vec![1,2,3]` 실제 데이터는 힙에 저장
- Arc는 그 데이터로 가는 스마트 포인터
- 내부 strong_count(참조 카운트)를 추적 

초기 상태는 다음과 같다
```rust
Arc {
    strong_count = 1
    data = vec![1,2,3]
}
```

#### .map(|_| { ... }) — 3개의 스레드를 생성하려는 루프
각 반복에서, 
```rust
let data_clone = Arc::clone(&data);
```
`Arc::clone(&data)`는 데이터를 깊이 복사하지 않는다.  
- strong_count += 1
- Arc 포인터만 복사

반복이 되면서 strong_count는 다음과 같이 됨.
```plain
초기: 1
1번 clone → 2
2번 clone → 3
3번 clone → 4
```

#### thread::spawn(move || {...}) — 클로저가 data_clone을 소유
여기에서 **move closure**가 중요하다.  
```rust
thread::spawn(move || {
    println!("{:?}", data_clone);
})
```
- move 클로저는 **data_clone의 소유권을 새 스레드로 이동**
- 각 스레드는 Arc<T> 하나씩 독립적으로 “소유” 하지만
- 실제 데이터는 Arc가 관리하는 **공유 힙 데이터 하나뿐임!!**

스레드 3개가 모두 같은 데이터를 참조한다.

#### 스레드 내부에서 println!("{:?}", data_clone)
각 스레드는, 
- `Arc<String>`이 아니라 `Arc<Vec<i32>>` 를 들고 있다.
- `Arc는 Deref<Target = T>`를 구현하므로 자동 역참조 됨.
- 결국 `vec![1,2,3]` 을 그대로 읽어 출력

여기에서 데이터는 **읽기만**하기에 Lock을 사용할 필요는 없다.  
Arc는 "스레드 안전한 공유"를 보장하지만 내부 데이터는 불변일 때만 Lock 없이 안전함!

#### handles: Vec<JoinHandle<()>>
`thread::spawn`은 `JoinHandle`을 반환한다.
- 스레드 핸들이라 보면 됨
- `.join()` 호출 시, 그 스레드가 끝날 때까지 기다린다
- 패닉 발생시 바로 Err

고로 `handles`는 `JoinHandle`를 3개를 담은 벡터임.  
그래서 `for handle in handles { handle.join().unwrap(); }` 에서 3개의 스레드를 모두 기다린다.  

스레드가 끝나면서
- 스레드 내부의 `Arc<T>`가 drop되어 `strong_count -= 1`
- 모든 스레드 종료 후 `strong_count`는 1 (메인 스레드 소유)
- 메인 스레드 종료 시 `strong_count` == 0 → 데이터 drop 

## 7. Lifetime에 대한 이해
### 7-1. Lifetime이 필요한 이유
```rust
// 컴파일러는 이걸 어떻게 판단할까?
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}

// 잘못된 사용 예시
let result;
{
    let s1 = String::from("long string");
    let s2 = String::from("short");
    result = longest(&s1, &s2);  
}  // s2가 여기서 drop
// println!("{}", result);  // result가 s2를 가리킬 수도 있다
```

왜냐면, 컴파일러 입장에서,
- `x`는 어떤 라이프타임 `'a`를 가진 `&'a str`
- `y`는 어떤 라이프타임 `'b`를 가진 `&'b str`
- 리턴 타입 `&str`의 라이프타임이 어디에도 명시되어 있지 않음

그래서 다음과 같이 가정하게 되는데
```rust
fn longest<'a, 'b>(x: &'a str, y: &'b str) -> &str { ... }
```
여기서 문제가 되는 건

- `x`를 리턴하면 `&'a str`을 리턴하는 셈이고
- `y`를 리턴하면 `&'b str`을 리턴하는 셈인데

리턴 타입 `&str`에는 `'a`도, `'b`도 안 붙어 있음
그래서 **리턴 참조가 얼마나 오래 살아야 하는지** 알 수가 없다.

#### Lifetime 표기로 다음과 같이 해결할 수 있다.
```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// 'a의 의미 : "리턴값은 x와 y 중 짧은 쪽의 lifetime과 같다"
```

여기서 `'a`는 
- x와 y는 둘 다 최소 `'a`만큼은 살아있어야 한다
- 리턴값도 `'a`까지는 유효하다
- 리턴값은 x/y 중 하나에 붙어 있고, x와 y가 살아있는 공통 구간에서만 쓸 수 있다는 계약이 된다

> 조금 더 엄밀하게 말하면, 함수는 둘 다 `'a` 이상 살아있는 `&str` 두 개를 받고
> 그 `'a`까지 유효한 `&str` 하나를 돌려준다

호출하는 쪽에서 보면 **x와 y의 공통으로 살아있는 구간**에만 result를 사용할 수 있기 때문에,  
결과적으로 리턴값이 x와 y중 더 짧은 쪽보다 길게 사용할 수 없다는 의미가 되는 것이다.

더더 풀면,
- 두 참조가 둘 다 살아있는 동안에만 이 함수를 호출할 수 있고,
- 함수가 리턴한 참조도 그 둘의 공통 생존 구간에서만 사용할 수 있게 강제함.

### 7-2. Lifetime Elision (생략 규칙)
#### 컴파일러가 자동으로 추론하는 경우
```rust
// 우리가 쓰는 코드
fn first_word(s: &str) -> &str {
    // ...
}

// 컴파일러가 이해하는 코드
fn first_word<'a>(s: &'a str) -> &'a str {
    // ...
}
```
“라이프타임 검사를 안 하는” 게 아니라 “생략한 걸 컴파일러가 반드시 같은 방식으로 복원해 준다”는 것
#### 생략 규칙 3가지
**1. 각 참조 인자는 고유한 lifetime을 받음**
```rust
fn foo(x: &i32, y: &i32)
// → fn foo<'a, 'b>(x: &'a i32, y: &'b i32)
```
- 입력에 `&T`가 N개 있으면 N개의 서로 다른 lifetime 파라미터를 가정
- 이 시점에서는 아직 “둘이 같을 수도 있다”는 정보는 없음. 
- 그냥 각각 독립된 `'a`, `'b`, `'c` … 로 놓고 시작.
**2. 입력 lifetime이 하나면, 출력에도 적용**
```rust
fn foo(x: &i32) -> &i32
// → fn foo<'a>(x: &'a i32) -> &'a i32
```
조건
1. 입력 인자 중 참조 타입이 단 하나 (&T 하나)
2. 반환 타입이 참조 (&U)

그러면 “출력 참조의 라이프타임 = 그 하나뿐인 입력 참조의 라이프타임” 이라고 본다.  
**3. &self나 &mut self가 있으면, self의 lifetime을 출력에 적용**
```rust
impl MyType {
    fn get_data(&self) -> &str
    // → fn get_data<'a>(&'a self) -> &'a str
}
```
- 메서드 시그니처에 `&self` 또는 `&mut self`가 있을 때
- 반환 타입이 참조라면, “그 참조는 기본적으로 self에 붙어 있다”고 간주
- 메서드 대부분이 “자기 자신 내부의 뭔가를 참조해서 돌려주는 패턴”이기 때문

### 7-3. 구조체의 Lifetime
```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();
    
    let excerpt = ImportantExcerpt {
        part: first_sentence,
    };
    
   // excerpt는 novel보다 오래 살 수 없음
}  // excerpt drop → novel drop
```
#### struct ImportantExcerpt<'a> 가 말하는 것
```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}
```
이 선언은 타입 수준의 약속이다. 
> `ImportantExcerpt<'a>` 타입의 값은 적어도 `'a` 동안은 유효한 `&str`를 안에 들고 있다.

- `ImportantExcerpt<'a>` 자체가 `'a`까지 살아야 한다는 뜻이 아니라,
- 그 안에 들어 있는 `&'a str`이 가리키는 데이터가 `'a` 동안 살아 있어야 한다는 것

그래서 이 구조체를 사용할 때 항상 아래와 같은 관계가 생긴다.
```plain
데이터(&str의 원본) ────── 최소 이만큼 살아야 함 ('a)
          ▲
          │
     &str (part)
          ▲
          │
 ImportantExcerpt<'a>
```
**그래서 struct 값(excerpt)은 자기가 들고 있는 참조가 유효한 기간을 절대 넘길 수 없음.**

#### 올바른 사용
```rust
fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();
    
    let excerpt = ImportantExcerpt {
        part: first_sentence,
    };
    
}  // 여기서 drop 순서: excerpt -> novel
```
이때의 라이프 타임을 시각화 했을때,
```plain
main 스코프:   |-------------------------------------------|
novel:       |-------------------------------------------|
first_sent:  |------------------------------|
excerpt:     |------------------------------|
```

- `novel`은 `String`이라 소유권을 가지고 있고, `"Call me Ishmael..."` 데이터는 힙에 있음
- `first_sentence: &str`는 `novel` 내부 버퍼 일부를 가리키는 슬라이스 -> **first_sentence는 novel보다 오래 살 수 없음**
- `ImportantExcerpt { part: first_sentence }` 를 만들면
    - `excerpt.part`가 `first_sentence`를 담고 있으니
    - 자연스럽게 `excerpt`도 `novel`보다 오래 살 수 없다

실제로, 스코프 끝에서 **drop 순서는** 대략 `excerpt` -> `novel` 이다.
`excerpt`가 먼저 없어지고, 그다음에 `novel`이 drop 은 안전함.

#### 잘못된 사용
```rust
let excerpt;
{
    let novel = String::from("...");
    let first = novel.split('.').next().unwrap();
    excerpt = ImportantExcerpt { part: first };
}  // novel이 여기서 drop
// println!("{}", excerpt.part);  
// dangling reference
```
겉으로 보면, `excerpt`는 바깥에 선언 되어있어 바깥 스코프까지 살아 있음.  
하지만 그 안에 넣음 `part`는 **안쪽 블록에 있던 `novel`의 슬라이스**

라이프타임을 그리면,
```plain
outer scope: |------------------------------ excerpt ------------------------------|

inner block:       |------------- novel, first, ImportantExcerpt { part: &novel } -|
                   ^                                                     ^
                   |                                                     |
                 &novel (first, excerpt.part)

```
- `excerpt는` 바깥 스코프 끝까지 살아야 하고,
- `excerpt.part`는 `novel` 내부를 가리키는데,
- `novel`은 안쪽 블록 끝에서 drop됨.

그래서 다음과 같은 순서로 모순이 발생
1. `excerpt`의 `lifetime` = 바깥 스코프 전체, `'outer`
2. `novel`의 `lifetime` = 안쪽 블록, `'inner`
3. `first: &'inner str`
4. `ImportantExcerpt<'a>` 에 `part: &'a str`를 넣으려면,
    - 최소 `'a = 'inner` 이상이어야 함.
    - 그런데 `excerpt`는 `'outer` 동안 살아야 하므로, `'a`는 `'outer`에 맞춰야 한다.
5. 결과적으로 `'outer ≤ 'inner` 같은 식의 말도 안 되는 관계가 되어버림

그래서 컴파일 수준에서 막히는 것이다.


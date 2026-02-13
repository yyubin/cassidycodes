해당 글은 컴파일 타임에 어노테이션을 분석하는 Java Annotation Processing Tool(APT)를 활용하여 이를 기반으로 라이브러리를 만들면서 발생한 문제점들과 해결방안, APT 사용 시의 유의사항을 중점으로 작성한다.

# 1. Java APT 기초
APT는 자바 컴파일러(javac)에 내장된 확장 메커니즘으로, 컴파일 시점에 소스 코드의 어노테이션을 분석하고 추가적인 소스 파일이나 리소스를 생성할 수 있게 해준다. 

```plain
┌─────────────────────────────────────────────────────────────┐
│                    Java Compilation                          │
│                                                              │
│  Source Files ──▶ Parser ──▶ AST ──▶ Annotation Processing  │
│                                            │                 │
│                                            ▼                 │
│                                    ┌──────────────┐          │
│                                    │  Processor   │          │
│                                    │  (Jinx)      │          │
│                                    └──────┬───────┘          │
│                                           │                  │
│                                           ▼                  │
│                               Generated Files / Resources    │
│                                           │                  │
│                                           ▼                  │
│                                    Bytecode (.class)         │
└─────────────────────────────────────────────────────────────┘
```

위와 같은 단계로 진행이 된다. 그래서 APT로 중간에 코드 생성 및 삽입도 가능함. 

주요 컴포넌트는 다음과 같다.
| 컴포넌트 | 역할 |
|---------|------|
| `Processor` | 어노테이션 프로세서의 기본 인터페이스 |
| `AbstractProcessor` | Processor의 편의 구현체 |
| `ProcessingEnvironment` | 컴파일러가 제공하는 유틸리티 접근점 |
| `RoundEnvironment` | 현재 처리 라운드의 정보 |
| `Elements` | 프로그램 요소(클래스, 메서드 등) 유틸리티 |
| `Types` | 타입 미러 유틸리티 |
| `Filer` | 파일 생성 유틸리티 |
| `Messager` | 컴파일 메시지 출력 |

## 라운드 기반 처리
APT의 가장 중요한 특성은 **라운드 기반 처리**이다.

1. Round1: 원본 소스 파일 처리
2. Round2: Round1에서 생성된 파일 처리(있는 경우에)
3. RoundN: 더 이상 새 파일이 생성되지 않을 때 까지 반복
4. Final Round: 최종 정리 작업 수행

# 2. APT 사용 시 주의점
이는 강력한 도구이지만 런타임 리플렉션과는 근본적으로 다른 환경에서 동작한다.  
이 섹션에서는 Jinx를 개발 과정에서 겪었던 어려움과 해결 방법을 공유한다.  

## 2.1 클래스 로딩 불가
APT는 **컴파일 타임**에 실행되므로, 분석 대상 클래스는 아직 바이트코드로 컴파일되지 않았다. 따라서 런타임 리플렉션 API를 사용할 수 없다.

```java
// 절대 불가능
Class<?> entityClass = Class.forName("com.example.User");
Field[] fields = entityClass.getDeclaredFields();

// APT 방식: TypeMirror와 Element 사용
TypeElement typeElement = elements.getTypeElement("com.example.User");
List<? extends Element> members = typeElement.getEnclosedElements();
```

### 2.1.1 어노테이션의 Class<?> 속성 접근: 의도적 예외 활용 패턴
APT에서 가장 당황스러운 부분 중 하나는 어노테이션의 `Class<?>` 타입 속성에 접근하는 방법이다.  
직관적으로 `annotation.converter()`를 호출하면 될 것 같지만, **반드시 예외가 발생**.  

```java
// @Convert(converter = MoneyConverter.class) 에서 converter 클래스 정보 추출

// 이렇게 하면 MirroredTypeException 발생함 무조건
Convert convert = field.getAnnotation(Convert.class);
Class<?> converterClass = convert.converter();  // 예외 발생!
```

이것은 버그가 아니라 **의도된 동작**이다. 컴파일 타임에는 `MoneyConverter.class`가 아직 컴파일되지 않았으므로 `Class` 객체를 반환할 수 없다. 대신 `MirroredTypeException`을 던지고, 이 예외 안에 `TypeMirror`가 담겨 있다.

**Jinx의 실제 구현 (EntityFieldResolver.java)**

```java
// Handle @Convert (field-level or autoApply)
Convert convert = field.getAnnotation(Convert.class);
if (convert != null) {
    try {
        // 언제나 예외
        convert.converter();
    } catch (javax.lang.model.type.MirroredTypeException mte) {
        // 예외에서 TypeMirror를 추출
        TypeMirror typeMirror = mte.getTypeMirror();
        builder.conversionClass(typeMirror.toString());
    }
}
```
처음 보면 이상해 보이지만, 이것이 APT에서 `Class<?>` 타입 어노테이션 속성을 다루는 **공식적이고 권장되는 방법**이다.  
예외를 에러가 아닌 데이터 추출 메커니즘으로 사용하는 것이다.  

### 2.1.2 배열 타입 Class<?>[] 처리
`@JoinColumns`처럼 여러 클래스를 배열로 받는 경우는 `MirroredTypesException` (복수형)을 사용해야 한다.
```java
try {
    annotation.value();  // Class<?>[] 타입
} catch (javax.lang.model.type.MirroredTypesException mte) {
    List<? extends TypeMirror> typeMirrors = mte.getTypeMirrors();
    for (TypeMirror tm : typeMirrors) {
        // 각 타입 처리
    }
}
```

### 2.1.3 AnnotationMirror를 통한 대안적 접근
예외 기반 접근이 불편하다면, `AnnotationMirror` API를 통해 더 명시적으로 접근할 수도 있다.

```java
// AnnotationMirror를 통한 안전한 접근
private TypeMirror getTargetEntityMirror(Element element) {
    for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
        if (mirror.getAnnotationType().toString().equals("jakarta.persistence.ManyToOne")) {
            for (var entry : mirror.getElementValues().entrySet()) {
                if (entry.getKey().getSimpleName().toString().equals("targetEntity")) {
                    return (TypeMirror) entry.getValue().getValue();
                }
            }
        }
    }
    return null;
}
```

두 방법 모두 유효하며 상황에 따라 두 가지를 혼용했다.
- 단순한 경우, 예외를 받아 처리하는게 코드가 짧아서 사용하기도 하고
- 복잡한 조건 처리가 필요하다면 AnnotationMirror 방식을 사용했다

## 2.2 TypeElement/TypeMirror의 라운드 유효성
APT에서 가장 흔한 실수 중 하나는 이전 라운드의 `TypeElement`나 `TypeMirror`를 다음 라운드에서 사용하는 것이다.

```java
// 위험: 라운드 간 TypeElement 저장
private Map<String, TypeElement> globalCache = new HashMap<>();  // init()에서 생성

@Override
public boolean process(...) {
    // Round 1에서 저장
    globalCache.put("User", typeElement);

    // Round 2에서 사용 시도 → 예측 불가능한 동작 또는 예외
    TypeElement cached = globalCache.get("User");
    cached.getEnclosedElements();  // 문제 발생 가능
}
```

이러한 문제를 해결하기 위해,
```java
// 라운드 시작 시 캐시 초기화
public void beginRound() {
    descriptorCache.clear();
    mappedSuperclassElements.clear();
    embeddableElements.clear();
    // ...
}

// 필요할 때 FQN으로 다시 조회
TypeElement freshElement = elements.getTypeElement("com.example.User");
```

캐싱을 하는 방식으로 사용했다.

## 2.3 처리 순서 비보장
컴파일러는 소스 파일을 어떤 순서로든 처리할 수 있다. 이는 엔티티 간 의존 관계가 있을 때 문제가 발생한다.

> `Parent.java`가 먼저 컴파일 되고, `Child.java`가 컴파일 되는 것이 아니다. `Child`가 이른 라운드에 등장하면 처리할 때 Parent PK 정보가 필요하지만, Parent가 아직 처리 되지 않은 상황이 충분히 발생할 수 있음.

**지연 처리 큐**를 만들어 두어 의존성이 해결될 때까지 처리를 지연시킨다.

```java
if (parentEntity == null) {
    // 아직 준비 안됨 → 나중에 다시 시도
    context.getDeferredEntities().offer(childEntity);
    return;
}
```

## 2.4 증분 컴파일(Incremental Compilation) 문제
IDE나 빌드 도구의 증분 컴파일 시, 변경되지 않은 파일은 다시 컴파일되지 않는다. 이는 APT에서 심각한 문제를 일으킬 수 있다.

> `User.java`만 수정한 경우를 생각했을때, 증분 컴파일이 발생하면 `User.java`는 다시 컴파일되지만 `Order.java`는 컴파일이 스킵된다. 이런 경우, `Order.java`가 `@ManyToOne`으로 참조하는데 Order의 TypeElement가 RoundEnvironment에 없는 경우가 있다는 것이다. 

이를 해결하기 위해 매번 전체 스키마를 JSON으로 출력한다.  
그리고 이전 스키마 파일과 현재 스키마를 비교하여 변경점을 감지하기에 증분 컴파일 문제를 런타임에 보완한다고 볼 수 있다.(java application 런타임을 의미하는 것은 아니다)

## 2.5 에러 리포팅과 디버깅
APT에서의 디버깅은 일반 애플리케이션보다 훨씬 어렵다.

**주요 문제점들**

1. **브레이크포인트 설정 어려움**: 컴파일러 플러그인으로 실행되므로 IDE 디버거 연결이 복잡
2. **System.out.println() 출력 위치**: 빌드 로그에 섞여 찾기 어려움
3. **스택 트레이스 해석**: 컴파일러 내부 호출 스택과 섞임

그래서,

```java
// Messager를 통한 구조화된 로깅
context.getMessager().printMessage(
    Diagnostic.Kind.NOTE,  // NOTE, WARNING, ERROR 중 선택
    "Processing entity: " + entityName,
    typeElement  // 문제 위치를 정확히 가리킴
);

// 에러 발생 시 Element 참조 포함
context.getMessager().printMessage(
    Diagnostic.Kind.ERROR,
    "@MapsId(\"" + keyPath + "\") could not find matching PK attribute",
    descriptor.elementForDiagnostics()  // IDE에서 해당 위치로 점프 가능
);
```

하게 만들어 사용자가 디버깅을 할 때의 도움을 주고자 했다.  

추가로 APT에서의 디버깅 팁은 다음과 같다.
```bash
# Gradle에서 APT 디버깅 활성화 시키기
./gradlew compileJava --debug-jvm

# 또는 컴파일러 옵션으로 상세 로그 활성화 시키기
javac -verbose -XprintRounds ...
```

### 2.6 다중 프로세서 실행 순서
프로젝트에 여러 어노테이션 프로세서가 있을 때, 실행 순서가 보장되지 않는다.

> Lombok + Jinx + Mapstruct 를 함께 사용하면
> Lombok이 getter을 생성하기전에 Jinx가 실행되는 경우가 있을 것이다.
> `@Access(PROPERTY)` 엔티티에서 getter를 찾지 못할 수 있음

이를 명확하게 처리하고 싶다면 다른 APT 라이브러리도 의존해서 처리해야함. 하지만 그렇게 하고 싶지 않았다..

```java
// 필드 기반 분석 우선, getter는 보조적으로 사용
// → Lombok 의존성 최소화

// 존재하지 않는 getter에 대해 graceful fallback
if (getter == null && defaultAccessType == AccessType.PROPERTY) {
    // Fallback to field access if no getter found
    if (field != null) {
        return Optional.of(new FieldAttributeDescriptor(field, ...));
    }
}
```
하는 방식으로 사용 중이다.

## 2.7 흔한 실수 요약
| 실수 | 증상 | 해결책 |
|-----|------|--------|
| `Class.forName()` 사용 | `ClassNotFoundException` | `Elements.getTypeElement()` 사용 |
| 어노테이션의 Class 속성 직접 접근 | `MirroredTypeException` | `AnnotationMirror` API 사용 |
| 라운드 간 TypeElement 캐싱 | 예측 불가능한 동작 | 라운드 시작 시 캐시 초기화 |
| 처리 순서 가정 | 간헐적 NPE | 지연 처리 큐 사용 |
| `element.getAnnotation()` null 체크 누락 | NPE | 항상 null 체크 |
| 증분 컴파일 미고려 | 불완전한 출력 | clean build 또는 파일 기반 상태 관리 |


# 3. 지연 처리 메커니즘
JPA 엔티티 간에는 복잡한 의존 관계가 있다

1. **JOINED 상속**: 자식 엔티티가 부모 엔티티의 PK를 FK로 참조
2. **@MapsId**: FK 컬럼이 동시에 PK 역할
3. **@ManyToOne/@OneToOne**: 다른 엔티티의 PK를 FK로 참조

컴파일러가 소스 파일을 처리하는 순서는 보장되지 않으므로, 참조 대상 엔티티가 아직 처리되지 않았을 수 있음.

```java
private final Queue<EntityModel> deferredEntities = new ArrayDeque<>();
private final Set<String> deferredNames = new HashSet<>();
```

엔티티 처리 중 의존성이 해결되지 않으면 큐에 추가한다.

```java
// EntityHandler.java
private void processInheritanceJoin(TypeElement type, EntityModel childEntity) {
    // 부모 엔티티 조회
    EntityModel parentEntity = context.getSchemaModel().getEntities()
        .get(parentType.getQualifiedName().toString());

    if (parentEntity == null) {
        // 부모가 아직 처리되지 않음 → 지연 처리
        context.getDeferredNames().add(childName);
        context.getDeferredEntities().add(childEntity);
        return;
    }
    // 정상 처리 계속...
}
```

최종 라운드에서 지연된 엔티티들을 처리한다.

```java
// JpaSqlGeneratorProcessor.java - process() 메서드
if (roundEnv.processingOver()) {
    // 동적 재시도 횟수 계산
    int entityCount = context.getSchemaModel().getEntities().size();
    int maxPass = Math.max(20, entityCount * 2);
    int noProgressCount = 0;
    int previousSize = context.getDeferredEntities().size();

    for (int pass = 0; pass < maxPass && !context.getDeferredEntities().isEmpty(); pass++) {
        entityHandler.runDeferredPostProcessing();

        int currentSize = context.getDeferredEntities().size();

        // 데드락 감지: 3회 연속 진전 없음
        if (currentSize == previousSize) {
            noProgressCount++;
            if (noProgressCount >= 3) {
                context.getMessager().printMessage(Diagnostic.Kind.ERROR,
                    "Circular dependency or unresolvable entity references detected...");
                break;
            }
        } else {
            noProgressCount = 0;
        }
        previousSize = currentSize;
    }
}
```

FK 생성을 지연 처리 해뒀는데 최종적으로 처리되지 못하는 버그가 발생했었다.  
고정된 재시도 횟수 제한을 사용하면 복잡한 의존성 그래프를 가진 경우에 부족한 경우가 있는 것이었다.(원래는 5회 였음)  
그리고 순환 참조 시에 얼마나 전진이 되었는지 확인하는 로직이 없었다.  

그래서 필요한 엔티티 개수 기반으로, 동적으로 시도하도록 전환하였고, 3번 연속 진전이 없는 경우 순환참조로 판단하여 진단메세지로 내려주고 종료시켰다.  
사실 이미 많은 IDE에서 JPA 문법 오류는 다 잡아주고 있지만, 그럼에도 불구하고 이러한 부분들까지 고려해야만 했음.  

# 4. ProcessingContext: 상태 관리와 캐싱
## 4.1 ProcessingContext의 역할

`ProcessingContext`는 Jinx의 실제 구현체 이름이다. 달리 부를 이름이 없어 본명으로 부르겠다..  
이의 역할은 단일 어노테이션 처리 실행 동안의 모든 공유 상태와 환경을 관리하는 것이다.

```java
public class ProcessingContext {
    // 컴파일러 제공 환경
    private final ProcessingEnvironment processingEnv;

    // 결과 모델
    private final SchemaModel schemaModel;

    // 캐시와 레지스트리
    private final Map<String, TypeElement> mappedSuperclassElements = new HashMap<>();
    private final Map<String, TypeElement> embeddableElements = new HashMap<>();
    private final Map<String, List<AttributeDescriptor>> descriptorCache = new HashMap<>();
    private final Map<String, Map<String, List<String>>> pkAttributeToColumnMap = new HashMap<>();

    // 순환 참조 감지
    private final Set<String> mappedByVisitedSet = new HashSet<>();

    // 지연 처리 큐
    private final Queue<EntityModel> deferredEntities = new ArrayDeque<>();
    private final Set<String> deferredNames = new HashSet<>();
}
```

## 4.2 캐싱 전략
### 4.2.1 TypeElement 레지스트리
`@MappedSuperclass`와 `@Embeddable` 타입들은 여러 엔티티에서 참조될 수 있으므로 미리 레지스트리에 등록한다.

```java
// 등록
public void registerMappedSuperclassElement(String fqn, TypeElement el) {
    mappedSuperclassElements.put(fqn, el);
}

// 조회
public TypeElement getMappedSuperclassElement(String fqn) {
    return mappedSuperclassElements.get(fqn);
}
```

**왜 캐싱해야하나?**   
앞서 말했듯, APT에서 `TypeElement`는 현재 처리 라운드에서만 유효하다. 하지만 엔티티 간 관계를 해석할 때 (예: 상속, 임베디드) 다른 타입의 정보가 필요함. 미리 등록해두면 `Elements.getTypeElement()`를 반복 호출하지 않아도 된다.  


### 4.2.2 AttributeDescriptor 캐싱
가장 중요한 캐싱 중 하나는 `AttributeDescriptor` 캐싱이다. 엔티티를 캐싱한다고 생각하면 된다.(엔티티 종류가 나뉘어져 있어서 추상클래스로 사용)

```java
private final Map<String, List<AttributeDescriptor>> descriptorCache = new HashMap<>();

public List<AttributeDescriptor> getCachedDescriptors(TypeElement typeElement) {
    String fqn = typeElement.getQualifiedName().toString();
    return descriptorCache.computeIfAbsent(fqn,
        k -> attributeDescriptorFactory.createDescriptors(typeElement));
}
```

**캐싱의 이점**

1. **중복 계산 방지**: 동일 엔티티의 속성 목록을 여러 번 계산하지 않음
2. **양방향 관계 해석**: `mappedBy` 관계 해석 시 대상 엔티티의 속성 정보 필요
3. **일관성 보장**: 동일 엔티티에 대해 항상 같은 `AttributeDescriptor` 목록 반환


### 4.2.3 Primary Key 속성 매핑
복합 키(`@EmbeddedId`) 처리 시 PK 속성과 컬럼의 매핑을 캐싱한다.

```java
// Map<entityFqcn, Map<pkAttrPath, List<columnName>>>
private final Map<String, Map<String, List<String>>> pkAttributeToColumnMap = new HashMap<>();

public void registerPkAttributeColumns(String entityFqcn, String attributePath,
                                        List<String> columnNames) {
    pkAttributeToColumnMap
        .computeIfAbsent(entityFqcn, k -> new HashMap<>())
        .put(attributePath, columnNames);
}

public List<String> getPkColumnsForAttribute(String entityFqcn, String attributePath) {
    return Optional.ofNullable(pkAttributeToColumnMap.get(entityFqcn))
        .map(attrMap -> attrMap.get(attributePath))
        .orElse(null);
}
```
이 캐시는 `@MapsId` 처리 시 특히 중요하다. `@MapsId("customerId")`와 같이 특정 PK 속성을 참조할 때, 해당 속성이 어떤 컬럼에 매핑되는지 빠르게 조회할 수 있기 때문임.

## 4.3 라운드 초기화
각 처리 라운드 시작 시 컨텍스트 상태를 초기화해야한다.
```java
public void beginRound() {
    clearMappedByVisited();           // 순환 참조 감지 셋 초기화
    descriptorCache.clear();          // 디스크립터 캐시 초기화
    pkAttributeToColumnMap.clear();   // PK 매핑 초기화
    mappedSuperclassElements.clear(); // TypeElement 레지스트리 초기화
    embeddableElements.clear();
}
```

이전 라운드의 객체를 다음 라운드에서 사용하면 `IllegalStateException`이 발생할 수 있다. 따라서 라운드 경계에서 캐시를 초기화하여 오래된 참조를 **반드시** 제거해야한다..

## 4.4 순환 참조 감지
최종 라운드 뿐만 아니라 양방향 관계를 바로 해석할 때에도 무한 루프 방지를 위해 해당 로직이 필요하다.  
완탐 그래프 알고리즘에서 사용하는 그 `visited`랑 완전히 동일한 개념이다.

```java
private final Set<String> mappedByVisitedSet = new HashSet<>();

public boolean isMappedByVisited(String ownerEntityName, String attributeName) {
    String key = ownerEntityName + "." + attributeName;
    return mappedByVisitedSet.contains(key);
}

public void markMappedByVisited(String ownerEntityName, String attributeName) {
    String key = ownerEntityName + "." + attributeName;
    mappedByVisitedSet.add(key);
}
```
```plain
┌─────────────────────────────────────────────────────────────┐
│              순환 참조 감지 예시                              │
│                                                              │
│  @Entity Order                   @Entity Customer            │
│  ┌─────────────────┐            ┌─────────────────┐          │
│  │ @ManyToOne      │            │ @OneToMany      │          │
│  │ Customer owner  │◀──────────▶│ List<Order>     │          │
│  │                 │  mappedBy  │    orders       │          │
│  └─────────────────┘            └─────────────────┘          │
│                                                              │
│  처리 흐름                                                     │
│  1. Order.owner 처리 시작                                     │
│  2. mappedBy 해석 위해 Customer.orders 조회                   │
│  3. Customer.orders에서 다시 Order.owner 조회 시도 가능        │
│  4. mappedByVisitedSet으로 "Customer.orders" 이미 방문 감지   │
│  5. 재귀 중단 → 무한 루프 방지                                │
└─────────────────────────────────────────────────────────────┘
```

---

해당글은 컴파일러 API를 사용하는 특수한 환경에서 내가 겪었던 어려움과 해결법 및 유의사항을 담은 글이다.  
조금 특수한 환경인 만큼 다시 해볼일은 많이 없을 것 같기도 하지만, 정리해두면 추후에 도움이 될까 싶어서 작성했다.  

정리하자면,  

APT를 사용하며 얻은 교훈

1. 런타임 사고방식으로 접근하지 말 것
2. 라운드 경계를 항상 의식할 것
3. 처리 순서는 보장되지 않는다
4. 증분 컴파일은 별개의 문제다
5. 디버깅 전략을 먼저 설계하라

## 들어가며: 왜 또 다른 마이그레이션 도구를 만들었나?

모든 개발자가 한 번쯤 겪어본 상황이 있다. JPA 엔티티를 수정했는데 운영 DB에 반영하려면 수동으로 DDL을 작성해야 하는 것. Flyway나 Liquibase는 훌륭하지만, 매번 엔티티 변경 때마다 별도의 마이그레이션 스크립트를 작성하는 것은 번거롭고 휴먼 에러가 발생하기 쉽다.

**JPA 엔티티만 수정하면 DDL과 Liquibase YAML을 자동 생성하는 도구**
내가 진행하는 작은 프로젝트들에서는, 데이터베이스 마이그레이션 툴(Flyway, Liquibase 등)도 사용하지 않는 경우가 더 흔하고, DBA는 당연히 없었다. 우연히 JS에서 `Prisma`를 써본 뒤로, 이러한 툴이 자바 생태계에도 있었으면 좋겠다는 마음을 담아 만들기 시작했다. 

## 핵심 아이디어: 컴파일 타임의 힘

### 1. 차세대 자바 생태계를 겨냥한 APT 선택

요즘 자바 생태계의 흐름을 보면 명확하다. **모든 것이 컴파일 타임으로 이동하고 있다.** Graal이 JIT 컴파일러를 완전히 대체할지는 모르지만, 현재 대세임에는 부정할 길이 없다.

- **GraalVM 네이티브 이미지** 입장에서 런타임 리플렉션은 악의 축이다.
- **Spring 6.0의 AOT 지원**, 이제는 스프링에서도 리플렉션을 줄여가는 추세다.
- **Quarkus, Micronaut**는 GraalVM 지원을 위해 모든 구조를 컴파일 타임으로 옮겼다.

Annotation Processing Tool(APT)로 Jinx를 구현한 이유가 바로 여기에 있다. 런타임 오버헤드 제로, GraalVM 친화적, 그리고 무엇보다 **빌드 타임에 모든 스키마 정보를 확정**할 수 있다.

### 2. 런타임 vs 빌드타임: 하이버네이트가 마이그레이션에 소극적인 이유

하이버네이트의 `hbm2ddl.auto`가 운영에서 사용되지 않는 이유를 생각해보자. **런타임에 스키마를 변경하는 것의 위험성** 때문이다.

- 애플리케이션 시작 시 예측 불가능한 스키마 변경
- 롤백 불가능한 DDL 실행
- 배포 실패 시 데이터베이스 상태 불일치

Jinx는 이 문제를 **빌드 타임 스냅샷 + diff 기반 마이그레이션**으로 해결한다. 위험한 변경사항은 빌드 단계에서 감지하고, 실제 실행은 개발자의 명시적 승인 하에만 이루어진다.

### 3. Schema as Code: 물리 스키마와 코드의 일치

개발하다 보면 흔히 겪는 문제가 있다. 데이터베이스에는 제약조건이 추가되었는데, 코드로는 확인할 방법이 없다는 것이다.

```sql
-- 누군가 수동으로 추가한 제약조건
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
```

이런 "숨겨진" 스키마 정보는 예측 불가능한 오류를 만든다. **Schema as Code**를 통해 모든 스키마 정보를 코드로 관리하면, 이런 불일치를 원천 차단할 수 있다.

**엔티티 변경**
```java
// v1
@Entity 
class User { @Column String email; }

// v2
@Entity 
class User { 
  @Column(name="email") String email;
  @Column String displayName;      // 신규, nullable
  @Column(name="email") @Index     // 인덱스 추가
}
```

**Jinx 출력 (요약)**
```sql
ALTER TABLE `User` ADD COLUMN `display_name` VARCHAR(255);
CREATE INDEX `ix_user__email` ON `User` (`email`);
```


### 4. CI/CD 완전 통합: SQL 실행권의 분리

Jinx의 CLI 설계 철학은 다음과 같다. **SQL 생성과 실행의 완전한 분리**이다.

```bash
jinx migrate -d mysql --out build/migrations --liquibase --rollback
```

이렇게 생성된 SQL과 Liquibase YAML은
- PR 리뷰에서 스키마 변경사항 검토가 가능하다
- 다양한 DB 배포 파이프라인에 통합 가능하다
- 롤백 스크립트까지 자동 생성되어 안전성을 확보할 수 있다

## 개발 과정: 설계부터 Maven 배포까지

### 아키텍처 결정: SPI 기반 확장성

초기부터 **다양한 데이터베이스 지원**을 염두에 두었다. 현재는 MySQL 우선 지원하지만, PostgreSQL, Oracle 등을 쉽게 추가할 수 있는 SPI(Service Provider Interface) 아키텍처를 채택했다.

```java
public interface DialectBundle {
    BaseDialect base();
    DdlDialect ddl();
    Optional<SequenceDialect> sequence();
    Optional<LiquibaseDialect> liquibase();
    // ...
}
```

### 핵심 기능 구현

1. **JPA 애노테이션 스캔**: `@Entity`, `@Column`, `@Index` 등을 분석
2. **스키마 스냅샷 생성**: JSON 형태로 빌드 결과물에 저장  
3. **Diff 기반 마이그레이션**: 이전 스냅샷과 비교하여 변경사항 감지
4. **멀티 포맷 출력**: DDL SQL, Liquibase YAML, 롤백 스크립트

### 예상보다 복잡했던 부분들

#### APT의 증분 컴파일과 상속 관계
APT의 가장 까다로운 부분이었다. 증분 컴파일 시에는 변경된 파일만 처리하는데, 상속 구조에서 문제가 발생했다.

```java
@Entity
public class Animal {  // 이 파일이 먼저 처리되지 않은 상태
    @Id
    private Long id;
    private String name;
}

@Entity  
public class Bird extends Animal {  // 자식 엔티티 처리 중...
    private String species;  // 부모의 필드 정보가 없다!
}
```
자식 엔티티를 분석하는 중에 부모 클래스 정보가 아직 처리되지 않은 경우가 빈번했다. 이를 해결하기 위해 다단계 캐싱과 지연 처리 메커니즘을 구현해야 했다.

- 1차 스캔: 모든 @Entity 클래스의 기본 정보만 수집
- 캐싱: 미완성 엔티티 정보를 임시 저장
- 2차 검증: 상속 관계를 다시 순회하며 누락된 정보 보완
- 최종 검증: 모든 필드와 관계가 올바른지 재확인

#### FIELD vs PROPERTY AccessType의 딜레마
초기에는 @Access(AccessType.FIELD) 기반으로만 설계했다가, 나중에 @Access(AccessType.PROPERTY) 지원을 추가하면서 아키텍처가 복잡해졌다.

FIELD 방식에서는 필드의 애노테이션만 읽으면 됐지만, PROPERTY 방식에서는,

- Getter 메서드 스캔: 애노테이션이 메서드에 붙음
- 네이밍 변환: `getId()` → `id` 필드명 매핑
- 타입 추론: 메서드 리턴 타입에서 필드 타입 유추
- 혼합 모드: 클래스 레벨은 `PROPERTY`인데 특정 필드만 `@Access(FIELD)` 오버라이드
- Getter 검증: `isValidGetter()` 로직으로 JavaBeans 규칙 준수 확인
- 충돌 해결: 같은 속성에 필드와 getter 모두에 매핑 애노테이션이 있을 경우 에러 처리

결국 `FieldAttributeDescriptor`와 `PropertyAttributeDescriptor`를 별도 구현하고, `AttributeDescriptorFactory`에서 복잡한 우선순위 로직을 통해 적절한 Descriptor를 선택하는 시스템을 구축해야 했다.

```java
// 실제 구현된 복잡한 선택 로직
private Optional<AttributeDescriptor> selectAttributeDescriptor(
    AttributeCandidate candidate, AccessType defaultAccessType) {
    
    // 1. 명시적 @Access 애노테이션 확인
    // 2. 매핑 애노테이션 충돌 감지
    // 3. 기본 AccessType에 따른 fallback 처리
    // 4. Getter 유효성 검증 (JavaBeans 규칙)
}
```

특히 `PropertyAttributeDescriptor`에서는 `isValidGetter()` 메서드로 엄격한 JavaBeans 규칙을 검증해야 했다. `getClass()` 같은 `Object` 메서드 제외, `isXxx()` 메서드의 boolean 반환 타입 검증, 적절한 네이밍 규칙 등을 모두 처리하는 것이 예상보다 까다로웠다.

## 현재 상태와 한계

### 지원하는 기능
- 테이블/컬럼/인덱스/제약조건 DDL 생성
- ID 생성 전략: `IDENTITY`, `SEQUENCE`, `TABLE`
- Liquibase YAML 출력
- 롤백 스크립트 생성
- MySQL 완전 지원

### 현재의 한계점

**대용량 데이터베이스**: 수십만 개의 테이블이나 파티셔닝된 환경은 아직 고려하지 못했다. APT 처리 성능과 스냅샷 파일 크기가 이슈가 될 수 있다. 수십만 개 테이블이 있는 환경에서는 APT 처리 중 메모리 사용량이 급증하거나, MSA에서 동일 테이블에 대한 마이그레이션 충돌이 발생할 수 있기 때문이다.

**분산 환경**: MSA에서 여러 서비스가 동일한 데이터베이스를 공유하는 경우의 마이그레이션 충돌은 해결해야 할 과제다.

**복잡한 데이터 마이그레이션**: 현재는 DDL 중심이라 데이터 백필이나 복잡한 데이터 변환은 지원하지 않는다.

**엔티티로 표현하지 않는 구조**: 이는 사실 안티패턴에 가깝기 때문에(JPQL로 테이블을 추가한다던가..) 지원하지 않을 구조이기도 하다.

**`@IdClass` 미지원**: JPA 스펙을 추가적으로 공부하면서, 해당 기능도 지원하지 않는 방향으로 결정했다(다른 분들의 의견도 들어보고 싶다. 개인적으론 객체지향적이지 못하다고 생각했다..). 복합 PK를 사용하고자 한다면 `@EmbeddedId`를 사용하기를 추천한다.

## 다음 목표: Phase 기반 무중단 마이그레이션

가장 도전적인 기능을 염두에 두고 있다. **DDL + DML 통합 마이그레이션**과 **점진적 스키마 관리**이다.

```java
@ColumnMigration(
  from = "oldColumn", 
  to = "newColumn",
  transform = MyTransformer.class,
  phase = 1
)
private String newColumn;
```

이를 통해 다음과 같은 무중단 마이그레이션이 가능해진다.

**Phase 1**: 새 컬럼 추가 + 데이터 백필. 

**Phase 2**: 애플리케이션 코드 전환  

**Phase 3**: 구 컬럼 제거

각 Phase는 별도의 배포 주기에 실행되어, **진정한 무중단 배포**를 지원할 수 있다면, 나쁘지 않을 것 같다.

## 기술적 도전과 해결책

### APT 라운드별 캐싱 시스템

APT는 여러 라운드에 걸쳐 실행되는데, 매 라운드마다 동일한 작업을 반복하면 성능이 급격히 저하된다. 특히 양방향 관계(@OneToMany ↔ @ManyToOne) 해석 시 같은 엔티티를 반복 분석하는 문제가 심각했다.

```java
@Entity
public class User {
    @OneToMany(mappedBy = "user")
    private List<Order> orders;  // Order 엔티티 분석 필요
}

@Entity  
public class Order {
    @ManyToOne
    private User user;  // 다시 User 엔티티 분석 필요 → 무한 루프 위험
}
```
이를 해결하기 위해 `ProcessingContext` 기반 다층 캐싱을 구축했다.
```java
public class ProcessingContext {
    // AttributeDescriptor 캐싱 - 양방향 관계 해석 시 재계산 방지
    private final Map<String, List<AttributeDescriptor>> descriptorCache = new HashMap<>();

    // TypeElement 레지스트리 - 라운드 동안만 유효
    private final Map<String, TypeElement> mappedSuperclassElements = new HashMap<>();
    private final Map<String, TypeElement> embeddableElements = new HashMap<>();

    // PK 속성-컬럼 매핑 (@MapsId 해석용)
    private final Map<String, Map<String, List<String>>> pkAttributeToColumnMap = new HashMap<>();

    // MappedBy 순환 참조 방지
    private final Set<String> mappedByVisitedSet = new HashSet<>();
}
```
캐시 라이프사이클 관리가 핵심이었다. APT 라운드가 끝나면 일부 정보는 무효화되지만, 일부는 다음 라운드에서 재사용할 수 있다.

```java
public void beginRound() {
    clearMappedByVisited();        // 순환 참조 방지용은 매번 리셋
    descriptorCache.clear();       // 라운드별 초기화 
    pkAttributeToColumnMap.clear();
    // 하지만 전역 레지스트리는 보존
}
```

이 캐싱 시스템 덕분에 복잡한 엔티티 관계망에서도 선형 시간 복잡도를 유지하면서 순환 참조 문제를 차단할 수 있었다.

### 컬럼 리네임 탐지의 성능 최적화

초기에는 단순한 전체 비교 방식으로 리네임을 탐지했지만, 대규모 엔티티에서 O(n²) 성능 문제가 발생했다. 100개 컬럼이 있는 테이블에서는 10,000번의 유사도 계산이 필요했다.
```java
// 기존: 모든 조합을 비교하는 브루트포스 방식
for (ColumnModel oldCol : oldColumns) {
    for (ColumnModel newCol : newColumns) {
        double similarity = calculateSimilarity(oldCol, newCol);
        // 성능: O(n²)
    }
}
```
이를 해시 기반 버킷화 + 가중치 유사도 알고리즘으로 개선했다.

**1단계 - Exact 해시 매칭**: 이름을 제외한 모든 속성이 동일한 컬럼들은 즉시 리네임으로 매칭

```java
String attributeHash = getAttributeHashExceptName(column);
// 타입, 제약조건, 기본값 등이 완전 동일하면 바로 매칭
```
**2단계 - CoarseKey 버킷화**: 핵심 속성들로 후보군을 축소
```java
CoarseKey key = new CoarseKey(
    column.getTableName(),
    column.getJdbcType(), 
    column.getJavaType(),
    column.isNullable()
    // 동일한 "성격"의 컬럼들만 비교 대상으로
);
```
**3단계 - 가중치 유사도 계산**: 핵심 속성에 높은 가중치 부여
```java
// High 가중치: 타입, ENUM 매핑, Temporal 등 핵심 속성
// Medium 가중치: 길이, 정밀도, 기본값 등
// Low 가중치: 주석, 부가 속성 등
double weightedScore = calculateWeightedSimilarity(oldCol, newCol);
```

**결과**: 평균적으로 **O(n)**에 근접하는 성능으로 개선되었고, 리네임 탐지 정확도도 크게 향상되었다. 임계치(0.80) 이상의 유사도를 가진 경우만 리네임으로 판단하여 false positive를 방지할 수 있었다.

## 오픈소스로서의 여정

### Maven Central 배포

처음 Maven Central에 배포하는 과정은 복잡했다. GPG 서명, OSSRH 계정, Sonatype Nexus 설정 등... 하지만 이 과정을 통해 오픈소스 생태계에 대한 이해를 깊게 할 수 있었다.

### 문서화의 중요성

코드만큼 중요한 것이 문서다. README 작성, 기여 가이드 준비, 예시 프로젝트(`jinx-test`) 구성까지... 사용자 관점에서 접근하기 쉽게 만드는 것이 핵심이었다. 사실, 코드 주석 및 메커니즘에 대한 상세한 스펙 설명 등도 필요할 것 같아, 해당 부분에 대해서도 리팩토링 및 개선을 고려중이다.

## 배운 점들

### 1. 컴파일 타임 도구의 가능성

런타임 의존성 없이도 충분히 강력한 도구를 만들 수 있다는 확신을 얻었다. APT의 초기 러닝 커브는 가파르지만, 한 번 익숙해지면 무궁무진한 가능성이 열린다.

### 2. 확장성을 위한 초기 설계의 중요성

SPI 기반 아키텍처 덕분에(하이버네이트 구조를 모방했다) 새로운 데이터베이스 지원을 추가하는 것이 상대적으로 쉬워졌다. 초기 설계에서 확장성을 고려한 것이 큰 도움이 되었다.

### 3. 사용자 경험의 중요성

아무리 좋은 기능이라도 사용하기 어려우면 의미가 없다. CLI 인터페이스 설계, Gradle 통합, 에러 메시지 개선 등에 많은 시간을 투자한 것이 옳은 선택이었다.

## 마치며: 지속적인 개선을 향해

Jinx는 아직 극초기 단계다(v0.0.7). 하지만 JPA 생태계에서 마이그레이션 자동화라는 명확한 니즈(나만의 니즈일수도 있긴함 ㅎㅎ)가 있고, 컴파일 타임 접근법이라는 차별화된 가치가 있다고 생각한다. 당연히, 현재는 더 많은 검증과 테스트들을 필요로 함을 알고 있다. 

앞으로의 로드맵은 다음과 같다.
- **PostgreSQL, Oracle 등 다양한 DB 지원 추가**
- **Phase 기반 무중단 마이그레이션**  
- **대용량 환경 최적화**
- **IDE 플러그인 개발**

무엇보다 **실제 운영 환경에서 검증받는 것**이 가장 중요한 다음 단계다. 

---

GitHub: [https://github.com/yyubin/jinx](https://github.com/yyubin/jinx)  

> 피드백이나, `@IdClass` 지원 여부에 대한 의견, 또는 추가로 원하는 기능을 GitHub 이슈로 남겨주시면 큰 도움이 됩니다!👏

---

개인적으론, 지금까지 해왔던 개발 경험 중 가장 어렵고 복잡했다. _DDL_을 쓰기 싫은 마음에 시작했다고 해도 과언이 아닌데, 이를 만들기 위해서 데이터베이스 및 ORM 기술, 자바 런타임 환경 등에 대해 명확한 이해를 필요로 했다. 사실 만들면서도, 중간 중간 스스로에 대한 부족함이 너무 절감되어 개발을 멈추고 책이나 논문을 읽으며, 혹은 하이버네이트 유저 가이드를 참고하며.. 공부와 병행하며 개발을 진행했다. 이전에 유사 스프링 부트를 재현하는 프로젝트를 진행하면서 얻었던 인사이트들이 아주 많은 도움이 되기도 했다.

내가 만들었기 때문에, 냉정하게 코드든 기능이든 허점과 부족한 점을 아주 잘 알고 있다. 더 많은 개선이 필요함을 알고 있기에 회고 글을 쓰거나 커뮤니티에 공개하는 것도 꺼려지긴 하는데, 어차피 내가 모르는 문제점은 혼자선 깨닫기 어려울 것 같아 공개하기로 결심했다. 

점진적 마이그레이션에 관련해서는, 최초로 참고 했던 `Prisma`에 대해서도 살펴본 결과, 분산 데이터베이스 환경에서의 전지적 지원은 현재 어려운 것 같긴하다. 모든 데이터베이스들을 오케스트레이션 하는 존재가 따로 등장하지 않는 한, ORM 차원에서의 지원은 분명 한계가 있을 것 같기도 하다.. 이 부분에 대해서도 앞으로 추가적인 고민과 공부를 해보고 싶긴 하다.

앞으로 진행할 사이드 프로젝트가 있다면 내가 우선적으로 사용하여 결함이나 개선점을 찾아볼 생각이다.


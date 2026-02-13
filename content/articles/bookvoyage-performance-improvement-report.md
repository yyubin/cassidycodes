> **테스트 일시:** 2026-01-23 (개선 전) → 2026-01-24 (개선 후)   
> **시뮬레이션:** FullExperimentSimulation (4단계: Baseline → Batch → Spike → Cooldown)  
> **테스트 도구:** Gatling 3.11.5   
> **테스트 시간:** 각 45분 이상

---

## 0. 테스트 시나리오 설명

### 0.1 FullExperimentSimulation - 4단계 부하 시뮬레이션

실제 서비스 운영 환경을 재현하기 위해 4개 단계로 구성된 시뮬레이션을 사용했다. 단순히 일정 부하를 주는 것이 아니라, **API 트래픽 위에 배치 작업이 겹치는 상황**과 **트래픽 급증 상황**까지 포함하여 시스템의 한계를 종합적으로 검증한다.

```plain
부하
 ↑
 │                              ┌─────────┐
 │                              │  Spike   │
 │        ┌─────────────────────┤  (2배)   │
 │        │   Batch ON          │          │
 │  ┌─────┤   (동일 부하 유지)     │          ├───────┐
 │  │Base │                     │          │Cooldown│
 │  │line │                     │          │        │
 ──┴─────┴─────────────────────┴──────────┴────────┴──→ 시간
 0     10분                 25분     30분       35분+
```

| 단계 | 시간 | 설명 |
|------|------|------|
| **Phase 1: Baseline** | 0~10분 | 사용자 트래픽만 투입. 배치 없이 순수 API 성능의 기준선을 측정한다. |
| **Phase 2: Batch ON** | 10~25분 | 동일 부하를 유지하면서 Neo4j/Elasticsearch 배치 동기화를 트리거한다. 배치가 API 응답에 미치는 영향을 측정한다. |
| **Phase 3: Spike** | 25~30분 | 사용자 부하를 **2배로 급증**시킨다. 배치 실행 중 트래픽 스파이크가 발생했을 때 시스템이 버티는지 확인한다. |
| **Phase 4: Cooldown** | 30~35분 | 부하를 중단하고 시스템이 정상 상태로 회복되는지 확인한다. |

### 0.2 사용자 구성 - 3가지 시나리오 동시 실행

FullExperimentSimulation은 아래 3가지 시나리오를 **동시에** 주입하여 실제 트래픽 패턴을 모사한다.

#### (1) AuthenticatedUserScenario - 인증 사용자 트래픽 (메인 부하)

CSV에 등록된 19개 테스트 계정을 circular 방식으로 재사용하며, **일반 사용자(80%)** 와 **고빈도 사용자(20%)** 로 나뉜다.

로그인 후 아래 API를 가중치 기반으로 반복 호출한다:

| 액션 | 비율 | API | 설명 |
|------|------|-----|------|
| 추천 조회 | 50% | `GET /api/recommendations/books` 또는 `/reviews` | 도서/리뷰 추천을 50:50으로 랜덤 호출 |
| 리뷰 상세 | 35% | `GET /api/reviews/{id}` | 1~100 범위의 리뷰 ID를 랜덤 조회 |
| 사용자 프로필 | 15% | `GET /api/users/me` | 내 프로필 조회 |

**일반 사용자(Normal User)** 는 각 액션 사이에 **3~8초의 Think Time**을 두어 실제 사용자의 페이지 탐색 패턴을 재현한다. **고빈도 사용자(Heavy User)** 는 Think Time을 **1~3초**로 짧게 설정하여 헤비 유저나 크롤러 수준의 집중적인 요청 패턴을 시뮬레이션한다.

> Search Books API는 외부 API(카카오/구글) Rate Limit 문제로 이번 시뮬레이션에서는 비활성화했다.

#### (2) LoginLoadScenario - 로그인 부하 (백그라운드)

전체 사용자의 약 **2%** 비율로, 테스트 전 기간에 걸쳐 **2초에 1건**씩 로그인 관련 요청을 발생시킨다. 세 가지 패턴을 가중치로 혼합한다:

| 패턴 | 비율 | 동작 |
|------|------|------|
| 단순 로그인 | 70% | Fresh Login → 30~60초 대기 |
| 로그인 + 토큰 갱신 | 20% | Fresh Login → Refresh Token → 30~60초 대기 |
| 로그인 + 로그아웃 | 10% | Fresh Login → Logout → 30~60초 대기 |

이를 통해 JWT 발급, 쿠키 생성, 토큰 갱신, 로그아웃 처리 등 **인증 관련 엔드포인트의 지속적인 부하**가 메인 트래픽과 함께 발생하는 상황을 재현한다.

#### (3) BatchTriggerScenario - 배치 동기화 트리거

Phase 1(Baseline) 종료 직후, **단 1명의 가상 사용자**가 배치 동기화 API를 순차 호출한다.

1. `POST /api/admin/batch/sync-neo4j` - Neo4j 그래프 동기화 트리거
2. 5초 대기
3. `POST /api/admin/batch/sync-elasticsearch` - Elasticsearch 인덱스 동기화 트리거
4. 300초(5분) 대기 - 배치 완료 대기

배치 API는 `permitAll`로 인증 없이 접근 가능하다.(테스트 한정, 실제로는 배치 스케줄로 돌아감) 409(Conflict) 응답은 이미 실행 중인 배치가 있음을 의미하며 정상 처리된다. 이 시나리오의 핵심은 배치 요청 자체가 아니라, **배치가 실행되는 동안 DB 커넥션/CPU/메모리를 점유하면서 API 응답에 미치는 영향**을 관찰하는 것이다.

### 0.3 부하 주입 프로파일 상세

기본 사용자 수(`baseUsers`) 50명 기준의 실제 주입 패턴

```plain
Normal User (80%):
  Phase 1: rampUsers(40) / 2분 → constantUsersPerSec(0) / 8분
  Phase 2: constantUsersPerSec(0) / 15분
  Phase 3: rampUsers(40) / 1분 → constantUsersPerSec(1) / 4분
  Phase 4: nothingFor(5분)

Heavy User (20%):
  Phase 1: rampUsers(10) / 2분 → constantUsersPerSec(0) / 8분
  Phase 2: constantUsersPerSec(0) / 15분
  Phase 3: rampUsers(10) / 1분 → constantUsersPerSec(0) / 4분
  Phase 4: nothingFor(5분)

Login Load:
  rampUsers(1) / 2분 → constantUsersPerSec(0.5) / 33분

Batch Trigger:
  nothingFor(10분) → atOnceUsers(1)
```

### 0.4 Assertion 기준

| 조건 | 기준값 | 의미 |
|------|--------|------|
| `global.successfulRequests.percent > 95%` | 전체 성공률 95% 이상 | 배치+스파이크 상황에서도 기본 안정성 보장 |
| `global.responseTime.p95 < 1,500ms` | 전체 p95 응답시간 | 95%의 요청이 1.5초 이내 응답 |
| `global.responseTime.p99 < 5,000ms` | 전체 p99 응답시간 | 99%의 요청이 5초 이내 응답 |
| `details("Get User Profile").p95 < 300ms` | 프로필 조회 p95 | 경량 엔드포인트의 별도 SLA 기준 |


---

## 1. 핵심 요약

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| **총 요청 수** | 44,596 | 59,083 | +32.5% |
| **실패(KO) 건수** | 2,009 (4.50%) | **0 (0%)** | **-100%** |
| **평균 응답시간** | 3,054 ms | 30 ms | **-99.0%** |
| **p50 (중앙값)** | 35 ms | 13 ms | -62.9% |
| **p75** | 72 ms | 59 ms | -18.1% |
| **p95** | 32,968 ms | 85 ms | **-99.7%** |
| **p99** | 60,002 ms | 106 ms | **-99.8%** |
| **최대 응답시간** | 60,003 ms | 431 ms | **-99.3%** |
| **처리량 (RPS)** | 16.26 req/s | 21.59 req/s | +32.8% |


--- 


## 2. 응답시간 분포 비교

### 개선 전
```plain
■■■■■■■■■■■■■■■■■■■■■■■■■■ 65.49%  t < 50ms      (29,204건)
■■■■■■■■■■■              27.63%  50~100ms      (12,320건)
■                          2.38%  t >= 100ms     (1,063건)
■■                         4.50%  failed         (2,009건)
```

### 개선 후
```plain
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 74.18%  t < 50ms   (43,829건)
■■■■■■■■■■                23.64%  50~100ms      (13,969건)
■                           2.17%  t >= 100ms     (1,285건)
                            0.00%  failed             (0건)
```

50ms 이하 응답 비율이 65.49% → **74.18%** 로 향상되었고, 실패 건수는 2,009건에서 **0건**으로 완전 제거되었다.

![개선 전 Gatling 리포트 개요](https://velog.velcdn.com/images/cassidy/post/7923952d-d2ca-4f5d-8754-c1c798889c37/image.png)

![개선 후 Gatling 리포트 개요](https://velog.velcdn.com/images/cassidy/post/859e7c57-3696-4d4e-a45e-6e02be36fb5f/image.png)

---

## 3. 엔드포인트별 상세 비교

### 3.1 Fresh Login

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 12,527 | 13,708 | +9.4% |
| KO | 600 (4.79%) | 0 (0%) | **-100%** |
| 평균 응답 | 1,409 ms | 78 ms | **-94.5%** |
| p95 | - | 105 ms | - |
| p99 | - | 110 ms | - |
| 최대 | 59,819 ms | 270 ms | **-99.5%** |

### 3.2 Get Review Detail

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 5,713 | 14,485 | **+153.5%** |
| KO | 454 (7.95%) | 0 (0%) | **-100%** |
| 평균 응답 | 146 ms | 11 ms | **-92.5%** |
| p95 | - | 25 ms | - |
| p99 | - | 36 ms | - |
| 최대 | 59,471 ms | 196 ms | **-99.7%** |

### 3.3 Get Review Recommendations

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 4,133 | 10,154 | **+145.6%** |
| KO | 170 (4.11%) | 0 (0%) | **-100%** |
| 평균 응답 | 605 ms | 34 ms | **-94.4%** |
| p95 | - | 65 ms | - |
| p99 | - | 96 ms | - |
| 최대 | 59,575 ms | 431 ms | **-99.3%** |

### 3.4 Get Book Recommendations

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 4,130 | 10,110 | **+144.8%** |
| KO | 151 (3.66%) | 0 (0%) | **-100%** |
| 평균 응답 | 645 ms | 11 ms | **-98.3%** |
| p95 | - | 25 ms | - |
| p99 | - | 38 ms | - |
| 최대 | 59,231 ms | 208 ms | **-99.6%** |

### 3.5 Get User Profile

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 2,796 | 6,196 | **+121.6%** |
| KO | 93 (3.33%) | 0 (0%) | **-100%** |
| 평균 응답 | 581 ms | 3 ms | **-99.5%** |
| p95 | - | 8 ms | - |
| p99 | - | 12 ms | - |
| 최대 | 58,703 ms | 59 ms | **-99.9%** |

### 3.6 Refresh Token

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 2,523 | 2,737 | +8.5% |
| KO | 97 (3.84%) | 0 (0%) | **-100%** |
| 평균 응답 | 1,152 ms | 5 ms | **-99.6%** |
| 최대 | 59,600 ms | 24 ms | **-100.0%** |

### 3.7 Logout

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 1,213 | 1,351 | +11.4% |
| KO | 0 | 0 | - |
| 평균 응답 | 1,842 ms | 3 ms | **-99.8%** |
| 최대 | 47,475 ms | 27 ms | **-99.9%** |

### 3.8 Search Books

| 지표 | 개선 전 | 개선 후 | 변화 |
|------|---------|---------|------|
| 요청 수 | 11,219 | - | *(개선 후 시나리오에서 제외)* |
| KO | 444 (3.96%) | - | - |
| 평균 응답 | 657 ms | - | - |

> Search Books는 외부 API를 사용하는데, 하루 할당량을 전부 사용하여.. 개선 후 시나리오에서 당일 검증 불가했다.

---

## 4. 근본 원인 분석 및 적용한 개선 사항

### 4.1 병목 원인: HikariCP 커넥션 풀 고갈

개선 전 테스트에서 확인된 핵심 로그
```plain
HikariPool-1 - Connection is not available, request timed out after 30001ms
(total=10, active=10, idle=0, waiting=131)
```

커넥션 풀 크기가 10으로 설정되어 있었고, 동시 부하 시 131개 이상의 요청이 대기 상태에 빠지면서 **30초 타임아웃 → 60초 Gatling 타임아웃** 연쇄 장애가 발생했다.


### 4.2 적용한 개선 사항

#### (1) HikariCP 커넥션 풀 확장
```yaml
# 개선 전: 기본값 10
# 개선 후:
spring.datasource.hikari:
  maximum-pool-size: 30      # 10 → 30 (3배 확장)
  minimum-idle: 10
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
```

#### (2) Outbox 전용 데이터소스 분리
배치 동기화(Neo4j Sync, ES Sync)에서 사용하는 Outbox 쓰기 작업을 **별도 커넥션 풀(5개)** 로 분리하여, API 읽기 트래픽과의 커넥션 경합을 제거했다.

`application.yml` - Primary와 Outbox 풀 분리
```yaml
# Primary: API 읽기 트래픽 전용
spring.datasource.hikari:
  maximum-pool-size: ${DB_POOL_SIZE:30}
  minimum-idle: ${DB_MIN_IDLE:10}
  pool-name: PrimaryHikariPool

# Outbox: 배치 쓰기 전용 (별도 풀)
outbox.datasource.hikari:
  maximum-pool-size: ${OUTBOX_DB_POOL_SIZE:5}
  minimum-idle: ${OUTBOX_DB_MIN_IDLE:2}
```

`OutboxDataSourceConfig.java` - 별도 EntityManager/TransactionManager 구성
```java
@Configuration
@EnableJpaRepositories(
        basePackages = "org.yyubin.infrastructure.persistence.outbox",
        entityManagerFactoryRef = "outboxEntityManagerFactory",
        transactionManagerRef = "outboxTransactionManager"
)
public class OutboxDataSourceConfig {

    @Bean
    @ConfigurationProperties("outbox.datasource")
    public DataSourceProperties outboxDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @ConfigurationProperties("outbox.datasource.hikari")
    public DataSource outboxDataSource(
            @Qualifier("outboxDataSourceProperties") DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean outboxEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("outboxDataSource") DataSource dataSource) {
        return builder.dataSource(dataSource)
                .packages("org.yyubin.infrastructure.persistence.outbox")
                .persistenceUnit("outbox")
                .build();
    }

    @Bean
    public PlatformTransactionManager outboxTransactionManager(
            @Qualifier("outboxEntityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
```

Outbox 패키지에 속한 리포지토리만 `outboxDataSource`를 사용하므로, 배치 동기화가 아무리 많은 쓰기를 수행해도 Primary 풀의 30개 커넥션은 API 트래픽 전용으로 유지된다.


#### (3) 도서 검색 Redis 캐싱
외부 API(카카오/구글 Books) 호출 결과를 Redis에 **1시간 TTL**로 캐싱하여
- 반복 검색의 외부 API 호출 제거
- 카카오 API 429(Rate Limit) 에러 방지
- DB 커넥션 점유 시간 단축

`CompositeBookSearchAdapter.java`:
```java
@Component
@Primary
public class CompositeBookSearchAdapter implements ExternalBookSearchPort {

    private static final String CACHE_KEY_PREFIX = "book:search:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    @Override
    public ExternalBookSearchResult search(SearchBooksQuery query) {
        String cacheKey = buildCacheKey(query);

        // 1. 캐시 조회
        ExternalBookSearchResult cached = getFromCache(cacheKey);
        if (cached != null) {
            return cached;
        }

        // 2. 외부 API 호출 (카카오 → Google fallback)
        ExternalBookSearchResult result = searchFromExternalApis(query);

        // 3. 결과 캐싱
        if (result.items() != null && !result.items().isEmpty()) {
            saveToCache(cacheKey, result);
        }
        return result;
    }

    private ExternalBookSearchResult searchFromExternalApis(SearchBooksQuery query) {
        try {
            ExternalBookSearchResult kakaoResult = kakaoAdapter.search(query);
            if (kakaoResult.items() != null && !kakaoResult.items().isEmpty()) {
                return kakaoResult;
            }
        } catch (Exception e) {
            log.warn("Kakao API failed, falling back to Google Books: {}", e.getMessage());
        }

        // Google Books API로 fallback
        return googleAdapter.search(query);
    }

    private String buildCacheKey(SearchBooksQuery query) {
        return CACHE_KEY_PREFIX + query.keyword().toLowerCase().trim()
                + ":" + (query.startIndex() != null ? query.startIndex() : 0)
                + ":" + (query.size() != null ? query.size() : 10);
    }
}
```

캐시 키는 `book:search:{keyword}:{startIndex}:{size}` 형태로, 동일 검색 조건에 대해 1시간 동안 외부 API를 재호출하지 않는다.

#### (4) 외부 API 타임아웃 설정
외부 API 지연이 내부 커넥션 풀을 장시간 점유하는 것을 방지하기 위해, 카카오/구글 클라이언트 모두 동일한 타임아웃을 적용했다.

`KakaoBooksClient.java` / `GoogleBooksClient.java` (동일 패턴):
```java
@Component
public class KakaoBooksClient {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    public KakaoBooksClient(KakaoBooksProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(READ_TIMEOUT);

        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
```

타임아웃 없이 외부 API가 30초 이상 응답하지 않으면 해당 스레드가 DB 커넥션을 물고 있는 채로 블로킹되어 풀 고갈을 가속화했다. Connect 3초 + Read 5초로 **최대 8초 이내에 실패 처리**되도록 보장하고, `CompositeBookSearchAdapter`의 fallback 로직과 결합하여 한쪽 API 장애가 전체 검색 실패로 이어지지 않도록 했다.


#### (5) 커스텀 예외 처리 추가

존재하지 않는 리뷰 조회나 권한 없는 접근 시 500 에러 대신 명확한 HTTP 상태 코드를 반환하도록 개선했다.

`ReviewExceptionHandler.java`:
```java
@RestControllerAdvice
public class ReviewExceptionHandler {

    @ExceptionHandler(ReviewNotFoundException.class)
    public ResponseEntity<Void> handleReviewNotFound(ReviewNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @ExceptionHandler(ReviewAccessDeniedException.class)
    public ResponseEntity<Void> handleReviewAccessDenied(ReviewAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}
```

```java
// application/review/exception/ReviewNotFoundException.java
public class ReviewNotFoundException extends RuntimeException {
    public ReviewNotFoundException(String message) { super(message); }
}

// application/review/exception/ReviewAccessDeniedException.java
public class ReviewAccessDeniedException extends RuntimeException {
    public ReviewAccessDeniedException(String message) { super(message); }
}
```

개선 전에는 이 예외들이 `@ExceptionHandler` 없이 Spring 기본 처리에 의해 500으로 응답되었고, Gatling에서 KO로 집계되어 실패율을 높이는 원인이 되었다. 특히 Get Review Detail의 KO 비율이 7.95%로 전체 엔드포인트 중 가장 높았는데, 랜덤 리뷰 ID 조회 시 존재하지 않는 리뷰에 대해 500이 아닌 404를 반환하면서 정상 응답으로 처리되도록 했다.

--- 

## 5. 개선 효과 정리

![개선 전 Gatling Assertion 리포트](https://velog.velcdn.com/images/cassidy/post/195d01d0-f251-4365-90d3-ff8255898e42/image.png)

![개선 후 Gatling Assertion 리포트](https://velog.velcdn.com/images/cassidy/post/23a396b2-309c-400a-9c27-a09bf365360c/image.png)

![개선 전 Gatling Latency 리포트](https://velog.velcdn.com/images/cassidy/post/2d50fbf1-0263-4454-ab4e-4073f00ff3ec/image.png)

![개선 후 Gatling Latency 리포트](https://velog.velcdn.com/images/cassidy/post/168c7a52-0d61-4f74-bf30-d5f88e7528a4/image.png)


```plain
                    개선 전                          개선 후
                    ──────                          ──────
  실패율         ██████ 4.50%                           0%  ← 완전 제거
  평균 응답    ████████████████ 3,054ms           █ 30ms     ← 99% 감소
  p99          ████████████████████ 60,002ms      █ 106ms    ← 99.8% 감소
  처리량       ████████ 16.26 rps             ██████████ 21.59 rps ← 33% 증가
  최대 응답    ████████████████████ 60,003ms      █ 431ms    ← 99.3% 감소
```


### 핵심 성과
1. **장애 완전 제거**: KO 2,009건 → 0건 (실패율 4.50% → 0%)
2. **Tail Latency 극적 감소**: p99 60초 → 106ms (타임아웃 완전 해소)
3. **처리량 33% 향상**: 16.26 → 21.59 req/s (같은 시간 내 32.5% 더 많은 요청 처리)
4. **응답 안정성 확보**: 최대 응답시간 60초 → 431ms (표준편차 12,248 → 30)

---

## 6. Assertion 결과

| 조건 | 기준 | 개선 전 | 개선 후 |
|------|------|---------|---------|
| 성공률 > 95% | Global | 95.50% (경계) | **100%** |
| p95 < 1,500ms | Global | 32,968ms **FAIL** | **85ms PASS** |
| p99 < 5,000ms | Global | 60,002ms **FAIL** | **106ms PASS** |
| User Profile p95 < 300ms | Endpoint | - | **8ms PASS** |

개선 전에는 p95, p99 assertion이 모두 실패했으나, 개선 후에는 **모든 assertion을 통과**했다.

---

## 7. 결론

외부 API 지연 + 배치 쓰기 + 커넥션 풀 10개 제한 → 스레드 블로킹 → 커넥션 점유 → 대기열 폭증 → 30초 타임아웃 → 60초 테스트 타임아웃의 연쇄적 문제가 주된 문제이긴 했다.  
이번 경험을 통해 배울 수 있었던 것은 다음과 같다.  

1. 커넥션 풀은 단순 숫자가 아니라 동시성 제어 장치다
2. 외부 API 지연은 내부 리소스 고갈로 전이된다
3. 배치와 API는 반드시 리소스를 격리해야 한다
4. Tail Latency는 우연이 아니라 구조의 결과다
5. 부하 테스트는 기능 검증이 아니라 시스템 설계 검증 도구다

> 실제 수치 및 프로파일링 정보가 필요하다면 https://github.com/yyubin/bookvoyage/tree/main/performance-test/reports/profiling 로 이동하세요. 실제 stats.json과 마지막 테스트에 대한 jfr, async-profiler의 플레임 그래프를 첨부했습니다. 해당 글에서는 첨부하기 어려운(용량이슈) gatling 리포트를 주요 산출물로 작성하였습니다.  

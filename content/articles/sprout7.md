톰캣이나 Netty 같은 상용 서버 프레임워크가 아닌, 내가 직접 제작한 서버(`Sprout`)의 구조와 동작 방식, 그리고 다양한 실행 조합 하에서의 성능 및 안정성 테스트 결과를 공유하려 한다. 이를 통해 Java 기반 멀티스레드 서버의 내부 구조와 실험적 조합(NIO + Virtual Threads 등)에 따른 특성과 한계를 실증적으로 확인할 수 있었다. 구조에 대한 전체적 개괄만 보이고 더 구체적 설계 결정과 디테일한 부분은 다른 포스트에서 기술할 예정이다.

우선 내가 만든 `Sprout`에서는 `@Configuration` + `@Bean` 으로 빈 등록을 지원한다. 원리나 사용법은 스프링에서 사용하던 것과 비슷하다.

```java
@Configuration
public class ServerConfiguration {

    @Bean
    public RequestExecutorService executorService(AppConfig appConfig, List<ContextPropagator> contextPropagators) {
        String threadType = appConfig.getStringProperty("server.thread-type", "virtual");
        if (threadType.equals("virtual")) {
            return new VirtualRequestExecutorService(contextPropagators);
        }
        return new RequestExecutorPoolService(appConfig.getIntProperty("server.thread-pool-size", 100));
    }

    @Bean
    public AcceptableProtocolHandler httpProtocolHandler(AppConfig appConfig, RequestDispatcher requestDispatcher, HttpRequestParser httpRequestParser, RequestExecutorService executorService) {
        String executionMode = appConfig.getStringProperty("server.execution-mode", "hybrid");
        if (executionMode.equals("hybrid")) {
            System.out.println("Execution mode is hybrid");
            return new BioHttpProtocolHandler(requestDispatcher, httpRequestParser, executorService);
        }
        System.out.println("Execution mode is NIO");
        return new NioHttpProtocolHandler(requestDispatcher, httpRequestParser, executorService);
    }
}
```
`AppConfig`는 `application.yaml`을 스프링과는 다르게 주입받는 컴포넌트로 활용한다. 그래서 저런 형태와 같이 주입받아 사용 가능함. 

일단 넘어가고, 서버 부분 설정을 보면
```yaml
server:
  execution-mode: nio # 실행 모드: nio 또는 hybrid
  thread-type: virtual  # 스레드 종류: virtual 또는 platform
  thread-pool-size: 150 # platform 스레드일 경우 사용할 스레드 풀 크기
```
와 같이 설정 가능하다.

실행 모드에서 `nio`란 논블로킹 모드를 의미한다. 모든 프로토콜이 전부 `nio`모드로 동작하는 모드이다. `hybrid`는 프로토콜에 맞춰 다르게 작동하는 모드이다. `http/1.1` 은 `bio`로, `websocket`은 `nio`로 동작한다.

하지만 여타 다른 완전한 `nio`를 제공하는 프레임워크들과는 달리, `nio`로 `http`를 지원한다고 해도 최초의 응답을 받는 부분과 응답을 내려주는 부분만 논블로킹으로 동작하게 되어있다. 모든 메서드 스택 분기별로 `nio`로 동작하는 것은 아니다.(FastAPI와는 다르다)

그리고 기본적으로 java에서 `Selector`와 `ServerSocketChannel`은 비동기 I/O(논블로킹 I/O)를 구현하기 위해 java.nio 패키지에서 제공되는 핵심 클래스들인데, 나는 이걸 사용하여 구현하였다. 기본적인 원리는 다음과 같다.

#### 1. Selector
Selector는 Java NIO(Non-blocking I/O)에서 **다중화(multiplexing)**를 지원하는 클래스다. 여러 채널(Channel)을 하나의 스레드에서 관리하고, 이벤트를 감지하여 효율적으로 네트워크 작업을 처리할 수 있게 해준다.

**주요 역할**

1. 다중 채널 관리: Selector는 여러 채널(예: SocketChannel, ServerSocketChannel)의 I/O 이벤트를 모니터링 한다.
2. 이벤트 기반 처리: 특정 채널에서 발생한 이벤트(연결 수락, 데이터 읽기, 쓰기 등)를 감지하고 처리할 수 있도록 한다.
3. 논블로킹 I/O 지원: 블로킹 방식 대신 논블로킹 방식으로 여러 클라이언트의 요청을 동시에 처리할 수 있게 해준다.

**주요 메서드**

1. Selector.open(): 새로운 Selector 인스턴스를 생성한다.
2. select(): 등록된 채널들 중 준비된 이벤트를 감지한다. 준비된 이벤트가 있을 때까지 블록하거나, 타임아웃을 설정할 수 있다.
3. selectedKeys(): 준비된 이벤트(선택된 키들)를 반환한다.
4. register(): 채널을 Selector에 등록하고 관심 있는 이벤트(예: OP_ACCEPT, OP_READ, OP_WRITE)를 지정한다.

**동작 방식**

1. Selector를 생성
2. 채널(예: ServerSocketChannel, SocketChannel)을 논블로킹 모드로 설정하고 Selector에 등록.
3. select() 메서드를 호출하여 준비된 이벤트를 감지한다.
4. 준비된 이벤트가 있으면 selectedKeys()로 키를 가져와 각 채널의 작업(연결 수락, 데이터 읽기/쓰기 등)을 처리한다.

#### 2. ServerSocketChannel
ServerSocketChannel은 서버 측에서 클라이언트의 연결 요청을 수락하고, 클라이언트와의 통신을 위한 SocketChannel을 생성하는 데 사용되는 클래스이다. 기존의 java.net.ServerSocket을 대체하며, 논블로킹 I/O와 Selector를 지원한다.

**주요 역할**

1. 클라이언트 연결 수락: 서버가 클라이언트의 연결 요청을 받아들여 SocketChannel을 생성한다.
2. 논블로킹 지원: configureBlocking(false)를 호출하여 논블로킹 모드로 설정할 수 있다.
3. Selector와 통합: Selector에 등록하여 다중 클라이언트 연결을 효율적으로 처리할 수 있다.

**주요 메서드**

1. ServerSocketChannel.open(): 새로운 ServerSocketChannel을 생성한다.
2. bind(SocketAddress): 서버 소켓을 특정 주소와 포트에 바인딩.
3. accept(): 클라이언트의 연결 요청을 수락하여 SocketChannel을 반환. 논블로킹 모드에서는 연결이 없으면 즉시 null을 반환한다.
4. configureBlocking(boolean): 블로킹 또는 논블로킹 모드를 설정

**동작 방식**

1. ServerSocketChannel을 생성하고 특정 포트에 바인딩
2. 논블로킹 모드로 설정한 뒤, Selector에 등록하여 OP_ACCEPT 이벤트를 감지한다.
3. 클라이언트 연결 요청이 들어오면 accept()를 호출하여 SocketChannel을 얻고, 이를 통해 클라이언트와 데이터를 주고받는다.

여기서 알 수 있듯이, 일단 기본적으로 `Selector`와 `ServerSocketChannel`을 사용해서 서버를 구현했다. `hybrid` 모드라면 요청 프로토콜에 맞춰 `ServerSocketChannel`을 블로킹 모드로 설정하여 스레드에 얹어 실행해주는 방식이다.

이때, 사용하는 스레드도 여러가지 중 하나로 선택할 수 있게 추상화 해뒀다.

```java
package sprout.server;

public interface RequestExecutorService {
    void execute(Runnable task);
    void shutdown();
}
```
이런식으로만 해둠. 톰캣같은 고정크기 스레드풀을 사용하는 구현체와, 가상 스레드를 사용하는 구현체가 각각있다(앞으로 스레드 풀에서 사용하는 스레드를 '플랫폼 스레드'라고 부르겠다). 이에 대한 자세한 구현은 추후에 설명하겠다.

그럼 조합이 총 4가지로 분류 가능하다.

| - | `hybird` | `nio` |
|-|-|-|
|플랫폼 스레드| `http` 가 `bio`로 동작, 플랫폼 스레드 사용 | `http`가 `nio`로 동작, 플랫폼 스레드 사용|
|가상 스레드| `http`가 `bio`로 동작, 가상 스레드 사용 | `http`가 `nio`로 동작, 가상 스레드 사용|

# 테스트 환경
| 항목     | 사양                   |
| ------ | -------------------- |
| CPU    | 10 Cores             |
| Memory | 32GB                 |
| OS     | macOS Sequoia 15.6.1 |
| JDK    | OpenJDK 21           |
| Tool   | Gatling 3.x          |


# 벤치마크 
벤치마킹을 위한 컨트롤러는 아래와 같이 작성하였다.
```java
package app.benchmark;

import sprout.beans.annotation.Controller;
import sprout.mvc.annotation.GetMapping;
import sprout.mvc.annotation.RequestMapping;
import sprout.mvc.annotation.RequestParam;

import java.math.BigInteger;
import java.util.HashMap;
import java.util.Map;

/**
 * Performance benchmark controller for HTTP server testing
 */
@Controller
@RequestMapping("/benchmark")
public class BenchmarkController {

    /**
     * Simple hello world endpoint - baseline performance test
     */
    @GetMapping("/hello")
    public String hello() {
        return "Hello, World!";
    }

    /**
     * JSON response endpoint - test serialization performance
     */
    @GetMapping("/json")
    public String json() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("timestamp", System.currentTimeMillis());
        response.put("data", Map.of(
                "message", "Performance test response",
                "server", "Sprout HTTP Server",
                "version", "1.0"
        ));
        return response.toString();
    }

    /**
     * CPU-intensive endpoint - test server under CPU load
     * Calculates fibonacci number using iterative method
     */
    @GetMapping("/cpu")
    public String cpu(@RequestParam(required = false, defaultValue = "35") String n) {
        int num = Integer.parseInt(n);
        long result = fibonacci(num);
        return "Fibonacci(" + num + ") = " + result;
    }

    /**
     * Heavy CPU-intensive endpoint - prime number calculation
     */
    @GetMapping("/cpu-heavy")
    public String cpuHeavy(@RequestParam(required = false, defaultValue = "10000") String limit) {
        int max = Integer.parseInt(limit);
        int primeCount = countPrimes(max);
        return "Primes up to " + max + ": " + primeCount;
    }

    /**
     * I/O latency simulation endpoint - test async handling
     * Simulates database or external API call delay
     */
    @GetMapping("/latency")
    public String latency(@RequestParam(required = false, defaultValue = "100") String ms) {
        int delay = Integer.parseInt(ms);
        try {
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return "Interrupted";
        }
        return "Delayed response after " + delay + "ms";
    }

    /**
     * Mixed workload - combination of CPU and latency
     */
    @GetMapping("/mixed")
    public String mixed() {
        // Small CPU work
        long fib = fibonacci(20);

        // Small delay
        try {
            Thread.sleep(50);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        return "Mixed workload result: " + fib;
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    // Helper methods

    private long fibonacci(int n) {
        if (n <= 1) return n;

        long prev = 0, curr = 1;
        for (int i = 2; i <= n; i++) {
            long next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }

    private int countPrimes(int max) {
        if (max < 2) return 0;

        boolean[] isPrime = new boolean[max + 1];
        for (int i = 2; i <= max; i++) {
            isPrime[i] = true;
        }

        // Sieve of Eratosthenes
        for (int i = 2; i * i <= max; i++) {
            if (isPrime[i]) {
                for (int j = i * i; j <= max; j += i) {
                    isPrime[j] = false;
                }
            }
        }

        int count = 0;
        for (int i = 2; i <= max; i++) {
            if (isPrime[i]) count++;
        }
        return count;
    }
}
```

벤치마킹 툴은 `Gatling`을 사용했는데, 리포트를 가시적으로 편하게 확인할 수 있다는 점이 좋았음. 구체적 시뮬레이션은 아래 3개이다.

```java
package benchmark;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import java.time.Duration;

public class HelloWorldSimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
            .baseUrl("http://localhost:8080")
            .acceptHeader("text/plain,application/json")
            .userAgentHeader("Gatling Performance Test")
            .shareConnections() // 커넥션 재사용
            .disableFollowRedirect()
            .disableWarmUp() // Gatling 기본 warm-up 비활성화
            .maxConnectionsPerHost(200)
            .connectionHeader("keep-alive")
            .header("Keep-Alive", "timeout=5, max=1000");

    // Warm-up 시나리오
    // 목적: 서버 및 JVM JIT, 스레드풀, 소켓 풀 예열
    ScenarioBuilder warmUp = scenario("Warm-up Phase")
            .exec(
                    http("Warm-up request")
                            .get("/benchmark/hello")
                            .check(status().is(200))
            );

    // 본격 부하 시나리오
    ScenarioBuilder loadTest = scenario("Hello World Load Test")
            .exec(
                    http("GET /benchmark/hello")
                            .get("/benchmark/hello")
                            .check(status().is(200))
            );

    {
        setUp(
                // Warm-up 단계: 낮은 부하로 10초간 서버를 예열
                warmUp.injectOpen(
                        rampUsers(5).during(Duration.ofSeconds(5)),
                        constantUsersPerSec(10).during(Duration.ofSeconds(10))
                ).protocols(httpProtocol),

                // 본 테스트 단계: warm-up 후 바로 실행
                loadTest.injectOpen(
                        nothingFor(Duration.ofSeconds(15)), // warm-up 이후 실행
                        rampUsers(10).during(Duration.ofSeconds(5)),
                        rampUsers(50).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(100).during(Duration.ofSeconds(30)),
                        rampUsersPerSec(100).to(200).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(200).during(Duration.ofSeconds(20))
                ).protocols(httpProtocol)
        )
                .assertions(
                        global().responseTime().max().lt(1000),
                        global().successfulRequests().percent().gt(99.0)
                );
    }
}
```
우선은 아주 간단한 `Hello World` 시나리오.
```java
package benchmark;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import java.time.Duration;

public class CpuIntensiveSimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
            .baseUrl("http://localhost:8080")
            .acceptHeader("text/plain,application/json")
            .userAgentHeader("Gatling Performance Test")
            .shareConnections()
            .disableFollowRedirect()
            .disableWarmUp()
            .maxConnectionsPerHost(200)
            .connectionHeader("keep-alive")
            .header("Keep-Alive", "timeout=10, max=1000");

    // 시나리오 1 : Moderate CPU load (fibonacci)
    ScenarioBuilder cpuScenario = scenario("CPU Load Test")
            .exec(
                    http("GET /benchmark/cpu")
                            .get("/benchmark/cpu?n=35")
                            .check(status().is(200))
            );

    // 시나리오 2⃣ : Heavy CPU load (prime calculation)
    ScenarioBuilder cpuHeavyScenario = scenario("Heavy CPU Load Test")
            .exec(
                    http("GET /benchmark/cpu-heavy")
                            .get("/benchmark/cpu-heavy?limit=10000")
                            .check(status().is(200))
            );

    {
        setUp(
                // Warm-up 및 중간 부하 구간
                cpuScenario.injectOpen(
                        rampUsers(5).during(Duration.ofSeconds(5)),   // warm-up
                        rampUsers(20).during(Duration.ofSeconds(10)), // gradual ramp
                        constantUsersPerSec(30).during(Duration.ofSeconds(20)), // sustained
                        rampUsersPerSec(30).to(50).during(Duration.ofSeconds(10)), // peak ramp
                        constantUsersPerSec(50).during(Duration.ofSeconds(15))     // steady peak
                ).protocols(httpProtocol),

                // Heavy workload 구간
                cpuHeavyScenario.injectOpen(
                        nothingFor(Duration.ofSeconds(10)), // warm-up 뒤 실행
                        rampUsers(10).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(20).during(Duration.ofSeconds(20))
                ).protocols(httpProtocol)
        )
                .assertions(
                        global().responseTime().mean().lt(5000),         // 평균 응답 < 5s
                        global().responseTime().percentile(95.0).lt(10000), // 95% < 10s
                        global().successfulRequests().percent().gt(99.0) // 성공률 > 99%
                );
    }
}
```
두 번째는 CPU 바운드 작업에 대한 시나리오
```java
package benchmark;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import java.time.Duration;

public class LatencySimulation extends Simulation {

    HttpProtocolBuilder httpProtocol = http
            .baseUrl("http://localhost:8080")
            .acceptHeader("text/plain,application/json")
            .userAgentHeader("Gatling Performance Test")
            .shareConnections()
            .disableFollowRedirect()
            .disableWarmUp()
            .maxConnectionsPerHost(300)
            .connectionHeader("keep-alive")
            .header("Keep-Alive", "timeout=10, max=1000");


    // 시나리오 1: Low latency (50ms)
    ScenarioBuilder lowLatencyScenario = scenario("Low Latency Test")
            .exec(
                    http("GET /benchmark/latency?ms=50")
                            .get("/benchmark/latency?ms=50")
                            .check(status().is(200))
            );

    // 시나리오 2: Medium latency (100ms)
    ScenarioBuilder mediumLatencyScenario = scenario("Medium Latency Test")
            .exec(
                    http("GET /benchmark/latency?ms=100")
                            .get("/benchmark/latency?ms=100")
                            .check(status().is(200))
            );

    // 시나리오 3: High latency (200ms)
    ScenarioBuilder highLatencyScenario = scenario("High Latency Test")
            .exec(
                    http("GET /benchmark/latency?ms=200")
                            .get("/benchmark/latency?ms=200")
                            .check(status().is(200))
            );

    // 시나리오 4: Mixed workload (CPU + I/O)
    ScenarioBuilder mixedScenario = scenario("Mixed Workload Test")
            .exec(
                    http("GET /benchmark/mixed")
                            .get("/benchmark/mixed")
                            .check(status().is(200))
            );

    {
        setUp(
                // Low latency phase
                lowLatencyScenario.injectOpen(
                        rampUsers(20).during(Duration.ofSeconds(5)),
                        constantUsersPerSec(100).during(Duration.ofSeconds(20)),
                        rampUsersPerSec(100).to(300).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(300).during(Duration.ofSeconds(20))
                ).protocols(httpProtocol),

                // Medium latency phase
                mediumLatencyScenario.injectOpen(
                        nothingFor(Duration.ofSeconds(5)),
                        rampUsers(20).during(Duration.ofSeconds(5)),
                        constantUsersPerSec(80).during(Duration.ofSeconds(20)),
                        rampUsersPerSec(80).to(200).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(200).during(Duration.ofSeconds(20))
                ).protocols(httpProtocol),

                // High latency phase
                highLatencyScenario.injectOpen(
                        nothingFor(Duration.ofSeconds(10)),
                        rampUsers(10).during(Duration.ofSeconds(5)),
                        constantUsersPerSec(50).during(Duration.ofSeconds(20)),
                        rampUsersPerSec(50).to(150).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(150).during(Duration.ofSeconds(15))
                ).protocols(httpProtocol),

                // Mixed workload
                mixedScenario.injectOpen(
                        nothingFor(Duration.ofSeconds(15)),
                        rampUsers(30).during(Duration.ofSeconds(10)),
                        constantUsersPerSec(100).during(Duration.ofSeconds(25))
                ).protocols(httpProtocol)
        )
                .assertions(
                        global().responseTime().mean().lt(1000), // 평균 응답 < 1초
                        global().responseTime().percentile(99.0).lt(3000), // P99 < 3초
                        global().successfulRequests().percent().gt(99.0)   // 성공률 > 99%
                );
    }
}
```
세 번째는 I/O blocking이 빈번한 시나리오로 구성했다.

---
기본적으로 `Gatling`에서 지원하는 웜업 기능도 있는데, 이는 배제하고 사용했다. 이는 이유가 있긴한데, 우선은 첫번째 시나리오에 대한 지표부터 확인해보자.

# HelloWolrdSimulation
## Hybrid + PlatformThread
스레드 풀 사이즈는 150으로 두었다. 

  <iframe 
    width="560" 
    height="315" 
    src="https://www.youtube.com/watch?v=I4-Qp4nxoMc" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen
  ></iframe>

좀 과하긴 한데, 실제 구동 및 테스트 과정에 대한 짧은 영상도 첨부했다. 걍 한번도 안보여준 거 같아서..

![](https://velog.velcdn.com/images/cassidy/post/e7a70a18-6997-469c-a7c2-ca65767ec970/image.png)

![](https://velog.velcdn.com/images/cassidy/post/978ff486-aca4-4586-8636-5e7c216f4fe6/image.png)

일단 성공률은 83.94%로 약 84퍼센트만 성공한다. 아주 낮은 수치임. 실패 원인은 `Premature close`다. 

![](https://velog.velcdn.com/images/cassidy/post/d9745f55-4cef-42ab-8861-48930125dbd5/image.png)
아주 간단한 응답처리이기 때문에 아주 빠르게 응답함을 알 수 있음.

![](https://velog.velcdn.com/images/cassidy/post/fcecec02-868a-429e-bcc0-cebf1a2e1f45/image.png)

실패의 대부분이 `warm-up`단계와 초반대에 포진되어 있다. 

![](https://velog.velcdn.com/images/cassidy/post/4a969f08-2a3d-4783-85d0-c9cee0f2c0fb/image.png)

마지막엔 거의 유저 197명이 총 297개의 요청을 한꺼번에 보내도 안정적으로 처리했음. 이유가 뭘까? 왜 초반에 너무 많은 실패가 일어나고 추후에 안정되는 걸까?

## Hybrid + VirtualThread

![](https://velog.velcdn.com/images/cassidy/post/bfe8b414-ede9-4442-bdf3-f1adb283c52e/image.png)

가상 스레드를 bio로 사용한 것이다. 
![](https://velog.velcdn.com/images/cassidy/post/b98db953-e831-46db-8b51-a408bb030d73/image.png)
성공률이 이전보다 3퍼센트 가량 더 높게 나타남.
이 역시도 성공시, 100% 확률로 `2ms` 정도의 지연만 나타났다.

![](https://velog.velcdn.com/images/cassidy/post/70533b7f-24e7-44fe-8e3e-a8c8bc747b2c/image.png)

하지만 모든 실패는 마찬가지로 `warm-up`때의 저지연 구간과, 요청이 치솟는 초반에 압도적으로 KO가 많이 발생한다.

## Nio + PlatformThread

![](https://velog.velcdn.com/images/cassidy/post/c75d9cd6-3621-4e0d-81ed-4bbeea0a3f76/image.png)
이번엔 성공률이 유의미하게 낮아졌다.

![](https://velog.velcdn.com/images/cassidy/post/a30d4301-6840-47f6-a97c-3771d4836861/image.png)
마찬가지로 오류는 전부 `Premeature close`.

이 조합 역시도 응답속도는 전부 `2ms`에 달한다.

![](https://velog.velcdn.com/images/cassidy/post/a2b0ebfe-9cd6-4b06-9731-979aa5d55ff6/image.png)

응답이 안정되는 분포는 또 다시 비슷하다.

## Nio + VirtualThread

![](https://velog.velcdn.com/images/cassidy/post/345f8485-06be-4931-9ea4-b666759e9d6b/image.png)

이번엔 성공률이 더더 낮아졌다.
![](https://velog.velcdn.com/images/cassidy/post/adb29d19-0df1-4814-a3d1-ec5f3bc33d43/image.png)
이 역시도 지연시간은 일정하지만, 무려 69%의 압도적으로 낮은 수치를 기록했다.

![](https://velog.velcdn.com/images/cassidy/post/bba12dda-6556-4ffd-ab59-85ad80c446a1/image.png)

그래프를 보면 이전과 마찬가지로 후반에 달할 수록 요청이 많더라도 잘 처리하는 것을 볼 수 있다. 다만 최적화까지의 기간이 이전 조합들보다 더 많은 시간이 소요된 것으로 보인다.


## 초반 KO 구간 이유 분석
그래프를 보면 초반 5~10초 구간에서 요청 실패(KO)가 집중되고 이후 안정화되는 패턴인데, 이는 서버 둘 중 하나가 “급격한 부하 상승 구간에서의 준비 지연(warm-up latency)”을 겪고 있음을 알 수 있다.
### 1. 전반적인 패턴 설명
그래프에서 보듯 초반 (01:17:30 ~ 01:18:00)에는 KO (red area)가 두껍고, Active Users (orange line)가 점점 올라가면서 OK (green area)가 증가한다. All responses (blue line)는 낮지만, 이는 서버가 아직 "예열되지" 않아 요청을 제대로 처리하지 못하는 상태를 반영한다. 나중 (01:18:30 이후)에는 안정화되면서 throughput이 올라간다.

이는 서버가 "cold start" 상태에서 "hot" 상태로 전환되는 과정이다. Java 서버는 런타임에 최적화되는데, 초반에는 리소스 할당/초기화 비용이 크다. Gatling의 warm-up이 10초 정도로 짧은데, 이게 서버의 실제 예열 시간을 따라가지 못하면 KO가 쌓인다. 특히 ramp-up (users 증가) 단계에서 부하가 급증하면 서버가 버티지 못한다.

#### 구성별 차이
- **Hybrid (BIO) + Virtual:** BIO는 간단한 blocking IO라 초기 setup이 빠르고, Virtual Threads는 lightweight해서 스레드 생성/컨텍스트 스위칭 비용이 낮다. 그래서 안정화가 가장 빠름.
- **NIO + Virtual:** NIO는 non-blocking이라 복잡한 Selector/Channel 관리 비용이 초반에 집중된다. Virtual Threads와 결합되면 스레드 풀링이 덜 필요하지만, NIO의 이벤트 루프 초기화가 bottleneck이 되어 안정화가 느림.

### 2. 의심되는 원인들

#### 2-1. 스레드 지연 생성 문제
- **Platform Threads (RequestExecutorPoolService, pool size 150):** 고정 풀 크기라 초반에 풀을 채우는 데 시간이 걸린다. 만약 풀 사이즈가 작거나, 초기화되지 않은 상태에서 ramp-up이 오면 대기 큐가 쌓여 KO 발생할 수밖에 없다. Hybrid + Platform은 BIO의 단순함 덕에 괜찮지만, NIO + Platform은 Selector와 결합되어 더 느려진다.
- **Virtual Threads (VirtualRequestExecutorService)**: Java 21+에서 가볍지만, 초반에 많은 virtual threads를 생성할 때 JVM의 Loom 구현 비용(스레드 carrier 초기화)이 발생한다. 하지만 platform보다 훨씬 scalable해서 Hybrid + Virtual이 가장 빠른 안정화를 보이는는 것 아닐까 추측.. NIO + Virtual이 느린 건 NIO의 비동기가 virtual threads의 이점을 초반에 상쇄하기 때문이다. virtual threads는 blocking 코드(BIO)에 더 잘 맞는다. (실제로 `netty` 팀에서도 nio와 가상스레드 조합을 비추천하기도 하였다.)

아니면 Gatling의 constantUsersPerSec(10) warm-up이 너무 약해서 풀/threads가 제대로 예열되지 않는 것일수도 있다. warm-up을 더 길게 (e.g., 30초) 하거나 users를 점진적으로 늘려보는게 해법이 될 수도 있음. Gatling의 자체 웜업도 일부러 배제했는데, 이러한 현상을 전부 확인해보고 싶어서 였긴 하다.

#### 2-2. JIT 최적화까지 시간이 걸리는 점
- Java의 HotSpot JVM은 코드가 여러 번 실행된 후에 JIT (Just-In-Time) 컴파일을 한다. 초반에는 interpreted mode로 느리고, 메서드 호출 횟수가 쌓일수록 optimized native code로 전환된다.
- **왜 NIO가 더 느릴까?:** NIO (NioHttpProtocolHandler)는 Selector, Channel, ByteBuffer 같은 복잡한 루프가 있어서 JIT threshold에 도달하는 데 더 많은 반복이 필요하다. BIO (BioHttpProtocolHandler)는 단순 socket read/write라 빨리 최적화될 수 있다. 그래프에서 특정 시점부터 OK가 급증하는 건 JIT이 "뜨거워진" 시점을 의미한다.

찾아본 해결 방안으로는 서버 로그에 `-XX:+PrintCompilation` 플래그를 추가해 JIT 로그를 보면 초반 컴파일이 부족한 걸 확인하여, warm-up을 늘리거나, JMH 같은 microbenchmark로 미리 JIT을 trigger 해볼 수 있다고 한다.

#### 2-3. TCP backlog (대기 큐) 포화
- 서버의 listen backlog (e.g., ServerSocket backlog 파라미터, default 50)이 작으면 연결이 쌓일 때 SYN queue가 overflow되어 연결이 거부된다. (KO 발생) Gatling의 rampUsers(10).during(5s)처럼 급 부하가 오면 더 심할 것이다.
- **NIO 영향:** NIO에서 Selector가 준비되지 않은 상태에서 연결이 몰리면 backlog이 빨리 포화된다. Hybrid (BIO)는 각 연결에 즉시 thread를 할당하니 상대적으로 덜 민감할 수밖에 없을 것이다.

OS 수준에서 net.core.somaxconn (Linux default 128)을 확인하고 늘려볼 수 있긴하다. 혹은 서버 코드에서 ServerSocket 생성 시 backlog을 크게 설정하는 것이 방법이 될 수도 있다.

#### 2-4. NIO에서 Selector 준비시간과 첫 select() blocking 문제

- 이게 핵심 병목 지점이다. NioHttpProtocolHandler에서 Selector.open()과 channel.register()가 초반 비용을 높게 가져간다. 첫 select() 호출은 blocking 될 수 있어서 (no events ready) 지연이 발생. 특히 Virtual Threads와 결합 시, selector wakeup/park 비용이 추가된다.
- **왜 NIO + Virtual이 가장 느릴까?:** Virtual threads는 blocking을 피하려 하지만, NIO의 이벤트 드리븐 모델이 초반에 events를 쌓아두다 한 번에 처리하려 하니 지연되는 것이다. Hybrid + Virtual은 BIO의 즉시 처리 덕에 빠를 수 있다.

서버 로그에 Selector 관련 타이밍을 로깅하거나, jstack과 같은 툴로 초반 thread dump를 봐서 blocking 확인해야 구체적 원인을 파악할 수 있을 것 같다.

# CpuIntensiveSimulation
이제 CPU 집중적인 시뮬레이션을 각 조합별로 진행해보겠다.
CPU 점유 및 체류기간이 길수록 NIO의 장점은 퇴색된다. 이 시뮬레이션에선 NIO 조합이 최하점을 기록할 것이라 생각된다.

그리고 앞서 말했듯 Warm-up이 얼마나 빠르게 진행되냐에 따라 결과가 천차만별인데, 이번엔 5초로 아주 짧게 실험해보았다. 서버가 CPU 집약 작업에 적응할 시간이 부족하게 유도했음. n=35 fibonacci나 limit=10000 prime는 계산 시간이 길어 초반 실패가 많았을 가능성이 높다.

## Hybrid + Platform

![](https://velog.velcdn.com/images/cassidy/post/3cf42814-17de-45e6-9278-2fa4d5c9fa97/image.png)
실제로 성공률이 처참함을 알 수 있다. 다만 가정해야 하는 것은, 이번엔 요청 수 자체도 적다는 것이다. 저번 벤치마킹에서 약 8000개의 요청을 보낸 반면 이번엔 2000여개 요청만 보냈음. 그래서 충분한 웜업이 이뤄질 만큼의 진행을 하지 못했을 가능성이 크다. 

고로 jvm을 튜닝하던가 시행횟수를 더 늘리면 안정된 수치를 확인할 수 있을거라 전망하지만, 이번엔 어떤 조합이 cpu 집약적 작업에서 최적화를 빨리 할 수 있을 지 관찰해보자. 
![](https://velog.velcdn.com/images/cassidy/post/ed26e8d5-9d77-42f3-a845-dc508db83ca5/image.png)
그래프에서 마찬가지로 확인 가능하 듯, 후반으로 갈수록 안정적 처리가 비교적 이루어지는 것으로 보인다. 
![](https://velog.velcdn.com/images/cassidy/post/354cbac6-1dd8-4961-b38e-4f7083756371/image.png)
지연 시간은 아주 짧다. 모든 OK 응답이 `1ms`에 도착했고, KO인 몇몇 응답은 `2ms`에 도착했다.

## Hybrid + Virtual

![](https://velog.velcdn.com/images/cassidy/post/54520506-8bf8-4c18-8e82-7f3832021e78/image.png)

![](https://velog.velcdn.com/images/cassidy/post/da9f762e-8fe5-4e9e-adc5-884f31d58780/image.png)
성공률이 고작 47%이다. 이전 조합(Hybrid + Platform)보다 약 6퍼센트 가량 감소한 수치이다. 최적화에 시간이 더 소모된다는 의미이다.

![](https://velog.velcdn.com/images/cassidy/post/f63dfa28-14cf-46b9-917f-8e9e8d2db820/image.png)

지연시간은 마찬가지로 아주 짧다. 74.18%의 응답이 `1ms`에 도착했고 1%의 응답이 `4ms`에 도착했다.

![](https://velog.velcdn.com/images/cassidy/post/757562f4-a122-4342-a175-b1348d14932b/image.png)

위의 그래프와 비교하면 아직 충분한 최적화가 되지 못했음을 확인할 수 있다.

## Nio + Platform

![](https://velog.velcdn.com/images/cassidy/post/0c230b09-613b-4a84-a5ef-708d6ddc8691/image.png)
![](https://velog.velcdn.com/images/cassidy/post/8d578571-3660-4f43-94dd-b3688d1b1277/image.png)
이번엔 성공률이 더 박살나있다. ㅋㅋㅋ 무려 45%
![](https://velog.velcdn.com/images/cassidy/post/47b0f05b-27ae-4d45-8d90-36b530f4bba6/image.png)
98.75%의 응답이 `2ms` 에 도착한 것을 확인할 수 있다. 지연시간은 준수하다.

![](https://velog.velcdn.com/images/cassidy/post/2f1f981f-839d-4cf5-a226-7aed218eab8b/image.png)

그래프 진행도가 `hybrid + platform`과 유사하다. 아마 저정도 시점에 생긴 스레드 개수가 비슷할 것이라 예상된다.

## Nio + Virtual

![](https://velog.velcdn.com/images/cassidy/post/e83e5dc7-0449-4a84-a0c8-b59c63926ee1/image.png)

![](https://velog.velcdn.com/images/cassidy/post/eca1add2-d2f5-47db-a815-130853af3880/image.png)

가장 준수하다. 64.9%의 성공률로 웜업 시간이 아마 가장 빠르지 않을까 추측된다. 초기에는 해당 조합이 가장 저조할 것이라 생각되었는데, 의외로 가장 빨라서 놀랐다.

![](https://velog.velcdn.com/images/cassidy/post/20c8e4d4-6abf-4108-a31d-c8267ee0da3a/image.png)

68%의 응답이 `1ms`에 도착했고, 29.83%의 응답은 `2ms`에 도착했다.

![](https://velog.velcdn.com/images/cassidy/post/7c1f1564-f589-40ce-95b1-5c6b35d85243/image.png)

시간 별 응답 성공률 그래프에서 확인할 수 있듯이 가장 빠르게 안정화가 이루어졌다.

혹시 내가 서버를 다시 켜지 않고 돌린건가 싶어서 끄고 다시 벤치마킹도 해봤다.

![](https://velog.velcdn.com/images/cassidy/post/65537695-4432-4b72-8445-db61184a1cbc/image.png)

오히려 이전보다 더 높아짐..;

## 결과 해석
### 전체 결과 요약
**성공률**
- Hybrid + Platform: 53%
- Hybrid + Virtual: 47%
- NIO + Platform: 45%
- NIO + Virtual: 64.9%

**공통점**
Warm-up이 5초로 매우 짧고, 요청 수(약 2000개)가 이전(8000개)보다 적어서 서버가 충분히 예열되지 못한 상태에서 CPU 집약적 작업(fibonacci n=35, prime limit=10000)이 시작되었다. 이는 초반 KO(실패)가 많았던 이유와 맞물린다.

**지연 시간**
모든 조합에서 대부분 1~2ms로 매우 짧았지만, 성공률과 안정화 속도에서 큰 차이를 보였다.

**패턴**
NIO + Virtual이 예상 외로 가장 빠르게 안정화되었고, Hybrid 조합(특히 Virtual)이 오히려 낮은 성공률을 보였다. 이는 CPU 집약적 작업에서 IO 모델과 스레드 타입의 상호작용이 주요 변수임을 시사한다.

### 각 조합별 분석
**Hybrid + Platform (53%)**

BIO(Blocking IO)는 연결당 스레드를 즉시 할당하므로 초기 설정이 단순하고 빠르다. 하지만 Platform Threads(고정 풀, 기본 100개)는 CPU 집약적 작업에서 스레드 컨텍스트 스위칭 비용이 크고, 풀 사이즈가 초과되면 대기 큐가 쌓여 KO 발생한다. 5초 warm-up으로는 풀을 채우고 JIT을 활성화할 시간이 부족했음. 그래프에서 후반 안정화는 풀과 JVM이 "따뜻해진" 결과라 볼 수 있다. 지연 시간(1~2ms)은 낮지만, 성공률이 낮은 건 초반 부하를 감당하지 못했기 때문일 것이라 추측된다.


**Hybrid + Virtual (47%)**

Virtual Threads는 lightweight라 스레드 생성 비용이 낮고, BIO와 잘 맞아 전반적인 요청 처리가 효율적일 수 있다. 하지만 CPU 집약적 작업(예: fibonacci, prime)은 blocking 특성을 띠는데, Virtual Threads가 blocking 호출에서 carrier thread로 전환될 때 오버헤드가 발생한다. 5초 warm-up으로는 이 전환 비용을 상쇄할 시간이 부족했고, 결과적으로 Hybrid + Platform보다 성공률이 더 낮았다. 지연 시간은 여전히 짧지만, 안정화가 더디게 진행됨.


**NIO + Platform (45%)**

NIO(Non-blocking IO)는 Selector 기반으로 이벤트 드리븐 처리라 초반 설정(Selector 준비, channel 등록)이 복잡하고 시간이 걸린다. Platform Threads와 결합 시, Selector 이벤트 루프와 스레드 풀 간 조율이 원활하지 못하면 초반에 병목현상이 심화될 것이라 예측됨. CPU 집약적 작업은 NIO의 비동기 장점을 퇴색시키고, 5초 warm-up으로는 JIT과 스레드 풀 최적화가 안 되어 성공률이 가장 낮다. 지연 시간(2ms)은 준수하지만, 안정화가 늦음.


**NIO + Virtual (64.9%)**

NIO + Virtual은 예상과 달리 가장 높은 성공률과 빠른 안정화를 보였다. 이유는 Virtual Threads의 대규모 동시성 처리 능력과 NIO의 이벤트 기반 모델이 초반 부하에서 상호 보완적이었기 때문이다. Virtual Threads는 blocking이 적은 NIO 환경에서 효율적으로 동작하며, CPU 집약적 작업이라도 Selector가 이벤트를 분배하면서 부하를 분산할 수 있다. 5초 warm-up이 짧았지만, Virtual Threads의 가벼움 덕에 빠르게 스케일업되어 초반 KO를 줄였다. 그래프에서 안정화가 가장 빠른 것도 이 점을 뒷받침한다.

### NIO + Virtual이 최적화가 빨랐던 이유
- Virtual Threads는 OS 스레드(carrier thread)에 비해 수십만 개까지 생성 가능. NIO의 Selector가 이벤트를 처리할 때, 각 virtual thread가 lightweight하게 동작해 CPU 부하를 분산. Platform Threads 기반 조합은 풀 크기(150개)로 제한되지만, Virtual Threads는 이런 제약이 적어 초반 부하에 더 유연히 대응했을 것이다.

- fibonacci(n=35)와 prime(limit=10000)은 계산 시간이 길지만, I/O 부하가 적다. NIO는 이런 경우 IO 병목이 없어 장점이 두드러지고, Virtual Threads가 이를 뒷받침 했을 것. 반면 Hybrid는 불필요한 blocking 오버헤드가 쌓였을 가능성이 있어보임.

- NIO + Virtual은 이벤트 처리 루프가 반복적으로 실행되면서 JIT이 빨리 "hot" 상태로 전환되었을 것이다. Hybrid 조합은 blocking 호출이 분산되어 JIT threshold 도달이 느렸고, NIO + Platform은 Selector 복잡성 때문에 더뎠음. 서버 재시작 후 성공률이 더 높아진 것도 JIT 캐시가 유지된 영향이지 않을까 싶다.


# LatencySimulation
이번엔 지연시간이다. 구글에서 권장하는 웹서버 지연시간은 `200ms` 안쪽임. 게임서버 같은 경우는 아마 대부분 `100ms` 정도 일 것이다. `1000ms` 이상부턴 고객이 "확실한 느림"을 체감하는 시간이다. 이를 감안하여 살펴보자. 

그리고 해당 부분에서는 시행횟수가 압도적으로 많다. 지연을 시키기 위해 일부러 많은 요청을 한꺼번에 넣었음. 그래서 웜업이 이뤄졌을 가능성이 높음. 그러다보니 성공률이 확실히 올랐다.

## Hybrid + Platform
![](https://velog.velcdn.com/images/cassidy/post/66d7a3b0-559e-4230-b169-b9652da6be97/image.png)

![](https://velog.velcdn.com/images/cassidy/post/db2e207e-4e0b-46aa-ba3f-4b60c452bc35/image.png)

95.69%의 성공률을 보임. 

![](https://velog.velcdn.com/images/cassidy/post/39d54034-be4f-4105-a666-43ea9ee45949/image.png)

해당 그래프에서 볼 수 있듯 최적화가 진행되고 나서는 놓치는 요청 없이 잘 처리 되고 있다. 최대 820명의 유저를 가정했음에도 불구하고 "완벽한 웜업 이후엔" 안정적임.

![](https://velog.velcdn.com/images/cassidy/post/ce9e5123-d0f1-4037-bf46-40fa171a0675/image.png)

응답시간이 대부분 `200ms` 안으로 나왔다. 

![](https://velog.velcdn.com/images/cassidy/post/cce5a351-1144-4e81-a3c1-906cef39fbf1/image.png)

49.33%의 요청이 50ms대에서 처리 되었고, 17.64%의 요청이 200ms대에서 처리되었다. 최장 206ms.

## Hybrid + Virtual

![](https://velog.velcdn.com/images/cassidy/post/3a1535dc-850d-42ac-b84f-1d2da0240f16/image.png)

![](https://velog.velcdn.com/images/cassidy/post/2b1618ef-4429-43e0-9800-98a2ca17346f/image.png)

안정성은 앞 모델보다 떨어지지만 대체로 유사하다(94.71%)

![](https://velog.velcdn.com/images/cassidy/post/96db0eaa-792d-4d59-b9c8-210477c41e1e/image.png)

![](https://velog.velcdn.com/images/cassidy/post/c15ee88a-17d9-4f03-aa8b-c12a6c4a24a9/image.png)

이 역시도 대체로 200ms 안쪽에서 처리되었음. 사실 로직에서 볼 수 있듯 의도적으로 200ms 의 딜레이를 강제함. 따지고보면 대부분 `10ms` 내부로 처리한 것임. 안정화 이후엔 갈수록 빨라지는 응답속도를 그래프에서 확인할 수 있다.

![](https://velog.velcdn.com/images/cassidy/post/92d6e1b2-e417-4e1b-9666-bc058adaeac2/image.png)

마찬가지로 최대 820명의 유저가 750개의 요청을 동시에 보내도 KO처리 없이 안정적으로 처리됨.

## Nio + Platform
![](https://velog.velcdn.com/images/cassidy/post/45bb3850-da95-4e5b-b60b-14ebd8ba807c/image.png)
![](https://velog.velcdn.com/images/cassidy/post/e0ab671e-f545-4ada-b7e9-e59ba5a1be02/image.png)

해당 조합에서 안정성은 확실히 비교적 떨어진다.(93.45%)

![](https://velog.velcdn.com/images/cassidy/post/339c8295-5345-44a7-9eba-1dee1c84fa4f/image.png)
![](https://velog.velcdn.com/images/cassidy/post/19787290-3d56-4f17-97d8-50dbdf4b6ec3/image.png)

48.52%의 응답이 50ms대에서 처리됨. 이 역시도 의도적으로 딜레이를 준 것.
대충 전체적 기조는 비슷하다. 

![](https://velog.velcdn.com/images/cassidy/post/8b54ad1b-cd6d-4f44-9ec1-29fc19d8df7e/image.png)

다만 극후반 안정화가 이루어지기까지 시간이 다소 더 소모됨을 알 수 있다.


## Nio + Virtual

![](https://velog.velcdn.com/images/cassidy/post/9435f29e-b15d-46c5-9ecc-c7dc0711b8dc/image.png)
![](https://velog.velcdn.com/images/cassidy/post/09953d60-543c-488a-91bc-bfba8caf1ac1/image.png)

해당 구조에서 안정성이 가장 저조하다. 성공률 (92.29%)

![](https://velog.velcdn.com/images/cassidy/post/4bd7fd0a-e27a-4e28-b25b-15b6492acb9c/image.png)
![](https://velog.velcdn.com/images/cassidy/post/36fce2d0-574a-4f60-9588-db6bc87f7298/image.png)

응답 시간도 대부분 비슷한데, 최저 지연시간, 최장 지연시간을 비교했을 때 가장 유리한 모델이긴하다. 최저 51ms, 최장 201ms로 미세하지만 수치는 가장 잘나옴. 의도적으로 50ms, 100ms, 200ms 지연을 줬음에도 불구하고 1ms 정도의 오차로 바로 답변한 것임.

![](https://velog.velcdn.com/images/cassidy/post/69293ca6-dd4e-4584-b473-190bbde9c20a/image.png)

다만 그래프에서 확인할 수 있듯이 완전히 안정화가되어 KO가 발생하기 전까지 더더 많은 시간이 소모된다. 

## 결과 해석
### 1. 전체 결과 요약
**성공률**

- Hybrid + Platform: 95.69%
- Hybrid + Virtual: 94.71%
- NIO + Platform: 93.45%
- NIO + Virtual: 92.29%

**공통점**
요청 수가 많고(20000개 이상), Warm-up이 어느 정도 이뤄져 초반 KO가 이전 시뮬레이션(CpuIntensive)보다 줄었다. 하지만 여전히 안정화 속도와 성공률에서 차이가 발생함.

**패턴**
Hybrid 조합이 NIO 조합보다 성공률이 높고, 안정화가 빠르다. NIO + Virtual은 지연 시간 면에서 최적(최저 51ms, 최장 201ms)이지만, 성공률과 안정화 속도에서 가장 낮다.

### 2. 각 조합별 분석
**Hybrid + Platform (95.69%)**

BIO(Blocking IO)는 각 연결에 스레드를 즉시 할당해 초기 부하에 강하고, Platform Threads(풀 사이즈 100)는 고정된 자원으로 안정적인 처리 가능. 요청 수가 많아 Warm-up이 충분히 이뤄졌고, 지연(50~200ms)이 추가된 상황에서 스레드 풀이 부하를 잘 분산했다. 그래프에서 후반 안정화가 명확하고, 최대 820명 유저에도 KO 없이 처리됨.

- 지연 시간: 최장 206ms로 Google 기준(200ms)과 거의 맞물림. 사실상 6ms이긴함. 성공률이 높은 건 Warm-up과 BIO의 단순성이 기여한 것으로 보인다.


**Hybrid + Virtual (94.71%)**

Virtual Threads는 lightweight로 대규모 동시성을 지원하지만, BIO의 blocking 특성과 결합 시 carrier thread로 전환되는 오버헤드가 발생한다. 요청 수가 많아 초반 부하를 잘 버텼지만, Virtual Threads가 CPU 집약적이지 않은 지연 작업에서 최적화가 덜 이뤄져 성공률이 Hybrid + Platform보다 약간 낮았다. 그래프에서 안정화 후 속도가 빨라지는 건 JIT과 스레드 풀 최적화 결과인 듯?
- 지연 시간: 전체 응답이 약 `10ms` 내부로 안정적 유지. 820명 유저에도 안정적.


**NIO + Platform (93.45%)**

NIO는 Selector 기반으로 비동기 처리에 강하지만, Platform Threads와 결합 시 초기 Selector 준비와 스레드 풀 조율이 복잡하다. 요청 수가 많아 부하가 분산되었지만, 지연 작업(50~200ms) 처리에서 이벤트 루프가 병목을 겪은듯. Warm-up이 이뤄졌어도 안정화가 더디게 진행(그래프에서 극후반 개선).
- 지연 시간: 마찬가지로 응답속도에 큰 하자는 없다. 성공률이 낮은 건 초반 Selector 초기화와 스레드 풀 한계이다.


**NIO + Virtual (92.29%)**

NIO + Virtual은 이전 CpuIntensive에서 강점을 보였지만, 이번 지연 집중 시뮬레이션에서는 성공률이 가장 낮았다. 이유는 NIO의 이벤트 드리븐 모델이 지연(50~200ms)을 추가한 I/O 부하에 최적화되지 않았고, Virtual Threads가 blocking이 적은 환경에서 더 유리하기 때문이다. 요청 수가 많아 초반 부하를 견디긴 했지만, 안정화까지 시간이 더 걸림(그래프에서 KO 발생 전 지연).
- 지연 시간: 최저 51ms, 최장 201ms로 가장 양호하지만, 성공률이 낮은 건 안정화 속도 문제로 사료됨.

### 3. NIO + Virtual이 성공률이 낮았던 이유
CpuIntensive는 계산 중심(CPU 집약)이라 NIO의 이벤트 분산과 Virtual Threads의 가벼움이 시너지를 냈을 것이다. 하지만 LatencySimulation은 의도적으로 지연(50~200ms)을 추가해 I/O 부하를 강조했다. NIO는 I/O 이벤트 처리에 강하지만, 인위적 지연은 Selector가 효율적으로 분배하기 어려운 상황을 만들긴 함. Virtual Threads는 blocking이 적은 환경에서 빛나지만, 여기선 지연이 blocking처럼 작용해 오버헤드가 늘어났을 가능성이 있다.

요청 수가 많아 Warm-up이 어느 정도 이뤄졌지만, rampUsers와 constantUsersPerSec가 급격히 증가(예: 100→300 users/sec)하면서 NIO + Virtual이 초반 부하를 완전히 흡수하지 못했을 것으로 보인다. Hybrid 조합은 BIO의 즉각적 스레드 할당이 이 상황에서 유리했을 것이다.

지연 작업은 CPU 부하보다 I/O 스케줄링에 더 의존한다. NIO + Virtual은 JIT이 I/O 패턴에 최적화되는 데 시간이 더 걸렸고, Virtual Threads의 carrier 전환 비용이 추가로 작용했을 수 있다.

---
# 전체 벤치마킹 결과
| 조합                | HelloWorld | CPU   | Latency | 특성 요약                |
| ----------------- | ---------- | ----- | ------- | -------------------- |
| Hybrid + Platform | 84%        | 53%   | 95.6%   | 안정적이나 Warm-up 의존적    |
| Hybrid + Virtual  | 87%        | 47%   | 94.7%   | 초반 오버헤드 있으나 응답 빠름    |
| NIO + Platform    | 82%        | 45%   | 93.4%   | 초기 Selector 병목 발생    |
| NIO + Virtual     | 69%        | 64.9% | 92.2%   | CPU 부하에선 최적, I/O엔 부적 |

---

위와 같은 실험으로 어떤 부분에 개선점이 더 필요한지 확인해 볼 수 있었다. 만약 이게 내 공부용 프로젝트가 아니었다면 당장 jvm을 뒤져서 튜닝에 목매야 했겠지만..ㅋㅋㅋㅋ jvm 기반 멀티스레드 서버를 구성하고 나름대로 조합해서 어떠한 부분에 추가적 튜닝이 필요한지 파악할 수 있었던 경험이라고 생각함.

NIO를 더 사용하고 싶다면, 추가적인 튜닝이 더 들어가는게 필수적일 것 같다. 요즘 공부를 소홀히하고 있어서.. jvm 쪽도 잘 안보는게 사실이었는데, 이 부분은 더 발전시키고 싶다면 필수적일듯? 그리고 비단 이러한 벤치마킹 툴 뿐만 아니라 jvm 모니터링 툴까지 넣어서 Selector 이벤트와 가상 스레드 전환 비용에 대해서도 추가적으로 살펴봐야 정확한 개선이 가능할 듯 싶다. 아니면 Selector 을 사용하는 부분에서 코드적으로 개선이 필요한 곳이 있을 지 분석해도 좋을 듯 싶음.

단지 지금의 벤치마킹 점수만 올리고 싶은 거면 웜업 오래 시킨다음에 돌리면 그만일 텐데 이게 목적은 아니니 당장 그러한 조치를 취할 필요는 없을 것 같고, 원래는 platform 스레드 사용하는 부분에 netty의 이벤트 루프를 공부해서(스레드 스케줄링을 직접 하신다길래..) 이식해 넣어볼까 싶었는데, 생각을 좀 더 해봐야할 듯?


구체적 튜닝은 추후 로드맵으로 남겨야 할 것 같다.

추후에는 이 서버 구현에 대해 더 정밀하게 설명한 포스팅으로 올 수도 있을 듯 하다. 어떻게 프로토콜을 감지해서 실행 주체를 다르게 하는지.. 이런거..? 근데 이 부분은 톰캣을.. 초반에나 일부 차용했지 사실 구조적으로 완전히 달라서 스프링 학습에는 거리가 있을 듯 싶긴 함. 아니면 `@Async` 같은걸 만들거나 이를 확장해서 FastAPI 처럼 해봐도 재밌을 거 같긴한데.. 걍 일단은 생각만 하는 중..

만약 실제로 구동해보고 싶으시다면, `sprout/data`쪽 컴포넌트 몇개 주석처리하고 돌리셔야 할 것입니다.. 아니면 해당 구조로 데이터베이스 띄우셔야함. Hikari CP 붙여놔서 `application.yml`로 데이터베이스 찾습니다.

> https://github.com/yyubin/sprout


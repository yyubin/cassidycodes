# Spring Kafka Deprecated API 정리

본 문서는 Spring Kafka 4.x 이후 대규모 변경으로 인해 발생한 **JSON 직렬화기 및 에러 처리 관련 Deprecated 사항**과, 그에 대한 **공식 문서 출처**, **변경 이유**, **대안**을 정리한 기술 참고 문서입니다.

---

## 1. JsonSerializer / JsonDeserializer / JsonSerde Deprecated

### 1.1 Deprecated 공식 근거

Spring Kafka 4.x API Javadoc에서 다음 JSON 직렬화 관련 클래스들이 `forRemoval = true`로 표시됨

* `org.springframework.kafka.support.serializer.JsonSerializer`
* `org.springframework.kafka.support.serializer.JsonDeserializer`
* `org.springframework.kafka.support.serializer.JsonSerde`

공식 문서(출처)

* JsonDeserializer API: [https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonDeserializer.html](https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonDeserializer.html)
* JsonSerializer API: [https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonSerializer.html](https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonSerializer.html)
* JsonSerde API: [https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonSerde.html](https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JsonSerde.html)

위 문서들에는 다음과 같이 명시

```
@Deprecated(since="4.0", forRemoval=true)
```

즉, **향후 Spring Kafka에서 제거될 예정임**을 공식적으로 안내하고 있음.

---

### 1.2 Deprecated 사유

Spring 팀이 해당 JSON 직렬화기들을 제거하는 이유는 다음과 같다

1. **Spring 전용 구조로 Kafka 표준과 일관성이 부족함**

   * JsonSerializer/JsonDeserializer는 Spring Kafka 내부 구현에 종속된 비표준 JSON 직렬화기임.
   * Kafka Streams 및 표준 Serde 모델과 통합성이 떨어짐.

2. **헤더 기반 타입 정보(`__TypeId__`) 방식의 구조적 문제**

   * Java 클래스 FQCN이 Kafka 메시지 헤더에 노출됨.
   * 패키지 변경 등으로 역직렬화 실패 가능성이 높음.
   * 보안 취약성 위험이 존재함.

3. **trustedPackages 기반 보안 모델의 유지보수 어려움**

   * 모든 도메인 패키지를 등록해야 하는 불편함.
   * `*` 등록 시 보안이 사실상 무력화됨.

4. **Jackson 버전 관리 및 설정 충돌 문제**

   * Spring 팀이 내부 래퍼를 유지해야 함 -> 유지보수 비용 증가.
   * Streams, Producer, Consumer 간 직렬화 구조가 통일되지 않음.

5. **Spring Kafka 직렬화 체계를 장기적으로 표준화하기 위함**

   * JacksonJsonSerializer/JacksonJsonDeserializer 기반 구조로 통합
   * Kafka Serde 체계와의 호환성을 높이기 위한 방향성.

---

### 1.3 공식 권장 대안

Spring Kafka 공식 문서에서는 JSON 직렬화 시 다음을 사용할 것을 권장

#### 1) JacksonJsonSerializer / JacksonJsonDeserializer

출처:
[https://docs.spring.io/spring-kafka/reference/kafka/serdes.html](https://docs.spring.io/spring-kafka/reference/kafka/serdes.html)

문서에 명시된 문구:

```
Spring Kafka also provides JacksonJsonSerializer and JacksonJsonDeserializer.
```

이는 기존 JsonSerializer/JsonDeserializer를 대체하기 위한 표준화된 설정 방식

#### 2) Avro / Schema Registry 기반 Kafka Serde

대규모 이벤트 시스템에서는 Schema Registry + Avro/JSON Schema 기반 Serde 구조가 권장

---

## 2. ContainerProperties.setAckOnError 제거

### 2.1 Deprecated 및 제거 공식 근거

Spring Kafka 2.6.x deprecated 목록에 다음과 같이 명시됨

출처:
[https://docs.spring.io/spring-kafka/docs/2.6.1/api/deprecated-list.html](https://docs.spring.io/spring-kafka/docs/2.6.1/api/deprecated-list.html)

문구 발췌:

```
ContainerProperties.setAckOnError(boolean) — deprecated.
In favor of GenericErrorHandler.isAckAfterHandle().
```

즉, **기존 에러 상황에서 오프셋 커밋 여부를 결정하던 API는 더 이상 사용 불가**하며, 향후 버전에서 삭제

---

### 2.2 Deprecated 사유 (구조 변경)

1. **컨테이너가 아닌 ErrorHandler가 모든 예외 처리 책임을 가지는 구조로 변경됨**

   * Spring Kafka 2.3 이후 ErrorHandler 모델이 전면 개편됨.
   * 재시도, DLQ, 예외 처리, 오프셋 커밋 정책 등을 ErrorHandler가 관리.

2. **역할 중복 제거**

   * 이전 구조에서는 ContainerProperties와 ErrorHandler가 모두 오프셋 커밋에 관여함.
   * API 책임이 명확하지 않아 유지보수 어려움.

3. **DefaultErrorHandler 기반 중앙집중식 에러 처리 모델 도입**

   * 재시도 백오프, DLQ 전송, 예외 분기 등 모든 로직을 ErrorHandler에서 처리하도록 설계됨.

---

### 2.3 공식 권장 대안

컨슈머 설정은 다음 방식으로 변경되어야 함

#### 기존 (사용 불가)

```
containerProperties.setAckOnError(false);
```

#### 대안 (DefaultErrorHandler 사용)

```
DefaultErrorHandler errorHandler = new DefaultErrorHandler(...);
errorHandler.setAckAfterHandle(false); // 예외 발생 시 오프셋 커밋 여부 설정
factory.setCommonErrorHandler(errorHandler);
```

오프셋 커밋 정책은 **ErrorHandler 내부에서 일관되게 관리하는 구조**로 변경됨.

---

## 3. 최종 요약

* Spring Kafka는 직렬화 및 에러 처리 체계를 전반적으로 재정비하면서 기존 JSON 계열 직렬화기(JsonSerializer, JsonDeserializer, JsonSerde)를 공식 deprecated 처리하고 제거 예정으로 분류함.
* Kafka 표준 Serde 모델과의 일관성, 보안성, Jackson 설정 충돌 문제 해결을 위한 결정임.
* ContainerProperties.setAckOnError 또한 deprecated 처리되었으며, 새로운 ErrorHandler 모델이 오프셋 커밋 여부를 전담.
* 공식 권장 방식은 `JacksonJsonSerializer`, `JacksonJsonDeserializer`, 그리고 필요 시 Schema Registry 기반 Serde 사용

---

## 4. 상세 개선 사항
**bookvoyage**에서 이벤트 로그 수집을 Kafka로 하는데 설정 시 발견한 문제였다.  
다음과 같이 수정하여 카프카 설정을 마쳤음.  

```java
package org.yyubin.infrastructure.stream.kafka;

import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JacksonJsonDeserializer;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;
import org.yyubin.application.event.EventPayload;

@Configuration
@EnableKafka
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, EventPayload> producerFactory() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configs.put(ProducerConfig.ACKS_CONFIG, "all");
        configs.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        return new DefaultKafkaProducerFactory<>(
            configs,
            new StringSerializer(),
            new JacksonJsonSerializer<>()
        );
    }

    @Bean
    public KafkaTemplate<String, EventPayload> kafkaTemplate(ProducerFactory<String, EventPayload> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    public ConsumerFactory<String, EventPayload> consumerFactory() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configs.put(ConsumerConfig.GROUP_ID_CONFIG, "bookvoyage-default");
        configs.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        configs.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        JacksonJsonDeserializer<EventPayload> jsonDeserializer = new JacksonJsonDeserializer<>(EventPayload.class);
        jsonDeserializer.addTrustedPackages("*");

        return new DefaultKafkaConsumerFactory<>(
            configs,
            new StringDeserializer(),
            jsonDeserializer
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, EventPayload> kafkaListenerContainerFactory(
            ConsumerFactory<String, EventPayload> consumerFactory
    ) {
        ConcurrentKafkaListenerContainerFactory<String, EventPayload> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);

        // ErrorHandler로 에러 처리 및 오프셋 커밋 제어 (Spring kafka 4.0 부터 변경)
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(new FixedBackOff(1000L, 2L));
        errorHandler.setAckAfterHandle(false); // 오류 발생 시 오프셋 커밋하지 않음
        factory.setCommonErrorHandler(errorHandler);

        return factory;
    }
}
```

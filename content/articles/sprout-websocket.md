# 들어가며
실시간 양방향 통신이 필요한 현대 애플리케이션에서 **WebSocket**은 필수적인 기술이기도 하다. 하지만 단순히 라이브러리나 프레임워크를 사용하는 것과 프로토콜의 내부 동작을 이해하고 직접 구현하는 것에는 차이가 있다고도 생각한다. 이는 명백한 바퀴 두번 만들기 이지만 현재 공부를 하는 입장에서, 이러한 프로토콜 구현을 시도해보는 것은 경험 자체로 의미가 있다고 생각한다. Sprout에서 HTTP 1.1, WebSocket을 지원하는데 해당 글에서는 RFC 6455 WebSocket 프로토콜을 어떻게 구현했는지, 그리고 그 과정에서 마주친 기술적 도전과 해결 방법등을 다뤄볼 예정이다. (실제 구동 모습까지 포함)

# WebSocket이 해결하는 문제
HTTP는 기본적으로 요청-응답 모델을 따른다. 클라이언트가 요청을 받아야만 서버가 응답 가능하다. 하지만 채팅 어플리케이션, 실시간 알림, 협업 도구처럼 서버에서 클라이언트로 즉시 데이터를 푸시해야 하는 요구도 있다. 이런 경우엔 어떻게 해야할까?

### 전통적인 해결책들
1. 폴링(Polling) : 클라이언트가 주기적으로 서버에 요청을 보냄.
2. 롱 폴링(Long Polling) : 서버가 응답을 지연시켜 데이터가 있을 때까지 대기
3. Server-Sent Events(SSE) : 서버에서 클라이언트로의 단방향 스트림. 양방향 통신은 불가능하다.

WebSocket을 사용하면 이러한 문제를 해결할 수 있다. 한 번의 핸드셰이크 후 지속적인 양방향 연결을 유지하여 HTTP 오버헤드 없이 실시간으로 메세지를 주고 받을 수 있다.

# 아키텍처 설계 결정
## NIO 기반 논블로킹 I/O
전통적인 블로킹 I/O 모델에서는 각 연결마다 스레드가 필요하다. 만개의 동시 WebSocket 연결이 있다면 만 개의 스레드가 필요한 것. 이는 엄청난 메모리 오버헤드와 컨텍스트 스위칭 비용을 발생시킨다. 

Spring 및 다른 여타의 프레임워크, 라이브러리가 그러하듯 Java NIO(Non-blocking I/O)을 사용하여 이 문제를 해결하도록 했다. 단일 이벤트 루프 스레드가 Selector를 통해 수천 개의 연결을 모니터링하고, 실제 I/O 이벤트가 발생했을 때에만 처리한다.

```java
// 단일 스레드가 모든 연결을 감시
while (true) {
    selector.select();  // I/O 이벤트 대기
    
    Set<SelectionKey> selectedKeys = selector.selectedKeys();
    for (SelectionKey key : selectedKeys) {
        if (key.isReadable()) {
            // 읽을 데이터가 있는 채널에서만 읽기
            handleRead(key);
        } else if (key.isWritable()) {
            // 쓸 준비가 된 채널에만 쓰기
            handleWrite(key);
        }
    }
}
```

이렇게 접근하면?
- 수천 개의 동시 연결을 최소한의 스레드로 처리할 수 있다 -> 확장성
- 연결당 스레드 대신 연결당 소켓 채널만 유지 -> 메모리 효율적
- I/O 준비가 된 연결만 즉시 처리 -> 낮은 지연시간

## 스트리밍 프레임 파싱
WebSocket 메세지는 작을수도 있지만(채팅 메세지 등), 클 수도 있다(파일 전송). 전체 메세지를 메모리에 로드한다면, 조금만 큰 파일을 올려도 엄청난 문제가 발생한다. (1GB 데이터만 올려도 메모리 1GB가 필요해짐)

이러한 문제를 사전에 예방하기 위해 스트리밍 방식을 채택했다. 프레임 헤더를 파싱하여 페이로드를 `InputStream`으로 래핑하여 애플리케이션이 필요한 만큼 점진적으로 읽을 수 있게 하는 것이다.

```java
public class WebSocketFrame {
    private final boolean fin;
    private final int opcode;
    private final InputStream payloadStream;  // 전체 로드 없음!
    
    // 명시적으로 요청될 때만 전체 바이트 배열 생성
    public byte[] getPayloadBytes() throws IOException {
        return payloadStream.readAllBytes();
    }
}
```

이 작업이 중요한 이유
- 1GB 파일을 전송할 때 1GB 메모리가 아닌 고정된 버퍼(예: 8KB)만 필요
- 처리 지연 없이 데이터가 도착하는 즉시 처리 시작 가능
- 메모리 압박 없이 여러 대용량 전송 동시 처리 가능

## RFC 6455 핸드셰이크 구현
### 프로토콜 감지
웹소켓은 HTTP 연결에서 시작된다. 클라이언트는 먼저 일반 HTTP 요청을 보내고 특수한 헤더를 통해 WebSocket으로 업그레이드를 요청한다. 서버는 이 요청을 감지하여 적절하게 처리해야하는 것이다.

```java
@Component
public class WebSocketProtocolDetector implements ProtocolDetector {
    @Override
    public String detect(ByteBuffer buffer) throws Exception {
        buffer.mark();  // 현재 위치 저장
        
        // HTTP 요청의 시작 부분만 읽기
        byte[] bytes = new byte[Math.min(buffer.remaining(), 512)];
        buffer.get(bytes);
        buffer.reset();  // 다른 핸들러가 읽을 수 있도록 위치 복원
        
        String content = new String(bytes, StandardCharsets.UTF_8);
        
        // WebSocket 업그레이드 요청 확인
        if (content.contains("Upgrade: websocket") || 
            content.contains("Upgrade: WebSocket")) {
            return "WEBSOCKET";
        }
        
        return "UNKNOWN";
    }
}
```
> 개인적으로 프로토콜의 상태를 Enum이나 상수값으로 관리하는게 더 적절해 보여서 리팩토링을 염두에 두고 있다.

여기에서 중요한 것은 `buffer.makr()`와 `buffer.reset()`이다. 프로토콜 감지를 위해 버퍼를 읽지만 실제 핸들러가 처음부터 다시 읽을 수 있도록 위치를 복원해야 하는 것이다. 이는 NIO의 `ByteBuffer` API를 사용한 우아한 패턴이다.

### 핸드셰이크 협상
RFC 6455는 클라이언트와 서버 간의 핸드셰이크 프로세스를 명확하게 정의하고 있다. 클라이언트 요청은 다음과 같다.
```plain
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```
서버에서는 이 헤더들을 정확하게 검증하고 적절하게 응답을 생성해야 한다.
```java
    @Override
    public boolean performHandshake(HttpRequest<?> request, SocketChannel channel) throws IOException {
        // 1. 필수 헤더 검증
        Map<String, String> headers = request.getHeaders();
        String upgradeHeader = headers.get("Upgrade");
        String connectionHeader = headers.get("Connection");
        String secWebSocketKey = headers.get("Sec-WebSocket-Key");
        String secWebSocketVersion = headers.get("Sec-WebSocket-Version");

        // Connection 헤더는 "Upgrade"를 포함해야 함 (쉼표로 구분된 여러 값 가능)
        boolean hasUpgradeConnection = connectionHeader != null &&
                                       connectionHeader.toLowerCase().contains("upgrade");

        if (!"websocket".equalsIgnoreCase(upgradeHeader) ||
                !hasUpgradeConnection ||
                secWebSocketKey == null || secWebSocketKey.isBlank() ||
                !"13".equals(secWebSocketVersion)) { // WebSocket Version 13 (RFC 6455)
            sendHandshakeErrorResponse(channel, 400, "Bad Request", "Invalid WebSocket handshake request headers.");
            return false;
        }

        // 2. Sec-WebSocket-Accept 값 계산
        String secWebSocketAccept;
        try {
            secWebSocketAccept = generateSecWebSocketAccept(secWebSocketKey);
        } catch (NoSuchAlgorithmException e) {
            sendHandshakeErrorResponse(channel, 500, "Internal Server Error", "Server error during handshake.");
            return false;
        }

        String response = "HTTP/1.1 101 Switching Protocols\r\n" +
                         "Upgrade: websocket\r\n" +
                         "Connection: Upgrade\r\n" +
                         "Sec-WebSocket-Accept: " + secWebSocketAccept + "\r\n" +
                         "\r\n";

        ByteBuffer buffer = ByteBuffer.wrap(response.getBytes(StandardCharsets.UTF_8));
        while (buffer.hasRemaining()) {
            channel.write(buffer);
        }

        return true;
    }
```
### Sec-WebSocket-Accept의 비밀
`Sec-WebSocket-Accpet` 헤더는 단순한 보안 메커니즘이 아니다. 이는 서버가 실제로 WebSocket 프로토콜을 이해하고 있다는 것을 증명하는 암호학적 증거이기도 하다.
```java
    private static final String WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

    private String generateSecWebSocketAccept(String secWebSocketKey) throws NoSuchAlgorithmException {
        String combined = secWebSocketKey + WEBSOCKET_GUID;
        MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
        byte[] sha1Hash = sha1.digest(combined.getBytes(StandardCharsets.US_ASCII)); // ASCII로 인코딩
        return Base64.getEncoder().encodeToString(sha1Hash);
    }
```
#### 왜 이런 과정이 필요한가
1. **프록시 방지**: 중간의 HTTP 프록시가 WebSocket을 이해하지 못하고 임의의 응답을 보내는 것을 방지하기 위해
2. **캐싱 방지**: HTTP 캐시가 WebSocket 핸드셰이크를 캐싱하는 것을 방지
3. **프로토콜 증명**: 서버가 실제로 WebSocket 프로토콜을 구현했음을 증명

> 매직 GUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`는 RFC 6455에서 정의된 고정 상수입니다. 이것은 무작위 값이 아니라 "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"이라는 문자열의 UUID입니다.

## WebSocket 프레임 구조 깊이 파헤치기
### 비트 레벨 프레임 파싱
> 비트 연산에 대해 알고 있다고 가정합니다.

WebSocket 프레임은 아주 컴팩트하게 설계되어있다. 모든 바이트가 의미를 갖고, 첫 두 바이트 만으로도 많은 의미를 내포하고 있다.
```plain
첫 번째 바이트
┌─────────┬───────────────────┐
│ FIN(1)  │ RSV(3) │ Opcode(4)│
├─────────┼────────┼──────────┤
│    1    │  0 0 0 │  0 0 0 1 │
└─────────┴────────┴──────────┘
     │         │         └─ 프레임 타입 (텍스트, 바이너리, close 등)
     │         └─ 예약된 비트 (향후 확장용)
     └─ 최종 프레임 여부 (단편화 지원)

두 번째 바이트
┌────────┬─────────────────┐
│ MASK(1)│  Payload len(7) │
├────────┼─────────────────┤
│   1    │  0 1 1 1 1 0 1  │
└────────┴─────────────────┘
    │              └─ 페이로드 길이 (또는 확장 길이 표시자)
    └─ 마스킹 여부
```
실제 파싱 코드를 보면 이 비트 연산이 어떻게 이루어지는지 명확히 알 수 있다.
```java
@Override
public WebSocketFrame parse(InputStream in) throws Exception {
    // 첫 두 바이트 읽기
    int b1 = in.read();
    int b2 = in.read();
    
    if (b1 == -1 || b2 == -1) {
        throw new RuntimeException("Unexpected end of stream during frame header");
    }
    
    // 첫 번째 바이트 파싱
    boolean fin = (b1 & 0x80) != 0;  // 최상위 비트 (1000 0000)
    int opcode = b1 & 0x0F;           // 하위 4비트 (0000 1111)
    
    // 두 번째 바이트 파싱
    boolean masked = (b2 & 0x80) != 0;  // 최상위 비트
    int payloadLen = b2 & 0x7F;          // 하위 7비트 (0111 1111)
    
    // ... 확장 길이 및 마스킹 처리
```
### 확장 페이로드 길이 설계
WebSocket은 작은 메세지부터 거대한 메세지까지 효율적으로 처리하기 위해 3단계 길이 인코딩을 사용한다.
```java
long actualPayloadLen;

if (payloadLen <= 125) {
    // 작은 메시지: 7비트로 충분 (0-125바이트)
    actualPayloadLen = payloadLen;
    
} else if (payloadLen == 126) {
    // 중간 메시지: 추가 16비트 사용 (126 ~ 65,535바이트)
    int byte1 = in.read() & 0xFF;
    int byte2 = in.read() & 0xFF;
    actualPayloadLen = (byte1 << 8) | byte2;
    
} else if (payloadLen == 127) {
    // 대용량 메시지: 추가 64비트 사용 (~18 엑사바이트까지!)
    actualPayloadLen = 0;
    for (int i = 0; i < 8; i++) {
        actualPayloadLen = (actualPayloadLen << 8) | (in.read() & 0xFF);
    }
} else {
    throw new ProtocolException("Invalid payload length: " + payloadLen);
}
```
이렇게 구성하여 다음과 같은 장점을 얻을 수 있다.
- 작은 메세지 최적화: 대부분의 채팅메세지는 125 바이트 이하이므로 2바이트 헤더만 필요하다
- 중간 크기 효율성: 64KB까지의 메세지는 4바이트 헤더로 처리 가능
- 무제한 확장성: 이론적으론 18엑사바이트까지 지원

### 마스킹: 클라이언트 -> 서버 방향의 페이로드는 반드시 마스킹
마스킹의 목적은 암호화가 아니라, 중간에 끼어 있는 프록시/캐시가 WebSocket 트래픽을 HTTP로 오인해서 캐싱하거나 건드리는 것을 방지하는 정도의 “난독화”이다.

```java
// RFC 6455 Section 5.3: 클라이언트는 반드시 마스킹해야 함
if (!masked) {
    throw new ProtocolException(
        "Client-to-server frames must be masked per RFC 6455 Section 5.3"
    );
}

// 4바이트 마스킹 키 읽기
byte[] maskingKey = new byte[4];
if (in.read(maskingKey) != 4) {
    throw new IOException("Failed to read masking key");
}

// 마스킹된 페이로드 스트림 생성
InputStream payloadInputStream = new LimitedInputStream(in, actualPayloadLen);
payloadInputStream = new MaskingInputStream(payloadInputStream, maskingKey);
```
마스킹 알고리즘은 간단하다. **4바이트 마스킹 키를 돌려 쓰면서 XOR** 하는 것이다.

마스킹 알고리즘의 수식으로 표현하면 다음과 같다.
> transformed-octet-i = original-octet-i XOR masking-key-octet-j
> where j = i MOD 4

- original-octet-i : 페이로드의 i번째(0 기반) 바이트
- masking-key-octet-j : 4바이트 마스킹 키 중 j번째 바이트 (0 ~ 3)
- j = i mod 4 : 페이로드 바이트 인덱스를 4로 나눈 나머지, 키를 4바이트 단위로 순환 사용

예를 들어,
```plain
마스킹 키: K = [k0, k1, k2, k3]
페이로드: P = [p0, p1, p2, p3, p4, p5, ...]

마스킹된 바이트:
- c0 = p0 XOR k0
- c1 = p1 XOR k1
- c2 = p2 XOR k2
- c3 = p3 XOR k3
- c4 = p4 XOR k0 (4 % 4 = 0)
- c5 = p5 XOR k1 (5 % 4 = 1)
```

언마스킹도 똑같이 XOR 한 번 더 하면 그만임.
```plain
- p0 = c0 XOR k0
- p1 = c1 XOR k1
```

```java
public class MaskingInputStream extends FilterInputStream {
    private final byte[] maskingKey;
    private long bytesRead = 0;
    
    @Override
    public int read() throws IOException {
        int originalByte = super.read();
        if (originalByte == -1) {
            return -1;
        }
        
        // RFC 6455 Section 5.3 마스킹 알고리즘
        // transformed-octet-i = original-octet-i XOR masking-key-octet-j
        // where j = i MOD 4
        int maskIndex = (int) (bytesRead % 4);
        int maskByte = maskingKey[maskIndex] & 0xFF;
        int transformedByte = (originalByte ^ maskByte) & 0xFF;
        
        bytesRead++;
        return transformedByte;
    }
    
    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        int bytesRead = super.read(b, off, len);
        if (bytesRead == -1) {
            return -1;
        }
        
        // 효율성을 위한 배치 언마스킹
        for (int i = 0; i < bytesRead; i++) {
            int maskIndex = (int) ((this.bytesRead + i) % 4);
            b[off + i] = (byte) ((b[off + i] ^ maskingKey[maskIndex]) & 0xFF);
        }
        
        this.bytesRead += bytesRead;
        return bytesRead;
    }
}
```

#### 단일 바이트 `read()`
```java
int originalByte = super.read();
...
int maskIndex = (int) (bytesRead % 4);
int maskByte = maskingKey[maskIndex] & 0xFF;
int transformedByte = (originalByte ^ maskByte) & 0xFF;
bytesRead++;
return transformedByte;
```
- `bytesRead` : 이 스트림에서 지금까지 읽은 페이로드 바이트 수 (i 역할)
- `maskIndex` = bytesRead % 4 : 위에서 말한 j = i mod 4
- `maskingKey[maskIndex]` : 4바이트 키 중 j번째 바이트
- `& 0xFF` : Java의 byte가 부호 있는 타입이라, 0~255 범위의 unsigned 값으로 쓰기 위해 마스킹

#### 배열 단위 `read(byte[] b, int off, int len)`
```java
int bytesRead = super.read(b, off, len);
...
for (int i = 0; i < bytesRead; i++) {
    int maskIndex = (int) ((this.bytesRead + i) % 4);
    b[off + i] = (byte) ((b[off + i] ^ maskingKey[maskIndex]) & 0xFF);
}
this.bytesRead += bytesRead;
```
- `super.read(b, off, len)`으로 원본 바이트를 한 번에 읽고
- i를 0부터 bytesRead - 1까지 돌면서,
- 전체 스트림 기준 인덱스 = `this.bytesRead + i`
- 거기에 % 4를 해서 어떤 마스킹 키 바이트를 쓸지 계산
- 스트림 전체에서의 위치를 기준으로 키를 순환하는 구조

앞서서 이미 원본 바이트도 쪼개놨기 때문에 무리가 아님.

## 세션 관리와 라이프사이클
### WebSocket 세션의 탄생부터 소멸
WebSocket 세션은 다음과 같은 라이프사이클을 거친다.
```plain
연결 수립 → OnOpen 호출 → 메시지 교환 → OnClose/OnError 호출 → 연결 종료
```

해당 라이프사이클은 `DefaultWebSocketSession` 객체에서 담당한다.
```java
public class DefaultWebSocketSession implements WebSocketSession, WritableHandler {
    private final String id;  // 고유 세션 식별자
    private final SocketChannel channel;  // NIO 채널
    private final Selector selector;  // NIO 셀렉터
    private final HttpRequest<?> handshakeRequest;  // 원본 HTTP 요청
    private final WebSocketEndpointInfo endpointInfo;  // 엔드포인트 메타데이터
    
    private volatile boolean open = true;
    private volatile boolean isClosePending = false;
    
    // 논블로킹 I/O를 위한 버퍼
    private final ByteBuffer readBuffer = ByteBuffer.allocate(65536);
    private final Queue<ByteBuffer> pendingWrites = new ConcurrentLinkedQueue<>();
    
    // 사용자 정의 속성 (예: 세션 상태, 인증 정보)
    private final Map<String, Object> userProperties = new ConcurrentHashMap<>();
}
```
### 논블로킹 읽기: 이벤트 기반 데이터 처리
NIO 셀렉터가 읽기 준비 이벤트를 감지하면 `read()` 메서드가 호출된다.
```java
@Override
public void read(SelectionKey key) throws Exception {
    // 1. 채널로부터 논블로킹 읽기
    int bytesRead = channel.read(readBuffer);
    
    if (bytesRead == -1) {
        // EOF: 클라이언트가 연결을 닫음
        callOnCloseMethod(CloseCodes.NO_STATUS_CODE);
        close();
        return;
    }
    
    if (bytesRead == 0) {
        // 이벤트가 발생했지만 실제 데이터는 없음 (spurious wakeup)
        return;
    }
    
    // 2. 버퍼를 읽기 모드로 전환
    readBuffer.flip();
    
    // 3. 버퍼에서 프레임 추출
    while (readBuffer.remaining() > 0) {
        readBuffer.mark();  // 현재 위치 표시
        
        InputStream frameInputStream = new ByteBufferInputStream(readBuffer);
        
        try {
            WebSocketFrame frame = frameParser.parse(frameInputStream);
            processFrame(frame);
        } catch (NotEnoughDataException e) {
            // 불완전한 프레임: 더 많은 데이터 도착 대기
            readBuffer.reset();
            break;
        } catch (Exception e) {
            // 파싱 오류: 연결 종료
            callOnErrorMethod(e);
            close(CloseCodes.PROTOCOL_ERROR);
            return;
        }
    }
    
    // 4. 버퍼를 쓰기 모드로 전환 (다음 읽기 준비)
    readBuffer.compact();
}
```
해당 코드의 핵심 패턴은 다음과 같다.
- `flip()` : 쓰기 모드에서 읽기 모드로 전환 (limit을 position으로, position을 0으로)
- `mark()`/`reset()` : 불완전한 프레임을 만났을 때 position 복원
- `compact()` : 읽기 모드에서 쓰기 모드로 전환하면서 처리되지 않은 데이터 유지

### 프레임 처리 로직
```java
    public void dispatchMessage(WebSocketFrame frame) throws Exception {
        this.processingContext.setCurrentFrame(frame);
        try {
            frameDispatcher.dispatch(this.processingContext, this, pathParameters);
        } catch (Exception e) {
            callOnErrorMethod(e); // 에러 핸들러 호출
            close(); // 치명적 오류 시 연결 종료
        }
    }
```
```java
    // WebSocketFrameDispatcher
    private final FrameHandler handlerChain;
    private final List<WebSocketMessageDispatcher> messageDispatchers;

    public WebSocketFrameDispatcher(List<FrameHandler> handlers, List<WebSocketMessageDispatcher> messageDispatchers) {
        this.messageDispatchers = messageDispatchers;
        this.handlerChain = buildHandlerChain(handlers);
    }

    public void dispatch(FrameProcessingContext state, WebSocketSession webSocketSession, Map<String, String> pathParameters) throws Exception {
        // 핸들러 체인에 프레임 처리 위임
        boolean messageCompleted = handlerChain.handle(state);

        if (messageCompleted) {
            // 메시지가 완성되면 실제 비즈니스 로직을 처리할 디스패처에게 위임
            MessagePayload payload = state.createPayload();
            InvocationContext contextWithPayload = new DefaultInvocationContext(webSocketSession, pathParameters, payload, state.getFrame());

            DispatchResult result = null;
            try {
                for (WebSocketMessageDispatcher dispatcher : messageDispatchers) {
                    if (dispatcher.supports(state.getFrame(), contextWithPayload)) {
                        result = dispatcher.dispatch(state.getFrame(), contextWithPayload);
                        if (result.isHandled()) {
                            break;
                        }
                    }
                }
            } finally {
                // ... 스트림 닫기 및 상태 초기화
                state.reset(); // 버퍼 및 분할 메시지 상태 초기화
            }
            // ... 기타 에러 처리
        }
    }
}
```
`WebSocketMessageDispatcher`를 구현한 여러 구현체를 투과하여 적절한 구현체를 선택하도록 하는 책임 체인 구조를 만들었다.

해당 부분의 구체적인 아키텍처는 다음과 같다.
```plain
WebSocketFrame (수신된 raw 프레임)
       ↓
WebSocketMessageDispatcher (인터페이스)
       ├─ JsonWebSocketMessageDispatcher      → JSON 텍스트 메시지 처리
       └─ RawBinaryWebSocketMessageDispatcher → Raw 바이너리 메시지 처리
               ↓ (공통 로직)
       AbstractWebSocketMessageDispatcher (추상 클래스)
               ↓
       실제 @MessageMapping 메서드 호출
```

여러 디스패처 중 `supports()`가 true인 하나만 선택되어 `dispatch()`가 실행된다.

#### 공통 인터페이스 & 추상 클래스
##### `WebSocketMessageDispatcher` 인터페이스
```java
boolean supports(WebSocketFrame frame, InvocationContext context);
DispatchResult dispatch(WebSocketFrame frame, InvocationContext context) throws Exception;
```
##### `AbstractWebSocketMessageDispatcher` (핵심 로직)
이 추상 클래스가 거의 모든 실제 작업을 수행하므로 추가적으로 살펴보자.
> 웹소켓 버전의 프론트 컨트롤러라고 생각하면 더 간단하다. 
```java
public final DispatchResult dispatch(...) {
    1. prepareDispatchInfo() → 하위 클래스에서 목적지(destination)와 페이로드 추출
    2. endpointInfo에서 @MessageMapping 메서드 찾기
    3. WebSocketArgumentResolver로 메서드 파라미터 바인딩
    4. 메서드 invoke
    5. InputStream 파라미터가 있었는지 여부에 따라 스트림 소비 여부 반환
}
```
**주요 포인트**
1. 하위 클래스(Json, Binary)가 메세지를 파싱하여 어디로 보낼지 결정
2. `WebSocketEndpointInfo`는 미리 스캔된 `@MessageMapping("/xxx")` 메서드 정보 보관소
3. Spring의 `HandlerMethodArgumentResolver`와 완전히 동일한 개념이다. `@Payload`, `@Header`, `WebSocketSession` 등을 자동 주입 한다. (MVC를 만들면서 개념을 차용해 왔음)
4. 리플렉션으로 메서드 호출
5. `DispatchResult(true, needToCloseStream)` → InputStream을 핸들러가 직접 소비했으면 상위 레이어에서 스트림을 닫지 않도록 함 (중요!)

#### 내장 디스패처 두 개
##### JsonWebSocketMessageDispatcher (가장 많이 쓰일 타입)
```json
{
  "destination": "/chat/send",
  "payload": {
    "roomId": 123,
    "message": "안녕"
  }
}
```
이러한 형식의 JSON을 기대한다.
- `ParsedMessage`는 다음과 같이 생겼음.
```java
public class ParsedMessage {
    private String destination;
    private String payload;
}
```
**동작 흐름**
1. 텍스트 프레임인지 확인 (`opcode 1 or 0 + isText()`)
2. 전체 텍스트를 `ObjectMapper`를 사용하여 `ParsedMessage`로 역직렬화
3. `parsedMessage.getDestination()` 추출 (예: `/chat/send`)
4. `parsedMessage.getPayload()` 는 핸들러 메서드(웹소켓 컨트롤러라고 생각하면 될듯) `@Payload`로 주입될 객체

이렇게 구성할 지 **클라이언트가 명시적으로 목적지를 지정**했을때 **하나의 웹소켓 연결로 여러 종류의 메세지 처리**가 가능해지는 것이다. 이게 멀티플렉싱의 의미이기도 하다.

##### RawBinaryWebSocketMessageDispatcher
```plain
// 클라이언트가 바이너리 프레임으로 아무 데이터나 보냄
// 예: 파일 청크, 프로토콜 버퍼, 이미지 등
```
- 고정된 destination = `"/binary"`
- 페이로드 = `byte[]` 그대로 전달

이러한 결과를 거쳐 다음과 같은 `DispatchResult`를 만듦.

#### DispatchResult의 의미
```java
new DispatchResult(boolean handled, boolean streamConsumed)
```
- `handled = true`: 정상적으로 핸들러 메서드 호출됨
- `streamConsumed = true`: 핸들러가 InputStream 파라미터를 받아서 직접 읽음 -> 프레임 디코더가 스트림을 닫지 말아야 함
- `streamConsumed = false`: 페이로드가 byte[] 등으로 복사됨 -> 상위 레이어에서 스트림 자원 해제 가능

이는 메모리 효율과 대용량 파일 처리를 가능하게 하기 위한 조치이다.

### 논블로킹 쓰기: 백프레셔 처리
서버에서 클라이언트로 메세지를 보내는 것 또한 논블로킹이어야 한다.
이 구조의 전체적 목표는 "서버 -> 클라이언트" 전송이 절대 블로킹되어선 안된다는 것이다.
```java
session.sendText("안녕");  // 이 호출은 즉시 리턴해야 함
```
이 메서드가 0.1초도 멈추면 안된다.
TCP 소켓 버퍼가 가득 차거나, 네트워크가 느려도 스레드가 블록되면 안된다는 것임.

다시 정리하자면 주요 구성요소는 다음과 같다.

#### 주요 구성요소
| 구성 요소 | 역할 |
| --- | --- |
| `pendingWrites` (Queue<ByteBuffer>) | 아직 전송되지 않은 WebSocket 프레임들을 보관 |
| `selector` + `OP_WRITE` | 소켓이 "쓸 수 있을 때" 알려줌 |
| `scheduleWrite()` | 쓰기 요청을 큐에 넣고, 필요시 OP_WRITE 등록 |
| `write()` | Selector에서 OP_WRITE 발생 시 실제로 데이터 씀 |
| `isClosePending` | close() 호출됐지만 아직 전송 중이라 대기 중 |

#### 상세 흐름 설명
##### 1. 사용자가 메세지 전송(`sendText()`)
```java
session.sendText("{\"type\":\"chat\",\"msg\":\"hi\"}");
```
```java
@Override
public void sendText(String message) throws IOException {
    scheduleWrite(ByteBuffer.wrap(frameEncoder.encodeText(message)));
}
```
- `encodeText()`에서 완전한 웹소켓 프레임을 생성한다. (FIN=1, opcode=0x1, 마스킹 없음 등)
- `ByteBuffer.wrap()`는 Heap ByteBuffer로 감싼다. (직접 버퍼 아님, 하지만 nio에선 문제 없다)
- `scheduleWrite()` 호출 -> 즉시 리턴! (여기서 블로킹 없음)

**이 시점에서 sendText()는 끝난것이다. 스레드는 자유로움..🪽**

> 실제 더 고성능을 원한다면 Heap ByteBuffer가 아닌 Direct ByteBuffer를 쓰는게 유리하다. 이에 대한 부분은 추가로 정리하여 TIL에 작성해볼 것.

##### 2. scheduleWrite() — 쓰기 요청 예약
```java
private void scheduleWrite(ByteBuffer buf) {
    pendingWrites.add(buf);  // 큐에 넣기

    SelectionKey key = channel.keyFor(selector);
    if (key != null && key.isValid() && (key.interestOps() & OP_WRITE) == 0) {
        key.interestOps(key.interestOps() | OP_WRITE);  // 쓰기 관심 등록
        selector.wakeup();  // selector가 select() 중이라면 깨워서 바로 처리
    }
}
```
- `endingWrites.add(buf)` -> "이 데이터는 나중에 보내야 해"라고 예약하는 것
- 만약 지금 쓰기 관심이 없었다면? -> `OP_WRITE` 등록
- `selector.wakeup()`: 만약 다른 스레드가 `selector.select()`에서 대기 중이라면 즉시 깨워서 쓰기 처리 시작

**만약 네트워크가 느리더라도 이 메서드는 절대 대기하지 않음**

##### 3. selector.select()에서 OP_WRITE 이벤트 발생 → write() 호출
```java
@Override
public void write(SelectionKey key) throws Exception {
    ByteBuffer buf;
    while ((buf = pendingWrites.peek()) != null) {
        channel.write(buf);  // 실제 소켓에 쓰기

        if (buf.hasRemaining()) {
            return;  // 아직 다 못 썼음 → 다음 OP_WRITE 때 이어서
        }
        pendingWrites.poll();  // 다 썼으면 큐에서 제거
    }

    // 큐가 비었다 → 더 이상 보낼 것 없음
    if (pendingWrites.isEmpty()) {
        key.interestOps(key.interestOps() & ~OP_WRITE);  // 관심 제거
    }

    // 닫기 요청이 대기 중이었는데, 이제 다 보냈음 → 진짜 닫기!
    if (isClosePending && open) {
        open = false;
        channel.close();
        if (closeListener != null) closeListener.onSessionClosed(this);
    }
}
```
| 포인트 | 설명 |
| --- | --- |
| `buf.hasRemaining()` 체크 | 소켓 버퍼가 꽉 차면 `channel.write()`는 일부만 쓰고 멈춤. **다음 OP_WRITE 때 이어서 씀** |
| `peek()` + `poll()` | 다 쓴 버퍼만 제거? 중간에 멈춰도 안전 |
| `OP_WRITE`는 필요할 때만 등록 | 항상 등록하면 성능 저하됨, 큐 비었을 때만 해제 |
| `selector.wakeup()` | 다른 스레드가 대기 중이어도 즉시 반응 |
| `isClosePending` + `pendingWrites.isEmpty()` | **모든 데이터 전송 후에만 연결 종료** -> 데이터 유실 방지 |

이러한 부분들을 통해 정확한 백프레셔와 안전한 연결 종료를 구현하고자 하였다.

#### 가상 시나리오로 이해하기
##### 시나리오1: 네트워크가 느림(백프레셔 발생)
```java
session.sendText("메시지1");
session.sendText("메시지2");
session.sendText("메시지3");
session.close();  // 바로 호출!
```
1. 3개 메시지 → `pendingWrites`에 쌓임
2. `close()` → `isClosePending = true`
3. `write()`는 천천히 하나씩 전송
4. 아직 큐에 남아있으므로 `channel.close()` 안 함
5. 마지막 메시지 전송 완료 → 큐 비워짐 → `channel.close()` 실행

**결과: 모든 메시지 전송 후 깔끔하게 종료**

##### 시나리오2: 대용량 파일 전송시?
```java
session.sendBinary(largeFileBytes);  // 100MB
```
- pendingWrites에 여러 조각으로 나뉘어 들어감
- 네트워크 속도에 맞춰 천천히 전송
- OOM 의 여지는 여기에서 차단 가능

> 다른 Netty나 Undertow에서도 거의 유사한 패턴을 실제로 사용한다. 이전에 HTTP 지원을 리팩토링하는 부분에서 바이트 버퍼 풀을 도입했는데, 이 부분에서도 해당 바이트 버퍼풀을 사용하게 해주면 메모리관리에서 더 이득을 볼 수 있을 것이라 생각됨.

### Graceful 종료 시퀀스
WebSocket 연결을 닫는 것은 단순히 소켓을 닫는게 아니다. RFC 6455는 양방향 close 핸드셰이크를 정의해뒀다.
```java
    @Override
    public void close() throws IOException {
        // 닫혀있지 않고(열려 있고), 종료 요청이 이미 되어있는게 아니라면?
        if (open && !isClosePending) {
            isClosePending = true; // 종료 요청 표시
            // 종료 프레임 생성 (opcode 0x8, 정상 종료 코드 1000)
            String closeReason = "Closing WebSocket session: " + id + ", Close code is: " + CloseCodes.NORMAL_CLOSURE.getCode() + ".";
            byte[] closePayload = closeReason.getBytes(StandardCharsets.UTF_8);
            byte[] encoded = frameEncoder.encodeControlFrame(0x8, closePayload);

            // 클로즈 프레임을 쓰기 큐에 추가
            scheduleWrite(ByteBuffer.wrap(encoded));
        }
    }
```
이제 쓰기 큐에서 종료 프레임까지 쓰고 난후, 종료 상황이라면? 해당 부분에서 소켓이 종료되는 것이다.
```java
            // 큐가 비었고 종료 요청이 있었다면 채널 닫기
            if (isClosePending && open) {
```

## 어노테이션 기반 설계
### 선언적 엔드포인트 정의
Spring MVC의 `@RestController`처럼 WebSocket도 어노테이션 기반 프로그래밍을 지원하고자 하였다.

**사용 예시**
```java
@WebSocketHandler("/ws/chat/{roomId}")
public class ChatWebSocketHandler {
    
    private final ChatService chatService;
    private final WebSocketContainer container;
    
    public ChatWebSocketHandler(ChatService chatService, 
                               WebSocketContainer container) {
        this.chatService = chatService;
        this.container = container;
    }
    
    @OnOpen
    public void onOpen(@SocketSession WebSocketSession session,
                      @PathVariable("roomId") String roomId) {
        // 세션을 방에 등록
        session.getUserProperties().put("roomId", roomId);
        session.getUserProperties().put("username", extractUsername(session));
        
        // 입장 메시지 브로드캐스트
        String username = (String) session.getUserProperties().get("username");
        broadcastToRoom(roomId, username + " 님이 입장하셨습니다.");
        
        logger.info("User {} joined room {}", username, roomId);
    }
    
    @MessageMapping("/message")
    public void handleMessage(@Payload String message,
                             @SocketSession WebSocketSession session,
                             @PathVariable("roomId") String roomId) throws IOException {
        String username = (String) session.getUserProperties().get("username");
        
        // 메시지 저장
        chatService.saveMessage(roomId, username, message);
        
        // 방의 모든 세션에 브로드캐스트
        String formattedMessage = String.format("[%s] %s: %s", 
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
            username, 
            message
        );
        
        broadcastToRoom(roomId, formattedMessage);
    }
    
    @MessageMapping("/typing")
    public void handleTyping(@SocketSession WebSocketSession session,
                            @PathVariable("roomId") String roomId) throws IOException {
        String username = (String) session.getUserProperties().get("username");
        
        // 본인을 제외한 방의 모든 세션에 전송
        for (WebSocketSession s : container.getSessions("/ws/chat/" + roomId)) {
            if (!s.getId().equals(session.getId())) {
                s.sendText("{\"action\":\"typing\",\"user\":\"" + username + "\"}");
            }
        }
    }
    
    @OnClose
    public void onClose(@SocketSession WebSocketSession session,
                       CloseCode closeCode) {
        String roomId = (String) session.getUserProperties().get("roomId");
        String username = (String) session.getUserProperties().get("username");
        
        // 퇴장 메시지 브로드캐스트
        if (roomId != null && username != null) {
            broadcastToRoom(roomId, username + " 님이 퇴장하셨습니다.");
        }
        
        logger.info("User {} left room {} (code: {})", 
            username, roomId, closeCode.getCode());
    }
    
    @OnError
    public void onError(@SocketSession WebSocketSession session,
                       Throwable error) {
        String username = (String) session.getUserProperties().get("username");
        logger.error("WebSocket error for user {}: {}", 
            username, error.getMessage(), error);
    }
    
    private void broadcastToRoom(String roomId, String message) {
        String path = "/ws/chat/" + roomId;
        for (WebSocketSession session : container.getSessions(path)) {
            try {
                session.sendText(message);
            } catch (IOException e) {
                logger.error("Failed to send message to session {}", 
                    session.getId(), e);
            }
        }
    }
    
    private String extractUsername(WebSocketSession session) {
        // 핸드셰이크 요청에서 사용자 이름 추출 (예: 쿠키, 헤더)
        String username = session.getHandshakeRequest().getHeaders().get("X-Username");
        return username != null ? username : "Anonymous";
    }
}
```

### 엔드포인트 등록 메커니즘
애플리케이션 시작 시 인프라 빈을 초기화(구체과정은 이전 포스트 참조)하는 과정에서 `@WebSocketHandler` 어노테이션이 달린 빈을 미리 스캔하고 등록해둔다.

```java
@Component
public class WebSocketContextInitializer implements ContextInitializer {
    private final WebSocketHandlerScanner scanner;

    public WebSocketContextInitializer(WebSocketHandlerScanner scanner) {
        this.scanner = scanner;
    }

    @Override
    public void initializeAfterRefresh(BeanFactory context) {
        scanner.scanWebSocketHandlers(context);
    }
}
```
실제로 초기화 로직들은 전부 `ContextInitializer` 인터페이스를 통해 구현되어 있다.
> `ContextInitializer`는  모든 애플리케이션/인프라 빈이 전부 생성된 뒤에 특별한 작업을 진행할 때 사용함. 개발자가 작성한 웹소켓 핸들러를 감지해야 하기 때문에 애플리케이션 빈 초기화 이후 실행해야 한다는 점이 포인트

#### WebSocketHandlerScanner 상세 로직
```java
@Component
public class WebSocketHandlerScanner {
    private final WebSocketEndpointRegistry endpointRegistry;
    private final PathPatternResolver pathPatternResolver;

    public void scanWebSocketHandlers(BeanFactory context) {
        Collection<Object> beans = context.getAllBeans();

        for (Object bean : beans) {
            Class<?> beanClass = bean.getClass();
            if (beanClass.isAnnotationPresent(WebSocketHandler.class)) {

                WebSocketHandler webSocketHandlerAnn = beanClass.getAnnotation(WebSocketHandler.class);
                String classLevelPath = webSocketHandlerAnn.value(); // @WebSocketHandler의 value()는 엔드포인트 경로

                PathPattern pathPattern = pathPatternResolver.resolve(classLevelPath);

                Method onOpenMethod = null;
                Method onCloseMethod = null;
                Method onErrorMethod = null;
                Map<String, Method> messageMappings = new HashMap<>();

                for (Method method : beanClass.getMethods()) { // public 메서드 스캔
                    method.setAccessible(true); // 리플렉션 호출을 위해

                    if (method.isAnnotationPresent(OnOpen.class)) {
                        onOpenMethod = method;
                    } else if (method.isAnnotationPresent(OnClose.class)) {
                        onCloseMethod = method;
                    } else if (method.isAnnotationPresent(OnError.class)) {
                        onErrorMethod = method;
                    } else if (method.isAnnotationPresent(MessageMapping.class)) {
                        MessageMapping messageMappingAnn = method.getAnnotation(MessageMapping.class);
                        String messagePath = messageMappingAnn.value();
                        messageMappings.put(messagePath, method);
                    }
                }

                endpointRegistry.registerEndpoint(pathPattern, bean, onOpenMethod, onCloseMethod, onErrorMethod, messageMappings);
            }
        }
    }
}
```
로직상 여러개의 엔드포인트를 등록한다면(`@OnOpen`이 두개라던가) 마지막으로 읽히는것을 선택할 것이다.

### 메서드 파라미터 해석
Spring MVC와 유사하게, WebSocket 핸들러 메서드도 다양한 파라미터를 주입받을 수 있다.

#### WebSocketArgumentResolver 인터페이스
```java
public interface WebSocketArgumentResolver {
    boolean supports(Parameter parameter, InvocationContext context); // <- context 추가
    Object resolve(Parameter parameter, InvocationContext context) throws Exception; // <- context로 통합
}
```

#### JsonPayloadArgumentResolver 구현체
```java
@Component
public class JsonPayloadArgumentResolver implements WebSocketArgumentResolver {
    private final ObjectMapper objectMapper;

    public JsonPayloadArgumentResolver() {
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public boolean supports(Parameter parameter, InvocationContext context){
        return parameter.isAnnotationPresent(Payload.class) &&
                context.phase() == LifecyclePhase.MESSAGE &&
                context.getMessagePayload() != null &&
                !parameter.getType().equals(String.class);
    }

    @Override
    public Object resolve(Parameter parameter, InvocationContext context) throws Exception {
        MessagePayload messagePayload = context.getMessagePayload();
        return objectMapper.readValue(messagePayload.asText(), parameter.getType());
    }
}

```
이러한 구현체를 통해 DTO로도 메세지를 받을 수 있다.

#### StringPayloadArgumentResolver 구현체
```java
@Component
public class StringPayloadArgumentResolver implements WebSocketArgumentResolver {
    @Override
    public boolean supports(Parameter parameter, InvocationContext context) {
        return parameter.isAnnotationPresent(Payload.class) &&
                context.phase() == LifecyclePhase.MESSAGE &&
                context.getMessagePayload().isText() &&
                context.getMessagePayload().asText().length() > 0 &&
                String.class.isAssignableFrom(parameter.getType());
    }

    @Override
    public Object resolve(Parameter parameter, InvocationContext context) throws Exception {
        return context.getMessagePayload().asText();
    }
}
```
아니면 그냥 String으로 받기도 가능.

이 밖에도 경로에서 추출해오는 `PathPathVariableArgumentResolver`, 
인풋 스트림 그 자체를 받아오는 `InputStreamPayloadArgumentResolver`,
웹 소켓 세션을 가져오는 `SessionArgumentResolver`,
예외 발생시 예외 그 자체를 가져오는(`@OnError`에서 사용) `ThrowableArgumentResolver` 등등이 있음.

만약 개발자가 추가하고 싶다면, `WebSocketArgumentResolver`를 구현하여 `@Componenet`를 달아주면 쉽게 통합가능.
이는 스프링 구조의 장점을 살려보고자 한 것이다.

# 실제 사용 예시
  <iframe 
    width="560" 
    height="315" 
    src="https://www.youtube.com/embed/7ypz7RCcZps" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen
  ></iframe>

영상에서 사용된 핸들러는 다음과 같다.
```java
@Component
@WebSocketHandler("/ws/benchmark")
public class WebSocketBenchmarkHandler {

    // 연결된 모든 세션 관리
    private static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    // 통계 정보
    private static long totalMessagesReceived = 0;
    private static long totalMessagesSent = 0;
    private static long totalConnections = 0;

    @OnOpen
    public void onOpen(WebSocketSession session) {
        sessions.put(session.getId(), session);
        totalConnections++;
        System.out.println("[WebSocket Benchmark] 연결 열림: " + session.getId() +
                          " (총 연결: " + sessions.size() + ", 누적: " + totalConnections + ")");
    }

    @OnClose
    public void onClose(WebSocketSession session, CloseCode closeCode) {
        sessions.remove(session.getId());
        System.out.println("[WebSocket Benchmark] 연결 닫힘: " + session.getId() +
                          " (코드: " + closeCode.getCode() + ", 남은 연결: " + sessions.size() + ")");
    }

    @OnError
    public void onError(WebSocketSession session, Throwable error) {
        System.err.println("[WebSocket Benchmark] 에러 발생: " + session.getId() +
                          " - " + error.getMessage());
        error.printStackTrace();
    }

    @MessageMapping("/echo")
    public void handleEcho(WebSocketSession session, @Payload String message) throws IOException {
        totalMessagesReceived++;
        session.sendText(createResponse("/echo", message));
        System.out.println("[WebSocket Benchmark] Echo: " + message);
        totalMessagesSent++;
    }

    @MessageMapping("/broadcast")
    public void handleBroadcast(WebSocketSession session, @Payload String message) throws IOException {
        totalMessagesReceived++;
        String response = createResponse("/broadcast", "From " + session.getId() + ": " + message);
        System.out.println("[WebSocket Benchmark] Broadcast: " + message);
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen()) {
                try {
                    s.sendText(response);
                    totalMessagesSent++;
                } catch (IOException e) {
                    System.err.println("브로드캐스트 실패: " + s.getId() + " - " + e.getMessage());
                }
            }
        }
    }

    @MessageMapping("/chat")
    public void handleChat(WebSocketSession session, @Payload String message) throws IOException {
        totalMessagesReceived++;
        String username = (String) session.getUserProperties().get("username");
        if (username == null) {
            username = "User-" + session.getId().substring(0, 8);
            session.getUserProperties().put("username", username);
        }

        String chatMessage = username + ": " + message;
        System.out.println("[WebSocket Benchmark] Chat: " + chatMessage);
        String response = createResponse("/chat", chatMessage);

        // 채팅방의 모든 사용자에게 전송
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen()) {
                try {
                    s.sendText(response);
                    totalMessagesSent++;
                } catch (IOException e) {
                    System.err.println("채팅 메시지 전송 실패: " + s.getId());
                }
            }
        }
    }

    @MessageMapping("/ping")
    public void handlePing(WebSocketSession session, @Payload String message) throws IOException {
        totalMessagesReceived++;
        // 실제 WebSocket Ping 프레임 전송 (브라우저가 자동으로 Pong 응답)
        byte[] pingData = "ping".getBytes();
        session.sendPing(pingData);
        System.out.println("[WebSocket Benchmark] Sent Ping frame to client: " + session.getId());
        totalMessagesSent++;
    }

    @MessageMapping("/stats")
    public void handleStats(WebSocketSession session, @Payload String message) throws IOException {
        totalMessagesReceived++;
        String stats = String.format(
            "연결: %d, 수신: %d, 송신: %d, 누적 연결: %d",
            sessions.size(), totalMessagesReceived, totalMessagesSent, totalConnections
        );
        session.sendText(createResponse("/stats", stats));
        totalMessagesSent++;
    }

    // 기타 유틸메서드 생략
}
```
`Echo`, `Ping`, `Chat`, `Broadcast`등이 모두 적절히 동작함을 확인할 수 있었다.

---

# 후기
웹소켓 프로토콜을 직접 구현하며 얻은 큰 교훈은 추상화 뒤에 숨겨진 복잡성을 이해해볼 수 있었다는 것이다.

1. RFC 사양에서는 대부분의 엣지 케이스가 고려되어 있다. 
2. 성능 트레이드 오프: NIO, 스트리밍, 버퍼 관리 등 모든 설계 결정이 성능에 어떻게 영향을 미치는 지 알 수 있었다.
3. 보안 고려사항: 마스킹, 핸드셰이크, close 코드 등 보안이 프로토콜 설계에 어떻게 녹여져 있는지 알 수 있었다.

이 뿐 아니라 다시 한번 정리하면서 추가적인 성능 및 비기능적 개선 사항을 다시 한번 생각해볼 수 있었음.
크게는 바이트 버퍼 풀 처리, Heap ByteBuffer가 아닌 Direct ByteBuffer 사용하기 등등이 있을 것 같다.
만약 이러한 프로토콜 구현을 직접 해보고 싶다면 해당 글이 도움이 되었으면 좋겠다.


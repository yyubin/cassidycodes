![](https://velog.velcdn.com/images/cassidy/post/bf9b51e3-5493-4fa6-920b-32a8fac7bc88/image.png)

게시 하고 대기 중인 상태.

## 1. 배포 준비

오늘은 `jinx-gradle-plugin` 모듈을 **Gradle Plugin Portal**에 게시하는 작업을 진행했다.
이를 위해 프로젝트에 다음 플러그인들을 추가하고 기본 설정을 정리했다.

* `java-gradle-plugin`
* `com.gradle.plugin-publish`
* `maven-publish`
* `signing`
* `maven-central-publishing` (선택적 사용)

플러그인 ID는 Gradle Portal 가이드에 맞춰

```
io.github.yyubin.jinx
```

형태로 구성.




## 2. Plugin Portal 게시 중 문제 발생

처음으로 `./gradlew publishPlugins` 를 실행했을 때 아래 오류 발생

```
Execution failed for task 'signJinxPluginMarkerMavenPublication'.
> Cannot perform signing task because it has no configured signatory
```

이 오류는 일반적으로 **GPG 서명 정보가 누락되었을 때** 발생하지만,
이번 케이스에서는 상황이 달랐다.

* 나는 **Plugin Portal로 배포 중**이었고
* Plugin Portal은 **GPG 서명을 요구하지 않는다**

**서명 자체가 필요 없는 상황에서** Gradle이 자동으로 "플러그인 마커(PluginMarkerMaven)"를 sign하려고 하면서 문제가 발생한 것이다.

## 3. 원인 분석

찾아보니, 

* Gradle Plugin Publish Plugin 2.x는 `PluginMarkerMavenPublication` 을 자동 생성한다.
* Gradle Signing Plugin은 기본적으로 **모든 publication을 자동 서명 대상으로 간주**한다.
* 멀티모듈 환경에서는 이 auto-discovery가 더 강하게 동작한다.
* 나는 `pluginMaven`만 sign하도록 명시했지만,
  signing 설정이 `afterEvaluate` 안에 있어서 **시점이 너무 늦었다.**

결과적으로 Gradle은 내가 설정하기 전에 이미

```
signJinxPluginMarkerMavenPublication
```

task를 생성해버리고 signatory가 없으니 실패한 것이다.

## 4. 해결: signing의 자동 생성 완전 차단

문제를 해결하기 위해 signing 설정을 다음과 같이 수정했다.

* **afterEvaluate 안에서 signing을 설정하면 늦는다 -> 밖으로 빼기**
* **setRequired(false)로 자동 signing task 생성 비활성화**
* **pluginMaven만 수동으로 sign해서 Maven Central 배포 때만 활성화**

### 최종 해결 코드

```groovy
signing {
    // signing 자동 생성 비활성화 → plugin marker sign task 생성 안 됨
    setRequired(false)

    if (project.hasProperty("signingKey")) {
        useInMemoryPgpKeys(
            project.findProperty("signingKey"),
            project.findProperty("signingPassword")
        )
        sign(publishing.publications.named("pluginMaven"))
    }
}
```

이 설정은 다음과 같은 장점을 갖는다

| 상황                               | 동작                        |
| -------------------------------- | ------------------------- |
| `publishPlugins` (Plugin Portal) | signing 완전 비활성화 → 오류 없음 |
| Maven Central 게시                 | pluginMaven만 서명         |
| Plugin Marker Publication        | 서명 X (자동 task 생성 차단)    |


## 5. 실행 결과

다시 실행

```
./gradlew publishPlugins
```

- Plugin Marker에 대한 sign task가 생성되지 않음
- signatory 오류 없이 정상적으로 Plugin Portal 업로드 완료


## 6. 느낀 점 / 메모

* Gradle Plugin Publish Plugin 2.x + 멀티모듈 환경에서는
  *signing task 생성 타이밍*이 가장 중요하다.
* Gradle의 signing 자동 탐지는 꽤 공격적이라,
  원하지 않는 publication에 서명을 시도하게 만들 수 있다.
* Plugin Portal 게시 자체는 GPG 서명이 필요 없다는 점이 헷갈리기 쉬움.
* `afterEvaluate` 는 대부분의 Gradle publishing 설정에서 지뢰다.  
  가능하면 configuration phase에서 resolve하도록 구조 잡기.


## 7. 다음 계획

* Plugin Portal 승인 대기(일반적으로 첫 버전은 수동 리뷰)
* README에 설치 가이드 및 사용 예시 추가
* Maven Central 배포 파이프라인 작업

수동 리뷰관련하여 gradle 공식문서에서는 기능이 너무 간단하거나("Hello World" 출력 수준),
특정한 회사/프로젝트의 목적으로만 사용 가능한 경우,
문서가 부족한 경우(사용법 없음/플러그인 목표나 예제 설명 부족),
에코시스템 오염의 가능성이 있는 경우(사용자의 빌드를 망가뜨린다거나..)
에 한해서 게시 리젝을 당하거나, 수정 요청이 들어온다고 한다..

최대한 빨리 게시되어서 직접 써보고 싶어서 추가로 리드미도 작성했다.
또한 해당 프로젝트는 Jpa 유저면 사용이 가능해서 범용성에서도 딱히 걱정은 없음.

그리고 git에 태그로 트리거해서 자동 maven/gradle 게시 ci/cd 파이프라인을 만들어야겠다는 생각도 하긴 하는 중.  
귀찮아서 미루고 있긴 했는데.. 이제 수동 배포가 더 귀찮아지기 시작했다.



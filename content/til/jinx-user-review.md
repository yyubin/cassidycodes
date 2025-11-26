최근에 사이드 프로젝트를 시작하면서 기존에 만들어뒀던 음 오픈소스를 사용해본 후기이다. 나름 오픈소스가 맞긴함 maven central에 배포도 되어있으니.

> [지난 개발 회고 보러가기](https://velog.io/@cassidy/JPA-%EC%95%A0%EB%85%B8%ED%85%8C%EC%9D%B4%EC%85%98%EC%9C%BC%EB%A1%9C-DB-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%85%98%EC%9D%84-%EC%9E%90%EB%8F%99%ED%99%94%ED%95%98%EB%8B%A4-Jinx-%EA%B0%9C%EB%B0%9C-%ED%9A%8C%EA%B3%A0)

![](https://velog.velcdn.com/images/cassidy/post/3bbe029b-d850-457a-8da7-049808393fd5/image.png)
*maven repository에서 찾을 수 있는 모습..!*

일단 이번에 나름 복잡한 구조의 엔티티를 표현하게 되었다.
진행하는 사이드 프로젝트는 개인적으로 좋아하는 게임인 '림버스 컴퍼니'의 덱 조합 및 추천 시스템을 구축해보려고 하는 것임.

그래서 모든 캐릭터에 대한 스킬을 메타데이터로 분석해서 추후에 자체 DSL(못할수도있음)을 구축하고 그 내용을 바탕으로 그래프 데이터베이스를 사용하여 시스템을 구축할 것인데, 이 "메타데이터"를 우선은 DBMS에 보유해보려고 한다.

스킬 설명은 자연어이니 이걸 쪼개서 전부 데이터베이스로 표현 가능하게 해야해서 조금 복잡하게 엔티티가 빠질 것 같다.

현재 전부 엔티티로 표현하진 않음. 하지만 대략 지금까지 만든 내용은 다음과 같다.

### 엔티티 요약
| 테이블명                    | 주요 컬럼                                                                        | 관계 (외래키 기준)                                             | 설명                                     |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| **sinner**              | `id (PK)`, `name`, `nameEn`                                                  | -                                                       | 페르소나의 기본 주체(인물). 이름 고유값 보유             |
| **persona**             | `id (PK)`, `sinner_id (FK)`, `name`, `grade`, `releaseDate`, `season_type`   | → `sinner.id`                                           | 각 인물(`sinner`)이 가진 페르소나. 시즌, 등급, 속성 포함 |
| **persona_image**       | `id (PK)`, `url`, `type`, `priority`, `isPrimary`                            | - (보통 `persona_id` 연결 예상)                               | 페르소나의 이미지 (A, B, SD 등 타입별)             |
| **persona_passive**     | `id (PK)`, `name`, `condition_type`, `kind`, `syncLevel`                     | - (보통 `persona_id` 연결 예상)                               | 페르소나의 패시브 스킬 정보                        |
| **skill**               | `id (PK)`, `skillNumber`, `name`, `skillCategory`, `sinAffinity`             | -                                                       | 스킬의 기본 정의 (공격/방어, 속성 등)                |
| **skill_stats_by_sync** | `id (PK)`, `level`, `coinPower`, `syncLevel`, `weight`                       | -                                                       | 스킬 동기화 레벨별 능력치                         |
| **skill_coin**          | `id (PK)`, `stats_by_sync_id (FK)`, `orderIndex`, `coinType`                 | → `skill_stats_by_sync.id`                              | 동기화된 스킬의 개별 코인 구성 정보                   |
| **skill_effect**        | `id (PK)`, `stats_by_sync_id (FK)`, `root_condition_id (FK)`, `trigger_json` | → `skill_stats_by_sync.id`<br>→ `abstract_condition.id` | 스킬 발동 시 효과 및 트리거                       |
| **effect_action**       | `id (PK)`, `action_type`, `policy`, `priority`, `target_selector_json`       | -                                                       | 각 효과(Effect)의 구체적인 동작 (피해량, 상태이상 등)    |
| **effect_branch**       | `id (PK)`, `condition_id (FK)`                                               | → `abstract_condition.id`                               | 조건별 브랜치 (if 조건 처리용)                    |
| **condition_group**     | `id (PK)`, `operator (AND/OR)`, `ordered`                                    | -                                                       | 여러 조건들을 묶는 논리 그룹                       |
| **abstract_condition**  | `id (PK)`, `condition_type`, `scope`                                         | -                                                       | 조건의 상위 추상 클래스 (하위 조건의 부모)              |
| **stat_condition**      | `id (PK)`, `operator`, `stat_code`, `threshold`, `target`                    | -                                                       | 스탯 관련 조건 (ex. HP > 50%)                |
| **range_condition**     | `id (PK)`, `min_inclusive`, `max_exclusive`, `stat_code`                     | -                                                       | 범위 기반 조건 (ex. 공격력 10~20)               |
| **passive_effect**      | `id (PK)`, `root_condition_id (FK)`, `trigger_json`                          | → `abstract_condition.id`                               | 패시브 발동 효과 정의                           |
| **coin_effect**         | `id (PK)`, `trigger_json`                                                    | -                                                       | 코인 단위로 발동되는 효과                         |

### 주요 관계
| 관계                                                          | 설명                           |
| ----------------------------------------------------------- | ---------------------------- |
| `sinner` 1 — N `persona`                                    | 한 인물은 여러 페르소나를 가질 수 있음       |
| `persona` 1 — N `persona_image`                             | 각 페르소나는 여러 이미지를 가질 수 있음      |
| `persona` 1 — N `persona_passive`                           | 각 페르소나는 여러 패시브를 가질 수 있음      |
| `skill_stats_by_sync` 1 — N `skill_coin`                    | 각 스킬 동기화 레벨별로 여러 코인을 가질 수 있음 |
| `skill_stats_by_sync` 1 — N `skill_effect`                  | 각 스킬 레벨별로 여러 효과가 있음          |
| `abstract_condition` 1 — N `effect_branch`                  | 조건에 따라 여러 브랜치가 존재 가능         |
| `abstract_condition` 1 — N `skill_effect`, `passive_effect` | 조건 트리거로 여러 효과를 연결            |

대충 이런 느낌임. 여기에서 해당 시스템에 대한 고찰을 할게 아니니, 넘어가고

일단 추상 클래스가 여럿 나올 예정, 타입도 다양함. 복합키나 컬렉션 테이블 등등도 써보려고 한다.
기본적으로 관계 조합도 다양하게 나올 것 같아 만들어둔 마이그레이션 툴(jinx)을 실험해보기에 적합한 환경일 것 같다.

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.5.6" apply false
    id("io.spring.dependency-management") version "1.1.7"
}

group = "org.yyubin"
version = "0.0.1-SNAPSHOT"
description = "gesellschaft-infrastructure"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.boot:spring-boot-dependencies:3.5.6")
    }
    dependencies {
        dependency("jakarta.persistence:jakarta.persistence-api:3.2.0")
    }
}

dependencies {
    // Spring Boot with JPA 3.2.0
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("jakarta.persistence:jakarta.persistence-api")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Jackson for JSON conversion
    implementation("com.fasterxml.jackson.core:jackson-databind")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // MySQL
    runtimeOnly("com.mysql:mysql-connector-j")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // Jinx (DDL 생성)
    annotationProcessor("io.github.yyubin:jinx-processor:0.0.13")
    implementation("io.github.yyubin:jinx-core:0.0.13")

    // Project dependencies
    implementation(project(":gesellschaft-domain"))
    implementation(project(":gesellschaft-application"))
}

val jinxCli by configurations.creating

dependencies {
    "jinxCli"("io.github.yyubin:jinx-cli:0.0.13")
}

tasks.register<JavaExec>("jinxMigrate") {
    group = "jinx"
    classpath = configurations["jinxCli"]
    mainClass.set("org.jinx.cli.JinxCli")
    args("db", "migrate", "-d", "mysql")
    dependsOn("classes")
}



tasks.withType<Test> {
    useJUnitPlatform()
}
```

이렇게 구성한 후, 컴파일을 하면 자동으로 스키마에 대한 정보를 json으로 뽑아둔다. 그리고 `jinxMigrate`에 해당하는 태스크를 실행하면, JPA 어노테이션을 분석해둔 json을 바탕으로 최근 2개를 뽑아 diff를 확인하여 DDL로 만들어준다. 만약 하나뿐이라면 생성에 대한 것만 만들어줌

```java
/**
 * AbstractCondition JPA 엔티티 추상 클래스
 * - JOINED 전략으로 ConditionGroup, StatCondition, RangeCondition 계층 구현
 */
@Entity
@Table(name = "abstract_condition")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "condition_type", discriminatorType = DiscriminatorType.STRING)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public abstract class AbstractConditionJpa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    private ConditionScope scope;

    protected AbstractConditionJpa(ConditionScope scope) {
        this.scope = scope;
    }
}
```
```java
@Entity
@Table(name = "range_condition")
@DiscriminatorValue("RANGE")
@PrimaryKeyJoinColumn(name = "id", foreignKey = @ForeignKey(name = "fk_range_condition_id"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public class RangeConditionJpa extends AbstractConditionJpa {

    @Enumerated(EnumType.STRING)
    @Column(name = "target", nullable = false)
    private ConditionTarget target;

    @Column(name = "stat_code", nullable = false)
    private String statCode;

    @Column(name = "min_inclusive", nullable = false)
    private int minInclusive;

    @Column(name = "max_exclusive")
    private Integer maxExclusive;

    public RangeConditionJpa(ConditionScope scope, ConditionTarget target, String statCode,
                             int minInclusive, Integer maxExclusive) {
        super(scope);
        this.target = target;
        this.statCode = statCode;
        this.minInclusive = minInclusive;
        this.maxExclusive = maxExclusive;
    }
}
```
대충 이런식의 엔티티들이 구성되었음. 이에 대한 sql은 아래와 같다.

```sql
-- Jinx Migration Header
-- jinx:baseline=sha256:initial
-- jinx:head=sha256:4bd8c9c2ca3a39063efea2968949ef590e6318dbdd2719148c3a4dc9e5fb9517
-- jinx:version=20251024192633
-- jinx:generated=2025-10-24T19:26:48.136685


CREATE TABLE `sinner` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(20) NOT NULL,
  `nameEn` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  CONSTRAINT `uq_sinner__nameen` UNIQUE (`nameEn`),
  CONSTRAINT `uq_sinner__name` UNIQUE (`name`),

CREATE TABLE `skill_effect` (
  `stats_by_sync_id` BIGINT,
  `original_text` TEXT,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `root_condition_id` BIGINT,
  `trigger_json` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `ix_skill_effect__root_3c1d0a6d` ON `skill_effect` (`root_condition_id`);
CREATE INDEX `ix_skill_effect__stat_ed249766` ON `skill_effect` (`stats_by_sync_id`);

CREATE TABLE `skill_stats_by_sync` (
  `level` INT NOT NULL,
  `coinPower` INT NOT NULL,
  `basePower` INT NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `weight` INT NOT NULL,
  `syncLevel` ENUM('SYNC_1','SYNC_2','SYNC_3','SYNC_4') NOT NULL,
  `coinCount` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `skill` (
  `defenseType` ENUM('COUNTER','EVADE','GUARD'),
  `skillCategory` ENUM('ATTACK','DEFENSE') NOT NULL,
  `attackType` ENUM('SLASH','PIERCE','BLUNT'),
  `keywordType` ENUM('BURN','BLEED','TREMOR','RUPTURE','SINKING','BREATH','CHARGE','NONE') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `sinAffinity` ENUM('WRATH','LUST','SLOTH','GREED','GLOOM','PRIDE','ENVY','NONE') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `skillImage` VARCHAR(500),
  `skillNumber` INT NOT NULL,
  `skillQuantity` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `range_condition` (
  `min_inclusive` INT NOT NULL,
  `scope` ENUM('BATTLE','TURN','SKILL','COIN') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `stat_code` VARCHAR(255) NOT NULL,
  `max_exclusive` INT,
  `target` ENUM('SELF','ENEMY','ENEMY_ALL','ALLY','ALLY_ALL','SELF_ALLY','ANY','RIGHT_ALLY','LEFT_ALLY','LOWEST_HP_ALLY','HIGHEST_RESONANCE') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `abstract_condition` (
  `condition_type` VARCHAR(31) NOT NULL,
  `scope` ENUM('BATTLE','TURN','SKILL','COIN') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `skill_coin` (
  `stats_by_sync_id` BIGINT NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `orderIndex` INT NOT NULL,
  `coinType` ENUM('NORMAL','UNBREAKABLE','REUSE') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `ix_skill_coin__stats__a06903e6` ON `skill_coin` (`stats_by_sync_id`);

CREATE TABLE `stat_condition` (
  `scope` ENUM('BATTLE','TURN','SKILL','COIN') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `stat_code` VARCHAR(255) NOT NULL,
  `threshold` INT NOT NULL,
  `operator` ENUM('EQUAL','NOT_EQUAL','GREATER_THAN','GREATER_THAN_OR_EQUAL','LESS_THAN','LESS_THAN_OR_EQUAL','IN_RANGE','DIVISIBLE_BY','HAS_TAG','HAS_STATUS') NOT NULL,
  `target` ENUM('SELF','ENEMY','ENEMY_ALL','ALLY','ALLY_ALL','SELF_ALLY','ANY','RIGHT_ALLY','LEFT_ALLY','LOWEST_HP_ALLY','HIGHEST_RESONANCE') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `ix_stat_condition__id` ON `stat_condition` (`id`);

CREATE TABLE `passive_effect` (
  `original_text` TEXT,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `root_condition_id` BIGINT,
  `trigger_json` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `ix_passive_effect__ro_ba6233c3` ON `passive_effect` (`root_condition_id`);

CREATE TABLE `effect_action` (
  `scope` ENUM('SKILL','COINS_SKILL','COIN_EACH','COIN_LAST','COIN_FIRST','COIN_INDEX','THIS_COIN','NEXT_COIN'),
  `coin_selector_json` TEXT,
  `policy` ENUM('ADD','MULTIPLY','OVERRIDE','SUPPRESS','REPLACE_OUTCOME','SET'),
  `cap_max` INT,
  `priority` INT,
  `cap_per_target` INT,
  `action_type` ENUM('STATUS_INFLICT','STATUS_REMOVE','BUFF_DAMAGE_UP','BUFF_DAMAGE_DOWN','BUFF_DEFENSE_UP','BUFF_DEFENSE_DOWN','RESOURCE_GAIN','RESOURCE_CONSUME','RESOURCE_SET','DAMAGE_MODIFY','POWER_MODIFY','HEAL_HP','CONSUME_HP','COIN_POWER_UP','CLASH_POWER_UP','COMMAND_ATTACK','TRANSFORM_SKILL','SUPPRESS_EFFECT','ETC') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `duration_turns` INT,
  `timing` ENUM('IMMEDIATE','THIS_TURN','NEXT_TURN','TURN_END','NEXT_COIN','ATTACK_END'),
  `stat_code` VARCHAR(255),
  `target_selector_json` TEXT,
  `amount_json` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `condition_group` (
  `ordered` TINYINT(1) NOT NULL DEFAULT '0',
  `scope` ENUM('BATTLE','TURN','SKILL','COIN') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `operator` ENUM('AND','OR') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `coin_effect` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `original_text` TEXT,
  `trigger_json` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `persona_image` (
  `priority` INT NOT NULL,
  `type` ENUM('A','B','AC','BC','SD') NOT NULL,
  `isPrimary` TINYINT(1) NOT NULL DEFAULT '0',
  `url` VARCHAR(500) NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `primary` TINYINT(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `effect_branch` (
  `condition_id` BIGINT,
  `stop_on_match` TINYINT(1) NOT NULL DEFAULT '0',
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `branch_order` INT NOT NULL,
  `original_text` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `ix_effect_branch__condition_id` ON `effect_branch` (`condition_id`);

CREATE TABLE `persona_passive` (
  `name` VARCHAR(100) NOT NULL,
  `condition_type` ENUM('HOLD','RESONATE'),
  `condition_sin_affinity` ENUM('WRATH','LUST','SLOTH','GREED','GLOOM','PRIDE','ENVY','NONE'),
  `syncLevel` ENUM('SYNC_1','SYNC_2','SYNC_3','SYNC_4'),
  `kind` ENUM('NORMAL','SUPPORT') NOT NULL,
  `condition_count` INT,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `persona` (
  `disturbed3` INT,
  `releaseDate` DATE,
  `max_speed` INT NOT NULL,
  `maxLevel` INT NOT NULL,
  `min_speed` INT NOT NULL,
  `season_number` INT,
  `penetration_resistance` ENUM('NORMAL','WEAK','RESIST') NOT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nameEn` VARCHAR(100),
  `grade` ENUM('ONE','TWO','THREE') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `blunt_resistance` ENUM('NORMAL','WEAK','RESIST') NOT NULL,
  `sinner_id` BIGINT NOT NULL,
  `season_type` ENUM('NORMAL','SEASON_NORMAL','SEASON_EVENT','WALPURGISNACHT'),
  `base_health` INT NOT NULL,
  `slash_resistance` ENUM('NORMAL','WEAK','RESIST') NOT NULL,
  `growth_rate` DOUBLE NOT NULL,
  `disturbed1` INT,
  `disturbed2` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `ix_persona__sinner_id` ON `persona` (`sinner_id`);


ALTER TABLE `skill_effect` ADD CONSTRAINT `fk_skill_effect__stat_91794985` FOREIGN KEY (`stats_by_sync_id`) REFERENCES `skill_stats_by_sync` (`id`);
ALTER TABLE `skill_effect` ADD CONSTRAINT `fk_skill_effect__root__7cab2d8` FOREIGN KEY (`root_condition_id`) REFERENCES `condition_group` (`id`);


ALTER TABLE `range_condition` ADD CONSTRAINT `fk_range_condition_id` FOREIGN KEY (`id`) REFERENCES `abstract_condition` (`id`);

ALTER TABLE `skill_coin` ADD CONSTRAINT `fk_skill_coin__stats__8100da85` FOREIGN KEY (`stats_by_sync_id`) REFERENCES `skill_stats_by_sync` (`id`);
ALTER TABLE `stat_condition` ADD CONSTRAINT `fk_stat_condition__id_d01e9443` FOREIGN KEY (`id`) REFERENCES `abstract_condition` (`id`);
ALTER TABLE `stat_condition` ADD CONSTRAINT `fk_stat_condition_id` FOREIGN KEY (`id`) REFERENCES `abstract_condition` (`id`);
ALTER TABLE `passive_effect` ADD CONSTRAINT `fk_passive_effect__ro_b6ed7dc2` FOREIGN KEY (`root_condition_id`) REFERENCES `condition_group` (`id`);

ALTER TABLE `condition_group` ADD CONSTRAINT `fk_condition_group_id` FOREIGN KEY (`id`) REFERENCES `abstract_condition` (`id`);


ALTER TABLE `effect_branch` ADD CONSTRAINT `fk_effect_branch__cond_8d230e6` FOREIGN KEY (`condition_id`) REFERENCES `condition_group` (`id`);

ALTER TABLE `persona` ADD CONSTRAINT `fk_persona__sinner_id__sinner` FOREIGN KEY (`sinner_id`) REFERENCES `sinner` (`id`);
```

생성된 SQL 전문이다. 조인에 대한 인덱스는 자체 기능으로 성능향상을 위해 기본으로 생성해줌. 

이번에 직접 실행하면서 자잘한 버그도 발견해서(ENUM 처리가 다 안된다던가, 몇가지 기본 타입에 대한 매핑을 놓쳤었음) 수정하여 다시 릴리즈도 진행했다.(현재 버전 `0.0.13`)

생성된 SQL 그대로 터미널 복붙 실행도 똑바로 됨.

![](https://velog.velcdn.com/images/cassidy/post/59455c0c-6656-44a1-af38-11fd6723cd62/image.png)
![](https://velog.velcdn.com/images/cassidy/post/f32e333a-4b6d-415b-894d-4830b7aabe29/image.png)

Hibernate ddlauto를 쓰면서 살짝 귀찮았던 점들을 개선하긴 했음.

- ENUM 매핑 바뀌면 그것도 변경점으로 인지해서 다시 작성해줌(숫자에서 문자, 그 반대의 경우로 바뀌는 경우에도 감지하고 경고)
- 변경 '부분'에 대한 SQL을 diff로 비교하여 내려주어 직접 확인하고 적용가능
- 서버없이, 실제 데이터베이스 정보 없이도 실행 가능
- 리네임과 드랍도 지원(update 모드에서 안해주는거)
- ci 파이프라인에서 변경점 반영 가능

뭐 다른 점들도 많이 고려해서 만들긴 했는데 직접 써보니 저러한 점들이 제일 좋았던 것 같다. 그리고 직접 만든게 저렇게 돌아가니까 개발이 즐거움😏

그리고 만들어두고도 써볼 곳이 의외로 마땅히 없었는데 해당 프로젝트 하면서 한을 풀어봐야겠다. 직접 쓰다보면 개선점이나 버그발견도 쉬울 것 같음. 신기능으론 무중단 마이그레이션 지원, 백필 지원이 제일 해보고 싶긴한데 대규모 데이터베이스에선 멀쩡하게 못 돌아갈 것 같아서 미루고 있긴 했음. 근데 내가 쓸거면.. 상관 없자나??

아무튼 서로 윈윈할 수 있는 환경을 찾아서 꽤 재밌다;

> https://github.com/yyubin/jinx

❓ 개선 아이디어나 DB dialect 기여에 관심 있다면 [이슈](https://github.com/yyubin/jinx/issues) 남겨주세요!

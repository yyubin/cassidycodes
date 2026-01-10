최근 진행하는 **bookvoyage** 프로젝트에서도 마찬가지로, jinx를 활용해보며 여러 개선점을 수정중이다.  
오늘은 다음과 같은 신규 버그를 발견하여 이에 대한 트러블 슈팅 과정을 남겨보고자 한다.   

문제 상황은,  
**컬럼과 인덱스를 지우고 새로 만드는 과정**(일종의 리네임이지만, 명확하게는 리네임을 지원하지 않기 때문에 이렇게 표현하겠다)에서 *아직* 존재하지 않는 컬럼에 대해서 인덱스를 먼저 생성하려고 하는 버그였다. 이는 명백한 SQL 실행 오류를 발생시킬 것이다.

```sql
-- 1. 컬럼 삭제
ALTER TABLE `ai_user_analysis_recommendation` DROP COLUMN `rank`;

-- 2. 인덱스 삭제
DROP INDEX `idx_ai_user_analysis_rec_rank` ON `ai_user_analysis_recommendation`;

-- 3. ❌ 존재하지 않는 컬럼(recommendation_rank)에 대한 인덱스 생성
CREATE INDEX `idx_ai_user_analysis_rec_rank` ON `ai_user_analysis_recommendation`
    (`analysis_id`, `recommendation_rank`);

-- 4. 컬럼 추가
ALTER TABLE `ai_user_analysis_recommendation` ADD COLUMN `recommendation_rank` INT NOT NULL;
```

## 원인 분석

### 1. SQL 생성 메커니즘
Jinx에서는 `AlterTableBuilder`를 통해 SQL을 생성한다. 

**AlterTableBuilder.java:30-36**
```java
public String build() {
    StringBuilder sb = new StringBuilder();
    units.stream()
            .sorted(Comparator.comparingInt(SqlContributor::priority))
            .forEach(c -> c.contribute(sb, dialect));
    return sb.toString().trim();
}
```

각 `DdlContributor`의 `priority()` 값에 따라 SQL 생성 순서가 결정되는 구조이다. 

### 2. Contributor Priority 체계

내부 디테일은 다음과 같다.   

```plain
Priority 0:  TableGeneratorDropContributor
Priority 5:  TableGeneratorAddContributor
Priority 10: Table rename/drop operations
Priority 15: TableGeneratorModifyContributor
Priority 20: ColumnDropContributor
Priority 30: Index/Constraint/Relationship Drop and Modify ⚠️
Priority 40: ColumnAddContributor ⚠️
Priority 50: Column rename/modify operations
Priority 60: Index/Constraint/Relationship Add ⚠️
Priority 90: PrimaryKeyAddContributor
```

**문제가 되는 순서**는 다음과 같았다. 

- Priority 30: `IndexModifyContributor` (DROP + CREATE 동시 수행)
- Priority 40: `ColumnAddContributor`
- Priority 60: `IndexAddContributor`

이 자체는 버그의 근본적 원인이 아니다.  

### 3. 버그의 근본 원인
`MySqlMigrationVisitor.java:118-120`의 `visitModifiedIndex` 메서드는 다음과 같다. 

```java
@Override
public void visitModifiedIndex(IndexModel newIndex, IndexModel oldIndex) {
    alterBuilder.add(new IndexModifyContributor(alterBuilder.getTableName(), newIndex, oldIndex));
}
```

> Visitor + Contributor 패턴을 사용했다.

`IndexModifyContributor`는 priority=30에서 실행되며, `MySqlDialect.java:391-393`에서 다음과 같이 동작한다.

```java
@Override
public String getModifyIndexSql(String table, IndexModel newIndex, IndexModel oldIndex) {
    return getDropIndexSql(table, oldIndex) + indexStatement(newIndex, table);
}
```

이때 **DROP과 CREATE를 한 번에 수행**하는데, CREATE 부분이 새로운 컬럼명(`recommendation_rank`)을 참조하면 컬럼 추가(priority=40) 전에 실행되어 실패하게 되는 것이다.

### 4. 실행 순서 시나리오
컬럼 `rank` → `recommendation_rank`로 변경 시에, 

1. **IndexModifyContributor (priority=30)** 실행
   - DROP INDEX (구 컬럼 사용)
   - CREATE INDEX (신 컬럼 `recommendation_rank` 사용) **컬럼이 아직 없음!**

2. **ColumnAddContributor (priority=40)** 실행
   - ADD COLUMN `recommendation_rank` **너무 늦음!**

의 구조가 되는 것이었음.

## 해결 방안

### 1. 수정 원칙

`ModifyContributor`를 `DropContributor` + `AddContributor`로 분리하여 올바른 우선순위를 따르도록 수정하였다.

- DROP: priority=30 (컬럼 추가 전에 실행)
- ADD: priority=60 (컬럼 추가 후에 실행)

### 2. 수정된 코드

**MySqlMigrationVisitor.java**의 세 가지 메서드를 수정했다.

#### 2.1 visitModifiedIndex (Line 118-121)

```java
// 수정 전
@Override
public void visitModifiedIndex(IndexModel newIndex, IndexModel oldIndex) {
    alterBuilder.add(new IndexModifyContributor(alterBuilder.getTableName(), newIndex, oldIndex));
}

// 수정 후
@Override
public void visitModifiedIndex(IndexModel newIndex, IndexModel oldIndex) {
    alterBuilder.add(new IndexDropContributor(alterBuilder.getTableName(), oldIndex));
    alterBuilder.add(new IndexAddContributor(alterBuilder.getTableName(), newIndex));
}
```

애초에 문제가 있던 부분은 인덱스 수정 부분이었지만, 같은 문제가 발생할 것이라고 사료되는 제약조건/관계 생성에 관련해서도 추가로 수정했다.

> 관계도 일종의 제약조건이지만, 관계 생성은 더 까다로운 조건이 있어서(두 테이블이 모두 있어야 한다 등) 따로 추상화시켰음.

#### 2.2 visitModifiedConstraint (Line 134-137)

```java
// 수정 전
@Override
public void visitModifiedConstraint(ConstraintModel newConstraint, ConstraintModel oldConstraint) {
    alterBuilder.add(new ConstraintModifyContributor(alterBuilder.getTableName(), newConstraint, oldConstraint));
}

// 수정 후
@Override
public void visitModifiedConstraint(ConstraintModel newConstraint, ConstraintModel oldConstraint) {
    alterBuilder.add(new ConstraintDropContributor(alterBuilder.getTableName(), oldConstraint));
    alterBuilder.add(new ConstraintAddContributor(alterBuilder.getTableName(), newConstraint));
}
```

#### 2.3 visitModifiedRelationship (Line 150-153)

```java
// 수정 전
@Override
public void visitModifiedRelationship(RelationshipModel newRelationship, RelationshipModel oldRelationship) {
    alterBuilder.add(new RelationshipModifyContributor(alterBuilder.getTableName(), newRelationship, oldRelationship));
}

// 수정 후
@Override
public void visitModifiedRelationship(RelationshipModel newRelationship, RelationshipModel oldRelationship) {
    alterBuilder.add(new RelationshipDropContributor(alterBuilder.getTableName(), oldRelationship));
    alterBuilder.add(new RelationshipAddContributor(alterBuilder.getTableName(), newRelationship));
}
```

### 3. 수정 후 실행 순서

```sql
-- 1. IndexDropContributor (priority=30)
DROP INDEX `idx_ai_user_analysis_rec_rank` ON `ai_user_analysis_recommendation`;

-- 2. ColumnDropContributor (priority=20) 또는 ColumnAddContributor (priority=40)
ALTER TABLE `ai_user_analysis_recommendation` DROP COLUMN `rank`;
ALTER TABLE `ai_user_analysis_recommendation` ADD COLUMN `recommendation_rank` INT NOT NULL;

-- 3. IndexAddContributor (priority=60)
CREATE INDEX `idx_ai_user_analysis_rec_rank` ON `ai_user_analysis_recommendation`
    (`analysis_id`, `recommendation_rank`);
```
**컬럼이 존재한 후에 인덱스를 생성하므로 정상 동작이 가능할 것이다.**

## 영향 범위

### 수정된 파일

#### 프로덕션 코드
- `jinx-core/src/main/java/org/jinx/migration/dialect/mysql/MySqlMigrationVisitor.java`
  - `visitModifiedIndex()` 메서드
  - `visitModifiedConstraint()` 메서드
  - `visitModifiedRelationship()` 메서드

#### 테스트 코드
- `jinx-core/src/test/java/org/jinx/migration/dialect/mysql/MySqlMigrationVisitorTest.java`
  - `visitIndex_constraint_relationship_variants()` 테스트 - expected 리스트를 Drop + Add 패턴으로 수정
- `jinx-core/src/test/java/org/jinx/migration/contributor/AlterContributorsTest.java`
  - `IndexModifyContributorTest`, `ConstraintModifyContributorTest`, `RelationshipModifyContributorTest` 클래스에 `@Deprecated` 주석 추가

### 영향받는 시나리오
1. **인덱스가 참조하는 컬럼명이 변경**되는 경우
2. **제약조건(Constraint)이 참조하는 컬럼명이 변경**되는 경우
3. **외래키(Relationship)가 참조하는 컬럼명이 변경**되는 경우

### 더 이상 사용되지 않는 클래스

수정 후 다음 `ModifyContributor` 클래스들은 더 이상 사용되지 않는다.  
추후 혼동을 방지하기 위해 삭제도 고려해볼만 하다.  
- `IndexModifyContributor`
- `ConstraintModifyContributor`
- `RelationshipModifyContributor`


## 참고

추가적으로, 앞으로 다음과 같은 우선순위 원칙을 따르면 생성 문제는 막을 수 있을 것이다.

```plain
DROP operations (low priority, 0-30)
  ↓
COLUMN operations (40-50)
  ↓
ADD operations (high priority, 60-90)
```


---

## 후기

써볼 수록 아직은 문제가 자주 발견되는 듯 하다.  
솔직히 dependency graph로 걍 전환하는게 더 괜찮겠지만, 고민 중임.  

전체적으로 완성도만 더 높이면 그래도 사용하기에 편리하지 않나 싶긴하다.  
마이그레이션 툴이랑 통합하기도 편하고 코드랑 스키마 구조가 어긋나지 않는다는 점, 별다른 인프라 설정이 필요가 없다는 점 등등
나중에 CI/CD 환경에서 사용하기에도 편함. 걍 산출물만 내주니까?  

다만 개발자 UX를 더더 생각한다면, 개발환경에서 바로 DDL 적용이 가능한 트리거나,    
baseline을 더 직관적으로 사용할 수 있는 별도의 방법을 구상해 봐야 할 듯 하다. 
그리고 이름 생성 전략에 대해서 개발자 권한을 좀 더 주고 default fallback 처리 정도 추가해주면 괜찮지 않을까

사실 일단은 완성도를 높이는게 제일 급선무이긴 함.    
귀찮기도 한데, 순수하게 재밌어서 좀 더 해볼 듯 함.  
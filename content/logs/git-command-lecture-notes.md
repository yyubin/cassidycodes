![git-commands-flow](https://velog.velcdn.com/images/yyubin/post/1d830061-6728-4278-9769-bde1b33a95ae/image.svg)


## 1. 저장소 초기화 — git init / git remote add

`git init`은 현재 디렉토리를 Git 저장소로 만드는 첫 번째 명령이다. 이 시점에 `.git` 폴더가 생성되고 버전 관리가 시작된다.

```bash
git init
git remote add origin https://github.com/user/repo.git
```

`remote add`는 로컬 저장소에 "이 원격 저장소를 `origin`이라고 부르겠다"고 별명을 등록하는 것이다. `origin`은 관례적 이름일 뿐, 다른 이름을 써도 무방하다.

---

## 2. 로컬 작업 흐름 — add → commit

Git은 변경 사항을 바로 저장하지 않는다. 반드시 **2단계**를 거친다.

```bash
git add .              # 또는 git add 특정파일.java
git commit -m "메시지"
```

| 단계 | 명령 | 역할 |
|------|------|------|
| Working Directory | (파일 수정) | 실제 작업 공간 |
| Staging Area | `git add` | 커밋할 변경사항을 선별하는 임시 공간 |
| Local Repository | `git commit` | 확정된 스냅샷으로 저장 |

`add`와 `commit`을 분리한 이유는 하나의 커밋에 담을 내용을 **선별**할 수 있게 하기 위해서다. 10개 파일을 수정했어도 3개만 골라서 커밋하는 것이 가능하다.

---

## 3. 브랜치 — switch / checkout

브랜치는 커밋 히스토리의 포인터다. 독립적인 작업 공간을 만들어 메인 코드를 건드리지 않고 개발할 수 있다.

```bash
git switch -c feature/login    # 새 브랜치 생성 + 이동 (권장)
git checkout -b feature/login  # 구버전 방식, 동일한 효과
```

`switch`는 Git 2.23+부터 추가된 명령으로, 브랜치 전환만 담당하는 명확한 역할로 나뉜다. `checkout`은 파일 복구, 브랜치 전환 등 여러 기능이 섞여 있어 혼란스러울 수 있다. **최신 프로젝트라면 `switch`를 쓰는 것이 관례다.**

---

## 4. 원격 동기화 — push / pull / fetch

```bash
git push origin main      # 로컬 → 원격
git pull origin main      # 원격 → 로컬 (fetch + merge 자동)
git fetch origin          # 원격 정보만 가져오기 (merge 안 함)
```

`pull`과 `fetch`의 차이가 자주 헷갈린다.

- `git fetch` — 원격의 변경 사항을 **로컬에 다운로드만** 한다. 내 작업 브랜치에는 아무런 영향이 없다.
- `git pull` — `fetch` 후 자동으로 `merge`까지 실행한다. 즉 `pull = fetch + merge`다.

혼자 작업할 땐 `pull`로 충분하지만, 팀 협업에서 충돌을 미리 확인하고 싶을 때는 `fetch` 후 직접 `merge`를 결정하는 패턴을 쓴다.

---

## 5. 브랜치 합치기 — merge

```bash
git switch main
git merge feature/login
```

`feature/login` 브랜치의 커밋들을 `main`으로 합친다. 같은 파일의 같은 줄을 수정했다면 **충돌(conflict)** 이 발생하고, 이를 수동으로 해결한 뒤 다시 커밋해야 한다.

---

## 6. 되돌리기 — reset vs revert

이 둘의 차이는 **히스토리를 지우는가, 남기는가**에 있다.

```bash
git reset --hard HEAD~1    # 마지막 커밋 자체를 삭제 (위험)
git revert HEAD            # 마지막 커밋을 되돌리는 새 커밋 생성 (안전)
```

| | `reset` | `revert` |
|---|---|---|
| 히스토리 | 커밋 삭제 | 커밋 추가 |
| 협업 환경 | **위험** (이미 push한 커밋이면 절대 금지) | 안전 |
| 용도 | 로컬에서만 실험한 커밋 정리 | 원격에 올라간 커밋 되돌리기 |

**이미 `push`한 커밋은 `reset` 하지 않는다.** 팀원의 히스토리와 충돌해 큰 혼란이 생긴다.

---

## 7. PR (Pull Request)

PR은 Git 명령이 아니라 **GitHub/GitLab 같은 플랫폼의 기능**이다. 브랜치를 `push`한 뒤, 플랫폼 UI에서 "이 브랜치를 main에 합쳐도 괜찮은지 리뷰 요청"을 하는 것이다.

```
feature 브랜치 push → GitHub에서 PR 생성 → 팀원 코드 리뷰 → Approve → Merge
```

회사에서는 직접 `main`에 push하지 않고 반드시 PR을 통해 합치는 것이 기본 협업 규칙이다.

---

## 한 줄 요약

| 명령 | 핵심 역할 |
|------|----------|
| `git init` | 저장소 생성 |
| `remote add` | 원격 주소 등록 |
| `git add` | 커밋 대상 선택 |
| `git commit` | 스냅샷 확정 |
| `switch / checkout` | 브랜치 이동 |
| `git push` | 로컬 → 원격 |
| `git pull` | 원격 → 로컬 (merge 포함) |
| `git fetch` | 원격 다운로드만 (merge 없음) |
| `git merge` | 브랜치 합치기 |
| `git reset` | 커밋 삭제 (로컬 전용) |
| `git revert` | 되돌리는 커밋 추가 (안전) |
| PR | 플랫폼에서 코드 리뷰 후 merge 요청 |
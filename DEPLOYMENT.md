# Git을 통한 배포 가이드

## 📋 배포 순서

### 1단계: GitHub 저장소 생성
1. 웹 브라우저에서 https://github.com 접속
2. 로그인 후 우측 상단의 **"+"** 버튼 클릭 → **"New repository"** 선택
3. 저장소 생성 화면에서:
   - **Repository name**: `offday2` (또는 원하는 이름)
   - **Description**: "연차관리 시스템" (선택사항)
   - **Public** 선택 (GitHub Pages는 무료로 Public 저장소만 지원)
   - **"Initialize this repository with a README"** 체크 해제 (이미 README.md가 있으므로)
4. **"Create repository"** 버튼 클릭
5. 저장소가 생성되면 GitHub에서 제공하는 URL을 복사합니다
   - 예: `https://github.com/your-username/offday2.git`

### 2단계: 로컬 Git 저장소에 원격 저장소 연결
터미널에서 다음 명령어를 실행하세요:

```bash
# 원격 저장소 추가 (your-username을 본인의 GitHub 사용자명으로 변경)
git remote add origin https://github.com/your-username/offday2.git

# 원격 저장소 확인
git remote -v
```

### 3단계: 코드를 GitHub에 업로드
```bash
# 현재 브랜치 이름 확인 (master인지 main인지 확인)
git branch

# 모든 변경사항 커밋 확인 (이미 커밋되어 있다면 생략 가능)
git status

# GitHub에 코드 업로드 (처음 한 번만)
git push -u origin master

# 만약 브랜치가 main이라면:
# git push -u origin main
```

### 4단계: GitHub Pages 설정
1. GitHub 저장소 페이지로 이동
2. 상단 메뉴에서 **"Settings"** 클릭
3. 왼쪽 사이드바에서 **"Pages"** 클릭
4. **"Source"** 섹션에서:
   - **"Deploy from a branch"** 선택
   - **Branch**: `master` (또는 `main`) 선택
   - **Folder**: `/ (root)` 선택
5. **"Save"** 버튼 클릭
6. 몇 분 후 아래에 배포된 사이트 URL이 표시됩니다
   - 예: `https://your-username.github.io/offday2`

### 5단계: 배포 확인
- 브라우저에서 제공된 URL로 접속하여 사이트가 정상 작동하는지 확인
- 배포는 보통 1-2분 소요되며, 업데이트마다 다시 배포됩니다

## 🔄 이후 업데이트 시

코드를 수정하고 배포하려면:

```bash
# 1. 변경사항 확인
git status

# 2. 변경사항 스테이징
git add .

# 3. 커밋
git commit -m "변경 내용 설명"

# 4. GitHub에 업로드 (자동으로 배포됨)
git push
```

## ⚠️ 주의사항

1. **Public 저장소**: GitHub Pages 무료 버전은 Public 저장소만 지원합니다
2. **데이터 저장**: 이 프로젝트는 Local Storage를 사용하므로 브라우저별로 데이터가 독립적으로 저장됩니다
3. **HTTPS**: GitHub Pages는 자동으로 HTTPS를 제공합니다
4. **도메인**: 필요시 커스텀 도메인을 설정할 수 있습니다 (Settings > Pages)

## 🛠️ 문제 해결

### 원격 저장소를 잘못 설정한 경우
```bash
# 기존 원격 저장소 제거
git remote remove origin

# 다시 추가
git remote add origin https://github.com/your-username/offday2.git
```

### 브랜치 이름이 다른 경우
```bash
# 현재 브랜치 이름 확인
git branch

# 브랜치 이름이 master인데 main으로 푸시해야 하는 경우
git push -u origin master:main
```

### 이미 원격 저장소가 있는 경우
```bash
# 원격 저장소 목록 확인
git remote -v

# 이미 설정되어 있다면 그냥 push만 하면 됨
git push
```


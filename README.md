# 연차관리 시스템

회사에서 사용할 수 있는 현대적이고 직관적인 연차관리 웹 애플리케이션입니다.

## 🚀 주요 기능

### 📊 대시보드
- 전체 연차 현황을 한눈에 확인
- 실시간 통계 및 차트
- 최근 연차 신청 목록
- 빠른 작업 버튼

### 👥 직원 관리
- 직원 정보 등록/수정/삭제
- 부서별 직원 관리
- 연차 잔여일 자동 계산

### 📅 연차 신청
- 직관적인 연차 신청 폼
- 승인/거부 워크플로우
- 연차 일정 캘린더

### 📈 통계 및 리포트
- 월별/연도별 연차 사용 통계
- 부서별 연차 현황
- 데이터 내보내기/가져오기

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **스타일링**: CSS Grid, Flexbox, CSS Variables
- **아이콘**: Font Awesome
- **데이터 저장**: Local Storage
- **반응형 디자인**: Mobile-first approach

## 📱 반응형 디자인

모든 디바이스에서 최적화된 사용자 경험을 제공합니다:
- 데스크톱 (1200px+)
- 태블릿 (768px - 1199px)
- 모바일 (320px - 767px)

## 🎨 UI/UX 특징

- **모던한 디자인**: 그라데이션과 카드 기반 레이아웃
- **직관적인 네비게이션**: 명확한 메뉴 구조
- **실시간 피드백**: 알림 및 상태 표시
- **접근성**: 키보드 네비게이션 지원

## 🚀 시작하기

### 로컬에서 실행

1. 저장소 클론:
```bash
git clone https://github.com/your-username/offday2.git
cd offday2
```

2. 웹 서버 실행:
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# 또는 브라우저에서 직접 index.html 열기
```

3. 브라우저에서 `http://localhost:8000` 접속

### GitHub Pages 배포

1. GitHub 저장소 생성
2. 파일들을 저장소에 업로드
3. Settings > Pages에서 Source를 "Deploy from a branch" 선택
4. Branch를 "main"으로 설정
5. 저장 후 `https://your-username.github.io/offday2` 접속

## 📁 프로젝트 구조

```
offday2/
 index.html              # 메인 대시보드
 leave-status.html      # 연차현황 페이지 (연차신청 포함)
 employee-management.html # 직원 관리 페이지
 statistics.html         # 통계 페이지
 settings.html           # 설정 페이지
 styles/
    main.css           # 메인 스타일
    dashboard.css      # 대시보드 전용 스타일
 js/
    data-manager.js    # 데이터 관리 클래스
    dashboard.js       # 대시보드 기능
 README.md
```

## 🔧 설정

### 기본 설정
- 연차 일수: 15일 (설정에서 변경 가능)
- 회사명: "우리회사" (설정에서 변경 가능)
- 근무일: 월-금 (설정에서 변경 가능)

### 데이터 관리
- 모든 데이터는 브라우저의 Local Storage에 저장
- 데이터 내보내기/가져오기 기능 제공
- 브라우저별로 독립적인 데이터 저장

## 🎯 사용법

### 1. 직원 등록
1. "직원관리" 메뉴 클릭
2. "직원 추가" 버튼 클릭
3. 직원 정보 입력 후 저장

### 2. 연차 신청
1. "연차신청" 메뉴 클릭
2. 직원 선택 및 연차 기간 입력
3. 사유 입력 후 신청

### 3. 연차 승인/거부
1. 대시보드에서 "승인 대기 목록" 클릭
2. 각 신청에 대해 승인/거부 버튼 클릭

### 4. 통계 확인
1. "통계" 메뉴에서 월별/연도별 현황 확인
2. 부서별 연차 사용 현황 분석

## 🔒 보안 고려사항

- 클라이언트 사이드 애플리케이션이므로 민감한 데이터는 서버에 저장 권장
- 실제 운영 환경에서는 백엔드 API 연동 필요
- HTTPS 사용 권장

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 있거나 기능 요청이 있으시면 GitHub Issues를 통해 연락해주세요.

---

**연차관리 시스템**으로 더 효율적인 인사 관리가 가능합니다! 🎉

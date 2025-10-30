// 인증 가드 클래스
class AuthGuard {
    // 인증 상태 확인
    static checkAuth() {
        if (!window.authManager) {
            console.error('AuthManager가 로드되지 않았습니다.');
            return false;
        }
        
        const isAuthenticated = window.authManager.checkAuth();
        
        if (!isAuthenticated) {
            // 인증되지 않은 경우 로그인 페이지로 리다이렉트
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    }
    
    // 로그아웃 처리
    static logout() {
        if (!window.authManager) {
            console.error('AuthManager가 로드되지 않았습니다.');
            return false;
        }
        
        const result = window.authManager.logout();
        
        if (result.success) {
            // 로그아웃 성공 시 로그인 페이지로 리다이렉트
            window.location.href = 'login.html';
            return true;
        }
        
        return false;
    }
    
    // 현재 사용자 정보 가져오기
    static getCurrentUser() {
        if (!window.authManager) {
            console.error('AuthManager가 로드되지 않았습니다.');
            return null;
        }
        
        return window.authManager.getCurrentUser();
    }
    
    // 관리자 권한 체크
    static isAdmin() {
        const currentUser = this.getCurrentUser();
        return currentUser && currentUser.role === 'admin';
    }
    
    // 관리자 페이지 접근 체크 (비관리자 접근 시 대시보드로 리다이렉트)
    static checkAdminAccess() {
        if (!this.checkAuth()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            alert('관리자만 접근할 수 있는 페이지입니다.');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }
}

// 전역 AuthGuard 인스턴스 생성
window.AuthGuard = AuthGuard;

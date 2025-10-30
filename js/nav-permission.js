// 네비게이션 권한 관리 스크립트
(function() {
    'use strict';
    
    // 페이지 로드 시 네비게이션 권한 체크
    function checkNavigationPermissions() {
        if (!window.authManager) {
            console.warn('AuthManager가 로드되지 않았습니다.');
            return;
        }
        
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            return;
        }
        
        const isAdmin = currentUser.role === 'admin';
        
        // 모든 페이지의 메인관리 링크 찾기
        const mainManagementLinks = document.querySelectorAll('a[href="main-management.html"]');
        mainManagementLinks.forEach(link => {
            if (!isAdmin) {
                // 일반 사용자는 링크 숨김
                link.style.display = 'none';
            } else {
                // 관리자는 정상 표시
                link.style.display = '';
            }
        });
    }
    
    // DOM 로드 완료 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkNavigationPermissions);
    } else {
        checkNavigationPermissions();
    }
})();



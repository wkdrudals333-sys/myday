// 메인관리 스크립트
(function(){
  function openModal(title, body){
    var modal=document.getElementById('mm-modal');
    if(!modal) return;
    document.getElementById('mm-modal-title').textContent=title;
    document.getElementById('mm-modal-body').textContent=body;
    modal.style.display='block';
  }
  function closeModal(){
    var modal=document.getElementById('mm-modal');
    if(modal) modal.style.display='none';
  }
  window.addEventListener('DOMContentLoaded', function(){
    if (!window.AuthGuard || !AuthGuard.checkAuth()) return;
    
    // 관리자 권한 체크
    if (!AuthGuard.checkAdminAccess()) return;

    // 일반 사용자일 경우 메인관리 페이지의 모든 카드 비활성화
    const currentUser = AuthGuard.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (!isAdmin) {
      const managementCards = document.querySelectorAll('.mm-card');
      managementCards.forEach(card => {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.5';
        card.style.cursor = 'not-allowed';
        card.title = '관리자만 접근 가능합니다';
      });
    }

    // 로그아웃 처리는 auth.js에서 전역으로 처리됨

    // 지점관리 링크는 이제 branch-management.html로 직접 이동하므로 모달 제거

    // 연차승인 링크는 이제 approval.html로 직접 이동하므로 모달 제거

    var closeBtn=document.getElementById('mm-modal-close');
    if(closeBtn){
      closeBtn.addEventListener('click', function(){ closeModal(); });
    }

    window.addEventListener('click', function(e){
      var modal=document.getElementById('mm-modal');
      if(e.target===modal){ closeModal(); }
    });
  });
})();

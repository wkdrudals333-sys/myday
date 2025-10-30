// 대시보드 기능
class Dashboard {
    constructor() {
        this.dataManager = window.dataManager;
        this.init();
    }

    init() {
        this.loadStatistics();
        this.loadRecentRequests();
        this.loadMonthlyStatistics();
        this.setupEventListeners();
    }

    // 통계 데이터 로드
    loadStatistics() {
        const stats = this.dataManager.getStatistics();
        
        document.getElementById('total-employees').textContent = stats.totalEmployees;
        document.getElementById('pending-requests').textContent = stats.pendingRequests;
        document.getElementById('approved-requests').textContent = stats.approvedRequests;
        document.getElementById('remaining-days').textContent = stats.averageRemainingDays;
    }

    // 최근 연차 신청 로드
    loadRecentRequests() {
        const recentRequests = this.dataManager.getRecentRequests(5);
        const container = document.getElementById('recent-requests');
        
        if (recentRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <p>최근 연차 신청이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentRequests.map(request => `
            <div class="request-item">
                <div class="employee-name">${request.employeeName}</div>
                <div class="request-details">
                    <span>${request.startDate} ~ ${request.endDate} (${request.days}일)</span>
                    <span class="status ${request.status}">${this.getStatusText(request.status)}</span>
                </div>
            </div>
        `).join('');
    }

    // 이번 달 통계 로드
    loadMonthlyStatistics() {
        const monthlyStats = this.dataManager.getMonthlyStatistics();
        
        document.getElementById('used-this-month').textContent = `${monthlyStats.usedThisMonth}일`;
        document.getElementById('scheduled-this-month').textContent = `${monthlyStats.scheduledThisMonth}일`;
        document.getElementById('pending-this-month').textContent = `${monthlyStats.pendingThisMonth}일`;
    }

    // 상태 텍스트 변환
    getStatusText(status) {
        const statusMap = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '거부됨'
        };
        return statusMap[status] || status;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 모달 외부 클릭 시 닫기
        document.getElementById('pending-modal').addEventListener('click', (e) => {
            if (e.target.id === 'pending-modal') {
                this.closeModal();
            }
        });
    }

    // 승인 대기 목록 표시
    showPendingRequests() {
        const pendingRequests = this.dataManager.getPendingRequests();
        const container = document.getElementById('pending-list');
        
        if (pendingRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>승인 대기 중인 연차 신청이 없습니다.</p>
                </div>
            `;
        } else {
            container.innerHTML = pendingRequests.map(request => `
                <div class="pending-item">
                    <div class="pending-item-header">
                        <div class="employee-name">${request.employeeName}</div>
                        <div class="request-date">신청일: ${request.requestDate}</div>
                    </div>
                    <div class="pending-item-details">
                        <div>
                            <strong>기간:</strong> ${request.startDate} ~ ${request.endDate}
                        </div>
                        <div>
                            <strong>일수:</strong> ${request.days}일
                        </div>
                        <div>
                            <strong>사유:</strong> ${request.reason}
                        </div>
                        <div>
                            <strong>부서:</strong> ${this.getEmployeeDepartment(request.employeeId)}
                        </div>
                    </div>
                    <div class="pending-item-actions">
                        <button class="btn-approve" onclick="dashboard.approveRequest(${request.id})">
                            <i class="fas fa-check"></i> 승인
                        </button>
                        <button class="btn-reject" onclick="dashboard.rejectRequest(${request.id})">
                            <i class="fas fa-times"></i> 거부
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        document.getElementById('pending-modal').style.display = 'block';
    }

    // 직원 부서 정보 가져오기
    getEmployeeDepartment(employeeId) {
        const employee = this.dataManager.employees.find(emp => emp.id === employeeId);
        return employee ? employee.department : '알 수 없음';
    }

    // 연차 신청 승인
    approveRequest(requestId) {
        if (confirm('이 연차 신청을 승인하시겠습니까?')) {
            this.dataManager.updateLeaveRequestStatus(requestId, 'approved');
            this.refreshDashboard();
            this.showPendingRequests(); // 목록 새로고침
            this.showNotification('연차 신청이 승인되었습니다.', 'success');
        }
    }

    // 연차 신청 거부
    rejectRequest(requestId) {
        if (confirm('이 연차 신청을 거부하시겠습니까?')) {
            this.dataManager.updateLeaveRequestStatus(requestId, 'rejected');
            this.refreshDashboard();
            this.showPendingRequests(); // 목록 새로고침
            this.showNotification('연차 신청이 거부되었습니다.', 'error');
        }
    }

    // 대시보드 새로고침
    refreshDashboard() {
        this.loadStatistics();
        this.loadRecentRequests();
        this.loadMonthlyStatistics();
    }

    // 모달 닫기
    closeModal() {
        document.getElementById('pending-modal').style.display = 'none';
    }

    // 데이터 내보내기
    exportData() {
        this.dataManager.exportData();
        this.showNotification('데이터가 성공적으로 내보내졌습니다.', 'success');
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 간단한 알림 구현
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// 전역 함수들
function showPendingRequests() {
    window.dashboard.showPendingRequests();
}

function closeModal() {
    window.dashboard.closeModal();
}

function exportData() {
    window.dashboard.exportData();
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

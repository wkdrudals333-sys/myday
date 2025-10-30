// 설정 페이지 기능
class Settings {
    constructor() {
        this.dataManager = window.dataManager;
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 토글 스위치 이벤트
        document.querySelectorAll('.toggle-switch input').forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.showNotification('설정이 변경되었습니다. 저장 버튼을 클릭하세요.', 'info');
            });
        });

        // 입력 필드 이벤트
        document.querySelectorAll('input[type="text"], input[type="number"], select').forEach(input => {
            input.addEventListener('change', () => {
                this.showNotification('설정이 변경되었습니다. 저장 버튼을 클릭하세요.', 'info');
            });
        });

        // 파일 입력 이벤트
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileImport(e);
        });
    }

    // 설정 로드
    loadSettings() {
        const settings = this.dataManager.settings;

        // 일반 설정
        document.getElementById('auto-save').checked = settings.autoSave || true;
        document.getElementById('show-notifications').checked = settings.showNotifications !== false;
        document.getElementById('dark-mode').checked = settings.darkMode || false;

        // 연차 설정
        document.getElementById('default-leave-days').value = settings.annualLeaveDays || 15;
        document.getElementById('max-leave-days').value = settings.maxLeaveDays || 10;
        document.getElementById('advance-notice').value = settings.advanceNotice || 3;

        // 회사 정보
        document.getElementById('company-name').value = settings.companyName || '우리회사';
        document.getElementById('work-hours').value = settings.workHours || '09:00 - 18:00';
        document.getElementById('work-days').value = settings.workDays || '월-금';
    }

    // 설정 저장
    saveSettings() {
        const newSettings = {
            // 일반 설정
            autoSave: document.getElementById('auto-save').checked,
            showNotifications: document.getElementById('show-notifications').checked,
            darkMode: document.getElementById('dark-mode').checked,

            // 연차 설정
            annualLeaveDays: parseInt(document.getElementById('default-leave-days').value),
            maxLeaveDays: parseInt(document.getElementById('max-leave-days').value),
            advanceNotice: parseInt(document.getElementById('advance-notice').value),

            // 회사 정보
            companyName: document.getElementById('company-name').value,
            workHours: document.getElementById('work-hours').value,
            workDays: document.getElementById('work-days').value,

            // 기존 설정 유지
            workingDays: this.dataManager.settings.workingDays || ['월', '화', '수', '목', '금']
        };

        // 유효성 검사
        if (!this.validateSettings(newSettings)) {
            return;
        }

        // 설정 저장
        this.dataManager.settings = newSettings;
        this.dataManager.saveData('settings', newSettings);

        // 다크 모드 적용
        this.applyDarkMode(newSettings.darkMode);

        this.showNotification('설정이 성공적으로 저장되었습니다.', 'success');
    }

    // 설정 유효성 검사
    validateSettings(settings) {
        if (!settings.companyName.trim()) {
            this.showNotification('회사명을 입력해주세요.', 'error');
            return false;
        }

        if (settings.annualLeaveDays < 1 || settings.annualLeaveDays > 30) {
            this.showNotification('기본 연차 일수는 1일에서 30일 사이여야 합니다.', 'error');
            return false;
        }

        if (settings.maxLeaveDays < 1 || settings.maxLeaveDays > 30) {
            this.showNotification('최대 연차 일수는 1일에서 30일 사이여야 합니다.', 'error');
            return false;
        }

        if (settings.advanceNotice < 0 || settings.advanceNotice > 30) {
            this.showNotification('사전 신청 기간은 0일에서 30일 사이여야 합니다.', 'error');
            return false;
        }

        return true;
    }

    // 설정 초기화
    resetSettings() {
        if (confirm('모든 설정을 기본값으로 복원하시겠습니까?')) {
            const defaultSettings = {
                autoSave: true,
                showNotifications: true,
                darkMode: false,
                annualLeaveDays: 15,
                maxLeaveDays: 10,
                advanceNotice: 3,
                companyName: '우리회사',
                workHours: '09:00 - 18:00',
                workDays: '월-금',
                workingDays: ['월', '화', '수', '목', '금']
            };

            this.dataManager.settings = defaultSettings;
            this.dataManager.saveData('settings', defaultSettings);
            this.loadSettings();
            this.applyDarkMode(false);
            this.showNotification('설정이 기본값으로 복원되었습니다.', 'success');
        }
    }

    // 다크 모드 적용
    applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // 전체 데이터 내보내기
    exportAllData() {
        const data = {
            employees: this.dataManager.employees,
            leaveRequests: this.dataManager.leaveRequests,
            settings: this.dataManager.settings,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `연차관리_전체데이터_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('전체 데이터가 성공적으로 내보내졌습니다.', 'success');
    }

    // 데이터 가져오기
    importData() {
        document.getElementById('file-input').click();
    }

    // 파일 가져오기 처리
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            this.showNotification('JSON 파일만 가져올 수 있습니다.', 'error');
            return;
        }

        if (confirm('기존 데이터가 모두 삭제되고 새 데이터로 교체됩니다. 계속하시겠습니까?')) {
            this.dataManager.importData(file)
                .then((data) => {
                    this.loadSettings();
                    this.showNotification('데이터가 성공적으로 가져와졌습니다.', 'success');
                    // 페이지 새로고침으로 변경사항 반영
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                })
                .catch((error) => {
                    this.showNotification('데이터 가져오기에 실패했습니다: ' + error.message, 'error');
                });
        }

        // 파일 입력 초기화
        event.target.value = '';
    }

    // 모든 데이터 초기화
    resetAllData() {
        if (confirm('정말로 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
            if (confirm('마지막 확인: 모든 직원 정보와 연차 신청 내역이 삭제됩니다. 계속하시겠습니까?')) {
                // 로컬 스토리지 초기화
                localStorage.removeItem('employees');
                localStorage.removeItem('leaveRequests');
                localStorage.removeItem('settings');

                this.showNotification('모든 데이터가 삭제되었습니다. 페이지를 새로고침합니다.', 'success');
                
                // 페이지 새로고침
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        }
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 전역 함수들
function saveSettings() {
    window.settings.saveSettings();
}

function resetSettings() {
    window.settings.resetSettings();
}

function exportAllData() {
    window.settings.exportAllData();
}

function importData() {
    window.settings.importData();
}

function resetAllData() {
    window.settings.resetAllData();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.settings = new Settings();
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

// 개인 연차현황 기능
class LeaveStatus {
    constructor() {
        this.dataManager = window.dataManager;
        this.currentUser = null;
        // 신청 내역 페이지네이션 관련 변수
        this.requestsCurrentPage = 1;
        this.requestsItemsPerPage = 5;
        this.requestsTotalPages = 1;
        this.requestsStatusFilter = 'all'; // 상태 필터 추가
        this.requestsTypeFilter = 'all'; // 휴가 유형 필터 추가
        this.init();
    }

    init() {
        this.getCurrentUser();
        this.updateCurrentYear();
        this.updateCalculationCriteria();
        this.loadPersonalLeaveStats();
        this.loadWelfareLeaveStats();
        this.loadMyRequests();
        this.loadMonthlyChart();
        this.loadPlanningStats();
        this.loadUsagePattern();
        this.setupEventListeners();
    }

    // 현재 연도 표시 업데이트
    updateCurrentYear() {
        const currentYear = new Date().getFullYear();
        const yearDisplay = document.getElementById('current-year-display');
        if (yearDisplay) {
            yearDisplay.textContent = `${currentYear}년 기준`;
        }
    }

    // 계산 기준 정보 업데이트
    updateCalculationCriteria() {
        if (!this.currentUser) return;

        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        if (!employee) return;

        // 지점의 연차 계산 기준 확인
        const branch = this.dataManager.branches.find(b => b.name === employee.branch);
        const calculationStandard = branch?.leaveCalculationStandard || 'hire_date';
        
        // 간단한 계산 기준 정보 생성
        let criteriaText = '';
        
        if (calculationStandard === 'hire_date') {
            criteriaText = '입사일 기준';
        } else if (calculationStandard === 'fiscal_year') {
            criteriaText = '회계연도 기준';
        } else {
            criteriaText = '입사일 기준';
        }
        
        // 앞에 "연차계산 : " 접두사 추가
        criteriaText = `연차계산 : ${criteriaText}`;

        // 계산 기준 정보 표시
        const criteriaElement = document.getElementById('calculation-criteria');
        if (criteriaElement) {
            criteriaElement.textContent = criteriaText;
        }

        console.log('연차 계산 기준 정보 업데이트:', {
            employee: employee.name,
            branch: employee.branch,
            calculationStandard,
            criteriaText
        });
    }

    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        if (window.AuthGuard) {
            this.currentUser = window.AuthGuard.getCurrentUser();
        }
        return this.currentUser;
    }

    // 개인 연차 통계 로드
    loadPersonalLeaveStats() {
        if (!this.currentUser) return;

        const userLeaveData = this.getUserLeaveData(this.currentUser.id);
        
        // 개인 연차 현황 업데이트
        document.getElementById('earned-days').textContent = userLeaveData.earned;
        document.getElementById('used-days').textContent = userLeaveData.used;
        document.getElementById('remaining-days').textContent = userLeaveData.remaining;
        document.getElementById('pending-days').textContent = userLeaveData.pending;

        // 연차 사용률 계산 및 업데이트
        const usagePercentage = userLeaveData.earned > 0 ? 
            Math.round((userLeaveData.used / userLeaveData.earned) * 100) : 0;
        
        document.getElementById('usage-percentage').textContent = `${usagePercentage}%`;
        document.getElementById('progress-fill').style.width = `${usagePercentage}%`;
    }

    // 복지 휴가 통계 로드
    loadWelfareLeaveStats() {
        if (!this.currentUser) return;

        const userWelfareData = this.getUserWelfareData(this.currentUser.id);
        
        // 복지 휴가 현황 업데이트
        document.getElementById('welfare-earned-days').textContent = userWelfareData.earned;
        document.getElementById('welfare-used-days').textContent = userWelfareData.used;
        document.getElementById('welfare-remaining-days').textContent = userWelfareData.remaining;
        document.getElementById('welfare-pending-days').textContent = userWelfareData.pending;

        // 복지 휴가 사용률 계산 및 업데이트
        const usagePercentage = userWelfareData.earned > 0 ? 
            Math.round((userWelfareData.used / userWelfareData.earned) * 100) : 0;
        
        document.getElementById('welfare-usage-percentage').textContent = `${usagePercentage}%`;
        document.getElementById('welfare-progress-fill').style.width = `${usagePercentage}%`;
    }

    // 사용자별 복지 휴가 데이터 계산
    getUserWelfareData(userId) {
        const currentYear = new Date().getFullYear();
        
        // 사용자 정보로 직원 ID와 사용자 ID 모두 허용
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        const userIdForRequests = this.currentUser.id;
        
        // 복지휴가 지급 이력에서 실제 지급된 일수 계산
        const welfareGrants = (this.dataManager.welfareLeaveGrants || []).filter(
            grant => grant.employeeId === employeeId && new Date(grant.effectiveDate).getFullYear() === currentYear
        );
        const earnedFromGrants = welfareGrants.reduce((total, grant) => total + (grant.grantedDays || 0), 0);
        
        const userWelfareRequests = this.dataManager.leaveRequests.filter(request => {
            const belongsToUser = (request.employeeId === userIdForRequests) || (employeeId !== null && request.employeeId === employeeId);
            const isWelfare = request.leaveType && request.leaveType.startsWith('welfare-');
            const sameYear = new Date(request.startDate).getFullYear() === currentYear;
            return belongsToUser && isWelfare && sameYear;
        });

        // 지급된 복지 휴가 (지급 이력에서 계산)
        const earned = earnedFromGrants;
        
        // 사용한 복지 휴가 (승인된 복지 휴가)
        const used = userWelfareRequests
            .filter(request => request.status === 'approved')
            .reduce((total, request) => {
                // 반차인지 확인하여 올바른 일수 계산
                let actualDays = request.days;
                if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                    actualDays = 0.5;
                }
                return total + actualDays;
            }, 0);
        
        // 대기 중인 복지 휴가
        const pending = userWelfareRequests
            .filter(request => request.status === 'pending')
            .reduce((total, request) => {
                // 반차인지 확인하여 올바른 일수 계산
                let actualDays = request.days;
                if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                    actualDays = 0.5;
                }
                return total + actualDays;
            }, 0);
        
        // 남은 복지 휴가
        const remaining = earned - used - pending;

        console.log(`복지 휴가 현황 - 지급: ${earned}, 사용: ${used}, 대기: ${pending}, 남은: ${remaining}`);

        return { earned, used, pending, remaining };
    }

    // 사용자별 연차 데이터 계산
    getUserLeaveData(userId) {
        const currentYear = new Date().getFullYear();
        
        // 사용자 정보로 직원 ID와 사용자 ID 모두 허용 (혼재된 데이터 호환)
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        const userIdForRequests = this.currentUser.id;
        
        const userRequests = this.dataManager.leaveRequests.filter(request => {
            const belongsToUser = (request.employeeId === userIdForRequests) || (employeeId !== null && request.employeeId === employeeId);
            const sameYear = new Date(request.startDate).getFullYear() === currentYear;
            const isStatutoryLeave = !request.leaveType || !request.leaveType.startsWith('welfare-');
            return belongsToUser && sameYear && isStatutoryLeave;
        });

        // 발생 연차 (지점별 계산 기준 적용)
        const earned = this.calculateEarnedDays(employeeId);
        
        // 사용한 연차 (승인된 연차)
        const used = userRequests
            .filter(request => request.status === 'approved')
            .reduce((total, request) => {
                // 반차인지 확인하여 올바른 일수 계산
                let actualDays = request.days;
                if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                    actualDays = 0.5;
                }
                return total + actualDays;
            }, 0);
        
        // 대기 중인 연차
        const pending = userRequests
            .filter(request => request.status === 'pending')
            .reduce((total, request) => {
                // 반차인지 확인하여 올바른 일수 계산
                let actualDays = request.days;
                if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                    actualDays = 0.5;
                }
                return total + actualDays;
            }, 0);
        
        // 남은 연차
        const remaining = earned - used - pending;

        console.log(`연차 현황 - 발생: ${earned}, 사용: ${used}, 대기: ${pending}, 남은: ${remaining}`);

        return { earned, used, pending, remaining };
    }

    // 발생 연차 계산 - 지점별 연차 계산 기준 적용
    calculateEarnedDays(userId) {
        if (window.LeaveCalculation) {
            // 새로운 연차 계산 시스템 사용
            const earnedDays = window.LeaveCalculation.calculateLeaveByBranchStandard(userId);
            
            // 디버깅 정보 출력
            const employee = this.dataManager.employees.find(emp => emp.id === userId);
            if (employee) {
                console.log('연차 계산 디버깅:', {
                    employeeName: employee.name,
                    hireDate: employee.hireDate || employee.joinDate,
                    currentDate: new Date().toISOString().split('T')[0],
                    calculatedDays: earnedDays,
                    branch: employee.branch
                });
            }
            
            return earnedDays;
        } else {
            // 기존 계산 방식 (폴백)
            console.log('LeaveCalculation이 로드되지 않음, 기존 방식 사용');
            return 15; // 기본 15일
        }
    }

    // 나의 연차 신청 목록 로드
    loadMyRequests() {
        if (!this.currentUser) return;

        // 혼재된 employeeId 값(사용자 id 또는 직원 id) 모두 수용
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        const selectedYear = this.getSelectedRequestsYear();
        
        // 기본 필터링 (연도, 사용자)
        let allRequests = this.dataManager.leaveRequests
            .filter(request => {
                const belongs = request.employeeId === this.currentUser.id || (employeeId !== null && request.employeeId === employeeId);
                if (!belongs) return false;
                if (!selectedYear) return true;
                return new Date(request.startDate).getFullYear() === selectedYear;
            });

        // 상태 필터 적용
        if (this.requestsStatusFilter !== 'all') {
            allRequests = allRequests.filter(request => request.status === this.requestsStatusFilter);
        }

        // 휴가 유형 필터 적용
        if (this.requestsTypeFilter !== 'all') {
            if (this.requestsTypeFilter === 'annual') {
                // 법정 연차만 (복지 휴가가 아닌 것)
                allRequests = allRequests.filter(request => !request.leaveType || !request.leaveType.startsWith('welfare-'));
            } else if (this.requestsTypeFilter === 'welfare') {
                // 복지 휴가만
                allRequests = allRequests.filter(request => request.leaveType && request.leaveType.startsWith('welfare-'));
            }
        }

        // 정렬
        allRequests = allRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

        // 페이지네이션 적용
        this.requestsTotalPages = Math.ceil(allRequests.length / this.requestsItemsPerPage);
        const startIndex = (this.requestsCurrentPage - 1) * this.requestsItemsPerPage;
        const endIndex = startIndex + this.requestsItemsPerPage;
        const myRequests = allRequests.slice(startIndex, endIndex);

        const container = document.getElementById('my-requests');
        
        if (allRequests.length === 0) {
            const statusText = this.requestsStatusFilter === 'all' ? '' : ` (${this.getStatusText(this.requestsStatusFilter)})`;
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <p>해당 상태의 연차 신청 내역이 없습니다${statusText}.</p>
                </div>
            `;
            this.updateRequestsPagination(allRequests.length);
            return;
        }

        // 사유 표시 텍스트 생성 유틸 (reasonType 기반, 비어있으면 reason 사용)
        const getDisplayReason = (req) => {
            const map = {
                'personal': '개인사정',
                'sick': '병가',
                'other': '기타',
                'vacation': '휴가',
                'family': '가족사정',
                'half_morning': '반차(오전)',
                'half_afternoon': '반차(오후)'
            };
            const byType = map[String(req.reasonType || '').trim()] || '';
            const base = (req.reason && req.reason !== 'null') ? req.reason : '';
            // 둘 다 있으면 "사유(상세)" 형태로 합성
            if (byType && base) return `${byType} - ${base}`;
            return byType || base || '-';
        };

        container.innerHTML = myRequests.map(request => `
            <div class="my-request-item">
                <div class="request-period">${request.startDate} ~ ${request.endDate}</div>
                <div class="request-details">
                    <span>${this.getDisplayDays(request)}일 | ${getDisplayReason(request)}</span>
                    <span class="request-status ${request.status}">${this.getStatusText(request.status)}</span>
                </div>
            </div>
        `).join('');
        
        // 페이지네이션 업데이트
        this.updateRequestsPagination(allRequests.length);
    }

    getSelectedRequestsYear() {
        const sel = document.getElementById('requests-year-selector');
        if (!sel) return null;
        const val = parseInt(sel.value, 10);
        return isNaN(val) ? null : val;
    }

    // 신청 내역 페이지네이션 업데이트
    updateRequestsPagination(totalItems) {
        const pagination = document.getElementById('requests-pagination');
        const prevBtn = document.getElementById('requests-prev-page');
        const nextBtn = document.getElementById('requests-next-page');
        const pageNumbers = document.getElementById('requests-page-numbers');
        const paginationInfo = document.getElementById('requests-pagination-info');
        
        if (!pagination || !prevBtn || !nextBtn || !pageNumbers) return;
        
        // 페이지네이션 정보 업데이트
        if (paginationInfo) {
            const startItem = (this.requestsCurrentPage - 1) * this.requestsItemsPerPage + 1;
            const endItem = Math.min(this.requestsCurrentPage * this.requestsItemsPerPage, totalItems);
            paginationInfo.textContent = `${startItem}-${endItem} / 총 ${totalItems}개`;
        }
        
        // 총 항목이 페이지당 항목 수보다 적으면 페이지네이션 숨기기
        if (totalItems <= this.requestsItemsPerPage) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        
        // 이전/다음 버튼 상태 업데이트
        prevBtn.disabled = this.requestsCurrentPage === 1;
        nextBtn.disabled = this.requestsCurrentPage === this.requestsTotalPages;
        
        // 페이지 번호 생성
        pageNumbers.innerHTML = '';
        
        // 표시할 페이지 번호 계산 (최대 5개)
        let startPage = Math.max(1, this.requestsCurrentPage - 2);
        let endPage = Math.min(this.requestsTotalPages, startPage + 4);
        
        // 끝 페이지가 조정되면 시작 페이지도 조정
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // 첫 페이지가 1이 아니면 "..." 표시
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.textContent = '1';
            firstPageBtn.className = 'page-number';
            firstPageBtn.addEventListener('click', () => this.goToRequestsPage(1));
            pageNumbers.appendChild(firstPageBtn);
            
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'page-dots';
                pageNumbers.appendChild(dots);
            }
        }
        
        // 페이지 번호 버튼들 생성
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `page-number ${i === this.requestsCurrentPage ? 'active' : ''}`;
            pageBtn.addEventListener('click', () => this.goToRequestsPage(i));
            pageNumbers.appendChild(pageBtn);
        }
        
        // 마지막 페이지가 끝 페이지가 아니면 "..." 표시
        if (endPage < this.requestsTotalPages) {
            if (endPage < this.requestsTotalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'page-dots';
                pageNumbers.appendChild(dots);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.textContent = this.requestsTotalPages;
            lastPageBtn.className = 'page-number';
            lastPageBtn.addEventListener('click', () => this.goToRequestsPage(this.requestsTotalPages));
            pageNumbers.appendChild(lastPageBtn);
        }
    }
    
    // 신청 내역 페이지 이동
    goToRequestsPage(page) {
        if (page < 1 || page > this.requestsTotalPages || page === this.requestsCurrentPage) return;
        this.requestsCurrentPage = page;
        this.loadMyRequests();
    }

    // 월별 연차 사용 차트 로드
    loadMonthlyChart() {
        if (!this.currentUser) return;

        const currentYear = new Date().getFullYear();
        const monthlyData = this.getMonthlyLeaveData(this.currentUser.id, currentYear);
        const welfareData = this.getMonthlyWelfareData(this.currentUser.id, currentYear);
        
        const container = document.getElementById('monthly-chart');
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                       '7월', '8월', '9월', '10월', '11월', '12월'];
        
        const maxDays = Math.max(...monthlyData, ...welfareData, 1); // 최대값 계산 (0으로 나누기 방지)
        
        // 전체 최대값 계산 (스케일링용)
        const allMonthlyTotals = monthlyData.map((days, index) => days + (welfareData[index] || 0));
        const maxTotalDays = Math.max(...allMonthlyTotals, 1);
        
        container.innerHTML = monthlyData.map((days, index) => {
            const welfareDays = welfareData[index] || 0;
            const totalDays = days + welfareDays;
            
            // 모든 월에 대해 막대 표시 (0일인 경우도 얇은 막대로 표시)
            
            // 막대가 있는 경우 세로로 2개 막대를 나란히 표시
            // 각 막대의 높이를 픽셀 단위로 계산 (최대 높이 80px 기준)
            const maxHeight = 80; // 최대 높이 80px
            const annualHeight = days > 0 ? (days / maxTotalDays) * maxHeight : 3;
            const welfareHeight = welfareDays > 0 ? (welfareDays / maxTotalDays) * maxHeight : 3;
            
            // 디버깅을 위한 콘솔 로그
            console.log(`월 ${index + 1}: 법정연차 ${days}일 (높이: ${annualHeight}px), 복지휴가 ${welfareDays}일 (높이: ${welfareHeight}px), 최대값: ${maxTotalDays}`);
            
            return `
                <div class="month-group" data-month="${index + 1}" data-year="${currentYear}">
                    <div class="month-chart-area">
                        <div class="month-bars-container">
                            <div class="month-bar-wrapper">
                                <div class="month-bar annual-bar" style="height: ${annualHeight}px !important; min-height: ${annualHeight}px !important;" title="법정 연차: ${days}일"></div>
                                <div class="bar-value ${days === 0 ? 'zero-value' : ''}">${days}일</div>
                            </div>
                            <div class="month-bar-wrapper">
                                <div class="month-bar welfare-bar" style="height: ${welfareHeight}px !important; min-height: ${welfareHeight}px !important;" title="복지 휴가: ${welfareDays}일"></div>
                                <div class="bar-value ${welfareDays === 0 ? 'zero-value' : ''}">${welfareDays}일</div>
                            </div>
                        </div>
                    </div>
                    <div class="month-label">${months[index]}</div>
                </div>
            `;
        }).join('');

        // 월별 차트 클릭 이벤트 추가
        container.querySelectorAll('.month-group').forEach(group => {
            group.addEventListener('click', () => {
                const month = parseInt(group.getAttribute('data-month'));
                const year = parseInt(group.getAttribute('data-year'));
                this.showMonthlyDetail(month, year);
            });
        });
    }

    // 월별 연차 사용 데이터 계산
    getMonthlyLeaveData(userId, year) {
        const monthlyData = new Array(12).fill(0);
        
        // 현재 사용자와 연결된 직원 정보 찾기
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        
        // 사용자의 법정연차 신청만 필터링 (복지휴가 제외)
        const userRequests = this.dataManager.leaveRequests.filter(request => {
            const requestStart = new Date(request.startDate);
            const requestEnd = new Date(request.endDate);
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31);
            
            const belongsToUser = (request.employeeId === userId) || (employeeId !== null && request.employeeId === employeeId);
            const isApproved = request.status === 'approved';
            const isStatutoryLeave = !request.leaveType || !request.leaveType.startsWith('welfare-');
            
            // 해당 연도와 겹치는 연차인지 확인 (더 정확한 날짜 비교)
            const overlapsWithYear = requestStart <= yearEnd && requestEnd >= yearStart;
            
            return belongsToUser && 
                   overlapsWithYear && 
                   isApproved &&
                   isStatutoryLeave;
        });
        
        // 각 월별로 연차 일수 계산
        userRequests.forEach(request => {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            
            // 해당 월에 연차가 포함되는지 확인하고 일수 추가
            for (let month = 0; month < 12; month++) {
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999); // 해당 월의 마지막 날 23:59:59
                
                // 연차 기간이 해당 월과 겹치는지 확인
                if (startDate <= monthEnd && endDate >= monthStart) {
                    // 겹치는 일수 계산
                    const overlapStart = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
                    const overlapEnd = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));
                    let overlapDays = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                    
                    // 반차인지 확인하여 올바른 일수 계산
                    if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                        overlapDays = 0.5;
                    }
                    
                    monthlyData[month] += overlapDays;
                }
            }
        });
        return monthlyData;
    }

    // 월별 복지 휴가 사용 데이터 계산
    getMonthlyWelfareData(userId, year) {
        const monthlyData = new Array(12).fill(0);
        
        // 현재 사용자와 연결된 직원 정보 찾기
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        
        // 사용자의 복지 휴가 신청만 필터링 (해당 연도와 겹치는 모든 복지 휴가 포함)
        const userWelfareRequests = this.dataManager.leaveRequests.filter(request => {
            const requestStart = new Date(request.startDate);
            const requestEnd = new Date(request.endDate);
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31);
            
            const belongsToUser = (request.employeeId === userId) || (employeeId !== null && request.employeeId === employeeId);
            const isWelfare = request.leaveType && request.leaveType.startsWith('welfare-');
            const isApproved = request.status === 'approved';
            
            // 해당 연도와 겹치는 복지 휴가인지 확인
            const overlapsWithYear = requestStart <= yearEnd && requestEnd >= yearStart;
            
            return belongsToUser && 
                   isWelfare && 
                   overlapsWithYear && 
                   isApproved;
        });
        
        // 각 월별로 복지 휴가 일수 계산
        userWelfareRequests.forEach(request => {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            
            // 해당 월에 복지 휴가가 포함되는지 확인하고 일수 추가
            for (let month = 0; month < 12; month++) {
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
                
                // 복지 휴가 기간이 해당 월과 겹치는지 확인
                if (startDate <= monthEnd && endDate >= monthStart) {
                    // 겹치는 일수 계산
                    const overlapStart = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
                    const overlapEnd = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));
                    let overlapDays = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                    
                    // 반차인지 확인하여 올바른 일수 계산
                    if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                        overlapDays = 0.5;
                    }
                    
                    monthlyData[month] += overlapDays;
                }
            }
        });
        return monthlyData;
    }

    // 월별 상세 모달 표시
    showMonthlyDetail(month, year) {
        if (!this.currentUser) return;
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999); // 해당 월의 마지막 날 23:59:59

        // 전체 연차 신청 목록 (필터링 전)
        this.monthlyDetailData = (this.dataManager.leaveRequests || [])
            .filter(r => {
                const belongs = (r.employeeId === this.currentUser.id) || (employeeId !== null && r.employeeId === employeeId);
                if (!belongs) return false;
                const rs = new Date(r.startDate); const re = new Date(r.endDate);
                // 해당 월과 겹치는 모든 연차 포함 (월을 넘나드는 연차도 포함)
                const overlaps = rs <= end && re >= start;
                return overlaps;
            })
            .map(r => {
                const rs = new Date(r.startDate); const re = new Date(r.endDate);
                const s = rs < start ? start : rs; const e = re > end ? end : re;
                const daysInMonth = Math.floor((e - s) / (1000*60*60*24)) + 1;
                return { ...r, daysInMonth };
            })
            .sort((a,b) => new Date(a.startDate) - new Date(b.startDate));

        // 올바른 모달 요소들 사용
        const modal = document.getElementById('monthly-detail-modal');
        const title = document.getElementById('monthly-detail-title');
        const totalDaysEl = document.getElementById('monthly-total-days');
        const requestCountEl = document.getElementById('monthly-request-count');
        const requestsList = document.getElementById('monthly-requests-list');

        if (!modal || !title || !totalDaysEl || !requestCountEl || !requestsList) {
            console.error('월별 상세 모달 요소를 찾을 수 없습니다');
            return;
        }

        // 모달 제목 설정
        title.textContent = `${year}년 ${month}월 연차 사용 내역`;

        // 필터 버튼 이벤트 리스너 설정
        this.setupMonthlyDetailFilters();

        // 초기 데이터 표시 (전체)
        this.updateMonthlyDetailDisplay('all');

        // 모달 표시
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 월별 상세 모달 필터 설정
    setupMonthlyDetailFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 모든 버튼에서 active 클래스 제거
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');
                
                // 필터 적용
                const status = button.getAttribute('data-status');
                this.updateMonthlyDetailDisplay(status);
            });
        });
    }

    // 월별 상세 모달 표시 업데이트
    updateMonthlyDetailDisplay(filterStatus) {
        if (!this.monthlyDetailData) return;

        const totalDaysEl = document.getElementById('monthly-total-days');
        const requestCountEl = document.getElementById('monthly-request-count');
        const requestsList = document.getElementById('monthly-requests-list');

        // 필터링된 목록
        let filteredList = this.monthlyDetailData;
        if (filterStatus !== 'all') {
            filteredList = this.monthlyDetailData.filter(request => request.status === filterStatus);
        }

        // 요약 정보 업데이트 (깔끔한 표시)
        const approvedRequests = filteredList.filter(request => request.status === 'approved');
        const annualRequests = approvedRequests.filter(request => !request.leaveType || !request.leaveType.startsWith('welfare-'));
        const welfareRequests = approvedRequests.filter(request => request.leaveType && request.leaveType.startsWith('welfare-'));
        
        const annualDays = annualRequests.reduce((sum, request) => {
            // 반차인지 확인하여 올바른 일수 계산
            let actualDays = request.daysInMonth || 0;
            if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                actualDays = 0.5;
            }
            return sum + actualDays;
        }, 0);
        const welfareDays = welfareRequests.reduce((sum, request) => {
            // 반차인지 확인하여 올바른 일수 계산
            let actualDays = request.daysInMonth || 0;
            if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                actualDays = 0.5;
            }
            return sum + actualDays;
        }, 0);
        const totalDays = annualDays + welfareDays;
        
        // 깔끔한 요약 표시 (신청건수 포함)
        if (totalDays > 0) {
            totalDaysEl.innerHTML = `
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">신청건수</span>
                        <span class="stat-value count">${filteredList.length}건</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">총 사용일수</span>
                        <span class="stat-value">${totalDays}일</span>
                    </div>
                    ${annualDays > 0 ? `
                    <div class="stat-item sub-item">
                        <span class="stat-label">
                            <span class="sub-indicator">•</span>법정연차
                        </span>
                        <span class="stat-value annual">${annualDays}일</span>
                    </div>
                    ` : ''}
                    ${welfareDays > 0 ? `
                    <div class="stat-item sub-item">
                        <span class="stat-label">
                            <span class="sub-indicator">•</span>복지휴가
                        </span>
                        <span class="stat-value welfare">${welfareDays}일</span>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            totalDaysEl.innerHTML = `
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">신청건수</span>
                        <span class="stat-value count">${filteredList.length}건</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">총 사용일수</span>
                        <span class="stat-value">0일</span>
                    </div>
                </div>
            `;
        }
        
        // 신청건수 요소 숨기기 (이미 위에서 표시됨)
        if (requestCountEl) {
            requestCountEl.style.display = 'none';
        }

        // 연차 신청 내역 표시
        if (filteredList.length === 0) {
            const statusText = filterStatus === 'all' ? '' : ` (${this.getStatusText(filterStatus)})`;
            requestsList.innerHTML = `
                <div class="no-requests">
                    <i class="fas fa-calendar-times"></i>
                    <p>해당 상태의 연차 신청이 없습니다${statusText}.</p>
                </div>
            `;
        } else {
            requestsList.innerHTML = filteredList.map(request => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                const isSameDay = startDate.getTime() === endDate.getTime();
                const period = isSameDay ? startDate.toLocaleDateString() : `${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`;
                
                // 사유 표시 텍스트 생성 (reasonType 기반, 비어있으면 reason 사용)
                const getDisplayReason = (req) => {
                    const map = {
                        'personal': '개인사정',
                        'sick': '병가',
                        'other': '기타',
                        'vacation': '휴가',
                        'family': '가족사정',
                        'half_morning': '반차(오전)',
                        'half_afternoon': '반차(오후)'
                    };
                    const byType = map[String(req.reasonType || '').trim()] || '';
                    const base = (req.reason && req.reason !== 'null' && req.reason !== 'undefined') ? req.reason : '';
                    // 둘 다 있으면 "사유 - 상세" 형태로 합성
                    if (byType && base) return `${byType} - ${base}`;
                    return byType || base || '-';
                };
                
                const reason = getDisplayReason(request);
                const statusText = this.getStatusText(request.status) || '알수없음';
                const daysInMonth = request.daysInMonth || 0;
                const totalDays = request.days || 0;
                const status = request.status || 'unknown';
                
                // 휴가 유형에 따른 색상 구분
                const isWelfare = request.leaveType && request.leaveType.startsWith('welfare-');
                const typeClass = isWelfare ? 'welfare' : 'annual';
                
                return `
                    <div class="monthly-request-item ${typeClass}">
                        <div class="request-main">
                            <div class="request-date">${period}</div>
                            <div class="request-status ${status}">${statusText}</div>
                        </div>
                        <div class="request-info">
                            <div class="request-type">${reason}</div>
                            <div class="request-days">${this.getDisplayDays(request)}일</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    closeMonthModal() {
        const modal = document.getElementById('monthly-detail-modal');
        if (modal) modal.style.display = 'none';
        // overflow 속성을 완전히 제거
        document.body.style.removeProperty('overflow');
        if (this._escMonthlyHandler) {
            window.removeEventListener('keydown', this._escMonthlyHandler);
            this._escMonthlyHandler = null;
        }
    }

    // 연차 계획 통계 로드
    loadPlanningStats() {
        if (!this.currentUser) return;

        const userLeaveData = this.getUserLeaveData(this.currentUser.id);
        const currentMonth = new Date().getMonth();
        const monthsLeft = 12 - currentMonth;
        
        // 계획된 연차 (대기 중인 연차)
        document.getElementById('planned-days').textContent = `${userLeaveData.pending}일`;
        
        // 만료 예정 연차 (12월까지 사용하지 않으면 만료)
        const expiringDays = Math.max(0, userLeaveData.remaining);
        document.getElementById('expiring-days').textContent = `${expiringDays}일`;
        
        // 연차 사용 팁 업데이트
        this.updatePlanningTips(userLeaveData, monthsLeft);
    }

    // 연차 사용 패턴: 유형별 집계(승인된 건 기준)
    loadUsagePattern() {
        if (!this.currentUser) return;
        const user = this.currentUser;
        const employee = this.dataManager.employees.find(emp => emp.email === user.email);
        const employeeId = employee ? employee.id : null;
        const currentYear = new Date().getFullYear();

        const requests = (this.dataManager.leaveRequests || [])
            .filter(r => {
                const belongs = (r.employeeId === user.id) || (employeeId !== null && r.employeeId === employeeId);
                return belongs && r.status === 'approved' && new Date(r.startDate).getFullYear() === currentYear;
            });

        console.log('연차 사용 패턴 - 승인된 연차 신청:', requests);

        const byType = { vacation: 0, personal: 0, sick: 0, other: 0 };
        let totalDays = 0;
        
        requests.forEach(r => {
            // reasonType 우선 분류 (정확)
            const rt = String(r.reasonType || '').toLowerCase();
            if (rt.includes('personal')) byType.personal += (r.days || 0);
            else if (rt.includes('sick')) byType.sick += (r.days || 0);
            else if (rt.includes('vacation')) byType.vacation += (r.days || 0);
            else if (rt.includes('family')) byType.other += (r.days || 0); // 가족사정은 기타 그룹으로
            else if (rt.includes('other')) byType.other += (r.days || 0);
            else {
                // 폴백: 기존 leaveType/text에서 추정
                const lt = String(r.leaveType || r.type || '').toLowerCase();
                const reason = String(r.reason || '').toLowerCase();
                if (lt.includes('personal') || reason.includes('개인사정')) byType.personal += (r.days || 0);
                else if (lt.includes('sick') || reason.includes('병가')) byType.sick += (r.days || 0);
                else if (lt.includes('vacation') || reason.includes('휴가')) byType.vacation += (r.days || 0);
                else byType.other += (r.days || 0);
            }
            totalDays += (r.days || 0);
        });
        
        console.log('연차 사용 패턴 집계:', byType, '총 일수:', totalDays);
        
        if (totalDays === 0) totalDays = 1; // 0 나누기 방지

        const percent = type => Math.round((byType[type] / totalDays) * 100);
        const setBar = (id, value) => { 
            const el = document.getElementById(id); 
            if (el) el.style.width = `${value}%`; 
            const txt = document.getElementById(`${id}-val`); 
            if (txt) txt.textContent = `${value}%`; 
        };

        setBar('bar-vacation', percent('vacation'));
        setBar('bar-personal', percent('personal'));
        setBar('bar-other', percent('other'));
        setBar('bar-sick', percent('sick'));
    }

    // 연차 사용 팁 업데이트
    updatePlanningTips(userLeaveData, monthsLeft) {
        const tipsContainer = document.querySelector('.planning-tips ul');
        if (!tipsContainer) return;

        const avgDaysPerMonth = monthsLeft > 0 ? 
            Math.round((userLeaveData.remaining / monthsLeft) * 10) / 10 : 0;

        tipsContainer.innerHTML = `
            <li>연말까지 <strong>${userLeaveData.remaining}일</strong>의 연차가 남아있습니다</li>
            <li>월 평균 <strong>${avgDaysPerMonth}일</strong>씩 사용하시면 됩니다</li>
            <li>연차는 <strong>12월 31일</strong>까지 사용하셔야 합니다</li>
        `;
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

    // 표시용 일수 계산 (반차 고려)
    getDisplayDays(request) {
        // 반차인지 확인하여 올바른 일수 반환
        if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
            return 0.5;
        }
        return request.days || 0;
    }

    // 연차 유형 텍스트 변환
    getLeaveTypeText(leaveType) {
        const typeMap = {
            'personal': '개인사정',
            'sick': '병가',
            'half-morning': '반차 (오전)',
            'half-afternoon': '반차 (오후)',
            'other-statutory': '기타 (법정연차)',
            'welfare-vacation': '복지휴가',
            'welfare-half-morning': '복지반차 (오전)',
            'welfare-half-afternoon': '복지반차 (오후)',
            'other-welfare': '기타 (복지휴가)',
            // 기존 'other' 값도 호환성을 위해 유지
            'other': '기타'
        };
        return typeMap[leaveType] || leaveType;
    }

    // 안전한 텍스트 반환(원시 데이터가 'undefined'/'null' 문자열일 때 대비)
    safeText(value, fallback = '') {
        if (value === undefined || value === null) return fallback;
        const str = String(value).trim();
        if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') {
            return fallback;
        }
        return str;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 탭 네비게이션 이벤트
        this.setupTabNavigation();
        
        // 연도 선택기 이벤트
        const yearSelector = document.getElementById('year-selector');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                this.loadMonthlyChartForYear(parseInt(e.target.value));
            });
        }

        // 신청 내역 연도 선택기 이벤트
        const reqYearSelector = document.getElementById('requests-year-selector');
        if (reqYearSelector) {
            reqYearSelector.addEventListener('change', () => {
                this.requestsCurrentPage = 1; // 연도 변경 시 첫 페이지로 이동
                this.loadMyRequests();
            });
            // 초기값을 현재 연도로 맞추기
            const currentYear = new Date().getFullYear();
            const option = Array.from(reqYearSelector.options).find(o => parseInt(o.value,10) === currentYear);
            if (option) reqYearSelector.value = String(currentYear);
        }

        // 신청 내역 항목 갯수 설정 이벤트
        const requestsItemsPerPage = document.getElementById('requests-items-per-page');
        if (requestsItemsPerPage) {
            requestsItemsPerPage.addEventListener('change', () => {
                this.requestsItemsPerPage = parseInt(requestsItemsPerPage.value);
                this.requestsCurrentPage = 1; // 항목 갯수 변경 시 첫 페이지로 이동
                this.loadMyRequests();
            });
        }

        // 신청 내역 상태 필터 이벤트
        this.setupRequestsStatusFilters();
        
        // 신청 내역 휴가 유형 필터 이벤트
        this.setupRequestsTypeFilters();

        // 신청 내역 페이지네이션 이벤트
        const requestsPrevBtn = document.getElementById('requests-prev-page');
        const requestsNextBtn = document.getElementById('requests-next-page');
        if (requestsPrevBtn) {
            requestsPrevBtn.addEventListener('click', () => this.goToRequestsPage(this.requestsCurrentPage - 1));
        }
        if (requestsNextBtn) {
            requestsNextBtn.addEventListener('click', () => this.goToRequestsPage(this.requestsCurrentPage + 1));
        }

        // 모달 외부 클릭 시 닫기
        const pendingModal = document.getElementById('pending-modal');
        if (pendingModal) {
            pendingModal.addEventListener('click', (e) => {
                if (e.target.id === 'pending-modal') {
                    this.closeModal();
                }
            });
        }

        // 월별 상세 모달 외부 클릭 시 닫기
        const monthlyDetailModal = document.getElementById('monthly-detail-modal');
        if (monthlyDetailModal) {
            monthlyDetailModal.addEventListener('click', (e) => {
                if (e.target.id === 'monthly-detail-modal') {
                    this.closeMonthlyDetailModal();
                }
            });
        }

        // 연차 신청 폼 이벤트
        this.setupRequestFormEvents();

        // DataManager 데이터가 바뀌면 현황을 즉시 갱신
        if (typeof window !== 'undefined') {
            window.addEventListener('dm:updated', (e) => {
                if (!this.currentUser) this.getCurrentUser();
                this.updateCalculationCriteria();
                this.loadPersonalLeaveStats();
                this.loadMyRequests();
                this.loadMonthlyChart();
            });
        }
    }

    // 탭 네비게이션 설정
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // 모든 탭 버튼에서 active 클래스 제거
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');
                
                // 모든 탭 콘텐츠에서 active 클래스 제거
                tabContents.forEach(content => content.classList.remove('active'));
                // 해당 탭 콘텐츠에 active 클래스 추가
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // 연차 신청 폼 이벤트 설정
    setupRequestFormEvents() {
        const form = document.getElementById('leave-request-form');
        if (!form) return;

        // 폼 제출 이벤트
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.submitLeaveRequest();
        });

        // 날짜 변경 시 일수 자동 계산
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const totalDaysInput = document.getElementById('total-days');
        const leaveTypeSelect = document.getElementById('leave-type');
        const reasonTypeSelect = document.getElementById('reason-type');
        const reasonTextarea = document.getElementById('reason');
        const reasonGroup = reasonTextarea ? reasonTextarea.closest('.form-group') : null;

        // 사유 옵션 정의
        const reasonOptions = {
            'annual': [
                { value: 'personal', text: '개인사정' },
                { value: 'sick', text: '병가' },
                { value: 'other', text: '기타' },
                // 반차는 공통: 오전/오후만 제공
                { value: 'half_morning', text: '반차(오전)' },
                { value: 'half_afternoon', text: '반차(오후)' }
            ],
            'welfare': [
                { value: 'vacation', text: '휴가' },
                { value: 'family', text: '가족사정' },
                { value: 'other', text: '기타' },
                // 반차는 공통: 오전/오후만 제공
                { value: 'half_morning', text: '반차(오전)' },
                { value: 'half_afternoon', text: '반차(오후)' }
            ]
        };

        if (startDateInput && endDateInput && totalDaysInput && leaveTypeSelect && reasonTypeSelect) {
            // 일수 계산 함수 먼저 정의
            const calculateDays = () => {
                const startDate = new Date(startDateInput.value);
                const endDate = new Date(endDateInput.value);
                const reasonType = reasonTypeSelect.value;
                
                if (reasonType && (reasonType.includes('half_morning') || reasonType.includes('half_afternoon'))) {
                    // 반차 선택 시
                    totalDaysInput.value = 0.5;
                    if (startDateInput.value) {
                        endDateInput.value = startDateInput.value;
                        endDateInput.disabled = true;
                        endDateInput.style.background = '#f8f9fa';
                        endDateInput.style.color = '#6c757d';
                    }
                } else {
                    // 일반 연차 선택 시
                    endDateInput.disabled = false;
                    endDateInput.style.background = '';
                    endDateInput.style.color = '';
                    
                    if (startDate && endDate && startDate <= endDate) {
                        const timeDiff = endDate.getTime() - startDate.getTime();
                        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                        totalDaysInput.value = daysDiff;
                    } else {
                        totalDaysInput.value = '';
                    }
                }
            };

            startDateInput.addEventListener('change', (e) => {
                e.stopPropagation();
                calculateDays();
            });
            endDateInput.addEventListener('change', (e) => {
                e.stopPropagation();
                calculateDays();
            });
            leaveTypeSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                updateReasonOptions();
            });
            reasonTypeSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                calculateDays();
            });
        }

        // 사유 옵션 업데이트 함수 정의
        const updateReasonOptions = () => {
            const selectedType = leaveTypeSelect.value;
            reasonTypeSelect.innerHTML = '<option value="">사유를 선택하세요</option>';
            
            if (selectedType && reasonOptions[selectedType]) {
                reasonOptions[selectedType].forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.text;
                    reasonTypeSelect.appendChild(optionElement);
                });
            }
            calculateDays();
        };

        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        if (startDateInput) {
            startDateInput.min = today;
        }
        if (endDateInput) {
            endDateInput.min = today;
        }

        // 시작일과 종료일 간 유효성 검증
        const validateDates = () => {
            if (!startDateInput || !endDateInput) return;
            
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            
            if (startDateInput.value && endDateInput.value) {
                if (endDate < startDate) {
                    // 종료일이 시작일보다 이전인 경우 시작일로 설정
                    endDateInput.value = startDateInput.value;
                    endDateInput.style.borderColor = '#dc3545';
                    endDateInput.style.backgroundColor = '#fff5f5';
                    
                    // 3초 후 스타일 복원
                    setTimeout(() => {
                        endDateInput.style.borderColor = '';
                        endDateInput.style.backgroundColor = '';
                    }, 3000);
                } else {
                    endDateInput.style.borderColor = '';
                    endDateInput.style.backgroundColor = '';
                }
            }
        };

        // 시작일 변경 시 종료일 최소값 업데이트
        if (startDateInput) {
            startDateInput.addEventListener('change', (e) => {
                e.stopPropagation();
                if (startDateInput.value && endDateInput) {
                    endDateInput.min = startDateInput.value;
                    validateDates();
                }
            });
        }

        // 종료일 변경 시 유효성 검증
        if (endDateInput) {
            endDateInput.addEventListener('change', (e) => {
                e.stopPropagation();
                validateDates();
            });
        }

        // 사유가 '기타'일 때만 상세 사유 입력 가능(사유 입력창 표시/숨김)
        const toggleReason = () => {
            if (!reasonTypeSelect || !reasonTextarea || !reasonGroup) return;
            const isOther = reasonTypeSelect.value === 'other';
            reasonGroup.style.display = isOther ? '' : 'none';
            reasonTextarea.disabled = !isOther;
            reasonTextarea.required = isOther;
            if (!isOther) {
                // 기타가 아닌 경우 해당 유형을 사유에 자동 입력
                reasonTextarea.value = '';
            }
        };
        if (leaveTypeSelect && reasonTextarea && reasonGroup) {
            toggleReason();
            leaveTypeSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleReason();
            });
        }
        
        // 사유 타입 변경 시에도 상세 사유 필드 토글
        if (reasonTypeSelect && reasonTextarea && reasonGroup) {
            reasonTypeSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleReason();
            });
        }

        // 폼 전체 클릭 이벤트 버블링 방지
        form.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 폼 내 모든 입력 요소에 클릭 이벤트 버블링 방지
        const formElements = form.querySelectorAll('input, select, textarea, button');
        formElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            element.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
            element.addEventListener('blur', (e) => {
                e.stopPropagation();
            });
        });
    }

    // 특정 연도의 월별 차트 로드
    loadMonthlyChartForYear(year) {
        if (!this.currentUser) return;

        const monthlyData = this.getMonthlyLeaveData(this.currentUser.id, year);
        const welfareData = this.getMonthlyWelfareData(this.currentUser.id, year);
        
        const container = document.getElementById('monthly-chart');
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                       '7월', '8월', '9월', '10월', '11월', '12월'];
        
        const maxDays = Math.max(...monthlyData, ...welfareData, 1);
        
        // 전체 최대값 계산 (스케일링용)
        const allMonthlyTotals = monthlyData.map((days, index) => days + (welfareData[index] || 0));
        const maxTotalDays = Math.max(...allMonthlyTotals, 1);
        
        container.innerHTML = monthlyData.map((days, index) => {
            const welfareDays = welfareData[index] || 0;
            const totalDays = days + welfareDays;
            
            // 모든 월에 대해 막대 표시 (0일인 경우도 얇은 막대로 표시)
            
            // 막대가 있는 경우 세로로 2개 막대를 나란히 표시
            // 각 막대의 높이를 픽셀 단위로 계산 (최대 높이 80px 기준)
            const maxHeight = 80; // 최대 높이 80px
            const annualHeight = days > 0 ? (days / maxTotalDays) * maxHeight : 3;
            const welfareHeight = welfareDays > 0 ? (welfareDays / maxTotalDays) * maxHeight : 3;
            
            // 디버깅을 위한 콘솔 로그
            console.log(`월 ${index + 1}: 법정연차 ${days}일 (높이: ${annualHeight}px), 복지휴가 ${welfareDays}일 (높이: ${welfareHeight}px), 최대값: ${maxTotalDays}`);
            
            return `
                <div class="month-group" data-month="${index + 1}" data-year="${year}">
                    <div class="month-chart-area">
                        <div class="month-bars-container">
                            <div class="month-bar-wrapper">
                                <div class="month-bar annual-bar" style="height: ${annualHeight}px !important; min-height: ${annualHeight}px !important;" title="법정 연차: ${days}일"></div>
                                <div class="bar-value ${days === 0 ? 'zero-value' : ''}">${days}일</div>
                            </div>
                            <div class="month-bar-wrapper">
                                <div class="month-bar welfare-bar" style="height: ${welfareHeight}px !important; min-height: ${welfareHeight}px !important;" title="복지 휴가: ${welfareDays}일"></div>
                                <div class="bar-value ${welfareDays === 0 ? 'zero-value' : ''}">${welfareDays}일</div>
                            </div>
                        </div>
                    </div>
                    <div class="month-label">${months[index]}</div>
                </div>
            `;
        }).join('');

        // 클릭 이벤트 다시 바인딩
        container.querySelectorAll('.month-group').forEach(group => {
            group.addEventListener('click', () => {
                const month = parseInt(group.getAttribute('data-month'));
                const yr = parseInt(group.getAttribute('data-year')) || year;
                this.showMonthlyDetail(month, yr);
            });
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
                            <strong>일수:</strong> ${this.getDisplayDays(request)}일
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
        document.body.style.overflow = 'hidden';
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
        document.body.style.removeProperty('overflow');
    }

    // 데이터 내보내기
    exportData() {
        this.dataManager.exportData();
        this.showNotification('데이터가 성공적으로 내보내졌습니다.', 'success');
    }

    // 연차 신청 섹션으로 스크롤
    scrollToRequestForm() {
        const section = document.querySelector('.leave-request-section');
        if (!section) return;

        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // 섹션에 포커스 효과 추가
        section.style.transform = 'scale(1.02)';
        setTimeout(() => {
            section.style.transform = 'scale(1)';
        }, 300);
    }

    // 연차 활동 섹션으로 스크롤 (탭 포함)
    scrollToActivitySection() {
        const section = document.querySelector('.leave-activity-section');
        if (!section) return;

        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // 섹션에 포커스 효과 추가
        section.style.transform = 'scale(1.02)';
        setTimeout(() => {
            section.style.transform = 'scale(1)';
        }, 300);
    }


    // 해당 월의 연차 신청 내역 가져오기 (모든 신청 건, 월을 넘나드는 연차도 포함)
    getMonthlyRequests(month, year) {
        return this.dataManager.leaveRequests.filter(request => {
            const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
            const employeeId = employee ? employee.id : null;
            if (!(request.employeeId === this.currentUser.id || (employeeId !== null && request.employeeId === employeeId))) return false;
            
            const requestStart = new Date(request.startDate);
            const requestEnd = new Date(request.endDate);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            
            // 해당 월과 겹치는 모든 연차 포함
            return requestStart <= monthEnd && requestEnd >= monthStart;
        });
    }

    // 월별 상세 모달 닫기
    closeMonthlyDetailModal() {
        const modal = document.getElementById('monthly-detail-modal');
        modal.style.display = 'none';
        document.body.style.removeProperty('overflow');
    }

    // 신청 내역 상태 필터 설정
    setupRequestsStatusFilters() {
        const filterButtons = document.querySelectorAll('#requests-tab .status-filter-buttons .filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 모든 버튼에서 active 클래스 제거
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');
                
                // 필터 적용
                const status = button.getAttribute('data-status');
                this.requestsStatusFilter = status;
                this.requestsCurrentPage = 1; // 필터 변경 시 첫 페이지로 이동
                this.loadMyRequests();
            });
        });
    }

    // 신청 내역 휴가 유형 필터 설정
    setupRequestsTypeFilters() {
        const typeFilterButtons = document.querySelectorAll('#requests-tab .type-filter-buttons .filter-btn');
        typeFilterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 모든 버튼에서 active 클래스 제거
                typeFilterButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');
                
                // 필터 적용
                const type = button.getAttribute('data-type');
                this.requestsTypeFilter = type;
                this.requestsCurrentPage = 1; // 필터 변경 시 첫 페이지로 이동
                this.loadMyRequests();
            });
        });
    }

    // 연차 신청 제출
    submitLeaveRequest() {
        if (!this.currentUser) {
            this.showNotification('로그인이 필요합니다.', 'error');
            return;
        }

        const form = document.getElementById('leave-request-form');
        const formData = new FormData(form);
        
        // 폼 데이터 검증
        const startDate = formData.get('startDate');
        let endDate = formData.get('endDate');
        const leaveType = formData.get('leaveType');
        const reasonType = formData.get('reasonType');
        
        // 종료일이 없으면 시작일과 동일하게 설정 (반차의 경우)
        if (!endDate && startDate) {
            endDate = startDate;
        }
        
        // 최종 연차 유형 결정
        let finalLeaveType = '';
        if (leaveType === 'annual') {
            finalLeaveType = '법정연차';
        } else if (leaveType === 'welfare') {
            finalLeaveType = '복지휴가';
        }
        
        // 디버깅을 위한 로그
        console.log('연차 신청 데이터:', { startDate, endDate, leaveType, reasonType, finalLeaveType, totalDays: formData.get('totalDays') });
        const totalDays = parseFloat(formData.get('totalDays'));

        // 각 조건을 개별적으로 확인
        console.log('검증 조건들:', {
            startDate: !!startDate,
            endDate: !!endDate,
            leaveType: !!leaveType,
            reasonType: !!reasonType,
            totalDaysValid: !isNaN(totalDays) && totalDays > 0,
            totalDaysValue: totalDays
        });

        // 모든 필수 필드 검증
        if (!startDate || !endDate || !leaveType || !reasonType || isNaN(totalDays) || totalDays <= 0) {
            console.log('검증 실패 - 오류 메시지 표시');
            this.showNotification('모든 필수 항목을 입력해주세요.', 'error');
            return;
        }
        
        // 기타 사유 선택 시 상세 사유 필수 검증
        if (reasonType === 'other') {
            const reasonText = formData.get('reason');
            if (!reasonText || reasonText.trim() === '') {
                this.showNotification('기타 사유를 선택하셨습니다. 상세 사유를 입력해주세요.', 'error');
                return;
            }
        }
        
        // 주말 및 공휴일 검증
        if (this.isWeekendOrHoliday(startDate)) {
            this.showNotification('시작일이 주말 또는 공휴일입니다. 평일을 선택해주세요.', 'error');
            return;
        }
        
        if (this.isWeekendOrHoliday(endDate)) {
            this.showNotification('종료일이 주말 또는 공휴일입니다. 평일을 선택해주세요.', 'error');
            return;
        }

        // 날짜 유효성 검사
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            this.showNotification('시작일은 오늘 이후여야 합니다.', 'error');
            return;
        }

        if (end < start) {
            this.showNotification('종료일은 시작일 이후여야 합니다.', 'error');
            return;
        }

        // 연차 일수 제한 검사 (복지휴가와 법정연차 구분)
        if (leaveType === 'welfare') {
            // 복지휴가 신청 시 복지휴가 잔여일수로 체크
            const welfareData = this.getUserWelfareData(this.currentUser.id);
            if (totalDays > welfareData.remaining) {
                this.showNotification(`남은 복지휴가(${welfareData.remaining}일)보다 많은 일수를 신청할 수 없습니다.`, 'error');
                return;
            }
        } else {
            // 법정연차 신청 시 법정연차 잔여일수로 체크
            const userLeaveData = this.getUserLeaveData(this.currentUser.id);
            if (totalDays > userLeaveData.remaining) {
                this.showNotification(`남은 연차(${userLeaveData.remaining}일)보다 많은 일수를 신청할 수 없습니다.`, 'error');
                return;
            }
        }

        // 기간 중복 검증: 본인 신청 중 승인/대기와 겹치면 금지
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        const belongsToMe = (req) => req.employeeId === this.currentUser.id || (employeeId !== null && req.employeeId === employeeId);
        const overlaps = (aStart, aEnd, bStart, bEnd) => {
            const as = new Date(aStart); const ae = new Date(aEnd);
            const bs = new Date(bStart); const be = new Date(bEnd);
            return as <= be && ae >= bs;
        };
        const hasOverlap = (this.dataManager.leaveRequests || []).some(req =>
            belongsToMe(req) && req.status !== 'rejected' && overlaps(startDate, endDate, req.startDate, req.endDate)
        );
        if (hasOverlap) {
            this.showNotification('이미 신청된 기간과 겹칩니다. 기간을 조정해주세요.', 'error');
            return;
        }

        // 연차 신청 데이터 생성 (직원 레코드 기준 ID 사용)
        const leaveRequest = {
            id: Date.now().toString(),
            employeeId: employee ? employee.id : this.currentUser.id,
            employeeName: employee ? (employee.name || this.currentUser.name) : this.currentUser.name,
            startDate: startDate,
            endDate: endDate,
            days: totalDays,
            leaveType: finalLeaveType,
            reasonType: reasonType,
            reason: formData.get('reason'),
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0],
            type: reasonType && (reasonType.includes('half_morning') || reasonType.includes('half_afternoon')) ? '반차' : '휴가'
        };

        // 데이터 매니저에 연차 신청 추가
        this.dataManager.addLeaveRequest(leaveRequest);

        // 폼 초기화
        form.reset();
        document.getElementById('total-days').value = '';
        const reasonTypeSelect = document.getElementById('reason-type');
        if (reasonTypeSelect) {
            reasonTypeSelect.innerHTML = '<option value="">사유를 선택하세요</option>';
        }

        // 대시보드 새로고침
        this.refreshDashboard();

        // 성공 알림
        this.showNotification('연차 신청이 완료되었습니다.', 'success');
    }

    // 대시보드 새로고침
    refreshDashboard() {
        this.loadPersonalLeaveStats();
        this.loadWelfareLeaveStats();
        this.loadMyRequests();
        this.loadMonthlyChart();
        this.loadPlanningStats();
    }

    // 주말 및 공휴일 검증 함수
    isWeekendOrHoliday(dateString) {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();
        
        // 주말 검증 (토요일: 6, 일요일: 0)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return true;
        }
        
        // 공휴일 검증 (2024년 기준)
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // 2024년 공휴일 목록
        const holidays2024 = [
            '2024-01-01', // 신정
            '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', // 설날 연휴
            '2024-03-01', // 삼일절
            '2024-04-10', // 국회의원선거
            '2024-05-05', // 어린이날
            '2024-05-15', // 부처님오신날
            '2024-06-06', // 현충일
            '2024-08-15', // 광복절
            '2024-09-16', '2024-09-17', '2024-09-18', // 추석 연휴
            '2024-10-03', // 개천절
            '2024-10-09', // 한글날
            '2024-12-25'  // 성탄절
        ];
        
        // 2025년 공휴일 목록
        const holidays2025 = [
            '2025-01-01', // 신정
            '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
            '2025-03-01', // 삼일절
            '2025-05-05', // 어린이날
            '2025-05-12', // 부처님오신날
            '2025-06-06', // 현충일
            '2025-08-15', // 광복절
            '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 추석 연휴
            '2025-10-03', // 개천절
            '2025-10-09', // 한글날
            '2025-12-25'  // 성탄절
        ];
        
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        if (year === 2024) {
            return holidays2024.includes(dateStr);
        } else if (year === 2025) {
            return holidays2025.includes(dateStr);
        }
        
        return false;
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
    if (window.leaveStatus) {
        window.leaveStatus.showPendingRequests();
    }
}

function closeModal() {
    if (window.leaveStatus) {
        window.leaveStatus.closeModal();
    }
}

function exportData() {
    if (window.leaveStatus) {
        window.leaveStatus.exportData();
    }
}

function scrollToRequestForm() {
    if (window.leaveStatus) {
        window.leaveStatus.scrollToRequestForm();
    }
}

function scrollToActivitySection() {
    if (window.leaveStatus) {
        window.leaveStatus.scrollToActivitySection();
    }
}

function closeMonthlyDetailModal() {
    if (window.leaveStatus) {
        window.leaveStatus.closeMonthlyDetailModal();
    }
}

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

// LeaveStatus 인스턴스 생성 (한 번만)
window.addEventListener('DOMContentLoaded', () => {
    if (!window.leaveStatus) {
        window.leaveStatus = new LeaveStatus();
    }
});

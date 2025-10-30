// 통계 페이지 기능
class Statistics {
    constructor() {
        this.dataManager = window.dataManager;
        this.currentUser = getCurrentUser();
        
        // 데이터 변경 시 통계 자동 새로고침
        window.addEventListener('dm:updated', (e) => {
            if (['leaveRequests','employees','branches','settings'].includes(e.detail?.key)) {
                console.log('통계 페이지 - 데이터 변경 감지, 통계 새로고침');
                this.refresh();
            }
        });
        
        this.init();
    }

    // 공통: 현재 필터에 맞는 직원/연차신청 목록 반환
    getFilteredData(options = {}) {
        const year = document.getElementById('year-filter')?.value || new Date().getFullYear().toString();
        const branch = document.getElementById('branch-filter')?.value || 'all';
        const department = document.getElementById('department-filter')?.value || 'all';
        let startDate = document.getElementById('start-date')?.value || '';
        let endDate = document.getElementById('end-date')?.value || '';

        // 연도 전체 집계를 강제하고 싶은 경우(부서별 섹션)
        if (options.yearOnly === true) {
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
        }

        const employees = this.dataManager.employees;
        const normalize = (v) => (v || '').toString().trim().toLowerCase();
        const selBranch = normalize(branch);
        const selDept = normalize(department);

        // 직원 필터
        const filteredEmployees = employees.filter(emp => {
            const b = normalize(emp.branch);
            const d = normalize(emp.department);
            if (branch !== 'all' && b !== selBranch) return false;
            if (department !== 'all' && d !== selDept) return false;
            return true;
        });

        // 신청 필터 + employeeId/userId 혼재 매핑
        const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
        const users = this.dataManager?.users || JSON.parse(usersStorage);
        const employeeById = new Map(this.dataManager.employees.map(e => [e.id, e]));
        const employeeByEmail = new Map(this.dataManager.employees.map(e => [normalize(e.email), e]));
        const userById = new Map(users.map(u => [u.id, u]));

        const filteredRequests = this.dataManager.leaveRequests.filter(req => {
            // 직원 매핑
            let emp = employeeById.get(req.employeeId);
            if (!emp) {
                const user = userById.get(req.employeeId);
                if (user) emp = employeeByEmail.get(normalize(user.email));
            }
            // 지점/부서 필터
            if (emp) {
                const b = normalize(emp.branch);
                const d = normalize(emp.department);
                if (branch !== 'all' && b !== selBranch) return false;
                if (department !== 'all' && d !== selDept) return false;
            } else {
                // 직원 매핑 실패 시 전체가 아니면 제외
                if (branch !== 'all' || department !== 'all') return false;
            }

            // 연/기간 필터
            const reqDate = new Date((req.startDate || '').toString());
            if (reqDate.getFullYear() != year) return false;
            if (startDate && reqDate < new Date(startDate)) return false;
            if (endDate && reqDate > new Date(endDate)) return false;
            return true;
        });

        return { year, branch, department, startDate, endDate, employees: filteredEmployees, requests: filteredRequests };
    }

    init() {
        this.loadFilterOptions();
        this.loadOverviewStats();
        this.loadMonthlyChart();
        this.loadDepartmentStats();
        this.loadLeavePatterns();
        this.setupEventListeners();
    }

    // 필터 옵션 로드
    loadFilterOptions() {
        const employees = this.dataManager.employees;
        const norm = (v) => (v || '').toString().trim();
        const branches = [...new Set(employees.map(emp => norm(emp.branch)).filter(Boolean))];
        const departments = [...new Set(employees.map(emp => norm(emp.department)).filter(Boolean))];

        console.log('필터 옵션 로드:', { branches, departments });

        // 지점 필터 옵션 로드
        const branchFilter = document.getElementById('branch-filter');
        if (branchFilter) {
            const current = branchFilter.value;
            branchFilter.innerHTML = '<option value="all">전체 지점</option>' + 
                branches.map(branch => `<option value="${branch}">${branch}</option>`).join('');
            if (current && current !== 'all') {
                branchFilter.value = current;
            }
        }

        // 부서 필터 옵션 로드
        const departmentFilter = document.getElementById('department-filter');
        if (departmentFilter) {
            const currentDept = departmentFilter.value;
            departmentFilter.innerHTML = '<option value="all">전체 부서</option>' + 
                departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
            if (currentDept && currentDept !== 'all') {
                departmentFilter.value = currentDept;
            }
        }

        // 연도 필터 기본값 설정 (현재 연도)
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.value = new Date().getFullYear().toString();
        }
        
        // 날짜 필터 기본값 설정 (현재 날짜 기준)
        const startDateFilter = document.getElementById('start-date');
        const endDateFilter = document.getElementById('end-date');
        if (startDateFilter && !startDateFilter.value) {
            const currentYear = new Date().getFullYear();
            startDateFilter.value = `${currentYear}-01-01`;
        }
        if (endDateFilter && !endDateFilter.value) {
            const today = new Date();
            endDateFilter.value = today.toISOString().split('T')[0];
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        const yearFilter = document.getElementById('year-filter');
        const branchFilter = document.getElementById('branch-filter');
        const departmentFilter = document.getElementById('department-filter');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        const exportBtn = document.getElementById('exportCsvBtn');
        
        const onChange = () => this.loadMonthlyChart();
        if (yearFilter) yearFilter.addEventListener('change', onChange);
        if (branchFilter) branchFilter.addEventListener('change', onChange);
        if (departmentFilter) departmentFilter.addEventListener('change', onChange);
        if (startDate) startDate.addEventListener('change', onChange);
        if (endDate) endDate.addEventListener('change', onChange);
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportMonthlyCsv());
        }

        // 부서 카드 클릭 이벤트
        document.addEventListener('click', (e) => {
            const deptCard = e.target.closest('.department-card');
            if (deptCard) {
                const deptName = deptCard.querySelector('.department-name').textContent;
                // 이미 열린 모달이 있으면 먼저 제거하여 중복 방지
                const existing = document.querySelector('.modal');
                if (existing) {
                    try { document.body.removeChild(existing); } catch (_) {}
                }
                this.showDepartmentDetail(deptName);
            }
        });
    }

    // 전체 통계 개요 로드
    loadOverviewStats() {
        const employees = this.dataManager.employees;
        const leaveRequests = this.dataManager.leaveRequests;

        console.log('통계 데이터 로드:', {
            employeesCount: employees.length,
            leaveRequestsCount: leaveRequests.length,
            employees: employees.map(emp => ({ name: emp.name, annualLeaveDays: emp.annualLeaveDays })),
            leaveRequests: leaveRequests.map(req => ({ employeeId: req.employeeId, days: req.days, status: req.status }))
        });

        const totalEmployees = employees.length;
        
        // 총 연차 일수 계산 (지점별 연차 계산 기준 적용)
        let totalLeaveDays = 0;
        if (window.LeaveCalculation) {
            // 각 직원의 실제 연차 일수를 지점별 기준으로 계산
            totalLeaveDays = employees.reduce((sum, emp) => {
                const calculatedDays = window.LeaveCalculation.calculateLeaveByBranchStandard(emp.id);
                return sum + calculatedDays;
            }, 0);
        } else {
            // 폴백: 기존 방식 사용
            totalLeaveDays = employees.reduce((sum, emp) => sum + (emp.annualLeaveDays || 15), 0);
        }
        
        // 실제 사용된 연차 일수 계산 (승인된 연차 신청의 일수 합계)
        const usedLeaveDays = leaveRequests
            .filter(request => request.status === 'approved')
            .reduce((sum, request) => {
                // 반차인지 확인하여 올바른 일수 계산
                let actualDays = request.days;
                if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                    actualDays = 0.5;
                }
                return sum + actualDays;
            }, 0);
        
        const usageRate = totalLeaveDays > 0 ? Math.round((usedLeaveDays / totalLeaveDays) * 100) : 0;

        console.log('통계 계산 결과:', {
            totalEmployees,
            totalLeaveDays,
            usedLeaveDays,
            usageRate
        });

        // DOM 업데이트
        const totalEmployeesEl = document.getElementById('total-employees');
        const totalLeaveDaysEl = document.getElementById('total-leave-days');
        const usedLeaveDaysEl = document.getElementById('used-leave-days');
        const usageRateEl = document.getElementById('usage-rate');

        if (totalEmployeesEl) totalEmployeesEl.textContent = totalEmployees;
        if (totalLeaveDaysEl) totalLeaveDaysEl.textContent = totalLeaveDays;
        if (usedLeaveDaysEl) usedLeaveDaysEl.textContent = usedLeaveDays;
        if (usageRateEl) usageRateEl.textContent = usageRate + '%';
    }

    // 월별 차트 로드
    loadMonthlyChart() {
        const year = document.getElementById('year-filter')?.value || new Date().getFullYear().toString();
        const branch = document.getElementById('branch-filter')?.value || 'all';
        const department = document.getElementById('department-filter')?.value || 'all';
        const startDate = document.getElementById('start-date')?.value || '';
        const endDate = document.getElementById('end-date')?.value || '';
        const leaveRequests = this.dataManager.leaveRequests;
        const container = document.getElementById('monthly-chart');

        console.log('월별 차트 로드:', {
            year,
            branch,
            department,
            startDate,
            endDate,
            leaveRequestsCount: leaveRequests.length,
            container: container
        });

        const monthlyData = this.calculateMonthlyData(leaveRequests, year, branch, department, startDate, endDate);
        
        console.log('월별 데이터:', monthlyData);
        console.log('컨테이너 존재 여부:', !!container);
        
        const maxVal = Math.max(1, ...monthlyData.map(d => d.days));
        
        if (container) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth(); // 0-11
            const isCurrentYear = parseInt(year) === currentYear;
            
            container.innerHTML = monthlyData.map((data, index) => {
                const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
                const height = Math.max((data.days / maxVal) * 200, 4);
                
                // 현재 연도이고 현재 월 이후인 경우 스타일 변경
                const isFutureMonth = isCurrentYear && index > currentMonth;
                const opacity = isFutureMonth ? 0.3 : 1;
                const cursorStyle = isFutureMonth ? 'not-allowed' : 'default';
                
                return `
                    <div class="month-bar" style="height: ${height}px; opacity: ${opacity}; cursor: ${cursorStyle};" 
                         title="${isFutureMonth ? '미래 월 (데이터 없음)' : ''}">
                        <div class="month-value">${data.days}일</div>
                        <div class="month-label">${monthNames[index]}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // 월별 데이터 계산 (기간 필터 추가)
    calculateMonthlyData(leaveRequests, year, branch='all', department='all', startDate='', endDate='') {
        const monthlyData = Array(12).fill(0).map(() => ({ days: 0, count: 0 }));
        const employees = this.dataManager.employees || [];

        console.log('월별 데이터 계산 시작:', {
            leaveRequestsCount: leaveRequests.length,
            employeesCount: employees.length,
            year,
            branch,
            department
        });

        let processedRequests = 0;
        let approvedRequests = 0;

        leaveRequests.forEach(request => {
            processedRequests++;
            
            if (request.status !== 'approved') {
                console.log(`요청 ${processedRequests}: 승인되지 않음 - ${request.status}`);
                return;
            }
            approvedRequests++;

            // 직원 매핑: employee.id 또는 user.id 기반 혼재 데이터 대응
            let employee = employees.find(emp => emp.id === request.employeeId);
            if (!employee) {
                // 사용자 테이블에서 조회 후 이메일로 직원 매핑
                const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
                const users = this.dataManager?.users || JSON.parse(usersStorage);
                const user = users.find(u => u.id === request.employeeId);
                if (user) {
                    employee = employees.find(emp => emp.email === user.email);
                }
            }
            if (!employee) {
                console.log(`요청 ${processedRequests}: 직원을 찾을 수 없음 - employeeId: ${request.employeeId}`);
                // 지점/부서 필터가 전체일 때는 포함(과거 데이터 호환)
                if (branch !== 'all' || department !== 'all') {
                    return;
                }
            }

            // 지점/부서 이름 정규화 비교 (공백/대소문자 차이 보정)
            const normalize = (v) => (v || '').toString().trim().toLowerCase();
            const employeeBranch = employee ? normalize(employee.branch) : '';
            const employeeDept = employee ? normalize(employee.department) : '';
            const selectedBranch = normalize(branch);
            const selectedDept = normalize(department);

            if (employee && branch !== 'all' && employeeBranch !== selectedBranch) {
                console.log(`요청 ${processedRequests}: 지점 필터 불일치 - ${employee.branch} vs ${branch}`);
                return;
            }
            if (employee && department !== 'all' && employeeDept !== selectedDept) {
                console.log(`요청 ${processedRequests}: 부서 필터 불일치 - ${employee.department} vs ${department}`);
                return;
            }

            // 날짜는 시작일 기준, 문자열 안정화
            const requestDate = new Date((request.startDate || '').toString());
            if (requestDate.getFullYear() != year) {
                console.log(`요청 ${processedRequests}: 연도 불일치 - ${requestDate.getFullYear()} vs ${year}`);
                return;
            }

            // 기간 필터 적용
            if (startDate && requestDate < new Date(startDate)) {
                console.log(`요청 ${processedRequests}: 시작일 필터 불일치`);
                return;
            }
            if (endDate && requestDate > new Date(endDate)) {
                console.log(`요청 ${processedRequests}: 종료일 필터 불일치`);
                return;
            }

            const month = requestDate.getMonth();
            
            // 반차인지 확인하여 올바른 일수 계산
            let actualDays = request.days;
            if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                actualDays = 0.5;
            }
            
            monthlyData[month].days += actualDays;
            monthlyData[month].count += 1;
            
            console.log(`요청 ${processedRequests}: 처리됨 - ${requestDate.getMonth() + 1}월, ${request.days}일`);
        });

        console.log('월별 데이터 계산 완료:', {
            processedRequests,
            approvedRequests,
            monthlyData: monthlyData.map((data, index) => ({ month: index + 1, days: data.days, count: data.count }))
        });

        return monthlyData;
    }

    // 부서별 통계 로드 (필터 적용)
    loadDepartmentStats() {
        // 연도 필터 기준으로 해당 연도 전체(1~12월) 집계
        const { year, employees, requests } = this.getFilteredData({ yearOnly: true });
        const container = document.getElementById('department-stats');

        console.log('부서별 통계 로드:', {
            employeesCount: employees.length,
            leaveRequestsCount: requests.length,
            year
        });

        // 부서별 데이터 그룹화
        const departmentData = {};
        
        employees.forEach(employee => {
            if (!departmentData[employee.department]) {
                departmentData[employee.department] = {
                    employees: [],
                    totalLeaveDays: 0,
                    usedLeaveDays: 0,
                    pendingRequests: 0
                };
            }
            departmentData[employee.department].employees.push(employee);
            // 지점 기준 연차 계산 사용 (가능하면)
            if (window.LeaveCalculation) {
                departmentData[employee.department].totalLeaveDays += window.LeaveCalculation.calculateLeaveByBranchStandard(employee.id);
            } else {
                departmentData[employee.department].totalLeaveDays += (employee.annualLeaveDays || 15);
            }
        });

        // 실제 연차 신청 데이터(필터된)로 사용/대기 집계
        const normalize = (v) => (v || '').toString().trim().toLowerCase();
        const empById = new Map(employees.map(e => [e.id, e]));
        const empByEmail = new Map(employees.map(e => [normalize(e.email), e]));
        const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
        const users = this.dataManager?.users || JSON.parse(usersStorage);
        const userById = new Map(users.map(u => [u.id, u]));

        requests.forEach(request => {
            // 요청이 어떤 부서 소속인지 찾기 (필터된 직원 목록에서, user.id 호환)
            let emp = empById.get(request.employeeId);
            if (!emp) {
                const user = userById.get(request.employeeId);
                if (user) emp = empByEmail.get(normalize(user.email));
            }
            if (!emp) return;
            const bucket = departmentData[emp.department];
            if (!bucket) return;
            if (request.status === 'approved') {
                // 반차인지 확인하여 올바른 일수 계산
                let actualDays = request.days || 0;
                if (request.type === '반차' || request.reasonType === 'half_morning' || request.reasonType === 'half_afternoon') {
                    actualDays = 0.5;
                }
                bucket.usedLeaveDays += actualDays;
            }
            else if (request.status === 'pending') bucket.pendingRequests += 1;
        });

        console.log('부서별 데이터:', departmentData);

        // 부서별 카드 생성
        container.innerHTML = Object.entries(departmentData).map(([department, data]) => {
            const remainingDays = data.totalLeaveDays - data.usedLeaveDays;
            const usageRate = data.totalLeaveDays > 0 ? Math.round((data.usedLeaveDays / data.totalLeaveDays) * 100) : 0;
            
            return `
                <div class="department-card">
                    <div class="department-header">
                        <div class="department-name">${department}</div>
                        <div class="department-count">${data.employees.length}명</div>
                    </div>
                    <div class="department-stats-grid">
                        <div class="department-stat">
                            <div class="value">${data.totalLeaveDays}</div>
                            <div class="label">총 연차</div>
                        </div>
                        <div class="department-stat">
                            <div class="value">${data.usedLeaveDays}</div>
                            <div class="label">사용 연차</div>
                        </div>
                        <div class="department-stat">
                            <div class="value">${remainingDays}</div>
                            <div class="label">잔여 연차</div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">사용률: ${usageRate}%</div>
                        <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 0.5rem;">
                            대기 중인 신청: ${data.pendingRequests}건
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 연차 사용 패턴 로드 (필터 적용)
    loadLeavePatterns() {
        const { requests } = this.getFilteredData();
        const singleDayLeaves = requests.filter(req => req.days === 1 && req.status === 'approved').length;
        const multiDayLeaves = requests.filter(req => req.days > 1 && req.status === 'approved').length;
        const pendingLeaves = requests.filter(req => req.status === 'pending').length;
        const approvedLeaves = requests.filter(req => req.status === 'approved').length;

        document.getElementById('single-day-leaves').textContent = singleDayLeaves;
        document.getElementById('multi-day-leaves').textContent = multiDayLeaves;
        document.getElementById('pending-leaves').textContent = pendingLeaves;
        document.getElementById('approved-leaves').textContent = approvedLeaves;
    }

    // CSV 내보내기
    exportMonthlyCsv(){
        const year = document.getElementById('year-filter').value;
        const branch = document.getElementById('branch-filter').value;
        const department = document.getElementById('department-filter').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const monthlyData = this.calculateMonthlyData(this.dataManager.leaveRequests, year, branch, department, startDate, endDate);
        const header = ['월','연차일수','건수'];
        const rows = monthlyData.map((d, i) => [`${i+1}` , d.days, d.count]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `연차_월별통계_${year}_${branch}_${department}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 부서 상세 모달 표시
    showDepartmentDetail(departmentName) {
        const { year, employees: filteredEmployees, requests } = this.getFilteredData({ yearOnly: true });
        const employees = filteredEmployees.filter(emp => emp.department === departmentName);
        const leaveRequests = requests;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${departmentName} 직원 상세</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="employee-detail-list">
                        ${(() => {
                            const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
                            const users = this.dataManager?.users || JSON.parse(usersStorage);
                            const normalize = (v) => (v || '').toString().trim().toLowerCase();
                            const userByEmail = new Map(users.map(u => [normalize(u.email), u]));
                            return employees.map(emp => {
                                // 총 연차(지점 기준)
                                let totalDays = 15;
                                if (window.LeaveCalculation) totalDays = window.LeaveCalculation.calculateLeaveByBranchStandard(emp.id);

                                // employeeId/userId 혼재 대응
                                const user = userByEmail.get(normalize(emp.email));
                                const idSet = new Set([emp.id]);
                                if (user) idSet.add(user.id);
                                const empRequests = leaveRequests.filter(r => idSet.has(r.employeeId));
                                const approvedDays = empRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.days || 0), 0);
                                const pendingCount = empRequests.filter(r => r.status === 'pending').length;
                                const remaining = Math.max(totalDays - approvedDays, 0);
                                return `
                                    <div class="employee-detail-item">
                                        <div class="emp-info">
                                            <strong>${emp.name}</strong> (${emp.position})
                                            <span class="emp-branch">${emp.branch}</span>
                                        </div>
                                        <div class="emp-stats">
                                            <span>총: ${totalDays}일</span>
                                            <span>사용: ${approvedDays}일</span>
                                            <span>잔여: ${remaining}일</span>
                                            <span class="pending-count">대기: ${pendingCount}건</span>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        })()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 단일 위임형 닫기 핸들러 (중복리스너 방지)
        const content = modal.querySelector('.modal-content');
        const closeBtn = modal.querySelector('.close');
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                if (document.body.contains(modal)) document.body.removeChild(modal);
                window.removeEventListener('keydown', escHandler);
            }
        };
        window.addEventListener('keydown', escHandler);

        // X 버튼 한 번 클릭으로 즉시 닫기 (직접 핸들러)
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (document.body.contains(modal)) document.body.removeChild(modal);
                window.removeEventListener('keydown', escHandler);
            }, { once: true });
        }

        modal.addEventListener('click', (e) => {
            const isCloseClick = closeBtn && (e.target === closeBtn || closeBtn.contains(e.target));
            const clickedOutside = content && !content.contains(e.target);
            if (isCloseClick || clickedOutside) {
                if (document.body.contains(modal)) document.body.removeChild(modal);
                window.removeEventListener('keydown', escHandler);
            }
        });
    }

    // 데이터 새로고침
    refresh() {
        this.loadOverviewStats();
        this.loadMonthlyChart();
        this.loadDepartmentStats();
        this.loadLeavePatterns();
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.statistics = new Statistics();
});

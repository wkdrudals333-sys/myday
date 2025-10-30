// 직원관리 테이블 스크립트 - 이벤트 핸들러 중복 방지 버전
(function(){
    let dm;
    let currentEditingId = null;
    let currentSort = { column: null, direction: 'asc' };
    let currentPage = 1;
    let itemsPerPage = 10; // 동적으로 변경 가능하도록 수정
    let isInitialized = false; // 초기화 중복 방지

    function renderEmployeeTable(employees) {
        const tbody = document.getElementById('employeeTableBody');
        if (!tbody) return;

        if (employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="16" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>검색 조건에 맞는 직원이 없습니다.</p>
                    </td>
                </tr>
            `;
            updateTableInfo(0);
            return;
        }

        tbody.innerHTML = employees.map(emp => {
            
            const status = emp.status || 'active';
            const statusText = status === 'active' ? '재직' : '퇴사';
            const statusClass = status === 'active' ? 'status-active' : 'status-resigned';
            
            // 지점별 연차 계산 기준 표시
            let leaveStandard = '-';
            try {
                const branch = (emp.branch || '').toString();
                const branchInfo = (dm.branches || []).find(b => b.name === branch);
                const std = branchInfo?.leaveCalculationStandard || 'hire_date';
                leaveStandard = std === 'fiscal_year' ? '회계연도' : '입사일';
            } catch(_) {}

            const stats = getComputedLeaveStats(emp);
            const welfareStats = getComputedWelfareLeaveStats(emp);
            const usageRate = stats.total > 0 ? (stats.used / stats.total * 100) : 0;
            const usageClass = usageRate < 30 ? 'low' : usageRate < 70 ? 'medium' : 'high';
            
            // 디버깅용 로그
            console.log(`직원 ${emp.name}: usageRate=${usageRate}, welfareStats=`, welfareStats);
            
            // 복지휴가 데이터가 없으면 기본값 설정
            if (!welfareStats || welfareStats.total === undefined) {
                welfareStats = { total: 0, used: 0, remaining: 0, expired: 0 };
            }
            return `
                <tr data-id="${emp.id}" class="${status}">
                    <td>
                        ${status === 'active' ? `<input type="checkbox" class="employee-checkbox" data-id="${emp.id}">` : ''}
                    </td>
                    <td><strong>${emp.name}</strong></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td><span class="badge ${leaveStandard === '회계연도' ? 'badge-std-fiscal' : 'badge-std-hire'}">${leaveStandard}</span></td>
                    <td>${emp.department}</td>
                    <td>${emp.branch}</td>
                    <td>${emp.position}</td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || '-'}</td>
                    <td>${emp.hireDate}</td>
                    <td>${emp.birthDate || '-'}</td>
                        <td>
                            <div class="annual-leave-info" onclick="showAnnualLeaveHistory(${emp.id})" style="cursor: pointer;" title="연차 이력 보기">
                                <div class="annual-leave-total">발생: ${stats.total % 1 === 0 ? stats.total : stats.total.toFixed(1)}일</div>
                                <div class="annual-leave-used">사용: ${stats.used % 1 === 0 ? stats.used : stats.used.toFixed(1)}일</div>
                                <div class="annual-leave-remaining">잔여: ${stats.remaining % 1 === 0 ? stats.remaining : stats.remaining.toFixed(1)}일</div>
                            </div>
                        </td>
                    <td>
                        <div class="usage-rate">
                            <div class="usage-bar">
                                <div class="usage-fill ${usageClass}" style="width: ${usageRate.toFixed(0)}%"></div>
                            </div>
                            <span class="usage-text">${usageRate.toFixed(0)}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="welfare-leave-info" onclick="showWelfareLeaveHistory(${emp.id})" style="cursor: pointer;" title="복지휴가 이력 보기">
                            <div class="welfare-leave-total">지급: ${welfareStats.total}일</div>
                            <div class="welfare-leave-used">사용: ${welfareStats.used}일</div>
                            <div class="welfare-leave-remaining">잔여: ${welfareStats.remaining}일</div>
                            <div class="welfare-leave-expired">만기: ${welfareStats.expired}일</div>
                        </div>
                    </td>
                    <td>
                        ${(() => {
                            const userRole = (() => {
                                if (typeof window.authManager !== 'undefined') {
                                    const user = window.authManager.getStoredUsers().find(u => u.email === emp.email);
                                    return user ? user.role : 'user';
                                }
                                return 'user';
                            })();
                            const roleText = userRole === 'admin' ? '관리자' : '일반';
                            const roleClass = userRole === 'admin' ? 'status-badge status-active' : 'status-badge status-resigned';
                            return `<span class="${roleClass}">${roleText}</span>`;
                        })()}
                    </td>
                    <td class="actions-column">
                        <div class="employee-actions-btns">
                            <button class="btn-icon btn-edit" onclick="editEmployee(${emp.id})" title="수정">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${status === 'active' ? 
                                `<button class="btn-icon btn-welfare" onclick="grantWelfareLeave(${emp.id})" title="복지휴가 지급">
                                    <i class="fas fa-gift"></i>
                                </button>` : ''
                            }
                            ${status === 'active' ? 
                                `<button class="btn-icon btn-resign" onclick="resignEmployee(${emp.id})" title="퇴사 처리">
                                    <i class="fas fa-user-times"></i>
                                </button>` : 
                                `<button class="btn-icon btn-reactivate" onclick="reactivateEmployee(${emp.id})" title="재직 처리">
                                    <i class="fas fa-user-check"></i>
                                </button>`
                            }
                            ${getCurrentUser() && getCurrentUser().role === 'admin' ? 
                                `<button class="btn-icon btn-delete" onclick="deleteEmployee(${emp.id})" title="계정 삭제">
                                    <i class="fas fa-trash-alt"></i>
                                </button>` : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        updateTableInfo(employees.length);
    }

    function updateTableInfo(total) {
        const countElement = document.getElementById('employeeCount');
        const paginationInfo = document.getElementById('paginationInfo');
        
        if (countElement) {
            countElement.textContent = `총 ${total}명의 직원`;
        }
        
        // 페이지네이션 정보 업데이트
        if (paginationInfo) {
            const startItem = (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, total);
            paginationInfo.textContent = `${startItem}-${endItem} / 총 ${total}개`;
        }
    }

    // 직원 복지휴가 현황 산출
    function getComputedWelfareLeaveStats(employee) {
        try {
            const currentYear = new Date().getFullYear();
            const today = new Date().toISOString().split('T')[0];
            
            // employeeId 혼재 대응(user.id/employee.id)
            const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
            const users = dm?.users || JSON.parse(usersStorage);
            const user = users.find(u => u.email === employee.email);
            const identifiers = new Set([employee.id]);
            if (user) identifiers.add(user.id);

            // 복지휴가 신청 내역 필터링
            const welfareRequests = (dm.leaveRequests || []).filter(r =>
                identifiers.has(r.employeeId) &&
                new Date(r.startDate).getFullYear() === currentYear &&
                r.leaveType === 'welfare-vacation'
            );

            const used = welfareRequests
                .filter(r => r.status === 'approved')
                .reduce((sum, r) => sum + (r.days || 0), 0);

            // 복지휴가 지급 이력에서 만기 정보 계산
            const welfareGrants = (dm.welfareLeaveGrants || []).filter(grant => grant.employeeId === employee.id);
            
            let totalGranted = 0;
            let expiredDays = 0;
            
            welfareGrants.forEach(grant => {
                totalGranted += grant.grantedDays || 0;
                
                // 만기일이 있고 오늘 날짜가 만기일을 넘었으면 만기 처리
                if (grant.expiryDate && grant.expiryDate < today) {
                    // 해당 지급분의 사용 여부 확인
                    const grantUsed = welfareRequests
                        .filter(r => r.status === 'approved' && 
                               new Date(r.startDate) >= grant.effectiveDate &&
                               new Date(r.startDate) <= grant.expiryDate)
                        .reduce((sum, r) => sum + (r.days || 0), 0);
                    
                    const grantRemaining = Math.max((grant.grantedDays || 0) - grantUsed, 0);
                    expiredDays += grantRemaining;
                }
            });

            // 총 복지휴가는 지급된 총량만 사용 (직원 데이터의 welfareLeaveDays는 사용하지 않음)
            const total = totalGranted;
            const remaining = Math.max(total - used - expiredDays, 0);
            
            // 디버깅을 위한 콘솔 로그
            console.log(`복지휴가 계산 - ${employee.name}:`, {
                totalGranted,
                used,
                expiredDays,
                remaining,
                welfareGrants: welfareGrants.length,
                today
            });
            
            return { total, used, remaining, expired: expiredDays };
        } catch (e) {
            console.error('복지휴가 계산 오류:', e);
            return { total: 0, used: 0, remaining: 0, expired: 0 };
        }
    }

    // 직원 연차 현황 산출(실제 leaveRequests 기준) - 법정연차만
    function getComputedLeaveStats(employee) {
        try {
            const currentYear = new Date().getFullYear();
            // employeeId 혼재 대응(user.id/employee.id)
            const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
            const users = dm?.users || JSON.parse(usersStorage);
            const user = users.find(u => u.email === employee.email);
            const identifiers = new Set([employee.id]);
            if (user) identifiers.add(user.id);

            // 법정연차만 필터링 (복지휴가 제외)
            const requests = (dm.leaveRequests || []).filter(r =>
                identifiers.has(r.employeeId) &&
                new Date(r.startDate).getFullYear() === currentYear &&
                r.leaveType !== 'welfare-vacation' // 복지휴가 제외
            );

            const used = requests
                .filter(r => r.status === 'approved')
                .reduce((sum, r) => sum + (r.days || 0), 0);

            // 총 연차는 지점 기준 계산 우선 (직원 지점 기준 + 현재 날짜 기준)
            let total = employee.annualLeaveDays || 15;
            if (window.LeaveCalculation && typeof window.LeaveCalculation.calculateLeaveByBranchStandard === 'function') {
                try {
                    total = window.LeaveCalculation.calculateLeaveByBranchStandard(employee.id);
                } catch (_) {}
            }
            const remaining = Math.max(total - used, 0);
            return { total, used, remaining };
        } catch (e) {
            return { total: employee.annualLeaveDays || 15, used: employee.usedLeaveDays || 0, remaining: employee.remainingLeaveDays || 0 };
        }
    }

    function searchEmployees(searchTerm, statusFilter, branchFilter, departmentFilter) {
        const employees = dm.employees || [];
        
        return employees.filter(emp => {
            const matchesSearch = !searchTerm || 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.position.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || (emp.status || 'active') === statusFilter;
            const matchesBranch = branchFilter === 'all' || emp.branch === branchFilter;
            const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
            
            return matchesSearch && matchesStatus && matchesBranch && matchesDepartment;
        });
    }

    function sortEmployees(employees, column, direction) {
        return employees.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // 숫자 필드 처리
            if (['annualLeaveDays', 'usedLeaveDays', 'remainingLeaveDays'].includes(column)) {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }

            // 날짜 필드 처리
            if (column === 'hireDate' || column === 'birthDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    function updateSortUI(column, direction) {
        // 모든 헤더에서 정렬 클래스 제거
        document.querySelectorAll('.employee-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });

        // 현재 정렬 컬럼에 클래스 추가
        const currentTh = document.querySelector(`th[data-sort="${column}"]`);
        if (currentTh) {
            currentTh.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    function refreshEmployeeTable() {
        const searchTerm = document.getElementById('searchEmployee').value;
        const branchFilter = document.getElementById('branchFilter').value;
        const departmentFilter = document.getElementById('departmentFilter').value;

        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        let filteredEmployees = searchEmployees(searchTerm, statusFilter, branchFilter, departmentFilter);

        // 정렬 적용
        if (currentSort.column) {
            filteredEmployees = sortEmployees(filteredEmployees, currentSort.column, currentSort.direction);
        }

        renderEmployeeTable(filteredEmployees);
    }

    function openModal(title, employeeData = null) {
        const modal = document.getElementById('employeeModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('employeeForm');

        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = title;
        currentEditingId = employeeData ? employeeData.id : null;

        if (employeeData) {
            // 수정 모드 - 폼에 데이터 채우기
            document.getElementById('employeeName').value = employeeData.name || '';
            document.getElementById('employeeEmail').value = employeeData.email || '';
            document.getElementById('employeePhone').value = employeeData.phone || '';
            document.getElementById('employeePosition').value = employeeData.position || '';
            document.getElementById('employeeHireDate').value = employeeData.hireDate || employeeData.joindate || '';
            document.getElementById('employeeBirthDate').value = employeeData.birthDate || '';
            
            // 권한 필드 설정
            const roleSelect = document.getElementById('employeeRole');
            if (roleSelect && typeof window.authManager !== 'undefined') {
                const user = window.authManager.getStoredUsers().find(u => u.email === employeeData.email);
                if (user && user.role) {
                    roleSelect.value = user.role;
                } else {
                    roleSelect.value = 'user';
                }
            }
            
            // annualLeaveDays는 지점 기준 계산을 사용하므로 편집 제외
            
            // 지점과 부서 데이터 로드 및 설정
            loadBranchAndDepartmentDataWithValues(employeeData);
        } else {
            // 추가 모드 - 폼 초기화
            form.reset();
            // 권한 필드 기본값 설정
            const roleSelect = document.getElementById('employeeRole');
            if (roleSelect) {
                roleSelect.value = 'user';
            }
            // annualLeaveDays 입력 제거
            // 추가 모드에서도 지점 데이터 로드
            loadBranchAndDepartmentData();
        }

        modal.style.display = 'block';
        
        // 모달이 열릴 때 body 스크롤 방지
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.style.display = 'none';
            // 모달이 닫힐 때 body 스크롤 복원
            document.body.style.overflow = 'auto';
        }
        currentEditingId = null;
    }

    function addEmployee() {
        openModal('직원 추가');
    }

    function editEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (employee) {
            openModal('직원 수정', employee);
        }
    }

    function deleteEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        // 현재 사용자가 메인관리자인지 확인
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            alert('계정 삭제 권한이 없습니다.\n메인관리자만 계정을 삭제할 수 있습니다.');
            return;
        }

        // 메인관리자는 연차 신청 내역이 있어도 삭제 가능
        const hasLeaveRequests = dm.leaveRequests.some(req => req.employeeId === id);
        if (hasLeaveRequests) {
            if (!confirm(`"${employee.name}" 직원에게 연차 신청 내역이 있습니다.\n\n메인관리자 권한으로 연차 내역과 함께 완전히 삭제하시겠습니까?\n\n⚠️ 다음 데이터가 모두 삭제됩니다:\n• 직원 데이터\n• 사용자 계정\n• 모든 연차 신청 내역\n• 연차 사용 기록\n\n이 작업은 되돌릴 수 없습니다.`)) {
                return;
            }
        }

        if (confirm(`"${employee.name}" 직원의 계정을 완전히 삭제하시겠습니까?\n\n⚠️ 다음 데이터가 삭제됩니다:\n• 직원 데이터\n• 사용자 계정 (이메일: ${employee.email})\n• 모든 연차 내역\n\n이 작업은 되돌릴 수 없습니다.`)) {
            // 1. 연차 신청 내역 삭제 (해당 직원의 모든 연차 신청)
            if (hasLeaveRequests) {
                dm.leaveRequests = dm.leaveRequests.filter(req => req.employeeId !== id);
                dm.saveData();
                console.log('연차 신청 내역 삭제 완료');
            }

            // 2. 사용자 계정 삭제 (authManager 사용)
            if (typeof window.authManager !== 'undefined') {
                const deleteResult = window.authManager.deleteUserByEmail(employee.email);
                if (deleteResult.success) {
                    console.log('사용자 계정 삭제 완료:', employee.email);
                } else {
                    console.log('사용자 계정 삭제 실패 또는 계정 없음:', employee.email);
                }
            }

            // 3. 직원 데이터 삭제
            dm.deleteEmployee(id);
            
            // 4. 테이블 새로고침
            refreshEmployeeTable();
            
            const deleteMessage = hasLeaveRequests ? 
                '계정 삭제가 완료되었습니다.\n직원 데이터, 사용자 계정, 연차 신청 내역이 모두 삭제되었습니다.' :
                '계정 삭제가 완료되었습니다.\n직원 데이터와 사용자 계정이 모두 삭제되었습니다.';
            
            alert(deleteMessage);
        }
    }

    // 퇴사 처리
    function resignEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        const resignationDate = prompt('퇴사일을 입력해주세요 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!resignationDate) return;

        // 날짜 형식 검증
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(resignationDate)) {
            alert('올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)');
            return;
        }

        if (confirm(`"${employee.name}" 직원을 퇴사 처리하시겠습니까?\n퇴사일: ${resignationDate}\n\n연차 내역은 보존됩니다.`)) {
            if (dm.resignEmployee(id, resignationDate)) {
                alert('퇴사 처리되었습니다.');
                refreshEmployeeTable();
            } else {
                alert('퇴사 처리에 실패했습니다.');
            }
        }
    }

    // 재직 처리 (퇴사 취소)
    function reactivateEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        if (confirm(`"${employee.name}" 직원을 재직 처리하시겠습니까?\n퇴사 처리를 취소합니다.`)) {
            if (dm.reactivateEmployee(id)) {
                alert('재직 처리되었습니다.');
                refreshEmployeeTable();
            } else {
                alert('재직 처리에 실패했습니다.');
            }
        }
    }

    function saveEmployee(formData) {
        const employeeData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            department: formData.get('department'),
            branch: formData.get('branch'),
            position: formData.get('position'),
            hireDate: formData.get('hireDate'),
            birthDate: formData.get('birthDate')
        };

        // 이메일 중복 체크
        const existingEmployee = dm.employees.find(emp => 
            emp.email === employeeData.email && emp.id !== currentEditingId
        );
        if (existingEmployee) {
            alert('이미 존재하는 이메일입니다.');
            return false;
        }

        if (currentEditingId) {
            // 수정
            const updatedEmployee = dm.updateEmployee(currentEditingId, employeeData);
            if (updatedEmployee) {
                // 사용자 데이터도 동기화
                if (typeof window.authManager !== 'undefined') {
                    const user = window.authManager.getStoredUsers().find(u => u.email === employeeData.email);
                    if (user) {
                        user.name = employeeData.name;
                        user.phone = employeeData.phone;
                        user.branch = employeeData.branch;
                        user.department = employeeData.department;
                        user.position = employeeData.position;
                        // 권한 업데이트
                        const newRole = formData.get('role');
                        if (newRole && (newRole === 'admin' || newRole === 'user')) {
                            user.role = newRole;
                        }
                        // 입사일이 변경되었는지 확인
                        const hireDateChanged = user.joindate !== employeeData.hireDate;
                        user.joindate = employeeData.hireDate;
                        user.birthdate = employeeData.birthDate;
                        window.authManager.saveUsers(window.authManager.getStoredUsers());
                        
                        // 입사일이 변경되었으면 연차 재계산 필요
                        if (hireDateChanged) {
                            console.log('입사일 변경됨 - 연차 재계산 필요:', user.email, employeeData.hireDate);
                            // 연차 재계산 로직이 있다면 여기서 호출
                            if (window.LeaveCalculation) {
                                // 연차 계산 시스템이 있으면 재계산
                                console.log('연차 재계산 시스템 호출');
                            }
                        }
                        
                        console.log('직원 수정 시 사용자 데이터 동기화 완료:', user.email, '권한:', user.role);
                    }
                }
                alert('직원 정보가 수정되었습니다.');
            }
        } else {
            // 추가
            const newEmployee = dm.addEmployee(employeeData);
            if (newEmployee) {
                // 사용자 계정 생성 또는 업데이트 (권한 포함)
                if (typeof window.authManager !== 'undefined') {
                    const users = window.authManager.getStoredUsers();
                    let user = users.find(u => u.email === employeeData.email);
                    const newRole = formData.get('role') || 'user';
                    
                    if (user) {
                        // 기존 사용자 계정이 있으면 권한 업데이트
                        user.name = employeeData.name;
                        user.phone = employeeData.phone;
                        user.branch = employeeData.branch;
                        user.department = employeeData.department;
                        user.position = employeeData.position;
                        user.joindate = employeeData.hireDate;
                        user.birthdate = employeeData.birthDate;
                        if (newRole === 'admin' || newRole === 'user') {
                            user.role = newRole;
                        }
                        window.authManager.saveUsers(users);
                        console.log('기존 사용자 계정 업데이트 및 권한 설정:', user.email, '권한:', user.role);
                    } else {
                        // 사용자 계정이 없으면 생성 (권한 포함)
                        const newUser = {
                            id: Date.now().toString(),
                            username: employeeData.email.split('@')[0],
                            password: '', // 비밀번호는 회원가입 시에만 설정
                            name: employeeData.name,
                            email: employeeData.email,
                            phone: employeeData.phone || '',
                            branch: employeeData.branch,
                            department: employeeData.department,
                            position: employeeData.position,
                            joindate: employeeData.hireDate,
                            birthdate: employeeData.birthDate || '',
                            role: (newRole === 'admin' || newRole === 'user') ? newRole : 'user'
                        };
                        users.push(newUser);
                        window.authManager.saveUsers(users);
                        console.log('새 사용자 계정 생성 및 권한 설정:', newUser.email, '권한:', newUser.role);
                    }
                }
                alert('새 직원이 추가되었습니다.');
            }
        }

        closeModal();
        refreshEmployeeTable();
        return true;
    }

    // 복지휴가 지급 모달 열기
    function grantWelfareLeave(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        const modal = document.getElementById('welfareLeaveModal');
        const form = document.getElementById('welfareLeaveForm');
        
        if (!modal || !form) return;

        // 폼 초기화
        form.reset();
        
        // 직원 정보 설정
        document.getElementById('welfareEmployeeName').value = employee.name;
        document.getElementById('welfareEmployeeEmail').value = employee.email;
        
        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('welfareLeaveEffectiveDate').value = today;
        
        // 기본 만기일을 1년 후로 설정
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        document.getElementById('welfareLeaveExpiryDate').value = oneYearLater.toISOString().split('T')[0];
        
        // 현재 복지휴가 현황 표시
        const welfareStats = getComputedWelfareLeaveStats(employee);
        const currentTotal = welfareStats.total;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 모달 제목에 현재 복지휴가 정보 표시
        document.getElementById('welfareModalTitle').textContent = 
            `복지휴가 지급 - ${employee.name} (현재: ${currentTotal}일)`;
    }

    // 복지휴가 지급 모달 닫기
    function closeWelfareModal() {
        const modal = document.getElementById('welfareLeaveModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 복지휴가 지급 처리
    function saveWelfareLeave(formData) {
        const employeeEmail = document.getElementById('welfareEmployeeEmail').value;
        const employee = dm.employees.find(emp => emp.email === employeeEmail);
        
        if (!employee) {
            alert('직원 정보를 찾을 수 없습니다.');
            return false;
        }

        const welfareLeaveDays = parseFloat(formData.get('welfareLeaveDays'));
        const welfareLeaveReason = formData.get('welfareLeaveReason') || '';
        const welfareLeaveEffectiveDate = formData.get('welfareLeaveEffectiveDate');
        const welfareLeaveExpiryDate = formData.get('welfareLeaveExpiryDate');

        if (welfareLeaveDays <= 0) {
            alert('복지휴가 일수는 0보다 커야 합니다.');
            return false;
        }

        // 직원 데이터에 복지휴가 추가
        const currentWelfareLeave = employee.welfareLeaveDays || 0;
        employee.welfareLeaveDays = currentWelfareLeave + welfareLeaveDays;
        
        // 복지휴가 지급 기록 생성
        const welfareGrant = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            employeeId: employee.id,
            employeeName: employee.name,
            employeeEmail: employee.email,
            grantedDays: welfareLeaveDays,
            reason: welfareLeaveReason,
            effectiveDate: welfareLeaveEffectiveDate,
            expiryDate: welfareLeaveExpiryDate,
            grantedDate: new Date().toISOString().split('T')[0],
            grantedBy: getCurrentUser()?.email || 'admin'
        };

        // 복지휴가 지급 기록 저장
        if (!dm.welfareLeaveGrants) {
            dm.welfareLeaveGrants = [];
        }
        dm.welfareLeaveGrants.push(welfareGrant);
        
        // 직원 데이터 저장
        dm.saveData('employees', dm.employees);
        dm.saveData('welfareLeaveGrants', dm.welfareLeaveGrants);

        alert(`${employee.name} 직원에게 복지휴가 ${welfareLeaveDays}일이 지급되었습니다.`);
        
        closeWelfareModal();
        refreshEmployeeTable();
        return true;
    }

    // 복지휴가 일괄지급 모달 열기
    function openBulkWelfareLeaveModal() {
        const selectedIds = getSelectedEmployeeIds();
        
        if (selectedIds.length === 0) {
            alert('일괄지급할 직원을 선택해주세요.\n재직 중인 직원만 선택할 수 있습니다.');
            return;
        }

        const modal = document.getElementById('bulkWelfareLeaveModal');
        const form = document.getElementById('bulkWelfareLeaveForm');
        
        if (!modal || !form) return;

        // 폼 초기화
        form.reset();
        
        // 선택된 직원 수 표시
        document.getElementById('selectedEmployeeCount').value = `${selectedIds.length}명`;
        
        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('bulkWelfareLeaveEffectiveDate').value = today;
        
        // 기본 만기일을 1년 후로 설정
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        document.getElementById('bulkWelfareLeaveExpiryDate').value = oneYearLater.toISOString().split('T')[0];
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 복지휴가 일괄지급 모달 닫기
    function closeBulkWelfareModal() {
        const modal = document.getElementById('bulkWelfareLeaveModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 선택된 직원 ID 가져오기
    function getSelectedEmployeeIds() {
        const checkboxes = document.querySelectorAll('.employee-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));
    }

    // 선택된 직원 수 업데이트
    function updateSelectedEmployeeCount() {
        const selectedIds = getSelectedEmployeeIds();
        const countElement = document.getElementById('selectedEmployeeCount');
        if (countElement) {
            countElement.value = `${selectedIds.length}명`;
        }
    }

    // 전체 선택 체크박스 상태 업데이트
    function updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllEmployees');
        const checkboxes = document.querySelectorAll('.employee-checkbox');
        if (selectAllCheckbox && checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const someChecked = Array.from(checkboxes).some(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
        }
    }

    // 복지휴가 일괄지급 처리
    function saveBulkWelfareLeave(formData) {
        const selectedIds = getSelectedEmployeeIds();
        
        if (selectedIds.length === 0) {
            alert('일괄지급할 직원을 선택해주세요.');
            return false;
        }

        const welfareLeaveDays = parseFloat(formData.get('welfareLeaveDays'));
        const welfareLeaveReason = formData.get('welfareLeaveReason') || '';
        const welfareLeaveEffectiveDate = formData.get('welfareLeaveEffectiveDate');
        const welfareLeaveExpiryDate = formData.get('welfareLeaveExpiryDate');

        if (welfareLeaveDays <= 0) {
            alert('복지휴가 일수는 0보다 커야 합니다.');
            return false;
        }

        if (!welfareLeaveEffectiveDate || !welfareLeaveExpiryDate) {
            alert('유효 시작일과 만기일을 모두 입력해주세요.');
            return false;
        }

        if (new Date(welfareLeaveExpiryDate) < new Date(welfareLeaveEffectiveDate)) {
            alert('만기일은 시작일보다 늦어야 합니다.');
            return false;
        }

        // 확인 메시지
        const employeeNames = selectedIds.map(id => {
            const emp = dm.employees.find(e => e.id === id);
            return emp ? emp.name : '';
        }).filter(Boolean);

        if (!confirm(`선택된 ${selectedIds.length}명의 직원에게 복지휴가 ${welfareLeaveDays}일을 일괄지급하시겠습니까?\n\n선택된 직원:\n${employeeNames.slice(0, 10).join(', ')}${employeeNames.length > 10 ? ` 외 ${employeeNames.length - 10}명` : ''}`)) {
            return false;
        }

        const grantedBy = getCurrentUser()?.email || 'admin';
        let successCount = 0;
        let failCount = 0;
        const grantedDate = new Date().toISOString().split('T')[0];

        // 복지휴가 지급 기록 저장을 위한 배열 초기화
        if (!dm.welfareLeaveGrants) {
            dm.welfareLeaveGrants = [];
        }

        // 선택된 각 직원에게 복지휴가 지급
        selectedIds.forEach(employeeId => {
            const employee = dm.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                failCount++;
                return;
            }

            // 복지휴가 지급 기록 생성
            const welfareGrant = {
                id: Date.now() + Math.floor(Math.random() * 10000) + successCount,
                employeeId: employee.id,
                employeeName: employee.name,
                employeeEmail: employee.email,
                grantedDays: welfareLeaveDays,
                reason: welfareLeaveReason,
                effectiveDate: welfareLeaveEffectiveDate,
                expiryDate: welfareLeaveExpiryDate,
                grantedDate: grantedDate,
                grantedBy: grantedBy
            };

            dm.welfareLeaveGrants.push(welfareGrant);
            successCount++;
        });

        // 데이터 저장
        dm.saveData('welfareLeaveGrants', dm.welfareLeaveGrants);

        // 체크박스 초기화
        document.querySelectorAll('.employee-checkbox').forEach(cb => cb.checked = false);
        const selectAllCheckbox = document.getElementById('selectAllEmployees');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }

        alert(`복지휴가 일괄지급이 완료되었습니다.\n\n지급 성공: ${successCount}명\n지급 실패: ${failCount}명`);
        
        closeBulkWelfareModal();
        refreshEmployeeTable();
        return true;
    }

    // 복지휴가 이력 표시
    function showWelfareLeaveHistory(employeeId) {
        const employee = dm.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const modal = document.getElementById('welfareHistoryModal');
        const content = document.getElementById('welfareHistoryContent');
        const title = document.getElementById('welfareHistoryTitle');
        
        if (!modal || !content || !title) return;

        // 복지휴가 지급 이력 가져오기
        const welfareGrants = (dm.welfareLeaveGrants || []).filter(grant => grant.employeeId === employeeId);
        
        // 복지휴가 사용 이력 가져오기 (전체 연도)
        const welfareRequests = (dm.leaveRequests || []).filter(req => 
            req.employeeId === employeeId &&
            req.leaveType === 'welfare-vacation'
        );

        // 현재 복지휴가 현황
        const welfareStats = getComputedWelfareLeaveStats(employee);

        title.textContent = `${employee.name} - 복지휴가 이력`;

        let html = `
            <div class="welfare-history-section">
                <h4 class="welfare-history-section-title">현재 복지휴가 현황</h4>
                <div class="welfare-history-stats">
                    <div class="welfare-stat-item total">
                        <div class="welfare-stat-label">총 지급</div>
                        <div class="welfare-stat-value total">${welfareStats.total}일</div>
                    </div>
                    <div class="welfare-stat-item used">
                        <div class="welfare-stat-label">사용</div>
                        <div class="welfare-stat-value used">${welfareStats.used}일</div>
                    </div>
                    <div class="welfare-stat-item remaining">
                        <div class="welfare-stat-label">잔여</div>
                        <div class="welfare-stat-value remaining">${welfareStats.remaining}일</div>
                    </div>
                    <div class="welfare-stat-item expired">
                        <div class="welfare-stat-label">만기</div>
                        <div class="welfare-stat-value expired">${welfareStats.expired}일</div>
                    </div>
                </div>
            </div>
        `;

        // 지급 이력
        html += `
            <div class="welfare-history-section">
                <h4 class="welfare-history-section-title">복지휴가 지급 이력</h4>
        `;
        
        if (welfareGrants.length > 0) {
            html += `
                <table class="welfare-history-table">
                    <thead>
                        <tr>
                            <th>지급일</th>
                            <th>지급일수</th>
                            <th>유효시작일</th>
                            <th>유효만기일</th>
                            <th>지급사유</th>
                            <th>지급자</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            welfareGrants.forEach(grant => {
                html += `
                    <tr>
                        <td>${grant.grantedDate}</td>
                        <td>${grant.grantedDays}일</td>
                        <td>${grant.effectiveDate}</td>
                        <td>${grant.expiryDate || '-'}</td>
                        <td>${grant.reason || '-'}</td>
                        <td>${grant.grantedBy}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        } else {
            html += `
                <div class="welfare-history-empty">
                    지급 이력이 없습니다.
                </div>
            `;
        }
        
        html += `</div>`;

        // 사용 이력
        html += `
            <div class="welfare-history-section">
                <h4 class="welfare-history-section-title">
                    복지휴가 사용 이력 (전체)
                    <div class="annual-leave-filters">
                        <div class="filter-group">
                            <label>연도:</label>
                            <select id="welfareLeaveYearFilter">
                                <option value="all">전체</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>상태:</label>
                            <select id="welfareLeaveStatusFilter">
                                <option value="all">전체</option>
                                <option value="approved">승인됨</option>
                                <option value="pending">대기중</option>
                                <option value="rejected">거부됨</option>
                            </select>
                        </div>
                    </div>
                </h4>
                <div id="welfareLeaveHistoryTable"></div>
        `;
        
        html += `</div>`;

        content.innerHTML = html;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // 연도 옵션 생성 (DOM 생성 후)
        const years = [...new Set(welfareRequests.map(req => new Date(req.startDate).getFullYear()))].sort((a, b) => b - a);
        
        const yearFilterSelect = document.getElementById('welfareLeaveYearFilter');
        if (yearFilterSelect) {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}년`;
                yearFilterSelect.appendChild(option);
            });
        }

        // 필터링된 데이터 표시 함수
        function renderFilteredWelfareLeaveHistory() {
            const selectedYear = document.getElementById('welfareLeaveYearFilter')?.value || 'all';
            const selectedStatus = document.getElementById('welfareLeaveStatusFilter')?.value || 'all';
            
            let filteredRequests = welfareRequests;
            
            // 연도 필터 적용
            if (selectedYear !== 'all') {
                filteredRequests = filteredRequests.filter(req => 
                    new Date(req.startDate).getFullYear() == selectedYear
                );
            }
            
            // 상태 필터 적용
            if (selectedStatus !== 'all') {
                filteredRequests = filteredRequests.filter(req => req.status === selectedStatus);
            }
            
            const historyContainer = document.getElementById('welfareLeaveHistoryTable');
            if (!historyContainer) {
                return;
            }
            
            if (filteredRequests.length === 0) {
                historyContainer.innerHTML = `
                    <div class="welfare-history-empty">
                        필터 조건에 맞는 사용 이력이 없습니다.
                    </div>
                `;
                return;
            }
            
            // 연도별로 그룹화
            const requestsByYear = {};
            filteredRequests.forEach(req => {
                const year = new Date(req.startDate).getFullYear();
                if (!requestsByYear[year]) {
                    requestsByYear[year] = [];
                }
                requestsByYear[year].push(req);
            });

            // 연도별로 정렬 (최신 연도부터)
            const sortedYears = Object.keys(requestsByYear).sort((a, b) => b - a);

            let tableHTML = '';
            sortedYears.forEach(year => {
                const yearRequests = requestsByYear[year];
                tableHTML += `
                    <h5 style="margin: 16px 0 8px 0; color: #374151; font-size: 0.9rem;">${year}년 (${yearRequests.length}건)</h5>
                    <table class="welfare-history-table">
                        <thead>
                            <tr>
                                <th>신청일</th>
                                <th>사용기간</th>
                                <th>사용일수</th>
                                <th>상태</th>
                                <th>사유</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                yearRequests.forEach(req => {
                    const statusText = req.status === 'approved' ? '승인됨' : 
                                     req.status === 'pending' ? '대기중' : '거부됨';
                    const statusClass = req.status === 'approved' ? 'status-approved' : 
                                      req.status === 'pending' ? 'status-pending' : 'status-rejected';
                    
                    tableHTML += `
                        <tr>
                            <td>${req.requestDate || '-'}</td>
                            <td>${req.startDate} ~ ${req.endDate}</td>
                            <td>${req.days}일</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>${req.reason || '-'}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                        </tbody>
                    </table>
                `;
            });
            
            historyContainer.innerHTML = tableHTML;
        }

        // 초기 테이블 렌더링
        if (welfareRequests.length > 0) {
            renderFilteredWelfareLeaveHistory();
        } else {
            const historyContainer = document.getElementById('welfareLeaveHistoryTable');
            if (historyContainer) {
                historyContainer.innerHTML = `
                    <div class="welfare-history-empty">
                        사용 이력이 없습니다.
                    </div>
                `;
            }
        }

        // 필터 이벤트 리스너 추가
        const yearFilter = document.getElementById('welfareLeaveYearFilter');
        const statusFilter = document.getElementById('welfareLeaveStatusFilter');
        
        if (yearFilter) {
            yearFilter.addEventListener('change', renderFilteredWelfareLeaveHistory);
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', renderFilteredWelfareLeaveHistory);
        }
    }

    // 복지휴가 이력 모달 닫기
    function closeWelfareHistoryModal() {
        const modal = document.getElementById('welfareHistoryModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    function closeAnnualLeaveHistoryModal() {
        const modal = document.getElementById('annualLeaveHistoryModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 전역 함수로 등록
    window.addEmployee = addEmployee;
    window.editEmployee = editEmployee;
    window.deleteEmployee = deleteEmployee;
    window.resignEmployee = resignEmployee;
    window.reactivateEmployee = reactivateEmployee;
    window.grantWelfareLeave = grantWelfareLeave;
    window.showWelfareLeaveHistory = showWelfareLeaveHistory;

    // 연차 이력 조회 함수
    function showAnnualLeaveHistory(employeeId) {
        const employee = dm.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const modal = document.getElementById('annualLeaveHistoryModal');
        const content = document.getElementById('annualLeaveHistoryContent');
        const title = document.getElementById('annualLeaveHistoryTitle');
        
        if (!modal || !content || !title) return;

        // 연차 사용 이력 가져오기 (법정연차만) - 전체 연도
        // 연차현황과 동일한 ID 매핑 로직 사용
        const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
        const users = dm?.users || JSON.parse(usersStorage);
        const user = users.find(u => u.email === employee.email);
        const identifiers = new Set([employee.id]);
        if (user) identifiers.add(user.id);
        
        const allRequests = (dm.leaveRequests || []).filter(req => 
            identifiers.has(req.employeeId)
        );
        console.log('이민용의 모든 휴가 신청 (ID 매핑 포함):', allRequests);
        
        const annualLeaveRequests = allRequests.filter(req => 
            req.leaveType !== 'welfare-vacation' // 복지휴가 제외
        );
        console.log('이민용의 연차 신청 (복지휴가 제외):', annualLeaveRequests);

        // 현재 연차 현황
        const annualStats = getComputedLeaveStats(employee);

        title.textContent = `${employee.name} - 연차 이력`;

        let html = `
            <div class="welfare-history-section">
                <h4 class="welfare-history-section-title">현재 연차 현황</h4>
                <div class="welfare-history-stats">
                    <div class="welfare-stat-item total">
                        <div class="welfare-stat-label">발생</div>
                        <div class="welfare-stat-value total">${annualStats.total % 1 === 0 ? annualStats.total : annualStats.total.toFixed(1)}일</div>
                    </div>
                    <div class="welfare-stat-item used">
                        <div class="welfare-stat-label">사용</div>
                        <div class="welfare-stat-value used">${annualStats.used % 1 === 0 ? annualStats.used : annualStats.used.toFixed(1)}일</div>
                    </div>
                    <div class="welfare-stat-item remaining">
                        <div class="welfare-stat-label">잔여</div>
                        <div class="welfare-stat-value remaining">${annualStats.remaining % 1 === 0 ? annualStats.remaining : annualStats.remaining.toFixed(1)}일</div>
                    </div>
                </div>
            </div>
        `;

        // 연차 사용 이력
        html += `
            <div class="welfare-history-section">
                <h4 class="welfare-history-section-title">
                    연차 사용 이력 (전체)
                    <div class="annual-leave-filters">
                        <div class="filter-group">
                            <label>연도:</label>
                            <select id="annualLeaveYearFilter">
                                <option value="all">전체</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>상태:</label>
                            <select id="annualLeaveStatusFilter">
                                <option value="all">전체</option>
                                <option value="approved">승인됨</option>
                                <option value="pending">대기중</option>
                                <option value="rejected">거부됨</option>
                            </select>
                        </div>
                    </div>
                </h4>
        `;
        
        // 필터링된 데이터 표시 함수
        function renderFilteredAnnualLeaveHistory() {
            const selectedYear = document.getElementById('annualLeaveYearFilter')?.value || 'all';
            const selectedStatus = document.getElementById('annualLeaveStatusFilter')?.value || 'all';
            
            console.log('필터 선택:', { selectedYear, selectedStatus });
            console.log('원본 데이터:', annualLeaveRequests);
            
            let filteredRequests = annualLeaveRequests;
            
            // 연도 필터 적용
            if (selectedYear !== 'all') {
                filteredRequests = filteredRequests.filter(req => 
                    new Date(req.startDate).getFullYear() == selectedYear
                );
                console.log('연도 필터 적용 후:', filteredRequests);
            }
            
            // 상태 필터 적용
            if (selectedStatus !== 'all') {
                filteredRequests = filteredRequests.filter(req => req.status === selectedStatus);
                console.log('상태 필터 적용 후:', filteredRequests);
            }
            
            console.log('최종 필터링된 데이터:', filteredRequests);
            
            const historyContainer = document.getElementById('annualLeaveHistoryTable');
            if (!historyContainer) {
                console.log('historyContainer를 찾을 수 없음');
                return;
            }
            
            if (filteredRequests.length === 0) {
                historyContainer.innerHTML = `
                    <div class="welfare-history-empty">
                        필터 조건에 맞는 사용 이력이 없습니다.
                    </div>
                `;
                return;
            }
            
            // 연도별로 그룹화
            const requestsByYear = {};
            filteredRequests.forEach(req => {
                const year = new Date(req.startDate).getFullYear();
                if (!requestsByYear[year]) {
                    requestsByYear[year] = [];
                }
                requestsByYear[year].push(req);
            });

            // 연도별로 정렬 (최신 연도부터)
            const sortedYears = Object.keys(requestsByYear).sort((a, b) => b - a);

            let tableHTML = '';
            sortedYears.forEach(year => {
                const yearRequests = requestsByYear[year];
                tableHTML += `
                    <h5 style="margin: 16px 0 8px 0; color: #374151; font-size: 0.9rem;">${year}년 (${yearRequests.length}건)</h5>
                    <table class="welfare-history-table">
                        <thead>
                            <tr>
                                <th>신청일</th>
                                <th>사용기간</th>
                                <th>사용일수</th>
                                <th>상태</th>
                                <th>사유</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                yearRequests.forEach(req => {
                    const statusText = req.status === 'approved' ? '승인됨' : 
                                     req.status === 'pending' ? '대기중' : '거부됨';
                    const statusClass = req.status === 'approved' ? 'status-approved' : 
                                      req.status === 'pending' ? 'status-pending' : 'status-rejected';
                    
                    tableHTML += `
                        <tr>
                            <td>${req.requestDate || '-'}</td>
                            <td>${req.startDate} ~ ${req.endDate}</td>
                            <td>${req.days}일</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>${req.reason || '-'}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                        </tbody>
                    </table>
                `;
            });
            
            historyContainer.innerHTML = tableHTML;
        }

        // 초기 테이블 렌더링
        html += `<div id="annualLeaveHistoryTable">`;
        html += `</div>`;
        
        html += `</div>`;

        content.innerHTML = html;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // 연도 옵션 생성 (DOM 생성 후)
        const years = [...new Set(annualLeaveRequests.map(req => new Date(req.startDate).getFullYear()))].sort((a, b) => b - a);
        console.log('사용 가능한 연도들:', years);
        console.log('연차 신청 데이터:', annualLeaveRequests);
        
        const yearFilterSelect = document.getElementById('annualLeaveYearFilter');
        if (yearFilterSelect) {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}년`;
                yearFilterSelect.appendChild(option);
            });
        }

        // 초기 테이블 렌더링 (DOM이 생성된 후)
        if (annualLeaveRequests.length > 0) {
            renderFilteredAnnualLeaveHistory();
        } else {
            const historyContainer = document.getElementById('annualLeaveHistoryTable');
            if (historyContainer) {
                historyContainer.innerHTML = `
                    <div class="welfare-history-empty">
                        사용 이력이 없습니다.
                    </div>
                `;
            }
        }

        // 필터 이벤트 리스너 추가
        const yearFilter = document.getElementById('annualLeaveYearFilter');
        const statusFilter = document.getElementById('annualLeaveStatusFilter');
        
        if (yearFilter) {
            yearFilter.addEventListener('change', renderFilteredAnnualLeaveHistory);
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', renderFilteredAnnualLeaveHistory);
        }
    }

    window.showAnnualLeaveHistory = showAnnualLeaveHistory;
    
    // 테스트용 복지휴가 데이터 추가
    function addTestWelfareLeaveData() {
        if (!dm.welfareLeaveGrants) {
            dm.welfareLeaveGrants = [];
        }
        
        // 이미 테스트 데이터가 있는지 확인
        const hasTestData = dm.welfareLeaveGrants.some(grant => grant.grantedBy === 'test');
        if (hasTestData) return;
        
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // 첫 번째 직원에게 만기된 복지휴가 지급
        const firstEmployee = dm.employees[0];
        if (firstEmployee) {
            const expiredGrant = {
                id: Date.now() + 1,
                employeeId: firstEmployee.id,
                employeeName: firstEmployee.name,
                employeeEmail: firstEmployee.email,
                grantedDays: 3,
                reason: '테스트용 복지휴가 (만기됨)',
                effectiveDate: yesterdayStr,
                expiryDate: yesterdayStr, // 어제 만료
                grantedDate: yesterdayStr,
                grantedBy: 'test'
            };
            dm.welfareLeaveGrants.push(expiredGrant);
        }
        
        // 두 번째 직원에게 유효한 복지휴가 지급
        const secondEmployee = dm.employees[1];
        if (secondEmployee) {
            const validGrant = {
                id: Date.now() + 2,
                employeeId: secondEmployee.id,
                employeeName: secondEmployee.name,
                employeeEmail: secondEmployee.email,
                grantedDays: 5,
                reason: '테스트용 복지휴가 (유효함)',
                effectiveDate: today,
                expiryDate: '2026-10-27', // 내년까지 유효
                grantedDate: today,
                grantedBy: 'test'
            };
            dm.welfareLeaveGrants.push(validGrant);
        }
        
        // 데이터 저장
        dm.saveData('welfareLeaveGrants', dm.welfareLeaveGrants);
        console.log('테스트용 복지휴가 데이터가 추가되었습니다.');
    }

    // 지점과 부서 데이터 로드 (캐싱 적용)
    function loadBranchAndDepartmentData() {
        const branchSelect = document.getElementById('employeeBranch');
        if (!branchSelect) return;

        // 이미 로드된 경우 재로드하지 않음
        if (branchSelect.options.length > 1) {
            return;
        }
        
        if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
            branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
            window.dataManager.branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.name;
                option.textContent = branch.name;
                branchSelect.appendChild(option);
            });
        } else {
            branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
        }
    }

    // 부서 필터 옵션 로드
    function loadDepartmentFilterOptions() {
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter) return;

        // 이미 로드된 경우 재로드하지 않음
        if (departmentFilter.options.length > 1) {
            return;
        }

        // 직원 데이터에서 부서 정보 추출
        const employeeDepartments = [...new Set(dm.employees.map(emp => emp.department).filter(Boolean))];
        employeeDepartments.forEach(departmentName => {
            const option = document.createElement('option');
            option.value = departmentName;
            option.textContent = departmentName;
            departmentFilter.appendChild(option);
        });
    }

    // 지점 필터 옵션 로드
    function loadBranchFilterOptions() {
        const branchFilter = document.getElementById('branchFilter');
        if (!branchFilter) return;

        // 이미 로드된 경우 재로드하지 않음
        if (branchFilter.options.length > 1) {
            return;
        }

        if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
            // 실제 등록된 지점 데이터로 옵션 생성
            window.dataManager.branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.name;
                option.textContent = branch.name;
                branchFilter.appendChild(option);
            });
        } else {
            // 직원 데이터에서 지점 정보 추출 (fallback)
            const employeeBranches = [...new Set(dm.employees.map(emp => emp.branch).filter(Boolean))];
            employeeBranches.forEach(branchName => {
                const option = document.createElement('option');
                option.value = branchName;
                option.textContent = branchName;
                branchFilter.appendChild(option);
            });
        }
    }

    // 지점과 부서 데이터 로드 및 값 설정 (최적화)
    function loadBranchAndDepartmentDataWithValues(employeeData) {
        const branchSelect = document.getElementById('employeeBranch');
        if (!branchSelect) return;

        // dataManager 로드 확인 및 재시도
        let attempts = 0;
        const maxAttempts = 20;
        
        const loadData = () => {
            attempts++;
            
            if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
                // 지점 데이터 로드
                branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
                window.dataManager.branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.name;
                    option.textContent = branch.name;
                    branchSelect.appendChild(option);
                });
                
                // 지점 값 설정
                if (employeeData.branch) {
                    branchSelect.value = employeeData.branch;
                    
                    // 부서 로드 및 설정
                    loadDepartmentsForBranch(employeeData.branch);
                    
                    // 부서 값 설정 (약간의 지연 후)
                    setTimeout(() => {
                        if (employeeData.department) {
                            const departmentSelect = document.getElementById('employeeDepartment');
                            if (departmentSelect) {
                                departmentSelect.value = employeeData.department;
                            }
                        }
                    }, 50);
                }
            } else if (attempts < maxAttempts) {
                // dataManager가 아직 로드되지 않았으면 재시도
                setTimeout(loadData, 50);
            } else {
                // 최대 시도 횟수 초과 시 기본 옵션만 표시
                branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
            }
        };
        
        loadData();
    }

    // 선택된 지점에 따른 부서 로드 (최적화)
    function loadDepartmentsForBranch(branchName) {
        const departmentSelect = document.getElementById('employeeDepartment');
        if (!departmentSelect) return;

        departmentSelect.innerHTML = '<option value="">팀/부서를 선택하세요</option>';
        
        if (!branchName) {
            departmentSelect.disabled = true;
            return;
        }

        // dataManager에서 해당 지점의 부서 데이터 가져오기
        if (window.dataManager && window.dataManager.getBranchTeams) {
            const teams = window.dataManager.getBranchTeams(branchName);
            
            if (teams && teams.length > 0) {
                departmentSelect.disabled = false;
                teams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team;
                    option.textContent = team;
                    departmentSelect.appendChild(option);
                });
            } else {
                // 지점별 팀 데이터가 없으면 기본 부서들 사용
                setDefaultDepartments(departmentSelect);
            }
        } else {
            // dataManager가 없으면 기본 부서들 사용
            setDefaultDepartments(departmentSelect);
        }
    }

    // 기본 부서 설정
    function setDefaultDepartments(departmentSelect) {
        const defaultDepartments = ['경영관리팀', '택스팀', '컨설팅팀', '영업팀', '개발팀', '마케팅팀', '인사팀'];
        departmentSelect.disabled = false;
        
        defaultDepartments.forEach(deptName => {
            const option = document.createElement('option');
            option.value = deptName;
            option.textContent = deptName;
            departmentSelect.appendChild(option);
        });
    }

    // 항목 갯수 설정 변경 처리
    function handleItemsPerPageChange() {
        const newItemsPerPage = parseInt(document.getElementById('itemsPerPageFilter').value);
        itemsPerPage = newItemsPerPage;
        currentPage = 1; // 항목 갯수 변경 시 첫 페이지로 이동
        refreshEmployeeTable();
    }

    // 이벤트 핸들러 등록 함수
    function attachEventListeners() {
        if (isInitialized) return; // 중복 등록 방지
        isInitialized = true;

        // 직원 추가 버튼
        const addBtn = document.getElementById('addEmployeeBtn');
        if (addBtn) {
            addBtn.addEventListener('click', addEmployee);
        }

        // 검색 및 필터
        const searchInput = document.getElementById('searchEmployee');
        if (searchInput) {
            searchInput.addEventListener('input', refreshEmployeeTable);
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', refreshEmployeeTable);
        }

        const branchFilter = document.getElementById('branchFilter');
        if (branchFilter) {
            branchFilter.addEventListener('change', refreshEmployeeTable);
        }

        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', refreshEmployeeTable);
        }

        // 항목 갯수 설정 필터
        const itemsPerPageFilter = document.getElementById('itemsPerPageFilter');
        if (itemsPerPageFilter) {
            itemsPerPageFilter.addEventListener('change', handleItemsPerPageChange);
        }

        // 정렬 이벤트 리스너
        document.querySelectorAll('.employee-table th.sortable').forEach(th => {
            th.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                if (!column) return;

                // 정렬 방향 결정
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }

                updateSortUI(column, currentSort.direction);
                refreshEmployeeTable();
            });
        });

        // 폼 제출 처리
        const form = document.getElementById('employeeForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                saveEmployee(formData);
            });
        }

        // 지점 선택 시 부서 로드
        const branchSelect = document.getElementById('employeeBranch');
        if (branchSelect) {
            branchSelect.addEventListener('change', function() {
                loadDepartmentsForBranch(this.value);
            });
        }

        // 모달 닫기
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        }

        // 복지휴가 모달 이벤트 리스너
        const closeWelfareModalBtn = document.getElementById('closeWelfareModal');
        if (closeWelfareModalBtn) {
            closeWelfareModalBtn.addEventListener('click', closeWelfareModal);
        }

        const cancelWelfareBtn = document.getElementById('cancelWelfareBtn');
        if (cancelWelfareBtn) {
            cancelWelfareBtn.addEventListener('click', closeWelfareModal);
        }

        const welfareModal = document.getElementById('welfareLeaveModal');
        if (welfareModal) {
            welfareModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeWelfareModal();
                }
            });
        }

        // 복지휴가 폼 제출 처리
        const welfareForm = document.getElementById('welfareLeaveForm');
        if (welfareForm) {
            welfareForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                saveWelfareLeave(formData);
            });
        }

        // 복지휴가 일괄지급 버튼 이벤트
        const bulkWelfareLeaveBtn = document.getElementById('bulkWelfareLeaveBtn');
        if (bulkWelfareLeaveBtn) {
            bulkWelfareLeaveBtn.addEventListener('click', function() {
                openBulkWelfareLeaveModal();
            });
        }

        // 전체 선택 체크박스 이벤트
        const selectAllCheckbox = document.getElementById('selectAllEmployees');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.employee-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = this.checked;
                });
                updateSelectedEmployeeCount();
            });
        }

        // 개별 체크박스 변경 이벤트 (이벤트 위임 사용)
        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('employee-checkbox')) {
                updateSelectedEmployeeCount();
                updateSelectAllCheckbox();
            }
        });

        // 복지휴가 일괄지급 모달 이벤트 리스너
        const closeBulkWelfareModalBtn = document.getElementById('closeBulkWelfareModal');
        if (closeBulkWelfareModalBtn) {
            closeBulkWelfareModalBtn.addEventListener('click', closeBulkWelfareModal);
        }

        const cancelBulkWelfareBtn = document.getElementById('cancelBulkWelfareBtn');
        if (cancelBulkWelfareBtn) {
            cancelBulkWelfareBtn.addEventListener('click', closeBulkWelfareModal);
        }

        const bulkWelfareModal = document.getElementById('bulkWelfareLeaveModal');
        if (bulkWelfareModal) {
            bulkWelfareModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeBulkWelfareModal();
                }
            });
        }

        // 복지휴가 일괄지급 폼 제출 처리
        const bulkWelfareForm = document.getElementById('bulkWelfareLeaveForm');
        if (bulkWelfareForm) {
            bulkWelfareForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                saveBulkWelfareLeave(formData);
            });
        }

        // 복지휴가 이력 모달 이벤트 리스너
        const closeWelfareHistoryModalBtn = document.getElementById('closeWelfareHistoryModal');
        if (closeWelfareHistoryModalBtn) {
            closeWelfareHistoryModalBtn.addEventListener('click', closeWelfareHistoryModal);
        }

        // 연차 이력 모달 이벤트 리스너
        const closeAnnualLeaveHistoryModalBtn = document.getElementById('closeAnnualLeaveHistoryModal');
        if (closeAnnualLeaveHistoryModalBtn) {
            closeAnnualLeaveHistoryModalBtn.addEventListener('click', closeAnnualLeaveHistoryModal);
        }

        const welfareHistoryModal = document.getElementById('welfareHistoryModal');
        if (welfareHistoryModal) {
            welfareHistoryModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeWelfareHistoryModal();
                }
            });
        }

        const annualLeaveHistoryModal = document.getElementById('annualLeaveHistoryModal');
        if (annualLeaveHistoryModal) {
            annualLeaveHistoryModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAnnualLeaveHistoryModal();
                }
            });
        }

        // 로그아웃 처리는 auth.js에서 전역으로 처리됨

        // 엑셀 내보내기
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                alert('엑셀 내보내기 기능은 추후 구현 예정입니다.');
            });
        }

        // 회원 동기화 버튼 이벤트
        const syncUsersBtn = document.getElementById('syncUsersBtn');
        if (syncUsersBtn) {
            syncUsersBtn.addEventListener('click', function() {
                if (typeof window.authManager !== 'undefined') {
                    console.log('회원 동기화 버튼 클릭 - 데이터 일관성 검증 및 강제 동기화 시작');
                    
                    // 1단계: 데이터 일관성 검증 및 수정
                    const validationResult = window.authManager.validateAndFixDataConsistency();
                    
                    // 2단계: 강제 동기화
                    window.authManager.forceSyncUsersToEmployees();
                    
                    // 3단계: 테이블 새로고침
                    refreshEmployeeTable();
                    
                    // 결과 알림
                    let message = '데이터 동기화가 완료되었습니다.\n';
                    if (validationResult && validationResult.issuesFound > 0) {
                        message += `발견된 문제: ${validationResult.issuesFound}개\n`;
                        message += `해결된 문제: ${validationResult.issuesFixed}개\n`;
                    }
                    message += `현재 사용자: ${validationResult?.usersCount || 0}명\n`;
                    message += `현재 직원: ${validationResult?.employeesCount || 0}명`;
                    
                    alert(message);
                } else {
                    alert('인증 관리자가 로드되지 않았습니다.');
                }
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function() {
        if (!window.AuthGuard || !AuthGuard.checkAuth()) return;
        
        // 관리자 권한 체크
        if (!AuthGuard.checkAdminAccess()) return;
        
        dm = window.dataManager || new DataManager();
        window.dataManager = dm;

        // 테스트용 복지휴가 데이터 자동 추가 비활성화
        // 기존 테스트 데이터가 있다면 초기화
        if (dm.welfareLeaveGrants && dm.welfareLeaveGrants.length > 0) {
            console.log('기존 복지휴가 지급 기록을 초기화합니다.');
            dm.clearWelfareLeaveGrants();
        }

        // 페이지 로드 시 자동으로 회원 데이터 동기화 (한 번만 실행)
        if (typeof window.authManager !== 'undefined' && !window.employeeManagementInitialized) {
            console.log('직원관리 페이지에서 자동 동기화 실행');
            // 기존 삭제된 사용자 정리 (일회성)
            window.authManager.cleanupDeletedUsers();
            // 강제 동기화로 모든 데이터 일치시키기
            window.authManager.forceSyncUsersToEmployees();
            window.employeeManagementInitialized = true;
        }

        // 지점 필터 옵션 로드
        loadBranchFilterOptions();

        // 부서 필터 옵션 로드
        loadDepartmentFilterOptions();

        // 지점 데이터 변경 시 필터 업데이트
        const originalSaveData = dm.saveData;
        dm.saveData = function(key, data) {
            const result = originalSaveData.call(this, key, data);
            if (key === 'branches' || key === 'employees') {
                setTimeout(() => {
                    loadBranchFilterOptions();
                    loadDepartmentFilterOptions();
                    refreshEmployeeTable();
                }, 100);
            }
            return result;
        };

        // 이벤트 리스너 등록
        attachEventListeners();

        // 초기 렌더링
        refreshEmployeeTable();
        
        // 지점별 팀 선택 기능 초기화
        initializeBranchTeamSelection();
    });

    // 지점별 팀 선택 기능 초기화
    function initializeBranchTeamSelection() {
        const branchSelect = document.getElementById('employeeBranch');
        const departmentSelect = document.getElementById('employeeDepartment');
        
        if (!branchSelect || !departmentSelect) return;

        // 지점 선택 시 팀 목록 업데이트
        branchSelect.addEventListener('change', function() {
            updateDepartmentOptions(this.value, departmentSelect);
        });
    }

    // 부서 옵션 업데이트
    function updateDepartmentOptions(branchName, departmentSelect) {
        if (!departmentSelect) return;

        // 기존 옵션 제거
        departmentSelect.innerHTML = '';

        if (!branchName) {
            departmentSelect.innerHTML = '<option value="">먼저 지점을 선택하세요</option>';
            departmentSelect.disabled = true;
            return;
        }

        // 해당 지점의 팀 목록 가져오기
        const teams = dm.getBranchTeams(branchName);
        
        if (teams.length === 0) {
            departmentSelect.innerHTML = '<option value="">등록된 팀이 없습니다</option>';
            departmentSelect.disabled = true;
            return;
        }

        // 팀 옵션 추가
        departmentSelect.innerHTML = '<option value="">팀을 선택하세요</option>';
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            departmentSelect.appendChild(option);
        });

        departmentSelect.disabled = false;
    }
})();

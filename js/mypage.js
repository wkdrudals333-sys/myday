// 마이페이지 JavaScript 기능
document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // 초기화
    initializeMyPage();
    loadUserProfile();
    loadLeaveInfo();
    // 데이터 변경 시 휴가 정보와 신청 내역도 즉시 동기화
    window.addEventListener('dm:updated', (e) => {
        if (['leaveRequests','employees','branches','settings'].includes(e.detail?.key)) {
            loadLeaveInfo();
            loadLeaveHistory();
        }
    });
    loadBranches();
    loadLeaveHistory();
    setupEventListeners();
});

// 마이페이지 초기화
function initializeMyPage() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name || '사용자';
        }
    }
}

// 사용자 프로필 로드
function loadUserProfile() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    console.log('현재 사용자 데이터:', currentUser);

    // 프로필 정보 표시
    document.getElementById('displayName').textContent = currentUser.name || '-';
    document.getElementById('displayBranch').textContent = currentUser.branch || '-';
    document.getElementById('displayDepartment').textContent = currentUser.department || '-';
    document.getElementById('displayPosition').textContent = currentUser.position || '-';
    document.getElementById('displayHireDate').textContent = formatDate(currentUser.joindate) || '-';

    // 프로필 이미지 로드
    loadProfileImage(currentUser.profileImage);

    // 폼에 현재 정보 채우기
    fillEditForm(currentUser);
}

// 프로필 이미지 로드
function loadProfileImage(imageUrl) {
    const profileImg = document.getElementById('profileImg');
    const defaultAvatar = document.getElementById('defaultAvatar');
    
    if (imageUrl && imageUrl.trim() !== '') {
        profileImg.src = imageUrl;
        profileImg.style.display = 'block';
        defaultAvatar.style.display = 'none';
    } else {
        profileImg.style.display = 'none';
        defaultAvatar.style.display = 'block';
    }
    
    // 메뉴바 아바타 아이콘도 업데이트
    if (window.authManager) {
        window.authManager.updateNavAvatarIcon(imageUrl);
    }
}

// 편집 폼에 현재 정보 채우기
function fillEditForm(user) {
    console.log('폼에 채울 사용자 데이터:', user);
    
    // 기본 필드들 먼저 설정
    document.getElementById('editName').value = user.name || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editPosition').value = user.position || '';
    document.getElementById('editHireDate').value = user.joindate || '';
    document.getElementById('editBirthDate').value = user.birthdate || '';
    
    // 지점과 부서는 데이터 로드 후 설정
    loadBranchAndDepartmentData(user);
    
    console.log('폼 필드 값들:', {
        name: user.name,
        email: user.email,
        phone: user.phone,
        branch: user.branch,
        department: user.department,
        position: user.position,
        joindate: user.joindate,
        birthdate: user.birthdate
    });
}

// 지점과 부서 데이터 로드 및 설정
function loadBranchAndDepartmentData(user) {
    let attempts = 0;
    const maxAttempts = 50; // 5초간 시도
    
    const checkDataManager = () => {
        attempts++;
        console.log(`dataManager 확인 시도 ${attempts}/${maxAttempts}`);
        
        if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
            console.log('dataManager 로드 완료, 지점 데이터 설정 시작');
            console.log('사용 가능한 지점들:', window.dataManager.branches.map(b => b.name));
            
            // 지점 데이터 로드
            loadBranches();
            
            // 지점 값 설정
            setTimeout(() => {
                if (user.branch) {
                    const branchSelect = document.getElementById('editBranch');
                    if (branchSelect) {
                        branchSelect.value = user.branch;
                        console.log('지점 설정 완료:', user.branch);
                        
                        // 부서 로드 및 설정
                        loadDepartmentsForBranch(user.branch);
                        
                        setTimeout(() => {
                            if (user.department) {
                                const departmentSelect = document.getElementById('editDepartment');
                                if (departmentSelect) {
                                    departmentSelect.value = user.department;
                                    console.log('부서 설정 완료:', user.department);
                                }
                            }
                        }, 200);
                    }
                }
            }, 200);
        } else if (attempts < maxAttempts) {
            console.log('dataManager 로드 대기 중...', {
                dataManager: !!window.dataManager,
                branches: window.dataManager?.branches?.length || 0
            });
            setTimeout(checkDataManager, 100);
        } else {
            console.error('dataManager 로드 실패 - 최대 시도 횟수 초과');
            // 수동으로 지점 데이터 설정
            setBranchDataManually(user);
        }
    };
    
    checkDataManager();
}

// 수동으로 지점 데이터 설정 (dataManager 로드 실패 시)
function setBranchDataManually(user) {
    console.log('수동으로 지점 데이터 설정');
    
    const branchSelect = document.getElementById('editBranch');
    if (branchSelect) {
        // 기본 지점들 수동 추가
        const defaultBranches = ['본사', '강남점', '영등포점', '부산점'];
        branchSelect.innerHTML = '<option value="">소속지점을 선택하세요</option>';
        
        defaultBranches.forEach(branchName => {
            const option = document.createElement('option');
            option.value = branchName;
            option.textContent = branchName;
            branchSelect.appendChild(option);
        });
        
        // 사용자 지점 설정
        if (user.branch) {
            branchSelect.value = user.branch;
            console.log('수동 지점 설정 완료:', user.branch);
            
            // 부서도 수동 설정
            const departmentSelect = document.getElementById('editDepartment');
            if (departmentSelect) {
                setDefaultDepartments(departmentSelect);
                
                if (user.department) {
                    departmentSelect.value = user.department;
                    console.log('수동 부서 설정 완료:', user.department);
                }
            }
        }
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 프로필 이미지 업로드
    const imageUpload = document.getElementById('imageUpload');
    imageUpload.addEventListener('change', handleImageUpload);

    // 개인정보 폼 제출
    const personalInfoForm = document.getElementById('personalInfoForm');
    personalInfoForm.addEventListener('submit', handlePersonalInfoSubmit);

    // 비밀번호 변경 폼 제출
    const passwordForm = document.getElementById('passwordForm');
    passwordForm.addEventListener('submit', handlePasswordChange);

    // 지점 선택 시 부서 로드
    const branchSelect = document.getElementById('editBranch');
    if (branchSelect) {
        branchSelect.addEventListener('change', function() {
            loadDepartmentsForBranch(this.value);
        });
    }

    // 로그아웃 처리는 auth.js에서 전역으로 처리됨

    // 페이지 로드 시 데이터 동기화 (마이페이지에서도)
    if (typeof window.authManager !== 'undefined' && !window.mypageInitialized) {
        console.log('마이페이지에서 데이터 동기화 실행');
        // 데이터 일관성 검증 및 동기화
        window.authManager.validateAndFixDataConsistency();
        window.authManager.forceSyncUsersToEmployees();
        window.mypageInitialized = true;
    }
}

// 이미지 업로드 처리
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 크기 확인 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('파일 크기는 5MB 이하여야 합니다.', 'error');
        return;
    }

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
        showNotification('이미지 파일만 업로드 가능합니다.', 'error');
        return;
    }

    // 이미지 미리보기
    const reader = new FileReader();
    reader.onload = function(e) {
        const profileImg = document.getElementById('profileImg');
        const defaultAvatar = document.getElementById('defaultAvatar');
        
        profileImg.src = e.target.result;
        profileImg.style.display = 'block';
        defaultAvatar.style.display = 'none';

        // 사용자 정보 업데이트
        updateUserProfileImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

// 프로필 이미지 업데이트
function updateUserProfileImage(imageData) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 로컬 스토리지에서 사용자 정보 업데이트
    currentUser.profileImage = imageData;
    updateUserInStorage(currentUser);
    
    // 메뉴바 아바타 아이콘도 업데이트
    if (window.authManager) {
        window.authManager.updateNavAvatarIcon(imageData);
    }
    
    showNotification('프로필 이미지가 업데이트되었습니다.', 'success');
}

// 프로필 이미지 삭제
function removeProfileImage() {
    if (!confirm('프로필 이미지를 삭제하시겠습니까?')) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 이미지 제거
    currentUser.profileImage = '';
    updateUserInStorage(currentUser);

    // UI 업데이트
    const profileImg = document.getElementById('profileImg');
    const defaultAvatar = document.getElementById('defaultAvatar');
    
    profileImg.style.display = 'none';
    defaultAvatar.style.display = 'block';

    // 메뉴바 아바타 아이콘도 업데이트
    if (window.authManager) {
        window.authManager.updateNavAvatarIcon('');
    }

    showNotification('프로필 이미지가 삭제되었습니다.', 'success');
}

// 편집 모드 토글
function toggleEditMode() {
    const form = document.getElementById('personalInfoForm');
    const editBtn = document.getElementById('editInfoBtn');
    
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        editBtn.innerHTML = '<i class="fas fa-eye"></i> 정보 보기';
    } else {
        form.style.display = 'none';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> 정보 수정';
    }
}

// 편집 취소
function cancelEdit() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        fillEditForm(currentUser);
    }
    toggleEditMode();
}

// 개인정보 폼 제출 처리
function handlePersonalInfoSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {};
    
    // 폼 데이터 수집 (disabled 필드 제외)
    for (let [key, value] of formData.entries()) {
        const field = event.target.querySelector(`[name="${key}"]`);
        // disabled 필드는 제외 (입사일은 readonly이므로 제외)
        if (!field || field.disabled) {
            continue;
        }
        userData[key] = value;
    }

    // 날짜 필드명 매핑 (HTML name → 사용자 데이터 필드명)
    if (userData.hireDate) {
        userData.joindate = userData.hireDate;
        console.log('입사일 필드 매핑:', userData.hireDate, '→', userData.joindate);
        delete userData.hireDate; // 원본 필드는 삭제
    }
    if (userData.birthDate) {
        userData.birthdate = userData.birthDate;
        console.log('생년월일 필드 매핑:', userData.birthDate, '→', userData.birthdate);
        delete userData.birthDate; // 원본 필드는 삭제
    }

    console.log('개인정보 수정 - 입력 데이터 (매핑 후):', userData);

    // 유효성 검사
    if (!validatePersonalInfo(userData)) {
        return;
    }

    // 사용자 정보 업데이트
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.error('현재 사용자 정보를 찾을 수 없음');
        return;
    }

    console.log('개인정보 수정 - 수정 전 사용자 데이터:', currentUser);

    // 정보 업데이트
    Object.assign(currentUser, userData);
    
    console.log('개인정보 수정 - 수정 후 사용자 데이터:', currentUser);

    // 데이터 저장
    const saveResult = updateUserInStorage(currentUser);
    console.log('개인정보 수정 - 저장 결과:', saveResult);

    // 직원 데이터도 동기화
    if (window.dataManager && saveResult) {
        const employee = window.dataManager.employees.find(emp => emp.email === currentUser.email);
        if (employee) {
            // 직원 데이터 업데이트 (입사일은 제외 - 관리자만 변경 가능)
            employee.name = currentUser.name;
            employee.phone = currentUser.phone;
            employee.branch = currentUser.branch;
            employee.department = currentUser.department;
            employee.position = currentUser.position;
            // employee.hireDate = currentUser.joindate; // 입사일은 관리자만 변경 가능
            employee.birthDate = currentUser.birthdate;
            
            window.dataManager.saveData('employees', window.dataManager.employees);
            console.log('마이페이지 - 직원 데이터 동기화 완료:', employee);
        } else {
            // 직원 데이터가 없으면 새로 추가
            console.log('마이페이지 - 직원 데이터 없음, 새로 추가');
            if (typeof window.authManager !== 'undefined') {
                window.authManager.addToEmployeeData(currentUser, currentUser);
            }
        }
    }

    // UI 업데이트
    loadUserProfile();
    toggleEditMode();

    showNotification('개인정보가 성공적으로 업데이트되었습니다.', 'success');
}

// 지점 데이터 로드
function loadBranches() {
    const branchSelect = document.getElementById('editBranch');
    if (!branchSelect) return;

    console.log('지점 데이터 로드 시작');
    console.log('dataManager:', window.dataManager);
    console.log('branches:', window.dataManager?.branches);

    // dataManager에서 지점 데이터 가져오기
    if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
        branchSelect.innerHTML = '<option value="">소속지점을 선택하세요</option>';
        window.dataManager.branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.name;
            option.textContent = branch.name;
            branchSelect.appendChild(option);
        });
        console.log('지점 옵션 로드 완료:', window.dataManager.branches.length + '개');
    } else {
        console.log('지점 데이터가 없음, 기본 옵션만 표시');
        branchSelect.innerHTML = '<option value="">소속지점을 선택하세요</option>';
    }
}

// 선택된 지점에 따른 부서 로드
function loadDepartmentsForBranch(branchName) {
    const departmentSelect = document.getElementById('editDepartment');
    if (!departmentSelect) return;

    console.log('부서 로드 시작:', branchName);
    departmentSelect.innerHTML = '<option value="">팀/부서를 선택하세요</option>';
    
    if (!branchName) {
        departmentSelect.disabled = true;
        return;
    }

    // dataManager에서 해당 지점의 부서 데이터 가져오기
    if (window.dataManager && window.dataManager.getBranchTeams) {
        const teams = window.dataManager.getBranchTeams(branchName);
        console.log('지점별 팀 목록:', teams);
        
        if (teams && teams.length > 0) {
            departmentSelect.disabled = false;
            console.log('팀 목록 로드:', teams);
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                departmentSelect.appendChild(option);
            });
        } else {
            // 지점별 팀 데이터가 없으면 기본 부서들 사용
            console.log('지점별 팀 데이터 없음, 기본 부서 사용');
            setDefaultDepartments(departmentSelect);
        }
    } else {
        // dataManager가 없으면 기본 부서들 사용
        console.log('dataManager 없음, 기본 부서 사용');
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
    
    console.log('기본 부서 옵션 추가 완료');
}

// 개인정보 유효성 검사
function validatePersonalInfo(data) {
    if (!data.name || data.name.trim() === '') {
        showNotification('이름을 입력해주세요.', 'error');
        return false;
    }

    if (!data.email || data.email.trim() === '') {
        showNotification('이메일을 입력해주세요.', 'error');
        return false;
    }

    if (!isValidEmail(data.email)) {
        showNotification('올바른 이메일 형식을 입력해주세요.', 'error');
        return false;
    }

    if (!data.phone || data.phone.trim() === '') {
        showNotification('전화번호를 입력해주세요.', 'error');
        return false;
    }

    if (!data.department || data.department.trim() === '') {
        showNotification('부서를 선택해주세요.', 'error');
        return false;
    }

    if (!data.position || data.position.trim() === '') {
        showNotification('직급을 선택해주세요.', 'error');
        return false;
    }

    // 입사일은 관리자만 변경 가능하므로 유효성 검사에서 제외
    // if (!data.joindate || data.joindate.trim() === '') {
    //     showNotification('입사일을 입력해주세요.', 'error');
    //     return false;
    // }

    return true;
}

// 비밀번호 변경 처리
function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 유효성 검사
    if (!validatePasswordChange(currentPassword, newPassword, confirmPassword)) {
        return;
    }

    // 현재 사용자 확인
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 현재 비밀번호 확인
    if (currentUser.password !== currentPassword) {
        showNotification('현재 비밀번호가 올바르지 않습니다.', 'error');
        return;
    }

    // 비밀번호 업데이트
    currentUser.password = newPassword;
    updateUserInStorage(currentUser);

    // 폼 초기화
    event.target.reset();

    showNotification('비밀번호가 성공적으로 변경되었습니다.', 'success');
}

// 비밀번호 변경 유효성 검사
function validatePasswordChange(currentPassword, newPassword, confirmPassword) {
    if (!currentPassword || currentPassword.trim() === '') {
        showNotification('현재 비밀번호를 입력해주세요.', 'error');
        return false;
    }

    if (!newPassword || newPassword.trim() === '') {
        showNotification('새 비밀번호를 입력해주세요.', 'error');
        return false;
    }

    if (newPassword.length < 6) {
        showNotification('새 비밀번호는 6자 이상이어야 합니다.', 'error');
        return false;
    }

    if (newPassword !== confirmPassword) {
        showNotification('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.', 'error');
        return false;
    }

    if (currentPassword === newPassword) {
        showNotification('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 'error');
        return false;
    }

    return true;
}

// 휴가 정보 로드
function loadLeaveInfo() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // LeaveStatus와 동일 로직으로 계산해 동기화
    const dm = window.dataManager || new DataManager();

    // 직원/사용자 ID 혼재 대응 - 연차현황과 동일한 방식 사용
    const employee = dm.employees.find(emp => emp.email === currentUser.email);
    const employeeId = employee ? employee.id : null;
    const userIdForRequests = currentUser.id;

    // 총 연차 (지점별 기준 활용) - 연차현황과 동일하게 employeeId 또는 userIdForRequests 사용
    let totalLeave = 15;
    if (window.LeaveCalculation) {
        // 연차현황과 동일: employeeId가 있으면 사용, 없으면 userIdForRequests 사용
        const idForCalculation = employeeId || userIdForRequests;
        totalLeave = window.LeaveCalculation.calculateLeaveByBranchStandard(idForCalculation);
        console.log(`마이페이지 - 계산 ID: ${idForCalculation}, 계산된 총 연차: ${totalLeave}`);
    } else {
        console.log(`마이페이지 - LeaveCalculation이 없음, 기본값 15일 사용`);
    }

    // 사용한 연차 (승인된 요청 합)
    const currentYear = new Date().getFullYear();
    const approvedUsed = dm.leaveRequests
        .filter(req => (req.employeeId === userIdForRequests || (employeeId !== null && req.employeeId === employeeId))
            && new Date(req.startDate).getFullYear() === currentYear
            && req.status === 'approved')
        .reduce((sum, r) => sum + (r.days || 0), 0);

    // 대기 중인 연차 (연차현황과 동일하게 계산)
    const pendingUsed = dm.leaveRequests
        .filter(req => (req.employeeId === userIdForRequests || (employeeId !== null && req.employeeId === employeeId))
            && new Date(req.startDate).getFullYear() === currentYear
            && req.status === 'pending')
        .reduce((sum, r) => sum + (r.days || 0), 0);

    // 남은 연차 = 총 연차 - 사용 연차 - 대기 중인 연차 (연차현황과 동일)
    const remainingLeave = Math.max(totalLeave - approvedUsed - pendingUsed, 0);

    // UI 업데이트
    document.getElementById('totalLeave').textContent = totalLeave + '일';
    document.getElementById('usedLeave').textContent = approvedUsed + '일';
    document.getElementById('remainingLeave').textContent = remainingLeave + '일';

    // 헤더 배지에 연차계산 기준 표시 (입사일/회계연도)
    const criteriaEl = document.getElementById('leaveCriteriaText');
    if (criteriaEl) {
        let criteria = '입사일 기준';
        if (employee) {
            const branch = dm.branches.find(b => b.name === employee.branch);
            const standard = branch?.leaveCalculationStandard || 'hire_date';
            criteria = standard === 'fiscal_year' ? '회계연도 기준' : '입사일 기준';
        }
        criteriaEl.textContent = criteria;
    }
}

// 휴가 신청 내역 로드 - 연차현황과 동일한 방식으로 수정
function loadLeaveHistory() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // dataManager 사용 (연차현황과 동일)
    const dm = window.dataManager || new DataManager();
    
    // 혼재된 employeeId 값(사용자 id 또는 직원 id) 모두 수용 (연차현황과 동일)
    const employee = dm.employees.find(emp => emp.email === currentUser.email);
    const employeeId = employee ? employee.id : null;
    
    const userLeaveRequests = dm.leaveRequests
        .filter(request => request.employeeId === currentUser.id || (employeeId !== null && request.employeeId === employeeId))
        .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
        .slice(0, 5);

    const leaveHistoryContainer = document.getElementById('leaveHistory');
    
    if (userLeaveRequests.length === 0) {
        leaveHistoryContainer.innerHTML = '<div class="no-data">휴가 신청 내역이 없습니다.</div>';
        return;
    }
    
    // 연차현황과 동일한 HTML 구조로 표시
    let historyHTML = '';
    userLeaveRequests.forEach(request => {
        const statusClass = getStatusClass(request.status);
        const statusText = getStatusText(request.status);
        
        historyHTML += `
            <div class="leave-history-item">
                <div class="leave-info">
                    <div class="leave-type">연차</div>
                    <div class="leave-dates">${request.startDate} ~ ${request.endDate}</div>
                    <div class="leave-days">${request.days}일</div>
                </div>
                <div class="leave-status ${statusClass}">${statusText}</div>
            </div>
        `;
    });

    leaveHistoryContainer.innerHTML = historyHTML;
}

// 상태에 따른 CSS 클래스 반환
function getStatusClass(status) {
    switch (status) {
        case 'approved': return 'status-approved';
        case 'pending': return 'status-pending';
        case 'rejected': return 'status-rejected';
        default: return 'status-pending';
    }
}

// 상태 텍스트 반환
function getStatusText(status) {
    switch (status) {
        case 'approved': return '승인됨';
        case 'pending': return '대기중';
        case 'rejected': return '거부됨';
        default: return '대기중';
    }
}

// 로그아웃 처리는 auth.js에서 전역으로 처리됨

// 유틸리티 함수들
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');
    
    messageElement.textContent = message;
    notification.className = `notification ${type} show`;

    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
}


// 전역 함수들 (HTML에서 호출)
window.removeProfileImage = removeProfileImage;
window.toggleEditMode = toggleEditMode;
window.cancelEdit = cancelEdit;
window.hideNotification = hideNotification;



// 지점관리 스크립트
(function(){
    let dm;
    let currentEditingId = null;
    // 수정 모달에서 기존 연차 계산 기준을 보관하여 변경 여부를 알림으로 안내
    let originalLeaveCalculationStandard = null;

    // 지점 목록 렌더링
    function renderBranchList(branches) {
        const branchList = document.getElementById('branchList');
        if (!branchList) return;

        if (branches.length === 0) {
            branchList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <p>등록된 지점이 없습니다.<br>지점 추가 버튼을 클릭하여 새 지점을 등록하세요.</p>
                </div>
            `;
            return;
        }

        branchList.innerHTML = branches.map(branch => {
            const teamCount = dm.getBranchTeams(branch.name).length;
            return `
            <div class="branch-card" data-id="${branch.id}">
                <div class="branch-header">
                    <h3 class="branch-name">${branch.name}</h3>
                    <div class="branch-actions-btns">
                        <button class="btn-icon btn-edit" onclick="editBranch(${branch.id})" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-teams" onclick="manageBranchTeams('${branch.name}')" title="팀 관리">
                            <i class="fas fa-users"></i>
                            <span class="team-count-badge">${teamCount}</span>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteBranch(${branch.id})" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="branch-info">
                    ${branch.address ? `
                        <div class="branch-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${branch.address}</span>
                        </div>
                    ` : ''}
                    ${branch.phone ? `
                        <div class="branch-info-item">
                            <i class="fas fa-phone"></i>
                            <span>${branch.phone}</span>
                        </div>
                    ` : ''}
                    ${branch.manager ? `
                        <div class="branch-info-item">
                            <i class="fas fa-user-tie"></i>
                            <span>지점장: ${branch.manager}</span>
                        </div>
                    ` : ''}
                    <div class="branch-info-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>연차기준: ${branch.leaveCalculationStandard === 'fiscal_year' ? '회계연도' : '입사일'}</span>
                    </div>
                </div>
                ${branch.description ? `
                    <div class="branch-description">${branch.description}</div>
                ` : ''}
            </div>
        `;
        }).join('');
    }

    // 지점 검색
    function searchBranches(searchTerm) {
        const allBranches = dm.branches || [];
        if (!searchTerm) return allBranches;
        
        return allBranches.filter(branch => 
            branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.manager.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // 지점 추가
    function addBranch() {
        currentEditingId = null;
        openModal();
    }

    // 지점 수정
    function editBranch(id) {
        const branch = dm.branches.find(b => b.id === id);
        if (!branch) return;

        currentEditingId = id;
        openModal(branch);
    }

    // 지점 삭제
    function deleteBranch(id) {
        const branch = dm.branches.find(b => b.id === id);
        if (!branch) return;

        if (confirm(`"${branch.name}" 지점을 삭제하시겠습니까?\n\n이 지점에 속한 직원들의 정보가 영향을 받을 수 있습니다.`)) {
            // 해당 지점의 직원들도 함께 삭제
            dm.employees = dm.employees.filter(emp => emp.branch !== branch.name);
            dm.saveData('employees', dm.employees);

            // 지점 삭제
            dm.branches = dm.branches.filter(b => b.id !== id);
            dm.saveData('branches', dm.branches);
            
            // 해당 지점의 팀 데이터도 삭제
            dm.deleteBranchTeams(branch.name);

            alert('지점이 삭제되었습니다.');
            refreshBranchList();
        }
    }

    // 모달 열기
    function openModal(branch = null) {
        const modal = document.getElementById('branchModal');
        const form = document.getElementById('branchForm');
        const title = document.getElementById('branchModalTitle');
        
        if (!modal || !form || !title) return;

        if (branch) {
            title.textContent = '지점 수정';
            form.name.value = branch.name;
            form.address.value = branch.address || '';
            form.phone.value = branch.phone || '';
            form.manager.value = branch.manager || '';
            form.description.value = branch.description || '';
            form.leaveCalculationStandard.value = branch.leaveCalculationStandard || 'hire_date';
            // 기존 값을 저장하여 저장 시 변경 여부를 확인
            originalLeaveCalculationStandard = branch.leaveCalculationStandard || 'hire_date';
            console.log('지점 수정 모달 열기 - 연차 계산 기준:', branch.leaveCalculationStandard);
        } else {
            title.textContent = '지점 추가';
            form.reset();
            form.leaveCalculationStandard.value = 'hire_date'; // 기본값 설정
            originalLeaveCalculationStandard = 'hire_date';
            console.log('지점 추가 모달 열기 - 기본 연차 계산 기준: hire_date');
        }

        modal.style.display = 'block';
    }

    // 모달 닫기
    function closeModal() {
        const modal = document.getElementById('branchModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 폼 저장
    function saveBranch(formData) {
        const branchData = {
            name: formData.get('name').trim(),
            address: formData.get('address').trim(),
            phone: formData.get('phone').trim(),
            manager: formData.get('manager').trim(),
            description: formData.get('description').trim(),
            leaveCalculationStandard: formData.get('leaveCalculationStandard')
        };
        
        console.log('저장할 지점 데이터:', branchData);

        // 필수 필드 검증
        if (!branchData.name) {
            alert('지점명을 입력해주세요.');
            return false;
        }

        // 중복 검사 (수정 시에는 현재 지점 제외)
        const existingBranch = dm.branches.find(b => 
            b.name === branchData.name && b.id !== currentEditingId
        );
        if (existingBranch) {
            alert('이미 존재하는 지점명입니다.');
            return false;
        }

        if (currentEditingId) {
            // 수정
            const index = dm.branches.findIndex(b => b.id === currentEditingId);
            if (index !== -1) {
                // 기존 데이터와 새 데이터 병합 (연차 계산 기준 포함)
                dm.branches[index] = { 
                    ...dm.branches[index], 
                    ...branchData,
                    leaveCalculationStandard: branchData.leaveCalculationStandard // 확실히 설정
                };
                console.log('지점 수정 완료:', dm.branches[index]);
                // 연차 계산 기준 변경 시 알림
                if (originalLeaveCalculationStandard && originalLeaveCalculationStandard !== branchData.leaveCalculationStandard) {
                    alert('연차 계산 기준이 변경되었습니다. 변경 내용이 저장되었습니다.');
                }
            }
        } else {
            // 추가
            const newId = Math.max(...dm.branches.map(b => b.id), 0) + 1;
            const newBranch = {
                id: newId,
                ...branchData,
                createdAt: new Date().toISOString().split('T')[0]
            };
            dm.branches.push(newBranch);
        }

        dm.saveData('branches', dm.branches);
        closeModal();
        refreshBranchList();
        return true;
    }

    // 목록 새로고침
    function refreshBranchList() {
        const searchTerm = document.getElementById('searchBranch').value;
        const filteredBranches = searchBranches(searchTerm);
        renderBranchList(filteredBranches);
    }

    // 전역 함수로 등록
    window.addBranch = addBranch;
    window.editBranch = editBranch;
    window.deleteBranch = deleteBranch;

    // DOM 로드 완료 시 실행
    window.addEventListener('DOMContentLoaded', function() {
        if (!window.AuthGuard || !AuthGuard.checkAuth()) return;
        
        dm = window.dataManager || new DataManager();
        window.dataManager = dm;

        // 이벤트 리스너 등록
        document.getElementById('addBranchBtn').addEventListener('click', addBranch);
        document.getElementById('searchBranch').addEventListener('input', refreshBranchList);
        document.getElementById('branchForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            // 폼 데이터 확인
            console.log('폼 제출 데이터:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }
            
            if (saveBranch(formData)) {
                this.reset();
            }
        });

        // 모달 닫기 이벤트
        document.getElementById('closeModal').addEventListener('click', closeModal);
        // 취소 버튼으로 모달 닫기
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(){
                closeModal();
            });
        }
        document.getElementById('branchModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // 초기 목록 렌더링
        refreshBranchList();
        
        // 팀 관리 모달 기능 초기화
        initializeTeamManagementModal();
    });

    // 팀 관리 모달 기능 초기화
    function initializeTeamManagementModal() {
        const teamManagementModal = document.getElementById('teamManagementModal');
        const closeBtn = document.getElementById('closeTeamManagementModal');
        const addTeamBtn = document.getElementById('addTeamBtn');
        
        if (!teamManagementModal || !closeBtn || !addTeamBtn) return;

        // 모달 닫기 이벤트
        closeBtn.addEventListener('click', closeTeamManagementModal);

        // 모달 외부 클릭 시 닫기
        teamManagementModal.addEventListener('click', function(e) {
            if (e.target === teamManagementModal) {
                closeTeamManagementModal();
            }
        });

        // 팀 추가 버튼 이벤트
        addTeamBtn.addEventListener('click', function() {
            const currentBranch = document.getElementById('currentBranchName').textContent;
            openTeamModal('add', currentBranch);
        });

        // 팀 모달 이벤트
        setupTeamModalEvents();
    }

    // 지점별 팀 관리 모달 열기
    function manageBranchTeams(branchName) {
        const modal = document.getElementById('teamManagementModal');
        const branchNameElement = document.getElementById('currentBranchName');
        const teamList = document.getElementById('teamList');
        
        if (!modal || !branchNameElement || !teamList) return;

        // 지점명 설정
        branchNameElement.textContent = branchName;
        
        // 팀 목록 렌더링
        renderTeamList(branchName);
        
        // 모달 표시
        modal.style.display = 'block';
    }

    // 팀 관리 모달 닫기
    function closeTeamManagementModal() {
        const modal = document.getElementById('teamManagementModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 팀 목록 렌더링
    function renderTeamList(branchName) {
        const teamList = document.getElementById('teamList');
        if (!teamList) return;

        const teams = dm.getBranchTeams(branchName);
        
        if (teams.length === 0) {
            teamList.innerHTML = `
                <div class="team-empty-state">
                    <i class="fas fa-users"></i>
                    <p>등록된 팀이 없습니다.<br>팀 추가 버튼을 클릭하여 새 팀을 등록하세요.</p>
                </div>
            `;
            return;
        }

        teamList.innerHTML = teams.map(team => `
            <div class="team-item" data-team="${team}">
                <div class="team-info">
                    <h4>${team}</h4>
                    <p>${branchName} 소속 팀</p>
                </div>
                <div class="team-actions">
                    <button class="btn btn-edit" onclick="editTeam('${branchName}', '${team}')">
                        <i class="fas fa-edit"></i> 수정
                    </button>
                    <button class="btn btn-delete" onclick="deleteTeam('${branchName}', '${team}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 빈 팀 상태 표시
    function showEmptyTeamState() {
        const teamList = document.getElementById('teamList');
        if (!teamList) return;

        teamList.innerHTML = `
            <div class="team-empty-state">
                <i class="fas fa-users"></i>
                <p>지점을 선택하면 해당 지점의 팀 목록이 표시됩니다</p>
            </div>
        `;
    }

    // 팀 모달 열기
    function openTeamModal(mode, branchName, teamName = '') {
        const modal = document.getElementById('teamModal');
        const modalTitle = document.getElementById('teamModalTitle');
        const teamNameInput = document.getElementById('teamName');
        const teamDescriptionInput = document.getElementById('teamDescription');
        
        if (!modal || !modalTitle || !teamNameInput) return;

        if (mode === 'add') {
            modalTitle.textContent = '팀 추가';
            teamNameInput.value = '';
            teamNameInput.dataset.mode = 'add';
            teamNameInput.dataset.branch = branchName;
        } else if (mode === 'edit') {
            modalTitle.textContent = '팀 수정';
            teamNameInput.value = teamName;
            teamNameInput.dataset.mode = 'edit';
            teamNameInput.dataset.branch = branchName;
            teamNameInput.dataset.oldName = teamName;
        }

        if (teamDescriptionInput) {
            teamDescriptionInput.value = '';
        }

        modal.style.display = 'block';
    }

    // 팀 모달 이벤트 설정
    function setupTeamModalEvents() {
        const modal = document.getElementById('teamModal');
        const closeBtn = document.getElementById('closeTeamModal');
        const cancelBtn = document.getElementById('cancelTeamBtn');
        const form = document.getElementById('teamForm');

        if (!modal || !closeBtn || !cancelBtn || !form) return;

        // 닫기 이벤트
        closeBtn.addEventListener('click', closeTeamModal);
        cancelBtn.addEventListener('click', closeTeamModal);

        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeTeamModal();
            }
        });

        // 폼 제출 이벤트
        form.addEventListener('submit', handleTeamSubmit);
    }

    // 팀 모달 닫기
    function closeTeamModal() {
        const modal = document.getElementById('teamModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 팀 폼 제출 처리
    function handleTeamSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const teamName = formData.get('name').trim();
        const teamDescription = formData.get('description').trim();
        
        const teamNameInput = document.getElementById('teamName');
        
        if (!teamName) {
            alert('팀명을 입력해주세요.');
            return;
        }

        const mode = teamNameInput.dataset.mode;
        const branchName = teamNameInput.dataset.branch;

        if (mode === 'add') {
            if (dm.addBranchTeam(branchName, teamName)) {
                alert('팀이 추가되었습니다.');
                renderTeamList(branchName);
                refreshBranchList(); // 지점 카드의 팀 개수 업데이트
                closeTeamModal();
            } else {
                alert('이미 존재하는 팀명입니다.');
            }
        } else if (mode === 'edit') {
            const oldTeamName = teamNameInput.dataset.oldName;
            if (dm.updateBranchTeam(branchName, oldTeamName, teamName)) {
                alert('팀이 수정되었습니다.');
                renderTeamList(branchName);
                refreshBranchList(); // 지점 카드의 팀 개수 업데이트
                closeTeamModal();
            } else {
                alert('팀 수정에 실패했습니다.');
            }
        }
    }

    // 팀 수정
    function editTeam(branchName, teamName) {
        openTeamModal('edit', branchName, teamName);
    }

    // 팀 삭제
    function deleteTeam(branchName, teamName) {
        if (confirm(`"${teamName}" 팀을 삭제하시겠습니까?\n\n이 팀에 속한 직원들의 부서 정보가 영향을 받을 수 있습니다.`)) {
            if (dm.removeBranchTeam(branchName, teamName)) {
                alert('팀이 삭제되었습니다.');
                renderTeamList(branchName);
                refreshBranchList(); // 지점 카드의 팀 개수 업데이트
            } else {
                alert('팀 삭제에 실패했습니다.');
            }
        }
    }

    // 전역 함수로 등록
    window.editTeam = editTeam;
    window.deleteTeam = deleteTeam;
    window.manageBranchTeams = manageBranchTeams;
})();
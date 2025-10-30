// 연차승인 스크립트 - 일괄선택 기능 추가 (이벤트 충돌 해결 버전)
(function(){
  let dm;
  let selectedItems = new Set(); // 선택된 항목 ID를 저장하는 Set
  
  // 페이지네이션 관련 변수
  let currentPage = 1;
  let itemsPerPage = 10; // 페이지당 항목 수
  let totalPages = 1;
  
  // 지점별 색상 캐시 (동적 생성)
  const branchColorCache = {};

  // 지점 필터 동적 로드 함수
  function loadBranchFilter() {
    const branchFilter = document.getElementById('branchFilter');
    if (!branchFilter || !dm) return;
    
    // 기존 옵션 제거 (전체 지점 제외)
    const allOption = branchFilter.querySelector('option[value="all"]');
    branchFilter.innerHTML = '';
    if (allOption) {
      branchFilter.appendChild(allOption);
    }
    
    // 실제 등록된 지점들 추가
    const branches = dm.branches || [];
    console.log('로드된 지점 데이터:', branches);
    
    branches.forEach(branch => {
      const option = document.createElement('option');
      option.value = branch.name;
      option.textContent = branch.name;
      branchFilter.appendChild(option);
    });
    
    // 직원 데이터에서 지점 추출 (fallback)
    if (branches.length === 0) {
      const employeeBranches = [...new Set(dm.employees.map(emp => emp.branch).filter(Boolean))];
      console.log('직원 데이터에서 추출한 지점:', employeeBranches);
      
      employeeBranches.forEach(branchName => {
        const option = document.createElement('option');
        option.value = branchName;
        option.textContent = branchName;
        branchFilter.appendChild(option);
      });
    }
  }

  // 부서 필터 동적 로드 함수
  function loadDepartmentFilter() {
    const departmentFilter = document.getElementById('departmentFilter');
    if (!departmentFilter || !dm) return;
    
    // 기존 옵션 제거 (전체 부서 제외)
    const allOption = departmentFilter.querySelector('option[value="all"]');
    departmentFilter.innerHTML = '';
    if (allOption) {
      departmentFilter.appendChild(allOption);
    }
    
    // 직원 데이터에서 부서 정보 추출
    const employeeDepartments = [...new Set(dm.employees.map(emp => emp.department).filter(Boolean))];
    console.log('등록된 부서들:', employeeDepartments);
    
    employeeDepartments.forEach(departmentName => {
      const option = document.createElement('option');
      option.value = departmentName;
      option.textContent = departmentName;
      departmentFilter.appendChild(option);
    });
  }

  function generateBranchColor(branch) {
    // 이미 캐시된 색상이 있으면 반환
    if (branchColorCache[branch]) {
      return branchColorCache[branch];
    }

    // 지점명을 해시하여 일관된 색상 생성
    let hash = 0;
    for (let i = 0; i < branch.length; i++) {
      hash = branch.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 해시값을 기반으로 HSL 색상 생성
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash) % 20); // 70-90%
    const lightness = 85 + (Math.abs(hash) % 10); // 85-95% (연한 배경)
    
    const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const textColor = `hsl(${hue}, ${saturation}%, 30%)`; // 진한 텍스트
    const borderColor = `hsl(${hue}, ${saturation}%, 60%)`; // 중간 톤 테두리

    const colorScheme = {
      bg: bgColor,
      color: textColor,
      border: borderColor
    };

    // 캐시에 저장
    branchColorCache[branch] = colorScheme;
    return colorScheme;
  }

  function getBranchStyle(branch) {
    const colorScheme = generateBranchColor(branch);
    return `background: ${colorScheme.bg}; color: ${colorScheme.color}; border: 1px solid ${colorScheme.border};`;
  }

  function render(list){
    const wrap=document.getElementById('approvalList');
    if(!wrap) return;
    
    // 페이지네이션 계산
    totalPages = Math.ceil(list.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedList = list.slice(startIndex, endIndex);
    
    if(list.length===0){ 
      wrap.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>검색 조건에 맞는 신청이 없습니다.</p></div>'; 
      updatePagination(list.length);
      return; 
    }
    
    wrap.innerHTML = paginatedList.map(r=>{
      const employee = resolveEmployee(r);
      const branch = employee ? (employee.branch || '-') : '-';
      const department = employee ? (employee.department || '-') : '-';
      const isSelected = selectedItems.has(r.id); // 현재 항목이 선택되었는지 확인
      const branchStyle = getBranchStyle(branch);
      const leaveTypeText = r.leaveType === '복지휴가' ? '복지휴가' : 
                           r.leaveType === '법정연차' ? '법정연차' :
                           r.leaveType || '기타';
      // 사유 표시: reasonType 우선, 사람이 읽는 텍스트로 변환
      const reasonMap = {
        personal: '개인사정',
        sick: '병가',
        vacation: '휴가',
        family: '가족사정',
        other: '기타',
        half_morning: '반차(오전)',
        half_afternoon: '반차(오후)'
      };
      const key = String(r.reasonType || '').trim();
      const humanReason = reasonMap[key] || '';
      const detail = (r.reason && r.reason !== 'null') ? r.reason : '';
      const reasonText = humanReason ? (detail ? `${humanReason} - ${detail}` : humanReason) : (detail || '-');
      
      return `
        <div class="approval-item ${isSelected ? 'selected' : ''}" data-id="${r.id}">
          <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} data-id="${r.id}">
          <div>
            <div style="margin-bottom: 0.25rem;"><strong>${r.employeeName}</strong> <span class="status-badge ${r.status}">${statusText(r.status)}</span> <span class="approval-branch" style="${branchStyle}">${branch}</span> <span class="approval-dept">${department}</span></div>
            <div class="approval-meta" style="margin-bottom: 0.15rem;">기간: ${r.startDate} ~ ${r.endDate} (${r.days}일)  신청일: ${r.requestDate || '-'}</div>
            <div class="approval-meta">유형: <span class="leave-type-badge ${r.leaveType}">${leaveTypeText}</span>  사유: ${reasonText}</div>
          </div>
          <div class="approval-actions">
            ${r.status==='pending' ? `
              <button class="btn-small btn-approve" data-act="approve" data-id="${r.id}"><i class="fas fa-check"></i> 승인</button>
              <button class="btn-small btn-reject" data-act="reject" data-id="${r.id}"><i class="fas fa-times"></i> 거부</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    updateBulkButtons(); // 렌더링 후 일괄 버튼 상태 업데이트
    updatePagination(list.length); // 페이지네이션 업데이트 (전체 리스트 길이)
  }
  
  function statusText(s){return s==='pending'?'대기중':s==='approved'?'승인됨':s==='rejected'?'거부됨':s}
  
  function getFiltered(){
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const branchFilter = document.getElementById('branchFilter').value;
    const departmentFilter = document.getElementById('departmentFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const leaveTypeFilter = document.getElementById('leaveTypeFilter').value;
    const reqs = dm.leaveRequests || [];
    
    return reqs.filter(r => {
      const employee = resolveEmployee(r);
      const branch = employee ? (employee.branch || '') : '';
      const department = employee ? (employee.department || '') : '';
      
      const matchesSearch = !searchTerm || r.employeeName.toLowerCase().includes(searchTerm);
      const matchesBranch = branchFilter === 'all' || branch === branchFilter;
      const matchesDepartment = departmentFilter === 'all' || department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      let matchesLeaveType = true;
      if (leaveTypeFilter !== 'all') {
        if (leaveTypeFilter === 'annual') {
          matchesLeaveType = !r.leaveType || !r.leaveType.startsWith('복지');
        } else if (leaveTypeFilter === 'welfare') {
          matchesLeaveType = r.leaveType && r.leaveType.startsWith('복지');
        }
      }
      
      return matchesSearch && matchesBranch && matchesDepartment && matchesStatus && matchesLeaveType;
    });
  }

  // 직원 정보 해석 (employeeId/userId/이름 기준 모두 시도)
  function resolveEmployee(request){
    if (!dm) return null;
    // 1) employeeId가 직원 ID인 경우
    let emp = dm.employees.find(e => e.id === request.employeeId);
    if (emp) return emp;
    // 2) employeeId가 사용자 ID인 경우 -> 사용자 이메일로 직원 찾기
    if (dm.users) {
      const user = dm.users.find(u => u.id === request.employeeId || u.email === request.employeeName);
      if (user) {
        emp = dm.employees.find(e => e.email === user.email);
        if (emp) return emp;
      }
    }
    // 3) 이름으로 매칭 (동명이인 가능하므로 마지막 수단)
    emp = dm.employees.find(e => e.name === request.employeeName);
    return emp || null;
  }
  
  function updateBulkButtons(){
    const pendingSelected = Array.from(selectedItems).filter(id => {
      const req = dm.leaveRequests.find(r => r.id === id);
      return req && req.status === 'pending';
    });

    document.getElementById('bulkApprove').disabled = pendingSelected.length === 0;
    document.getElementById('bulkReject').disabled = pendingSelected.length === 0;
    document.getElementById('selectedCount').textContent = `선택된 항목: ${selectedItems.size}개`;       
    
    // 전체 선택 체크박스 상태 업데이트
    const filteredList = getFiltered();
    const pendingList = filteredList.filter(r => r.status === 'pending');
    const selectedPending = pendingList.filter(r => selectedItems.has(r.id));

    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.disabled = pendingList.length === 0;
    if(pendingList.length === 0){
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if(selectedPending.length === 0){
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if(selectedPending.length === pendingList.length){
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
  
  function refresh(){ 
    currentPage = 1; // 필터 변경 시 첫 페이지로 이동
    render(getFiltered()); 
  }

  // 항목 갯수 설정 변경 처리
  function handleItemsPerPageChange() {
    const newItemsPerPage = parseInt(document.getElementById('itemsPerPageFilter').value);
    itemsPerPage = newItemsPerPage;
    currentPage = 1; // 항목 갯수 변경 시 첫 페이지로 이동
    render(getFiltered());
  }

  // 페이지네이션 업데이트
  function updatePagination(totalItems) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (!pagination || !prevBtn || !nextBtn || !pageNumbers) return;
    
    // 페이지네이션 정보 업데이트
    if (paginationInfo) {
      const startItem = (currentPage - 1) * itemsPerPage + 1;
      const endItem = Math.min(currentPage * itemsPerPage, totalItems);
      paginationInfo.textContent = `${startItem}-${endItem} / 총 ${totalItems}개`;
    }
    
    // 페이지네이션 항상 표시
    pagination.style.display = 'flex';
    
    // 이전/다음 버튼 상태 업데이트
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // 페이지 번호 생성
    pageNumbers.innerHTML = '';
    
    // 표시할 페이지 번호 계산 (최대 5개)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // 끝 페이지가 조정되면 시작 페이지도 조정
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    // 첫 페이지가 1이 아니면 "..." 표시
    if (startPage > 1) {
      const firstPageBtn = document.createElement('button');
      firstPageBtn.textContent = '1';
      firstPageBtn.className = 'page-number';
      firstPageBtn.addEventListener('click', () => goToPage(1));
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
      pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
      pageBtn.addEventListener('click', () => goToPage(i));
      pageNumbers.appendChild(pageBtn);
    }
    
    // 마지막 페이지가 끝 페이지가 아니면 "..." 표시
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'page-dots';
        pageNumbers.appendChild(dots);
      }
      
      const lastPageBtn = document.createElement('button');
      lastPageBtn.textContent = totalPages;
      lastPageBtn.className = 'page-number';
      lastPageBtn.addEventListener('click', () => goToPage(totalPages));
      pageNumbers.appendChild(lastPageBtn);
    }
  }
  
  // 페이지 이동
  function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    render(getFiltered());
  }

  // 템플릿 다운로드(Excel) - 한국어 헤더
  function downloadTemplate(){
    try {
      // SheetJS 라이브러리가 로드되었는지 확인
      if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      
      const header = ['이메일','시작일','종료일','일수','유형','사유'];
      const examples = [
        ['user1@company.com','2025-01-15','2025-01-17','3','법정연차','가족 행사'],
        ['user2@company.com','2025-01-20','2025-01-20','1','복지휴가','복지휴가 사용'],
        ['user3@company.com','2025-01-25','2025-01-25','1','개인사정','개인 용무'],
        ['user4@company.com','2025-02-01','2025-02-03','3','병가','감기로 인한 휴가']
      ];
      
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      
      // 데이터 시트 생성
      const ws_data = [header, ...examples];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      
      // 컬럼 너비 설정
      ws['!cols'] = [
        { wch: 25 }, // 이메일
        { wch: 12 }, // 시작일
        { wch: 12 }, // 종료일
        { wch: 8 },  // 일수
        { wch: 12 }, // 유형
        { wch: 20 }  // 사유
      ];
      
      // 시트를 워크북에 추가
      XLSX.utils.book_append_sheet(wb, ws, '연차등록');
      
      // 파일 다운로드
      XLSX.writeFile(wb, '연차등록_양식.xlsx');
      
      console.log('양식 다운로드 완료');
    } catch (error) {
      console.error('양식 다운로드 오류:', error);
      alert('양식 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
  }

  // 엑셀/CSV 업로드 파서(간단 CSV 지원) - 한국어/영어 헤더 모두 지원
  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().split(',').map(h=>h.trim());
    
    // 한국어 헤더를 영어로 매핑
    const headerMapping = {
      '이메일': 'email',
      '시작일': 'startDate', 
      '종료일': 'endDate',
      '일수': 'days',
      '유형': 'type',
      '사유': 'reason'
    };
    
    // 헤더를 영어로 변환
    const normalizedHeader = header.map(h => headerMapping[h] || h);
    
    return lines.map(line => {
      const cols = line.split(',').map(c=>c.trim());
      const row = {}; 
      normalizedHeader.forEach((h,i)=>row[h]=cols[i]||'');
      return row;
    });
  }

  function handleExcelUpload(file){
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let rows = [];
        
        // 파일 확장자에 따라 처리 방식 결정
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // 엑셀 파일 처리
          if (typeof XLSX === 'undefined') {
            alert('엑셀 라이브러리가 로드되지 않았습니다. CSV 파일을 사용해주세요.');
            return;
          }
          
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            alert('엑셀 파일에 데이터가 없습니다.');
            return;
          }
          
          // 헤더와 데이터 분리
          const header = jsonData[0];
          const dataRows = jsonData.slice(1);
          
          // 한국어 헤더를 영어로 매핑
          const headerMapping = {
            '이메일': 'email',
            '시작일': 'startDate', 
            '종료일': 'endDate',
            '일수': 'days',
            '유형': 'type',
            '사유': 'reason'
          };
          
          // 헤더를 영어로 변환
          const normalizedHeader = header.map(h => headerMapping[h] || h);
          
          // 데이터를 객체 배열로 변환
          rows = dataRows.map(row => {
            const obj = {};
            normalizedHeader.forEach((h, i) => {
              let value = row[i] || '';
              
              // 날짜 필드인 경우 엑셀 날짜 일련번호를 실제 날짜로 변환
              if ((h === 'startDate' || h === 'endDate') && typeof value === 'number') {
                // 엑셀 날짜 일련번호를 JavaScript Date로 변환
                // 엑셀은 1900년 1월 1일을 기준으로 하므로 정확한 계산
                const excelEpoch = new Date(1900, 0, 1);
                const jsDate = new Date(excelEpoch.getTime() + (value - 1) * 86400000);
                value = jsDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
              }
              
              obj[h] = value;
            });
            return obj;
          });
          
        } else if (fileName.endsWith('.csv')) {
          // CSV 파일 처리
          const text = e.target.result;
          rows = parseCSV(text);
        } else {
          alert('지원하지 않는 파일 형식입니다. .xlsx, .xls, .csv 파일만 지원됩니다.');
          return;
        }
        
        let added = 0; let skipped = 0;
        let skippedReasons = [];
        
        // 한국어 유형을 영어로 매핑
        const typeMapping = {
          '법정연차': 'vacation',
          '복지휴가': 'welfare-vacation',
          '개인사정': 'personal', 
          '병가': 'sick',
          '기타': 'other'
        };
        
        console.log('엑셀 업로드 시작:', { 
          totalRows: rows.length, 
          employeesCount: dm.employees.length,
          employees: dm.employees.map(e => ({ email: e.email, name: e.name }))
        });
        
        rows.forEach((row, index) => {
          console.log(`행 ${index + 1} 처리:`, row);
          
          const email = row.email; 
          const employee = dm.employees.find(e => e.email === email);
          
          if(!employee){ 
            skipped++; 
            skippedReasons.push(`행 ${index + 1}: 이메일 '${email}'에 해당하는 직원을 찾을 수 없습니다.`);
            console.log(`건너뜀 - 직원 없음: ${email}`);
            return; 
          }
          
          // 기본 검증
          if(!row.startDate || !row.endDate || !row.days || !row.type){ 
            skipped++; 
            skippedReasons.push(`행 ${index + 1}: 필수 필드 누락 (시작일: ${row.startDate}, 종료일: ${row.endDate}, 일수: ${row.days}, 유형: ${row.type})`);
            console.log(`건너뜀 - 필수 필드 누락:`, { startDate: row.startDate, endDate: row.endDate, days: row.days, type: row.type });
            return; 
          }
          
          // 유형을 영어로 변환 (한국어인 경우)
          const normalizedType = typeMapping[row.type] || row.type;
          
          const req = {
            id: Date.now()+Math.floor(Math.random()*10000),
            employeeId: employee.id,
            employeeName: employee.name || email,
            startDate: row.startDate,
            endDate: row.endDate,
            days: parseFloat(row.days),
            type: normalizedType,
            reason: row.reason || '',
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0]
          };
          
          dm.leaveRequests.push(req); 
          added++;
          console.log(`추가됨: ${employee.name} (${email})`);
        });
        
        dm.saveData('leaveRequests', dm.leaveRequests);
        
        // 상세한 결과 메시지 생성
        let message = `업로드 완료: 추가 ${added}건, 건너뜀 ${skipped}건`;
        if(skippedReasons.length > 0 && skippedReasons.length <= 5) {
          message += '\n\n건너뜀 사유:\n' + skippedReasons.join('\n');
        } else if(skippedReasons.length > 5) {
          message += '\n\n건너뜀 사유 (처음 5개):\n' + skippedReasons.slice(0, 5).join('\n') + `\n... 외 ${skippedReasons.length - 5}개`;
        }
        
        alert(message);
        refresh();
        
      } catch (error) {
        console.error('파일 처리 오류:', error);
        alert('파일 처리 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
      }
    };
    
    // 파일 타입에 따라 읽기 방식 결정
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  }
  
  // 개별 항목 클릭 처리 (승인/거부 버튼, 체크박스)
  function handleItemClick(e){
    const t=e.target.closest('button');
    if(t){
      const id=Number(t.getAttribute('data-id'));
      const act=t.getAttribute('data-act');
      if(act==='approve' && confirm('승인하시겠습니까?')){
        dm.updateLeaveRequestStatus(id,'approved');
        selectedItems.delete(id); // 개별 처리 후 선택 해제
        refresh();
      }
      if(act==='reject' && confirm('거부하시겠습니까?')){
        dm.updateLeaveRequestStatus(id,'rejected');
        selectedItems.delete(id); // 개별 처리 후 선택 해제
        refresh();
      }
      return;
    }

    // 체크박스 클릭 처리
    const checkbox = e.target.closest('.item-checkbox');
    if(checkbox){
      const id = Number(checkbox.getAttribute('data-id'));
      if(checkbox.checked){
        selectedItems.add(id);
      } else {
        selectedItems.delete(id);
      }
      updateBulkButtons();
      refresh(); // 체크박스 상태 반영을 위해 리프레시
      return;
    }
  }

  // 전체 선택 체크박스 처리
  function handleSelectAll(e){
    const filteredList = getFiltered();
    const pendingList = filteredList.filter(r => r.status === 'pending'); // 대기중인 항목만 선택 대상

    if(e.target.checked){
      pendingList.forEach(r => selectedItems.add(r.id));
    } else {
      pendingList.forEach(r => selectedItems.delete(r.id));
    }
    updateBulkButtons();
    refresh();
  }

  // 일괄 승인 처리
  function handleBulkApprove(e){
    e.preventDefault();
    e.stopPropagation();
    console.log('일괄승인 버튼 클릭됨!');
    
    // 선택된 항목들만 가져오기
    const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => Number(cb.getAttribute('data-id')));
    
    console.log('선택된 항목 ID들:', selectedIds);
    
    if(selectedIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    
    // 선택된 항목 중 대기중인 것만 필터링
    const selectedPendingRequests = dm.leaveRequests.filter(req => 
      selectedIds.includes(req.id) && req.status === 'pending'
    );
    
    console.log('선택된 대기중인 요청들:', selectedPendingRequests);
    
    if(selectedPendingRequests.length === 0) {
      alert('선택된 항목 중 처리할 대기중인 요청이 없습니다.');
      return;
    }
    
    if(confirm(`선택된 ${selectedPendingRequests.length}개 요청을 승인하시겠습니까?`)){
      selectedPendingRequests.forEach(request => {
        dm.updateLeaveRequestStatus(request.id, 'approved');
        selectedItems.delete(request.id);
      });
      refresh();
    }
  }

  // 일괄 거부 처리
  function handleBulkReject(e){
    e.preventDefault();
    e.stopPropagation();
    console.log('일괄거부 버튼 클릭됨!');
    
    // 선택된 항목들만 가져오기
    const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => Number(cb.getAttribute('data-id')));
    
    console.log('선택된 항목 ID들:', selectedIds);
    
    if(selectedIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    
    // 선택된 항목 중 대기중인 것만 필터링
    const selectedPendingRequests = dm.leaveRequests.filter(req => 
      selectedIds.includes(req.id) && req.status === 'pending'
    );
    
    console.log('선택된 대기중인 요청들:', selectedPendingRequests);
    
    if(selectedPendingRequests.length === 0) {
      alert('선택된 항목 중 처리할 대기중인 요청이 없습니다.');
      return;
    }
    
    if(confirm(`선택된 ${selectedPendingRequests.length}개 요청을 거부하시겠습니까?`)){
      selectedPendingRequests.forEach(request => {
        dm.updateLeaveRequestStatus(request.id, 'rejected');
        selectedItems.delete(request.id);
      });
      refresh();
    }
  }
  
  window.addEventListener('DOMContentLoaded', function(){
    if(!window.AuthGuard || !AuthGuard.checkAuth()) return;
    
    // 관리자 권한 체크
    if (!AuthGuard.checkAdminAccess()) return;
    
    dm = window.dataManager || new DataManager(); 
    window.dataManager = dm;

    // 지점 필터 초기화
    loadBranchFilter();

    // 부서 필터 초기화
    loadDepartmentFilter();

    // 이벤트 리스너 설정 - 각각 분리된 핸들러 사용
    document.getElementById('searchInput').addEventListener('input', refresh);
    document.getElementById('branchFilter').addEventListener('change', refresh);
    document.getElementById('departmentFilter').addEventListener('change', refresh);
    document.getElementById('statusFilter').addEventListener('change', refresh);
    document.getElementById('leaveTypeFilter').addEventListener('change', refresh);
    document.getElementById('itemsPerPageFilter').addEventListener('change', handleItemsPerPageChange);
    document.getElementById('approvalList').addEventListener('click', handleItemClick);
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);
    document.getElementById('bulkApprove').addEventListener('click', handleBulkApprove);
    document.getElementById('bulkReject').addEventListener('click', handleBulkReject);
    
    // 페이지네이션 이벤트 리스너
    document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => goToPage(currentPage + 1));

    // 템플릿 다운로드
    const btnTpl = document.getElementById('btnDownloadTemplate');
    if(btnTpl) btnTpl.addEventListener('click', downloadTemplate);


    // 엑셀 업로드
    const excelInput = document.getElementById('excelUpload');
    if(excelInput) excelInput.addEventListener('change', (e)=>{ if(e.target.files[0]) handleExcelUpload(e.target.files[0]); });

    // 연차 등록 모달
    const btnAdd = document.getElementById('btnAddRequest');
    const modal = document.getElementById('adminAddModal');
    const closeBtn = document.getElementById('adminAddClose');
    const cancelBtn = document.getElementById('adminAddCancel');
    const form = document.getElementById('adminAddForm');

    function closeModal(){ 
      if(modal){ 
        modal.style.display='none'; 
        document.body.style.overflow='auto';
        
        // 폼 완전 초기화
        if(form) {
          form.reset();
        }
        
        // 검색 필드 초기화
        if(admEmployeeSearch) {
          admEmployeeSearch.value = '';
          selectedEmployee = null;
        }
        if(admEmployeeList) {
          admEmployeeList.style.display = 'none';
        }
        
        // 날짜 필드 초기화
        if(admStart) admStart.value = '';
        if(admEnd) admEnd.value = '';
        if(admDays) admDays.value = '';
        
        // 유형 초기화
        if(admType) admType.value = 'vacation';
        
        // 사유 초기화
        if(admReason) admReason.value = '';
        if(admReasonGroup) admReasonGroup.style.display = 'none';
      } 
    }

    if(btnAdd && modal){
      btnAdd.addEventListener('click', ()=>{ modal.style.display='block'; document.body.style.overflow='hidden'; });
    }
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // 모달 내 일수 자동 계산 및 사유 토글
    const admStart = document.getElementById('adm-start');
    const admEnd = document.getElementById('adm-end');
    const admDays = document.getElementById('adm-days');
    const admType = document.getElementById('adm-type');
    const admReason = document.getElementById('adm-reason');
    const admReasonGroup = document.getElementById('adm-reason-group');
    const admEmployee = document.getElementById('adm-employee');
    const admEmployeeSearch = document.getElementById('adm-employee-search');
    const admEmployeeList = document.getElementById('adm-employee-list');
    let selectedEmployee = null;

    // 직원 검색 기능
    function searchEmployees(query) {
      if (!query || query.length < 1) {
        admEmployeeList.style.display = 'none';
        return;
      }

      const filteredEmployees = dm.employees.filter(emp => 
        emp.name.toLowerCase().includes(query.toLowerCase()) ||
        emp.email.toLowerCase().includes(query.toLowerCase()) ||
        (emp.department && emp.department.toLowerCase().includes(query.toLowerCase())) ||
        (emp.branch && emp.branch.toLowerCase().includes(query.toLowerCase()))
      );

      if (filteredEmployees.length === 0) {
        admEmployeeList.innerHTML = '<div class="employee-dropdown-item">검색 결과가 없습니다.</div>';
      } else {
        admEmployeeList.innerHTML = '';
        filteredEmployees.forEach(emp => {
          const item = document.createElement('div');
          item.className = 'employee-dropdown-item';
          // 지점별 색상 생성
          const branchStyle = emp.branch ? getBranchStyle(emp.branch) : '';
          
          item.innerHTML = `
            <div class="employee-info">
              <div class="employee-name">${emp.name}</div>
              <div class="employee-email">${emp.email}</div>
              <div class="employee-details">
                ${emp.branch ? `<span class="employee-branch" style="${branchStyle}">${emp.branch}</span>` : ''}
                ${emp.department ? `<span class="employee-department">${emp.department}</span>` : ''}
              </div>
            </div>
          `;
          item.addEventListener('click', () => selectEmployee(emp));
          admEmployeeList.appendChild(item);
        });
      }
      admEmployeeList.style.display = 'block';
    }

    // 직원 선택
    function selectEmployee(emp) {
      selectedEmployee = emp;
      admEmployeeSearch.value = `${emp.name} (${emp.email})`;
      admEmployeeList.style.display = 'none';
      console.log('직원 선택됨:', emp);
    }

    // 검색 입력 이벤트
    if (admEmployeeSearch) {
      admEmployeeSearch.addEventListener('input', (e) => {
        searchEmployees(e.target.value);
      });

      admEmployeeSearch.addEventListener('focus', (e) => {
        if (e.target.value) {
          searchEmployees(e.target.value);
        }
      });

      // 외부 클릭 시 드롭다운 숨기기
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.form-group')) {
          admEmployeeList.style.display = 'none';
        }
      });
    }

    // 모달이 열릴 때마다 완전 초기화
    if(btnAdd && modal){
      btnAdd.addEventListener('click', ()=>{ 
        modal.style.display='block'; 
        document.body.style.overflow='hidden';
        
        // 폼 완전 초기화
        if(form) {
          form.reset();
        }
        
        // 검색 필드 초기화
        if(admEmployeeSearch) {
          admEmployeeSearch.value = '';
          selectedEmployee = null;
        }
        if(admEmployeeList) {
          admEmployeeList.style.display = 'none';
        }
        
        // 날짜 필드 초기화
        if(admStart) admStart.value = '';
        if(admEnd) admEnd.value = '';
        if(admDays) admDays.value = '';
        
        // 유형 초기화
        if(admType) admType.value = 'vacation';
        
        // 사유 초기화
        if(admReason) admReason.value = '';
        if(admReasonGroup) admReasonGroup.style.display = 'none';
        
        // 사유 토글 초기화
        if(admType) {
          toggleAdmReason();
        }
        
        // 종료일 최소값 설정 (오늘 날짜)
        const today = new Date().toISOString().split('T')[0];
        if(admEnd) {
          admEnd.min = today;
        }
      });
    }

    function calcAdmDays(){
      if(!admStart.value || !admEnd.value) return;
      const s=new Date(admStart.value); const e=new Date(admEnd.value);
      if(s>e) return; const diff=(e-s)/(1000*60*60*24)+1; admDays.value = diff;
    }

    // 날짜 유효성 검사 함수
    function validateDates() {
      if (!admStart.value || !admEnd.value) return true;
      
      const startDate = new Date(admStart.value);
      const endDate = new Date(admEnd.value);
      
      if (endDate < startDate) {
        alert('종료일은 시작일보다 이전일 수 없습니다.');
        admEnd.value = admStart.value; // 종료일을 시작일과 같게 설정
        calcAdmDays(); // 일수 재계산
        return false;
      }
      return true;
    }

    // 시작일 변경 시 종료일 최소값 설정
    function updateEndDateMin() {
      if (admStart.value && admEnd) {
        admEnd.min = admStart.value;
        // 종료일이 시작일보다 이전이면 시작일로 설정
        if (admEnd.value && new Date(admEnd.value) < new Date(admStart.value)) {
          admEnd.value = admStart.value;
          calcAdmDays();
        }
      }
    }

    if(admStart) {
      admStart.addEventListener('change', () => {
        updateEndDateMin();
        calcAdmDays();
      });
    }
    if(admEnd) {
      admEnd.addEventListener('change', () => {
        validateDates();
        calcAdmDays();
      });
    }
    function toggleAdmReason(){ 
      const isOther = admType.value==='other'; 
      admReasonGroup.style.display=isOther?'':'none'; 
      admReason.disabled=!isOther; 
      if(!isOther) {
        // 기타가 아닌 경우 해당 유형을 사유에 자동 입력
        const typeMap = {
          'vacation': '법정연차',
          'welfare-vacation': '복지휴가',
          'personal': '개인사정', 
          'sick': '병가'
        };
        admReason.value = typeMap[admType.value] || '';
      }
    }
    if(admType){ toggleAdmReason(); admType.addEventListener('change', toggleAdmReason); }

    if(form){
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        console.log('폼 제출 시도:', {selectedEmployee, admStart: admStart.value, admEnd: admEnd.value, admDays: admDays.value});
        
        if(!selectedEmployee){ 
          alert('직원을 선택해주세요.'); 
          return; 
        }
        const emp = selectedEmployee;
        if(!admStart.value || !admEnd.value || !admDays.value){ 
          alert('날짜/일수 입력을 확인해주세요.'); 
          return; 
        }
        
        // 날짜 유효성 검사
        if (!validateDates()) {
          return;
        }
        const req = {
          id: Date.now()+Math.floor(Math.random()*10000),
          employeeId: emp.id,
          employeeName: emp.name || emp.email,
          startDate: admStart.value,
          endDate: admEnd.value,
          days: parseFloat(admDays.value),
          type: admType.value,
          reason: admType.value==='other' ? (admReason.value || '') : (admReason.value || ''),
          status: 'pending',
          requestDate: new Date().toISOString().split('T')[0]
        };
        dm.leaveRequests.push(req); 
        dm.saveData('leaveRequests', dm.leaveRequests);
        console.log('연차 등록 성공:', req);
        alert('연차 신청이 등록되었습니다.');
        
        // 모달 완전 초기화 후 닫기
        closeModal(); 
        refresh();
      });
    }

    // 지점 데이터 변경 감지 및 필터 업데이트
    const originalSaveData = dm.saveData;
    dm.saveData = function(key, data) {
      const result = originalSaveData.call(this, key, data);
      if (key === 'branches' || key === 'employees') {
        // 지점 데이터나 직원 데이터가 변경되면 필터 업데이트
        setTimeout(() => {
          loadBranchFilter();
          loadDepartmentFilter();
          refresh();
        }, 100);
      }
      return result;
    };

    // 로그아웃 처리는 auth.js에서 전역으로 처리됨
    refresh();
  });
})();

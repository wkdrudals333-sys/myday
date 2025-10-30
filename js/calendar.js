// FullCalendar 기반 연차 캘린더
(function(){
    let calendar;
    let allEvents = [];
    
    // 동적 지점별 색상 시스템
    const predefinedColors = [
        '#1976d2', // 파란색
        '#388e3c', // 초록색
        '#f57c00', // 주황색
        '#7b1fa2', // 보라색
        '#d32f2f', // 빨간색
        '#00796b', // 청록색
        '#5d4037', // 갈색
        '#455a64', // 회색
        '#e91e63', // 분홍색
        '#ff9800', // 주황색2
        '#4caf50', // 초록색2
        '#2196f3', // 파란색2
        '#9c27b0', // 보라색2
        '#ff5722', // 빨간색2
        '#00bcd4', // 청록색2
        '#795548'  // 갈색2
    ];
    
    let branchColors = {}; // 동적으로 할당된 색상 저장
    
    // 지점별 색상 동적 할당 함수
    function getBranchColor(branchName) {
        if (!branchName) return '#cccccc'; // 기본 회색
        
        // 이미 할당된 색상이 있으면 반환
        if (branchColors[branchName]) {
            return branchColors[branchName];
        }
        
        // 새로운 지점이면 다음 색상 할당
        const usedColors = Object.values(branchColors);
        let availableColor = predefinedColors.find(color => !usedColors.includes(color));
        
        // 모든 색상이 사용되었으면 랜덤 색상 생성
        if (!availableColor) {
            availableColor = generateRandomColor();
        }
        
        branchColors[branchName] = availableColor;
        console.log(`지점 "${branchName}"에 색상 "${availableColor}" 할당됨`);
        
        return availableColor;
    }
    
    // 랜덤 색상 생성 함수
    function generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
        const lightness = 45 + Math.floor(Math.random() * 20); // 45-65%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
        // 지점별 색상 범례 렌더링
    function renderBranchLegend() {
        const legendContainer = document.getElementById('branchLegend');
        if (!legendContainer) return;
        
        legendContainer.innerHTML = '';
        
            // 사용된 지점별 색상만 표시 (정렬하여 일관성 유지)
            const entries = Object.entries(branchColors).sort((a,b) => a[0].localeCompare(b[0]));
            entries.forEach(([branchName, color]) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${color};"></div>
                <span class="legend-label">${branchName}</span>
            `;
            legendContainer.appendChild(legendItem);
        });
        
        console.log('지점별 색상 범례 업데이트됨:', branchColors);
    }

    // 초기화
    function init() {
        console.log('캘린더 초기화 시작');
        if (!window.AuthGuard || !AuthGuard.checkAuth()) {
            console.log('인증 실패');
            return;
        }
        
        console.log('캘린더 초기화 중...');
        initializeCalendar();
        setupEventListeners();
        
        // DataManager 로드 대기 후 데이터 로드
        const checkDataManager = () => {
            if (window.dataManager) {
                console.log('DataManager 로드 완료');
                loadLeaveData();
            } else {
                console.log('DataManager 로드 대기 중...');
                setTimeout(checkDataManager, 100);
            }
        };
        
        checkDataManager();
    }

    // FullCalendar 초기화
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('캘린더 엘리먼트를 찾을 수 없습니다');
            return;
        }
        console.log('FullCalendar 초기화 중...');

        try {
            calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ko',
            headerToolbar: false, // 커스텀 헤더 사용
            height: 'auto',
            timeZone: 'local', // 로컬 시간대 사용
            displayEventTime: false, // 시간 표시 비활성화
            displayEventEnd: false, // 종료 시간 표시 비활성화
            events: [], // 빈 배열로 시작
            eventClick: function(info) {
                // 연차 클릭 시 상세 정보 표시
                const event = info.event;
                const eventData = {
                    ...event.extendedProps,
                    start: event.startStr,
                    end: event.endStr
                };
                showLeaveDetail(eventData);
            },
            dateClick: function(info) {
                // 날짜 클릭 시 연차 신청 모달 열기
                const clickedDate = info.dateStr;
                openLeaveRequestModalWithDate(clickedDate);
            },
            eventDidMount: function(info) {
                // 이벤트 스타일링 (지점별 배경색을 직접 적용) - FullCalendar 내부 구조까지 적용
                const event = info.event;
                const color = event.extendedProps.branch_color || getBranchColor(event.extendedProps.branch_name);
                const bg = toRGBA(color, 0.25);
                const el = info.el;
                // 루트 요소에만 배경색 적용
                el.style.setProperty('background-color', bg, 'important');
                el.style.setProperty('border-color', color, 'important');
                el.style.setProperty('color', '#111', 'important');
                el.style.fontWeight = '600';
                el.style.borderRadius = '4px';
                el.style.padding = '2px 6px';
                // 내부 컨테이너는 투명 처리 (이중 덧칠 방지)
                const main = el.querySelector('.fc-event-main');
                if (main) {
                    main.style.setProperty('background-color', 'transparent', 'important');
                    main.style.setProperty('color', '#111', 'important');
                }
                const frame = el.querySelector('.fc-event-main-frame');
                if (frame) {
                    frame.style.setProperty('background-color', 'transparent', 'important');
                    frame.style.setProperty('color', '#111', 'important');
                }
                // CSS 변수 사용 테마 대응
                el.style.setProperty('--fc-event-bg-color', bg);
                el.style.setProperty('--fc-event-border-color', color);
            },
            dayCellDidMount: function(info) {
                // 오늘 날짜 배경색 유지, 날짜 번호 굵기 제거
                const today = new Date();
                const cellDate = info.date;
                if (cellDate.toDateString() === today.toDateString()) {
                    info.el.style.backgroundColor = '#fff3cd';
                    // 날짜 번호를 일반 날짜와 동일하게 굵게 표시
                    const dayNumber = info.el.querySelector('.fc-daygrid-day-number');
                    if (dayNumber) {
                        dayNumber.style.fontWeight = '600';
                    }
                }
            }
        });

        calendar.render();
        console.log('FullCalendar 렌더링 완료');
        } catch (error) {
            console.error('캘린더 초기화 오류:', error);
            // 오류 발생 시 기본 캘린더로 폴백
            calendarEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">캘린더를 불러올 수 없습니다.</div>';
        }
    }

    // HEX/HSL/RGB 모두를 RGBA로 변환하는 유틸
    function toRGBA(color, alpha) {
        if (!color) return `rgba(102,102,102,${alpha})`;
        if (color.startsWith('#')) {
            const hex = color.replace('#','');
            const bigint = parseInt(hex.length === 3 ? hex.split('').map(c=>c+c).join('') : hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (color.startsWith('hsl')) {
            return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        }
        return `rgba(102,102,102,${alpha})`;
    }

    // 실제 연차 데이터 가져오기
    function loadLeaveData() {
        try {
            console.log('loadLeaveData 시작');
            console.log('window.dataManager:', window.dataManager);
            
            // DataManager에서 실제 데이터 가져오기
            const dm = window.dataManager;
            if (!dm) {
                console.error('DataManager를 찾을 수 없습니다');
                return;
            }

            const employees = dm.employees || [];
            const leaveRequests = dm.leaveRequests || [];
            const branches = dm.branches || [];
            
            console.log('실제 데이터 로드:', {
                employees: employees.length,
                leaveRequests: leaveRequests.length,
                branches: branches.length
            });

            // 데이터가 없으면 빈 캘린더로 초기화
            if (leaveRequests.length === 0) {
                console.log('연차 신청 데이터가 없습니다. 빈 캘린더로 초기화합니다.');
                calendar.removeAllEvents();
                allEvents = [];
                renderBranchLegend();
                return;
            }

            // 모든 연차 요청 출력 (디버깅용)
            console.log('전체 연차 요청:', leaveRequests);

            // 승인된 연차와 대기중인 연차 모두 포함
            const visibleLeaves = leaveRequests.filter(req => req.status === 'approved' || req.status === 'pending');
            console.log('표시할 연차 (승인+대기중):', visibleLeaves.length, '개');
            console.log('표시할 연차 상세:', visibleLeaves);
            
            // 각 연차의 날짜 정보 상세 출력
            visibleLeaves.forEach((leave, index) => {
                console.log(`연차 #${index + 1}:`, {
                    id: leave.id,
                    employeeName: leave.employeeName,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    days: leave.days,
                    leaveType: leave.leaveType,
                    status: leave.status,
                    employeeId: leave.employeeId,
                    reason: leave.reason
                });
                
                // 직원 정보 상세 확인
                const employee = employees.find(emp => String(emp.id) === String(leave.employeeId));
                console.log(`  직원 정보:`, employee);
                
                // 지점 정보 상세 확인
                const branch = branches.find(br => br.id === (employee?.branchId || 1));
                console.log(`  지점 정보:`, branch);
                
                // 날짜 변환 과정 확인
                const startDate = leave.startDate + 'T00:00:00';
                const endDate = new Date(new Date(leave.endDate + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00';
                console.log(`  날짜 변환: ${leave.startDate} → ${startDate}, ${leave.endDate} → ${endDate}`);
            });

            // FullCalendar 이벤트 형식으로 변환
            const calendarEvents = visibleLeaves.map(leave => {
                // 연차 승인 페이지와 동일한 방식으로 직원 정보 조회
                let employee = employees.find(emp => String(emp.id) === String(leave.employeeId));
                // 보강: 레거시 데이터에서 employeeId가 사용자 ID로 저장된 경우 이름으로 매칭
                if (!employee && leave.employeeName) {
                    employee = employees.find(emp => emp.name === leave.employeeName);
                }
                const branch = branches.find(br => br.id === (employee?.branchId || 1));
                
                // 지점명/팀명은 다양한 키를 허용하여 최대한 실제 값을 표시
                const branchName = (
                    employee?.branch || employee?.branchName || employee?.branch_name ||
                    branch?.name || branch?.branchName || '본사'
                );
                console.log(`연차 ${leave.id} 지점 매핑:`, {
                    employeeId: leave.employeeId,
                    employee: employee,
                    branch: branch,
                    finalBranchName: branchName
                });
                
                // 사유(reasonType) 우선으로 표시 텍스트 결정, 없으면 기존 값 사용
                const rt = String(leave.reasonType || '').toLowerCase();
                let leaveTypeText = '기타';
                if (rt.includes('personal')) leaveTypeText = '개인사정';
                else if (rt.includes('sick')) leaveTypeText = '병가';
                else if (rt.includes('vacation')) leaveTypeText = '휴가';
                else if (rt.includes('family')) leaveTypeText = '가족사정';
                else if (rt.includes('other')) leaveTypeText = '기타';
                else if (rt.includes('half_morning')) leaveTypeText = '반차(오전)';
                else if (rt.includes('half_afternoon')) leaveTypeText = '반차(오후)';
                else if (leave.leaveType === '복지휴가' || leave.leaveType === '법정연차') {
                    // 카테고리만 있는 경우 보조표시
                    leaveTypeText = leave.leaveType;
                }
                
                // 연차 승인 페이지와 동일한 직원명 사용
                const employeeName = leave.employeeName || employee?.name || '알 수 없음';
                
                // 연차/반차 여부 판단
                let leaveCategory = '연차';
                if (rt.includes('half_morning') || rt.includes('half_afternoon') || leave.days === 0.5 || leave.type === '반차') {
                    leaveCategory = '반차';
                    
                    // 반차인 경우 오전/오후 구분 추가
                    if (rt.includes('half_morning')) {
                        leaveCategory = '오전반차';
                    } else if (rt.includes('half_afternoon')) {
                        leaveCategory = '오후반차';
                    }
                }
                
                // 새로운 형식: "[연차/반차 여부] 성명(소속지점)"
                const title = `[${leaveCategory}] ${employeeName}(${branchName})`;
                
                // 날짜 변환 - FullCalendar의 배타적 end 날짜 처리
                const startDate = leave.startDate;
                const endDate = leave.endDate;
                
                // end 날짜를 포함적으로 처리하기 위해 하루 추가
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
                
                const branchColor = getBranchColor(branchName);
                return {
                    id: leave.id,
                    title: title,
                    start: startDate,
                    end: inclusiveEndDate,
                    allDay: true, // 종일 이벤트로 설정
                    backgroundColor: branchColor,
                    borderColor: branchColor,
                    textColor: '#333',
                    className: leave.status === 'pending' ? 'leave-pending' : 'leave-approved', // 상태별 클래스
                    extendedProps: {
                        leave_type: leaveTypeText,
                        half_type: (leave.days === 0.5 || leave.type === '반차') ? '반차' : '전일',
                        reason: leave.reason || '',
                        user_name: employeeName,
                        team_name: (
                            employee?.team || employee?.department || employee?.teamName ||
                            employee?.departmentName || employee?.team_name || employee?.department_name || '알 수 없음'
                        ),
                        branch_name: branchName,
                        branch_color: branchColor,
                        branch_id: employee?.branchId || employee?.branch_id || branch?.id || 1,
                        team_id: employee?.teamId || employee?.team_id || 1,
                        employee_id: employee?.id || leave.employeeId,
                        days: leave.days || 1,
                        requestDate: leave.requestDate,
                        status: leave.status // 상태 정보 추가
                    }
                };
            });
            
            console.log('변환된 캘린더 이벤트:', calendarEvents);
            
            // 변환된 이벤트의 날짜 정보 상세 출력
            calendarEvents.forEach((event, index) => {
                console.log(`캘린더 이벤트 #${index + 1}:`, {
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    user_name: event.extendedProps.user_name,
                    branch_name: event.extendedProps.branch_name,
                    team_name: event.extendedProps.team_name
                });
            });
            
            allEvents = calendarEvents;
            console.log('allEvents 설정 완료:', allEvents.length, '개');
            console.log('allEvents 첫 번째 이벤트:', allEvents[0]);
            
            // 캘린더에서 모든 이벤트 제거 후 새로 추가
            calendar.removeAllEvents();
            calendar.addEventSource(calendarEvents);
            console.log('캘린더에 이벤트 추가 완료:', calendarEvents.length, '개');
            
            // 필터 옵션 업데이트
            updateFilterOptions();
            
            // 지점별 색상 범례 업데이트
            renderBranchLegend();
            
            // 초기 필터 적용 (전체 표시)
            applyFilters();
            
        } catch (error) {
            console.error('연차 데이터 로드 실패:', error);
            // API 폴백
            loadLeaveDataFromAPI();
        }
    }

    // API에서 연차 데이터 가져오기 (폴백)
    function loadLeaveDataFromAPI() {
        fetch('/api/leaves')
            .then(response => response.json())
            .then(data => {
                console.log('API에서 연차 데이터 로드:', data);
                allEvents = data || [];
                
                // FullCalendar 이벤트 형식으로 변환
                const calendarEvents = allEvents.map(event => {
                    // end 날짜를 포함적으로 처리하기 위해 하루 추가
                    const endDateObj = new Date(event.end);
                    endDateObj.setDate(endDateObj.getDate() + 1);
                    const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
                    
                    return {
                        id: event.id,
                        title: event.title,
                        start: event.start,
                        end: inclusiveEndDate,
                        allDay: true,
                        backgroundColor: getBranchColor(event.branch_name),
                        borderColor: getBranchColor(event.branch_name),
                        textColor: '#333',
                        extendedProps: {
                            leave_type: event.leave_type,
                            half_type: event.half_type,
                            reason: event.reason,
                            user_name: event.user_name,
                            team_name: event.team_name,
                            branch_name: event.branch_name,
                            branch_id: event.branch_id,
                            team_id: event.team_id
                        }
                    };
                });
                
                console.log('변환된 캘린더 이벤트:', calendarEvents);
                
                // 캘린더에서 모든 이벤트 제거 후 새로 추가
                calendar.removeAllEvents();
                calendar.addEventSource(calendarEvents);
                console.log('캘린더에 이벤트 추가 완료:', calendarEvents.length, '개');
                
                // 필터 옵션 업데이트
                updateFilterOptions();
            })
            .catch(error => {
                console.error('API 연차 데이터 로드 실패:', error);
            });
    }

    // 주의: 상단에 이미 getBranchColor가 정의되어 있으므로 여기서 재정의하지 않습니다.

    // 필터 옵션 업데이트
    function updateFilterOptions() {
        console.log('필터 옵션 업데이트 시작');
        
        // 지점 필터 업데이트
        const branchFilter = document.getElementById('branchFilter');
        if (branchFilter) {
            const dm = window.dataManager;
            const branches = dm?.branches || [];
            const employees = dm?.employees || [];
            console.log('사용 가능한 지점들(branches):', branches);
            
            // 1) branches 테이블 우선
            let branchNames = branches.map(b => b?.name).filter(Boolean);
            
            // 2) 데이터가 없으면 직원 데이터에서 추출 (branch, branchName, branch_name)
            if (branchNames.length === 0) {
                const fromEmployees = employees.map(emp => emp.branch || emp.branchName || emp.branch_name).filter(Boolean);
                branchNames = [...new Set(fromEmployees)];
            }
            console.log('최종 지점 이름들:', branchNames);
            
            const current = branchFilter.value || 'all';
            branchFilter.innerHTML = '<option value="all">전체 지점</option>';
            branchNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                branchFilter.appendChild(option);
            });
            // 기존 선택 유지
            if ([...branchFilter.options].some(o => o.value === current)) branchFilter.value = current;
        }

        // 팀 필터 업데이트 (여러 필드 허용)
        const teamFilter = document.getElementById('teamFilter');
        if (teamFilter) {
            const dm = window.dataManager;
            const employees = dm?.employees || [];
            console.log('사용 가능한 직원들:', employees);
            
            const allTeams = employees.map(emp => emp.department || emp.team || emp.teamName || emp.departmentName || emp.team_name || emp.department_name).filter(Boolean);
            const uniqueTeams = [...new Set(allTeams)];
            console.log('최종 팀 목록:', uniqueTeams);
            
            const currentTeam = teamFilter.value || 'all';
            teamFilter.innerHTML = '<option value="all">전체 팀</option>';
            uniqueTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                teamFilter.appendChild(option);
            });
            if ([...teamFilter.options].some(o => o.value === currentTeam)) teamFilter.value = currentTeam;
        }
        
        console.log('필터 옵션 업데이트 완료');
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 월 네비게이션
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            calendar.prev();
            updateCurrentMonth();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            calendar.next();
            updateCurrentMonth();
        });

        // 오늘 버튼
        document.getElementById('todayBtn')?.addEventListener('click', () => {
            calendar.today();
            updateCurrentMonth();
        });
        
        // 현재 월 표시 클릭 이벤트 - 날짜 선택 모달 열기
        document.getElementById('currentMonth')?.addEventListener('click', () => {
            openDatePickerModal();
        });
        
        // 날짜 선택 모달 관련 이벤트
        document.getElementById('closeDatePickerModal')?.addEventListener('click', closeDatePickerModal);
        document.getElementById('prevDecade')?.addEventListener('click', () => {
            const yearRange = document.getElementById('yearRange');
            if (!yearRange) return;
            const currentStart = parseInt(yearRange.textContent.split(' - ')[0]);
            const newStart = currentStart - 10;
            const selectedYearItem = document.querySelector('.calendar-year-item.selected');
            const selectedYear = selectedYearItem ? parseInt(selectedYearItem.dataset.year) : currentStart;
            yearRange.textContent = `${newStart} - ${newStart + 9}`;
            renderYearGrid(newStart, selectedYear);
        });
        
        document.getElementById('nextDecade')?.addEventListener('click', () => {
            const yearRange = document.getElementById('yearRange');
            if (!yearRange) return;
            const currentStart = parseInt(yearRange.textContent.split(' - ')[0]);
            const newStart = currentStart + 10;
            const selectedYearItem = document.querySelector('.calendar-year-item.selected');
            const selectedYear = selectedYearItem ? parseInt(selectedYearItem.dataset.year) : currentStart;
            yearRange.textContent = `${newStart} - ${newStart + 9}`;
            renderYearGrid(newStart, selectedYear);
        });
        
        // 모달 외부 클릭 시 닫기
        document.getElementById('datePickerModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'datePickerModal') {
                closeDatePickerModal();
            }
        });

        // 필터 변경
        document.getElementById('branchFilter')?.addEventListener('change', applyFilters);
        document.getElementById('teamFilter')?.addEventListener('change', applyFilters);
        document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
        document.getElementById('statusFilter')?.addEventListener('change', applyFilters);

        // 연차 신청 버튼 - 모달 열기
        document.getElementById('addLeaveBtn')?.addEventListener('click', openLeaveRequestModal);

        // 모달 닫기
        document.getElementById('closeLeaveDetailModal')?.addEventListener('click', closeLeaveDetailModal);
        document.getElementById('leaveDetailModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('leaveDetailModal')) {
                closeLeaveDetailModal();
            }
        });
        
        // 연차 신청 모달 이벤트
        document.getElementById('closeLeaveRequestModal')?.addEventListener('click', closeLeaveRequestModal);
        document.getElementById('cancelLeaveRequest')?.addEventListener('click', closeLeaveRequestModal);
        document.getElementById('leaveRequestModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('leaveRequestModal')) {
                closeLeaveRequestModal();
            }
        });
        
        // 연차 신청 폼 이벤트
        document.getElementById('leaveRequestForm')?.addEventListener('submit', handleLeaveRequestSubmit);
        document.getElementById('leaveType')?.addEventListener('change', updateReasonOptions);
        document.getElementById('startDate')?.addEventListener('change', calculateDaysInModal);
        document.getElementById('endDate')?.addEventListener('change', calculateDaysInModal);
        document.getElementById('reasonType')?.addEventListener('change', () => {
            calculateDaysInModal();
            toggleReasonField();
        });
    }
    
    // 날짜 선택 모달 열기 - Windows 스타일
    function openDatePickerModal() {
        const modal = document.getElementById('datePickerModal');
        if (!modal || !calendar) return;
        
        const currentDate = calendar.getDate();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        selectedYearForPicker = currentYear;
        
        // 10년 단위로 시작 연도 계산
        const startDecade = Math.floor(currentYear / 10) * 10;
        const endDecade = startDecade + 9;
        
        // 연도 범위 표시 업데이트
        const yearRange = document.getElementById('yearRange');
        if (yearRange) {
            yearRange.textContent = `${startDecade} - ${endDecade}`;
        }
        
        // 연도 그리드 생성 (이전/다음 10년 연도 포함)
        renderYearGrid(startDecade, currentYear);
        
        // 월 그리드 선택 상태 업데이트
        updateMonthSelection(currentMonth);
        
        // 월 클릭 이벤트 재설정
        document.querySelectorAll('.calendar-month-item').forEach(item => {
            item.removeEventListener('click', handleMonthClick);
            item.addEventListener('click', handleMonthClick);
        });
        
        modal.style.display = 'flex';
    }
    
    // 월 클릭 핸들러
    function handleMonthClick(e) {
        document.querySelectorAll('.calendar-month-item').forEach(m => m.classList.remove('selected'));
        e.target.classList.add('selected');
        applyDatePicker();
    }
    
    // 연도 그리드 렌더링
    function renderYearGrid(startDecade, selectedYear) {
        const yearGrid = document.getElementById('yearGrid');
        if (!yearGrid) return;
        
        yearGrid.innerHTML = '';
        
        // 이전 연도 3개 + 현재 10년 + 다음 연도 3개
        for (let year = startDecade - 3; year <= startDecade + 12; year++) {
            const yearItem = document.createElement('div');
            yearItem.className = 'calendar-year-item';
            yearItem.textContent = year;
            yearItem.dataset.year = year;
            
            // 현재 10년 범위 밖이면 다른 스타일
            if (year < startDecade || year > startDecade + 9) {
                yearItem.classList.add('other-decade');
            }
            
            // 선택된 연도 표시
            if (year === selectedYear) {
                yearItem.classList.add('selected');
            }
            
            yearItem.addEventListener('click', () => {
                selectYear(year);
            });
            
            yearGrid.appendChild(yearItem);
        }
    }
    
    // 전역 변수로 선택된 연도 저장
    let selectedYearForPicker = null;
    
    // 연도 선택
    function selectYear(year) {
        selectedYearForPicker = year;
        
        // 모든 연도 선택 해제
        document.querySelectorAll('.calendar-year-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 선택된 연도 표시
        const selectedYearItem = document.querySelector(`.calendar-year-item[data-year="${year}"]`);
        if (selectedYearItem) {
            selectedYearItem.classList.add('selected');
        }
        
        // 10년 범위가 변경되면 그리드 업데이트
        const currentStartDecade = Math.floor(year / 10) * 10;
        const yearRange = document.getElementById('yearRange');
        if (yearRange) {
            const currentText = yearRange.textContent;
            const currentStart = parseInt(currentText.split(' - ')[0]);
            
            if (currentStart !== currentStartDecade) {
                yearRange.textContent = `${currentStartDecade} - ${currentStartDecade + 9}`;
                renderYearGrid(currentStartDecade, year);
            }
        }
    }
    
    // 월 선택 상태 업데이트
    function updateMonthSelection(selectedMonth) {
        document.querySelectorAll('.calendar-month-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.month) === selectedMonth) {
                item.classList.add('selected');
            }
        });
    }
    
    // 날짜 선택 모달 닫기
    function closeDatePickerModal() {
        const modal = document.getElementById('datePickerModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 날짜 선택 적용
    function applyDatePicker() {
        const selectedYearItem = document.querySelector('.calendar-year-item.selected');
        const selectedMonthItem = document.querySelector('.calendar-month-item.selected');
        
        if (!calendar) return;
        
        // 연도가 선택되지 않았으면 현재 연도 사용
        const selectedYear = selectedYearItem ? parseInt(selectedYearItem.dataset.year) : (selectedYearForPicker || new Date().getFullYear());
        const selectedMonth = selectedMonthItem ? parseInt(selectedMonthItem.dataset.month) : new Date().getMonth();
        
        // FullCalendar에 날짜 설정 (월은 0부터 시작)
        calendar.gotoDate(new Date(selectedYear, selectedMonth, 1));
        updateCurrentMonth();
        
        closeDatePickerModal();
    }

    // 현재 월 표시 업데이트
    function updateCurrentMonth() {
        const currentMonthElement = document.getElementById('currentMonth');
        if (currentMonthElement && calendar) {
            const currentDate = calendar.getDate();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            currentMonthElement.textContent = `${year}년 ${month}월`;
        }
    }


    // 필터 적용
    function applyFilters() {
        const branchFilter = document.getElementById('branchFilter')?.value || 'all';
        const teamFilter = document.getElementById('teamFilter')?.value || 'all';
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        console.log('필터 적용:', { branchFilter, teamFilter, typeFilter, statusFilter });
        console.log('allEvents 상태:', allEvents);
        console.log('allEvents 길이:', allEvents.length);
        
        if (!allEvents || allEvents.length === 0) {
            console.error('allEvents가 비어있습니다. 데이터를 다시 로드합니다.');
            loadLeaveData();
            return;
        }
        
        // 안전장치: allEvents가 배열이 아니면 초기화
        if (!Array.isArray(allEvents)) {
            console.warn('allEvents가 배열이 아닙니다. 초기화합니다.');
            allEvents = [];
            loadLeaveData();
            return;
        }
        
        // 전체 필터인 경우 모든 이벤트 표시
        if (branchFilter === 'all' && teamFilter === 'all' && typeFilter === 'all' && statusFilter === 'all') {
            console.log('전체 필터 - 모든 이벤트 표시');
            calendar.removeAllEvents();
            calendar.addEventSource(allEvents);
            console.log('캘린더에 전체 이벤트 적용 완료:', allEvents.length, '개');
            return;
        }
        
        const filteredEvents = allEvents.filter(event => {
            const branchMatch = branchFilter === 'all' || event.extendedProps.branch_name === branchFilter;
            const teamMatch = teamFilter === 'all' || event.extendedProps.team_name === teamFilter;
            
            let typeMatch = true;
            if (typeFilter !== 'all') {
                if (typeFilter === 'annual') {
                    typeMatch = !event.extendedProps.leave_type || !event.extendedProps.leave_type.startsWith('복지');
                } else if (typeFilter === 'welfare') {
                    typeMatch = event.extendedProps.leave_type && event.extendedProps.leave_type.startsWith('복지');
                }
            }
            
            let statusMatch = true;
            if (statusFilter !== 'all') {
                statusMatch = event.extendedProps.status === statusFilter;
            }
            
            console.log(`이벤트 "${event.title}":`, {
                branch_name: event.extendedProps.branch_name,
                team_name: event.extendedProps.team_name,
                leave_type: event.extendedProps.leave_type,
                status: event.extendedProps.status,
                branchMatch,
                teamMatch,
                typeMatch,
                statusMatch,
                passed: branchMatch && teamMatch && typeMatch && statusMatch
            });
            
            return branchMatch && teamMatch && typeMatch && statusMatch;
        });
        
        console.log('필터링된 이벤트:', filteredEvents);

        // 필터링된 이벤트를 그대로 사용 (이미 FullCalendar 형식)
        calendar.removeAllEvents();
        calendar.addEventSource(filteredEvents);
        console.log('캘린더에 필터링된 이벤트 적용 완료:', filteredEvents.length, '개');
    }

    // 연차 상세 정보 표시
    function showLeaveDetail(eventData) {
        const modal = document.getElementById('leaveDetailModal');
        const title = document.getElementById('leaveDetailTitle');
        const content = document.getElementById('leaveDetailContent');

        if (!modal || !title || !content) return;

        title.textContent = `${eventData.user_name} - 연차 상세 정보`;

        const leaveTypeText = eventData.leave_type === '연차' ? '연차' : '복지휴가';
        const statusText = '승인됨'; // API에서 승인된 연차만 조회

        // 사유 표시 로직 개선
        let reasonDisplay = '사유 없음';
        if (eventData.reason && eventData.reason.trim() !== '') {
            // 상세 사유가 있는 경우
            reasonDisplay = eventData.reason;
        } else if (eventData.leave_type) {
            // 상세 사유가 없으면 leave_type을 사유로 표시
            reasonDisplay = eventData.leave_type;
        }

        content.innerHTML = `
            <div class="leave-detail-item">
                <div class="leave-detail-header">
                    <div class="leave-detail-title">${eventData.leave_type} 신청</div>
                    <div class="leave-detail-status approved">승인됨</div>
                </div>
                <div class="leave-detail-info">
                    <span><i class="fas fa-user"></i> ${eventData.user_name}</span>
                    <span><i class="fas fa-building"></i> ${eventData.branch_name}</span>
                    <span><i class="fas fa-users"></i> ${eventData.team_name}</span>
                    <span><i class="fas fa-calendar"></i> ${eventData.start.split('T')[0]} ~ ${eventData.end.split('T')[0]} (${eventData.days || 1}일)</span>
                    <span><i class="fas fa-file-alt"></i> ${reasonDisplay}</span>
                    <span><i class="fas fa-clock"></i> ${eventData.half_type || '전일'}</span>
                    <span><i class="fas fa-calendar-plus"></i> 신청일: ${eventData.requestDate || '-'}</span>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 모달 닫기
    function closeLeaveDetailModal() {
        const modal = document.getElementById('leaveDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 전역 함수로 등록
    // 연차 신청 모달 열기
    function openLeaveRequestModal() {
        const modal = document.getElementById('leaveRequestModal');
        if (modal) {
            modal.style.display = 'block';
            
            // 오늘 날짜로 기본값 설정
            const today = new Date().toISOString().split('T')[0];
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            
            if (startDateInput) {
                startDateInput.min = today;
                startDateInput.value = today;
            }
            if (endDateInput) {
                endDateInput.min = today;
                endDateInput.value = today;
            }
            
            // 폼 초기화
            document.getElementById('leaveRequestForm')?.reset();
            updateReasonOptions();
            
            // 상세 사유 필드 초기화 (숨김)
            const reasonGroup = document.getElementById('reason-group');
            if (reasonGroup) {
                reasonGroup.style.display = 'none';
            }
        }
    }
    
    // 특정 날짜로 연차 신청 모달 열기
    function openLeaveRequestModalWithDate(selectedDate) {
        const modal = document.getElementById('leaveRequestModal');
        if (modal) {
            modal.style.display = 'block';
            
            // 선택된 날짜로 기본값 설정
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            
            if (startDateInput) {
                startDateInput.min = selectedDate;
                startDateInput.value = selectedDate;
            }
            if (endDateInput) {
                endDateInput.min = selectedDate;
                endDateInput.value = selectedDate;
            }
            
            // 폼 초기화
            document.getElementById('leaveRequestForm')?.reset();
            
            // 날짜 필드 다시 설정 (reset 후)
            if (startDateInput) {
                startDateInput.min = selectedDate;
                startDateInput.value = selectedDate;
            }
            if (endDateInput) {
                endDateInput.min = selectedDate;
                endDateInput.value = selectedDate;
            }
            
            updateReasonOptions();
            
            // 상세 사유 필드 초기화 (숨김)
            const reasonGroup = document.getElementById('reason-group');
            if (reasonGroup) {
                reasonGroup.style.display = 'none';
            }
        }
    }
    
    // 연차 신청 모달 닫기
    function closeLeaveRequestModal() {
        const modal = document.getElementById('leaveRequestModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 사유 옵션 업데이트 (연차현황 메뉴와 동일한 옵션)
    function updateReasonOptions() {
        const leaveTypeSelect = document.getElementById('leaveType');
        const reasonTypeSelect = document.getElementById('reasonType');
        
        if (!leaveTypeSelect || !reasonTypeSelect) return;
        
        const selectedType = leaveTypeSelect.value;
        reasonTypeSelect.innerHTML = '<option value="">사유를 선택하세요</option>';
        
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
        
        if (selectedType && reasonOptions[selectedType]) {
            reasonOptions[selectedType].forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                reasonTypeSelect.appendChild(optionElement);
            });
        }
        
        // 상세 사유 필드 토글
        toggleReasonField();
    }
    
    // 상세 사유 필드 토글 함수
    function toggleReasonField() {
        const reasonTypeSelect = document.getElementById('reasonType');
        const reasonGroup = document.getElementById('reason-group');
        const reasonTextarea = document.getElementById('reason');
        
        if (!reasonTypeSelect || !reasonGroup || !reasonTextarea) return;
        
        const isOther = reasonTypeSelect.value === 'other';
        reasonGroup.style.display = isOther ? '' : 'none';
        reasonTextarea.disabled = !isOther;
        reasonTextarea.required = isOther;
        
        if (!isOther) {
            // 기타가 아닌 경우 상세 사유 초기화
            reasonTextarea.value = '';
        }
    }
    
    // 연차 신청 처리
    function handleLeaveRequestSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        const currentUser = window.authManager?.getCurrentUser();
        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }
        
        const dm = window.dataManager;
        const employee = dm.employees.find(emp => emp.email === currentUser.email);
        if (!employee) {
            alert('직원 정보를 찾을 수 없습니다.');
            return;
        }
        
        const leaveType = formData.get('leaveType');
        const reasonType = formData.get('reasonType');
        let finalLeaveType = '';
        
        if (leaveType === 'annual') {
            finalLeaveType = '법정연차';
        } else if (leaveType === 'welfare') {
            finalLeaveType = '복지휴가';
        }
        
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
        
        const isWeekendOrHoliday = (dateStr) => {
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();
            const year = date.getFullYear();
            
            // 주말 검증 (토요일: 6, 일요일: 0)
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // 공휴일 검증
            let isHoliday = false;
            if (year === 2024) {
                isHoliday = holidays2024.includes(dateStr);
            } else if (year === 2025) {
                isHoliday = holidays2025.includes(dateStr);
            }
            
            return isWeekend || isHoliday;
        };
        
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');
        
        if (isWeekendOrHoliday(startDate)) {
            alert('시작일이 주말 또는 공휴일입니다. 평일을 선택해주세요.');
            return;
        }
        
        if (isWeekendOrHoliday(endDate)) {
            alert('종료일이 주말 또는 공휴일입니다. 평일을 선택해주세요.');
            return;
        }
        
        // 기타 사유 선택 시 상세 사유 필수 검증
        if (reasonType === 'other') {
            const reasonText = formData.get('reason');
            if (!reasonText || reasonText.trim() === '') {
                alert('기타 사유를 선택하셨습니다. 상세 사유를 입력해주세요.');
                return;
            }
        }
        
        // 주말 및 공휴일 검증
        if (isWeekendOrHoliday(startDate)) {
            alert('시작일이 주말 또는 공휴일입니다. 평일을 선택해주세요.');
            return;
        }
        
        if (isWeekendOrHoliday(endDate)) {
            alert('종료일이 주말 또는 공휴일입니다. 평일을 선택해주세요.');
            return;
        }
        
        const leaveRequest = {
            id: Date.now(),
            employeeId: employee.id,
            employeeName: employee.name,
            leaveType: finalLeaveType,
            reasonType: reasonType,
            startDate: startDate,
            endDate: endDate,
            days: parseFloat(formData.get('days')),
            reason: formData.get('reason'),
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0],
            type: reasonType && (reasonType.includes('half_morning') || reasonType.includes('half_afternoon')) ? '반차' : '휴가'
        };
        
        dm.leaveRequests.push(leaveRequest);
        dm.saveData('leaveRequests', dm.leaveRequests);
        
        alert('연차 신청이 완료되었습니다.');
        closeLeaveRequestModal();
        loadLeaveData();
    }
    
    // 일수 계산 (반차 옵션 포함)
    function calculateDaysInModal() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const daysInput = document.getElementById('days');
        const reasonTypeSelect = document.getElementById('reasonType');
        
        if (!startDateInput || !endDateInput || !daysInput) return;
        
        const reasonType = reasonTypeSelect?.value;
        
        if (reasonType && (reasonType.includes('half_morning') || reasonType.includes('half_afternoon'))) {
            // 반차 선택 시
            daysInput.value = 0.5;
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
            
            if (startDateInput.value && endDateInput.value) {
                const start = new Date(startDateInput.value);
                const end = new Date(endDateInput.value);
                
                if (start <= end) {
                    const timeDiff = end.getTime() - start.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                    daysInput.value = daysDiff;
                } else {
                    daysInput.value = '';
                }
            }
        }
    }

    // 전역 함수 등록
    window.showLeaveDetail = showLeaveDetail;
    window.closeLeaveDetailModal = closeLeaveDetailModal;
    window.openLeaveRequestModal = openLeaveRequestModal;
    window.closeLeaveRequestModal = closeLeaveRequestModal;
    window.handleLeaveRequestSubmit = handleLeaveRequestSubmit;

    // 페이지 로드 시 초기화
    window.addEventListener('DOMContentLoaded', function() {
        init();
    });
})();
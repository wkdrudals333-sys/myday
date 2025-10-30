class AuthManager {
    constructor() { 
        this.initializeDefaultUsers();
        // dataManager가 로드된 후 자동 동기화 실행
        this.setupAutoSync();
        // 중복 초기화 방지
        this.isInitialized = false;
    }
    
    getStoredUsers() { 
        return JSON.parse(localStorage.getItem("offday_users") || "[]"); 
    }
    
    saveUsers(users) { 
        localStorage.setItem("offday_users", JSON.stringify(users)); 
    }
    
    initializeDefaultUsers() { 
        const users = this.getStoredUsers(); 
        if (users.length === 0) { 
            const defaultUsers = [
                { 
                    id: "admin", 
                    username: "admin", 
                    password: "admin123", 
                    name: "admin", 
                    email: "admin@offday.com", 
                    role: "admin", 
                    department: "admin", 
                    joindate: "2020-01-01", 
                    birthdate: "1990-01-01" 
                }
            ]; 
            this.saveUsers(defaultUsers); 
        } 
    }
    
    getCurrentUser() { 
        const id = localStorage.getItem("offday_current_user"); 
        return id ? this.getStoredUsers().find(u => u.id === id) : null; 
    }
    
    updateUserInStorage(updatedUser) { 
        console.log('updateUserInStorage 호출 - 업데이트할 사용자:', updatedUser);
        
        const users = this.getStoredUsers(); 
        console.log('현재 저장된 사용자 목록:', users);
        
        const index = users.findIndex(u => u.id === updatedUser.id); 
        console.log('사용자 인덱스:', index);
        
        if (index !== -1) { 
            console.log('업데이트 전 사용자 데이터:', users[index]);
            users[index] = { ...users[index], ...updatedUser }; 
            console.log('업데이트 후 사용자 데이터:', users[index]);
            
            this.saveUsers(users); 
            console.log('사용자 데이터 저장 완료');
            
            // 메뉴바 아바타 아이콘 업데이트
            this.updateNavAvatarIcon(updatedUser.profileImage);
            
            return true; 
        } 
        console.error('사용자를 찾을 수 없음 - ID:', updatedUser.id);
        return false; 
    }
    
    // 메뉴바 아바타 아이콘 업데이트
    updateNavAvatarIcon(imageUrl) {
        const navAvatarIcon = document.getElementById('navAvatarIcon');
        if (!navAvatarIcon) return;

        if (imageUrl && imageUrl.trim() !== '') {
            // 프로필 이미지가 있는 경우
            navAvatarIcon.className = 'nav-avatar-image';
            navAvatarIcon.style.backgroundImage = `url(${imageUrl})`;
            navAvatarIcon.style.backgroundSize = 'cover';
            navAvatarIcon.style.backgroundPosition = 'center';
            navAvatarIcon.style.borderRadius = '50%';
            navAvatarIcon.style.width = '28px';
            navAvatarIcon.style.height = '28px';
            navAvatarIcon.style.display = 'inline-block';
        } else {
            // 기본 아이콘인 경우
            navAvatarIcon.className = 'fas fa-user';
            navAvatarIcon.style.backgroundImage = '';
            navAvatarIcon.style.backgroundSize = '';
            navAvatarIcon.style.backgroundPosition = '';
            navAvatarIcon.style.borderRadius = '';
            navAvatarIcon.style.width = '';
            navAvatarIcon.style.height = '';
            navAvatarIcon.style.display = '';
        }
    }
    
    checkAuth() { 
        return this.getCurrentUser() !== null; 
    }
    
    login(username, password) { 
        const users = this.getStoredUsers(); 
        const user = users.find(u => u.username === username && u.password === password); 
        if (user) { 
            localStorage.setItem("offday_current_user", user.id); 
            return { success: true, message: "Login success", user: user }; 
        } else { 
            return { success: false, message: "Invalid username or password" }; 
        } 
    }
    
    logout() { 
        localStorage.removeItem("offday_current_user");
        return { success: true, message: "Logout success" }; 
    }
    
    // 비밀번호 찾기 기능
    forgotPassword(email) {
        const users = this.getStoredUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return { 
                success: false, 
                message: "해당 이메일로 등록된 계정을 찾을 수 없습니다." 
            };
        }
        
        // 임시 비밀번호 생성 (8자리 랜덤 문자열)
        const tempPassword = this.generateTempPassword();
        
        // 사용자 비밀번호 업데이트
        user.password = tempPassword;
        this.saveUsers(users);
        
        return { 
            success: true, 
            message: "임시 비밀번호가 발급되었습니다.",
            tempPassword: tempPassword
        };
    }
    
    // 임시 비밀번호 생성
    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        
        // 최소 8자리, 최대 12자리로 생성
        const length = Math.floor(Math.random() * 5) + 8;
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }
    
    // 사용자 삭제 (이메일로)
    deleteUserByEmail(email) {
        const users = this.getStoredUsers();
        const userIndex = users.findIndex(user => user.email === email);
        
        if (userIndex !== -1) {
            const deletedUser = users[userIndex];
            
            // 삭제된 사용자를 추적 목록에 추가
            this.addToDeletedUsers(deletedUser);
            
            // 사용자 목록에서 제거
            users.splice(userIndex, 1);
            this.saveUsers(users);
            
            return { success: true, message: "사용자 계정이 삭제되었습니다." };
        }
        
        return { success: false, message: "해당 이메일의 사용자를 찾을 수 없습니다." };
    }
    
    // 삭제된 사용자 추적 목록에 추가
    addToDeletedUsers(user) {
        const deletedUsers = this.getDeletedUsers();
        deletedUsers.push({
            email: user.email,
            username: user.username,
            name: user.name,
            deletedAt: new Date().toISOString()
        });
        this.saveDeletedUsers(deletedUsers);
    }
    
    // 삭제된 사용자 목록 조회
    getDeletedUsers() {
        try {
            const data = localStorage.getItem('deletedUsers');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('삭제된 사용자 데이터 로드 오류:', error);
            return [];
        }
    }
    
    // 삭제된 사용자 목록 저장
    saveDeletedUsers(deletedUsers) {
        try {
            localStorage.setItem('deletedUsers', JSON.stringify(deletedUsers));
        } catch (error) {
            console.error('삭제된 사용자 데이터 저장 오류:', error);
        }
    }
    
    // 삭제된 사용자 복원 (이메일로)
    restoreUserByEmail(email) {
        const deletedUsers = this.getDeletedUsers();
        const deletedUserIndex = deletedUsers.findIndex(user => user.email === email);
        
        if (deletedUserIndex !== -1) {
            const deletedUser = deletedUsers[deletedUserIndex];
            
            // 삭제 목록에서 제거
            deletedUsers.splice(deletedUserIndex, 1);
            this.saveDeletedUsers(deletedUsers);
            
            return { success: true, message: "사용자 계정이 복원되었습니다." };
        }
        
        return { success: false, message: "해당 이메일의 삭제된 사용자를 찾을 수 없습니다." };
    }
    
    // 삭제된 사용자 영구 삭제 (이메일로)
    permanentlyDeleteUserByEmail(email) {
        const deletedUsers = this.getDeletedUsers();
        const deletedUserIndex = deletedUsers.findIndex(user => user.email === email);
        
        if (deletedUserIndex !== -1) {
            deletedUsers.splice(deletedUserIndex, 1);
            this.saveDeletedUsers(deletedUsers);
            
            return { success: true, message: "사용자 계정이 영구 삭제되었습니다." };
        }
        
        return { success: false, message: "해당 이메일의 삭제된 사용자를 찾을 수 없습니다." };
    }
    
    // 기존 삭제된 사용자 정리 (일회성)
    cleanupDeletedUsers() {
        if (typeof window.dataManager === 'undefined') return;
        
        const deletedEmployees = window.dataManager.getDeletedEmployees();
        const deletedUsers = this.getDeletedUsers();
        
        // 삭제된 직원의 이메일을 삭제된 사용자 목록에 추가
        deletedEmployees.forEach(deletedEmployee => {
            const alreadyDeleted = deletedUsers.find(user => user.email === deletedEmployee.email);
            if (!alreadyDeleted) {
                deletedUsers.push({
                    email: deletedEmployee.email,
                    username: deletedEmployee.email, // 이메일을 아이디로 사용
                    name: '삭제된 사용자',
                    deletedAt: deletedEmployee.deletedAt
                });
            }
        });
        
        this.saveDeletedUsers(deletedUsers);
        console.log('삭제된 사용자 정리 완료');
    }
    
    register(userData) {
        const users = this.getStoredUsers();
        const deletedUsers = this.getDeletedUsers();
        
        // 중복 아이디 확인
        if (users.find(u => u.username === userData.username)) {
            return { success: false, error: "이미 사용 중인 아이디입니다." };
        }
        
        // 중복 이메일 확인 (활성 사용자)
        if (users.find(u => u.email === userData.email)) {
            return { success: false, error: "이미 사용 중인 이메일입니다." };
        }
        
        // 삭제된 사용자 이메일 확인 (비활성화 - 삭제된 계정도 재사용 가능)
        // if (deletedUsers.find(u => u.email === userData.email)) {
        //     return { success: false, error: "이전에 삭제된 계정의 이메일입니다. 다른 이메일을 사용해주세요." };
        // }
        
        // 새 사용자 생성
        const newUser = {
            id: Date.now().toString(),
            username: userData.username,
            password: userData.password,
            name: userData.name,
            email: userData.email,
            birthdate: userData.birthdate,
            joindate: userData.joindate,
            branch: userData.branch,
            department: userData.department,
            position: userData.position,
            phone: userData.phone,
            role: "user"
        };
        
        users.push(newUser);
        this.saveUsers(users);
        
        // 직원 데이터에도 자동 추가
        this.addToEmployeeData(newUser, userData);
        
        return { success: true, message: "회원가입이 완료되었습니다." };
    }
    
    // 직원 데이터에 추가하는 메서드
    addToEmployeeData(user, userData) {
        // dataManager가 로드되었는지 확인
        if (typeof window.dataManager !== 'undefined') {
            const employeeData = {
                name: user.name,
                email: user.email,
                department: user.department,
                branch: user.branch,
                position: userData.position || '매니저', // 회원가입 시 선택한 직급 사용
                phone: userData.phone || '',
                hireDate: user.joindate, // hireDate로 변경
                birthDate: user.birthdate, // 생년월일 추가
                annualLeaveDays: 15, // 기본 연차 일수
                welfareLeaveDays: 0 // 복지휴가는 0으로 초기화 (지급하지 않음)
            };
            
            window.dataManager.addEmployee(employeeData);
        }
    }
    
    // 기존 사용자들을 직원 데이터에 동기화하는 메서드
    syncUsersToEmployees() {
        if (typeof window.dataManager === 'undefined') {
            console.error('dataManager가 로드되지 않음');
            return;
        }
        
        const users = this.getStoredUsers();
        const employees = window.dataManager.employees;
        const deletedEmployees = window.dataManager.deletedEmployees || [];
        
        console.log('동기화 시작:', { 
            usersCount: users.length, 
            employeesCount: employees.length,
            users: users.map(u => ({ email: u.email, name: u.name, role: u.role })),
            employees: employees.map(e => ({ email: e.email, name: e.name }))
        });
        
        let addedCount = 0;
        let updatedCount = 0;
        
        users.forEach(user => {
            if (user.role === 'admin') return; // 관리자는 제외
            
            // 이미 직원 데이터에 있는지 확인 (이메일로 비교)
            const existingEmployee = employees.find(emp => emp.email === user.email);
            
            // 삭제된 직원인지 확인 (이메일로 비교)
            const isDeleted = deletedEmployees.some(deleted => deleted.email === user.email);
            
            if (!existingEmployee && !isDeleted) {
                // 직원 데이터에 없고, 삭제되지 않은 사용자라면 추가
                console.log(`새 직원 추가: ${user.email} (${user.name})`);
                this.addToEmployeeData(user, user);
                addedCount++;
            } else if (existingEmployee) {
                // 기존 직원 데이터가 있으면 완전한 양방향 동기화
                let userUpdated = false;
                let employeeUpdated = false;
                
                // 사용자 데이터 업데이트 (직원 데이터 기준 - 더 최신 정보 우선)
                if (existingEmployee.name && existingEmployee.name !== user.name) {
                    user.name = existingEmployee.name;
                    userUpdated = true;
                    console.log(`사용자 이름 동기화: ${user.email} → ${existingEmployee.name}`);
                }
                if (existingEmployee.phone && existingEmployee.phone !== user.phone) {
                    user.phone = existingEmployee.phone;
                    userUpdated = true;
                    console.log(`사용자 전화번호 동기화: ${user.email} → ${existingEmployee.phone}`);
                }
                if (existingEmployee.branch && existingEmployee.branch !== user.branch) {
                    user.branch = existingEmployee.branch;
                    userUpdated = true;
                    console.log(`사용자 지점 동기화: ${user.email} → ${existingEmployee.branch}`);
                }
                if (existingEmployee.department && existingEmployee.department !== user.department) {
                    user.department = existingEmployee.department;
                    userUpdated = true;
                    console.log(`사용자 부서 동기화: ${user.email} → ${existingEmployee.department}`);
                }
                if (existingEmployee.position && existingEmployee.position !== user.position) {
                    user.position = existingEmployee.position;
                    userUpdated = true;
                    console.log(`사용자 직급 동기화: ${user.email} → ${existingEmployee.position}`);
                }
                if (existingEmployee.hireDate && existingEmployee.hireDate !== user.joindate) {
                    user.joindate = existingEmployee.hireDate;
                    userUpdated = true;
                    console.log(`사용자 입사일 동기화: ${user.email} → ${existingEmployee.hireDate}`);
                }
                if (existingEmployee.birthDate && existingEmployee.birthDate !== user.birthdate) {
                    user.birthdate = existingEmployee.birthDate;
                    userUpdated = true;
                    console.log(`사용자 생년월일 동기화: ${user.email} → ${existingEmployee.birthDate}`);
                }
                
                // 직원 데이터 업데이트 (사용자 데이터 기준 - 누락된 정보 보완)
                if (!existingEmployee.name && user.name) {
                    existingEmployee.name = user.name;
                    employeeUpdated = true;
                    console.log(`직원 이름 보완: ${user.email} → ${user.name}`);
                }
                if (!existingEmployee.phone && user.phone) {
                    existingEmployee.phone = user.phone;
                    employeeUpdated = true;
                    console.log(`직원 전화번호 보완: ${user.email} → ${user.phone}`);
                }
                if (!existingEmployee.branch && user.branch) {
                    existingEmployee.branch = user.branch;
                    employeeUpdated = true;
                    console.log(`직원 지점 보완: ${user.email} → ${user.branch}`);
                }
                if (!existingEmployee.department && user.department) {
                    existingEmployee.department = user.department;
                    employeeUpdated = true;
                    console.log(`직원 부서 보완: ${user.email} → ${user.department}`);
                }
                if (!existingEmployee.position && user.position) {
                    existingEmployee.position = user.position;
                    employeeUpdated = true;
                    console.log(`직원 직급 보완: ${user.email} → ${user.position}`);
                }
                if (!existingEmployee.hireDate && user.joindate) {
                    existingEmployee.hireDate = user.joindate;
                    employeeUpdated = true;
                    console.log(`직원 입사일 보완: ${user.email} → ${user.joindate}`);
                }
                if (!existingEmployee.birthDate && user.birthdate) {
                    existingEmployee.birthDate = user.birthdate;
                    employeeUpdated = true;
                    console.log(`직원 생년월일 보완: ${user.email} → ${user.birthdate}`);
                }
                
                if (userUpdated) {
                    updatedCount++;
                }
                if (employeeUpdated) {
                    window.dataManager.saveData();
                }
            }
        });
        
        // 업데이트된 사용자 데이터 저장
        if (updatedCount > 0) {
            this.saveUsers(users);
            console.log('사용자 데이터 업데이트 완료:', updatedCount);
        }
        
        console.log('동기화 완료:', { 
            addedCount, 
            updatedCount,
            totalEmployees: window.dataManager.employees.length 
        });
        
        return { addedCount, updatedCount, totalEmployees: window.dataManager.employees.length };
    }

    // 강제 동기화 메서드 (모든 데이터를 다시 동기화)
    forceSyncUsersToEmployees() {
        if (typeof window.dataManager === 'undefined') {
            console.error('dataManager가 로드되지 않음');
            return false;
        }
        
        console.log('=== 강제 동기화 시작 ===');
        
        const users = this.getStoredUsers();
        const employees = window.dataManager.employees;
        const deletedEmployees = window.dataManager.deletedEmployees || [];
        
        console.log('강제 동기화 - 현재 상태:', {
            usersCount: users.length,
            employeesCount: employees.length,
            deletedCount: deletedEmployees.length
        });
        
        let addedCount = 0;
        let updatedCount = 0;
        
        // 모든 사용자에 대해 강제 동기화
        users.forEach(user => {
            if (user.role === 'admin') return; // 관리자는 제외
            
            const existingEmployee = employees.find(emp => emp.email === user.email);
            const isDeleted = deletedEmployees.some(deleted => deleted.email === user.email);
            
            if (!existingEmployee && !isDeleted) {
                // 직원 데이터에 없는 사용자는 새로 추가
                console.log(`강제 동기화 - 새 직원 추가: ${user.email} (${user.name})`);
                this.addToEmployeeData(user, user);
                addedCount++;
            } else if (existingEmployee) {
                // 기존 직원이 있으면 완전한 동기화 (양방향)
                let userUpdated = false;
                let employeeUpdated = false;
                
                // 직원 데이터를 기준으로 사용자 데이터 동기화 (더 완전한 정보 우선)
                if (existingEmployee.name && existingEmployee.name !== user.name) {
                    user.name = existingEmployee.name;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 이름: ${user.email} → ${existingEmployee.name}`);
                }
                if (existingEmployee.phone && existingEmployee.phone !== user.phone) {
                    user.phone = existingEmployee.phone;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 전화번호: ${user.email} → ${existingEmployee.phone}`);
                }
                if (existingEmployee.branch && existingEmployee.branch !== user.branch) {
                    user.branch = existingEmployee.branch;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 지점: ${user.email} → ${existingEmployee.branch}`);
                }
                if (existingEmployee.department && existingEmployee.department !== user.department) {
                    user.department = existingEmployee.department;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 부서: ${user.email} → ${existingEmployee.department}`);
                }
                if (existingEmployee.position && existingEmployee.position !== user.position) {
                    user.position = existingEmployee.position;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 직급: ${user.email} → ${existingEmployee.position}`);
                }
                if (existingEmployee.hireDate && existingEmployee.hireDate !== user.joindate) {
                    user.joindate = existingEmployee.hireDate;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 입사일: ${user.email} → ${existingEmployee.hireDate}`);
                }
                if (existingEmployee.birthDate && existingEmployee.birthDate !== user.birthdate) {
                    user.birthdate = existingEmployee.birthDate;
                    userUpdated = true;
                    console.log(`강제 동기화 - 사용자 생년월일: ${user.email} → ${existingEmployee.birthDate}`);
                }
                
                // 사용자 데이터를 기준으로 직원 데이터 보완 (누락된 정보만)
                if (!existingEmployee.name && user.name) {
                    existingEmployee.name = user.name;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 이름 보완: ${user.email} → ${user.name}`);
                }
                if (!existingEmployee.phone && user.phone) {
                    existingEmployee.phone = user.phone;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 전화번호 보완: ${user.email} → ${user.phone}`);
                }
                if (!existingEmployee.branch && user.branch) {
                    existingEmployee.branch = user.branch;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 지점 보완: ${user.email} → ${user.branch}`);
                }
                if (!existingEmployee.department && user.department) {
                    existingEmployee.department = user.department;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 부서 보완: ${user.email} → ${user.department}`);
                }
                if (!existingEmployee.position && user.position) {
                    existingEmployee.position = user.position;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 직급 보완: ${user.email} → ${user.position}`);
                }
                if (!existingEmployee.hireDate && user.joindate) {
                    existingEmployee.hireDate = user.joindate;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 입사일 보완: ${user.email} → ${user.joindate}`);
                }
                if (!existingEmployee.birthDate && user.birthdate) {
                    existingEmployee.birthDate = user.birthdate;
                    employeeUpdated = true;
                    console.log(`강제 동기화 - 직원 생년월일 보완: ${user.email} → ${user.birthdate}`);
                }
                
                if (userUpdated) {
                    updatedCount++;
                }
                if (employeeUpdated) {
                    window.dataManager.saveData('employees', employees);
                }
            }
        });
        
        // 업데이트된 데이터 저장
        if (updatedCount > 0) {
            this.saveUsers(users);
            console.log('강제 동기화 - 사용자 데이터 저장 완료:', updatedCount);
        }
        
        console.log('=== 강제 동기화 완료 ===', {
            addedCount,
            updatedCount,
            finalUsersCount: users.length,
            finalEmployeesCount: window.dataManager.employees.length
        });
        
        return true;
    }

    // 데이터 일관성 검증 및 수정 메서드
    validateAndFixDataConsistency() {
        if (typeof window.dataManager === 'undefined') {
            console.error('dataManager가 로드되지 않음');
            return false;
        }
        
        console.log('=== 데이터 일관성 검증 시작 ===');
        
        const users = this.getStoredUsers();
        const employees = window.dataManager.employees;
        const deletedEmployees = window.dataManager.deletedEmployees || [];
        
        let issuesFound = 0;
        let issuesFixed = 0;
        
        // 1. 사용자는 있지만 직원 데이터가 없는 경우
        users.forEach(user => {
            if (user.role === 'admin') return;
            
            const existingEmployee = employees.find(emp => emp.email === user.email);
            const isDeleted = deletedEmployees.some(deleted => deleted.email === user.email);
            
            if (!existingEmployee && !isDeleted) {
                console.log(`일관성 문제 발견: 사용자는 있지만 직원 데이터 없음 - ${user.email}`);
                issuesFound++;
                this.addToEmployeeData(user, user);
                issuesFixed++;
                console.log(`문제 해결: 직원 데이터 추가 - ${user.email}`);
            }
        });
        
        // 2. 직원 데이터는 있지만 사용자가 없는 경우 (삭제된 사용자)
        employees.forEach(employee => {
            const existingUser = users.find(user => user.email === employee.email);
            if (!existingUser && !deletedEmployees.some(deleted => deleted.email === employee.email)) {
                console.log(`일관성 문제 발견: 직원 데이터는 있지만 사용자 없음 - ${employee.email}`);
                issuesFound++;
                // 직원 데이터를 삭제된 목록으로 이동
                window.dataManager.deletedEmployees.push({
                    ...employee,
                    deletedAt: new Date().toISOString()
                });
                window.dataManager.employees = window.dataManager.employees.filter(emp => emp.email !== employee.email);
                window.dataManager.saveData();
                issuesFixed++;
                console.log(`문제 해결: 직원 데이터 삭제 처리 - ${employee.email}`);
            }
        });
        
        // 3. 데이터 불일치 검증
        users.forEach(user => {
            if (user.role === 'admin') return;
            
            const existingEmployee = employees.find(emp => emp.email === user.email);
            if (existingEmployee) {
                const mismatches = [];
                
                if (user.name !== existingEmployee.name) mismatches.push(`이름: ${user.name} vs ${existingEmployee.name}`);
                if (user.phone !== existingEmployee.phone) mismatches.push(`전화번호: ${user.phone} vs ${existingEmployee.phone}`);
                if (user.branch !== existingEmployee.branch) mismatches.push(`지점: ${user.branch} vs ${existingEmployee.branch}`);
                if (user.department !== existingEmployee.department) mismatches.push(`부서: ${user.department} vs ${existingEmployee.department}`);
                if (user.position !== existingEmployee.position) mismatches.push(`직급: ${user.position} vs ${existingEmployee.position}`);
                if (user.joindate !== existingEmployee.hireDate) mismatches.push(`입사일: ${user.joindate} vs ${existingEmployee.hireDate}`);
                if (user.birthdate !== existingEmployee.birthDate) mismatches.push(`생년월일: ${user.birthdate} vs ${existingEmployee.birthDate}`);
                
                if (mismatches.length > 0) {
                    console.log(`데이터 불일치 발견 - ${user.email}:`, mismatches);
                    issuesFound += mismatches.length;
                }
            }
        });
        
        console.log('=== 데이터 일관성 검증 완료 ===', {
            issuesFound,
            issuesFixed,
            usersCount: users.length,
            employeesCount: employees.length
        });
        
        return { issuesFound, issuesFixed, usersCount: users.length, employeesCount: employees.length };
    }
    
    // 자동 동기화 설정
    setupAutoSync() {
        // dataManager가 로드될 때까지 대기
        const checkDataManager = () => {
            if (typeof window.dataManager !== 'undefined') {
                console.log('자동 동기화 실행 중...');
                this.syncUsersToEmployees();
            } else {
                // 100ms 후 다시 확인
                setTimeout(checkDataManager, 100);
            }
        };
        
        // DOM이 로드된 후 동기화 실행 (중복 방지)
        if (!this.isInitialized) {
            this.isInitialized = true;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    checkDataManager();
                    this.initializeNavAvatar();
                    this.setupLogoutListener();
                });
            } else {
                checkDataManager();
                this.initializeNavAvatar();
                this.setupLogoutListener();
            }
        }
    }
    
    // 메뉴바 아바타 아이콘 초기화
    initializeNavAvatar() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.updateNavAvatarIcon(currentUser.profileImage);
        }
    }
    
    // 로그아웃 이벤트 리스너 설정
    setupLogoutListener() {
        // 전역 로그아웃 핸들러가 이미 등록되었는지 확인
        if (window.globalLogoutHandler) {
            return;
        }
        
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            // 전역 로그아웃 핸들러 등록
            window.globalLogoutHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('로그아웃 버튼 클릭됨');
                this.showLogoutConfirmation();
            };
            
            logoutLink.addEventListener('click', window.globalLogoutHandler, true);
            logoutLink.setAttribute('data-logout-listener', 'true');
            console.log('전역 로그아웃 리스너 설정 완료');
        }
    }
    
    
    
    // 로그아웃 확인 팝업 표시
    showLogoutConfirmation() {
        console.log('로그아웃 확인 팝업 표시');
        const confirmed = confirm('정말 로그아웃하시겠습니까?');
        console.log('사용자 선택:', confirmed ? '확인' : '취소');
        if (confirmed) {
            this.logout();
            window.location.href = 'login.html';
        }
        // 취소를 누르면 아무것도 하지 않음 (팝업만 닫힘)
    }
}

window.authManager = new AuthManager();

function getCurrentUser() { 
    return window.authManager.getCurrentUser(); 
}

function updateUserInStorage(user) { 
    return window.authManager.updateUserInStorage(user); 
}

function checkAuth() { 
    return window.authManager.checkAuth(); 
}

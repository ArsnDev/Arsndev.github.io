// 사용자 인증 및 UI 관리를 담당하는 모듈
const Auth = {
    // 현재 사용자 정보
    currentUser: null,

    // UI 요소들
    elements: {
        loginForm: null,
        registerForm: null,
        loading: null,
        alertContainer: null,
        showRegisterBtn: null,
        registerBackBtn: null
    },

    // 초기화
    init: function() {
        this.elements.loginForm = document.getElementById('loginForm');
        this.elements.registerForm = document.getElementById('registerForm');
        this.elements.loading = document.getElementById('loading');
        this.elements.alertContainer = document.getElementById('alert-container');
        this.elements.showRegisterBtn = document.getElementById('showRegisterBtn');
        this.elements.registerBackBtn = document.getElementById('registerBackBtn');

        this.bindEvents();
    },

    // 이벤트 바인딩
    bindEvents: function() {
        // 로그인 폼 제출
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 회원가입 폼 제출
        if (this.elements.registerForm) {
            this.elements.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // 회원가입 화면 전환
        if (this.elements.showRegisterBtn) {
            this.elements.showRegisterBtn.addEventListener('click', () => {
                this.showRegisterForm();
            });
        }

        // 로그인 화면으로 돌아가기
        if (this.elements.registerBackBtn) {
            this.elements.registerBackBtn.querySelector('button').addEventListener('click', () => {
                this.showLoginForm();
            });
        }
    },

    // 로그인 처리
    handleLogin: async function() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showAlert('아이디와 비밀번호를 입력해주세요.', 'danger');
            return;
        }

        this.showLoading(true);
        this.clearAlerts();

        try {
            // 1단계: 로그인 API 호출
            console.log('1단계: 로그인 시도...');
            const response = await API.auth.login(username, password);
            console.log('로그인 응답:', response);
            
            // JWT 토큰 저장 (sessionStorage 사용으로 탭별 분리)
            if (response && response.token) {
                sessionStorage.setItem('authToken', response.token);
                localStorage.removeItem('authToken'); // 기존 localStorage 토큰 제거
                console.log('토큰 저장 완료 (sessionStorage):', response.token);
            } else {
                throw new Error('서버에서 토큰을 받지 못했습니다.');
            }
            
            // 2단계: 사용자 정보 가져오기
            console.log('2단계: 사용자 정보 조회...');
            try {
                const userInfo = await API.auth.getMyInfo();
                console.log('사용자 정보:', userInfo);
                this.currentUser = userInfo;
                
                this.showAlert('로그인 성공!', 'success');
                
                // 메인 게임 화면으로 이동
                setTimeout(() => {
                    window.location.href = 'game.html';
                }, 1000);
                
            } catch (userInfoError) {
                console.error('사용자 정보 조회 실패:', userInfoError);
                // 토큰은 있지만 사용자 정보를 가져올 수 없는 경우
                // 일단 게임 화면으로 이동 (게임 화면에서 다시 시도)
                this.showAlert('로그인은 성공했지만 사용자 정보 로드에 실패했습니다. 게임 화면으로 이동합니다.', 'warning');
                setTimeout(() => {
                    window.location.href = 'game.html';
                }, 2000);
            }

        } catch (error) {
            console.error('로그인 실패:', error);
            // 토큰 제거
            localStorage.removeItem('authToken');
            this.showAlert('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.', 'danger');
        } finally {
            this.showLoading(false);
        }
    },

    // 회원가입 처리
    handleRegister: async function() {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;

        // 입력 검증
        if (!username || !password || !passwordConfirm) {
            this.showAlert('모든 필드를 입력해주세요.', 'danger');
            return;
        }

        if (username.length < 3 || username.length > 20) {
            this.showAlert('사용자명은 3-20자여야 합니다.', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('비밀번호는 최소 6자 이상이어야 합니다.', 'danger');
            return;
        }

        if (password !== passwordConfirm) {
            this.showAlert('비밀번호가 일치하지 않습니다.', 'danger');
            return;
        }

        this.showLoading(true);
        this.clearAlerts();

        try {
            await API.auth.register(username, password);
            
            this.showAlert('회원가입이 완료되었습니다! 로그인해주세요.', 'success');
            
            // 폼 초기화 후 로그인 화면으로 전환
            this.elements.registerForm.reset();
            setTimeout(() => {
                this.showLoginForm();
            }, 2000);

        } catch (error) {
            console.error('회원가입 실패:', error);
            if (error.message.includes('이미 존재')) {
                this.showAlert('이미 존재하는 사용자명입니다.', 'danger');
            } else {
                this.showAlert('회원가입에 실패했습니다. 다시 시도해주세요.', 'danger');
            }
        } finally {
            this.showLoading(false);
        }
    },

    // 자동 로그인 확인
    checkAutoLogin: function() {
        const token = localStorage.getItem('authToken');
        if (token) {
            // 토큰이 있으면 유효성 확인
            this.verifyToken();
        } else {
            // 토큰이 없으면 인증 이벤트 바인딩
            this.init();
        }
    },

    // 토큰 유효성 확인
    verifyToken: async function() {
        try {
            this.showLoading(true);
            const userInfo = await API.auth.getMyInfo();
            this.currentUser = userInfo;
            
            // 토큰이 유효하면 게임 화면으로 리다이렉트
            window.location.href = 'game.html';
        } catch (error) {
            console.error('토큰 검증 실패:', error);
            // 토큰이 유효하지 않으면 제거하고 로그인 화면 표시
            localStorage.removeItem('authToken');
            this.init();
        } finally {
            this.showLoading(false);
        }
    },

    // 로그아웃
    logout: function() {
        localStorage.removeItem('authToken');
        this.currentUser = null;
        window.location.href = 'index.html';
    },

    // 로그인 폼 표시
    showLoginForm: function() {
        this.elements.loginForm.classList.remove('d-none');
        this.elements.registerForm.classList.add('d-none');
        this.elements.showRegisterBtn.parentElement.classList.remove('d-none');
        this.elements.registerBackBtn.classList.add('d-none');
        this.clearAlerts();
        
        // 폼 제목 변경
        document.querySelector('.card-title').textContent = '오목 게임';
    },

    // 회원가입 폼 표시
    showRegisterForm: function() {
        this.elements.loginForm.classList.add('d-none');
        this.elements.registerForm.classList.remove('d-none');
        this.elements.showRegisterBtn.parentElement.classList.add('d-none');
        this.elements.registerBackBtn.classList.remove('d-none');
        this.clearAlerts();
        
        // 폼 제목 변경
        document.querySelector('.card-title').textContent = '회원가입';
    },

    // 로딩 상태 표시/숨김
    showLoading: function(show) {
        if (this.elements.loading) {
            if (show) {
                this.elements.loading.classList.remove('d-none');
                // 폼 비활성화
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    const inputs = form.querySelectorAll('input, button');
                    inputs.forEach(input => input.disabled = true);
                });
            } else {
                this.elements.loading.classList.add('d-none');
                // 폼 활성화
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    const inputs = form.querySelectorAll('input, button');
                    inputs.forEach(input => input.disabled = false);
                });
            }
        }
    },

    // 알림 메시지 표시
    showAlert: function(message, type = 'info') {
        if (!this.elements.alertContainer) return;

        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        this.elements.alertContainer.innerHTML = alertHtml;
        
        // 3초 후 자동 제거 (success 메시지만)
        if (type === 'success') {
            setTimeout(() => {
                this.clearAlerts();
            }, 3000);
        }
    },

    // 알림 메시지 제거
    clearAlerts: function() {
        if (this.elements.alertContainer) {
            this.elements.alertContainer.innerHTML = '';
        }
    },

    // 현재 사용자 정보 반환
    getCurrentUser: function() {
        return this.currentUser;
    },

    // 로그인 상태 확인
    isLoggedIn: function() {
        return this.currentUser !== null && localStorage.getItem('authToken') !== null;
    }
};

// 전역에서 사용할 수 있도록 window 객체에 등록
window.Auth = Auth;
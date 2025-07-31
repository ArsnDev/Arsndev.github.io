// REST API 호출을 담당하는 모듈
const API = {
    // 서버 기본 URL (Railway 배포 환경)
    BASE_URL: 'https://omokserverdeploy-production.up.railway.app/api',
    
    // HTTP 요청을 위한 기본 설정
    getHeaders: function(includeAuth = false) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    },

    // 일반적인 HTTP 요청 처리
    request: async function(url, options = {}) {
        try {
            console.log('API 요청:', `${this.BASE_URL}${url}`, options);
            const response = await fetch(`${this.BASE_URL}${url}`, {
                ...options,
                headers: {
                    ...this.getHeaders(options.includeAuth),
                    ...options.headers
                }
            });

            // 응답이 JSON인지 확인
            const contentType = response.headers.get('content-type');
            let data = null;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            console.log('API 응답:', response.status, data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    },

    // 사용자 인증 관련 API
    auth: {
        // 회원가입
        register: async function(username, password) {
            return await API.request('/users/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
        },

        // 로그인
        login: async function(username, password) {
            const response = await API.request('/users/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            // 응답 구조 확인
            console.log('Login API 원본 응답:', response);
            
            // 서버에서 { token: "..." } 형태로 응답하는지 확인
            if (typeof response === 'string') {
                try {
                    return JSON.parse(response);
                } catch (e) {
                    // 문자열이 JSON이 아닌 경우
                    return { token: response };
                }
            }
            
            return response;
        },

        // 내 정보 조회
        getMyInfo: async function() {
            return await API.request('/users/me', {
                method: 'GET',
                includeAuth: true
            });
        }
    },

    // 매칭 관련 API
    matchmaking: {
        // 매칭 대기열 등록
        joinQueue: async function() {
            return await API.request('/matchmaking/queue', {
                method: 'POST',
                includeAuth: true
            });
        }
    },

    // 경기 전적 관련 API
    matches: {
        // 사용자 전적 조회
        getUserHistory: async function(userId) {
            return await API.request(`/matches/history/${userId}`, {
                method: 'GET',
                includeAuth: true
            });
        },

        // 경기 결과 저장 (게임 종료 시 서버에서 자동 호출되므로 클라이언트에서는 사용 안 함)
        createMatch: async function(winnerId, loserId) {
            return await API.request('/matches', {
                method: 'POST',
                includeAuth: true,
                body: JSON.stringify({
                    winnerId: winnerId,
                    loserId: loserId
                })
            });
        }
    }
};

// 전역에서 사용할 수 있도록 window 객체에 등록
window.API = API;
// 단순한 SignalR 연결 모듈
const SimpleGameConnection = {
    connection: null,
    isConnected: false,
    currentUser: null,

    // SignalR 연결 초기화
    init: async function(userInfo) {
        this.currentUser = userInfo;
        console.log('SignalR 초기화 시작:', userInfo);
        
        // SignalR 연결 생성
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("https://omokserverdeploy-production.up.railway.app/gamehub", {
                accessTokenFactory: () => {
                    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                }
            })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .build();

        // 이벤트 핸들러 등록
        this.registerEventHandlers();

        try {
            // 연결 시작
            await this.connection.start();
            console.log('SignalR 연결 성공');
            this.isConnected = true;

            // 서버에 사용자 등록
            await this.registerUser();
            
        } catch (error) {
            console.error('SignalR 연결 실패:', error);
            throw error;
        }
    },

    // 이벤트 핸들러 등록
    registerEventHandlers: function() {
        // 연결 상태 변경 이벤트
        this.connection.onclose(async (error) => {
            console.error('SignalR 연결 끊어짐:', error);
            this.isConnected = false;
        });

        this.connection.onreconnecting((error) => {
            console.log('SignalR 재연결 시도 중:', error);
            this.isConnected = false;
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR 재연결 성공:', connectionId);
            this.isConnected = true;
            this.registerUser();
        });

        // 게임 상태 업데이트 (핵심 이벤트)
        this.connection.on("GameStateUpdate", (gameState) => {
            console.log('=== GameStateUpdate 이벤트 수신 ===');
            console.log('게임 상태:', gameState);
            
            // 매칭 완료 - 매칭 상태 정리
            if (this.currentUser) {
                const matchingKey = `matching_${this.currentUser.userId}`;
                sessionStorage.removeItem(matchingKey);
            }
            
            if (window.SimpleGame && window.SimpleGame.updateGameState) {
                window.SimpleGame.updateGameState(gameState);
            } else {
                console.error('SimpleGame.updateGameState를 찾을 수 없음');
            }
        });

        // 혹시 기존 MatchFound 이벤트도 처리 (임시)
        this.connection.on("MatchFound", (matchData) => {
            console.log('=== 기존 MatchFound 이벤트 수신 ===');
            console.log('매칭 데이터:', matchData);
        });

        // 액션 결과 (성공/실패 피드백)
        this.connection.on("ActionResult", (result) => {
            console.log('액션 결과 수신:', result);
            
            if (window.SimpleGame && window.SimpleGame.handleActionResult) {
                window.SimpleGame.handleActionResult(result);
            }
        });

        // 게임 종료
        this.connection.on("GameOver", (winnerName) => {
            console.log('게임 종료 수신:', winnerName);
            
            if (window.SimpleGame && window.SimpleGame.handleGameOver) {
                window.SimpleGame.handleGameOver(winnerName);
            }
        });
    },

    // 서버에 사용자 등록
    registerUser: async function() {
        if (!this.isConnected || !this.currentUser) {
            console.warn('연결되지 않았거나 사용자 정보가 없습니다.');
            return;
        }

        try {
            await this.connection.invoke("Register", this.currentUser.userId);
            console.log('사용자 등록 완료:', this.currentUser.userId);
        } catch (error) {
            console.error('사용자 등록 실패:', error);
        }
    },

    // 매칭 대기열 참가
    joinMatchmaking: async function() {
        try {
            console.log('=== 매칭 요청 시작 ===');
            console.log('연결 상태:', this.isConnected);
            console.log('사용자 정보:', this.currentUser);
            
            if (!this.isConnected) {
                throw new Error('SignalR 서버에 연결되지 않았습니다.');
            }
            
            // 중복 탭/창에서 같은 계정으로 매칭 시도 방지
            const matchingKey = `matching_${this.currentUser.userId}`;
            const isAlreadyMatching = sessionStorage.getItem(matchingKey);
            
            if (isAlreadyMatching) {
                throw new Error('이미 다른 창에서 매칭 대기 중입니다. 한 번에 하나의 매칭만 가능합니다.');
            }
            
            // 매칭 상태 저장
            sessionStorage.setItem(matchingKey, 'true');
            
            // REST API로 매칭 대기열 등록
            console.log('API.matchmaking.joinQueue 호출 중...');
            const response = await API.matchmaking.joinQueue();
            console.log('매칭 API 응답:', response);
            
            return response;
        } catch (error) {
            console.error('매칭 등록 실패:', error);
            // 실패 시 매칭 상태 제거
            const matchingKey = `matching_${this.currentUser.userId}`;
            sessionStorage.removeItem(matchingKey);
            throw error;
        }
    },

    // 돌 배치 (검증 없이 서버로 전송)
    placeStone: async function(roomId, x, y) {
        if (!this.isConnected) {
            console.error('서버에 연결되지 않았습니다.');
            return;
        }

        try {
            console.log('돌 배치 요청:', { roomId, x, y });
            await this.connection.invoke("PlaceStone", roomId, x, y);
        } catch (error) {
            console.error('돌 배치 요청 실패:', error);
        }
    },

    // 연결 해제
    disconnect: async function() {
        if (this.connection) {
            try {
                await this.connection.stop();
                console.log('SignalR 연결 해제');
            } catch (error) {
                console.error('연결 해제 중 오류:', error);
            }
            this.isConnected = false;
            this.connection = null;
        }
    }
};

// 전역에서 사용할 수 있도록 등록
window.SimpleGameConnection = SimpleGameConnection;
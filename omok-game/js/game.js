// 단순한 서버 중심 게임 클라이언트
const SimpleGame = {
    // 사용자 정보
    currentUser: null,
    
    // 현재 게임 상태 (서버에서 받은 그대로)
    gameState: null,
    
    // UI 상태
    screen: 'LOBBY', // LOBBY, MATCHING, GAME
    isMatching: false, // 매칭 중인지 상태 추적
    
    // UI 요소들
    elements: {},
    
    // 게임 보드 설정
    boardSize: 19,
    cellSize: 30,

    // 초기화
    init: async function() {
        try {
            // 로그인 상태 확인
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'index.html';
                return;
            }

            // 사용자 정보 가져오기
            this.currentUser = await API.auth.getMyInfo();
            console.log('현재 사용자:', this.currentUser);
            
            this.initUI();
            await this.connectToServer();
            
        } catch (error) {
            console.error('게임 초기화 실패:', error);
            alert('게임을 시작할 수 없습니다. 다시 로그인해주세요.');
            setTimeout(() => window.location.href = 'index.html', 3000);
        }
    },

    // UI 초기화
    initUI: function() {
        // UI 요소들 가져오기
        this.elements.canvas = document.getElementById('gameBoard');
        this.elements.ctx = this.elements.canvas.getContext('2d');
        this.elements.lobbyScreen = document.getElementById('lobbyScreen');
        this.elements.matchingScreen = document.getElementById('matchingScreen');
        this.elements.gameScreen = document.getElementById('gameScreen');
        this.elements.userInfo = document.getElementById('userInfo');
        this.elements.turnIndicator = document.getElementById('turnIndicator');
        this.elements.player1Info = document.getElementById('player1Info');
        this.elements.player2Info = document.getElementById('player2Info');

        // 사용자 정보 표시
        this.elements.userInfo.textContent = `${this.currentUser.username}님 환영합니다!`;

        // 이벤트 바인딩
        this.bindEvents();
        
        // 초기 화면 설정
        this.showScreen('LOBBY');
        this.drawEmptyBoard();
    },

    // 이벤트 바인딩
    bindEvents: function() {
        // 매칭 시작 버튼
        document.getElementById('startMatchingBtn').addEventListener('click', () => {
            this.startMatching();
        });

        // 매칭 취소 버튼
        document.getElementById('cancelMatchingBtn').addEventListener('click', () => {
            this.cancelMatching();
        });

        // 게임 보드 클릭 - 단순히 좌표만 서버로 전송
        this.elements.canvas.addEventListener('click', (e) => {
            this.handleBoardClick(e);
        });

        // 기권 버튼
        document.getElementById('forfeitBtn').addEventListener('click', () => {
            if (confirm('정말 기권하시겠습니까?')) {
                this.resetToLobby();
            }
        });

        // 다시 플레이 버튼
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.resetToLobby();
            this.startMatching();
        });

        // 페이지 벗어날 때 매칭 상태 정리
        window.addEventListener('beforeunload', () => {
            if (this.currentUser) {
                const matchingKey = `matching_${this.currentUser.userId}`;
                sessionStorage.removeItem(matchingKey);
            }
        });
    },

    // 서버 연결
    connectToServer: async function() {
        try {
            console.log('서버 연결 시작...');
            await SimpleGameConnection.init(this.currentUser);
            console.log('서버 연결 성공');
        } catch (error) {
            console.error('서버 연결 실패:', error);
            alert('서버에 연결할 수 없습니다.');
        }
    },

    // 매칭 시작
    startMatching: async function() {
        // 이미 매칭 중이면 중복 요청 방지
        if (this.isMatching) {
            alert('이미 매칭 대기 중입니다.');
            return;
        }

        try {
            console.log('매칭 시작...');
            this.isMatching = true;
            this.showScreen('MATCHING');
            
            const result = await SimpleGameConnection.joinMatchmaking();
            console.log('매칭 요청 완료:', result);
            
        } catch (error) {
            console.error('매칭 실패:', error);
            this.isMatching = false;
            alert('매칭을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
            this.showScreen('LOBBY');
        }
    },

    // 매칭 취소
    cancelMatching: function() {
        this.isMatching = false;
        
        // 매칭 상태 정리
        if (this.currentUser) {
            const matchingKey = `matching_${this.currentUser.userId}`;
            sessionStorage.removeItem(matchingKey);
        }
        
        this.showScreen('LOBBY');
        console.log('매칭이 취소되었습니다.');
    },

    // 게임 상태 업데이트 (서버에서 받은 상태 그대로 적용)
    updateGameState: function(newState) {
        console.log('게임 상태 업데이트:', newState);
        
        this.gameState = newState;
        this.isMatching = false; // 매칭 완료
        
        // 게임 화면으로 전환
        this.showScreen('GAME');
        
        // UI 업데이트
        this.updatePlayerInfo();
        this.updateTurnIndicator();
        this.drawBoard();
    },

    // 액션 결과 처리 (서버에서 오는 성공/실패 피드백)
    handleActionResult: function(result) {
        if (!result.success) {
            alert(result.message);
        }
    },

    // 보드 클릭 처리 - 검증 없이 서버로 전송
    handleBoardClick: function(event) {
        if (this.screen !== 'GAME' || !this.gameState) {
            return;
        }

        const rect = this.elements.canvas.getBoundingClientRect();
        const scaleX = this.elements.canvas.width / rect.width;
        const scaleY = this.elements.canvas.height / rect.height;
        
        const x = Math.floor(((event.clientX - rect.left) * scaleX) / this.cellSize);
        const y = Math.floor(((event.clientY - rect.top) * scaleY) / this.cellSize);

        // 좌표 범위만 체크
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            console.log('보드 클릭:', { x, y });
            SimpleGameConnection.placeStone(this.gameState.roomId, x, y);
        }
    },

    // 플레이어 정보 업데이트
    updatePlayerInfo: function() {
        if (!this.gameState) return;

        this.elements.player1Info.textContent = 
            `${this.gameState.player1.username} (흑돌)`;
        this.elements.player2Info.textContent = 
            `${this.gameState.player2.username} (백돌)`;
    },

    // 턴 표시 업데이트
    updateTurnIndicator: function() {
        if (!this.gameState) return;

        const currentPlayer = this.gameState.currentTurnPlayerId === this.gameState.player1.userId 
            ? this.gameState.player1 
            : this.gameState.player2;
            
        if (currentPlayer.userId === this.currentUser.userId) {
            this.elements.turnIndicator.textContent = '당신의 차례입니다';
            this.elements.turnIndicator.className = 'turn-indicator turn-mine';
        } else {
            this.elements.turnIndicator.textContent = `${currentPlayer.username}의 차례입니다`;
            this.elements.turnIndicator.className = 'turn-indicator turn-opponent';
        }
    },

    // 빈 보드 그리기
    drawEmptyBoard: function() {
        this.drawBoardGrid();
    },

    // 게임 보드 그리기
    drawBoard: function() {
        if (!this.gameState) {
            this.drawEmptyBoard();
            return;
        }

        this.drawBoardGrid();
        this.drawStones();
    },

    // 보드 격자 그리기
    drawBoardGrid: function() {
        const ctx = this.elements.ctx;
        const canvas = this.elements.canvas;
        
        // 배경 색상 (나무색)
        ctx.fillStyle = '#deb887';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 격자 그리기
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < this.boardSize; i++) {
            // 세로선
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize + this.cellSize / 2, this.cellSize / 2);
            ctx.lineTo(i * this.cellSize + this.cellSize / 2, canvas.height - this.cellSize / 2);
            ctx.stroke();
            
            // 가로선
            ctx.beginPath();
            ctx.moveTo(this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            ctx.lineTo(canvas.width - this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            ctx.stroke();
        }
        
        // 화점 그리기
        const stars = [3, 9, 15];
        ctx.fillStyle = '#000';
        for (let i = 0; i < stars.length; i++) {
            for (let j = 0; j < stars.length; j++) {
                const x = stars[i] * this.cellSize + this.cellSize / 2;
                const y = stars[j] * this.cellSize + this.cellSize / 2;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    },

    // 돌 그리기
    drawStones: function() {
        const ctx = this.elements.ctx;
        const board = this.gameState.board;
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (board[y][x] !== 0) {
                    const centerX = x * this.cellSize + this.cellSize / 2;
                    const centerY = y * this.cellSize + this.cellSize / 2;
                    const radius = this.cellSize / 2 - 2;
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    
                    if (board[y][x] === 1) {
                        // 흑돌
                        ctx.fillStyle = '#000';
                        ctx.fill();
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    } else {
                        // 백돌
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        }
    },

    // 화면 전환
    showScreen: function(screen) {
        this.screen = screen;
        
        // 모든 화면 숨기기
        this.elements.lobbyScreen.classList.add('d-none');
        this.elements.matchingScreen.classList.add('d-none');
        this.elements.gameScreen.classList.add('d-none');
        
        // 해당 화면 표시
        switch(screen) {
            case 'LOBBY':
                this.elements.lobbyScreen.classList.remove('d-none');
                break;
            case 'MATCHING':
                this.elements.matchingScreen.classList.remove('d-none');
                break;
            case 'GAME':
                this.elements.gameScreen.classList.remove('d-none');
                break;
        }
    },

    // 게임 종료 처리
    handleGameOver: function(winnerName) {
        console.log('게임 종료:', winnerName);
        
        const isWin = (winnerName === this.currentUser.username);
        const message = isWin ? '축하합니다! 승리했습니다!' : `${winnerName}님이 승리했습니다.`;
        
        // 마지막 게임 상태가 화면에 반영될 시간을 주기 위해 딜레이 추가
        setTimeout(() => {
            alert(message);
            this.resetToLobby();
        }, 1000); // 1초 딜레이
    },

    // 로비로 돌아가기
    resetToLobby: function() {
        this.gameState = null;
        this.isMatching = false;
        this.showScreen('LOBBY');
        this.drawEmptyBoard();
    }
};

// 전역에서 사용할 수 있도록 등록
window.SimpleGame = SimpleGame;
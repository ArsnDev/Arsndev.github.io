// 프로필 및 전적 페이지를 담당하는 모듈
const Profile = {
    currentUser: null,
    matchHistory: [],
    currentPage: 0,
    pageSize: 10,

    // 프로필 페이지 초기화
    init: async function() {
        try {
            // 로그인 상태 확인
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'index.html';
                return;
            }

            // 사용자 정보 가져오기
            this.currentUser = await API.auth.getMyInfo();
            
            // UI 업데이트
            this.updateUserInfo();
            this.loadMatchHistory();
            
        } catch (error) {
            console.error('프로필 초기화 실패:', error);
            this.showError('프로필을 불러올 수 없습니다. 다시 로그인해주세요.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
    },

    // 사용자 정보 업데이트
    updateUserInfo: function() {
        document.getElementById('userInfo').textContent = `${this.currentUser.username}님`;
        document.getElementById('profileUsername').textContent = this.currentUser.username;
        
        // 가입일 (실제로는 서버에서 제공해야 하는 정보)
        document.getElementById('profileJoinDate').textContent = '가입일: 정보 없음';
    },

    // 경기 전적 로드
    loadMatchHistory: async function() {
        try {
            this.showLoading(true);
            
            // 서버에서 전적 가져오기
            const matches = await API.matches.getUserHistory(this.currentUser.userId);
            this.matchHistory = matches || [];
            
            // 통계 계산 및 표시
            this.updateStatistics();
            
            // 전적 테이블 표시
            this.displayMatchHistory();
            
        } catch (error) {
            console.error('전적 로드 실패:', error);
            this.showError('전적을 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
        }
    },

    // 통계 계산 및 업데이트
    updateStatistics: function() {
        const totalGames = this.matchHistory.length;
        let totalWins = 0;
        let totalLosses = 0;

        // 승/패 계산
        this.matchHistory.forEach(match => {
            if (match.winnerId === this.currentUser.userId) {
                totalWins++;
            } else {
                totalLosses++;
            }
        });

        // 승률 계산
        const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0;

        // UI 업데이트
        document.getElementById('totalGames').textContent = totalGames;
        document.getElementById('totalWins').textContent = totalWins;
        document.getElementById('totalLosses').textContent = totalLosses;
        document.getElementById('winRate').textContent = `${winRate}%`;
    },

    // 전적 테이블 표시
    displayMatchHistory: function() {
        const tableContainer = document.getElementById('matchHistoryTable');
        const noHistoryContainer = document.getElementById('noMatchHistory');
        const tbody = document.getElementById('matchHistoryBody');

        if (this.matchHistory.length === 0) {
            // 전적이 없는 경우
            tableContainer.classList.add('d-none');
            noHistoryContainer.classList.remove('d-none');
            return;
        }

        // 전적이 있는 경우 테이블 표시
        noHistoryContainer.classList.add('d-none');
        tableContainer.classList.remove('d-none');

        // 테이블 내용 생성
        tbody.innerHTML = '';
        
        this.matchHistory.forEach(match => {
            const row = this.createMatchRow(match);
            tbody.appendChild(row);
        });
    },

    // 개별 전적 행 생성
    createMatchRow: function(match) {
        const row = document.createElement('tr');
        const isWin = match.winnerId === this.currentUser.userId;
        
        // 승리/패배에 따른 스타일
        row.className = isWin ? 'match-win' : 'match-lose';

        // 날짜 포맷
        const matchDate = new Date(match.matchDate);
        const dateString = matchDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 상대방 이름 (실제로는 서버에서 제공해야 하는 정보)
        const opponentName = isWin ? '상대방' : '상대방'; // 실제 구현에서는 userId로 이름을 조회해야 함

        // 결과 텍스트
        const resultText = isWin ? '승리' : '패배';
        const resultBadge = isWin ? 'badge bg-success' : 'badge bg-danger';

        // 게임 시간 (임시 데이터)
        const gameTime = this.getRandomGameTime();

        row.innerHTML = `
            <td>${dateString}</td>
            <td>${opponentName}</td>
            <td><span class="${resultBadge}">${resultText}</span></td>
            <td>${gameTime}</td>
        `;

        return row;
    },

    // 랜덤 게임 시간 생성 (실제로는 서버에서 제공해야 하는 정보)
    getRandomGameTime: function() {
        const minutes = Math.floor(Math.random() * 30) + 5; // 5-35분
        const seconds = Math.floor(Math.random() * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    // 로딩 상태 표시/숨김
    showLoading: function(show) {
        const loading = document.getElementById('matchHistoryLoading');
        const table = document.getElementById('matchHistoryTable');
        const noHistory = document.getElementById('noMatchHistory');
        const error = document.getElementById('matchHistoryError');

        if (show) {
            loading.classList.remove('d-none');
            table.classList.add('d-none');
            noHistory.classList.add('d-none');
            error.classList.add('d-none');
        } else {
            loading.classList.add('d-none');
        }
    },

    // 에러 메시지 표시
    showError: function(message) {
        const error = document.getElementById('matchHistoryError');
        const loading = document.getElementById('matchHistoryLoading');
        const table = document.getElementById('matchHistoryTable');
        const noHistory = document.getElementById('noMatchHistory');

        error.textContent = message;
        error.classList.remove('d-none');
        loading.classList.add('d-none');
        table.classList.add('d-none');
        noHistory.classList.add('d-none');
    },

    // 전적 새로고침
    refresh: function() {
        this.currentPage = 0;
        this.matchHistory = [];
        this.loadMatchHistory();
    }
};

// 전역에서 사용할 수 있도록 window 객체에 등록
window.Profile = Profile;
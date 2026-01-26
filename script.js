// ==================== Firebase 설정 ====================
const firebaseConfig = {
    apiKey: "AIzaSyDC-JC9-hEAz2iJ-5V5Marly9vPUGEP2VI",
    authDomain: "backup-3d781.firebaseapp.com",
    databaseURL: "https://backup-3d781-default-rtdb.firebaseio.com",
    projectId: "backup-3d781",
    storageBucket: "backup-3d781.firebasestorage.app",
    messagingSenderId: "987438509455",
    appId: "1:987438509455:web:e4b2d03d11b5a21f61affa"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== 전역 변수 ====================
let characters = {}; // { name: { image: url, color: colorCode } }
let conversations = []; // [{ id, title, text, dialogues }]
let activeConversationId = null;
let colorIndex = 0;
let appTitle = 'RP 포맷터';
let currentRoomId = null; // 사이트 전체(대화목록) 공유용
let isApplyingRemote = false; // 원격 변경 적용 중이면 재업로드 방지
let isDeleteMode = false;
let selectedConversationIds = new Set();
let isReorderMode = false;
let selectedForReorder = []; // 최대 2개까지 선택

// 기본 색상 팔레트 (새 캐릭터용)
const defaultColors = ['#5865F2', '#EB459E', '#3BA55C', '#FAA61A', '#ED4245', '#9B59B6'];

// ==================== DOM 요소 ====================
const sidebar = document.getElementById('sidebar');
const conversationList = document.getElementById('conversationList');
const characterCards = document.getElementById('characterCards');
const dialogueList = document.getElementById('dialogueList');
const characterModal = document.getElementById('characterModal');
const shareModal = document.getElementById('shareModal');
const writeModal = document.getElementById('writeModal');
const editCharModal = document.getElementById('editCharModal');
const characterList = document.getElementById('characterList');

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', async () => {
    // localStorage에서 데이터 불러오기
    loadFromStorage();
    
    // URL에서 공유 데이터 불러오기 (클라우드 로드는 비동기)
    await loadFromURL();
    
    // 대화가 없으면 기본 대화 생성
    if (conversations.length === 0) {
        createNewConversation('새 대화');
    }
    
    // 앱 제목 설정
    document.getElementById('appTitle').textContent = appTitle;
    document.title = appTitle;
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 렌더링
    renderConversationList();
    renderActiveConversation();
});

function setupEventListeners() {
    // 사이드바 토글
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('openSidebar').addEventListener('click', openSidebar);
    
    // 글쓰기 버튼
    document.getElementById('writeBtn').addEventListener('click', openWriteModal);
    document.getElementById('closeWriteModal').addEventListener('click', closeWriteModal);
    document.getElementById('saveDialogueBtn').addEventListener('click', saveDialogue);
    
    // 캐릭터 관리 버튼
    document.getElementById('manageCharactersBtn').addEventListener('click', openCharacterModal);
    document.getElementById('closeModal').addEventListener('click', closeCharacterModal);
    
    // 캐릭터 수정 모달
    document.getElementById('closeEditCharModal').addEventListener('click', closeEditCharModal);
    document.getElementById('saveEditCharBtn').addEventListener('click', saveEditCharacter);
    
    // 통합 공유 버튼
    document.getElementById('globalShareBtn').addEventListener('click', openGlobalShareModal);
    document.getElementById('closeShareModal').addEventListener('click', closeShareModal);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
    
    // 새 대화 추가
    document.getElementById('addTabBtn').addEventListener('click', () => {
        const title = prompt('대화 제목을 입력하세요:', '새 대화');
        if (title) {
            createNewConversation(title);
            renderConversationList();
            renderActiveConversation();
            saveToStorage();
        }
    });

    // 선택 삭제 모드
    document.getElementById('toggleDeleteModeBtn').addEventListener('click', toggleDeleteMode);
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => setDeleteMode(false));
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteSelected);
    
    // 순서 변경 모드
    document.getElementById('toggleReorderModeBtn').addEventListener('click', toggleReorderMode);
    document.getElementById('cancelReorderBtn').addEventListener('click', () => setReorderMode(false));
    
    // 캐릭터 추가
    document.getElementById('addCharacterBtn').addEventListener('click', addCharacter);
    
    // 이미지 입력 탭 전환
    document.querySelectorAll('.image-input-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.image-input-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('tab-' + e.target.dataset.tab).classList.add('active');
        });
    });
    
    // 파일 업로드 미리보기
    document.getElementById('newCharImageFile').addEventListener('change', handleFileUpload);
    
    // 색상 입력 연동 (새 캐릭터)
    document.getElementById('newCharColorPicker').addEventListener('input', (e) => {
        document.getElementById('newCharColor').value = e.target.value;
    });
    document.getElementById('newCharColor').addEventListener('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            document.getElementById('newCharColorPicker').value = color;
        }
    });
    
    // 색상 입력 연동 (수정 모달)
    document.getElementById('editCharColorPicker').addEventListener('input', (e) => {
        document.getElementById('editCharColor').value = e.target.value;
    });
    document.getElementById('editCharColor').addEventListener('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            document.getElementById('editCharColorPicker').value = color;
        }
    });
    
    // 모달 외부 클릭시 닫기
    writeModal.addEventListener('click', (e) => {
        if (e.target === writeModal) closeWriteModal();
    });
    characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) closeCharacterModal();
    });
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) closeShareModal();
    });
    editCharModal.addEventListener('click', (e) => {
        if (e.target === editCharModal) closeEditCharModal();
    });
}

// ==================== 사이드바 토글 ====================
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    document.getElementById('openSidebar').classList.toggle('visible', sidebar.classList.contains('collapsed'));
}

function openSidebar() {
    sidebar.classList.remove('collapsed');
    document.getElementById('openSidebar').classList.remove('visible');
}

// ==================== 앱 제목 변경 ====================
function editAppTitle() {
    const newTitle = prompt('새 제목을 입력하세요:', appTitle);
    if (newTitle && newTitle.trim()) {
        appTitle = newTitle.trim();
        document.getElementById('appTitle').textContent = appTitle;
        document.title = appTitle;
        saveToStorage();
    }
}

// ==================== 대화 관리 ====================
function createNewConversation(title) {
    const id = Date.now().toString();
    const newConversation = {
        id: id,
        title: title || '새 대화',
        text: '',
        dialogues: [],
        // 대화별 캐릭터 설정 (탭마다 분리)
        characters: {}
    };
    conversations.push(newConversation);
    activeConversationId = id;
    return newConversation;
}

function getActiveConversation() {
    return conversations.find(c => c.id === activeConversationId);
}

function getConversationCharacters(conv) {
    if (!conv) return characters; // 하위 호환(전역 캐릭터)
    if (!conv.characters) conv.characters = {};
    return conv.characters;
}

function getActiveCharacters() {
    return getConversationCharacters(getActiveConversation());
}

function switchConversation(id) {
    if (isDeleteMode) return; // 삭제 모드에서는 탭 전환 방지
    if (isReorderMode) return; // 순서 변경 모드에서는 탭 전환 방지
    activeConversationId = id;
    renderConversationList();
    renderActiveConversation();
}

function deleteConversation(id) {
    if (conversations.length <= 1) {
        alert('최소 하나의 대화가 필요합니다.');
        return;
    }
    
    if (!confirm('이 대화를 삭제하시겠습니까?')) return;
    
    const index = conversations.findIndex(c => c.id === id);
    conversations.splice(index, 1);
    
    // 활성 대화가 삭제된 경우 다른 대화로 전환
    if (activeConversationId === id) {
        activeConversationId = conversations[0].id;
    }
    
    renderConversationList();
    renderActiveConversation();
    saveToStorage();
}

function renameConversation(id) {
    if (isDeleteMode) return;
    if (isReorderMode) return;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    
    const newTitle = prompt('새 제목을 입력하세요:', conv.title);
    if (newTitle && newTitle.trim()) {
        conv.title = newTitle.trim();
        renderConversationList();
        renderActiveConversation();
        saveToStorage();
    }
}

function renderConversationList() {
    // 기본 모드
    if (!isDeleteMode && !isReorderMode) {
        conversationList.innerHTML = conversations.map(conv => `
            <div class="conversation-item ${conv.id === activeConversationId ? 'active' : ''}" 
                 data-id="${conv.id}"
                 onclick="switchConversation('${conv.id}')"
                 ondblclick="renameConversation('${conv.id}')">
                <span class="title">${escapeHtml(conv.title)}</span>
            </div>
        `).join('');
        return;
    }

    // 순서 변경 모드: 클릭으로 2개 선택
    if (isReorderMode) {
        conversationList.innerHTML = conversations.map(conv => {
            const selIndex = selectedForReorder.indexOf(conv.id);
            const isSelected = selIndex !== -1;
            return `
                <div class="conversation-item reorder-mode ${isSelected ? 'reorder-selected' : ''} ${conv.id === activeConversationId ? 'active' : ''}" 
                     data-id="${conv.id}"
                     onclick="toggleReorderSelection('${conv.id}')">
                    ${isSelected ? `<span class="reorder-number">${selIndex + 1}</span>` : ''}
                    <span class="title">${escapeHtml(conv.title)}</span>
                </div>
            `;
        }).join('');
        return;
    }

    // 삭제 모드: 체크박스로 선택
    conversationList.innerHTML = conversations.map(conv => {
        const checked = selectedConversationIds.has(conv.id) ? 'checked' : '';
        const disabled = (conversations.length <= 1) ? 'disabled' : '';
        return `
            <div class="conversation-item delete-mode ${conv.id === activeConversationId ? 'active' : ''}" data-id="${conv.id}">
                <input class="select-box" type="checkbox" ${checked} ${disabled}
                       onchange="toggleConversationSelection('${conv.id}', this.checked)" />
                <span class="title">${escapeHtml(conv.title)}</span>
            </div>
        `;
    }).join('');
}

function setDeleteMode(enabled) {
    // 순서 변경 모드가 켜져 있으면 먼저 끄기
    if (enabled && isReorderMode) setReorderMode(false);
    
    isDeleteMode = enabled;
    selectedConversationIds = new Set();

    const bar = document.getElementById('deleteModeBar');
    const btn = document.getElementById('toggleDeleteModeBtn');
    if (bar) bar.style.display = enabled ? 'flex' : 'none';
    if (btn) btn.classList.toggle('active', enabled);
    updateDeleteModeBar();
    renderConversationList();
}

function toggleDeleteMode() {
    setDeleteMode(!isDeleteMode);
}

// ==================== 순서 변경 모드 ====================
function setReorderMode(enabled) {
    // 삭제 모드가 켜져 있으면 먼저 끄기
    if (enabled && isDeleteMode) setDeleteMode(false);
    
    isReorderMode = enabled;
    selectedForReorder = [];

    const bar = document.getElementById('reorderModeBar');
    const btn = document.getElementById('toggleReorderModeBtn');
    if (bar) bar.style.display = enabled ? 'flex' : 'none';
    if (btn) btn.classList.toggle('reorder-active', enabled);
    updateReorderModeBar();
    renderConversationList();
}

function toggleReorderMode() {
    setReorderMode(!isReorderMode);
}

function toggleReorderSelection(id) {
    if (!isReorderMode) return;
    
    const index = selectedForReorder.indexOf(id);
    if (index !== -1) {
        // 이미 선택된 항목이면 해제
        selectedForReorder.splice(index, 1);
    } else {
        // 새로 선택
        if (selectedForReorder.length < 2) {
            selectedForReorder.push(id);
        }
    }
    
    updateReorderModeBar();
    renderConversationList();
    
    // 2개 선택되면 자동으로 교체 실행
    if (selectedForReorder.length === 2) {
        swapConversations();
    }
}

function updateReorderModeBar() {
    const countEl = document.getElementById('reorderModeCount');
    const count = selectedForReorder.length;
    if (countEl) countEl.textContent = `${count}개 선택 (2개 선택 시 교체)`;
}

function swapConversations() {
    if (selectedForReorder.length !== 2) return;
    
    const [id1, id2] = selectedForReorder;
    const index1 = conversations.findIndex(c => c.id === id1);
    const index2 = conversations.findIndex(c => c.id === id2);
    
    if (index1 === -1 || index2 === -1) return;
    
    // 위치 교체
    [conversations[index1], conversations[index2]] = [conversations[index2], conversations[index1]];
    
    // 선택 초기화하고 모드 유지 (연속 교체 가능)
    selectedForReorder = [];
    updateReorderModeBar();
    renderConversationList();
    saveToStorage();
}

function toggleConversationSelection(id, checked) {
    if (!isDeleteMode) return;
    if (checked) selectedConversationIds.add(id);
    else selectedConversationIds.delete(id);
    updateDeleteModeBar();
}

function updateDeleteModeBar() {
    const countEl = document.getElementById('deleteModeCount');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const count = selectedConversationIds.size;
    if (countEl) countEl.textContent = `${count}개 선택`;
    if (confirmBtn) confirmBtn.disabled = count === 0;
}

function confirmDeleteSelected() {
    if (!isDeleteMode) return;
    const ids = Array.from(selectedConversationIds);
    if (ids.length === 0) return;

    if (conversations.length - ids.length < 1) {
        alert('최소 하나의 대화가 필요합니다.');
        return;
    }

    if (!confirm(`선택한 ${ids.length}개의 대화를 삭제하시겠습니까?`)) return;

    conversations = conversations.filter(c => !selectedConversationIds.has(c.id));

    if (!conversations.find(c => c.id === activeConversationId)) {
        activeConversationId = conversations[0]?.id ?? null;
    }

    setDeleteMode(false);
    renderConversationList();
    renderActiveConversation();
    saveToStorage();
}

// ==================== 텍스트 파싱 ====================
function parseNaverCafeText(text, characterMap = null) {
    if (!text.trim()) return [];
    
    const results = [];
    const foundNames = []; // 발견된 모든 캐릭터 이름 (원본 형태: "에르빈 1", "노바 1" 등)
    const charMap = characterMap || getActiveCharacters();
    
    // "프로필" 키워드로 블록 분리
    const blocks = text.split(/프로필/);
    
    // 1차 파싱: 캐릭터 이름 수집
    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (!block) continue;
        
        const lines = block.split('\n');
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j].trim();
            if (j === 0 || (j === 1 && !isDateLine(lines[0].trim()))) {
                if (!isDateLine(line) && line) {
                    // 원본 이름 저장 (숫자 포함)
                    const rawName = line.replace(/작성자/g, '').trim();
                    if (rawName && !foundNames.includes(rawName)) {
                        foundNames.push(rawName);
                    }
                    break;
                }
            }
        }
    }
    
    // 2차 파싱: 대화 추출
    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (!block) continue;
        
        const lines = block.split('\n');
        let name = '';
        let dialogueLines = [];
        let foundDateLine = false;
        
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j].trim();
            
            // 첫 번째 줄에서 이름 추출
            if (j === 0 || (!name && !foundDateLine)) {
                // 탭으로 시작하는 경우 (프로필\t이름 형식)
                if (lines[j].startsWith('\t') || lines[j].match(/^\s+/)) {
                    name = extractName(line);
                    continue;
                }
                // 날짜 패턴이 아닌 경우 이름으로 간주
                if (!isDateLine(line) && !name) {
                    name = extractName(line);
                    continue;
                }
            }
            
            // 날짜 + 답글 라인 건너뛰기
            if (isDateLine(line)) {
                foundDateLine = true;
                continue;
            }
            
            // 날짜 라인 이후의 내용은 대사
            if (foundDateLine && line) {
                dialogueLines.push(lines[j]); // 원본 라인 사용 (들여쓰기 유지)
            }
        }
        
        if (name && dialogueLines.length > 0) {
            // 대사 텍스트에서 앞에 붙은 태그(다른 캐릭터 이름) 제거
            let dialogueText = dialogueLines.join('\n').trim();
            dialogueText = removeLeadingMention(dialogueText, foundNames);
            
            results.push({
                name: name,
                text: dialogueText
            });
            
            // 새 캐릭터면 등록 (기본 색상으로)
            if (!charMap[name]) {
                charMap[name] = {
                    image: '',
                    color: defaultColors[colorIndex++ % defaultColors.length]
                };
            }
        }
    }
    
    return results;
}

// 대사 앞에 붙은 멘션(태그된 이름) 제거
function removeLeadingMention(text, names) {
    for (const rawName of names) {
        // 원본 이름으로 시작하면 제거 (예: "노바 1 (대사..." → "(대사...")
        if (text.startsWith(rawName + ' ')) {
            return text.substring(rawName.length + 1).trim();
        }
        if (text.startsWith(rawName)) {
            return text.substring(rawName.length).trim();
        }
    }
    return text;
}

function extractName(text) {
    // "작성자" 제거 후 이름만 추출
    let name = text
        .replace(/작성자/g, '') // "작성자" 제거
        .replace(/[\t\s]+/g, ' ') // 공백 정리
        .trim();
    
    // 맨 뒤의 구분자 제거 (공백 + 숫자 또는 공백 + 짧은 영문자)
    // 예: "노바 1" → "노바", "노바 V" → "노바", "에르빈 1" → "에르빈"
    name = name.replace(/\s+(\d+|[A-Za-z]{1,2})$/, '');
    
    // 공백 없이 붙은 숫자도 제거 (예: "캐릭터123" → "캐릭터")
    name = name.replace(/\d+$/, '');
    
    return name.trim() || text.trim();
}

function isDateLine(line) {
    // 날짜 패턴: YYYY.MM.DD. HH:MM 또는 유사한 형식
    // 그리고 "답글" 또는 "답글수정|삭제" 포함
    const datePattern = /\d{4}\.\d{1,2}\.\d{1,2}/;
    const replyPattern = /답글/;
    
    return datePattern.test(line) || replyPattern.test(line);
}

// ==================== 캐릭터 색상 가져오기 ====================
function getCharacterColor(name, characterMap = null) {
    const charMap = characterMap || getActiveCharacters();
    const char = charMap[name];
    if (char && char.color) {
        return char.color;
    }
    // 이전 버전 호환 (colorIndex가 있는 경우)
    if (char && char.colorIndex !== undefined) {
        return defaultColors[char.colorIndex % defaultColors.length];
    }
    return defaultColors[0];
}

// ==================== 렌더링 ====================
function renderActiveConversation() {
    const conv = getActiveConversation();
    if (!conv) {
        document.getElementById('currentConversationTitle').textContent = '';
        characterCards.innerHTML = '';
        dialogueList.innerHTML = '<div class="empty-message">대화를 선택하세요</div>';
        return;
    }
    
    document.getElementById('currentConversationTitle').textContent = conv.title;
    renderCharacterCards(conv.dialogues);
    renderDialogues(conv.dialogues);
}

function renderCharacterCards(dialogues) {
    const charMap = getActiveCharacters();
    // 현재 대화에 등장하는 캐릭터만 표시 (이미지/접는글 항목 제외)
    const activeCharacters = [...new Set(dialogues.filter(d => !d.type && d.name).map(d => d.name))];
    
    if (activeCharacters.length === 0) {
        characterCards.innerHTML = '';
        characterCards.style.display = 'none';
        return;
    }
    
    characterCards.style.display = 'flex';
    characterCards.innerHTML = activeCharacters.map(name => {
        const char = charMap[name] || { image: '' };
        const color = getCharacterColor(name, charMap);
        
        return `
            <div class="character-card">
                ${char.image 
                    ? `<img src="${char.image}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="placeholder" style="display:none; width:70px; height:70px; border-radius:12px; background:${color}">${name.charAt(0)}</div>`
                    : `<div class="placeholder" style="width:70px; height:70px; border-radius:12px; background:${color}">${name.charAt(0)}</div>`
                }
                <span class="name">${name}</span>
            </div>
        `;
    }).join('');
}

function renderDialogues(dialogues) {
    const charMap = getActiveCharacters();
    if (dialogues.length === 0) {
        dialogueList.innerHTML = '<div class="empty-message">글쓰기 버튼을 눌러 대화를 추가하세요</div>';
        return;
    }
    
    dialogueList.innerHTML = dialogues.map((dialogue, index) => {
        // 이미지 전용 항목인 경우
        if (dialogue.type === 'image') {
            return `
                <div class="dialogue-image-item" data-index="${index}">
                    <img src="${dialogue.url}" alt="삽입된 이미지" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22100%22><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23999%22>이미지 로드 실패</text></svg>';">
                    <button class="btn-delete-item" onclick="deleteDialogueItem(${index})" title="삭제">&times;</button>
                </div>
            `;
        }
        
        // 접는 글 항목인 경우
        if (dialogue.type === 'fold') {
            return `
                <div class="dialogue-fold-item" data-index="${index}">
                    <details class="fold-details">
                        <summary>${escapeHtml(dialogue.title)}</summary>
                        <div class="fold-content">${escapeHtml(dialogue.content).replace(/\n/g, '<br>')}</div>
                    </details>
                    <button class="btn-delete-item" onclick="deleteDialogueItem(${index})" title="삭제">&times;</button>
                </div>
            `;
        }
        
        const char = charMap[dialogue.name] || { image: '' };
        const color = getCharacterColor(dialogue.name, charMap);
        
        // 텍스트 내 [img:URL] 패턴을 이미지로 변환
        const processedText = processTextWithImages(escapeHtml(dialogue.text));
        
        return `
            <div class="dialogue-item" style="border-left-color: ${color}" data-index="${index}">
                <div class="avatar">
                    ${char.image 
                        ? `<img src="${char.image}" alt="${dialogue.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <div class="placeholder" style="display:none; background:${color}">${dialogue.name.charAt(0)}</div>`
                        : `<div class="placeholder" style="background:${color}">${dialogue.name.charAt(0)}</div>`
                    }
                </div>
                <div class="content">
                    <div class="name" style="color: ${color}">${dialogue.name}</div>
                    <div class="text">${processedText}</div>
                </div>
                <button class="btn-add-item" onclick="showInsertMenu(event, ${index})" title="항목 삽입">+</button>
            </div>
        `;
    }).join('');
}

// 텍스트 내 [img:URL] 및 [fold:제목]내용[/fold] 패턴을 변환
function processTextWithImages(text) {
    // [img:URL] 패턴을 찾아서 이미지 태그로 변환
    let result = text.replace(/\[img:(https?:\/\/[^\]]+)\]/g, '<img src="$1" class="inline-image" onclick="window.open(\'$1\', \'_blank\')" onerror="this.outerHTML=\'[이미지 로드 실패]\';">');
    
    // [fold:제목]내용[/fold] 패턴을 찾아서 details/summary로 변환
    result = result.replace(/\[fold:([^\]]+)\]([\s\S]*?)\[\/fold\]/g, '<details class="inline-fold"><summary>$1</summary><div class="fold-content">$2</div></details>');
    
    return result;
}

// 삽입 메뉴 표시
function showInsertMenu(event, index) {
    event.stopPropagation();
    
    // 기존 메뉴 제거
    const existingMenu = document.querySelector('.insert-menu');
    if (existingMenu) existingMenu.remove();
    
    // 메뉴 생성
    const menu = document.createElement('div');
    menu.className = 'insert-menu';
    menu.innerHTML = `
        <button onclick="insertImageAfter(${index}); closeInsertMenu();">이미지 삽입</button>
        <button onclick="insertFoldAfter(${index}); closeInsertMenu();">접는 글 삽입</button>
    `;
    
    // 버튼 위치에 메뉴 배치
    const btn = event.target;
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.left = rect.left + 'px';
    
    document.body.appendChild(menu);
    
    // 외부 클릭시 메뉴 닫기
    setTimeout(() => {
        document.addEventListener('click', closeInsertMenu, { once: true });
    }, 0);
}

function closeInsertMenu() {
    const menu = document.querySelector('.insert-menu');
    if (menu) menu.remove();
}

// 대화 항목 뒤에 이미지 삽입
function insertImageAfter(index) {
    const url = prompt('삽입할 이미지 URL을 입력하세요:');
    if (!url || !url.trim()) return;
    
    const conv = getActiveConversation();
    if (!conv) return;
    
    // 이미지 항목 생성
    const imageItem = {
        type: 'image',
        url: url.trim()
    };
    
    // 해당 인덱스 다음에 삽입
    conv.dialogues.splice(index + 1, 0, imageItem);
    
    renderActiveConversation();
    saveToStorage();
}

// 대화 항목 뒤에 접는 글 삽입
function insertFoldAfter(index) {
    const title = prompt('접는 글 제목을 입력하세요:');
    if (!title || !title.trim()) return;
    
    const content = prompt('접힌 내용을 입력하세요:');
    if (!content) return;
    
    const conv = getActiveConversation();
    if (!conv) return;
    
    // 접는 글 항목 생성
    const foldItem = {
        type: 'fold',
        title: title.trim(),
        content: content
    };
    
    // 해당 인덱스 다음에 삽입
    conv.dialogues.splice(index + 1, 0, foldItem);
    
    renderActiveConversation();
    saveToStorage();
}

// 대화 항목 삭제
function deleteDialogueItem(index) {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    
    const conv = getActiveConversation();
    if (!conv) return;
    
    conv.dialogues.splice(index, 1);
    
    renderActiveConversation();
    saveToStorage();
}

// ==================== 글쓰기 모달 ====================
function openWriteModal() {
    const conv = getActiveConversation();
    if (conv) {
        document.getElementById('dialogueTitle').value = conv.title;
        document.getElementById('inputText').value = conv.text;
    }
    writeModal.classList.add('active');
}

function closeWriteModal() {
    writeModal.classList.remove('active');
}

function saveDialogue() {
    const conv = getActiveConversation();
    if (!conv) return;
    
    const title = document.getElementById('dialogueTitle').value.trim();
    const text = document.getElementById('inputText').value;
    
    conv.title = title || '새 대화';
    conv.text = text;
    conv.dialogues = parseNaverCafeText(text, getConversationCharacters(conv));
    
    closeWriteModal();
    renderConversationList();
    renderActiveConversation();
    saveToStorage();
    
    // Firebase에 공유된 대화면 업데이트
    updateFirebaseIfShared(conv);
}

// Firebase 공유 데이터 업데이트
async function updateFirebaseIfShared(conv) {
    if (conv.shareId) {
        try {
            await database.ref(`shares/${conv.shareId}`).update({
                conversation: conv,
                characters: getConversationCharacters(conv),
                appTitle: appTitle,
                updatedAt: new Date().toISOString()
            });
            console.log('Firebase 업데이트 완료');
        } catch (error) {
            console.error('Firebase 업데이트 실패:', error);
        }
    }
}

// ==================== 캐릭터 관리 ====================
function openCharacterModal() {
    renderCharacterList();
    characterModal.classList.add('active');
}

function closeCharacterModal() {
    characterModal.classList.remove('active');
}

function renderCharacterList() {
    const charMap = getActiveCharacters();
    const charNames = Object.keys(charMap);
    
    if (charNames.length === 0) {
        characterList.innerHTML = '<div class="empty-message">등록된 캐릭터가 없습니다</div>';
        return;
    }
    
    characterList.innerHTML = charNames.map(name => {
        const char = charMap[name];
        const color = getCharacterColor(name, charMap);
        
        return `
            <div class="character-list-item">
                ${char.image 
                    ? `<img src="${char.image}" alt="${name}">`
                    : `<div class="placeholder" style="width:50px;height:50px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:white">${name.charAt(0)}</div>`
                }
                <div class="color-dot" style="background:${color}"></div>
                <div class="info">
                    <div class="name">${name}</div>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary" onclick="openEditCharModal('${escapeHtml(name)}')">수정</button>
                    <button class="btn btn-danger" onclick="deleteCharacter('${escapeHtml(name)}')">삭제</button>
                </div>
            </div>
        `;
    }).join('');
}

function addCharacter() {
    const charMap = getActiveCharacters();
    const name = document.getElementById('newCharName').value.trim();
    const color = document.getElementById('newCharColor').value.trim() || '#5865F2';
    let image = '';
    
    // URL 탭이 활성화된 경우
    if (document.querySelector('.image-input-tabs .tab-btn[data-tab="url"]').classList.contains('active')) {
        image = document.getElementById('newCharImageUrl').value.trim();
    } else {
        // 업로드 탭인 경우 미리보기에서 이미지 가져오기
        const previewImg = document.querySelector('#uploadPreview img');
        if (previewImg) {
            image = previewImg.src;
        }
    }
    
    if (!name) {
        alert('캐릭터 이름을 입력하세요.');
        return;
    }
    
    charMap[name] = {
        image: image,
        color: color
    };
    
    // 폼 초기화
    document.getElementById('newCharName').value = '';
    document.getElementById('newCharImageUrl').value = '';
    document.getElementById('newCharImageFile').value = '';
    document.getElementById('uploadPreview').innerHTML = '';
    // 색상은 다음 기본 색상으로 설정
    const nextColor = defaultColors[colorIndex++ % defaultColors.length];
    document.getElementById('newCharColor').value = nextColor;
    document.getElementById('newCharColorPicker').value = nextColor;
    
    saveToStorage();
    renderCharacterList();
    renderActiveConversation();
}

// ==================== 캐릭터 수정 모달 ====================
function openEditCharModal(name) {
    const charMap = getActiveCharacters();
    const char = charMap[name];
    if (!char) return;
    
    document.getElementById('editCharOriginalName').value = name;
    document.getElementById('editCharName').value = name;
    document.getElementById('editCharImageUrl').value = char.image || '';
    
    const color = getCharacterColor(name, charMap);
    document.getElementById('editCharColor').value = color;
    document.getElementById('editCharColorPicker').value = color;
    
    editCharModal.classList.add('active');
}

function closeEditCharModal() {
    editCharModal.classList.remove('active');
}

function saveEditCharacter() {
    const conv = getActiveConversation();
    if (!conv) return;
    const charMap = getConversationCharacters(conv);
    const originalName = document.getElementById('editCharOriginalName').value;
    const newName = document.getElementById('editCharName').value.trim();
    const newImage = document.getElementById('editCharImageUrl').value.trim();
    const newColor = document.getElementById('editCharColor').value.trim();
    
    if (!newName) {
        alert('캐릭터 이름을 입력하세요.');
        return;
    }
    
    // 이름이 변경된 경우
    if (originalName !== newName) {
        // 새 이름으로 데이터 복사
        charMap[newName] = {
            image: newImage,
            color: newColor
        };
        // 기존 이름 삭제
        delete charMap[originalName];
        
        // 현재 대화에서만 이름 변경 (탭별 캐릭터 관리)
        conv.dialogues.forEach(dialogue => {
            if (dialogue.name === originalName) {
                dialogue.name = newName;
            }
        });
    } else {
        // 이름이 같으면 속성만 업데이트
        if (!charMap[originalName]) charMap[originalName] = { image: '', color: defaultColors[0] };
        charMap[originalName].image = newImage;
        charMap[originalName].color = newColor;
    }
    
    closeEditCharModal();
    saveToStorage();
    renderCharacterList();
    renderActiveConversation();
}

function deleteCharacter(name) {
    const charMap = getActiveCharacters();
    if (confirm(`"${name}" 캐릭터를 삭제하시겠습니까?`)) {
        delete charMap[name];
        saveToStorage();
        renderCharacterList();
        renderActiveConversation();
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('uploadPreview').innerHTML = `<img src="${event.target.result}">`;
    };
    reader.readAsDataURL(file);
}

// ==================== 공유 기능 ====================
function openGlobalShareModal() {
    shareModal.classList.add('active');
    const linkInput = document.getElementById('shareLink');
    const statusEl = document.getElementById('shareStatus');
    const copyBtn = document.getElementById('copyLinkBtn');

    // 통합 공유 링크 생성
    const params = new URLSearchParams();
    if (currentRoomId) params.set('room', currentRoomId);
    if (roll20RoomId) params.set('roll20', roll20RoomId);
    
    if (params.toString()) {
        linkInput.value = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        
        const hasRP = !!currentRoomId;
        const hasRoll20 = !!roll20RoomId;
        let msg = '✓ ';
        if (hasRP && hasRoll20) {
            msg += 'RP 포맷터 + Roll20 뷰어 통합 공유 링크입니다.';
        } else if (hasRP) {
            msg += 'RP 포맷터 공유 링크입니다. (Roll20은 관리자 로그인 필요)';
        } else {
            msg += 'Roll20 뷰어 공유 링크입니다. (RP 포맷터는 공유 생성 필요)';
        }
        
        statusEl.textContent = msg;
        statusEl.className = 'share-status success';
        copyBtn.disabled = false;
        return;
    }

    linkInput.value = '';
    statusEl.textContent = '아직 공유 방이 없습니다. 아래 버튼으로 생성하세요.';
    statusEl.className = 'share-status';
    copyBtn.disabled = true;
}

function closeShareModal() {
    shareModal.classList.remove('active');
}

// 공유 링크 생성 (Firebase) - 사이트 전체(대화 목록) 공유
async function generateShareLink() {
    const nowIso = new Date().toISOString();
    const roomId = currentRoomId || database.ref('rooms').push().key;
    if (!roomId) {
        alert('공유 링크 생성에 실패했습니다.');
        return;
    }

    const roomData = {
        appTitle,
        characters,
        conversations,
        activeConversationId,
        createdAt: nowIso,
        updatedAt: nowIso
    };
    
    const statusEl = document.getElementById('shareStatus');
    const linkInput = document.getElementById('shareLink');
    const copyBtn = document.getElementById('copyLinkBtn');
    
    statusEl.textContent = '링크 생성 중...';
    statusEl.className = 'share-status loading';
    copyBtn.disabled = true;
    const shortenerHelpEl = document.getElementById('shortenerHelp');
    if (shortenerHelpEl) shortenerHelpEl.style.display = 'none';
    
    try {
        // Firebase에 사이트 전체 상태 저장 (rooms/<roomId>)
        if (currentRoomId) {
            await database.ref(`rooms/${roomId}`).update({
                appTitle,
                characters,
                conversations,
                activeConversationId,
                updatedAt: nowIso
            });
        } else {
            await database.ref(`rooms/${roomId}`).set(roomData);
        }

        currentRoomId = roomId;
        localStorage.setItem('rpFormatter_roomId', currentRoomId);
        
        // 통합 공유 링크 생성
        const params = new URLSearchParams();
        params.set('room', roomId);
        if (roll20RoomId) params.set('roll20', roll20RoomId);
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        
        linkInput.value = shareUrl;
        
        const hasRoll20 = !!roll20RoomId;
        if (hasRoll20) {
            statusEl.textContent = '✓ RP 포맷터 + Roll20 뷰어 통합 링크가 생성되었습니다!';
        } else {
            statusEl.textContent = '✓ RP 포맷터 공유 링크가 생성되었습니다! (Roll20은 관리자 로그인 필요)';
        }
        statusEl.className = 'share-status success';
        copyBtn.disabled = false;
        saveToStorage();
        
    } catch (error) {
        console.error('Firebase 저장 실패:', error);
        statusEl.textContent = '❌ 링크 생성에 실패했습니다.';
        statusEl.className = 'share-status error';
    }
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    if (!linkInput.value) return;
    
    // 클립보드 API 사용 시도
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkInput.value).then(() => {
            showCopySuccess();
        }).catch(() => {
            // 폴백
            linkInput.select();
            document.execCommand('copy');
            showCopySuccess();
        });
    } else {
        linkInput.select();
        document.execCommand('copy');
        showCopySuccess();
    }
}

function showCopySuccess() {
    const btn = document.getElementById('copyLinkBtn');
    const originalText = btn.textContent;
    btn.textContent = '복사됨!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function copyAndOpenTinyURL() {
    const linkInput = document.getElementById('shareLink');
    if (!linkInput.value) return;
    
    // 먼저 복사
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkInput.value).then(() => {
            alert('링크가 복사되었습니다!\n\nTinyURL 페이지에서 붙여넣기(Ctrl+V)하세요.');
            window.open('https://tinyurl.com/', '_blank');
        }).catch(() => {
            linkInput.select();
            document.execCommand('copy');
            alert('링크가 복사되었습니다!\n\nTinyURL 페이지에서 붙여넣기(Ctrl+V)하세요.');
            window.open('https://tinyurl.com/', '_blank');
        });
    } else {
        linkInput.select();
        document.execCommand('copy');
        alert('링크가 복사되었습니다!\n\nTinyURL 페이지에서 붙여넣기(Ctrl+V)하세요.');
        window.open('https://tinyurl.com/', '_blank');
    }
}

// URL에서 데이터 로드
async function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 사이트 전체 공유 방 ID (새 방식)
    const roomId = urlParams.get('room');
    // (하위 호환) 예전 단일 대화 공유 ID
    const legacyShareId = urlParams.get('share');
    // 압축 데이터 (이전 방식 - 하위 호환성)
    const compressedData = urlParams.get('d');
    // 레거시 데이터 (하위 호환성)
    const legacyData = urlParams.get('data');
    
    let decoded = null;
    
    // Firebase rooms에서 불러오기 (사이트 전체)
    if (roomId) {
        try {
            currentRoomId = roomId;
            localStorage.setItem('rpFormatter_roomId', currentRoomId);

            const snapshot = await database.ref(`rooms/${roomId}`).once('value');
            if (snapshot.exists()) {
                decoded = snapshot.val();
                
                // 실시간 업데이트 감지
                database.ref(`rooms/${roomId}`).on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const updatedData = snapshot.val();
                        applyRoomData(updatedData);
                        renderConversationList();
                        renderActiveConversation();
                    }
                });
            }
        } catch (e) {
            console.error('Firebase 데이터 로드 실패:', e);
        }
    }
    // (하위 호환) 예전 단일 대화 shares/<id>도 시도
    else if (legacyShareId) {
        try {
            const snapshot = await database.ref(`shares/${legacyShareId}`).once('value');
            if (snapshot.exists()) {
                decoded = snapshot.val();
                // 기존 링크는 단일 대화 스냅샷/실시간(legacy) 동작 유지
                database.ref(`shares/${legacyShareId}`).on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const updatedData = snapshot.val();
                        if (updatedData.conversation) {
                            const existingIndex = conversations.findIndex(c => c.id === updatedData.conversation.id);
                            if (existingIndex >= 0) conversations[existingIndex] = updatedData.conversation;
                            else conversations.push(updatedData.conversation);
                            activeConversationId = updatedData.conversation.id;
                        }
                        if (updatedData.characters) characters = { ...characters, ...updatedData.characters };
                        renderConversationList();
                        renderActiveConversation();
                    }
                });
            }
        } catch (e) {
            console.error('Firebase(legacy share) 데이터 로드 실패:', e);
        }
    }
    // 압축 데이터
    else if (compressedData) {
        try {
            const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
            decoded = JSON.parse(decompressed);
        } catch (e) {
            console.error('압축 데이터 로드 실패:', e);
        }
    }
    // 레거시 데이터
    else if (legacyData) {
        try {
            decoded = JSON.parse(decodeURIComponent(atob(legacyData)));
        } catch (e) {
            console.error('공유 데이터 로드 실패:', e);
        }
    }
    
    if (decoded) {
        // room 데이터면 전체 적용, 아니면 기존 구조(대화 1개) 적용
        if (decoded.conversations) {
            applyRoomData(decoded);
        } else {
            if (decoded.conversation) {
                const existingIndex = conversations.findIndex(c => c.id === decoded.conversation.id);
                if (existingIndex >= 0) conversations[existingIndex] = decoded.conversation;
                else conversations.push(decoded.conversation);
                activeConversationId = decoded.conversation.id;
            }
            if (decoded.characters) characters = { ...characters, ...decoded.characters };
            if (decoded.appTitle) {
                appTitle = decoded.appTitle;
                document.getElementById('appTitle').textContent = appTitle;
                document.title = appTitle;
            }
        }
        
        // URL 정리 (파라미터 제거)
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function applyRoomData(data) {
    try {
        isApplyingRemote = true;
        if (data.appTitle) {
            appTitle = data.appTitle;
            const titleEl = document.getElementById('appTitle');
            if (titleEl) titleEl.textContent = appTitle;
            document.title = appTitle;
        }
        // room 데이터는 conversations 안에 characters가 들어가는 구조가 기본
        // (하위 호환) data.characters(전역)가 있는 경우, 각 대화에 characters가 없으면 채워 넣음
        const legacyChars = (data.characters && typeof data.characters === 'object') ? data.characters : null;
        if (Array.isArray(data.conversations)) conversations = data.conversations;
        if (legacyChars && Array.isArray(conversations)) {
            conversations.forEach(conv => {
                if (!conv.characters) conv.characters = JSON.parse(JSON.stringify(legacyChars));
            });
        }
        if (data.activeConversationId) activeConversationId = data.activeConversationId;
        saveToStorage(); // 로컬에도 저장(단, isApplyingRemote로 Firebase 재업로드는 막음)
    } finally {
        isApplyingRemote = false;
    }
}

// ==================== 로컬 스토리지 ====================
function saveToStorage() {
    localStorage.setItem('rpFormatter_conversations', JSON.stringify(conversations));
    localStorage.setItem('rpFormatter_activeId', activeConversationId);
    localStorage.setItem('rpFormatter_characters', JSON.stringify(characters));
    localStorage.setItem('rpFormatter_colorIndex', colorIndex.toString());
    localStorage.setItem('rpFormatter_appTitle', appTitle);
    
    if (currentRoomId) localStorage.setItem('rpFormatter_roomId', currentRoomId);

    // Firebase(rooms)에도 업데이트: 사이트 전체를 공유 중이면 항상 반영
    if (currentRoomId && !isApplyingRemote) {
        const nowIso = new Date().toISOString();
        database.ref(`rooms/${currentRoomId}`).update({
            appTitle,
            characters,
            conversations,
            activeConversationId,
            updatedAt: nowIso
        }).catch((e) => console.error('Firebase rooms 업데이트 실패:', e));
    }
}

function loadFromStorage() {
    const savedConversations = localStorage.getItem('rpFormatter_conversations');
    const savedActiveId = localStorage.getItem('rpFormatter_activeId');
    const savedCharacters = localStorage.getItem('rpFormatter_characters');
    const savedColorIndex = localStorage.getItem('rpFormatter_colorIndex');
    const savedAppTitle = localStorage.getItem('rpFormatter_appTitle');
    const savedRoomId = localStorage.getItem('rpFormatter_roomId');
    
    if (savedConversations) {
        try {
            conversations = JSON.parse(savedConversations);
        } catch (e) {
            console.error('대화 데이터 로드 실패:', e);
        }
    }
    
    if (savedActiveId) {
        activeConversationId = savedActiveId;
    }
    
    if (savedCharacters) {
        try {
            characters = JSON.parse(savedCharacters);
        } catch (e) {
            console.error('캐릭터 데이터 로드 실패:', e);
        }
    }
    
    if (savedColorIndex) {
        colorIndex = parseInt(savedColorIndex, 10);
    }
    
    if (savedAppTitle) {
        appTitle = savedAppTitle;
    }

    if (savedRoomId) {
        currentRoomId = savedRoomId;
    }

    // 마이그레이션: 예전 전역 characters → 대화별 characters
    // 기존 데이터는 각 대화에 복사해 넣되, 이미 대화별 설정이 있으면 유지
    if (conversations && conversations.length > 0) {
        const hasLegacy = characters && Object.keys(characters).length > 0;
        conversations.forEach(conv => {
            if (!conv.characters) {
                conv.characters = hasLegacy ? JSON.parse(JSON.stringify(characters)) : {};
            }
        });
    }
}

// ==================== 유틸리티 함수 ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Roll20 뷰어 ====================
// Roll20 전역 변수
let roll20RoomId = null;
let roll20IsAdmin = false;
let roll20Password = null;
let roll20Unsubscribe = null;

// Roll20 로그 목록 관련 변수
let roll20Logs = []; // { id, title, created_at, updated_at }
let activeRoll20LogId = null;
let roll20DeleteMode = false;
let roll20SelectedForDelete = new Set();

// Roll20 초기화 (DOMContentLoaded에서 호출)
function initRoll20() {
    setupRoll20EventListeners();
    loadRoll20FromURL();
}

// Roll20 이벤트 리스너 설정
function setupRoll20EventListeners() {
    // 앱 탭 전환
    document.querySelectorAll('.app-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const appType = e.target.dataset.app;
            switchApp(appType);
        });
    });

    // 사이드바 토글
    document.getElementById('roll20ToggleSidebar').addEventListener('click', toggleRoll20Sidebar);
    document.getElementById('roll20OpenSidebar').addEventListener('click', openRoll20Sidebar);
    
    // 앱 제목 더블클릭으로 수정
    document.querySelector('.roll20-sidebar .app-title').addEventListener('dblclick', editRoll20AppTitle);

    // 로그 추가/삭제
    document.getElementById('roll20AddLogBtn').addEventListener('click', addRoll20Log);
    document.getElementById('roll20DeleteModeBtn').addEventListener('click', toggleRoll20DeleteMode);
    document.getElementById('roll20ConfirmDeleteBtn').addEventListener('click', confirmRoll20Delete);
    document.getElementById('roll20CancelDeleteBtn').addEventListener('click', cancelRoll20DeleteMode);
    
    // 세션 카드 이미지
    document.getElementById('roll20AddImageBtn').querySelector('button').addEventListener('click', addRoll20SessionImage);
    document.getElementById('roll20EditImageBtn').addEventListener('click', editRoll20SessionImage);
    
    // 세션 날짜
    document.getElementById('roll20EditDateBtn').addEventListener('click', editRoll20SessionDate);
    
    // 추가 메모
    document.getElementById('roll20AddNoteBtn').addEventListener('click', addRoll20Note);

    // 관리자 모드 버튼
    document.getElementById('roll20AdminBtn').addEventListener('click', openRoll20PasswordModal);
    document.getElementById('closeRoll20PasswordModal').addEventListener('click', closeRoll20PasswordModal);
    document.getElementById('roll20PasswordSubmit').addEventListener('click', submitRoll20Password);
    
    // 비밀번호 입력에서 엔터키
    document.getElementById('roll20Password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitRoll20Password();
    });

    // 로그아웃
    document.getElementById('roll20LogoutBtn').addEventListener('click', roll20Logout);

    // 저장/미리보기
    document.getElementById('roll20SaveBtn').addEventListener('click', saveRoll20Html);
    document.getElementById('roll20PreviewBtn').addEventListener('click', previewRoll20Html);

    // Roll20 공유 모달 (통합 공유로 대체됨)
    // document.getElementById('roll20ShareBtn').addEventListener('click', openRoll20ShareModal);
    // document.getElementById('closeRoll20ShareModal').addEventListener('click', closeRoll20ShareModal);
    // document.getElementById('roll20GenerateLinkBtn').addEventListener('click', generateRoll20ShareLink);
    // document.getElementById('roll20CopyLinkBtn').addEventListener('click', copyRoll20ShareLink);

    // 모달 외부 클릭 닫기
    document.getElementById('roll20PasswordModal').addEventListener('click', (e) => {
        if (e.target.id === 'roll20PasswordModal') closeRoll20PasswordModal();
    });
    document.getElementById('roll20ShareModal').addEventListener('click', (e) => {
        if (e.target.id === 'roll20ShareModal') closeRoll20ShareModal();
    });
}

// Roll20 사이드바 토글
function toggleRoll20Sidebar() {
    const sidebar = document.getElementById('roll20Sidebar');
    const openBtn = document.getElementById('roll20OpenSidebar');
    sidebar.classList.add('collapsed');
    openBtn.style.display = 'flex';
}

function openRoll20Sidebar() {
    const sidebar = document.getElementById('roll20Sidebar');
    const openBtn = document.getElementById('roll20OpenSidebar');
    sidebar.classList.remove('collapsed');
    openBtn.style.display = 'none';
}

// Roll20 앱 제목 수정
function editRoll20AppTitle() {
    if (!roll20IsAdmin) {
        alert('관리자만 제목을 수정할 수 있습니다.');
        return;
    }
    
    const titleEl = document.querySelector('.roll20-sidebar .app-title');
    const currentTitle = titleEl.textContent;
    const newTitle = prompt('새 제목을 입력하세요:', currentTitle);
    
    if (newTitle && newTitle !== currentTitle) {
        titleEl.textContent = newTitle;
        
        // Firebase에 저장
        if (roll20RoomId) {
            database.ref(`roll20_rooms/${roll20RoomId}`).update({
                app_title: newTitle
            });
        }
    }
}

// Roll20 로그 목록 렌더링
function renderRoll20LogList() {
    const container = document.getElementById('roll20LogList');
    container.innerHTML = '';
    
    if (roll20Logs.length === 0) {
        container.innerHTML = '<p class="empty-list">로그가 없습니다. + 버튼을 눌러 추가하세요.</p>';
        return;
    }
    
    roll20Logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'conversation-item' + (log.id === activeRoll20LogId ? ' active' : '');
        item.dataset.logId = log.id;
        
        if (roll20DeleteMode) {
            const isSelected = roll20SelectedForDelete.has(log.id);
            item.innerHTML = `
                <input type="checkbox" class="delete-checkbox" ${isSelected ? 'checked' : ''}>
                <span class="conversation-title-text">${log.title}</span>
            `;
            item.querySelector('.delete-checkbox').addEventListener('change', (e) => {
                if (e.target.checked) {
                    roll20SelectedForDelete.add(log.id);
                } else {
                    roll20SelectedForDelete.delete(log.id);
                }
                updateRoll20DeleteModeCount();
            });
        } else {
            item.innerHTML = `<span class="conversation-title-text">${log.title}</span>`;
            item.addEventListener('click', () => selectRoll20Log(log.id));
            item.addEventListener('dblclick', () => renameRoll20Log(log.id));
        }
        
        container.appendChild(item);
    });
}

// Roll20 로그 선택
function selectRoll20Log(logId) {
    activeRoll20LogId = logId;
    renderRoll20LogList();
    loadRoll20LogContent(logId);
    
    // 제목 업데이트
    const log = roll20Logs.find(l => l.id === logId);
    if (log) {
        document.getElementById('roll20CurrentLogTitle').textContent = log.title;
    }
}

// Roll20 현재 로그 참조
let roll20CurrentLogRef = null;

// Roll20 로그 콘텐츠 로드
function loadRoll20LogContent(logId) {
    if (!roll20RoomId || !logId) return;
    
    // 기존 구독 해제
    if (roll20CurrentLogRef) {
        roll20CurrentLogRef.off();
        roll20CurrentLogRef = null;
    }
    
    roll20CurrentLogRef = database.ref(`roll20_rooms/${roll20RoomId}/logs/${logId}`);
    roll20CurrentLogRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        // 세션 카드 이미지 처리
        updateRoll20SessionImage(data ? data.image_url : null);
        
        // 세션 날짜 처리
        updateRoll20SessionDate(data ? data.session_date : null);
        
        // 추가 메모 처리
        renderRoll20Notes(data ? data.notes : null);
        
        if (data && data.content) {
            renderRoll20Content(data.content);
            document.getElementById('roll20HtmlInput').value = data.content;
        } else {
            document.getElementById('roll20ChatContent').innerHTML = 
                '<p class="roll20-empty-message">채팅 로그가 없습니다. 관리자가 HTML을 업로드하면 여기에 표시됩니다.</p>';
            document.getElementById('roll20HtmlInput').value = '';
        }
    });
}

// 세션 카드 이미지 업데이트
function updateRoll20SessionImage(imageUrl) {
    const cardDiv = document.getElementById('roll20SessionCard');
    const addBtn = document.getElementById('roll20AddImageBtn');
    const editBtn = document.getElementById('roll20EditImageBtn');
    const img = document.getElementById('roll20SessionImage');
    
    if (imageUrl) {
        img.src = imageUrl;
        cardDiv.style.display = 'block';
        addBtn.style.display = 'none';
        editBtn.style.display = roll20IsAdmin ? 'block' : 'none';
    } else {
        cardDiv.style.display = 'none';
        addBtn.style.display = roll20IsAdmin ? 'block' : 'none';
    }
}

// 세션 카드 이미지 추가
async function addRoll20SessionImage() {
    if (!roll20IsAdmin || !activeRoll20LogId) return;
    
    const imageUrl = prompt('세션 카드 이미지 URL을 입력하세요:');
    if (!imageUrl) return;
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}`).update({
        image_url: imageUrl,
        updated_at: Date.now()
    });
}

// 세션 카드 이미지 수정
async function editRoll20SessionImage() {
    if (!roll20IsAdmin || !activeRoll20LogId) return;
    
    const currentUrl = document.getElementById('roll20SessionImage').src;
    const imageUrl = prompt('세션 카드 이미지 URL을 입력하세요:\n(비우면 이미지가 삭제됩니다)', currentUrl);
    
    if (imageUrl === null) return; // 취소
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}`).update({
        image_url: imageUrl || null,
        updated_at: Date.now()
    });
}

// 세션 날짜 업데이트
function updateRoll20SessionDate(dateStr) {
    const dateText = document.getElementById('roll20DateText');
    const editBtn = document.getElementById('roll20EditDateBtn');
    
    if (dateStr) {
        dateText.textContent = dateStr;
        dateText.style.color = '#333';
    } else {
        dateText.textContent = '날짜 미설정';
        dateText.style.color = '#999';
    }
    
    editBtn.style.display = roll20IsAdmin ? 'block' : 'none';
}

// 세션 날짜 수정
async function editRoll20SessionDate() {
    if (!roll20IsAdmin || !activeRoll20LogId) return;
    
    const currentDate = document.getElementById('roll20DateText').textContent;
    const isDefault = currentDate === '날짜 미설정';
    const dateStr = prompt('세션 날짜를 입력하세요:\n(예: 2024.01.15, 1월 15일 등)', isDefault ? '' : currentDate);
    
    if (dateStr === null) return; // 취소
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}`).update({
        session_date: dateStr || null,
        updated_at: Date.now()
    });
}

// 추가 메모 렌더링
function renderRoll20Notes(notes) {
    const container = document.getElementById('roll20NotesList');
    const addBtn = document.getElementById('roll20AddNoteBtn');
    
    container.innerHTML = '';
    addBtn.style.display = roll20IsAdmin ? 'block' : 'none';
    
    if (!notes) return;
    
    const noteIds = Object.keys(notes).sort((a, b) => {
        return (notes[a].created_at || 0) - (notes[b].created_at || 0);
    });
    
    noteIds.forEach(noteId => {
        const note = notes[noteId];
        const item = document.createElement('div');
        item.className = 'roll20-note-item';
        item.dataset.noteId = noteId;
        item.dataset.imageUrl = note.image_url || '';
        
        let imageHtml = '';
        if (note.image_url) {
            imageHtml = `<div class="roll20-note-image"><img src="${escapeHtml(note.image_url)}" alt="메모 이미지"></div>`;
        }
        
        item.innerHTML = `
            <div class="roll20-note-header" onclick="toggleRoll20Note('${noteId}')">
                <span class="roll20-note-title">
                    <span class="roll20-note-toggle">▶</span>
                    ${escapeHtml(note.title || '제목 없음')}
                </span>
                ${roll20IsAdmin ? `
                <div class="roll20-note-actions" onclick="event.stopPropagation()">
                    <button onclick="editRoll20Note('${noteId}')" title="수정">✏️</button>
                    <button onclick="deleteRoll20Note('${noteId}')" title="삭제">🗑️</button>
                </div>
                ` : ''}
            </div>
            <div class="roll20-note-content">
                <div class="roll20-note-content-inner">${escapeHtml(note.content || '')}</div>
                ${imageHtml}
            </div>
        `;
        
        container.appendChild(item);
    });
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 메모 접기/펼치기
function toggleRoll20Note(noteId) {
    const item = document.querySelector(`.roll20-note-item[data-note-id="${noteId}"]`);
    if (item) {
        item.classList.toggle('expanded');
    }
}

// 메모 추가
async function addRoll20Note() {
    if (!roll20IsAdmin || !activeRoll20LogId) return;
    
    const title = prompt('메모 제목을 입력하세요:');
    if (!title) return;
    
    const content = prompt('메모 내용을 입력하세요:');
    if (content === null) return;
    
    const imageUrl = prompt('이미지 URL을 입력하세요 (없으면 비워두세요):');
    
    const noteId = 'note_' + Date.now();
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}/notes/${noteId}`).set({
        title: title,
        content: content,
        image_url: imageUrl || null,
        created_at: Date.now()
    });
}

// 메모 수정
async function editRoll20Note(noteId) {
    if (!roll20IsAdmin || !activeRoll20LogId) return;
    
    const item = document.querySelector(`.roll20-note-item[data-note-id="${noteId}"]`);
    if (!item) return;
    
    const currentTitle = item.querySelector('.roll20-note-title').textContent.trim().replace('▶', '').trim();
    const currentContent = item.querySelector('.roll20-note-content-inner').textContent;
    const currentImage = item.dataset.imageUrl || '';
    
    const newTitle = prompt('메모 제목을 입력하세요:', currentTitle);
    if (newTitle === null) return;
    
    const newContent = prompt('메모 내용을 입력하세요:', currentContent);
    if (newContent === null) return;
    
    const newImage = prompt('이미지 URL을 입력하세요 (삭제하려면 비워두세요):', currentImage);
    if (newImage === null) return;
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}/notes/${noteId}`).update({
        title: newTitle,
        content: newContent,
        image_url: newImage || null
    });
}

// 메모 삭제
async function deleteRoll20Note(noteId) {
    if (!roll20IsAdmin || !activeRoll20LogId) return;
    
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}/notes/${noteId}`).remove();
}

// Roll20 로그 추가
async function addRoll20Log() {
    if (!roll20IsAdmin) {
        alert('관리자만 로그를 추가할 수 있습니다. 먼저 관리자 모드로 로그인하세요.');
        return;
    }
    
    if (!roll20RoomId) {
        alert('먼저 관리자 모드로 로그인하세요.');
        return;
    }
    
    const title = prompt('로그 제목을 입력하세요:', '새 세션');
    if (!title) return;
    
    const logId = 'log_' + Date.now();
    const newLog = {
        id: logId,
        title: title,
        content: '',
        created_at: Date.now(),
        updated_at: Date.now()
    };
    
    try {
        // Firebase에 저장
        await database.ref(`roll20_rooms/${roll20RoomId}/logs/${logId}`).set(newLog);
        
        // 로컬 목록에 추가하고 선택
        roll20Logs.push({ id: logId, title: title, created_at: newLog.created_at });
        selectRoll20Log(logId);
    } catch (error) {
        console.error('로그 추가 실패:', error);
        alert('로그 추가에 실패했습니다. 다시 시도해주세요.');
    }
}

// Roll20 로그 이름 변경
async function renameRoll20Log(logId) {
    if (!roll20IsAdmin) return;
    
    const log = roll20Logs.find(l => l.id === logId);
    if (!log) return;
    
    const newTitle = prompt('새 제목을 입력하세요:', log.title);
    if (!newTitle || newTitle === log.title) return;
    
    // Firebase 업데이트
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${logId}`).update({
        title: newTitle,
        updated_at: Date.now()
    });
    
    // 로컬 업데이트
    log.title = newTitle;
    renderRoll20LogList();
    
    if (logId === activeRoll20LogId) {
        document.getElementById('roll20CurrentLogTitle').textContent = newTitle;
    }
}

// Roll20 삭제 모드 토글
function toggleRoll20DeleteMode() {
    if (!roll20IsAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
    }
    
    roll20DeleteMode = true;
    roll20SelectedForDelete.clear();
    document.getElementById('roll20DeleteModeBar').style.display = 'flex';
    document.getElementById('roll20DeleteModeBtn').style.display = 'none';
    document.getElementById('roll20AddLogBtn').style.display = 'none';
    renderRoll20LogList();
    updateRoll20DeleteModeCount();
}

function cancelRoll20DeleteMode() {
    roll20DeleteMode = false;
    roll20SelectedForDelete.clear();
    document.getElementById('roll20DeleteModeBar').style.display = 'none';
    document.getElementById('roll20DeleteModeBtn').style.display = '';
    document.getElementById('roll20AddLogBtn').style.display = '';
    renderRoll20LogList();
}

function updateRoll20DeleteModeCount() {
    const count = roll20SelectedForDelete.size;
    document.getElementById('roll20DeleteModeCount').textContent = `${count}개 선택`;
    document.getElementById('roll20ConfirmDeleteBtn').disabled = count === 0;
}

async function confirmRoll20Delete() {
    if (roll20SelectedForDelete.size === 0) return;
    
    if (!confirm(`선택한 ${roll20SelectedForDelete.size}개의 로그를 삭제하시겠습니까?`)) return;
    
    // Firebase에서 삭제
    for (const logId of roll20SelectedForDelete) {
        await database.ref(`roll20_rooms/${roll20RoomId}/logs/${logId}`).remove();
    }
    
    // 로컬에서 삭제
    roll20Logs = roll20Logs.filter(log => !roll20SelectedForDelete.has(log.id));
    
    // 현재 선택된 로그가 삭제되었으면 초기화
    if (roll20SelectedForDelete.has(activeRoll20LogId)) {
        activeRoll20LogId = null;
        document.getElementById('roll20CurrentLogTitle').textContent = '로그를 선택하세요';
        document.getElementById('roll20ChatContent').innerHTML = 
            '<p class="roll20-empty-message">로그를 선택하거나 새 로그를 추가하세요.</p>';
    }
    
    cancelRoll20DeleteMode();
}

// 앱 전환
function switchApp(appType) {
    document.querySelectorAll('.app-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.app === appType);
    });
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.toggle('active', section.id === (appType === 'rp' ? 'rpSection' : 'roll20Section'));
    });

    // Roll20 탭으로 전환 시 URL 파라미터 확인
    if (appType === 'roll20') {
        loadRoll20FromURL();
    }
}

// URL에서 Roll20 룸 ID 로드
function loadRoll20FromURL() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('roll20');
    
    if (roomId) {
        roll20RoomId = roomId;
        subscribeToRoll20Room(roomId);
        
        // Roll20 탭으로 자동 전환
        switchApp('roll20');
    }
}

// Roll20 룸 구독 (실시간)
// Roll20 로그 목록 참조
let roll20LogsRef = null;

function subscribeToRoll20Room(roomId) {
    // 기존 구독 해제
    if (roll20LogsRef) {
        roll20LogsRef.off();
        roll20LogsRef = null;
    }
    if (roll20CurrentLogRef) {
        roll20CurrentLogRef.off();
        roll20CurrentLogRef = null;
    }

    // 앱 제목 로드
    database.ref(`roll20_rooms/${roomId}/app_title`).once('value', (snapshot) => {
        const appTitle = snapshot.val();
        if (appTitle) {
            document.querySelector('.roll20-sidebar .app-title').textContent = appTitle;
        }
    });

    // 로그 목록 구독
    roll20LogsRef = database.ref(`roll20_rooms/${roomId}/logs`);
    
    roll20LogsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        roll20Logs = [];
        
        if (data) {
            Object.keys(data).forEach(logId => {
                roll20Logs.push({
                    id: logId,
                    title: data[logId].title || '제목 없음',
                    created_at: data[logId].created_at || 0
                });
            });
            // 생성일 기준 정렬
            roll20Logs.sort((a, b) => a.created_at - b.created_at);
        }
        
        renderRoll20LogList();
        
        if (roll20Logs.length > 0) {
            // 선택된 로그가 없거나 목록에 없으면 첫 번째 선택
            const activeExists = roll20Logs.some(l => l.id === activeRoll20LogId);
            if (!activeRoll20LogId || !activeExists) {
                selectRoll20Log(roll20Logs[0].id);
            } else {
                // 이미 선택된 로그가 있고, 아직 구독 중이 아니면 콘텐츠 로드
                if (!roll20CurrentLogRef) {
                    loadRoll20LogContent(activeRoll20LogId);
                }
                const log = roll20Logs.find(l => l.id === activeRoll20LogId);
                if (log) {
                    document.getElementById('roll20CurrentLogTitle').textContent = log.title;
                }
            }
        } else {
            activeRoll20LogId = null;
            document.getElementById('roll20ChatContent').innerHTML = 
                '<p class="roll20-empty-message">로그를 선택하거나 새 로그를 추가하세요.</p>';
        }
    });
}

// Roll20 파스텔 배경색 (5가지)
const roll20PastelColors = [
    '#fef0f3', // 연한 분홍
    '#e3f2fd', // 연한 파랑
    '#e8eaf6', // 연한 인디고
    '#e8f5e9', // 연한 초록
    '#fff8e1'  // 연한 노랑
];

// 캐릭터 이름 -> 색상 매핑
const roll20CharacterColorMap = {};
let roll20ColorIndex = 0;

// 캐릭터 이름으로 색상 가져오기
function getRoll20CharacterColor(characterName) {
    if (!characterName) return '#ffffff';
    
    // 이미 할당된 색상이 있으면 반환
    if (roll20CharacterColorMap[characterName]) {
        return roll20CharacterColorMap[characterName];
    }
    
    // 새 색상 할당
    const color = roll20PastelColors[roll20ColorIndex % roll20PastelColors.length];
    roll20CharacterColorMap[characterName] = color;
    roll20ColorIndex++;
    
    return color;
}

// Roll20 콘텐츠 렌더링
function renderRoll20Content(htmlContent) {
    const container = document.getElementById('roll20ChatContent');
    
    // 깨진 이모지 변환 및 판정 텍스트에 🎲 추가
    let processedContent = htmlContent;
    
    // 다양한 깨진 이모지/문자 패턴 처리
    processedContent = processedContent.replace(/□/g, '🎲');
    processedContent = processedContent.replace(/&#x1F3B2;/gi, '🎲');
    processedContent = processedContent.replace(/&#127922;/g, '🎲');
    processedContent = processedContent.replace(/\uFFFD/g, '🎲'); // replacement character
    
    // 깨진 서로게이트 쌍 제거 (물음표, @? 패턴 등)
    processedContent = processedContent.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '');
    processedContent = processedContent.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
    
    // @ 뒤에 물음표가 여러 개 있는 패턴 제거 (깨진 이모지)
    processedContent = processedContent.replace(/@\?+/g, '');
    processedContent = processedContent.replace(/\?{3,}/g, '');
    // 이모지 뒤 물음표 제거
    processedContent = processedContent.replace(/🎲\s*\?+/g, '🎲');
    
    // "XX 판정" 패턴 뒤에 이미 🎲가 없는 경우에만 추가
    // 이미 🎲가 있으면 건드리지 않음
    processedContent = processedContent.replace(/(판정\s*)(?!🎲)<\/a>/g, '$1🎲</a>');
    
    container.innerHTML = processedContent;
    
    // 캐릭터별 배경색 적용
    applyRoll20CharacterColors();
    
    // 관리자 모드면 수정/삭제 버튼 추가
    if (roll20IsAdmin) {
        container.classList.add('admin-mode');
        addAdminActionsToMessages();
    }
}

// 캐릭터별 배경색 적용
function applyRoll20CharacterColors() {
    // 색상 맵 초기화
    Object.keys(roll20CharacterColorMap).forEach(key => delete roll20CharacterColorMap[key]);
    roll20ColorIndex = 0;
    
    const messages = document.querySelectorAll('.roll20-chat-content .message.general');
    let currentCharacter = null;
    
    messages.forEach(msg => {
        const byElement = msg.querySelector('.by');
        
        if (byElement) {
            // 새 캐릭터 이름 발견
            currentCharacter = byElement.textContent.trim().replace(/:$/, '');
        }
        
        if (currentCharacter) {
            const color = getRoll20CharacterColor(currentCharacter);
            msg.style.backgroundColor = color;
        }
    });
}

// Roll20 비밀번호 모달 열기
function openRoll20PasswordModal() {
    document.getElementById('roll20PasswordModal').classList.add('active');
    document.getElementById('roll20Password').value = '';
    document.getElementById('roll20PasswordError').style.display = 'none';
    document.getElementById('roll20Password').focus();
}

// Roll20 비밀번호 모달 닫기
function closeRoll20PasswordModal() {
    document.getElementById('roll20PasswordModal').classList.remove('active');
}

// Roll20 비밀번호 제출
async function submitRoll20Password() {
    const password = document.getElementById('roll20Password').value.trim();
    if (!password) {
        showRoll20PasswordError('비밀번호를 입력하세요.');
        return;
    }

    const hashedPassword = await hashPassword(password);

    // 룸이 없으면 새로 생성
    if (!roll20RoomId) {
        roll20RoomId = generateRoomId();
        roll20Password = hashedPassword;
        roll20IsAdmin = true;
        
        // Firebase에 룸 생성 (새 구조)
        await database.ref('roll20_rooms/' + roll20RoomId).set({
            password: hashedPassword,
            created_at: Date.now(),
            logs: {}
        });
        
        // 룸 구독
        subscribeToRoll20Room(roll20RoomId);
        
        // URL 업데이트
        updateRoll20URL();
        
        closeRoll20PasswordModal();
        showRoll20AdminPanel();
        return;
    }

    // 기존 룸의 비밀번호 확인
    const snapshot = await database.ref('roll20_rooms/' + roll20RoomId + '/password').once('value');
    const storedPassword = snapshot.val();

    if (!storedPassword) {
        // 비밀번호가 없으면 설정
        await database.ref('roll20_rooms/' + roll20RoomId + '/password').set(hashedPassword);
        roll20Password = hashedPassword;
        roll20IsAdmin = true;
        closeRoll20PasswordModal();
        showRoll20AdminPanel();
    } else if (storedPassword === hashedPassword) {
        // 비밀번호 일치
        roll20Password = hashedPassword;
        roll20IsAdmin = true;
        closeRoll20PasswordModal();
        showRoll20AdminPanel();
    } else {
        // 비밀번호 불일치
        showRoll20PasswordError('비밀번호가 일치하지 않습니다.');
    }
}

// 비밀번호 해시
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 룸 ID 생성
function generateRoomId() {
    return 'roll20_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// Roll20 비밀번호 에러 표시
function showRoll20PasswordError(message) {
    const errorEl = document.getElementById('roll20PasswordError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// 관리자 패널 표시
function showRoll20AdminPanel() {
    document.getElementById('roll20AdminPanel').style.display = 'block';
    document.getElementById('roll20AdminBtn').textContent = '관리자 모드 (활성)';
    document.getElementById('roll20AdminBtn').classList.add('btn-success');
    document.getElementById('roll20LogoutBtn').style.display = '';
    
    // 세션 카드 이미지 버튼 표시
    const cardDiv = document.getElementById('roll20SessionCard');
    if (cardDiv.style.display === 'none') {
        document.getElementById('roll20AddImageBtn').style.display = 'block';
    } else {
        document.getElementById('roll20EditImageBtn').style.display = 'block';
    }
    
    // 세션 날짜 수정 버튼 표시
    document.getElementById('roll20EditDateBtn').style.display = 'block';
    
    // 메모 추가 버튼 표시
    document.getElementById('roll20AddNoteBtn').style.display = 'block';
    
    // 채팅 컨테이너에 admin-mode 클래스 추가
    document.getElementById('roll20ChatContent').classList.add('admin-mode');
    
    // 메시지에 수정/삭제 버튼 추가
    addAdminActionsToMessages();
}

// 관리자 패널 숨기기
function hideRoll20AdminPanel() {
    document.getElementById('roll20AdminPanel').style.display = 'none';
    document.getElementById('roll20AdminBtn').textContent = '관리자 모드';
    document.getElementById('roll20AdminBtn').classList.remove('btn-success');
    document.getElementById('roll20LogoutBtn').style.display = 'none';
    
    // 세션 카드 이미지 버튼 숨기기
    document.getElementById('roll20AddImageBtn').style.display = 'none';
    document.getElementById('roll20EditImageBtn').style.display = 'none';
    
    // 세션 날짜 수정 버튼 숨기기
    document.getElementById('roll20EditDateBtn').style.display = 'none';
    
    // 메모 추가 버튼 숨기기
    document.getElementById('roll20AddNoteBtn').style.display = 'none';
    
    // 채팅 컨테이너에서 admin-mode 클래스 제거
    document.getElementById('roll20ChatContent').classList.remove('admin-mode');
    
    // 수정/삭제 버튼 제거
    removeAdminActionsFromMessages();
}

// Roll20 로그아웃
function roll20Logout() {
    roll20IsAdmin = false;
    roll20Password = null;
    hideRoll20AdminPanel();
}

// 메시지에 수정/삭제 버튼 추가
function addAdminActionsToMessages() {
    const messages = document.querySelectorAll('.roll20-chat-content .message');
    messages.forEach((msg, index) => {
        // 이미 버튼이 있으면 스킵
        if (msg.querySelector('.admin-actions')) return;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'admin-actions';
        actionsDiv.innerHTML = `
            <button class="btn-edit" title="수정" onclick="editRoll20Message(${index})">✏️</button>
            <button class="btn-delete" title="삭제" onclick="deleteRoll20Message(${index})">🗑️</button>
        `;
        msg.appendChild(actionsDiv);
        msg.dataset.index = index;
    });
}

// 메시지에서 수정/삭제 버튼 제거
function removeAdminActionsFromMessages() {
    const actionButtons = document.querySelectorAll('.roll20-chat-content .admin-actions');
    actionButtons.forEach(btn => btn.remove());
}

// 메시지 수정
function editRoll20Message(index) {
    const messages = document.querySelectorAll('.roll20-chat-content .message');
    const msg = messages[index];
    if (!msg || msg.classList.contains('editing')) return;
    
    // 현재 전체 HTML 저장
    const originalContent = msg.innerHTML;
    
    // 메시지 본문만 추출 (구조 요소 제외)
    const messageBody = getMessageBody(msg);
    
    msg.classList.add('editing');
    msg.dataset.originalContent = originalContent;
    
    // 편집 UI를 기존 내용 아래에 추가
    const editDiv = document.createElement('div');
    editDiv.className = 'edit-container';
    editDiv.innerHTML = `
        <textarea class="edit-textarea">${messageBody}</textarea>
        <div class="edit-actions">
            <button class="btn-save" onclick="saveRoll20MessageEdit(${index})">저장</button>
            <button class="btn-cancel" onclick="cancelRoll20MessageEdit(${index})">취소</button>
        </div>
    `;
    
    // 원본 내용 숨기고 편집 UI 표시
    const wrapper = document.createElement('div');
    wrapper.className = 'original-content-hidden';
    wrapper.innerHTML = originalContent;
    wrapper.style.display = 'none';
    
    msg.innerHTML = '';
    msg.appendChild(wrapper);
    msg.appendChild(editDiv);
    msg.querySelector('.edit-textarea').focus();
}

// 메시지 본문만 추출 (spacer, avatar, by, tstamp 제외)
function getMessageBody(msg) {
    const clone = msg.cloneNode(true);
    
    // 구조 요소 제거
    clone.querySelectorAll('.spacer, .avatar, .by, .tstamp, .admin-actions').forEach(el => el.remove());
    
    // 남은 HTML 반환
    return clone.innerHTML.trim();
}

// 메시지 수정 저장
async function saveRoll20MessageEdit(index) {
    const messages = document.querySelectorAll('.roll20-chat-content .message');
    const msg = messages[index];
    if (!msg) return;
    
    const textarea = msg.querySelector('.edit-textarea');
    const newBody = textarea.value;
    const originalWrapper = msg.querySelector('.original-content-hidden');
    
    if (!originalWrapper) {
        cancelRoll20MessageEdit(index);
        return;
    }
    
    // 원본 구조에서 본문만 교체
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalWrapper.innerHTML;
    
    // admin-actions 제거 (나중에 다시 추가)
    tempDiv.querySelectorAll('.admin-actions').forEach(el => el.remove());
    
    // 본문 부분 찾아서 교체
    // spacer, avatar, by, tstamp 이후의 내용을 새 본문으로 교체
    const spacer = tempDiv.querySelector('.spacer');
    const avatar = tempDiv.querySelector('.avatar');
    const by = tempDiv.querySelector('.by');
    const tstamp = tempDiv.querySelector('.tstamp');
    
    // 구조 요소들을 임시 저장
    const structureElements = [];
    if (spacer) structureElements.push(spacer.cloneNode(true));
    if (avatar) structureElements.push(avatar.cloneNode(true));
    if (tstamp) structureElements.push(tstamp.cloneNode(true));
    if (by) structureElements.push(by.cloneNode(true));
    
    // 메시지 재구성
    msg.classList.remove('editing');
    msg.innerHTML = '';
    
    // 구조 요소 추가
    structureElements.forEach(el => msg.appendChild(el));
    
    // 새 본문 추가
    const bodySpan = document.createElement('span');
    bodySpan.innerHTML = newBody;
    msg.appendChild(bodySpan);
    
    // admin-actions 다시 추가
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'admin-actions';
    actionsDiv.innerHTML = `
        <button class="btn-edit" title="수정" onclick="editRoll20Message(${index})">✏️</button>
        <button class="btn-delete" title="삭제" onclick="deleteRoll20Message(${index})">🗑️</button>
    `;
    msg.appendChild(actionsDiv);
    
    // 캐릭터별 배경색 다시 적용
    applyRoll20CharacterColors();
    
    // Firebase에 저장
    await saveRoll20ContentToFirebase();
}

// 메시지 수정 취소
function cancelRoll20MessageEdit(index) {
    const messages = document.querySelectorAll('.roll20-chat-content .message');
    const msg = messages[index];
    if (!msg) return;
    
    const originalContent = msg.dataset.originalContent;
    msg.classList.remove('editing');
    msg.innerHTML = originalContent;
    
    // 캐릭터별 배경색 다시 적용
    applyRoll20CharacterColors();
}

// 메시지 삭제
async function deleteRoll20Message(index) {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
    
    const messages = document.querySelectorAll('.roll20-chat-content .message');
    const msg = messages[index];
    if (!msg) return;
    
    msg.remove();
    
    // 인덱스 재할당
    reindexRoll20Messages();
    
    // Firebase에 저장
    await saveRoll20ContentToFirebase();
}

// 메시지 인덱스 재할당
function reindexRoll20Messages() {
    const messages = document.querySelectorAll('.roll20-chat-content .message');
    messages.forEach((msg, index) => {
        msg.dataset.index = index;
        const editBtn = msg.querySelector('.btn-edit');
        const deleteBtn = msg.querySelector('.btn-delete');
        if (editBtn) editBtn.setAttribute('onclick', `editRoll20Message(${index})`);
        if (deleteBtn) deleteBtn.setAttribute('onclick', `deleteRoll20Message(${index})`);
    });
}

// 현재 콘텐츠를 Firebase에 저장
async function saveRoll20ContentToFirebase() {
    if (!roll20IsAdmin || !roll20RoomId || !activeRoll20LogId) return;
    
    const container = document.getElementById('roll20ChatContent');
    
    // admin-actions 제거한 클린 HTML 생성
    const clone = container.cloneNode(true);
    clone.querySelectorAll('.admin-actions').forEach(el => el.remove());
    clone.querySelectorAll('.message').forEach(el => {
        el.classList.remove('editing');
        delete el.dataset.index;
        delete el.dataset.originalContent;
    });
    
    const cleanHtml = clone.innerHTML;
    
    // HTML 입력란도 업데이트
    document.getElementById('roll20HtmlInput').value = cleanHtml;
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}`).update({
        content: cleanHtml,
        updated_at: Date.now()
    });
}

// Roll20 HTML 저장
async function saveRoll20Html() {
    if (!roll20IsAdmin || !roll20RoomId) {
        alert('관리자 권한이 필요합니다.');
        return;
    }
    
    if (!activeRoll20LogId) {
        alert('먼저 로그를 선택하거나 새 로그를 추가하세요.');
        return;
    }

    const htmlContent = document.getElementById('roll20HtmlInput').value;
    
    await database.ref(`roll20_rooms/${roll20RoomId}/logs/${activeRoll20LogId}`).update({
        content: htmlContent,
        updated_at: Date.now()
    });

    alert('저장되었습니다!');
}

// Roll20 HTML 미리보기
function previewRoll20Html() {
    const htmlContent = document.getElementById('roll20HtmlInput').value;
    renderRoll20Content(htmlContent);
}

// Roll20 URL 업데이트
function updateRoll20URL() {
    const url = new URL(window.location.href);
    url.searchParams.set('roll20', roll20RoomId);
    window.history.replaceState({}, '', url.toString());
}

// Roll20 공유 모달 열기
function openRoll20ShareModal() {
    document.getElementById('roll20ShareModal').classList.add('active');
    document.getElementById('roll20ShareStatus').textContent = '';
    document.getElementById('roll20ShareStatus').className = 'share-status';
    
    // 이미 룸이 있으면 링크 표시
    if (roll20RoomId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?roll20=${roll20RoomId}`;
        document.getElementById('roll20ShareLink').value = shareUrl;
        document.getElementById('roll20CopyLinkBtn').disabled = false;
    } else {
        document.getElementById('roll20ShareLink').value = '';
        document.getElementById('roll20CopyLinkBtn').disabled = true;
    }
}

// Roll20 공유 모달 닫기
function closeRoll20ShareModal() {
    document.getElementById('roll20ShareModal').classList.remove('active');
}

// Roll20 공유 링크 생성
async function generateRoll20ShareLink() {
    const statusEl = document.getElementById('roll20ShareStatus');
    statusEl.textContent = '링크 생성 중...';
    statusEl.className = 'share-status loading';

    try {
        // 룸이 없으면 새로 생성 (비밀번호 모달 열기)
        if (!roll20RoomId) {
            statusEl.textContent = '먼저 관리자 모드로 로그인하여 룸을 생성하세요.';
            statusEl.className = 'share-status error';
            return;
        }

        const shareUrl = `${window.location.origin}${window.location.pathname}?roll20=${roll20RoomId}`;
        document.getElementById('roll20ShareLink').value = shareUrl;
        document.getElementById('roll20CopyLinkBtn').disabled = false;
        
        statusEl.textContent = '링크가 생성되었습니다!';
        statusEl.className = 'share-status success';
    } catch (error) {
        console.error('링크 생성 실패:', error);
        statusEl.textContent = '링크 생성에 실패했습니다.';
        statusEl.className = 'share-status error';
    }
}

// Roll20 공유 링크 복사
function copyRoll20ShareLink() {
    const linkInput = document.getElementById('roll20ShareLink');
    linkInput.select();
    document.execCommand('copy');
    
    const statusEl = document.getElementById('roll20ShareStatus');
    statusEl.textContent = '링크가 복사되었습니다!';
    statusEl.className = 'share-status success';
}

// DOMContentLoaded에 Roll20 초기화 추가
document.addEventListener('DOMContentLoaded', () => {
    initRoll20();
});

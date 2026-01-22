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
    
    // 공유 버튼
    document.getElementById('shareBtn').addEventListener('click', openShareModal);
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
    conversationList.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === activeConversationId ? 'active' : ''}" 
             data-id="${conv.id}"
             onclick="switchConversation('${conv.id}')"
             ondblclick="renameConversation('${conv.id}')">
            <span class="title">${escapeHtml(conv.title)}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="삭제">&times;</button>
        </div>
    `).join('');
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
function openShareModal() {
    shareModal.classList.add('active');
    const linkInput = document.getElementById('shareLink');
    const statusEl = document.getElementById('shareStatus');
    const copyBtn = document.getElementById('copyLinkBtn');

    if (currentRoomId) {
        linkInput.value = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
        statusEl.textContent = '✓ 사이트(대화 목록 전체) 공유 링크입니다. 이 링크로 실시간 반영됩니다.';
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
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        
        linkInput.value = shareUrl;
        statusEl.textContent = '✓ 사이트 공유 링크가 생성되었습니다! (실시간 반영)';
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

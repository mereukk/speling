// ==================== 전역 변수 ====================
let characters = {}; // { name: { image: url, color: colorCode } }
let conversations = []; // [{ id, title, text, dialogues }]
let activeConversationId = null;
let colorIndex = 0;
let appTitle = 'RP 포맷터';

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
document.addEventListener('DOMContentLoaded', () => {
    // localStorage에서 데이터 불러오기
    loadFromStorage();
    
    // URL에서 공유 데이터 불러오기
    loadFromURL();
    
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
        dialogues: []
    };
    conversations.push(newConversation);
    activeConversationId = id;
    return newConversation;
}

function getActiveConversation() {
    return conversations.find(c => c.id === activeConversationId);
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
function parseNaverCafeText(text) {
    if (!text.trim()) return [];
    
    const results = [];
    const foundNames = []; // 발견된 모든 캐릭터 이름 (원본 형태: "에르빈 1", "노바 1" 등)
    
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
            if (!characters[name]) {
                characters[name] = {
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
function getCharacterColor(name) {
    const char = characters[name];
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
    // 현재 대화에 등장하는 캐릭터만 표시 (이미지/접는글 항목 제외)
    const activeCharacters = [...new Set(dialogues.filter(d => !d.type && d.name).map(d => d.name))];
    
    if (activeCharacters.length === 0) {
        characterCards.innerHTML = '';
        characterCards.style.display = 'none';
        return;
    }
    
    characterCards.style.display = 'flex';
    characterCards.innerHTML = activeCharacters.map(name => {
        const char = characters[name] || { image: '' };
        const color = getCharacterColor(name);
        
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
        
        const char = characters[dialogue.name] || { image: '' };
        const color = getCharacterColor(dialogue.name);
        
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
    conv.dialogues = parseNaverCafeText(text);
    
    closeWriteModal();
    renderConversationList();
    renderActiveConversation();
    saveToStorage();
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
    const charNames = Object.keys(characters);
    
    if (charNames.length === 0) {
        characterList.innerHTML = '<div class="empty-message">등록된 캐릭터가 없습니다</div>';
        return;
    }
    
    characterList.innerHTML = charNames.map(name => {
        const char = characters[name];
        const color = getCharacterColor(name);
        
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
    
    characters[name] = {
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
    const char = characters[name];
    if (!char) return;
    
    document.getElementById('editCharOriginalName').value = name;
    document.getElementById('editCharName').value = name;
    document.getElementById('editCharImageUrl').value = char.image || '';
    
    const color = getCharacterColor(name);
    document.getElementById('editCharColor').value = color;
    document.getElementById('editCharColorPicker').value = color;
    
    editCharModal.classList.add('active');
}

function closeEditCharModal() {
    editCharModal.classList.remove('active');
}

function saveEditCharacter() {
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
        characters[newName] = {
            image: newImage,
            color: newColor
        };
        // 기존 이름 삭제
        delete characters[originalName];
        
        // 대화에서 이름 변경
        conversations.forEach(conv => {
            conv.dialogues.forEach(dialogue => {
                if (dialogue.name === originalName) {
                    dialogue.name = newName;
                }
            });
        });
    } else {
        // 이름이 같으면 속성만 업데이트
        characters[originalName].image = newImage;
        characters[originalName].color = newColor;
    }
    
    closeEditCharModal();
    saveToStorage();
    renderCharacterList();
    renderActiveConversation();
}

function deleteCharacter(name) {
    if (confirm(`"${name}" 캐릭터를 삭제하시겠습니까?`)) {
        delete characters[name];
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
    const conv = getActiveConversation();
    if (!conv) return;
    
    const shareData = {
        conversation: conv,
        characters: characters
    };
    
    // LZString으로 압축 후 URL-safe Base64 인코딩
    const jsonStr = JSON.stringify(shareData);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    const shareUrl = `${window.location.origin}${window.location.pathname}?d=${compressed}`;
    
    document.getElementById('shareLink').value = shareUrl;
    shareModal.classList.add('active');
}

function closeShareModal() {
    shareModal.classList.remove('active');
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    
    const btn = document.getElementById('copyLinkBtn');
    const originalText = btn.textContent;
    btn.textContent = '복사됨!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 새 압축 형식 (d 파라미터)
    const compressedData = urlParams.get('d');
    // 기존 형식 (data 파라미터) - 하위 호환성
    const legacyData = urlParams.get('data');
    
    let decoded = null;
    
    if (compressedData) {
        try {
            // LZString으로 압축 해제
            const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
            decoded = JSON.parse(decompressed);
        } catch (e) {
            console.error('압축 데이터 로드 실패:', e);
        }
    } else if (legacyData) {
        try {
            // 기존 Base64 형식
            decoded = JSON.parse(decodeURIComponent(atob(legacyData)));
        } catch (e) {
            console.error('공유 데이터 로드 실패:', e);
        }
    }
    
    if (decoded) {
        if (decoded.conversation) {
            // 기존 대화 목록에 추가하거나 대체
            const existingIndex = conversations.findIndex(c => c.id === decoded.conversation.id);
            if (existingIndex >= 0) {
                conversations[existingIndex] = decoded.conversation;
            } else {
                conversations.push(decoded.conversation);
            }
            activeConversationId = decoded.conversation.id;
        }
        
        if (decoded.characters) {
            characters = { ...characters, ...decoded.characters };
        }
    }
}

// ==================== 로컬 스토리지 ====================
function saveToStorage() {
    localStorage.setItem('rpFormatter_conversations', JSON.stringify(conversations));
    localStorage.setItem('rpFormatter_activeId', activeConversationId);
    localStorage.setItem('rpFormatter_characters', JSON.stringify(characters));
    localStorage.setItem('rpFormatter_colorIndex', colorIndex.toString());
    localStorage.setItem('rpFormatter_appTitle', appTitle);
}

function loadFromStorage() {
    const savedConversations = localStorage.getItem('rpFormatter_conversations');
    const savedActiveId = localStorage.getItem('rpFormatter_activeId');
    const savedCharacters = localStorage.getItem('rpFormatter_characters');
    const savedColorIndex = localStorage.getItem('rpFormatter_colorIndex');
    const savedAppTitle = localStorage.getItem('rpFormatter_appTitle');
    
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
}

// ==================== 유틸리티 함수 ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

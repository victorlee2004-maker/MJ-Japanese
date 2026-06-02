// ============================================================
//  MJ日语 - 十篇攻克法 · 应用逻辑
//  功能：主题切换 / 页面路由 / 训练交互 / 进度存储
// ============================================================

// ===== 全局读音播放函数（必须在 loadArticle 之前定义）=====
window.speakWord = function(text, btnEl) {
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = 0.85;
  if (btnEl) {
    btnEl.classList.add('speaking');
    utter.onend = () => btnEl.classList.remove('speaking');
    utter.onerror = () => btnEl.classList.remove('speaking');
  }
  speechSynthesis.speak(utter);
};

window.normalizeWord = function(word) {
  // 提取括号内的读音，如 "自己紹介（じこしょうかい）" → "じこしょうかい"
  const match = word.match(/[（(](.+?)[）)]/);
  return match ? match[1] : word;
};

window.escapeAttr = function(s) {
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

// ===== 数据存储 =====
const App = {
  key: 'mj_japanese_data',
  getData() {
    return JSON.parse(localStorage.getItem(this.key) || '{"materials":{}}');
  },
  saveData(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },
  saveMaterial(id, score) {
    const data = this.getData();
    if (!data.materials) data.materials = {};
    data.materials[String(id)] = { score: score, date: new Date().toISOString().split('T')[0] };
    this.saveData(data);
  }
};

// ===== 主题切换 =====
function initTheme() {
  const theme = localStorage.getItem('japanese_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('japanese_theme', next);
    });
  }
}

// ===== 渲染文章网格（首页）=====
function renderArticleGrid() {
  const grid = document.getElementById('articleGrid');
  if (!grid) return;

  const progress = App.getData();
  const materials = progress.materials || {};

  grid.innerHTML = MATERIALS_DB.map((article, idx) => {
    const done = materials[article.id] !== undefined;
    return `
      <div class="article-card ${done ? 'completed' : ''}" onclick="location.href='train.html?id=${article.id}'">
        <div class="article-number">${idx + 1}</div>
        <h3 class="article-title">${article.title}</h3>
        <p class="article-desc">${article.topic || ''} · ${article.level}</p>
        <div class="article-meta">
          <span class="meta-item">📝 ${article.wordCount || article.vocab?.length || 0}词</span>
          <span class="meta-item">难度：${'★'.repeat(article.difficulty || 1)}${'☆'.repeat(5 - (article.difficulty || 1))}</span>
          ${done ? '<span class="meta-item">✅ 已完成</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== 训练页面 =====
function initTrainPage() {
  const params = new URLSearchParams(location.search);
  const articleId = parseInt(params.get('id')) || 1;

  renderArticleList(articleId);
  loadArticle(articleId);

  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
      const tabId = 'tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1);
      const tabEl = document.getElementById(tabId);
      if (tabEl) tabEl.style.display = 'block';
    });
  });
}

function renderArticleList(activeId) {
  const list = document.getElementById('articleList');
  if (!list) return;

  list.innerHTML = MATERIALS_DB.map(a => `
    <div class="article-item ${a.id === activeId ? 'active' : ''}" onclick="location.href='train.html?id=${a.id}'">
      ${a.title}
    </div>
  `).join('');
}

function loadArticle(id) {
  const article = MATERIALS_DB.find(a => a.id === id);
  if (!article) return;

  const titleEl = document.getElementById('articleTitle');
  if (titleEl) titleEl.textContent = article.title;

  const placeholder = document.getElementById('contentPlaceholder');
  const active = document.getElementById('contentActive');
  if (placeholder) placeholder.style.display = 'none';
  if (active) active.style.display = 'block';

  // 日语原文
  const jpContent = document.getElementById('japaneseContent');
  if (jpContent && article.text) {
    jpContent.innerHTML = `<div class="japanese-text">${article.text.replace(/\n/g, '<br>')}</div>`;
  }

  // 中文翻译
  const cnContent = document.getElementById('chineseContent');
  if (cnContent && article.translation) {
    cnContent.innerHTML = `<div class="chinese-text">${article.translation.replace(/\n/g, '<br>')}</div>`;
  }

  // 语法分析
  const analysisContent = document.getElementById('analysisContent');
  if (analysisContent && article.grammar) {
    analysisContent.innerHTML = article.grammar.map(g => `
      <div class="grammar-point">
        <div class="grammar-title">${g}</div>
      </div>
    `).join('');
  }

  // 重点词汇（使用已定义的全局函数）
  const wordsContent = document.getElementById('wordsContent');
  if (wordsContent && article.vocab) {
    wordsContent.innerHTML = article.vocab.map((w, idx) => {
      const reading = window.normalizeWord(w.word);
      const safeReading = window.escapeAttr(reading);
      return `
      <div class="word-card">
        <div class="word-main">
          <span class="word-japanese">${w.word}</span>
          <button class="word-speak-btn" onclick="window.speakWord('${safeReading}', this)" title="播放读音">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
        </div>
        <div class="word-info">
          <div class="word-meaning">${w.meaning || ''}</div>
          <div class="word-reading">${w.pos || ''} <span class="word-speak-hint" onclick="window.speakWord('${safeReading}')">🔊</span></div>
        </div>
      </div>
    `;
    }).join('');
  }

  // 训练指南（听力重点 + 背诵要求）
  const practiceContent = document.getElementById('practiceContent');
  if (practiceContent) {
    let html = '';
    if (article.listeningFocus && article.listeningFocus.length > 0) {
      html += `<div class="guide-section">
        <h3 class="guide-title">盲听训练重点</h3>
        <ul class="guide-list">${article.listeningFocus.map(f => `<li>${f}</li>`).join('')}</ul>
      </div>`;
    }
    if (article.reciteGoal) {
      html += `<div class="guide-section">
        <h3 class="guide-title">背诵通关要求</h3>
        <p class="guide-text">${article.reciteGoal}</p>
      </div>`;
    }
    html += `<div class="guide-section">
      <h3 class="guide-title">十篇攻克法训练流程</h3>
      <ol class="guide-list">
        <li><strong>聴解</strong>：盲听原文，不看文本 → 捕捉关键词 → 推测主题</li>
        <li><strong>単語</strong>：逐词学习，结合上下文猜测词义 → AI验证 → 造句应用</li>
        <li><strong>暗記</strong>：逐句 → 逐段 → 全文 → 原速背诵</li>
        <li><strong>出力</strong>：用自己的话复述原文，优先使用原文句型与表达</li>
      </ol>
    </div>`;
    practiceContent.innerHTML = html;
  }

  // 音频控制
  setupAudio(article);
}

function setupAudio(article) {
  const btnPlay = document.getElementById('btnPlayJapanese');
  const btnPause = document.getElementById('btnPauseAudio');

  if (btnPlay && article.text) {
    btnPlay.onclick = () => {
      const utter = new SpeechSynthesisUtterance(article.text);
      utter.lang = 'ja-JP';
      utter.rate = 0.9;
      speechSynthesis.speak(utter);
    };
  }

  if (btnPause) {
    btnPause.onclick = () => {
      speechSynthesis.pause();
    };
  }
}

// ===== 进度页面 =====
function renderProgress() {
  const progress = App.getData();
  const materials = progress.materials || {};

  // 统计
  const totalEl = document.getElementById('totalArticles');
  if (totalEl) totalEl.textContent = MATERIALS_DB.length;

  const completedArr = MATERIALS_DB.filter(a => materials[a.id] !== undefined);
  const completedEl = document.getElementById('completedArticles');
  if (completedEl) completedEl.textContent = completedArr.length;

  const totalWordsEl = document.getElementById('totalWords');
  if (totalWordsEl) {
    const totalWords = MATERIALS_DB.reduce((sum, a) => {
      return sum + (materials[a.id] !== undefined ? (a.wordCount || 0) : 0);
    }, 0);
    totalWordsEl.textContent = totalWords;
  }

  const studyDaysEl = document.getElementById('studyDays');
  if (studyDaysEl) {
    const days = Object.keys(materials).length > 0
      ? new Set(Object.values(materials).map(m => m.date)).size
      : 0;
    studyDaysEl.textContent = days;
  }

  // 进度条
  const bars = document.getElementById('progressBars');
  if (bars) {
    bars.innerHTML = MATERIALS_DB.map(a => {
      const pct = materials[a.id] !== undefined ? 100 : 0;
      return `
        <div class="progress-bar-item">
          <div class="progress-bar-label">${a.title}</div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="progress-bar-value">${pct}%</div>
        </div>
      `;
    }).join('');
  }

  // 最近活动
  const activityList = document.getElementById('activityList');
  if (activityList) {
    const activities = Object.entries(materials)
      .map(([id, data]) => ({
        article: MATERIALS_DB.find(a => String(a.id) === String(id)),
        ...data
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    activityList.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-icon">✅</div>
        <div class="activity-text">
          <div class="activity-title">${a.article ? a.article.title : '文章' + a.articleId}</div>
          <div class="activity-time">${a.date}</div>
        </div>
      </div>
    `).join('');
  }
}

// ===== 总结页面 =====
function generateSummary() {
  const progress = App.getData();
  const materials = progress.materials || {};

  const summaryContent = document.getElementById('summaryContent');
  const summarySections = document.getElementById('summarySections');
  if (summaryContent) summaryContent.style.display = 'none';
  if (summarySections) summarySections.style.display = 'block';

  // 学习概况
  const completedArr = MATERIALS_DB.filter(a => materials[a.id] !== undefined);
  const totalWords = MATERIALS_DB.reduce((sum, a) => {
    return sum + (materials[a.id] !== undefined ? (a.wordCount || 0) : 0);
  }, 0);

  const scores = Object.values(materials).map(m => m.score || 0).filter(s => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const summaryStats = document.getElementById('summaryStats');
  if (summaryStats) {
    summaryStats.innerHTML = `
      <div class="summary-stat">
        <div class="summary-stat-value">${completedArr.length}/${MATERIALS_DB.length}</div>
        <div class="summary-stat-label">文章完成</div>
      </div>
      <div class="summary-stat">
        <div class="summary-stat-value">${totalWords}</div>
        <div class="summary-stat-label">学习词汇</div>
      </div>
      <div class="summary-stat">
        <div class="summary-stat-value">${avgScore}</div>
        <div class="summary-stat-label">平均分</div>
      </div>
    `;
  }

  // 文章掌握情况
  const articleMastery = document.getElementById('articleMastery');
  if (articleMastery) {
    articleMastery.innerHTML = MATERIALS_DB.map((a, idx) => {
      const m = materials[a.id];
      const score = m ? m.score || 0 : 0;
      return `
        <div class="mastery-item">
          <div class="mastery-rank">${idx + 1}</div>
          <div class="mastery-info">
            <div class="mastery-title">${a.title}</div>
            <div class="mastery-score">掌握度: ${score}分</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 词汇积累（取每篇前3个词）
  const learnedWords = [];
  MATERIALS_DB.forEach(a => {
    if (materials[a.id] !== undefined && a.vocab) {
      a.vocab.slice(0, 3).forEach(w => learnedWords.push(w));
    }
  });

  const vocabularySummary = document.getElementById('vocabularySummary');
  if (vocabularySummary) {
    vocabularySummary.innerHTML = learnedWords.slice(0, 10).map(w => `
      <div class="vocab-item">
        <span class="vocab-japanese">${w.word}</span>
        <span class="vocab-meaning">${w.meaning || ''}</span>
      </div>
    `).join('');
  }

  // 学习建议
  const suggestions = [];
  if (completedArr.length < MATERIALS_DB.length * 0.3) {
    suggestions.push({ icon: '📚', text: '建议加快学习进度，完成更多文章的学习' });
  }
  if (avgScore < 70) {
    suggestions.push({ icon: '🎯', text: '建议加强练习，提高每篇文章的掌握度' });
  }
  suggestions.push({ icon: '🔄', text: '建议定期复习已学文章，巩固记忆' });
  suggestions.push({ icon: '📝', text: '建议每天坚持学习，保持学习的连续性' });

  const learningSuggestions = document.getElementById('learningSuggestions');
  if (learningSuggestions) {
    learningSuggestions.innerHTML = suggestions.map(s => `
      <div class="suggestion-item">
        <div class="suggestion-icon">${s.icon}</div>
        <div class="suggestion-text">${s.text}</div>
      </div>
    `).join('');
  }
}

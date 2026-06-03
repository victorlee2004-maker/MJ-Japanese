// ============================================================
//  MJ Japanese - App Logic  (ES5 compatible)
// ============================================================

// ---- Utility ----

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeWord(word) {
  if (!word) return '';
  var m = word.match(/[\uff08(](.+?)[\uff09)]/);
  return m ? m[1] : word;
}

function repeatStr(ch, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ch;
  return s;
}

// ---- Speech ----

window.speakWord = function (text, btnEl) {
  if (!text) return;
  window.speechSynthesis.cancel();
  var utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = 0.85;
  if (btnEl) {
    btnEl.classList.add('speaking');
    utter.onend = function () { btnEl.classList.remove('speaking'); };
    utter.onerror = function () { btnEl.classList.remove('speaking'); };
  }
  window.speechSynthesis.speak(utter);
};

// ---- Sentence highlight state ----

var HL = { idx: -1 };

function clearSentenceHighlight() {
  HL.idx = -1;
  var spans = document.querySelectorAll('#japaneseContent .sentence-active');
  for (var i = 0; i < spans.length; i++) {
    spans[i].classList.remove('sentence-active');
  }
}

// Split article text into sentence <span> elements for highlight
function renderJapaneseWithSentences(text) {
  if (!text) return '';
  // Split by Japanese sentence-ending punctuation, keep punctuation attached
  var parts = text.split(/(?<=[^\s])(?=[^\u3002\uff01\uff1f\n])/);
  // Simpler approach: split on sentence boundaries
  var segments = [];
  var buf = '';
  for (var i = 0; i < text.length; i++) {
    buf += text[i];
    if (text[i] === '\u3002' || text[i] === '\uff01' || text[i] === '\uff1f') {
      segments.push(buf);
      buf = '';
    }
  }
  if (buf.trim()) segments.push(buf);

  var html = '';
  for (var j = 0; j < segments.length; j++) {
    var seg = segments[j].replace(/\n/g, '');
    if (!seg.trim()) continue;
    html += '<span class="sentence" data-idx="' + j + '">' + escapeHtml(seg) + '</span>';
  }
  return html || escapeHtml(text);
}

// Play article with sentence highlight
function playJapaneseWithHighlight(text) {
  if (!text) return;
  clearSentenceHighlight();
  window.speechSynthesis.cancel();

  var utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = 0.9;

  var spans = null;
  var spanMap = null; // [{start, end, idx}]

  function buildMap() {
    spans = document.querySelectorAll('#japaneseContent .sentence');
    spanMap = [];
    var pos = 0;
    for (var s = 0; s < spans.length; s++) {
      var t = spans[s].textContent;
      spanMap.push({ start: pos, end: pos + t.length, idx: s });
      pos += t.length;
    }
  }

  utter.onboundary = function (evt) {
    if (!spans) buildMap();
    if (!spans || spans.length === 0) return;

    var charIdx = evt.charIndex || 0;
    var activeIdx = spans.length - 1;
    for (var j = 0; j < spanMap.length; j++) {
      if (charIdx >= spanMap[j].start && charIdx < spanMap[j].end) {
        activeIdx = spanMap[j].idx;
        break;
      }
    }

    if (activeIdx !== HL.idx) {
      if (HL.idx >= 0 && HL.idx < spans.length) {
        spans[HL.idx].classList.remove('sentence-active');
      }
      spans[activeIdx].classList.add('sentence-active');
      spans[activeIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      HL.idx = activeIdx;
    }
  };

  utter.onend = function () { clearSentenceHighlight(); };
  utter.onerror = function () { clearSentenceHighlight(); };

  window.speechSynthesis.speak(utter);
}

// ---- Storage ----

var App = {
  key: 'mj_japanese_data',
  getData: function () {
    var raw = localStorage.getItem(this.key);
    if (!raw) return { materials: {} };
    try { return JSON.parse(raw); } catch (e) { return { materials: {} }; }
  },
  saveData: function (data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
};

// ---- Theme ----

function initTheme() {
  var theme = localStorage.getItem('japanese_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('japanese_theme', next);
    });
  }
}

// ---- Index page ----

function renderArticleGrid() {
  var grid = document.getElementById('articleGrid');
  if (!grid) return;
  var data = App.getData();
  var mats = data.materials || {};
  var html = '';
  for (var i = 0; i < MATERIALS_DB.length; i++) {
    var a = MATERIALS_DB[i];
    var done = mats[a.id] !== undefined;
    var starsOn = repeatStr('\u2605', a.difficulty || 1);
    var starsOff = repeatStr('\u2606', 5 - (a.difficulty || 1));
    var wc = a.wordCount || (a.vocab && a.vocab.length) || 0;
    html += '<a href="train.html?id=' + a.id + '" class="article-card' + (done ? ' completed' : '') + '">'
          + '<div class="article-number">' + (i + 1) + '</div>'
          + '<h3 class="article-title">' + escapeHtml(a.title) + '</h3>'
          + '<p class="article-desc">' + escapeHtml(a.topic || '') + ' \u00b7 ' + escapeHtml(a.level) + '</p>'
          + '<div class="article-meta">'
          +   '<span class="meta-item">\uD83D\uDCDD ' + wc + '\u8bcd</span>'
          +   '<span class="meta-item">\u96be\u5ea6\uff1a' + starsOn + starsOff + '</span>'
          +   (done ? '<span class="meta-item">\u2705 \u5df2\u5b8c\u6210</span>' : '')
          + '</div>'
          + '</a>';
  }
  grid.innerHTML = html;
}

// ---- Train page ----

function initTrainPage() {
  var params = new URLSearchParams(location.search);
  var articleId = parseInt(params.get('id')) || 1;
  renderArticleList(articleId);
  loadArticle(articleId);

  // Tab switching via event delegation
  var tabBar = document.querySelector('.content-tabs');
  if (tabBar) {
    tabBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      e.preventDefault();
      var allBtns = document.querySelectorAll('.tab-btn');
      for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('active');
      btn.classList.add('active');
      var allTabs = document.querySelectorAll('.tab-content');
      for (var j = 0; j < allTabs.length; j++) allTabs[j].style.display = 'none';
      var tabName = btn.dataset.tab;
      var tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
      var tab = document.getElementById(tabId);
      if (tab) tab.style.display = 'block';
    });
  }
}

function renderArticleList(activeId) {
  var list = document.getElementById('articleList');
  if (!list) return;
  var html = '';
  for (var i = 0; i < MATERIALS_DB.length; i++) {
    var a = MATERIALS_DB[i];
    html += '<a href="train.html?id=' + a.id + '" class="article-item' + (a.id === activeId ? ' active' : '') + '">'
          + escapeHtml(a.title)
          + '</a>';
  }
  list.innerHTML = html;
}

function loadArticle(id) {
  var article = null;
  for (var i = 0; i < MATERIALS_DB.length; i++) {
    if (MATERIALS_DB[i].id === id) { article = MATERIALS_DB[i]; break; }
  }
  if (!article) return;

  var titleEl = document.getElementById('articleTitle');
  if (titleEl) titleEl.textContent = article.title;

  var placeholder = document.getElementById('contentPlaceholder');
  var active = document.getElementById('contentActive');
  if (placeholder) placeholder.style.display = 'none';
  if (active) active.style.display = 'block';

  // Japanese text (with sentence spans for highlight)
  var jpEl = document.getElementById('japaneseContent');
  if (jpEl && article.text) {
    jpEl.innerHTML = '<div class="japanese-text">' + renderJapaneseWithSentences(article.text) + '</div>';
  }

  // Chinese translation
  var cnEl = document.getElementById('chineseContent');
  if (cnEl && article.translation) {
    cnEl.innerHTML = '<div class="chinese-text">' + escapeHtml(article.translation).replace(/\n/g, '<br>') + '</div>';
  }

  // Grammar analysis
  var anEl = document.getElementById('analysisContent');
  if (anEl && article.grammar && article.grammar.length) {
    var anHtml = '';
    for (var g = 0; g < article.grammar.length; g++) {
      anHtml += '<div class="grammar-point"><div class="grammar-title">' + escapeHtml(article.grammar[g]) + '</div></div>';
    }
    anEl.innerHTML = anHtml;
  }

  // Vocabulary
  var wEl = document.getElementById('wordsContent');
  if (wEl && article.vocab && article.vocab.length) {
    var wHtml = '';
    for (var v = 0; v < article.vocab.length; v++) {
      var w = article.vocab[v];
      var reading = normalizeWord(w.word);
      var safeR = escapeAttr(reading);
      wHtml += '<div class="word-card">'
        + '<div class="word-main">'
        +   '<span class="word-japanese">' + escapeHtml(w.word) + '</span>'
        +   '<button class="word-speak-btn" data-reading="' + safeR + '" title="\u64ad\u653e\u8bfb\u97f3">'
        +     '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">'
        +       '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>'
        +     '</svg>'
        +   '</button>'
        + '</div>'
        + '<div class="word-info">'
        +   '<div class="word-meaning">' + escapeHtml(w.meaning || '') + '</div>'
        +   '<div class="word-reading">' + escapeHtml(w.pos || '') + ' <button class="word-speak-hint" data-reading="' + safeR + '">\uD83D\uDD0A</button></div>'
        + '</div>'
        + '</div>';
    }
    wEl.innerHTML = wHtml;

    // Bind speak buttons via event delegation on the container
    wEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.word-speak-btn, .word-speak-hint');
      if (!btn) return;
      e.stopPropagation();
      var r = btn.getAttribute('data-reading');
      if (r) window.speakWord(r, btn);
    });
  }

  // Practice guide
  var prEl = document.getElementById('practiceContent');
  if (prEl) {
    var prHtml = '';
    if (article.listeningFocus && article.listeningFocus.length > 0) {
      prHtml += '<div class="guide-section"><h3 class="guide-title">\u76f2\u542c\u8bad\u7ec3\u91cd\u70b9</h3><ul class="guide-list">';
      for (var f = 0; f < article.listeningFocus.length; f++) {
        prHtml += '<li>' + escapeHtml(article.listeningFocus[f]) + '</li>';
      }
      prHtml += '</ul></div>';
    }
    if (article.reciteGoal) {
      prHtml += '<div class="guide-section"><h3 class="guide-title">\u80cc\u8bf5\u901a\u5173\u8981\u6c42</h3><p class="guide-text">' + escapeHtml(article.reciteGoal) + '</p></div>';
    }
    prHtml += '<div class="guide-section"><h3 class="guide-title">\u5341\u7bc7\u653b\u514b\u6cd5\u8bad\u7ec3\u6d41\u7a0b</h3><ol class="guide-list">'
      + '<li><strong>\u8054\u89e3</strong>\uff1a\u76f2\u542c\u539f\u6587\uff0c\u4e0d\u770b\u6587\u672c \u2192 \u6355\u6349\u5173\u952e\u8bcd \u2192 \u63a8\u6d4b\u4e3b\u9898</li>'
      + '<li><strong>\u5355\u8bcd</strong>\uff1a\u9010\u8bcd\u5b66\u4e60\uff0c\u7ed3\u5408\u4e0a\u4e0b\u6587\u731c\u6d4b\u8bcd\u4e49 \u2192 AI\u9a8c\u8bc1 \u2192 \u9020\u53e5\u5e94\u7528</li>'
      + '<li><strong>\u6697\u8bb0</strong>\uff1a\u9010\u53e5 \u2192 \u9010\u6bb5 \u2192 \u5168\u6587 \u2192 \u539f\u901f\u80cc\u8bf5</li>'
      + '<li><strong>\u8f93\u51fa</strong>\uff1a\u7528\u81ea\u5df1\u7684\u8bdd\u590d\u8ff0\u539f\u6587\uff0c\u4f18\u5148\u4f7f\u7528\u539f\u6587\u53e5\u578b\u4e0e\u8868\u8fbe</li>'
      + '</ol></div>';
    prEl.innerHTML = prHtml;
  }

  setupAudio(article);
}

function setupAudio(article) {
  var btnPlay = document.getElementById('btnPlayJapanese');
  var btnPause = document.getElementById('btnPauseAudio');

  if (btnPlay && article.text) {
    var newPlay = btnPlay.cloneNode(true);
    btnPlay.parentNode.replaceChild(newPlay, btnPlay);
    newPlay.addEventListener('click', function () {
      playJapaneseWithHighlight(article.text);
    });
  }

  if (btnPause) {
    var newPause = btnPause.cloneNode(true);
    btnPause.parentNode.replaceChild(newPause, btnPause);
    newPause.addEventListener('click', function () {
      window.speechSynthesis.cancel();
      clearSentenceHighlight();
    });
  }
}

// ---- Progress page ----

function renderProgress() {
  var data = App.getData();
  var mats = data.materials || {};

  var totalEl = document.getElementById('totalArticles');
  if (totalEl) totalEl.textContent = MATERIALS_DB.length;

  var completedArr = [];
  var totalWords = 0;
  var scores = [];
  for (var i = 0; i < MATERIALS_DB.length; i++) {
    if (mats[MATERIALS_DB[i].id] !== undefined) {
      completedArr.push(MATERIALS_DB[i]);
      totalWords += (MATERIALS_DB[i].wordCount || 0);
      if (mats[MATERIALS_DB[i].id] && mats[MATERIALS_DB[i].id].score) {
        scores.push(mats[MATERIALS_DB[i].id].score);
      }
    }
  }

  var completedEl = document.getElementById('completedArticles');
  if (completedEl) completedEl.textContent = completedArr.length;

  var twEl = document.getElementById('totalWords');
  if (twEl) twEl.textContent = totalWords;

  var dateSet = {};
  var keys = Object.keys(mats);
  for (var k = 0; k < keys.length; k++) {
    if (mats[keys[k]] && mats[keys[k]].date) dateSet[mats[keys[k]].date] = true;
  }
  var sdEl = document.getElementById('studyDays');
  if (sdEl) sdEl.textContent = Object.keys(dateSet).length;

  var bars = document.getElementById('progressBars');
  if (bars) {
    var barHtml = '';
    for (var m = 0; m < MATERIALS_DB.length; m++) {
      var pct = mats[MATERIALS_DB[m].id] !== undefined ? 100 : 0;
      barHtml += '<div class="progress-bar-item">'
        + '<div class="progress-bar-label">' + escapeHtml(MATERIALS_DB[m].title) + '</div>'
        + '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>'
        + '<div class="progress-bar-value">' + pct + '%</div>'
        + '</div>';
    }
    bars.innerHTML = barHtml;
  }
}

// ---- Summary page ----

function generateSummary() {
  var data = App.getData();
  var mats = data.materials || {};

  var scEl = document.getElementById('summaryContent');
  var ssEl = document.getElementById('summarySections');
  if (scEl) scEl.style.display = 'none';
  if (ssEl) ssEl.style.display = 'block';

  var completedArr = [];
  var totalWords = 0;
  var scores = [];
  for (var i = 0; i < MATERIALS_DB.length; i++) {
    if (mats[MATERIALS_DB[i].id] !== undefined) {
      completedArr.push(MATERIALS_DB[i]);
      totalWords += (MATERIALS_DB[i].wordCount || 0);
      if (mats[MATERIALS_DB[i].id] && mats[MATERIALS_DB[i].id].score) {
        scores.push(mats[MATERIALS_DB[i].id].score);
      }
    }
  }

  var avgScore = 0;
  if (scores.length > 0) {
    var sum = 0;
    for (var s = 0; s < scores.length; s++) sum += scores[s];
    avgScore = Math.round(sum / scores.length);
  }

  var statsEl = document.getElementById('summaryStats');
  if (statsEl) {
    statsEl.innerHTML = '<div class="summary-stat"><div class="summary-stat-value">' + completedArr.length + '/' + MATERIALS_DB.length + '</div><div class="summary-stat-label">\u6587\u7ae0\u5b8c\u6210</div></div>'
      + '<div class="summary-stat"><div class="summary-stat-value">' + totalWords + '</div><div class="summary-stat-label">\u5b66\u4e60\u8bcd\u6c47</div></div>'
      + '<div class="summary-stat"><div class="summary-stat-value">' + avgScore + '</div><div class="summary-stat-label">\u5e73\u5747\u5206</div></div>';
  }

  var amEl = document.getElementById('articleMastery');
  if (amEl) {
    var amHtml = '';
    for (var j = 0; j < MATERIALS_DB.length; j++) {
      var mc = mats[MATERIALS_DB[j].id];
      var sc = (mc && mc.score) || 0;
      amHtml += '<div class="mastery-item"><div class="mastery-rank">' + (j + 1) + '</div>'
        + '<div class="mastery-info"><div class="mastery-title">' + escapeHtml(MATERIALS_DB[j].title) + '</div>'
        + '<div class="mastery-score">\u638c\u63a7\u5ea6: ' + sc + '\u5206</div></div></div>';
    }
    amEl.innerHTML = amHtml;
  }

  var suggestions = [
    { icon: '\uD83D\uDD04', text: '\u5efa\u8bae\u5b9a\u671f\u590d\u4e60\u5df2\u5b66\u6587\u7ae0\uff0c\u56fa\u56f4\u8bb0\u5fc6' },
    { icon: '\uD83D\uDCDD', text: '\u5efa\u8bae\u6bcf\u5929\u575a\u6301\u5b66\u4e60\uff0c\u4fdd\u6301\u5b66\u4e60\u7684\u8fde\u7eed\u6027' }
  ];
  if (completedArr.length < MATERIALS_DB.length * 0.3) {
    suggestions.unshift({ icon: '\uD83D\uDCDA', text: '\u5efa\u8bae\u52a0\u5feb\u5b66\u4e60\u8fdb\u5ea6\uff0c\u5b8c\u6210\u66f4\u591a\u6587\u7ae0\u7684\u5b66\u4e60' });
  }
  if (avgScore < 70) {
    suggestions.unshift({ icon: '\uD83C\uDFAF', text: '\u5efa\u8bae\u52a0\u5f3a\u7ec3\u4e60\uff0c\u63d0\u9ad8\u6bcf\u7bc7\u6587\u7ae0\u7684\u638c\u63a7\u5ea6' });
  }

  var lsEl = document.getElementById('learningSuggestions');
  if (lsEl) {
    var lsHtml = '';
    for (var x = 0; x < suggestions.length; x++) {
      lsHtml += '<div class="suggestion-item"><div class="suggestion-icon">' + suggestions[x].icon + '</div>'
        + '<div class="suggestion-text">' + suggestions[x].text + '</div></div>';
    }
    lsEl.innerHTML = lsHtml;
  }
}

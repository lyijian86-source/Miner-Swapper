const DIFFICULTIES = {
  dawn: { label: "晨光", rows: 9, cols: 9, mines: 10, summary: "9 x 9 · 10 雷" },
  atelier: { label: "雅致", rows: 13, cols: 17, mines: 34, summary: "13 x 17 · 34 雷" },
  grand: { label: "盛宴", rows: 16, cols: 24, mines: 68, summary: "16 x 24 · 68 雷" },
};

const STORAGE_KEYS = {
  best: "velvet-mines-best-times",
  session: "velvet-mines-session-stats",
  ambience: "velvet-mines-ambience",
};

const PROGRESS_LINES = [
  "边角往往藏着秩序，先把结构摸清。",
  "局面已经打开，保持节奏比冒进更重要。",
  "中盘最考验审美和判断，别让多余动作干扰你。",
  "胜势已成，耐心收尾就好。",
];

const refs = {
  body: document.body,
  difficultyGroup: document.querySelector("#difficultyGroup"),
  minesValue: document.querySelector("#minesValue"),
  timerValue: document.querySelector("#timerValue"),
  bestValue: document.querySelector("#bestValue"),
  bestBadge: document.querySelector("#bestBadge"),
  streakBadge: document.querySelector("#streakBadge"),
  winRateBadge: document.querySelector("#winRateBadge"),
  statusLine: document.querySelector("#statusLine"),
  winsValue: document.querySelector("#winsValue"),
  streakValue: document.querySelector("#streakValue"),
  lossesValue: document.querySelector("#lossesValue"),
  restartButton: document.querySelector("#restartButton"),
  ambienceButton: document.querySelector("#ambienceButton"),
  modeLabel: document.querySelector("#modeLabel"),
  boardPill: document.querySelector("#boardPill"),
  boardFrame: document.querySelector("#boardFrame"),
  board: document.querySelector("#board"),
  overlay: document.querySelector("#overlay"),
  overlayKicker: document.querySelector("#overlayKicker"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayCopy: document.querySelector("#overlayCopy"),
  overlayButton: document.querySelector("#overlayButton"),
};

const state = {
  mode: "atelier",
  rows: 0,
  cols: 0,
  mines: 0,
  board: [],
  firstMove: true,
  revealedSafeCells: 0,
  flagsPlaced: 0,
  timer: 0,
  timerId: null,
  status: "ready",
  progressStage: 0,
  bestTimes: {},
  session: { wins: 0, losses: 0, streak: 0, bestStreak: 0 },
  ambience: "champagne",
  touchTimers: new Map(),
};

function loadPersistentState() {
  try {
    state.bestTimes = JSON.parse(localStorage.getItem(STORAGE_KEYS.best) || "{}");
  } catch {
    state.bestTimes = {};
  }

  try {
    state.session = {
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
      ...JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "{}"),
    };
  } catch {
    state.session = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
  }

  state.ambience = localStorage.getItem(STORAGE_KEYS.ambience) || "champagne";
  refs.body.dataset.ambience = state.ambience;
  refs.ambienceButton.textContent =
    state.ambience === "champagne" ? "切换夜幕氛围" : "切换香槟氛围";
}

function savePersistentState() {
  localStorage.setItem(STORAGE_KEYS.best, JSON.stringify(state.bestTimes));
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(state.session));
  localStorage.setItem(STORAGE_KEYS.ambience, state.ambience);
}

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) {
    return "--";
  }

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getNeighbors(row, col) {
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (
        nextRow >= 0 &&
        nextRow < state.rows &&
        nextCol >= 0 &&
        nextCol < state.cols
      ) {
        neighbors.push(state.board[nextRow][nextCol]);
      }
    }
  }
  return neighbors;
}

function shuffle(list) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
  }
}

function createBoardMatrix() {
  return Array.from({ length: state.rows }, (_, row) =>
    Array.from({ length: state.cols }, (_, col) => ({
      row,
      col,
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
      element: null,
      suppressClick: false,
    })),
  );
}

function buildDifficultyButtons() {
  refs.difficultyGroup.innerHTML = "";

  Object.entries(DIFFICULTIES).forEach(([key, config]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "difficulty-button";
    button.dataset.mode = key;
    button.innerHTML = `
      <span class="difficulty-title">${config.label}</span>
      <span class="difficulty-meta">${config.summary}</span>
    `;
    button.addEventListener("click", () => startNewGame(key));
    refs.difficultyGroup.appendChild(button);
  });
}

function renderDifficultyButtons() {
  refs.difficultyGroup.querySelectorAll(".difficulty-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function updateBoardSize() {
  refs.board.style.setProperty("--rows", String(state.rows));
  refs.board.style.setProperty("--cols", String(state.cols));

  const gap = 10;
  const frameWidth = refs.boardFrame.clientWidth - 36;
  const screenWidth = Math.min(window.innerWidth - 36, frameWidth);
  const cellSize = Math.max(
    28,
    Math.min(52, Math.floor((screenWidth - gap * (state.cols - 1)) / state.cols)),
  );
  refs.board.style.setProperty("--cell-size", `${cellSize}px`);
}

function renderBoard() {
  refs.board.innerHTML = "";

  state.board.flat().forEach((cell, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.dataset.row = String(cell.row);
    button.dataset.col = String(cell.col);
    button.style.setProperty("--delay", `${Math.min(index * 6, 220)}ms`);
    button.setAttribute("aria-label", `第 ${cell.row + 1} 行，第 ${cell.col + 1} 列`);
    cell.element = button;

    button.addEventListener("click", () => {
      if (cell.suppressClick) {
        cell.suppressClick = false;
        return;
      }
      handleRevealAction(cell);
    });

    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleFlag(cell);
    });

    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") {
        return;
      }

      const timerId = window.setTimeout(() => {
        toggleFlag(cell);
        cell.suppressClick = true;
        state.touchTimers.delete(button);
      }, 320);

      state.touchTimers.set(button, timerId);
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach((name) => {
      button.addEventListener(name, () => {
        clearTouchTimer(button);
      });
    });

    refs.board.appendChild(button);
    paintCell(cell);
  });

  updateBoardSize();
}

function clearTouchTimer(button) {
  const timerId = state.touchTimers.get(button);
  if (timerId) {
    window.clearTimeout(timerId);
    state.touchTimers.delete(button);
  }
}

function paintCell(cell, options = {}) {
  const { revealMine = false, mistake = false, exploded = false } = options;
  const element = cell.element;
  if (!element) {
    return;
  }

  element.className = "cell";
  element.textContent = "";

  if (cell.revealed) {
    element.classList.add("is-revealed");
  }

  if (mistake) {
    element.classList.add("is-revealed", "is-mistake");
    element.textContent = "×";
    return;
  }

  if (cell.flagged && !cell.revealed) {
    element.classList.add("is-flagged");
    element.textContent = "⚑";
    return;
  }

  if (cell.mine && (cell.revealed || revealMine)) {
    element.classList.add("is-revealed", "is-mine");
    element.textContent = exploded ? "✹" : "✦";
    return;
  }

  if (cell.revealed && cell.adjacent > 0) {
    element.classList.add(`n${cell.adjacent}`);
    element.textContent = String(cell.adjacent);
  }
}

function startTimer() {
  window.clearInterval(state.timerId);
  state.timerId = window.setInterval(() => {
    state.timer += 1;
    refs.timerValue.textContent = formatTime(state.timer);
  }, 1000);
}

function stopTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function hideOverlay() {
  refs.overlay.classList.add("hidden");
}

function showOverlay({ kicker, title, copy }) {
  refs.overlayKicker.textContent = kicker;
  refs.overlayTitle.textContent = title;
  refs.overlayCopy.textContent = copy;
  refs.overlay.classList.remove("hidden");
}

function announce(message) {
  refs.statusLine.textContent = message;
}

function updateSessionMetrics() {
  const totalGames = state.session.wins + state.session.losses;
  const winRate = totalGames === 0 ? "--" : `${Math.round((state.session.wins / totalGames) * 100)}%`;
  const modeBest = state.bestTimes[state.mode];
  const overallBest = Object.values(state.bestTimes).filter(Number.isFinite);

  refs.bestValue.textContent = modeBest ? formatTime(modeBest) : "--";
  refs.bestBadge.textContent = overallBest.length ? formatTime(Math.min(...overallBest)) : "--";
  refs.streakBadge.textContent = String(state.session.bestStreak);
  refs.winRateBadge.textContent = winRate;
  refs.winsValue.textContent = String(state.session.wins);
  refs.streakValue.textContent = String(state.session.streak);
  refs.lossesValue.textContent = String(state.session.losses);
}

function updateHud() {
  refs.minesValue.textContent = String(state.mines - state.flagsPlaced).padStart(3, "0");
  refs.timerValue.textContent = formatTime(state.timer);
  refs.modeLabel.textContent = `${DIFFICULTIES[state.mode].label}模式`;

  const labels = {
    ready: "Ready",
    active: "In Play",
    won: "Cleared",
    lost: "Broken",
  };
  refs.boardPill.textContent = labels[state.status];
  updateSessionMetrics();
}

function armBoard(firstRow, firstCol) {
  const safeZone = new Set([`${firstRow},${firstCol}`]);
  getNeighbors(firstRow, firstCol).forEach((cell) => safeZone.add(`${cell.row},${cell.col}`));

  const candidates = state.board
    .flat()
    .filter((cell) => !safeZone.has(`${cell.row},${cell.col}`));

  shuffle(candidates);
  candidates.slice(0, state.mines).forEach((cell) => {
    cell.mine = true;
  });

  state.board.flat().forEach((cell) => {
    cell.adjacent = getNeighbors(cell.row, cell.col).filter((neighbor) => neighbor.mine).length;
  });
}

function revealSafeArea(startCell) {
  if (startCell.mine) {
    triggerLoss(startCell);
    return;
  }

  const queue = [startCell];

  while (queue.length > 0) {
    const cell = queue.shift();
    if (!cell || cell.revealed || cell.flagged) {
      continue;
    }

    cell.revealed = true;
    state.revealedSafeCells += 1;
    paintCell(cell);

    if (cell.adjacent === 0) {
      getNeighbors(cell.row, cell.col).forEach((neighbor) => {
        if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) {
          queue.push(neighbor);
        }
      });
    }
  }

  maybeAdvanceProgress();
  checkForWin();
}

function countFlaggedNeighbors(cell) {
  return getNeighbors(cell.row, cell.col).filter((neighbor) => neighbor.flagged).length;
}

function chordReveal(cell) {
  if (!cell.revealed || cell.adjacent === 0) {
    return;
  }

  if (countFlaggedNeighbors(cell) !== cell.adjacent) {
    return;
  }

  const unrevealedNeighbors = getNeighbors(cell.row, cell.col).filter(
    (neighbor) => !neighbor.revealed && !neighbor.flagged,
  );

  for (const neighbor of unrevealedNeighbors) {
    if (neighbor.mine) {
      triggerLoss(neighbor);
      return;
    }
    revealSafeArea(neighbor);
  }
}

function handleRevealAction(cell) {
  if (state.status === "won" || state.status === "lost" || cell.flagged) {
    return;
  }

  if (cell.revealed) {
    chordReveal(cell);
    return;
  }

  if (state.firstMove) {
    armBoard(cell.row, cell.col);
    state.firstMove = false;
    state.status = "active";
    startTimer();
    updateHud();
  }

  revealSafeArea(cell);
}

function toggleFlag(cell) {
  if (state.status === "won" || state.status === "lost" || cell.revealed) {
    return;
  }

  cell.flagged = !cell.flagged;
  state.flagsPlaced += cell.flagged ? 1 : -1;
  paintCell(cell);
  updateHud();
}

function checkForWin() {
  const safeCellCount = state.rows * state.cols - state.mines;
  if (state.revealedSafeCells !== safeCellCount) {
    updateHud();
    return;
  }

  state.status = "won";
  stopTimer();

  state.board.flat().forEach((cell) => {
    if (cell.mine && !cell.flagged) {
      cell.flagged = true;
      state.flagsPlaced += 1;
      paintCell(cell);
    }
  });

  state.session.wins += 1;
  state.session.streak += 1;
  state.session.bestStreak = Math.max(state.session.bestStreak, state.session.streak);

  let message = "一气呵成，落点非常干净。";
  if (!state.bestTimes[state.mode] || state.timer < state.bestTimes[state.mode]) {
    state.bestTimes[state.mode] = state.timer;
    message = "新的最佳成绩已记录下来。";
  }

  announce(message);
  showOverlay({
    kicker: "Victory",
    title: "这一局很漂亮",
    copy: `${DIFFICULTIES[state.mode].label}模式用时 ${formatTime(state.timer)}。${message}`,
  });

  savePersistentState();
  updateHud();
}

function triggerLoss(explodedCell) {
  state.status = "lost";
  stopTimer();
  state.session.losses += 1;
  state.session.streak = 0;

  state.board.flat().forEach((cell) => {
    if (cell.mine) {
      cell.revealed = true;
      paintCell(cell, { revealMine: true, exploded: cell === explodedCell });
    } else if (cell.flagged) {
      paintCell(cell, { mistake: true });
    }
  });

  announce("这一步踩空了，换个角度再来一局。");
  showOverlay({
    kicker: "Reset",
    title: "雷区比看上去更狡猾",
    copy: "失败并不破坏风格。重开一局，继续用更稳的节奏清理棋盘。",
  });

  savePersistentState();
  updateHud();
}

function maybeAdvanceProgress() {
  const safeCellCount = state.rows * state.cols - state.mines;
  const ratio = state.revealedSafeCells / safeCellCount;
  const stage = Math.min(PROGRESS_LINES.length, Math.floor(ratio * PROGRESS_LINES.length));

  if (stage > state.progressStage && state.status === "active") {
    state.progressStage = stage;
    announce(PROGRESS_LINES[stage - 1]);
  }
}

function startNewGame(mode = state.mode) {
  stopTimer();
  hideOverlay();

  const config = DIFFICULTIES[mode];
  state.mode = mode;
  state.rows = config.rows;
  state.cols = config.cols;
  state.mines = config.mines;
  state.board = createBoardMatrix();
  state.firstMove = true;
  state.revealedSafeCells = 0;
  state.flagsPlaced = 0;
  state.timer = 0;
  state.status = "ready";
  state.progressStage = 0;

  renderDifficultyButtons();
  renderBoard();
  announce("棋盘已就绪，挑一块顺眼的区域开始。");
  updateHud();
}

function toggleAmbience() {
  state.ambience = state.ambience === "champagne" ? "noir" : "champagne";
  refs.body.dataset.ambience = state.ambience;
  refs.ambienceButton.textContent =
    state.ambience === "champagne" ? "切换夜幕氛围" : "切换香槟氛围";
  savePersistentState();
}

function bindGlobalEvents() {
  refs.restartButton.addEventListener("click", () => startNewGame());
  refs.overlayButton.addEventListener("click", () => startNewGame());
  refs.ambienceButton.addEventListener("click", toggleAmbience);

  window.addEventListener("resize", updateBoardSize);
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r") {
      startNewGame();
    }
  });
}

function boot() {
  loadPersistentState();
  buildDifficultyButtons();
  bindGlobalEvents();
  startNewGame(state.mode);
}

boot();

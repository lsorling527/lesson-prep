const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const CELL_SIZE = 28;
const BOARD_OFFSET_X = 36;
const BOARD_OFFSET_Y = 48;
const SIDE_PANEL_X = BOARD_OFFSET_X + BOARD_COLS * CELL_SIZE + 48;

const TETROMINOES = {
  I: { color: '#00f5ff', matrix: [[1, 1, 1, 1]] },
  O: { color: '#ffe66d', matrix: [[1, 1], [1, 1]] },
  T: { color: '#d66dff', matrix: [[0, 1, 0], [1, 1, 1]] },
  S: { color: '#4ef2a1', matrix: [[0, 1, 1], [1, 1, 0]] },
  Z: { color: '#ff5f7a', matrix: [[1, 1, 0], [0, 1, 1]] },
  J: { color: '#62a6ff', matrix: [[1, 0, 0], [1, 1, 1]] },
  L: { color: '#ffae42', matrix: [[0, 0, 1], [1, 1, 1]] }
};

let boardGrid = [];
let activePiece = null;
let nextPieceType = null;
let bag = [];
let holdPieceType = null;
let canHold = true;
let score = 0;
let linesCleared = 0;
let level = 1;
let fallAccumulator = 0;
let flashRows = [];
let flashTimer = 0;
let statusText = 'READY';
let isGameOver = false;

function setup() {
  createCanvas(600, 700);
  rectMode(CORNER);
  noSmooth();
  resetGame();
}

function draw() {
  updateGame();
  renderGame();
}

function updateGame() {
  if (isGameOver) {
    return;
  }

  if (flashRows.length > 0) {
    flashTimer -= deltaTime / 1000;
    if (flashTimer <= 0) {
      clearCompletedRows();
    }
    return;
  }

  fallAccumulator += deltaTime;
  const dropDelay = getDropDelay();

  if (fallAccumulator >= dropDelay) {
    const moved = movePieceDown();
    if (!moved) {
      lockActivePiece();
    }
    fallAccumulator = 0;
  }
}

function resetGame() {
  boardGrid = createEmptyBoard();
  bag = [];
  nextPieceType = null;
  holdPieceType = null;
  canHold = true;
  score = 0;
  linesCleared = 0;
  level = 1;
  fallAccumulator = 0;
  flashRows = [];
  flashTimer = 0;
  statusText = 'RUNNING';
  isGameOver = false;
  refillBag();
  spawnNextPiece();
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function refillBag() {
  const types = Object.keys(TETROMINOES);
  const shuffled = [...types];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  bag.push(...shuffled);
}

function pullFromBag() {
  if (bag.length === 0) {
    refillBag();
  }
  return bag.pop();
}

function spawnNextPiece() {
  if (!nextPieceType) {
    nextPieceType = pullFromBag();
  }

  const pieceType = nextPieceType;
  nextPieceType = pullFromBag();
  activePiece = createPiece(pieceType);
  canHold = true;

  if (!isPlacementValid(activePiece.matrix, activePiece.x, activePiece.y)) {
    endGame();
  }
}

function createPiece(type) {
  const shape = cloneMatrix(TETROMINOES[type].matrix);
  const matrixWidth = shape[0].length;

  return {
    type,
    matrix: shape,
    x: Math.floor(BOARD_COLS / 2) - Math.floor(matrixWidth / 2),
    y: -1
  };
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix) {
  const result = [];
  const rows = matrix.length;
  const cols = matrix[0].length;

  for (let col = 0; col < cols; col++) {
    const newRow = [];
    for (let row = rows - 1; row >= 0; row--) {
      newRow.push(matrix[row][col]);
    }
    result.push(newRow);
  }

  return result;
}

function movePieceLeft() {
  if (!activePiece || isGameOver || flashRows.length > 0) {
    return;
  }

  if (isPlacementValid(activePiece.matrix, activePiece.x - 1, activePiece.y)) {
    activePiece.x -= 1;
  }
}

function movePieceRight() {
  if (!activePiece || isGameOver || flashRows.length > 0) {
    return;
  }

  if (isPlacementValid(activePiece.matrix, activePiece.x + 1, activePiece.y)) {
    activePiece.x += 1;
  }
}

function movePieceDown() {
  if (!activePiece || isGameOver || flashRows.length > 0) {
    return false;
  }

  if (isPlacementValid(activePiece.matrix, activePiece.x, activePiece.y + 1)) {
    activePiece.y += 1;
    return true;
  }

  return false;
}

function rotateActivePiece() {
  if (!activePiece || isGameOver || flashRows.length > 0) {
    return;
  }

  const rotated = rotateMatrix(activePiece.matrix);
  const kickOffsets = [0, -1, 1, -2, 2];
  const yOffsets = [0, -1, 1];

  for (const xOffset of kickOffsets) {
    for (const yOffset of yOffsets) {
      if (isPlacementValid(rotated, activePiece.x + xOffset, activePiece.y + yOffset)) {
        activePiece.matrix = rotated;
        activePiece.x += xOffset;
        activePiece.y += yOffset;
        return;
      }
    }
  }
}

function isPlacementValid(matrix, offsetX, offsetY) {
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col] === 0) {
        continue;
      }

      const boardX = offsetX + col;
      const boardY = offsetY + row;

      if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) {
        return false;
      }

      if (boardY >= 0 && boardGrid[boardY][boardX] !== null) {
        return false;
      }
    }
  }

  return true;
}

function lockActivePiece() {
  if (!activePiece) {
    return;
  }

  for (let row = 0; row < activePiece.matrix.length; row++) {
    for (let col = 0; col < activePiece.matrix[row].length; col++) {
      if (activePiece.matrix[row][col] === 0) {
        continue;
      }

      const boardX = activePiece.x + col;
      const boardY = activePiece.y + row;

      if (boardY >= 0) {
        boardGrid[boardY][boardX] = activePiece.type;
      }
    }
  }

  const filledRows = findCompletedRows();
  if (filledRows.length > 0) {
    flashRows = filledRows;
    flashTimer = 0.22;
    statusText = 'LINE CLEAR!';
    activePiece = null;
    return;
  }

  spawnNextPiece();
}

function findCompletedRows() {
  const completed = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    if (boardGrid[row].every((cell) => cell !== null)) {
      completed.push(row);
    }
  }

  return completed;
}

function clearCompletedRows() {
  const rowsToClear = [...new Set(flashRows)].sort((a, b) => a - b);
  const remainingRows = boardGrid.filter((_, index) => !rowsToClear.includes(index));

  while (remainingRows.length < BOARD_ROWS) {
    remainingRows.unshift(Array(BOARD_COLS).fill(null));
  }

  boardGrid = remainingRows;
  linesCleared += rowsToClear.length;
  level = Math.floor(linesCleared / 10) + 1;
  score += getLineClearScore(rowsToClear.length);
  flashRows = [];
  flashTimer = 0;
  statusText = 'RUNNING';
  spawnNextPiece();
}

function getLineClearScore(clearCount) {
  const scoreMap = {
    1: 100,
    2: 300,
    3: 500,
    4: 1200
  };

  const base = scoreMap[clearCount] || 0;
  return base * level;
}

function getDropDelay() {
  return max(100, 720 - (level - 1) * 60);
}

function endGame() {
  isGameOver = true;
  statusText = 'GAME OVER';
  activePiece = null;
}

function hardDrop() {
  if (!activePiece || isGameOver || flashRows.length > 0) {
    return;
  }

  while (movePieceDown()) {
    score += 2;
  }

  lockActivePiece();
}

function softDrop() {
  if (!activePiece || isGameOver || flashRows.length > 0) {
    return;
  }

  if (movePieceDown()) {
    score += 1;
  } else {
    lockActivePiece();
  }
}

function holdCurrentPiece() {
  if (!activePiece || !canHold || isGameOver || flashRows.length > 0) {
    return;
  }

  if (holdPieceType === null) {
    holdPieceType = activePiece.type;
    spawnNextPiece();
  } else {
    const tempType = activePiece.type;
    activePiece = createPiece(holdPieceType);
    holdPieceType = tempType;

    if (!isPlacementValid(activePiece.matrix, activePiece.x, activePiece.y)) {
      endGame();
      return;
    }
  }

  canHold = false;
}

function keyPressed() {
  if (keyCode === LEFT_ARROW || key === 'a' || key === 'A') {
    movePieceLeft();
  } else if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') {
    movePieceRight();
  } else if (keyCode === DOWN_ARROW || key === 's' || key === 'S') {
    softDrop();
  } else if (keyCode === UP_ARROW || key === 'w' || key === 'W' || key === 'x' || key === 'X') {
    rotateActivePiece();
  } else if (key === ' ' || keyCode === 32) {
    hardDrop();
  } else if (key === 'c' || key === 'C' || keyCode === SHIFT) {
    holdCurrentPiece();
  } else if (key === 'r' || key === 'R') {
    resetGame();
  }
}

function renderGame() {
  background('#070b1a');
  drawBoardArea();
  drawSidebar();
  drawFooterText();
}

function drawBoardArea() {
  push();
  translate(BOARD_OFFSET_X, BOARD_OFFSET_Y);

  fill('#0f172b');
  stroke('#5ee7ff');
  strokeWeight(2);
  rect(0, 0, BOARD_COLS * CELL_SIZE, BOARD_ROWS * CELL_SIZE, 12);

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;
      const cellValue = boardGrid[row][col];

      noStroke();
      fill(cellValue ? getCellColor(cellValue) : '#111827');
      if (flashRows.includes(row) && frameCount % 8 < 4) {
        fill('#ffffff');
      }
      rect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);

      stroke('#1f2d43');
      strokeWeight(1);
      noFill();
      rect(x, y, CELL_SIZE, CELL_SIZE, 5);
    }
  }

  if (activePiece) {
    drawPiece(activePiece, true);
  }

  pop();
}

function drawPiece(piece, isActive) {
  const glowColor = getCellColor(piece.type);

  for (let row = 0; row < piece.matrix.length; row++) {
    for (let col = 0; col < piece.matrix[row].length; col++) {
      if (piece.matrix[row][col] === 0) {
        continue;
      }

      const boardX = piece.x + col;
      const boardY = piece.y + row;

      if (boardY < 0) {
        continue;
      }

      const x = BOARD_OFFSET_X + boardX * CELL_SIZE + 1;
      const y = BOARD_OFFSET_Y + boardY * CELL_SIZE + 1;
      drawingContext.shadowBlur = isActive ? 24 : 12;
      drawingContext.shadowColor = glowColor;
      fill(glowColor);
      stroke('#d9f8ff');
      strokeWeight(1.5);
      rect(x, y, CELL_SIZE - 2, CELL_SIZE - 2, 5);
    }
  }

  drawingContext.shadowBlur = 0;
}

function drawSidebar() {
  const sidebarX = SIDE_PANEL_X;
  const topY = BOARD_OFFSET_Y + 10;

  textAlign(LEFT, TOP);
  noStroke();
  fill('#dff9ff');
  textSize(18);
  textStyle(BOLD);
  text('NEON GRID', sidebarX, topY);

  textSize(14);
  fill('#7dd3fc');
  text('SCORE', sidebarX, topY + 36);
  fill('#f8fafc');
  text(score, sidebarX, topY + 56);

  fill('#7dd3fc');
  text('LINES', sidebarX, topY + 94);
  fill('#f8fafc');
  text(linesCleared, sidebarX, topY + 114);

  fill('#7dd3fc');
  text('LEVEL', sidebarX, topY + 152);
  fill('#f8fafc');
  text(level, sidebarX, topY + 172);

  fill('#7dd3fc');
  text('STATUS', sidebarX, topY + 210);
  fill(isGameOver ? '#ff7f7f' : '#9ef7b5');
  text(statusText, sidebarX, topY + 230);

  drawNextPiecePreview(sidebarX, topY + 280);

  if (holdPieceType) {
    drawHoldPiecePreview(sidebarX, topY + 500);
  }
}

function drawNextPiecePreview(x, y) {
  fill('#10213a');
  stroke('#5ee7ff');
  strokeWeight(1.5);
  rect(x, y, 120, 100, 10);

  fill('#dff9ff');
  textSize(12);
  textStyle(BOLD);
  text('NEXT', x + 10, y + 12);

  const previewMatrix = TETROMINOES[nextPieceType].matrix;
  const previewBaseX = x + 36;
  const previewBaseY = y + 36;
  const cellSize = 16;

  for (let row = 0; row < previewMatrix.length; row++) {
    for (let col = 0; col < previewMatrix[row].length; col++) {
      if (previewMatrix[row][col] === 0) {
        continue;
      }

      const px = previewBaseX + col * cellSize;
      const py = previewBaseY + row * cellSize;
      fill(getCellColor(nextPieceType));
      stroke('#d9f8ff');
      rect(px, py, cellSize - 2, cellSize - 2, 4);
    }
  }
}

function drawHoldPiecePreview(x, y) {
  fill('#10213a');
  stroke('#5ee7ff');
  strokeWeight(1.5);
  rect(x, y, 120, 100, 10);

  fill('#dff9ff');
  textSize(12);
  textStyle(BOLD);
  text('HOLD', x + 10, y + 12);

  const previewMatrix = TETROMINOES[holdPieceType].matrix;
  const previewBaseX = x + 36;
  const previewBaseY = y + 36;
  const cellSize = 16;

  for (let row = 0; row < previewMatrix.length; row++) {
    for (let col = 0; col < previewMatrix[row].length; col++) {
      if (previewMatrix[row][col] === 0) {
        continue;
      }

      const px = previewBaseX + col * cellSize;
      const py = previewBaseY + row * cellSize;
      fill(getCellColor(holdPieceType));
      stroke('#d9f8ff');
      rect(px, py, cellSize - 2, cellSize - 2, 4);
    }
  }
}

function drawFooterText() {
  fill('#7dd3fc');
  textSize(12);
  textAlign(LEFT, TOP);
  text('Move: A/D or arrows', 24, 640);
  text('Rotate: W / X / ↑', 24, 660);
  text('Soft: ↓  |  Hard: Space', 24, 680);
}

function getCellColor(type) {
  return TETROMINOES[type].color;
}

function windowResized() {
  resizeCanvas(600, 700);
}

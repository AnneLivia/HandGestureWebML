class SnakeGame {
  canvasBoard = document.querySelector('#canvasSnakeGame');
  ctxCanvasBoard = this.canvasBoard.getContext('2d');

  snakeBody = [{ x: 0, y: 0 }];
  food = { x: 0, y: 0 };

  gameOver = false;

  // para movimentar a snake. Começa movimentando para direita
  snakeMovementDirection = { x: 0, y: 0 };

  constructor(
    nRows = 25,
    nCols = 25,
    blockSize = 20,
    speed = 100,
    colors = {
      boardColor: '#ededed',
      snakeColor: '#573dff',
      foodColor: '#ff2626',
    }
  ) {
    this.nRows = nRows;
    this.nCols = nCols;

    // O grid é composto por vários quadrados de "blockSize" de tamanho.
    // Os movimentos são feitos considerando esses quadrados
    this.blockSize = blockSize;
    this.speed = speed; // milliseconds
    this.colors = colors;

    // default é 500 x 500
    this.canvasBoard.height = this.nRows * this.blockSize;
    this.canvasBoard.width = this.nCols * this.blockSize;
  }

  drawBoard() {
    // desenhando o board ocupando todo o espaço do canvas com uma determinada cor
    this.ctxCanvasBoard.fillStyle = this.colors.boardColor;
    this.ctxCanvasBoard.fillRect(0, 0, this.canvasBoard.width, this.canvasBoard.height);
  }

  getSnakeHead() {
    return {
      x: this.snakeBody[0].x,
      y: this.snakeBody[0].y,
    };
  }

  drawSnake() {
    this.snakeBody.forEach((bodySegment) => {
      this.ctxCanvasBoard.fillStyle = this.colors.snakeColor;
      // sempre multiplica por this.blockSize, porque é o tamanho de cada quadrado no board
      this.ctxCanvasBoard.fillRect(
        bodySegment.x * this.blockSize,
        bodySegment.y * this.blockSize,
        this.blockSize,
        this.blockSize
      );
    });
  }

  drawFood() {
    this.ctxCanvasBoard.beginPath();
    this.ctxCanvasBoard.arc(
      this.food.x * this.blockSize + this.blockSize / 2, // dividido por 2 garante centro 
      this.food.y * this.blockSize + this.blockSize / 2,
      this.blockSize / 2, // raio tem um diametro igual ao tamanho do blockSize
      0,
      2 * Math.PI
    );
    this.ctxCanvasBoard.fillStyle = this.colors.foodColor;
    this.ctxCanvasBoard.fill();
  }

  getRandomPlaceForFood() {
    this.food.x = Math.floor(Math.random() * this.nCols);
    this.food.y = Math.floor(Math.random() * this.nRows);
  }

  moveSnake() {
    const snakeHead = this.getSnakeHead();

    snakeHead.x += this.snakeMovementDirection.x;
    snakeHead.y += this.snakeMovementDirection.y;

    // colocando nova posição da cabeça, unshift, coloca na primeira posição
    this.snakeBody.unshift(snakeHead);
    // removendo parte de calda de snake
    this.snakeBody.pop();
  }

  checkIfSnakeAteFood() {
    const snakeHead = this.getSnakeHead();

    if (this.food.x === snakeHead.x && this.food.y === snakeHead.y) {
      // adicionar nova parte da cobra
      // pode ficar fora do board, porque será redesenhado no moveSnake
      this.snakeBody.push({ x: -1, y: -1 });
      // colocando nova comida no board
      this.getRandomPlaceForFood();
    }
  }

  checkIfGameIsOver() {
    const snakeHead = this.getSnakeHead();
    // se colidir com a parede
    if (
      snakeHead.x < 0 ||
      snakeHead.x >= this.nCols ||
      snakeHead.y < 0 ||
      snakeHead.y >= this.nRows
    ) {
      this.gameOver = true;
    }

    // verificar se cabeça da snake está colidindo com outra parte do body
    for (let i = 1; i < this.snakeBody.length; i++) {
      if (
        snakeHead.x === this.snakeBody[i].x &&
        snakeHead.y === this.snakeBody[i].y
      ) {
        this.gameOver = true;
      }
    }
  }

  startGame() {
    // para já setar um local aleatorio para a comida
    this.getRandomPlaceForFood();

    // iniciando board
    this.handleArrowKeys();

    const gameLoop = setInterval(() => {
      this.drawBoard();
      this.drawFood();
      this.drawSnake();
      this.moveSnake();
      this.checkIfSnakeAteFood();
      this.checkIfGameIsOver();

      if (this.gameOver) {
        clearInterval(gameLoop);
      }
    }, this.speed);
  }

  restartGame() {
    this.snakeBody = [{ x: 0, y: 0 }];
    this.food = { x: 0, y: 0 };
    this.gameOver = false;
    this.snakeMovementDirection = { x: 0, y: 0 };
    this.ctxCanvasBoard.clearRect(0, 0, this.canvasBoard.width, this.canvasBoard.height);
    this.startGame();
  }

  handleArrowKeys() {
    // adicionar o event listener para detectar teclas pressionadas
    document.addEventListener('keydown', (event) => {
      event.preventDefault();
      switch (event.key) {
        case 'ArrowLeft':
          if (this.snakeMovementDirection.x !== 1) {
            this.snakeMovementDirection.x = -1;
            this.snakeMovementDirection.y = 0;
          }
          break;
        case 'ArrowUp':
          if (this.snakeMovementDirection.y !== 1) {
            this.snakeMovementDirection.x = 0;
            this.snakeMovementDirection.y = -1;
          }
          break;
        case 'ArrowRight':
          if (this.snakeMovementDirection.x !== -1) {
            this.snakeMovementDirection.x = 1;
            this.snakeMovementDirection.y = 0;
          }
          break;
        case 'ArrowDown':
          if (this.snakeMovementDirection.y !== -1) {
            this.snakeMovementDirection.x = 0;
            this.snakeMovementDirection.y = 1;
          }
          break;
      }
    });
  }
}

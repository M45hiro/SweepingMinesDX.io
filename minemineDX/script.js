document.addEventListener('DOMContentLoaded', function () {
    let size = 10;  // 默认棋盘尺寸 10x10
    let mineProbability = 1;  // 默认每个格子最多的雷数
    let mineLocations = [];
    let revealedCells = [];
    let flaggedCells = new Map();  // 使用Map来存储插旗的数量（key: 格子索引，value: 插旗数量）
    let remainingMines = 30;  // 默认剩余雷的数量
    let isGameOver = false;

    const board = document.getElementById('board');
    const startBtn = document.getElementById('startBtn');
    const message = document.getElementById('message');
    const gridSizeSelect = document.getElementById('gridSize');
    const mineProbabilityInput = document.getElementById('mineProbability');  // 剩余雷数显示区域

    // 创建一个n x n的矩阵，初始化为0
    function createGrid(n) {
        return Array.from({ length: n }, () => Array(n).fill(0));
    }

    // 随机撒雷的函数
    function scatterBombs(grid, m, p, n) {
        let bombPositions = [];
        while (bombPositions.length < m) {
            const x = Math.floor(Math.random() * n);
            const y = Math.floor(Math.random() * n);

            // 确保该位置未撒过雷，且该位置的雷数不超过p
            if (grid[x][y] - 1 >= -1*p) {
                grid[x][y] -= 1;  // 在该位置撒雷，雷用负数表示
                bombPositions.push([x, y]);
            }
        }
        return grid;
    }

    // 计算每个非雷格子相邻雷的数量
    function countAdjacentBombs(grid, n, p) {
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (grid[i][j] < 0) {  // 如果是雷格子
                    continue;
                }

                let count = 0;
                for (let [dx, dy] of directions) {
                    const ni = i + dx;
                    const nj = j + dy;
                    if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                        if (grid[ni][nj] < 0) {
                            count += Math.abs(grid[ni][nj]);  // 累加该雷格中的雷数
                        }
                    }
                }
                grid[i][j] = count;
            }
        }
        return grid;
    }

    // 生成邻接矩阵
    function generateAdjacencyMatrix(grid, n) {
        const bombPositions = [];  // 保存雷的位置
        const nonBombPositions = [];  // 保存非雷格的位置

        // 找出所有雷格和非雷格的位置
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (grid[i][j] < 0) {
                    bombPositions.push([i, j]);
                } else {
                    nonBombPositions.push([i, j]);
                }
            }
        }

        // 创建邻接矩阵
        const adjacencyMatrix = [];

        // 遍历每个非雷格子
        for (let nonBomb of nonBombPositions) {
            const row = [];
            for (let bomb of bombPositions) {
                const [ni, nj] = nonBomb;
                const [bi, bj] = bomb;

                // 相邻的条件：上下左右或对角线
                const directions = [
                    [-1, 0], [1, 0], [0, -1], [0, 1],
                    [-1, -1], [-1, 1], [1, -1], [1, 1]
                ];
                let isAdjacent = false;
                for (let [dx, dy] of directions) {
                    if (ni + dx === bi && nj + dy === bj) {
                        isAdjacent = true;
                        break;
                    }
                }
                row.push(isAdjacent ? 1 : 0);
            }
            adjacencyMatrix.push(row);
        }

        return adjacencyMatrix;
    }

    // 绑定右键点击插旗事件
    function addFlaggingEvent(button, i, j, grid, maxMine, totalMines, totalFlags) {
        let flagCount = 0;
        mineCount = totalMines;
        flagCounts = totalFlags;
     
        button.addEventListener('contextmenu', (event) => {
            if(isGameOver) return;
            event.preventDefault();
            console.log(revealedCells);
            console.log(button.classList);
            if (button.classList.contains('flip')) {
                return;
            }
            if (-1* grid[i][j] > flagCount) {
                mineCount--;
                console.log(mineCount);
            }

            if (flagCount < maxMine) {
                flagCount++;
                button.textContent = `🚩${flagCount}`;
                flagCounts--;
            }
            if(mineCount === 0 && flagCounts === 0){
                message.textContent = '游戏结束！所有地雷已被扫除！';
                isGameOver = true;
            }
        });
        button.addEventListener('click', (event) => {
            if(isGameOver) return;
            if (grid[i][j] < 0 && -1* grid[i][j] < flagCount) {
                mineCount++;
                console.log(mineCount);
            }
            if (flagCount === 0) {
                revealCell(i, j, grid);
                return;
            }
            if (event.button === 0) {  // 左键点击
                if (flagCount > 1) {  // 确保已经插过旗
                    flagCount--;  // 减少插旗数量
                    button.textContent = `🚩${flagCount}`;  // 更新显示的旗帜数
                    flagCounts ++;
                }
                if (flagCount === 1) {  // 确保已经插过旗
                    flagCount--;  // 减少插旗数量
                    button.textContent = ``;  // 更新显示的旗帜数
                    flagCounts ++;
                }
            }
        });

        return mineCount, flagCounts;
    }
    

    // 计算邻接矩阵的秩
    function matrixRank(matrix) {
        const m = matrix.length;
        const n = matrix[0].length;
        let rank = 0;

        for (let i = 0; i < Math.min(m, n); i++) {
            let pivotRow = -1;
            for (let j = i; j < m; j++) {
                if (matrix[j][i] !== 0) {
                    pivotRow = j;
                    break;
                }
            }

            if (pivotRow === -1) continue;

            // Swap rows
            [matrix[i], matrix[pivotRow]] = [matrix[pivotRow], matrix[i]];

            for (let j = i + 1; j < m; j++) {
                if (matrix[j][i] !== 0) {
                    let factor = matrix[j][i] / matrix[i][i];
                    for (let k = i; k < n; k++) {
                        matrix[j][k] -= matrix[i][k] * factor;
                    }
                }
            }

            rank++;
        }
        return rank;
    }
    
    // 处理点击格子的逻辑
    function revealCell(x, y, grid) {
        if (isGameOver) return;
    
        const btn = board.querySelector(`[data-index="${x * size + y}"]`);
    
        // 如果已被揭示或标记为旗帜，直接返回
        if (revealedCells.includes(`${x}-${y}`)) {
            return;
        }
    
        revealedCells.push(`${x}-${y}`);
    
        // 添加翻开动画效果
        btn.classList.add('flip');
        btn.classList.add(`number-${grid[x][y]}`);
        // 在翻转结束后显示内容
        setTimeout(() => {
            // 如果是雷，游戏结束
            if (grid[x][y] < 0) {
                btn.textContent = '💣';  // 显示雷
                message.textContent = '游戏结束！你踩到雷了！';
                isGameOver = true;
                return;
            }
    
            // 获取格子周围雷的数量
            const count = grid[x][y];
            btn.textContent = count === 0 ? '' : count;
            
            // 设置翻转后的背景色为白色
            btn.classList.add('flip');
            btn.classList.add(`number-${count}`);
            // 如果该格子周围没有雷，递归显示相邻格子的内容
            if (count === 0) {
                const directions = [
                    [-1, 0], [1, 0], [0, -1], [0, 1],
                    [-1, -1], [-1, 1], [1, -1], [1, 1]
                ];
    
                // 用栈来存储要处理的格子
                let stack = [[x, y]];
    
                while (stack.length > 0) {
                    const [currentX, currentY] = stack.pop();
                    const currentBtn = board.querySelector(`[data-index="${currentX * size + currentY}"]`);
                    const currentCount = grid[currentX][currentY];
    
                    // 遍历该格子四周的格子
                    for (let [dx, dy] of directions) {
                        const nx = currentX + dx;
                        const ny = currentY + dy;
    
                        // 确保格子在范围内并且还未被揭示
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                            const neighborBtn = board.querySelector(`[data-index="${nx * size + ny}"]`);
                            if (!revealedCells.includes(`${nx}-${ny}`) && !flaggedCells.has(`${nx}-${ny}`)) {
                                revealedCells.push(`${nx}-${ny}`);
                                
                                
                                // 如果该邻近格子是数字大于0的格子，直接显示
                                const neighborCount = grid[nx][ny];
                                if (neighborCount > 0) {
                                    neighborBtn.textContent = neighborCount;
                                    neighborBtn.classList.add('flip');
                                    btn.classList.add(`number-${neighborCount}`);
                                } else {
                                    // 如果是0，保持空白并且递归检查邻近格子
                                    stack.push([nx, ny]);
                                    neighborBtn.classList.add('flip');
                                    
                                }
                            }
                        }
                    }
                }
            } else {
                // 如果是数字大于0的格子，直接显示数字并停止递归
                btn.textContent = count;
                btn.classList.add('flip');
                btn.classList.add(`number-${grid[x][y]}`);
                
            }
        }, 500); // 设置时间为动画持续时间后再显示内容
    }
    
    

    // 主函数：开始游戏
    function startGame() {
        // 获取用户选择的难度设置
        size = parseInt(gridSizeSelect.value);  // 格子大小
        mineProbability = parseInt(mineProbabilityInput.value);  // 每个格子最多的雷数（整数）
        const totalCells = size * size;
        let totalMines = Math.floor(totalCells / 5);
        remainingMines = totalMines;
        remainingFlags = totalMines;
        while(true){
            // 初始化游戏状态
            isGameOver = false;
            revealedCells = [];
            flaggedCells.clear();  // 清空已插旗的格子
              // 重新设置剩余雷数
            mineLocations = [];
            board.innerHTML = '';
            message.textContent = '';
            // 创建一个n x n的矩阵
            let grid = createGrid(size);

            // 计算地雷总数
            grid = scatterBombs(grid, totalMines, mineProbability, size);  // 撒雷
            grid = countAdjacentBombs(grid, size, mineProbability);  // 计算每个非雷格子相邻雷的数量

            // 将雷的位置存储在 mineLocations 数组中
            mineLocations = [];
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (grid[i][j] < 0) {
                        mineLocations.push(i * size + j);  // 存储雷的索引
                    }
                }
            }

            // 生成邻接矩阵并计算其秩
            const adjacencyMatrix = generateAdjacencyMatrix(grid, size);
            const rank = matrixRank(adjacencyMatrix);

            // 计算雷的数量
            let r = grid.flat().filter(cell => cell < 0).length;

            // 如果秩等于雷格子数量，则显示矩阵并继续游戏
            if (rank === r) {
                console.log("找到满足条件的雷区矩阵：");
                console.log(grid);
                // 创建棋盘按钮
                board.style.gridTemplateColumns = `repeat(${size}, 30px)`;  // 每行40px宽
                board.style.gridTemplateRows = `repeat(${size}, 30px)`;
                for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                        const btn = document.createElement('button');
                        btn.classList.add('cell');
                        btn.dataset.index = `${i * size + j}`;
                        //btn.addEventListener('click', () => revealCell(i, j, grid));  // 绑定点击事件
                        remainingMines, remainingFlags = addFlaggingEvent(btn, i, j, grid, mineProbability, remainingMines, remainingFlags);  // 添加右键插旗事件
                        board.appendChild(btn);
                    }
                }
                break;
            } else {
                console.log("邻接矩阵的秩小于雷格子数量，重新生成...");
                continue;  // 如果条件不满足，停止并重新开始
            }
        }
        


    }

    // 初始化游戏
    startBtn.addEventListener('click', startGame);
});

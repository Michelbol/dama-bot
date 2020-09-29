const turns = {
	WHITE: 'White',
	BLACK: 'Black',
}

const playerType = {
	HUMAN: 'human',
	MACHINE: 'machine'
}

const cardinalPointsAvailable = {
	NORTHWEST: 'NorthWest',
	NORTHEAST: 'NorthEast',
	SOUTHWEST: 'SouthWest',
	SOUTHEAST: 'SouthEast',
}

const cardinalPointsAvailableWhite = {
	SOUTHWEST: 'SouthWest',
	SOUTHEAST: 'SouthEast',
}

const cardinalPointsAvailableBlack = {
	NORTHWEST: 'NorthWest',
	NORTHEAST: 'NorthEast',
}

let model = getModel();

function getModel(){
	return {
		setup: true,
		turn: "",
		whiteLeft: 0,
		blackLeft: 0,
		typeWhite: playerType.HUMAN,
		typeBlack: playerType.MACHINE,
		board: {
			rows: 0,
			columns: 0,
			pieces: 0,
			selected: null,
			positions: [],
			addWhitePieces: function(piecesPerSide) {
				model.whiteLeft = piecesPerSide;
				let remaining = piecesPerSide;
				let currentRow = 0;
				let currentColumn = 1;
				while(remaining > 0)
				{
					this.positions[currentRow][currentColumn] = new model.WhitePiece(currentRow, currentColumn);
					if(currentColumn === this.columns-1){
						currentColumn++;
					}else if(currentColumn === this.columns-2){
						currentColumn += 3;
					}else{
						currentColumn += 2;
					}
					if(currentColumn >= this.columns){
						currentRow++;
					}
					currentColumn = currentColumn % this.columns;
					remaining--;
				}
			},
			addBlackPieces: function(piecesPerSide) {
				model.blackLeft = piecesPerSide;
				let remaining = piecesPerSide;
				let currentRow = this.rows-1;
				let currentColumn = this.columns-2;
				while(remaining > 0)
				{
					this.positions[currentRow][currentColumn] = new model.BlackPiece(currentRow, currentColumn);
					currentColumn-=2;
					if(currentColumn < 0){
						currentRow--;
					}
					if(currentColumn === -1){
						currentColumn = this.columns - 2;
					} else if(currentColumn === -2){
						currentColumn = this.columns - 1;
					}
					currentColumn = currentColumn % this.columns;
					remaining--;
				}
			},
			initBoard: function(rows, columns, piecesPerSide){
				model.turn = turns.WHITE;

				this.rows = rows;
				this.columns = columns;
				for(let i = 0; i < rows; i++) {
					this.positions[i] = [];
					for(let j = 0; j < columns; j++){
						this.positions[i][j] = new model.Piece(i, j);
					}
				}
				this.addWhitePieces(piecesPerSide);
				this.addBlackPieces(piecesPerSide);
			},
			drawBoard: function() {
				while (document.querySelector("main").firstChild){
					document.querySelector("main").removeChild(document.querySelector("main").firstChild);
				}

				let board = document.querySelector("main").appendChild(document.createElement("div"));
				board.className = "board";

				let rows = this.rows;
				let columns = this.columns;

				let actualRow = 0;
				let actualColumn = 0;
				for (let i=0; i< rows*columns; i++) {
					let isWhite = parseInt((i / columns) + i) % 2 === 0;
					let cell = document.createElement("div");
					cell.setAttribute("row", actualRow.toString());
					cell.setAttribute("column", actualColumn.toString());
					cell.className = isWhite ? 'cell cell-white' : 'cell cell-black';
					board.appendChild(cell);
					actualColumn++;
					if (actualColumn >= columns) {
						actualColumn = 0;
						actualRow++;
					}
				}
				for(let i = 0; i < rows; i++) {
					for(let j = 0; j < columns; j++) {
						let cell = document.querySelectorAll('div[row="'+i+'"][column="'+j+'"]')[0];
						if(!this.positions[i][j].isEmpty()) {
							let newPiece = document.createElement('img');
							newPiece.setAttribute('src', this.positions[i][j].src);
							cell.appendChild(newPiece);
							if(this.positions[i][j].selected)
								cell.className += ' selected';
						}
						if(this.positions[i][j].highlighted) {
							cell.className += ' highlight';
							let that = this;
							cell.addEventListener('click', function() {
								that.selected.changePosition(parseInt(this.getAttribute('row')), parseInt(this.getAttribute('column')));
								that.unselectCell();
								that.drawBoard();
							});
						} else {
							let that = this;
							cell.addEventListener('click', function(){
								that.selectCell(this.getAttribute('row'), this.getAttribute('column'));
								that.drawBoard();
							});
						}
					}
				}
				if(model[`type${model.turn}`] === playerType.MACHINE){
					movementPiece();
				}
			},
			putInitialPieces: function (pieces) {
				let remaining = pieces;
				let currentRow = 0;
				let currentColumn = 1;
				while(remaining > 0)
				{
					this.positions[currentRow][currentColumn] = new model.WhitePiece(currentRow, currentColumn);
					remaining--;
					currentColumn += 2;
					if(currentColumn > this.columns)
						currentRow++;
					currentColumn = currentColumn % this.columns;

				}
			},
			draw: function () {
				for (let i in this.positions) {
					for (let j in this.positions[i]) {
						this.positions[i][j].draw();
					}
				}
			},
			selectCell: function (row, column) {
				if(this.selected != null) {
					this.selected.selected = false;
					this.clearHighlights();
				}
				this.selected = null;
				if(!this.positions[row][column].isEmpty() && model.turn === this.positions[row][column].color && isHuman()) {
					this.selected = this.positions[row][column];
					this.selected.selected = true;
					this.selected.highlightMoves(this.selected.row, this.selected.column);
				}
				this.drawBoard();
			},
			unselectCell: function() {
				if(this.selected != null){
					this.selected.selected = false;
				}
				this.selected = null;
				this.clearHighlights();
			},
			clearHighlights: function () {
				for(let i = 0; i < this.rows; i++) {
					for(let j = 0; j < this.columns; j++) {
						this.positions[i][j].highlighted = false;
					}
				}
			},
			isOutOfBounds: function (row, column) {
				return row >= model.board.rows || row < 0 || column >= model.board.columns || column < 0;
			}
		},
		Piece: function (row, column) {
			this.row = parseInt(row);
			this.column = parseInt(column);
			this.src = "";
			this.selected = false;
			this.highlighted = false;
			this.canCapturePiece = false;
			this.cardinalCapture = '';
			this.changePosition = function (newRow, newColumn) {
				model.board.positions[this.row][this.column] = new model.Piece(this.row, this.column);
				if (Math.abs(this.row - newRow) > 1 || Math.abs(this.row - newRow) > 1) {
					let eatenRowPos = (this.row + newRow)/2;
					let eatenColumnPos = (this.column + newColumn)/2;
					model.board.positions[eatenRowPos][eatenColumnPos] = new model.Piece(eatenRowPos, eatenColumnPos);
					if (this.color === turns.WHITE) {
						model.blackLeft--;
					} else {
						model.whiteLeft--;
					}
				}

				this.row = newRow;
				this.column = newColumn;
				model.board.positions[this.row][this.column] = this;
				model.turn = model.turn === turns.WHITE ? turns.BLACK : turns.WHITE;

				if (this.turnDama()){
					if (model.turn === turns.BLACK) {
						model.board.positions[this.row][this.column] = new model.WhiteDama(this.row, this.column);
					} else {
						model.board.positions[this.row][this.column] = new model.BlackDama(this.row, this.column);
					}
				}

			};

			this.draw = function () {
				if (this.src !== "") {
					let cell = this.findCell();
					let img = document.createElement("img");
					img.src = this.src;
					cell.appendChild(img);
				}
			};
			this.highlightMove = function(row, column) {
				if(!model.board.isOutOfBounds(row, column)) {
					let cellTo = model.board.positions[row][column];
					if (cellTo.isEmpty()) {
						cellTo.highlighted = true;
						return false;
					}
					return this.color !== model.board.positions[row][column].color;
				}
			};
			this.isEmpty = function () {
				return true;
			};
			this.findCell = function () {
				return document.querySelectorAll('div[row="'+this.row+'"][column="'+this.column+'"]')[0];
			}
		},
		BlackPiece: function (row, column) {
			this.__proto__ = new model.Piece(row, column);
			this.src = 'img/black.png';
			this.color = turns.BLACK;
			this.isQueen = false;

			this.highlightMoves = function (row, column) {
				if (this.highlightMove(row-1, column-1)){
					this.highlightMove(row-2, column-2);
				}
				if (this.highlightMove(row-1, column+1)){
					this.highlightMove(row-2, column+2);
				}
			};
			this.turnDama = function () {
				return this.row === 0;
			};
			this.isEmpty = function () {
				return false;
			}
		},
		WhitePiece: function (row, column) {
			this.__proto__ = new model.Piece(row, column);
			this.src = 'img/white.png';
			this.color = turns.WHITE;
			this.isQueen = false;

			this.highlightMoves = function (row, column) {
				if (this.highlightMove(row+1, column+1)){
					this.highlightMove(row+2, column+2);
				}

				if (this.highlightMove(row+1, column-1)){
					this.highlightMove(row+2, column-2);
				}
			};

			this.turnDama = function () {
				return this.row === model.board.rows-1;
			};

			this.isEmpty = function () {
				return false;
			}
		},
		BlackDama: function (row, column) {
			this.__proto__ = new model.BlackPiece(row, column);
			this.src = 'img/blackdama.png';
			this.isQueen = true;
			this.highlightMoves = highlightMovesQueen;
			this.isEmpty = isEmpty;
		},
		WhiteDama: function (row, column) {
			this.__proto__ = new model.WhitePiece(row, column);
			this.src = 'img/whitedama.png';
			this.isQueen = true;
			this.highlightMoves = highlightMovesQueen;
			this.isEmpty = isEmpty;
		}
	};
}

let init = function() {
	model = getModel();
	startWatch();
	model.board.initBoard(8, 8, 12);
	model.board.drawBoard();
	model.setup = false;
};

function startWatch(){
	model = new Proxy(model, {
		set: function(obj, prop, newValue){
			obj[prop] = newValue;
			if (prop === "turn"){
				changeTurnName();
			}
			if ((prop === "whiteLeft") || prop === "blackLeft") {
				updateQtdPiecesLeft();
				if(!obj.setup){
					if (model.whiteLeft === 0) {
						alert("Jogador Preto Ganhou!");
						init();
					}
					if (model.blackLeft === 0) {
						alert("Jogador Branco Ganhou!");
						init();
					}
				}
			}
			return true;
		}
	});
}

function updateQtdPiecesLeft(){
	document.querySelectorAll('#white-counter span')[0].innerHTML = model.whiteLeft;
	document.querySelectorAll('#black-counter span')[0].innerHTML = model.blackLeft;
}

function changeTurnName(){
	document.querySelectorAll('#info h1 span')[0].innerHTML = model.turn === turns.WHITE ? "Branco": "Preto";
}

function highlightMovesQueen(row, column) {
	if (this.highlightMove(row+1, column+1)){
		this.highlightMove(row+2, column+2);
	}
	if (this.highlightMove(row-1, column-1)){
		this.highlightMove(row-2, column-2);
	}
	if (this.highlightMove(row-1, column+1)){
		this.highlightMove(row-2, column+2);
	}
	if (this.highlightMove(row+1, column-1)){
		this.highlightMove(row+2, column-2);
	}
}

function isHuman(){
	return model[`type${model.turn}`] === playerType.HUMAN;
}

function movementPiece(){
	let piecesCanMove = [];
	let canCapture = false;
	let pieceCapture = '';

	if(isWhiteTurn()){
		model.board.positions.filter(function(row){
			row.filter(function (piece){
				if(piece.color === turns.WHITE){
					if(canMoveWhite(piece)){
						if(piece.canCapturePiece){
							canCapture = true;
							pieceCapture = piece;
						}
						piecesCanMove.push(piece);
					}
				}
				return false;
			});
		});
		return;
	}
	if(isBlackTurn()){
		model.board.positions.filter(function(row){
			row.filter(function (piece){
				if(piece.color === turns.BLACK){
					if(canMoveBlack(piece)){
						if(piece.canCapturePiece){
							canCapture = true;
							pieceCapture = piece;
						}
						piecesCanMove.push(piece);
					}
				}
				return false;
			});
		});
	}
	if(pieceCapture){
		movePiece(pieceCapture, pieceCapture.cardinalCapture)
		return;
	}
	let pieceToMove = chooseRandomItemIntoArray(piecesCanMove);
	movePiece(pieceToMove, chooseRandomItemIntoArray(placesToMove(pieceToMove)));
}

function movePiece(piece, cardinal){
	let newPiece = eval(jsLcfirst(cardinal))(piece);
	if(piece.canCapturePiece){
		newPiece = eval(jsLcfirst(cardinal))(newPiece);
	}
	piece.changePosition(newPiece.row, newPiece.column);
	piece.canCapturePiece = false;
	piece.cardinalCapture = '';
	model.board.unselectCell();
	model.board.drawBoard();
}

function placesToMove(piece){
	let cardinalValues = Object.values(cardinalPointsAvailableBlack);
	if(piece.color === turns.WHITE){
		cardinalValues = Object.values(cardinalPointsAvailableWhite);
	}
	if(piece.isQueen){
		cardinalValues = Object.values(cardinalPointsAvailable);
	}
	let placesAvailable = [];
	for (let cardinalPoint in cardinalValues) {
		if(canMoveToPosition(piece, cardinalValues[cardinalPoint])){
			placesAvailable.push(cardinalValues[cardinalPoint]);
		}
	}
	return placesAvailable;
}

function chooseRandomItemIntoArray(data){
	return data[Math.floor(Math.random() * data.length)];
}

function canMoveToPosition(piece, cardinalPoint){
	return eval(`canMove${cardinalPoint}`)(piece);
}

/**
 * First will see south because with is in the top
 * @param piece
 * @returns {*}
 */
function canMoveWhite(piece){
	if(piece.isQueen){
		return canMoveSouthWest(piece) || canMoveSouthEast(piece) || canMoveNorthEast(piece) || canMoveNorthWest(piece);
	}
	return canMoveSouthWest(piece) || canMoveSouthEast(piece);
}

/**
 * First will see north because with is in the top
 * @param piece
 * @returns {*}
 */
function canMoveBlack(piece){
	if(piece.isQueen){
		return canMoveNorthEast(piece) || canMoveNorthWest(piece) || canMoveSouthWest(piece) || canMoveSouthEast(piece);
	}
	return canMoveNorthEast(piece) || canMoveNorthWest(piece);
}

function canMovePiece(piece, cardinalPoint, original){
	let movementPiece = eval(jsLcfirst(cardinalPoint))(piece);
	if(model.board.isOutOfBounds(movementPiece.row, movementPiece.column)){
		return false;
	}
	if(model.board.positions[movementPiece.row][movementPiece.column].isEmpty()){
		return true;
	}
	if(model.board.positions[movementPiece.row][movementPiece.column].color === piece.color){
		return false;
	}
	if(typeof original === "undefined"){
		if(eval(`canMove${cardinalPoint}`)(movementPiece, piece)){
			piece.canCapturePiece = true;
			piece.cardinalCapture = cardinalPoint;
			return true;
		}
	}else{
		//If has original, is the second calling and still has some piece.
		return false;
	}

}

function canMoveNorthEast(piece, original){
	return canMovePiece(piece, cardinalPointsAvailable.NORTHEAST, original);
}

function canMoveSouthEast(piece, original){
	return canMovePiece(piece, cardinalPointsAvailable.SOUTHEAST, original);
}

function canMoveSouthWest(piece, original){
	return canMovePiece(piece, cardinalPointsAvailable.SOUTHWEST, original);
}

function canMoveNorthWest(piece, original){
	return canMovePiece(piece, cardinalPointsAvailable.NORTHWEST, original);
}

function north(piece){
	return {row: piece.row-1, column: piece.column};
}

function south(piece){
	return {row: piece.row+1, column: piece.column};
}

function east(piece){
	return {row: piece.row, column: piece.column+1};
}

function west(piece){
	return {row: piece.row, column: piece.column-1};
}

function northEast(piece){
	return east(north(piece));
}

function northWest(piece){
	return west(north(piece));
}

function southEast(piece){
	return east(south(piece));
}

function southWest(piece){
	return west(south(piece));
}

function isWhiteTurn(){
	return model.turn === turns.WHITE;
}
function isBlackTurn(){
	return model.turn === turns.BLACK;
}

function isEmpty (){
	return false;
}

function jsLcfirst(string) {
	return string.charAt(0).toLowerCase() + string.slice(1);
}

init();
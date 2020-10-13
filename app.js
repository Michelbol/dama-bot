const turns = {
	WHITE: 'White',
	BLACK: 'Black',
}

const playerType = {
	HUMAN: 'human',
	MACHINE: 'machine'
}

const machineType = {
	IA: 'ia',
	RANDOM: 'random'
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

let restartGame = { needRestart: false };
let model = getModel();
let rounds = [];
let recursiveLevel = 0;

function getModel(){
	return {
		setup: true,
		turn: "",
		difficulty: 8,
		whiteLeft: 0,
		blackLeft: 0,
		typeWhite: playerType.MACHINE,
		typeBlack: playerType.MACHINE,
		typeMachineBlack: machineType.RANDOM,
		typeMachineWhite: machineType.IA,
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
					model.board.positions[currentRow][currentColumn] = new model.WhitePiece(currentRow, currentColumn);
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
					model.board.positions[currentRow][currentColumn] = new model.BlackPiece(currentRow, currentColumn);
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

				this.rows = rows;
				this.columns = columns;
				for(let i = 0; i < rows; i++) {
					model.board.positions[i] = [];
					for(let j = 0; j < columns; j++){
						model.board.positions[i][j] = new model.Piece(i, j);
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
						if(!model.board.positions[i][j].isEmpty()) {
							let newPiece = document.createElement('img');
							newPiece.setAttribute('src', model.board.positions[i][j].src);
							cell.appendChild(newPiece);
							if(model.board.positions[i][j].selected){
								cell.className += ' selected';
							}
						}
						if(model.board.positions[i][j].highlighted) {
							cell.className += ' highlight';
							cell.addEventListener('click', clickCellHighlighted);
						} else {
							cell.addEventListener('click', clickCell);
						}
					}
				}
			},
			draw: function () {
				for (let i = 0; i < model.board.positions.length; i++){
					for (let j = 0; j < model.board.positions.length; j++){
						model.board.positions[i][j].draw();
					}
				}
			},
			selectCell: function (row, column) {
				if(this.selected != null) {
					this.selected.selected = false;
					this.clearHighlights();
				}
				this.selected = null;
				if(!model.board.positions[row][column].isEmpty() && model.turn === model.board.positions[row][column].color && isHuman()) {
					this.selected = model.board.positions[row][column];
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
						model.board.positions[i][j].highlighted = false;
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
			cleanCaptureInformation(this);
			this.changePosition = function (newRow, newColumn, game = null) {
				let reference;
				if(game === null){
					reference = model;
				}else{
					reference = game;
				}
				reference.board.positions[this.row][this.column] = new reference.Piece(this.row, this.column);
				let eatenRowPos;
				let eatenColumnPos;
				let utility = 0;
				if (Math.abs(this.row - newRow) > 1 || Math.abs(this.row - newRow) > 1) {
					utility++;
					eatenRowPos = (this.row + newRow)/2;
					eatenColumnPos = (this.column + newColumn)/2;
					if(reference.board.positions[eatenRowPos][eatenColumnPos] instanceof reference.WhiteDama){
						utility++;
					}
					if(reference.board.positions[eatenRowPos][eatenColumnPos] instanceof reference.BlackDama){
						utility++;
					}
					reference.board.positions[eatenRowPos][eatenColumnPos] = new reference.Piece(eatenRowPos, eatenColumnPos);
					if (this.color === turns.WHITE) {
						reference.blackLeft--;
					} else {
						reference.whiteLeft--;
					}
				}

				this.row = newRow;
				this.column = newColumn;
				reference.board.positions[this.row][this.column] = this;
				if (this.turnDama()){
					if (this.color === turns.WHITE) {
						reference.board.positions[this.row][this.column] = new reference.WhiteDama(this.row, this.column);
					} else {
						reference.board.positions[this.row][this.column] = new reference.BlackDama(this.row, this.column);
					}
					utility++;
				}
				cleanCaptureInformation(this);
				if(typeof eatenRowPos !== "undefined"){
					if(canEatPiece(reference.board.positions[this.row][this.column])){
						if(!isMachineTurn()){
							alert('Você pode comer mais peças');
						}
						utility++;
						return utility;
					}
				}
				return utility;
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
			this.clone = function (){
				return new model.Piece(this.row, this.column)
			}
		},
		BlackPiece: function (row, column, canCapturePiece = false, cardinalCapture = '') {
			this.__proto__ = new model.Piece(row, column);
			this.src = 'img/black.png';
			this.color = turns.BLACK;
			this.isQueen = false;
			this.canCapturePiece = canCapturePiece;
			this.cardinalCapture = cardinalCapture;

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
			};
			this.clone = function (){
				return new model.BlackPiece(this.row, this.column, this.canCapturePiece, this.cardinalCapture);
			};
		},
		WhitePiece: function (row, column, canCapturePiece = false, cardinalCapture = '') {
			this.__proto__ = new model.Piece(row, column);
			this.src = 'img/white.png';
			this.color = turns.WHITE;
			this.isQueen = false;
			this.canCapturePiece = canCapturePiece;
			this.cardinalCapture = cardinalCapture;

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
			};

			this.clone = function (){
				return new model.WhitePiece(this.row, this.column, this.canCapturePiece, this.cardinalCapture)
			};
		},
		BlackDama: function (row, column, canCapturePiece = false, cardinalCapture = '') {
			this.__proto__ = new model.BlackPiece(row, column);
			this.src = 'img/blackdama.png';
			this.isQueen = true;
			this.canCapturePiece = canCapturePiece;
			this.cardinalCapture = cardinalCapture;
			this.highlightMoves = highlightMovesQueen;
			this.isEmpty = isEmpty;
			this.clone = function (){
				return new model.BlackDama(this.row, this.column, this.canCapturePiece, this.cardinalCapture)
			};
		},
		WhiteDama: function (row, column, canCapturePiece = false, cardinalCapture = '') {
			this.__proto__ = new model.WhitePiece(row, column);
			this.src = 'img/whitedama.png';
			this.isQueen = true;
			this.canCapturePiece = canCapturePiece;
			this.cardinalCapture = cardinalCapture;
			this.highlightMoves = highlightMovesQueen;
			this.isEmpty = isEmpty;
			this.clone = function (){
				return new model.WhiteDama(this.row, this.column, this.canCapturePiece, this.cardinalCapture)
			};
		}
	};
}

let init = function() {
	model = getModel();
	startWatch();
	model.board.initBoard(8, 8, 12);
	model.board.drawBoard();
	// model.setup = false;
	// model.turn = turns.WHITE;
	sendResult();
};

function startWatch(){
	model = new Proxy(model, {
		set: function(obj, prop, newValue){
			obj[prop] = newValue;
			if (prop === "turn"){
				changeTurnName();
				if(!obj.setup) {
					if (obj[`type${newValue}`] === playerType.MACHINE) {
						setTimeout(function (){
							movementPiece();
						}, 200);
					}
				}
			}
			if ((prop === "whiteLeft") || prop === "blackLeft") {
				updateQtdPiecesLeft();
				if(!obj.setup){
					if (model.whiteLeft === 0) {
						// alert("Jogador Preto Ganhou!");
						restartGame.needRestart = true;
					}
					if (model.blackLeft === 0) {
						// alert("Jogador Branco Ganhou!");
						restartGame.needRestart = true;
					}
				}
			}
			return true;
		}
	});
	restartGame = new Proxy(restartGame, {
		set: function(obj, prop, newValue){
			if(prop === 'needRestart'){
				if(newValue){
					if(model.typeWhite === playerType.MACHINE){
						sendResult();
						debugger;
					}
					init();
				}
			}
		}
	})
}
function sendResult(){
	const myRequest = new Request('https://michelbolzon.com.br/', {method: 'POST', body: JSON.stringify({model: model})});
	fetch(myRequest)
		.then(response => {
			if (response.status === 200) {
				return response.json();
			} else {
				throw new Error('Ops! Houve um erro em nosso servidor.');
			}
		})
		.then(response => {
			console.debug(response);
			// ...
		}).catch(error => {
		console.error(error);
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

function getAllMovements(game = null){
	let reference;
	if(game === null){
		reference = model;
	}else{
		reference = game;
	}
	let piecesCanMove = AllMovementsPlayerTurn(reference);
	let movements = [];
	for (let i = 0; i < piecesCanMove.movements.length; i++){
		let piece = piecesCanMove.movements[i];
		for (let j = 0; j < piece.places.length; j++){
			movements.push({piece: piece.piece.clone(), place: piece.places[j]});
		}
	}
	return movements;
}

function AllMovementsPlayerTurn(game = null){
	let reference;
	if(game === null){
		reference = model;
	}else{
		reference = game;
	}
	let movements = [];
	let pieceCapture = '';

	reference.board.positions.filter(function(row){
		row.filter(function (piece){
			if(piece.color === reference.turn && piece.src !== ''){
				let movement;
				if(reference.turn === turns.BLACK){
					movement = canMoveBlack(piece);
				}else{
					movement = canMoveWhite(piece);
				}
				if(movement.canMove){
					if(piece.canCapturePiece){
						if(pieceCapture !== ''){
							cleanCaptureInformation(reference.board.positions[pieceCapture.row][pieceCapture.column]);
						}
						pieceCapture = piece.clone();
					}
					movements.push({piece: piece.clone(), places: movement.places});
				}
			}
			return false;
		});
	});
	return { movements: movements, pieceCapture: pieceCapture};
}
let executionTime = Date.now();

function startTime(){
	executionTime = Date.now();
}

function isTimeOut(){
	return (Date.now() - executionTime)/1000 > model.difficulty;
}

/**
 * @returns {boolean}
 */
function canGoDeeper(){
	return (model.difficulty*100) > recursiveLevel;
}

function movementPiece(game = null){
	let movement;
	let reference;
	if(game === null){
		reference = model;
	}else{
		reference = game;
	}
	startTime();
	if(reference.turn === turns.BLACK){
		if(reference.typeMachineBlack === machineType.RANDOM){
			movement = movementRandom(reference);
		}else{
			movement = decisionMinMax();
		}
	}else{
		if(reference.typeMachineWhite === machineType.RANDOM){
			movement = movementRandom(reference);
		}else{
			movement = decisionMinMax();
		}
	}
	let time = Date.now() - executionTime;
	console.log("A decisão demorou: " + time/1000 +" segundos");
	printMovement(movement);
	movePiece(movement.piece, movement.place);
}

function chooseRandomMovement(movements){
	let piece = chooseRandomItemIntoArray(movements);
	return {piece: piece.piece.clone(), place: chooseRandomItemIntoArray(piece.places)};
}

function movementRandom(game){
	let { movements, pieceCapture } = AllMovementsPlayerTurn(game);
	if(pieceCapture){
		return {piece: pieceCapture.clone(), place: pieceCapture.cardinalCapture};
	}
	return chooseRandomMovement(movements);
}

function movePiece(piece, cardinal, game = null){
	let reference;
	if(game === null){
		reference = model;
	}else{
		reference = game;
	}
	let newPiece = moveToPosition(cardinal, piece);
	if(piece.canCapturePiece){
		if(piece.cardinalCapture === cardinal){
			newPiece = moveToPosition(cardinal, newPiece);
		}
	}
	if(reference.board.isOutOfBounds(newPiece.row, newPiece.column)){
		return;
	}
	let utility = piece.changePosition(newPiece.row, newPiece.column, game);
	cleanCaptureInformation(piece);
	if(game === null) {
		reference.board.unselectCell();
		reference.board.drawBoard();
	}
	changeTurn(reference);
	return utility;
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
	switch (cardinalPoint){
		case cardinalPointsAvailable.NORTHWEST:
			return canMoveNorthWest(piece);
		case cardinalPointsAvailable.NORTHEAST:
			return canMoveNorthEast(piece);
		case cardinalPointsAvailable.SOUTHEAST:
			return canMoveSouthEast(piece);
		case cardinalPointsAvailable.SOUTHWEST:
			return canMoveSouthWest(piece);
	}
}

/**
 * First will see south because with is in the top
 * @param piece
 * @returns {*}
 */
function canMoveWhite(piece){
	let result = false;
	let places = [];
	if(piece.isQueen){
		if(canMoveSouthWest(piece)){
			result = true;
			places.push(cardinalPointsAvailable.SOUTHWEST);
		}
		if(canMoveSouthEast(piece)){
			result = true;
			places.push(cardinalPointsAvailable.SOUTHEAST);
		}
		if(canMoveNorthEast(piece)){
			result = true;
			places.push(cardinalPointsAvailable.NORTHEAST);
		}
		if(canMoveNorthWest(piece)){
			result = true;
			places.push(cardinalPointsAvailable.NORTHWEST);
		}
		return {canMove: result, places: places};
	}
	if(canMoveSouthWest(piece)){
		result = true;
		places.push(cardinalPointsAvailable.SOUTHWEST);
	}
	if(canMoveSouthEast(piece)){
		result = true;
		places.push(cardinalPointsAvailable.SOUTHEAST);
	}
	return {canMove: result, places: places};
}

/**
 * First will see north because with is in the top.
 * The algorithm needs to execute all movements, because they can have a change of eat a piece.
 * @param piece
 * @returns {*}
 */
function canMoveBlack(piece){
	let result = false;
	let places = [];
	if(piece.isQueen){
		if(canMoveNorthEast(piece)){
			result = true;
			places.push(cardinalPointsAvailable.NORTHEAST);
		}
		if(canMoveNorthWest(piece)){
			result = true;
			places.push(cardinalPointsAvailable.NORTHWEST);
		}
		if(canMoveSouthWest(piece)){
			result = true;
			places.push(cardinalPointsAvailable.SOUTHWEST);
		}
		if(canMoveSouthEast(piece)){
			result = true;
			places.push(cardinalPointsAvailable.SOUTHEAST);
		}
		return {canMove: result, places: places};
	}
	if(canMoveNorthEast(piece)){
		result = true;
		places.push(cardinalPointsAvailable.NORTHEAST);
	}
	if(canMoveNorthWest(piece)){
		result = true;
		places.push(cardinalPointsAvailable.NORTHWEST);
	}
	return {canMove: result, places: places};
}

function canMovePiece(piece, cardinalPoint, original){
	let movementPiece = moveToPosition(cardinalPoint, piece);
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

function moveToPosition(cardinalPoint, piece){
	switch (cardinalPoint){
		case cardinalPointsAvailable.NORTHWEST:
			return northWest(piece);
		case cardinalPointsAvailable.NORTHEAST:
			return northEast(piece);
		case cardinalPointsAvailable.SOUTHEAST:
			return southEast(piece);
		case cardinalPointsAvailable.SOUTHWEST:
			return southWest(piece);
	}
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

function jsLcFirst(string) {
	return string.charAt(0).toLowerCase() + string.slice(1);
}

function clickCell(){
	model.board.selectCell(
		this.getAttribute('row'),
		this.getAttribute('column')
	);
}

function clickCellHighlighted(){
	rounds.push(cloneModel(model));
	model.board.selected.changePosition(
		parseInt(this.getAttribute('row')),
		parseInt(this.getAttribute('column'))
	);
	model.board.unselectCell();
	model.board.drawBoard();
	setTimeout(function(){
		changeTurn(model);
	}, 1000);
}

function changeTurn(game){
	game.turn = game.turn === turns.WHITE ? turns.BLACK : turns.WHITE;
}

function canEatPiece(piece) {
	if (piece.color === turns.WHITE) {
		if(canMoveWhite(piece).canMove){
			return piece.canCapturePiece;
		}
	}
	if (piece.color === turns.BLACK) {
		if(canMoveBlack(piece).canMove){
			return piece.canCapturePiece;
		}
	}
	return false;
}

function cleanCaptureInformation(piece){
	piece.canCapturePiece = false;
	piece.cardinalCapture = '';
}

function isMachineTurn(game = null){
	if(game === null){
		return model[`type${model.turn}`] === playerType.MACHINE;
	}
	return game[`type${game.turn}`] === playerType.MACHINE;
}

function isMoveMoreThenOnePosition(oldRow, newRow){
	return Math.abs(oldRow - newRow) > 1;
}

function cloneModel(model){
	let positions = [];
	for (let i = 0; i < model.board.positions.length; i++){
		for (let j = 0; j < model.board.positions[i].length; j++){
			if(!Array.isArray(positions[i])){
				positions[i] = [];
			}
			if(model.board.positions[i][j].src === ''){
				positions[i][j] = new model.Piece(i, j);
				continue;
			}
			if(model.board.positions[i][j].color === turns.WHITE){
				if(model.board.positions[i][j].isQueen){
					positions[i][j] = new model.WhiteDama(i, j);
					continue;
				}
				positions[i][j] = new model.WhitePiece(i, j);
				continue;
			}
			if(model.board.positions[i][j].color === turns.BLACK){
				if(model.board.positions[i][j].isQueen){
					positions[i][j] = new model.BlackDama(i, j);
					continue;
				}
				positions[i][j] = new model.BlackPiece(i, j);
			}
		}
	}
	return {
		whiteLeft: model.whiteLeft,
		blackLeft: model.blackLeft,
		positions: positions
	};
}

function turnBackRound(){
	if(rounds.length === 0 ){
		return;
	}
	let round = rounds.pop();
	model.board.positions = round.positions;
	model.whiteLeft = round.whiteLeft;
	model.blackLeft = round.blackLeft;
	model.board.unselectCell();
	model.board.drawBoard();
}


function changeDifficulty(event){
	model.difficulty = parseInt(event.target.value);
}

// document.getElementById('difficulty').addEventListener('change', changeDifficulty);

init();

function decisionMinMax(){
	let movement;
	recursiveLevel = 0;
	let roundMovements = getAllMovements();
	let utility = Number.NEGATIVE_INFINITY;
	let number = 0;
	for (let i = 0; i < roundMovements.length; i++){
		let newGame = newModel(model);
		number = movePiece(roundMovements[i].piece.clone(), roundMovements[i].place, newGame);
		number += valueMin(newGame, utility, 0);
		if(number >= utility) {
			utility = number;
			movement = {piece: roundMovements[i].piece.clone(), place: roundMovements[i].place};
		}
	}
	return movement;
}

function newModel(game){
	let newGame = getModel();
	let {whiteLeft, blackLeft, positions} = cloneModel(game);
	newGame.whiteLeft = whiteLeft;
	newGame.blackLeft = blackLeft;
	newGame.board.positions = positions;
	newGame.turn = game.turn;
	return newGame;
}

function valueMax(model, globalUtility){
	if(!canGoDeeper()){
		return 0;
	}
	recursiveLevel = recursiveLevel+1;
	if(isFinal(model)){
		return calcUtility(model);
	}
	let movements = getAllMovements(model);
	if(movements.length === 0){
		return 1/2;
	}
	let values = [];
	for (let i = 0; i < movements.length; i++){
		let newGame = newModel(model);
		let calc = movePiece(movements[i].piece.clone(), movements[i].place, newGame);
		calc += valueMin(newGame, globalUtility);
		values.push(calc);
	}
	return Math.max(...values);
}

function valueMin(model, globalUtility = 0){
	if(!canGoDeeper()){
		return 0;
	}
	recursiveLevel = recursiveLevel+1;

	if(isFinal(model)){
		return calcUtility(model);
	}
	let movements = getAllMovements(model);
	if(movements.length === 0){
		return 1/2;
	}
	let values = [];

	for (let i = 0; i < movements.length; i++){
		let newGame = newModel(model);
		let calc = movePiece(movements[i].piece.clone(), movements[i].place, newGame)
		calc += valueMax(newGame, globalUtility);
		values.push(calc);
	}
	return Math.min(...values);
}

function isFinal(model){
	return model.whiteLeft === 0 || model.blackLeft === 0;
}

function calcUtility(model){
	if(model.typeWhite === playerType.MACHINE){
		if(model.whiteLeft === 0){
			return -2;
		}
		return 2;
	}
	if(model.typeBlack === playerType.MACHINE){
		if(model.blackLeft === 0){
			return -2;
		}
		return 2;
	}
}

function printMovement(movement){
	console.log("{Piece:{Row:"+movement.piece.row+", Column: "+movement.piece.column+"}, Place: "+movement.place+"}");
}
function printPiece(piece){
	console.log("{Piece:{Row:"+piece.row+", Column: "+piece.column+"}");
}
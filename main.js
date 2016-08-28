(function(){
	var W = 800, H = 600;
	var requestId;

	var score;// スコア

	var Player = function(){
		var brain;
		var rate;
		var streak;
		var hand = [];
	}
	var Main = new Player();

	var Enemy = [];
	var e_num;

	var deck = [];

	var on_mouse_hand;
	var on_mouse_player;

	var phase;// ゲームの遷移状態
	// 0 : タイトル画面
	// 1 : メイン画面
	// 2 : プレイ画面
	// 3 : カード選択待機状態
	// 4 : shot対象選択状態
	// 5 : ターンエンド時の処理
	// 6 : ゲームオーバー画面
	// 7 : リザルト画面

	var result;
	// 0 : 勝ち
	// 1 : 負け
	// 2 : 引き分け

	var delta = [];// レーティングの変化量
	var rest_action;// カード使用回数
	var field_sum;// フィールドの合計値
	var turn_player;// ターンプレイヤー
	var next_turn_player;// 次のターンプレイヤー
	var prev_turn_player;// 直前のターンプレイヤー
	var backforward;// ターンの向き
	var shot;// shot 使用判定
	var double;// double 使用判定
	var triple;// double double 使用判定

	var canvas = document.getElementById('canvas');
	canvas.addEventListener("click", onClick, false);
	canvas.addEventListener('mousemove', onMove, false);
	var ctx = canvas.getContext('2d');
	
	init();
	requestId = window.requestAnimationFrame(renderTitle); 

/******* INITIALIZE METHOD *******/

	function init(){
		//system reset
		score = 0;
		phase = 0;

		delta.length = 0;
		rest_action = 1;
		field_sum = 0;
		turn_player = -1;
		next_turn_player = -1;
		prev_turn_player = -1;
		backforward = false;
		shot = false;
		double = false;
		triple = false;

		on_mouse_hand = -1;
		on_mouse_player = -1;

		setDeckRandom();

		e_num = 4;
		setEnemy();

		//status reset
		Main.rate = 1500;
		Main.streak = 0;
		Main.hand = [0,0,0];

		//debug
		setHands();
		phase = 3;
	}

	function setDeckRandom(){
		//var cards = [-10,-1,1,2,3,4,5,6,7,8,9,10,50,99,"TURN","SKIP","SHOT","DOUBLE"];
		var cards = [-10,-1,1,2,3,4,5,6,7,8,9,10,50,99,"TRN","SKP","SHT","DBL"];
		var l = cards.length;
		var tmp = [];
		for(var i = 0; i < l; i++){
			tmp[i*4] = cards[i];
			tmp[i*4+1] = cards[i];
			tmp[i*4+2] = cards[i];
			tmp[i*4+3] = cards[i];
		}
		
		var cnt = 0;
		deck.length = 0;
		while(cnt<l*4){
			var rnd = Math.floor(Math.random()*l*4);
			if(tmp[rnd]!=0){
				deck[cnt] = tmp[rnd];
				tmp[rnd] = 0;
				cnt++;
			}
		}
		for(var i = 0; i < l*4; i++){
			console.log(i+" "+deck[i]);
		}
		console.log("set OK");
	}

	function setEnemy(){
		Enemy.length = 0;
		for(var i = 0; i < e_num; i++){
			Enemy[i] = new Player();
			Enemy[i].rate = 1500 + Math.floor(rnorm()*200);
			Enemy[i].streak = Math.floor(Math.random()*5);
			Enemy[i].hand = [0,0,0];
			Enemy[i].brain = setEnemyBrain(i);
		}
	}

	/* 疑似正規分布 */
	function rnorm(){
		return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
	}

	function setEnemyBrain(p){
		var lv = Enemy[p].rate - 100 + Math.floor(rnorm()*200);
		if(lv<1400){
			//weak AI
			return 0;
		}else if(lv<1600){
			//normal AI
			return 1;
		}else if(lv<1800){
			//hard AI
			return 2;
		}else{
			//strong AI
			return 3;
		}
	}

	function setHands(){
		var next = deck.length - 1;
		Main.hand[0] = deck[next];
		Main.hand[1] = deck[next-1];
		Main.hand[2] = deck[next-2];
		deck.length = next - 2;
		for(var i = 0; i < e_num; i++){
			next = deck.length - 1;
			Enemy[i].hand[0] = deck[next];
			Enemy[i].hand[1] = deck[next-1];
			Enemy[i].hand[2] = deck[next-2];
			deck.length = next - 2;
		}
		console.log("PLAYER [ "+Main.hand[0]+" , "+Main.hand[1]+" , "+Main.hand[2]+" ]");
		for(var i = 0; i < e_num; i++){
			console.log("ENEMY"+i+" [ "+Enemy[i].hand[0]+" , "+Enemy[i].hand[1]+" , "+Enemy[i].hand[2]+" ]");
		}
	}

	function nextGame(){
		Main.rate = delta[0];
		for(var i = 0; i < e_num; i++){
			Enemy[i].rate = delta[i+1];
		}

		for(var i = 0; i < e_num; i++){
			Enemy[i].streak++;
		}
		if(turn_player==-1){
			Main.streak = 0;
		}else{
			Main.streak++;
			Enemy[turn_player].streak = 0;
		}

		rest_action = 1;
		field_sum = 0;
		turn_player = -1;
		next_turn_player = -1;
		prev_turn_player = -1;
		backforward = false;
		shot = false;
		double = false;
		triple = false;
		on_mouse_hand = -1;
		on_mouse_player = -1;

		setDeckRandom();
		setHands();

		phase = 3;
	}

/******* RENDER METHOD *******/

	function renderTitle(){
		ctx.fillStyle = '#579';
		ctx.fillRect(0,0,W,H);

		// 描画メソッド群
		drawMain();

		// 毎フレーム処理
		if(phase==3){
			updateAction();
		}else if(phase==5){
			turnEndCheck();
		}

		requestId = window.requestAnimationFrame(renderTitle); 
	}

	function updateAction(){
		if(turn_player<0)
			return 0;
		switch(Enemy[turn_player].brain){
			case 0 : 
				weakAI(turn_player);
				break;
			case 1 : 
				normalAI(turn_player);
				break;
			case 2 : 
				normalAI(turn_player);
				break;
			case 3 : 
				normalAI(turn_player);
				break;
		}
	}

/******* DRAW METHOD *******/

	function drawMain(){
		drawFrame();// 枠の描画
		drawMenu();// メニューの描画
		drawPlayer();
		drawField();

		//gameover
		if(phase==6){
			drawGameover();
		}

		//result
		if(phase==7){
			drawGameover();
			drawResult();
		}
	}

	function drawFrame(){
		var SX = 0;
		var SY = 0;
		var WIDTH = 800;
		var HEIGHT = 25;
		ctx.fillStyle = '#135';
		ctx.fillRect(SX,SY,WIDTH,HEIGHT);
	}

	function drawMenu(){
		ctx.font= 'bold 20px Meiryo';
		ctx.fillStyle = '#fff';
		ctx.fillText("RATE "+Main.rate,20,20);
		ctx.fillText("WIN STREAK "+Main.streak,200,20);
		ctx.fillText("SCORE "+score,500,20);
	}

	function drawPlayer(){
		//draw Main Player
		var SX = 20;
		var SY = 480;
		var WIDTH = 300;
		var HEIGHT = 100;
		ctx.fillStyle = '#ace';
		ctx.fillRect(SX,SY,WIDTH,HEIGHT);
		ctx.fillStyle = '#7ac';
		ctx.fillRect(SX+5,SY+30,WIDTH-10,3);
		//hit box
		ctx.fillRect(SX+10,SY+40,60,50);
		ctx.fillRect(SX+85,SY+40,60,50);
		ctx.fillRect(SX+160,SY+40,60,50);
		ctx.font= 'bold 20px Meiryo';
		ctx.fillStyle = '#333';
		ctx.fillText("PLAYER",SX+10,SY+24);
		ctx.fillText(Main.hand[0],SX+15,SY+80);
		ctx.fillText(Main.hand[1],SX+90,SY+80);
		ctx.fillText(Main.hand[2],SX+165,SY+80);

		//draw Enemy
		var eX = 600;
		var eY = 45;
		var eWIDTH = 180;
		var eHEIGHT = 80;
		ctx.fillStyle = '#ace';
		for(var i = 0; i < e_num; i++){
			ctx.fillRect(eX,eY+i*90,eWIDTH,eHEIGHT);
		}
		ctx.fillStyle = '#7ac';
		for(var i = 0; i < e_num; i++){
			ctx.fillRect(eX+5,eY+i*90+25,eWIDTH-10,2);
		}

		ctx.font= 'bold 15px Meiryo';
		ctx.fillStyle = '#333';
		for(var i = 0; i < e_num; i++){
			ctx.fillText("ENEMY"+i,eX+5,eY+20+i*90);
		}
		ctx.font= 'bold 14px Meiryo';
		for(var i = 0; i < e_num; i++){
			ctx.fillText("rate",eX+85,eY+20+i*90);
		}
		ctx.font= 'bold 18px Meiryo';
		for(var i = 0; i < e_num; i++){
			ctx.fillText(Enemy[i].rate,eX+118,eY+20+i*90);
		}
		for(var i = 0; i < e_num; i++){
			ctx.fillText(Enemy[i].hand[0],eX+15,eY+60+i*90);
			ctx.fillText(Enemy[i].hand[1],eX+70,eY+60+i*90);
			ctx.fillText(Enemy[i].hand[2],eX+125,eY+60+i*90);
		}
		ctx.fillStyle = '#949';
		for(var i = 0; i < e_num; i++){
			for(var j = Enemy[i].streak; j != 0 ; --j){
				ctx.fillRect(eX+j*12-7,eY+25+i*90,10,5);
			}
		}

		//debug
		ctx.font= 'bold 12px Meiryo';
		for(var i = 0; i < e_num; i++){
			var str;
			var lvl = Enemy[i].brain;
			if(lvl==0){
				str = "weak AI";
			}else if(lvl==1){
				str = "normal AI";
			}else if(lvl==2){
				str = "hard AI";
			}else if(lvl==3){
				str = "strong AI";
			}
			ctx.fillText(str,eX+10,eY+75+i*90);
		}

	}

	function drawField(){
		var SX = 150;
		var SY = 150;
		var WIDTH = 200;
		var HEIGHT = 200;
		ctx.fillStyle = '#ace';
		ctx.fillRect(SX,SY,WIDTH,HEIGHT);
		ctx.font= 'bold 25px Meiryo';
		ctx.fillStyle = '#333';
		ctx.fillText(field_sum,SX+80,SY+120);
		ctx.fillText("DECK REST "+deck.length,SX+10,SY+190);
	}

	function drawGameover(){
		ctx.font= 'bold 55px Meiryo';
		ctx.fillStyle = '#333';
		var str;
		if(result==0){
			str = "勝ち";
		}else if(result==1){
			str = "負け";
		}else{
			str = "引き分け";
		}
		ctx.fillText(str,80,120);
	}

	function drawResult(){
		var SX = 100;
		var SY = 100;
		var WIDTH = 400;
		var HEIGHT = 300;
		ctx.fillStyle = '#ace';
		ctx.fillRect(SX,SY,WIDTH,HEIGHT);

		ctx.font= 'bold 20px Meiryo';
		ctx.fillStyle = '#333';
		ctx.fillText("PLAYER  "+Main.rate+" -> "+delta[0]+" ("+(delta[0]-Main.rate)+")",110,130);
		for(var i = 0; i < e_num; i++){
			ctx.fillText("ENEMY"+i+" "+Enemy[i].rate+" -> "+delta[i+1]+" ("+(delta[i+1]-Enemy[i].rate)+")",110,155+i*25);
		}
	}

/******* SYSTEM METHOD *******/

	function weakAI(p){
		var pos = 0;
		for(var i = 0; i < 3; i++){
			var c = Enemy[p].hand[i] | 0;
			if(-11<c && c<51){
				if((field_sum+c)<100){
					pos = i;
					break;
				}
			}else{
				pos = i;
				break;
			}
		}
		if(((Enemy[p].hand[pos] | 0)+field_sum)>99 && (Enemy[p].hand[pos] | 0)!=99){
			console.log("PLAYER["+p+"] 「やばい、死んだ」");
		}
		selectCard(p,pos);
		if(Enemy[p].hand[pos]=="SHT")
			next_turn_player = -1 + Math.floor(Math.random()*e_num);
	}

	function normalAI(p){
		var pos = 0;
		var max = -11;
		for(var i = 0; i < 3; i++){
			var c = Enemy[p].hand[i] | 0;
			if(-11<c && c<51){
				if((field_sum+c)<100 && max<c){
					max = c;
					pos = i;
				}
			}
		}
		if(((Enemy[p].hand[pos] | 0)+field_sum)>99){
			console.log("PLAYER["+p+"] 「そろそろ危ない」");
		}
		if(((Enemy[p].hand[pos] | 0)+field_sum)>99){
			for(var i = 0; i < 3; i++){
				var c = Enemy[p].hand[i] | 0;
				if(c==0){
					pos = i;
					break;
				}
			}
		}
		if(((Enemy[p].hand[pos] | 0)+field_sum)>99 && (Enemy[p].hand[pos] | 0)!=99){
			console.log("PLAYER["+p+"] 「ダメだこれ」");
		}
		selectCard(p,pos);
		if(Enemy[p].hand[pos]=="SHT"){
			calcNextTurnPlayer();
			calcNextTurnPlayer();
		}
	}

	function selectCard(p,pos){
		//dec rest action
		rest_action--;
		if(rest_action==0){
			phase = 5;
		}

		var c;
		if(p==-1){
			//Main Player
			c = Main.hand[pos];
		}else{
			//someone Enemy
			c = Enemy[p].hand[pos];
		}
		if(-11<c && c<51){
			field_sum += c;
			if(field_sum<0)
				field_sum = 0;
		}else if(c==99){
			field_sum = 99;
		}else if(c=="TRN"){
			backforward = !backforward;
		}else if(c=="SKP"){
			calcNextTurnPlayer();
			calcNextTurnPlayer();
		}else if(c=="SHT"){
			shot = true;
			if(p==-1)
				phase = 4;
		}else if(c=="DBL"){
			if(double){
				triple = true;
			}else{
				double = true;
			}
		}

		console.log("PLAYER["+p+"] "+c+" : sum ["+field_sum+"]");

		distributeCards(p,pos);
	}

	function distributeCards(p,pos){
		var next = deck.length - 1;
		if(deckOutCheck(next))
			return 0;

		if(p==-1){
			//Main Player
			Main.hand[pos] = deck[next];
		}else{
			//someone Enemy
			Enemy[p].hand[pos] = deck[next];
		}
		deck.length = next;
	}

	function turnEndCheck(){
		if(gameoverCheck())
			return 0;

		//next player
		if(next_turn_player==turn_player){
			calcNextTurnPlayer();
		}
		//change turn player
		prev_turn_player = turn_player;
		turn_player = next_turn_player;

		//next player rest action
		rest_action = 1;
		if(double)
			rest_action++;
		if(triple)
			rest_action++;

		//flag reset
		shot = false;
		double = false;
		triple = false;
		
		phase = 3;
	
		//debug
		//console.log(turn_player+" to "+next_turn_player);
	}

	function calcNextTurnPlayer(){
		if(backforward){
			next_turn_player--;
		}else{
			next_turn_player++;
		}
		//over check
		if(next_turn_player<-1)
			next_turn_player = e_num - 1;
		if(next_turn_player>e_num - 1)
			next_turn_player = -1;
	}

	function deckOutCheck(rest){
		if(rest<0){
			result = 2;
			phase = 6;
			calcRating(-2);
			return true;
		}
		return false;
	}

	function gameoverCheck(){
		if(field_sum>99){
			if(turn_player==-1){
				result = 1;
			}else{
				result = 0;
			}
			phase = 6;
			calcRating(turn_player);
			return true;
		}
		return false;
	}

	/* 
	勝ちプレイヤー : 負けプレイヤーのレーティング
	負けプレイヤー : 自分以外のレーティング平均値
	と比較してイロレーティング計算を行う
	 */
	function calcRating(p){
		//p : lose player
		var srate = Main.rate;
		for(var i = 0; i < e_num; i++){
			srate += Enemy[i].rate;
		}

		var ra = Main.rate;
		var rb = Math.floor((srate-ra)/e_num);
		var sa;
		if(p==-1){
			sa = 0;
		}else if(p==-2){
			sa = 0.5;
		}else{
			sa = 1;
			rb = Enemy[p].rate;
		}
		delta[0] = calcELO(ra,rb,sa);

		for(var i = 0; i < e_num; i++){
			ra = Enemy[i].rate;
			rb = Math.floor((srate-ra)/e_num);
			if(p==i){
				sa = 0;
			}else if(p==-2){
				sa = 0.5;
			}else{
				sa = 1;
				rb = p==-1 ? Main.rate : Enemy[p].rate;
			}
			delta[i+1] = calcELO(ra,rb,sa);
		}
	}

	function calcELO(ra,rb,res){
		var ea = 1 /(1 + Math.pow(10,(rb-ra)/400));
		return Math.floor(ra + 32*(res - ea));
	}

	function clickSelectCard(x,y){
		if(hit(x,y,30,520,60,50)){
			//console.log(0);
			selectCard(-1,0);
		}else if(hit(x,y,105,520,60,50)){
			//console.log(1);
			selectCard(-1,1);
		}else if(hit(x,y,180,520,60,50)){
			//console.log(2);
			selectCard(-1,2);
		}
	}

	function clickSelectPlayer(x,y){
		for(var i = 0; i < e_num; i++){
			if(hit(x,y,600,45+i*90,180,80)){
				next_turn_player = i;
				phase = 5;
			}
		}
	}

	function hit(x,y,sx,sy,width,height){
		return sx<x && x<sx+width && sy<y && y<sy+height;
	}

	function onClick(e){
		var rect = e.target.getBoundingClientRect();
		var x =  Math.round(e.clientX - rect.left);
		var y =  Math.round(e.clientY - rect.top);
		//console.log("click "+x+" "+y);
		if(turn_player==-1){
			if(phase==3)
				clickSelectCard(x,y);
			if(phase==4)
				clickSelectPlayer(x,y);
		}
		if(phase==7)
			nextGame();
		if(phase==6)
			phase = 7;
	}

	function onMove(e){
		var rect = e.target.getBoundingClientRect();
		var x =  Math.round(e.clientX - rect.left);
		var y =  Math.round(e.clientY - rect.top);
		//console.log(x+" "+y);
	}
	
})();
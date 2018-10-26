/* Notes:

upping my code-fu with prototyping

Rock = Godzilla
Paper = King Ghidorah
Scissors = Mecha-Godzilla

GIPHY Links
Godzilla
https://media.giphy.com/media/JeiW04NqNARKo/giphy.gif

King Ghidorah
https://media.giphy.com/media/Sj0JjNpkLCYJG/giphy.gif

Mecha-Godzilla
https://media.giphy.com/media/NchdLTjAjcbhC/giphy.gif

Gigan
https://media.giphy.com/media/wLjuKyykechlC/giphy.gif

Mothra
https://media.giphy.com/media/12Ek91HBQ4khAA/giphy.gif

*/


var kaijuBattle = (function () {
    'use strict'

    jQuery.fn.exists = function () { return this.length > 0; };

    // Game logic methods and events
    class GameController {
        constructor() {
        }
    }

    GameController.prototype.addSystemMessage = function (message, targetUserKey) {
        this.addChatEntry(message, dataController.systemUserKey, targetUserKey);
    };

    GameController.prototype.addChatEntry = function (message, sourceUserKey, targetUserKey) {
        if (!message) {
            return;
        }

        var chatEntry = {
            message: message,
            sourceUserKey: sourceUserKey || dataController.userKey,
            targetUserKey: targetUserKey || "all",
            timeStamp: moment().format("X")
        };

        this.getUserInfo(chatEntry.sourceUserKey, function (userInfo) {
            chatEntry.userName = userInfo.name;
            dataController.fb.chatRef.push(chatEntry);
        }.bind(this));
    };

    GameController.prototype.bindListeners = function () {
        // Get the DOM selector strings
        var dom = uiController.getDOMSelectors();

        // Connect Button Click
        $(dom.connectButton).on("click", this.onConnectButtonClick.bind(this));

        // Queue Button Click
        $(dom.queueButton).on("click", this.onQueueButtonClick.bind(this));

        // Chat Send button click
        $(dom.chatSendButton).on("click", this.onChatSendButtonClick.bind(this));

        // Chat Input Key Up
        $(dom.chatInput).on("keyup", this.onChatInputKeyUp.bind(this));

        // On player's Kaiju list item click.
        $(dom.playerKaiju).on("click", this.onKaijuClick.bind(this));

        // On click for exit game icon.
        $(dom.exitGameButton).on("click", this.onExitGameButtonClick.bind(this));

        // Listen for activeGames child added
        dataController.fb.activeGamesRef.on("child_added", this.onGameChildAdded.bind(this));

        // Listen for activeGames child changed
        dataController.fb.activeGamesRef.on("child_changed", this.onGameChildChanged.bind(this));

        // Listen for activeGames child removed
        dataController.fb.activeGamesRef.on("child_removed", this.onGameChildRemoved.bind(this));

        // Listen for connection status changes
        dataController.fb.onlineStatusRef.on("value", this.onOnlineStatusChange.bind(this));

        // Listen for users child changed
        dataController.fb.usersRef.on("child_changed", this.onUsersChildChanged.bind(this));

        // Listen for users child removed
        dataController.fb.usersRef.on("child_removed", this.onUsersChildRemoved.bind(this));

        // Listen for chat child added
        dataController.fb.chatRef.on("child_added", this.onChatChildAdded.bind(this));

    };

    GameController.prototype.connect = function (userName) {
        // Update the current user's info.
        this.updateUserInfo(
            dataController.userKey,
            {
                name: userName,
                status: dataController.statuses.online,
                connectedTime: moment().format("X")
            },
            () => {

                //toggle the login controls
                uiController.toggleLogin(true);

                // Welcome the player
                this.addSystemMessage("Welcome to Kaiju Battle!  Feel free to hang out and chat; or click queue to play.", dataController.userKey);
            }
        );
    };

    GameController.prototype.createNewGame = function (player1Key, player1Name) {
        // Create a new game.
        var game = dataController.fb.activeGamesRef.push({
            player1Key: player1Key,
            player1Name: player1Name,
            player2Key: "",
            player2Name: "",
            player1Score: 0,
            player2Score: 0,
            player1Kaiju: "",
            player2Kaiju: "",
            timeLeft: -1,
            roundsPlayed: 0,
            message: "",
            endGame: false,
            isIntermission: false,
            roundWinner: "",
            lastUpdatedBy: player1Key
        });

        dataController.gameKey = game.key;
        game.onDisconnect().remove();
    }

    GameController.prototype.disconnect = function () {
        // Update the current user's info.
        this.updateUserInfo(
            dataController.userKey,
            {
                name: "Anonymous",
                status: dataController.statuses.offline,
                connectedTime: moment().format("X")
            },
            () => {
                // reset the data.
                dataController.userStatus = dataController.statuses.offline;

                // Clear the chat window and toggle the login controls
                uiController.clearChatWindow();
                uiController.toggleLogin(false);

                // If there is an active game key kill the game.
                if (dataController.gameKey) {
                    this.killGameRecord(dataController.gameKey);
                }

                // Greet the user
                this.addSystemMessage("Enter a username and click \"Connect\" to  chat or play.", dataController.userKey);
            }
        );

    };

    GameController.prototype.getGameInfo = function (key, postback) {
        dataController.fb.activeGamesRef.child(key).once('value').then(function (gameSnap) {
            postback(gameSnap.val());
        });
    };

    GameController.prototype.getGameInfoByPlayerKey = function (key, postback) {
        dataController.fb.activeGamesRef.once('value', function (snapshot) {
            snapshot.forEach(function (childSnap) {
                var childData = childSnap.val();

                if (key === childData.player1Key || key === childData.player2Key) {
                    postback({
                        key: childSnap.key,
                        gameInfo: childSnap.val()
                    });
                } else {
                    postback(null);
                }
            }.bind(this));
        }.bind(this));
    };

    GameController.prototype.getRandomVictoryVerb = function () {
        var randomIndex = Math.floor(Math.random() * dataController.victoryVerbs.length);
        return dataController.victoryVerbs[randomIndex];
    };

    GameController.prototype.getUserInfo = function (key, postback) {
        dataController.fb.usersRef.child(key).once('value').then(function (userSnap) {
            postback(userSnap.val());
        });
    };

    GameController.prototype.init = function () {
        // Make sure there is a system user in the database.
        dataController.fb.usersRef.child(dataController.systemUserKey).set({
            "name": "Kaiju Battle",
            "status": ""
        });

        // set up the listeners.
        this.bindListeners();

        // Init the tooltips.
        $('[data-toggle="tooltip"]').tooltip();

        // iterate through the kaiju and test the GIFs
        dataController.kaiju.forEach(kaiju => {
            giphyController.getById(kaiju.giphyKey, function (response) {
                console.log(kaiju);
                console.log(response);
            })
        });
    };

    GameController.prototype.checkGameState = function (key) {
        gameController.getGameInfo(key, gameInfo => {
            if (gameInfo) {
                gameInfo.timeLeft--;
            } else {
                this.stopRoundTimer()
            };

            //if both kaiju are selected stop the time early.
            if (gameInfo.player1Kaiju && gameInfo.player2Kaiju) {
                gameInfo.timeLeft = 0;
            }

            console.log("     Time Left: " + gameInfo.timeLeft);
            console.log("Player 1 Kaiju: " + gameInfo.player1Kaiju);
            console.log("Player 2 Kaiju: " + gameInfo.player2Kaiju);

            // If the timer is expired, calculate the results.
            if (gameInfo.timeLeft === 0) {
                // stop the timer 
                this.stopRoundTimer();

                gameInfo.roundsPlayed++;

                if (gameInfo.player1Kaiju && !gameInfo.player2Kaiju) {
                    // player 1 selected a kaiju but player 2 did not.
                    gameInfo.player1Score++
                    gameInfo.roundWinner = gameInfo.player1Key;
                    gameInfo.message = gameInfo.player2Name + " was not able to summon a kaiju in time. " + gameInfo.player1Kaiju + " turns his wrath on the local population.";
                } else if (gameInfo.player2Kaiju && !gameInfo.player1Kaiju) {
                    // player 2 selected a kaiju but player 1 did not.
                    gameInfo.player2Score++
                    gameInfo.roundWinner = gameInfo.player2Key;
                    gameInfo.message = gameInfo.player1Name + " was not able to summon a kaiju in time. " + gameInfo.player2Kaiju + " turns his wrath on the local population.";
                } else if (!gameInfo.player2Kaiju && !gameInfo.player1Kaiju) {
                    // neither player selected a kaiju.  End the game as the monsters head off into the sunset.
                    gameInfo.message = "It appears that the kaiju have returned from whence they came.  Peace finally settles upon the land.";
                    gameInfo.endGame = true;
                } else {
                    // both players selected kaiju. Fetch the kaiju object for player 1 and use it to check for victory.
                    var p1kaiju = dataController.getKaiju(gameInfo.player1Kaiju);
                    if (p1kaiju.winAgainst.indexOf(gameInfo.player2Kaiju) !== -1) {
                        // player one's kaiju defeaths player two's kaiju
                        gameInfo.player1Score++
                        gameInfo.roundWinner = gameInfo.player1Key;
                        gameInfo.message = gameInfo.player1Kaiju + " " + this.getRandomVictoryVerb() + " " + gameInfo.player2Kaiju + "!"
                    } else if (p1kaiju.loseAgainst.indexOf(gameInfo.player2Kaiju) !== -1) {
                        // player two's kaiju defeaths player one's kaiju
                        gameInfo.player2Score++
                        gameInfo.roundWinner = gameInfo.player2Key;
                        gameInfo.message = gameInfo.player2Kaiju + " " + this.getRandomVictoryVerb() + " " + gameInfo.player1Kaiju + "!"
                    } else {
                        // the kaiju are tied.  This is not currently possible (stretch goals for more than three kaiju)
                        gameInfo.message = gameInfo.player1Kaiju + " and " + gameInfo.player2Kaiju + " are evenly matched.  Their battle leaves them both bloody and weakened.  The surrounding area has been reduced to a radioactive wasteland.";
                    }
                }

                if (gameInfo.roundWinner) {
                    setTimeout(() => this.startNextRound(key), dataController.baseIntermissionTime * 1000);
                }
            }

            this.updateGameInfo(key, gameInfo);
        });
    }

    GameController.prototype.killGameRecord = function (key) {
        dataController.fb.activeGamesRef.child(key).remove();
    };

    GameController.prototype.leaveQueue = function () {
        this.addSystemMessage("Hit \"Queue\" to begin browsing for a game.", dataController.userKey);
        uiController.showPlayArea(false);
    };

    GameController.prototype.onChatChildAdded = function (childSnap) {
        var childVal = childSnap.val();
        var isTarget = childVal.targetUserKey === "all" || childVal.targetUserKey === dataController.userKey;

        if (!isTarget) {
            return;
        }

        this.getUserInfo(dataController.userKey, function (userInfo) {
            var isNew = userInfo.connectedTime && userInfo.connectedTime <= childVal.timeStamp;
            if (isNew) {
                uiController.addChatEntry(childVal);
            }
        }.bind(this));
    };

    GameController.prototype.onChatInputKeyUp = function (e) {
        if (e.key === "Enter") {
            this.addChatEntry(uiController.chatInputVal())
            uiController.chatInputVal("");
        }
    };

    GameController.prototype.onChatSendButtonClick = function () {
        this.addChatEntry(uiController.chatInputVal())
        uiController.chatInputVal("");
    };

    GameController.prototype.onConnectButtonClick = function () {
        var userName = uiController.userNameInputVal();

        if (!userName) {
            return;
        }

        if (dataController.userStatus === dataController.statuses.offline) {
            this.connect(userName);
        } else {
            this.disconnect();
        }
    };

    GameController.prototype.onExitGameButtonClick = function () {
        if (!dataController.gameKey) {
            return;
        }

        gameController.killGameRecord(dataController.gameKey);
    };

    GameController.prototype.onGameChildAdded = function (childSnap) {
        var childVal = childSnap.val();
        uiController.updateGameArea(childVal, dataController.userKey);
        console.log("Game added.")
        console.log(childVal);
    };

    GameController.prototype.onGameChildChanged = function (childSnap) {
        var childVal = childSnap.val();
        uiController.updateGameArea(childVal, dataController.userKey);
        console.log("Game changed.")
        console.log(childVal);
    };

    GameController.prototype.onGameChildRemoved = function (childSnap) {
        var childVal = childSnap.val();
        var isPlayer1 = dataController.userKey === childVal.player1Key;
        var isPlayer2 = dataController.userKey === childVal.player2Key;
        if (!isPlayer1 && !isPlayer2) {
            return;
        }

        dataController.gameKey = "";
        uiController.showPlayArea(false);
        this.addSystemMessage("You have exited the game, and it has been closed.", dataController.userKey);

        var opponentKey = isPlayer1 ? childVal.player2Key : childVal.player1Key;
        if (opponentKey) {
            this.addSystemMessage(dataController.userName + " has exited the game, and it has been closed.", opponentKey);
        }
    };

    GameController.prototype.onKaijuClick = function (event) {
        var val = $(event.target).data("value");


        gameController.getGameInfo(dataController.gameKey, gameInfo => {
            var isPlayer1 = dataController.userKey === gameInfo.player1Key;
            var isPlayer2 = dataController.userKey === gameInfo.player2Key;

            if (!gameInfo.player1Key || !gameInfo.player2Key) {
                return;
            }

            if (isPlayer1 && !gameInfo.player1Kaiju) {
                gameInfo.player1Kaiju = val;
            }

            if (isPlayer2 && !gameInfo.player2Kaiju) {
                gameInfo.player2Kaiju = val;
            }

            gameController.updateGameInfo(dataController.gameKey, gameInfo);
        })
    };

    GameController.prototype.onOnlineStatusChange = function (statusSnap) {
        // If they are connected..
        if (statusSnap.val()) {
            // Add user to the connections list as Anonymous:Offline.
            var user = dataController.fb.usersRef.push();
            dataController.userKey = user.key;
            this.updateUserInfo(user.key, {
                "name": "Anonymous",
                "status": dataController.statuses.offline,
                connectedTime: moment().format("X")
            });

            // Add the initial greeting.
            uiController.clearChatWindow();
            this.addSystemMessage("Enter a username and click \"Connect\" to  chat or play.", dataController.userKey);

            // Remove user from the connection list when they disconnect.
            user.onDisconnect().remove();
        }
    };

    GameController.prototype.onQueueButtonClick = function () {
        if (!dataController.userName) {
            return;
        }

        if (dataController.userStatus !== dataController.statuses.inGame) {
            this.queue();
        } else {
            this.leaveQueue();
        }
    };

    GameController.prototype.onUsersChildChanged = function (childSnap) {
        // var childData = childSnap.val();
        // TODO: Status related UI things
    }

    GameController.prototype.onUsersChildRemoved = function (childSnap) {
        // TODO: cleanup up any games and notify any remaining players.
        this.getGameInfoByPlayerKey(childSnap.key, function (info) {
            if (info) {
                this.killGameRecord(info.key);
            }
        }.bind(this));
    };

    GameController.prototype.queue = function () {
        this.addSystemMessage("You have been joined to the game queue.", dataController.userKey);
        this.startGame(dataController.userKey, dataController.userName);
    };

    GameController.prototype.startGame = function (playerKey, playerName) {
        var gameFound = false;
        dataController.fb.activeGamesRef.once('value', function (snapshot) {
            snapshot.forEach(function (childSnap) {
                gameFound = true;
                var childData = childSnap.val();
                if (!childData.player1Key) {
                    this.killGameRecord(childSnap.key);
                    return;
                }

                this.getUserInfo(childData.player1Key, function (userInfo) {
                    if (userInfo) {
                        if (!childData.player2Key) {
                            // add yourself as player 2 and start the timer.
                            childData.player2Key = playerKey;
                            childData.player2Name = playerName;
                            childData.timeLeft = dataController.baseRoundTime;
                            dataController.gameKey = childSnap.key;
                            this.startRoundTimer(childSnap.key);
                            this.updateGameInfo(childSnap.key, childData);
                        } else {
                            this.createNewGame(playerKey, playerName)
                        }
                    } else {
                        this.killGameRecord(childSnap.key);
                    }
                }.bind(this));
            }.bind(this));
        }.bind(this));

        if (!gameFound) {
            this.createNewGame(playerKey, playerName);
        }
    };

    GameController.prototype.startNextRound = function (key) {
        console.log("TODO: Start next round.")
    }

    GameController.prototype.startRoundTimer = function (key) {
        if (dataController.roundTimerInterval) {
            return;
        }

        dataController.roundTimerInterval = setInterval(function () {
            gameController.checkGameState(key);
        }.bind(this), 1000);
    };

    GameController.prototype.stopRoundTimer = function () {
        clearInterval(dataController.roundTimerInterval);
        dataController.roundTimerInterval = null;
    };

    GameController.prototype.updateGameInfo = function (key, value) {
        if (!key || !value) {
            return;
        }

        value.lastUpdatedBy = dataController.userKey;
        dataController.fb.activeGamesRef.child(key).set(value);
    };

    GameController.prototype.updateUserInfo = function (key, userInfo, callback) {
        if (key) {
            dataController.fb.usersRef.child(key).set(userInfo);
        } else {
            dataController.userKey = dataController.fb.usersRef.child(key).push(userInfo);
        }

        dataController.userStatus = userInfo.status;
        dataController.userName = userInfo.name;

        if (typeof callback === "function") {
            callback({ key, userInfo });
        }
    };

    // Game data
    class DataController {
        constructor() {

            // firebase
            if (!firebase.apps.length) {
                // Init Firebase
                firebase.initializeApp({
                    apiKey: "AIzaSyALbQQlQf4npQb7ngEPcvgnmMUVs_yhH2I",
                    authDomain: "kaiju-rps-multiplayer.firebaseapp.com",
                    databaseURL: "https://kaiju-rps-multiplayer.firebaseio.com",
                    projectId: "kaiju-rps-multiplayer",
                    storageBucket: "kaiju-rps-multiplayer.appspot.com",
                    messagingSenderId: "229244481231"
                });
            }

            this.fb = {
                database: firebase.database(),
            };

            this.fb.onlineStatusRef = this.fb.database.ref(".info/connected");
            this.fb.usersRef = this.fb.database.ref("/presence/users");
            this.fb.activeGamesRef = this.fb.database.ref("/activeGames");
            this.fb.chatRef = this.fb.database.ref("/chat");
            // End Firebase

            // list of statuses
            this.statuses = {
                idle: "idle",
                inGame: "in-game",
                offline: "offline",
                online: "online",
            };

            // other variables
            this.baseIntermissionTime = 10;
            this.baseRoundTime = 30;
            this.gameKey = "";
            this.roundTimerInterval;
            this.systemUserKey = "SystemUser";
            this.systemUserName = "Kaiju Battle";
            this.userKey = "";
            this.userName = "Anonymous";
            this.userStatus = "idle";

            // Define the kaiju
            // using arrays for win against/lose to so I can expand the number of kaiju beyond 3 at a later date. #goals
            this.kaiju = [
                {
                    name: "Godzilla",
                    giphyKey: "JeiW04NqNARKo",
                    winAgainst: ["Ghidorah"],
                    loseAgainst: ["Mothra"],
                },
                {
                    name: "King Ghidorah",
                    giphyKey: "Sj0JjNpkLCYJG",
                    winAgainst: ["Mothra"],
                    loseAgainst: ["Godzilla"],
                },
                {
                    name: "Mothra",
                    giphyKey: "12Ek91HBQ4khAA",
                    winAgainst: ["Godzilla"],
                    loseAgainst: ["King Ghidorah"],
                }
            ];

            // An array of verbs to use randomly in the victory text.
            this.victoryVerbs = [
                "annihilates",
                "butchers",
                "crushes",
                "demolishes",
                "destroys",
                "devastates",
                "eliminates",
                "eradicates",
                "erases",
                "exterminates",
                "lays waste to",
                "massacres",
                "mutilates",
                "obliterates",
                "ravages",
                "shatters",
                "slaughters",
                "snuffs out",
                "vaporizes",
                "wrecks"
            ];
        }
    }

    DataController.prototype.getKaiju = function (kaijuName) {
        var kaiju = $.grep(dataController.kaiju, function (k) {
            return k.name === kaijuName;
        });
        return kaiju[0];
    };


    // UI manipulation events
    class UIController {
        constructor() {
            this.selectors = {
                chatInput: "#chat-input",
                chatSendButton: "#chat-send-button",
                chatEntryList: "#chat-entry-list",
                connectButton: "#connect-button",
                opponentCard: "#opponent-card",
                playArea: "#play-area",
                playAreaHeader: "#play-area-header",
                playAreaBody: "#play-area-body",
                playerCard: "#player-card",
                playerKaiju: "#player-card .list-group-item",
                queueButton: "#queue-button",
                userNameInput: "#user-name-input",
                exitGameButton: "#exit-game-button"
            };

            dataController = new DataController();
        }


    }

    UIController.prototype.addChatEntry = function (chatEntry) {
        if (!chatEntry) {
            return;
        }

        var $listEntry = $("<li>")
            .addClass("list-group-item")
            .html(chatEntry.message)
            .prependTo(this.selectors.chatEntryList);

        var badgeType = "badge-";
        if (chatEntry.sourceUserKey === dataController.userKey) {
            badgeType += "primary";
        } else if (chatEntry.sourceUserKey === dataController.systemUserKey) {
            badgeType += "danger";
        } else {
            badgeType += "info";
        }

        $("<span>")
            .addClass("badge badge-pill " + badgeType + " mr-1")
            .html("@" + chatEntry.userName)
            .prependTo($listEntry);
    };

    UIController.prototype.chatInputVal = function () {
        var $chatInput = $(this.selectors.chatInput);

        if (arguments[0] !== undefined) {
            $chatInput.val(arguments[0]);
            return;
        }

        return $chatInput.val().trim();
    }

    UIController.prototype.clearChatWindow = function () {
        $(this.selectors.chatEntryList).empty();
    };

    UIController.prototype.getDOMSelectors = function () {
        return this.selectors;
    };

    UIController.prototype.showPlayArea = function (show) {
        $(this.selectors.playArea).toggleClass("d-none", !show);
    };

    UIController.prototype.toggleLogin = function (connected) {
        var $connectButton = $(this.selectors.connectButton);
        var $queueButton = $(this.selectors.queueButton);
        var $userNameInput = $(this.selectors.userNameInput);
        var $chatSendButton = $(this.selectors.chatSendButton);

        if (connected) {
            $connectButton.text("Disconnect");
            $chatSendButton.prop("disabled", false);
            $queueButton.prop("disabled", false);
            $userNameInput.prop("disabled", true);
        } else {
            $connectButton.text("Connect");
            $chatSendButton.prop("disabled", true);
            $queueButton.prop("disabled", true);
            $userNameInput.prop("disabled", false);
        }
    };

    UIController.prototype.updateGameArea = function (gameInfo, currentPlayerKey) {
        var isPlayer1 = currentPlayerKey === gameInfo.player1Key;
        var isPlayer2 = currentPlayerKey === gameInfo.player2Key;

        // console.log("Updating Game Area.");
        // console.log("Is Player One: " + isPlayer1);
        // console.log("Is Player Two: " + isPlayer2);
        // console.log(gameInfo);
        // console.log(gameInfo.lastUpdatedBy);

        if (!isPlayer1 && !isPlayer2) {
            return;
        }

        var $playArea = $(this.selectors.playArea);

        // update the message bar.
        if (gameInfo.timeLeft > 0) {
            if (!gameInfo.isIntermission) {
                $playArea.find(".card-header h3").text(gameInfo.timeLeft + " seconds left to select your kaiju.");
            } else {
                $playArea.find(".card-header h3").text(gameInfo.timeLeft + " seconds left until the next round begins.");
            }
        } else {
            $playArea.find(".card-header h3").text(gameInfo.message);
        }

        //Update the number of rounds played.
        $playArea.find(".rounds-played").text(gameInfo.roundsPlayed);

        // if the active player is player one use player one's info in the player card and player two's info in the opponent card 
        if (isPlayer1) {

            this.updatePlayerCard({
                playerKaiju: gameInfo.player1Kaiju,
                playerKey: gameInfo.player1Key,
                playerName: gameInfo.player1Name,
                playerScore: gameInfo.player1Score,
                opponentKaiju: gameInfo.player2Kaiju,
                opponentKey: gameInfo.player2Key,
                opponentName: gameInfo.player2Name,
                opponentScore: gameInfo.player2Score
            })
        }

        // if the active player is player two use player two's info in the player card and player one's info in the opponent card 
        if (isPlayer2) {
            this.updatePlayerCard({
                playerKaiju: gameInfo.player2Kaiju,
                playerKey: gameInfo.player2Key,
                playerName: gameInfo.player2Name,
                playerScore: gameInfo.player2Score,
                opponentKaiju: gameInfo.player1Kaiju,
                opponentKey: gameInfo.player1Key,
                opponentName: gameInfo.player1Name,
                opponentScore: gameInfo.player1Score
            })
        }

        this.showPlayArea(true);
    };

    UIController.prototype.updatePlayerCard = function (info) {
        var $playArea = $(this.selectors.playArea);
        var $playerCard = $(this.selectors.playerCard);
        var $opponentCard = $(this.selectors.opponentCard);


        $playerCard.find(".card-title").text(info.playerName);
        $playArea.find(".player-score").text(info.playerScore);
        $playArea.find(".opponent-score").text(info.opponentScore);

        if (info.opponentKey) {
            $opponentCard.find(".card-title").text(info.opponentName);

            if (!info.playerKaiju) {
                $playerCard.find(".player-status").text("Select your kaiju.");
            } else {
                $playerCard.find(".player-status").text(info.playerKaiju.toUpperCase() + "!");
                $playerCard.find(".list-group-item[data-value=\"" + info.playerKaiju + "\"]").addClass("selected");
            }

            if (!info.opponentKaiju) {
                $opponentCard.find(".opponent-status").text("Selecting kaiju.");
            } else {
                $opponentCard.find(".opponent-status").text("Kaiju selected.");
            }

            if (info.opponentKaiju && info.playerKaiju) {
                var kaiju1 = dataController.getKaiju(info.opponentKaiju);
                giphyController.getById(kaiju1.giphyKey, function (response) {
                    $opponentCard.find(".card-img-top")
                        .removeClass("d-none")
                        .attr("src", response.data.images.fixed_width.url);
                });

                var kaiju2 = dataController.getKaiju(info.playerKaiju);
                giphyController.getById(kaiju2.giphyKey, function (response) {
                    $playerCard.find(".card-img-top")
                        .removeClass("d-none")
                        .attr("src", response.data.images.fixed_width.url);
                });

                $opponentCard.find(".opponent-status").text(info.opponentKaiju.toUpperCase() + "!");
                $opponentCard.find(".list-group-item[data-value=\"" + info.opponentKaiju + "\"]").addClass("selected");
                $playArea.find(".kaiju-list").addClass("d-none");

            } else {
                $playArea.find(".card-img-top").addClass("d-none");
                $playArea.find(".kaiju-list").removeClass("d-none");
                $playerCard.find(".list-group-item.selected").removeClass("selected");
            }

            $opponentCard.closest(".col").removeClass("d-none");
        } else {
            $opponentCard.closest(".col").addClass("d-none");
            $playArea.find(".card-img-top").addClass("d-none");
            $playArea.find(".kaiju-list").removeClass("d-none");
            $playerCard.find(".list-group-item.selected").removeClass("selected");
        }
    }

    UIController.prototype.userNameInputVal = function () {
        var $userNameInput = $(this.selectors.userNameInput);

        if (arguments[0] !== undefined) {
            $userNameInput.val(arguments[0]);
            return;
        }

        return $userNameInput.val().trim();
    };

    // Init the controllers.
    var giphyController = new GiphyController("ODSKMiaP8Gm6T6mwa6R28JvwZ42Imlx6", "PG");
    var dataController = new DataController();
    var uiController = new UIController();
    var gameController = new GameController();

    // When the document loads get the ball rolling.
    $(document).ready(function () {
        gameController.init();
    });
})();
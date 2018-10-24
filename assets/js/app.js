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
            // create instances of the other controller classes
            this.ui = new UIController();
            this.data = new DataController();
            this.giphy = new GiphyController("ODSKMiaP8Gm6T6mwa6R28JvwZ42Imlx6", "PG");
        }
    }

    GameController.prototype.addChatEntry = function (message, userOnly) {
        if (!message) {
            return;
        }

        this.data.fb.chatRef.push({
            userName: this.data.userName,
            userKey: this.data.fb.userKey,
            message: message,
            visibleTo: userOnly ? "user" : "all",
            timeStamp: moment().format("X")
        });
    };

    GameController.prototype.connect = function () {
        console.log("Connecting as " + this.data.userName);

        // Update the current user's info.
        this.updateUserInfo(this.data.fb.userKey, {
            name: this.data.userName,
            status: this.data.statuses.online
        })

        this.data.userStatus = this.data.statuses.online;
        this.data.connectedAt = moment().format("X");
        this.ui.toggleLogin(true);
        this.ui.showChatArea(true);
        this.ui.showAlert("Welcome to Kaiju Battle!  Feel free to hang out and chat; or click queue to play.");
    };

    GameController.prototype.createNewGame = function (player1Key, player1Name) {
        // Create a new game.
        var game = this.data.fb.activeGamesRef.push({
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

        this.data.fb.gameKey = game.key;
        game.onDisconnect().remove();
    }

    GameController.prototype.disconnect = function () {
        this.ui.showAlert("Enter a username and hit \"Connect\" to  chat or play.");
        this.data.userStatus = this.data.statuses.offline;

        this.ui.showChatArea(false);
        this.ui.toggleLogin(false);
    };

    GameController.prototype.dequeue = function () {
        this.ui.showAlert("Hit \"Queue\" to begin browsing for a game.");
        this.ui.showPlayArea(false);
    };

    GameController.prototype.getGameInfo = function (key, postback) {
        this.data.fb.activeGamesRef.child(key).once('value').then(function (gameSnap) {
            postback(gameSnap.val());
        });
    };

    GameController.prototype.getGameInfoByPlayerKey = function (key, postback) {
        console.log(key, this.data.fb.activeGamesRef.child(key));
        this.data.fb.activeGamesRef.once('value', function (snapshot) {
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

    GameController.prototype.getKaiju = function (kaijuName) {
        var kaiju = $.grep(this.data.kaiju, function (k) {
            return k.name === kaijuName;
        });
        console.log(kaijuName, kaiju);
        return kaiju;
    };

    GameController.prototype.getRandomVictoryVerb = function () {
        var randomIndex = Math.floor(Math.random() * this.data.victoryVerbs.length);
        return this.data.victoryVerbs[randomIndex];
    };

    GameController.prototype.getUserInfo = function (key, postback) {
        console.log(key, this.data.fb.usersRef.child(key));
        this.data.fb.usersRef.child(key).once('value').then(function (userSnap) {
            postback(userSnap.val());
        });
    };

    GameController.prototype.init = function () {
        // set up the listeners.
        this.setUpListeners();

        // set the game in disconnected mode
        this.dequeue();
        this.disconnect();

        // // iterate through the kaiju and test the GIFs
        // this.data.kaiju().forEach(kaiju => {
        //     this.giphy.getById(kaiju.giphyKey, function (response) {
        //         console.log(kaiju);
        //         console.log(response);
        //     })
        // });
    };

    GameController.prototype.killGame = function (gameKey) {
        this.data.fb.activeGamesRef.child(key).remove();
    };

    GameController.prototype.onChatChildAdded = function (childSnap) {
        var childVal = childSnap.val();
        if (this.data.connectedAt && childVal.timeStamp > this.data.connectedAt) {
            this.ui.addChatEntry(childVal, childVal.userKey === this.data.fb.userKey);
        }
    };

    GameController.prototype.onChatInputKeyUp = function (e) {
        if (e.key === "Enter") {
            this.addChatEntry(this.ui.chatInputVal())
            this.ui.chatInputVal("");
        }
    };

    GameController.prototype.onChatSendButtonClick = function () {
        this.addChatEntry(this.ui.chatInputVal())
        this.ui.chatInputVal("");
    };

    GameController.prototype.onConnectButtonClick = function () {
        console.log("Connect button clicked.")

        this.data.userName = this.ui.userNameInputVal();

        if (!this.data.userName) {
            return;
        }

        if (this.data.userStatus === this.data.statuses.offline) {
            this.connect();
        } else {
            this.disconnect();
        }
    };

    GameController.prototype.onGameChildAdded = function (childSnap) {
        var childVal = childSnap.val();
        this.ui.updateGameArea(childVal, this.data.fb.userKey);
    };

    GameController.prototype.onGameChildChanged = function (childSnap) {
        var childVal = childSnap.val();

        // Only perform game logic if this is the same player who initiated the timer (player 2).
        if (this.data.fb.userKey == childVal.player2Key) {

            console.log("Player 1 Kaiju: " + childVal.player1Kaiju);
            console.log("Player 2 Kaiju: " + childVal.player2Kaiju);

            //if both kaiju are selected stop the time early.
            if (childVal.player1Kaiju && childVal.player2Kaiju) {
                childVal.timeLeft = 0;
            }

            console.log("Time Left: "+  childVal.timeLeft);

            // If the timer is expired, calculate the results.
            if (childVal.timeLeft === 0) {
                // stop the timer and 
                if(this.data.roundTimerInterval) {
                    this.stopRoundTimer(childSnap.key);
                }

                childVal.roundsPlayed++;

                if (childVal.player1Kaiju && !childVal.player2Kaiju) {
                    // player 1 selected a kaiju but player 2 did not.
                    childVal.player1Score++
                    childVal.roundWinner = childVal.player1Key;
                    childVal.message = childVal.player2Name + " was not able to summon a kaiju in time. " + childVal.player1Kaiju + " turns his wrath on the local population.";
                } else if (childVal.player2Kaiju && !childVal.player1Kaiju) {
                    // player 2 selected a kaiju but player 1 did not.
                    childVal.player2Score++
                    childVal.roundWinner = childVal.player2Key;
                    childVal.message = childVal.player1Name + " was not able to summon a kaiju in time. " + childVal.player2Kaiju + " turns his wrath on the local population.";
                } else if (!childVal.player2Kaiju && !childVal.player1Kaiju) {
                    // neither player selected a kaiju.  End the game as the monsters head off into the sunset.
                    childVal.message = "It appears that the kaiju have returned from whence they came.  Peace finally settles upon the land.";
                    childVal.endGame = true;
                } else {
                    // both players selected kaiju. Fetch the kaiju object for player 1 and use it to check for victory.
                    var p1kaiju = this.getKaiju(player1Kaiju);
                    if (p1kaiju.winAgainst.indexOf(childVal.player2Kaiju) !== -1) {
                        // player one's kaiju defeaths player two's kaiju
                        childVal.player1Score++
                        childVal.roundWinner = childVal.player1Key;
                        childVal.message = childVal.player1Kaiju + " " + this.getRandomVictoryVerb() + " " + childVal.player2Kaiju + "!"
                    } else if (p1kaiju.loseAgainst.indexOf(childVal.player2Kaiju) !== -1) {
                        // player two's kaiju defeaths player one's kaiju
                        childVal.player2Score++
                        childVal.roundWinner = childVal.player2Key;
                        childVal.message = childVal.player2Kaiju + " " + this.getRandomVictoryVerb() + " " + childVal.player1Kaiju + "!"
                    } else {
                        // the kaiju are tied.  This is not currently possible (stretch goals for more than three kaiju)
                        childVal.message = childVal.player1Kaiju + " and " + childVal.player2Kaiju + " are evenly matched.  Their battle leaves them both bloody and weakened.  The surrounded area has been reduced to a radioactive wasteland.";
                    }
                }

                childVal.timeLeft = -1;
                // this.updateGameInfo(childSnap.key, childVal);
            }
        }

        this.ui.updateGameArea(childVal, this.data.fb.userKey);
    };

    GameController.prototype.onGameChildRemoved = function (childSnap) {
        var childVal = childSnap.val();
        var isPlayer1 = this.data.fb.userKey === childVal.player1Key;
        var isPlayer2 = this.data.fb.userKey === childVal.player2Key;
        if (!isPlayer1 && !isPlayer2) {
            return;
        }

        // TODO: post game cleanup/notifications.
    };

    GameController.prototype.onKaijuClick = function (event) {

    };

    GameController.prototype.onOnlineStatusChange = function (statusSnap) {
        // If they are connected..
        if (statusSnap.val()) {
            // Add user to the connections list.
            var user = this.data.fb.usersRef.push({
                "name": "Anonymous",
                "status": this.data.statuses.offline
            });
            this.data.fb.userKey = user.key;

            // Remove user from the connection list when they disconnect.
            user.onDisconnect().remove();
        }
    };

    GameController.prototype.onQueueButtonClick = function () {
        console.log("Queue button clicked.")

        if (!this.data.userName) {
            return;
        }

        if (this.data.userStatus !== this.data.statuses.inGame) {
            this.queue();
        } else {
            this.dequeue();
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
                this.killGame(info.key);
            }
        }.bind(this));
    };

    GameController.prototype.queue = function () {
        console.log("Queueing for game as " + this.data.userName);
        this.ui.showAlert("You have been joined to the game queue.  Feel free to chat while you wait.");
        this.startGame(this.data.fb.userKey, this.data.userName);
    };

    GameController.prototype.setUpListeners = function () {
        // Get the DOM selector strings
        var dom = this.ui.getDOMSelectors();

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

        // Listen for activeGames child added
        this.data.fb.activeGamesRef.on("child_added", this.onGameChildAdded.bind(this));

        // Listen for activeGames child changed
        this.data.fb.activeGamesRef.on("child_changed", this.onGameChildChanged.bind(this));

        // Listen for activeGames child removed
        this.data.fb.activeGamesRef.on("child_removed", this.onGameChildRemoved.bind(this));

        // Listen for connection status changes
        this.data.fb.onlineStatusRef.on("value", this.onOnlineStatusChange.bind(this));

        // Listen for users child changed
        this.data.fb.usersRef.on("child_changed", this.onUsersChildChanged.bind(this));

        // Listen for users child removed
        this.data.fb.usersRef.on("child_removed", this.onUsersChildRemoved.bind(this));

        // Listen for chat child added
        this.data.fb.chatRef.on("child_added", this.onChatChildAdded.bind(this));

    };

    GameController.prototype.startGame = function (playerKey, playerName) {

        console.log("Starting Game")
        console.log("Player: " + playerName);

        var gameFound = false;
        this.data.fb.activeGamesRef.once('value', function (snapshot) {
            snapshot.forEach(function (childSnap) {
                gameFound = true;
                var childData = childSnap.val();

                console.log(childData.player1Key);
                console.log(this.data.fb.usersRef.child(childData.player1Key));

                if (!childData.player1Key) {
                    this.killGame(childSnap.key);
                    return;
                }

                this.getUserInfo(childData.player1Key, function (userInfo) {
                    if (userInfo) {
                        if (!childData.player2Key) {
                            // add yourself as player 2 and start the timer.
                            childData.player2Key = playerKey;
                            childData.player2Name = playerName;
                            childData.timeLeft = this.data.baseRoundTime;
                            this.startRoundTimer(childSnap.key);
                            this.updateGameInfo(childSnap.key, childData);
                        } else {
                            this.createNewGame(playerKey, playerName)
                        }
                    } else {
                        this.killGame(childSnap.key);
                    }
                }.bind(this));
            }.bind(this));
        }.bind(this));

        if (!gameFound) {
            console.log(this);

            this.createNewGame(playerKey, playerName);
        }
    };

    GameController.prototype.startRoundTimer = function (gameKey) {
        if (this.data.roundTimerInterval) {
            return;
        }

        this.data.roundTimerInterval = setInterval(function () {
            this.getGameInfo(gameKey, function (gameInfo) {
                if (gameInfo) {
                    gameInfo.timeLeft--;
                    this.updateGameInfo(gameKey, gameInfo);
                } else {
                    this.stopRoundTimer(gameKey)
                };
            }.bind(this));
        }.bind(this), 1000);
    };

    GameController.prototype.stopRoundTimer = function (gameKey) {
        clearInterval(this.data.roundTimerInterval);
        this.data.roundTimerInterval = null;
    };

    GameController.prototype.updateGameInfo = function (key, value) {
        if(!key || !value) {
            return;
        }

        console.log("Updating Game Info.");
        console.log(value);
        value.lastUpdatedBy = this.data.fb.userKey;
        this.data.fb.activeGamesRef.child(key).set(value);
    };

    GameController.prototype.updateUserInfo = function (key, value) {
        this.data.fb.usersRef.child(key).set(value);
    };

    // Game data
    class DataController {
        constructor() {

            // Init Firebase
            firebase.initializeApp({
                apiKey: "AIzaSyALbQQlQf4npQb7ngEPcvgnmMUVs_yhH2I",
                authDomain: "kaiju-rps-multiplayer.firebaseapp.com",
                databaseURL: "https://kaiju-rps-multiplayer.firebaseio.com",
                projectId: "kaiju-rps-multiplayer",
                storageBucket: "kaiju-rps-multiplayer.appspot.com",
                messagingSenderId: "229244481231"
            });

            // firebase container
            this.fb = {
                database: firebase.database(),
            };

            this.fb.onlineStatusRef = this.fb.database.ref(".info/connected");
            this.fb.usersRef = this.fb.database.ref("/presence/users");
            this.fb.activeGamesRef = this.fb.database.ref("/activeGames");
            this.fb.chatRef = this.fb.database.ref("/chat");


            // End Firebase


            // local data

            this.statuses = {
                idle: "idle",
                inGame: "in-game",
                offline: "offline",
                online: "online",
            };

            this.roundTimerInterval;
            this.systemUserName = "Kaiju Battle";
            this.userName = "Anonymous";
            this.userStatus = "idle";
            this.baseRoundTime = 20;
            this.baseintermissionTime = 10;

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
                    giphyKey: "12Ek91HBQ4khAA",
                    winAgainst: ["Mothra"],
                    loseAgainst: ["Godzilla"],
                },
                {
                    name: "Mothra",
                    giphyKey: "NchdLTjAjcbhC",
                    winAgainst: ["Godzilla"],
                    loseAgainst: ["King Ghidorah"],
                }
            ];

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

            // end local data




        }
    }

    // UI manipulation events
    class UIController {
        constructor() {
            this.selectors = {
                alertArea: "#alert-area",
                chatArea: "#chat-area",
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
                userNameInput: "#user-name-input"
            }
        }
    }

    UIController.prototype.addChatEntry = function (chatEntry, isCurrentUser) {
        var $listEntry = $("<li>")
            .addClass("list-group-item")
            .html(chatEntry.message)
            .appendTo(this.selectors.chatEntryList);

        $("<span>")
            .addClass("badge badge-" + (isCurrentUser ? "primary" : "info") + " mr-1")
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

    UIController.prototype.getDOMSelectors = function () {
        return this.selectors;
    };

    UIController.prototype.hideAlerts = function () {
        $(".alert").alert("close");
    };

    UIController.prototype.showAlert = function (text) {
        this.hideAlerts();

        var $alert = $("<div>")
            .attr({
                class: "alert alert-info my-2 text-center show fade",
                role: "alert"
            })
            .text(text)
            .appendTo(this.selectors.alertArea);

        setTimeout(function () {
            $alert.alert("close");
        }.bind(this), 3000);
    };

    UIController.prototype.showChatArea = function (show) {
        $(this.selectors.chatArea).toggleClass("d-none", !show);
    };

    UIController.prototype.showPlayArea = function (show) {
        $(this.selectors.playArea).toggleClass("d-none", !show);
    };

    UIController.prototype.toggleLogin = function (connected) {
        var $connectButton = $(this.selectors.connectButton);
        var $queueButton = $(this.selectors.queueButton);
        var $userNameInput = $(this.selectors.userNameInput);

        if (connected) {
            console.log("You are online.")
            $connectButton.text("Disconnect");
            $queueButton.prop("disabled", false);
            $userNameInput.prop("disabled", true);
        } else {
            console.log("You are offline.")
            $connectButton.text("Connect");
            $queueButton.prop("disabled", true);
            $userNameInput.prop("disabled", false);
        }
    };

    UIController.prototype.updateGameArea = function (gameInfo, currentPlayerKey) {
        var isPlayer1 = currentPlayerKey === gameInfo.player1Key;
        var isPlayer2 = currentPlayerKey === gameInfo.player2Key;

        console.log("Updating Game Area.");
        console.log("Is Player One: " + isPlayer1);
        console.log("Is Player Two: " + isPlayer2);
        console.log(gameInfo);
        console.log(gameInfo.lastUpdatedBy);

        if (!isPlayer1 && !isPlayer2) {
            return;
        }

        var $playArea = $(this.selectors.playArea);
        var $playerCard = $(this.selectors.playerCard);
        var $opponentCard = $(this.selectors.opponentCard);

        // update the message bar.
        if (gameInfo.timeLeft > 0) {
            if (!gameInfo.isIntermission) {
                $playArea.find(".card-header h3").text(gameInfo.timeLeft + " seconds left to select your kaiju.");
            } else {
                $playArea.find(".card-header h3").text(gameInfo.timeLeft + " seconds left until the next round begins.");
            }
        } else if (gameInfo.timeLeft === 0) {
            $playArea.find(".card-header h3").text("Time's up!");
        } else {
            $playArea.find(".card-header h3").text(gameInfo.message);
        }

        //Update the number of rounds played.
        $playArea.find(".rounds-played").text(gameInfo.player1Score);

        // if the active player is player one use player one's info in the player card and player two's info in the opponent card 
        if (isPlayer1) {
            $playerCard.find(".card-title").text(gameInfo.player1Name);
            $playArea.find(".player-score").text(gameInfo.player1Score);
            $playArea.find(".opponent-score").text(gameInfo.player2Score);

            // If there is a second player, show their card and populate both cards.
            if (gameInfo.player2Key) {
                $opponentCard.find(".card-title").text(gameInfo.player2Name);

                if (!gameInfo.player1Kaiju) {
                    $playerCard.find(".player-status").text("Select your kaiju.");
                } else {
                    $playerCard.find(".player-status").text(gameInfo.player1Kaiju + " selected.");
                }

                if (!gameInfo.player2Kaiju) {
                    $playerCard.find(".opponent-status").text("Selecting kaiju.");
                } else {
                    if (gameInfo.player1Kaiju) {
                        $playerCard.find(".opponent-status").text(gameInfo.player2Kaiju + " selected.");
                    } else {
                        $playerCard.find(".opponent-status").text("Kaiju selected.");
                    }
                }

                $opponentCard.closest(".col").removeClass("d-none");
            } else {
                $opponentCard.closest(".col").addClass("d-none");
            }
        }

        // if the active player is player two use player two's info in the player card and player one's info in the opponent card 
        if (isPlayer2) {
            $playerCard.find(".card-title").text(gameInfo.player2Name);
            $playArea.find(".player-score").text(gameInfo.player2Score);
            $playArea.find(".opponent-score").text(gameInfo.player1Score);

            if (gameInfo.player1Key) {
                $opponentCard.find(".card-title").text(gameInfo.player1Name);

                if (!gameInfo.player2Kaiju) {
                    $playerCard.find(".player-status").text("Select your kaiju.");
                } else {
                    $playerCard.find(".player-status").text(gameInfo.player2Kaiju + " selected.");
                }

                if (!gameInfo.player1Kaiju) {
                    $playerCard.find(".opponent-status").text("Selecting kaiju.");
                } else {
                    if (gameInfo.player2Kaiju) {
                        $playerCard.find(".opponent-status").text(gameInfo.player1Kaiju + " selected.");
                    } else {
                        $playerCard.find(".opponent-status").text("Kaiju selected.");
                    }
                }

                $opponentCard.closest(".col").removeClass("d-none");
            } else {
                $opponentCard.closest(".col").addClass("d-none");
            }
        }

        this.showPlayArea(true);
    };

    UIController.prototype.userNameInputVal = function () {
        console.log(this);

        var $userNameInput = $(this.selectors.userNameInput);

        if (arguments[0] !== undefined) {
            $userNameInput.val(arguments[0]);
            return;
        }

        return $userNameInput.val().trim();
    };

    // When the document loads get the ball rolling.
    $(document).ready(function () {
        var gameController = new GameController();
        gameController.init();
    });
})();
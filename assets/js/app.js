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

    GameController.prototype.getUserInfo = function (key, postback) {
        console.log(key, this.data.fb.usersRef.child(key));
        this.data.fb.usersRef.child(key).once('value').then(function (userSnap) {
            postback(userSnap.val());
        });
    };

    GameController.prototype.killGame = function (gameKey) {
        this.data.fb.activeGamesRef.child(key).remove();
    };

    GameController.prototype.onChatChildAdded = function (childSnap) {
        var childVal = childSnap.val();
        if (this.data.connectedAt && childVal.timeStamp > this.data.connectedAt) {
            this.ui.addChatEntry(childVal, childVal.userKey === this.data.fb.userKey);
        }
    }

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
    }

    GameController.prototype.onGameChildChanged = function (childSnap) {
        var childVal = childSnap.val();
        this.ui.updateGameArea(childVal, this.data.fb.userKey);
    }

    GameController.prototype.onGameChildRemoved = function (childSnap) {
        var childVal = childSnap.val();
        // TODO: Stuff
    }

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

        // // Iterate through the other children and see if any are waiting for a game and don't have an opponent set.
        // if (!childData.opponentKey
        //     && childSnap.key === this.data.fb.userKey
        //     && childData.status === this.data.statuses.waitingForGame) {

        //     this.data.fb.usersRef.once('value', function (snapshot) {
        //         snapshot.forEach(function (otherChildSnap) {
        //             var otherChildData = otherChildSnap.val();

        //             // if we find another user waiting for a game. grab their key, 
        //             // then update both users statuses to inGame and start the game.
        //             if (!otherChildData.opponentKey
        //                 && otherChildSnap.key !== childSnap.key
        //                 && otherChildData.status === this.data.statuses.waitingForGame) {


        //                 // update opponent
        //                 otherChildData.opponentKey = childSnap.key;
        //                 this.updateUserInfo(otherChildSnap.key, otherChildData);

        //                 // update current child
        //                 childData.opponentKey = otherChildSnap.key;
        //                 this.updateUserInfo(childSnap.key, childData);

        //                 this.startGame(childSnap.key, otherChildSnap.key);
        //             }


        //         }.bind(this));
        //     }.bind(this));
        // }
    }

    GameController.prototype.onUsersChildRemoved = function (childSnap) {
        // TODO: cleanup up game and notify any remaining players.
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
        console.log(this);

        console.log("Starting Game")
        console.log("Player: " + playerName);

        this.data.fb.activeGamesRef.once('value', function (snapshot) {
            snapshot.forEach(function (childSnap) {
                var childData = childSnap.val();

                console.log(childData.player1Key);
                console.log(this.data.fb.usersRef.child(childData.player1Key));

                if(!childData.player1Key) {
                    this.killGame(childSnap.key);
                    return;
                }

                this.getUserInfo(childData.player1Key, function (userInfo) {
                    if (userInfo) {
                        if (!childData.player2Key) {
                            childData.player2Key = playerKey;
                            childData.player2Name = playerName;
                            this.updateGameInfo(childSnap.key, childData);
                        } else {
                            this.data.fb.gameKey = this.data.fb.activeGamesRef.push({
                                player1Key: playerKey,
                                player1Name: playerName,
                                player2Key: "",
                                player2Name: "",
                                player1Score: 0,
                                player2Score: 0,
                                player1Kaiju: 0,
                                player2Kaiju: 0,
                                timeLeft: 30
                            });
                        }
                    } else {
                        this.killGame(childSnap.key);
                    }
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    GameController.prototype.updateGameInfo = function (key, value) {
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

            this.systemUserName = "Kaiju Battle";
            this.userName = "Anonymous";
            this.userStatus = "idle";

            // Define the kaiju
            // using arrays for win against/lose to so I can expand the number of kaiju beyond 3 at a later date. #goals
            this.kaiju = [
                {
                    name: "Godzilla",
                    giphyKey: "JeiW04NqNARKo",
                    winAgainst: ["Mothra"],
                    loseAgainst: ["Ghidorah"],
                },
                {
                    name: "King Ghidorah",
                    giphyKey: "Sj0JjNpkLCYJG",
                    winAgainst: ["Godzilla"],
                    loseAgainst: ["Mothra"],
                },
                {
                    name: "Mothra",
                    giphyKey: "NchdLTjAjcbhC",
                    winAgainst: ["King Ghidorah"],
                    loseAgainst: ["Godzilla"],
                }
            ]


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
        var $alert = $(".alert");
        if (!$alert.exists()) {
            $("<div>")
                .attr({
                    class: "alert alert-info my-2 text-center show fade",
                    role: "alert"
                })
                .text(text)
                .appendTo(this.selectors.alertArea);
        } else {
            $alert.text(text);
        }
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

        if (!isPlayer1 && !isPlayer2) {
            return;
        }

        var $playerCard = $(this.selectors.playerCard);
        var $opponentCard = $(this.selectors.opponentCard);

        if (isPlayer1) {
            $playerCard.find(".card-title").text(gameInfo.player1Name);
            $playerCard.find(".player-score").text(gameInfo.player1Score);

            if (gameInfo.player2Key) {
                $opponentCard.find(".card-title").text(gameInfo.player2Name);
                $opponentCard.find(".player-score").text(gameInfo.player2Score);

                if (!gameInfo.player1Kaiju) {
                    $playerCard.find(".player-status").text("Select your kaiju.");
                } else {
                    $playerCard.find(".player-status").text(gameInfo.player1Kaiju + " selected.");
                }

                if (!gameInfo.player2Kaiju) {
                    $playerCard.find(".opponent-status").text("Selecting kaiju.");
                } else {
                    $playerCard.find(".opponent-status").text(gameInfo.player2Kaiju + " selected.");
                }

                $opponentCard.closest(".col").removeClass("d-none");
            } else {
                $opponentCard.closest(".col").addClass("d-none");
            }
        }

        if (isPlayer2) {
            $playerCard.find(".card-title").text(gameInfo.player2Name);
            $playerCard.find(".player-score").text(gameInfo.player2Score);


            if (gameInfo.player1Key) {
                $opponentCard.find(".card-title").text(gameInfo.player1Name);
                $opponentCard.find(".player-score").text(gameInfo.player1Score);

                if (!gameInfo.player2Kaiju) {
                    $playerCard.find(".player-status").text("Select your kaiju.");
                } else {
                    $playerCard.find(".player-status").text(gameInfo.player2Kaiju + " selected.");
                }

                if (!gameInfo.player1Kaiju) {
                    $playerCard.find(".opponent-status").text("Selecting kaiju.");
                } else {
                    $playerCard.find(".opponent-status").text(gameInfo.player1Kaiju + " selected.");
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
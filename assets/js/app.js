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


    // Game logic methods and events
    class GameController {
        constructor() {
            // create instances of the other controller classes
            this.ui = new UIController();
            this.data = new DataController();
            this.giphy = new GiphyController("ODSKMiaP8Gm6T6mwa6R28JvwZ42Imlx6", "PG");
        }
    }

    function init() {

    }

    GameController.prototype.init = function () {
        // set up the listeners.
        this.setUpListeners();

        // set the game in disconnected mode
        this.disconnect();

        // // iterate through the kaiju and test the GIFs
        // this.data.kaiju().forEach(kaiju => {
        //     this.giphy.getById(kaiju.giphyKey, function (response) {
        //         console.log(kaiju);
        //         console.log(response);
        //     })
        // });
    };

    GameController.prototype.disconnect = function () {
        this.ui.showAlert("Enter a username and hit \"Join Game\" to begin browsing for a game.");
        this.ui.toggleLogin("", true);
    };

    GameController.prototype.connect = function () {
        console.log("Joining game as " + this.data.userName);

        // Update the current user's info.
        this.updateUserInfo(this.data.fb.userKey, {
            name: this.data.userName, status: this.data.statuses.waitingForGame
        })

        this.data.connectedAt = moment().format("X");
        this.ui.userNameInputVal("");
        this.ui.toggleLogin(this.data.userName, false);
        this.ui.showChatArea(true);
        this.ui.hideAlerts();
        this.ui.showAlert("You have been joined to the game queue.  Feel free to chat while you wait.");
    };

    GameController.prototype.setUpListeners = function () {
        // Connect Button Click
        var dom = this.ui.getDOMSelectors();
        $(dom.connectButton).on("click", this.onConnectButtonClick.bind(this));

        // Chat Send button click
        $(dom.chatSendButton).on("click", this.onChatSendButtonClick.bind(this));

        // Chat Input Key Up
        $(dom.chatInput).on("keyup", this.onChatInputKeyUp.bind(this));

        // Listen for connection status changes
        this.data.fb.onlineStatusRef.on("value", this.onOnlineStatusChange.bind(this));

        // Listen for users children change
        this.data.fb.usersRef.on("child_changed", this.onUsersChildChanged.bind(this));

        // Listen for users children removed
        this.data.fb.usersRef.on("child_removed", this.onUsersChildRemoved.bind(this));

        // Listen for chat children added.
        this.data.fb.chatRef.on("child_added", this.onChatChildAdded.bind(this));

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
        console.log("Join button clicked.")

        this.data.userName = this.ui.userNameInputVal();

        if (!this.data.userName) {
            return;
        }

        this.connect();
    };

    GameController.prototype.onOnlineStatusChange = function (statusSnap) {
        // If they are connected..
        if (statusSnap.val()) {
            console.log("User is connected.")

            // Add user to the connections list.
            var user = this.data.fb.usersRef.push({
                "name": "Anonymous",
                "status": this.data.statuses.idle
            });
            this.data.fb.userKey = user.key;

            // Remove user from the connection list when they disconnect.
            user.onDisconnect().remove();
        }
    };

    GameController.prototype.onUsersChildRemoved = function (childSnap) {
        // TODO: cleanup up game and notify any remaining player.
    };

    GameController.prototype.onUsersChildChanged = function (childSnap) {
        var childData = childSnap.val();

        // Iterate through the other children and see if any are waiting for a game and don't have an opponent set.
        if (!childData.opponentKey
            && childSnap.key === this.data.fb.userKey
            && childData.status === this.data.statuses.waitingForGame) {

            this.data.fb.usersRef.once('value', function (snapshot) {
                snapshot.forEach(function (otherChildSnap) {
                    var otherChildData = otherChildSnap.val();

                    // if we find another user waiting for a game. grab their key, 
                    // then update both users statuses to inGame and start the game.
                    if (!otherChildData.opponentKey
                        && otherChildSnap.key !== childSnap.key
                        && otherChildData.status === this.data.statuses.waitingForGame) {


                        // update opponent
                        otherChildData.opponentKey = childSnap.key;
                        this.updateUserInfo(otherChildSnap.key, otherChildData);

                        // update current child
                        childData.opponentKey = otherChildSnap.key;
                        this.updateUserInfo(childSnap.key, childData);

                        this.startGame(childSnap.key, otherChildSnap.key);
                    }


                }.bind(this));
            }.bind(this));
        }
    }

    GameController.prototype.onChatChildAdded = function (childSnap) {
        var childVal = childSnap.val();

        console.log(childVal.userKey, this.data.fb.userKey, childVal.userKey === this.data.fb.userKey)

        if (this.data.connectedAt && childVal.timeStamp > this.data.connectedAt) {
            this.ui.addChatEntry(childVal, childVal.userKey === this.data.fb.userKey);
        }
    }

    GameController.prototype.startGame = function (player1key, player2key) {
        console.log(this);

        console.log("Starting Game")
        console.log("Player1", player1key);
        console.log("Player2", player2key);

        var gameKey = this.data.fb.activeGamesRef.push({
            player1key: player1key,
            player2key: player2key,
            player1Score: 0,
            player2Score: 0,
            player1Kaiju: 0,
            player2Kaiju: 0,
            timeLeft: 30
        })
    };

    GameController.prototype.getUserInfo = function (key, postback) {
        console.log(key, this.data.fb.usersRef.child(key));
        this.data.fb.usersRef.child(key).once('value').then(function (userSnap) {
            postback(userSnap.val());
        });
    };


    GameController.prototype.updateUserInfo = function (key, value) {
        this.data.fb.usersRef.child(key).set(value);
    };

    GameController.prototype.updateGameInfo = function (key, value) {
        this.data.fb.activeGamesRef.child(key).set(value);
    };

    GameController.prototype.addChatEntry = function (message) {
        if (!message) {
            return;
        }

        this.data.fb.chatRef.push({
            userName: this.data.userName,
            userKey: this.data.fb.userKey,
            message: message,
            timeStamp: moment().format("X")
        });
    }

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
                waitingForGame: "waitingForGame",
                inGame: "inGame"
            };

            this.systemUserName = "Kaiju Battle"

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
                connectButton: "#join-button",
                playArea: "#play-area",
                playAreaHeader: "#play-area-header",
                playAreaBody: "#play-area-body",
                resultsArea: "#results-area",
                resultsAreaHeader: "#results-area-header",
                resultsAreaBody: "#results-area-body",
                scoresArea: "#scores-area",
                scoresAreaBody: "#scores-area-body",
                usernameDisplay: "#username-display",
                usernameInput: "#username-input"
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

    UIController.prototype.getDOMSelectors = function () {
        return this.selectors;
    };

    UIController.prototype.chatInputVal = function () {
        var dom = this.getDOMSelectors();
        var $chatInput = $(dom.chatInput);

        if (arguments[0] !== undefined) {
            $chatInput.val(arguments[0]);
            return;
        }

        return $chatInput.val().trim();
    }

    UIController.prototype.userNameInputVal = function () {
        var dom = this.getDOMSelectors();
        var $userNameInput = $(dom.usernameInput);

        if (arguments[0] !== undefined) {
            $userNameInput.val(arguments[0]);
            return;
        }

        return $userNameInput.val().trim();
    }


    UIController.prototype.hideAlerts = function () {
        $(".alert").alert("close");
    };

    UIController.prototype.showAlert = function (text) {
        $("<div>")
            .attr({
                class: "alert alert-info my-2 text-center show fade",
                role: "alert"
            })
            .text(text)
            .appendTo(this.selectors.alertArea);
    };

    UIController.prototype.showChatArea = function (show) {
        $(this.selectors.chatArea).toggleClass("d-none", !show);
    }

    UIController.prototype.toggleLogin = function (userName, show) {
        var dom = this.getDOMSelectors();
        var $userNameInput = $(dom.usernameInput);
        var $userNameDisplay = $(dom.usernameDisplay);
        $userNameInput.closest(".input-group").toggleClass("d-none", !show);
        $userNameDisplay.text(userName);
        $userNameDisplay.closest(".navbar-text").toggleClass("d-none", show);
    }

    // When the document loads get the ball rolling.
    $(document).ready(function () {
        var gameController = new GameController();
        gameController.init();
    });
})();
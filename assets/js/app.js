/* Notes:

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

    // Controller for chat functionality
    class ChatController {
        constructor() {

        }
    };

    // UI manipulation events
    class UIController {
        constructor() { }
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
            .appendTo("#alert-area");
    };


    // Game data
    class DataController {
        constructor(config) {
            // init firebase
            firebase.initializeApp(config);

            this.database = firebase.database();

            // internal data
            this._data = {
                // the player objects will look like this { id: "<player id>", name: "<player name>", wins: 0 }
                currentPlayers: [],
                // Define the kaiju
                // using arrays for win against/lose to so I can expand the number of kaiju beyond 3 at a later date. #goals
                kaiju: [
                    {
                        name: "Godzilla",
                        giphyKey: "JeiW04NqNARKo",
                        winAgainst: ["Mecha-Godzilla"],
                        loseAgainst: ["Ghidorah"],
                    },
                    {
                        name: "King Ghidorah",
                        giphyKey: "Sj0JjNpkLCYJG",
                        winAgainst: ["Godzilla"],
                        loseAgainst: ["Mecha-Godzilla"],
                    },
                    {
                        name: "Mecha-Godzilla",
                        giphyKey: "",
                        winAgainst: ["King Ghidorah"],
                        loseAgainst: ["Godzilla"],
                    }
                ]
            };
        }
    }

    DataController.prototype.getKaiju = function() {
        return this._data.kaiju;
    }

    // Game logic methods and events
    class GameController {
        constructor() {
            this.ui = new UIController();
            this.chat = new ChatController();
            this.data = new DataController({
                apiKey: "AIzaSyALbQQlQf4npQb7ngEPcvgnmMUVs_yhH2I",
                authDomain: "kaiju-rps-multiplayer.firebaseapp.com",
                databaseURL: "https://kaiju-rps-multiplayer.firebaseio.com",
                projectId: "kaiju-rps-multiplayer",
                storageBucket: "kaiju-rps-multiplayer.appspot.com",
                messagingSenderId: "229244481231"
            });
            this.giphy = new GiphyController("ODSKMiaP8Gm6T6mwa6R28JvwZ42Imlx6", "PG");
        }
    }

    GameController.prototype.init = function () {
        // set the game in disconnected mode
        this.disconnect();

        var test;
        this.data.getKaiju().forEach(kaiju => {
            this.giphy.getById(kaiju.giphyKey, function(response){
                console.log(kaiju);
                console.log(response);
            })
        });
    };

    GameController.prototype.disconnect = function () {
        this.ui.showAlert("Enter a username and hit connect to begin browsing for a game.");
    };

    GameController.prototype.connect = function () {

    };

    GameController.prototype.onConnect = function () {

    };

    $(document).ready(function(){
        var gameController = new GameController();
        gameController.init();
    });
})();
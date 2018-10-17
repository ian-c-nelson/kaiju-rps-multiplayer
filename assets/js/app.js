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

    // Game logic methods and events
    var gameController = {

        giphy: new GiphyController("ODSKMiaP8Gm6T6mwa6R28JvwZ42Imlx6")
    };

    // Controller for chat functionality
    var chatController = {

    };

    // UI manipulation events
    var uiController {

    }

    // Game data
    var gameData = {
        // the player objects will look like this { id: "<player id>", name: "<player name>", wins: 0 }
        currentPlayers: [

        ],

        // Define the kaiju and make them function like Rock/Paper/Scissors
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
            }
            ,
            {
                name: "Mecha-Godzilla",
                giphyKey: "",
                winAgainst: ["King Ghidorah"],
                loseAgainst: ["Godzilla"],
            }
        ]
    }
})();
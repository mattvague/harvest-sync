"use strict"

let Promise = require("promise")
let prompt = require("prompt")

module.exports = function(actions) {
    return new Promise((resolve, reject) => {
        let schema = {
            properties: {
                confirmed: {
                    type: "string",
                    description: "Do you want to perform these actions (Yes/No)?",
                    pattern: /^yes|no$/i,
                    message: "Please enter Yes or No.",
                    required: true
                }
            }
        }

        prompt.start()

        prompt.get(schema, (err, result) => {
            console.log("") // blank line after the confirm
            if(err) reject()
            else if(result.confirmed.toLowerCase() === "yes") resolve(actions)
            else reject()
        })
    })
}
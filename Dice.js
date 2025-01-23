const crypto = require('crypto');

// Dice class
class Dice {
    constructor(values) {
        if (!values.every(Number.isInteger) || values.length !== 6) {
            throw new Error("Each dice must have exactly six integer values.");
        }
        this.values = values;
    }

    roll() {
        return this.values[crypto.randomInt(this.values.length)];
    }
}

// Shuffle function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Game logic
class NonTransitiveDiceGame {
    constructor(diceConfigs) {
        if (diceConfigs.length < 3) {
            throw new Error("At least three dice configurations are required.");
        }
        this.dice = diceConfigs.map(config => new Dice(config.split(',').map(Number)));
    }

    start() {
        console.log("\nWelcome to the Non-Transitive Dice Game!");
        console.log("Let's determine who gets to select their dice first.");

        this.determineFirstMove();
    }

    determineFirstMove() {
        const hmacKey = crypto.randomBytes(32).toString('hex');
        const computerChoice = crypto.randomInt(2);
        const hmac = crypto
            .createHmac('sha256', hmacKey)
            .update(computerChoice.toString())
            .digest('hex');

        console.log(`I selected a random value in the range 0..1 (HMAC=${hmac}).`);
        console.log("Try to guess my selection.");
        console.log("0 - 0");
        console.log("1 - 1");
        console.log("X - exit");
        console.log("? - help");

        process.stdin.once('data', (data) => {
            const input = data.toString().trim();

            if (input === 'X') {
                console.log("Goodbye!");
                process.exit(0);
            } else if (input === '?') {
                this.showHelp();
                return;
            }

            const userGuess = parseInt(input, 10);
            if (isNaN(userGuess) || userGuess < 0 || userGuess > 1) {
                console.log("Invalid selection. Try again.");
                return this.determineFirstMove();
            }

            console.log(`My selection: ${computerChoice} (KEY=${hmacKey}).`);

            if (userGuess === computerChoice) {
                console.log("\nYou guessed correctly! You get to choose your dice first.");
                this.userSelectDice();
            } else {
                console.log("\nYou guessed wrong. I get to choose my dice first.");
                this.computerSelectDice();
            }
        });
    }

    computerSelectDice() {
        this.computerDice = this.dice[crypto.randomInt(this.dice.length)];
        console.log(`I choose the dice: [${this.computerDice.values.join(',')}].`);
        this.dice = this.dice.filter(d => d !== this.computerDice);
        this.userSelectDice();
    }

    userSelectDice() {
        console.log("\nChoose your dice:");

        this.dice.forEach((dice, index) => {
            console.log(`${index} - ${dice.values.join(", ")}`);
        });

        console.log("X - exit\n? - help");

        process.stdin.once('data', (data) => {
            const input = data.toString().trim();
            if (input === 'X') {
                console.log("Goodbye!");
                process.exit(0);
            } else if (input === '?') {
                this.showHelp();
                return;
            }

            const userSelection = parseInt(input, 10);
            if (isNaN(userSelection) || userSelection < 0 || userSelection >= this.dice.length) {
                console.log("Invalid selection. Try again.");
                return this.userSelectDice();
            }

            this.userDice = this.dice[userSelection];
            console.log(`You choose the dice: [${this.userDice.values.join(',')}]`);
            this.dice.splice(userSelection, 1);

            this.userThrow();
        });
    }

    userThrow() {
        console.log("\nIt's time for your throw.");
        const shuffledUserNumbers = shuffleArray([0, 1, 2, 3, 4, 5]);
        shuffledUserNumbers.forEach((num, index) => {
            console.log(`${index} - ${num}`);
        });

        console.log("Choose your roll (0-5):");

        process.stdin.once('data', (data) => {
            const input = parseInt(data.toString().trim(), 10);
            if (isNaN(input) || input < 0 || input > 5) {
                console.log("Invalid selection. Try again.");
                return this.userThrow();
            }

            this.userRoll = shuffledUserNumbers[input];
            console.log(`You selected: ${this.userRoll}`);

            this.computerThrow();
        });
    }

    computerThrow() {
        console.log("\nIt's time for my throw.");
        const shuffledComputerNumbers = shuffleArray([0, 1, 2, 3, 4, 5]);
        shuffledComputerNumbers.forEach((num, index) => {
            console.log(`${index} - ${num}`);
        });

        console.log("Select a number (0-5) to determine my roll:");

        process.stdin.once('data', (data) => {
            const input = parseInt(data.toString().trim(), 10);
            if (isNaN(input) || input < 0 || input > 5) {
                console.log("Invalid selection. Try again.");
                return this.computerThrow();
            }

            this.computerRoll = shuffledComputerNumbers[input];
            console.log(`I selected: ${this.computerRoll}`);

            this.checkWinner();
        });
    }

    checkWinner() {
        const userDiceRoll = this.userDice.values[this.userRoll];
        const computerDiceRoll = this.computerDice.values[this.computerRoll];

        console.log(`\nYour dice roll is: ${userDiceRoll}`);
        console.log(`My dice roll is: ${computerDiceRoll}`);

        if (userDiceRoll > computerDiceRoll) {
            console.log("\nYou win!");
        } else if (userDiceRoll < computerDiceRoll) {
            console.log("\nI win!");
        } else {
            console.log("\nIt's a tie!");
        }

        this.playAgain();
    }

    playAgain() {
        console.log("\nDo you want to play again? (Y/N)");
        process.stdin.once('data', (data) => {
            const input = data.toString().trim().toUpperCase();
            if (input === 'Y') {
                this.start();
            } else {
                console.log("Goodbye!");
                process.exit(0);
            }
        });
    }

    showHelp() {
        console.log("\nHelp:");
        console.log("This is a non-transitive dice game where you and the computer select dice and roll to compete.");
        console.log("Each dice has six values, and the winner is determined based on the rolls.");
        console.log("You select your roll from a shuffled list of numbers (0-5), and the computer does the same.");
        console.log("Good luck!");
        this.start();
    }
}

// Main Execution
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error("Error: You must provide at least 3 dice configurations (e.g., 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3).");
    process.exit(1);
}

try {
    const game = new NonTransitiveDiceGame(args);
    game.start();
} catch (error) {
    console.error(`Error: ${error.message}`);
}

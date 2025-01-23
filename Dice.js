const crypto = require('crypto');


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


class FairRandomGenerator {
    constructor(range) {
        this.range = range;
        this.key = crypto.randomBytes(32);
    }

    generateNumber() {
        const number = crypto.randomInt(this.range);
        const hmac = crypto.createHmac('sha3-256', this.key).update(number.toString()).digest('hex');
        return { number, hmac };
    }

    revealKey() {
        return this.key.toString('hex');
    }
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}


class NonTransitiveDiceGame {
    constructor(diceConfigs) {
        if (diceConfigs.length < 3) {
            throw new Error("At least three dice configurations are required.");
        }
     
        this.originalDiceConfigs = diceConfigs;
        this.dice = diceConfigs.map(config => new Dice(config.split(',').map(Number)));
    }

    start() {
        console.log("\nWelcome to the Non-Transitive Dice Game!");

      

        const firstMoveGenerator = new FairRandomGenerator(2);
        const firstMoveData = firstMoveGenerator.generateNumber();

        console.log("\nLet's determine who makes the first move.");
        console.log(`I selected a random value in the range 0..1 (HMAC=${firstMoveData.hmac}).`);
        console.log("Try to guess my selection.");
        console.log("0 - 0\n1 - 1\nX - exit\n? - help");

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
                console.log("Invalid input. Try again.");
                return this.start();
            }

            const computerSelection = firstMoveData.number;
            const key = firstMoveGenerator.revealKey();
            console.log(`My selection: ${computerSelection} (KEY=${key}).`);

            if (userGuess === computerSelection) {
                console.log("\nYou guessed correctly! You make the first move.");
                this.userSelectDice();
            } else {
                console.log("\nI make the first move.");
                this.computerSelectDice();
            }
        });
    }

    userSelectDice() {
      
        shuffleArray(this.dice);
        console.log("\nI make the first move and choose the dice. Choose your dice:");

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
            this.computerDice = this.dice[crypto.randomInt(this.dice.length)];
            console.log(`I choose the dice: [${this.computerDice.values.join(',')}]`);

            this.performThrows();
        });
    }

    computerSelectDice() {
        const computerChoice = crypto.randomInt(this.dice.length);
        this.computerDice = this.dice[computerChoice];
        console.log(`I choose the dice: [${this.computerDice.values.join(',')}]`);

        this.dice.splice(computerChoice, 1);
        this.userSelectDice();
    }

    performThrows() {
        console.log("\nIt's time for my throw.");

        const throwGenerator = new FairRandomGenerator(6);
        const throwData = throwGenerator.generateNumber();

        console.log(`I selected a random value in the range 0..5 (HMAC=${throwData.hmac}).`);
        console.log("Add your number modulo 6.");
        console.log("0 - 0\n1 - 1\n2 - 2\n3 - 3\n4 - 4\n5 - 5\nX - exit\n? - help");

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
            if (isNaN(userSelection) || userSelection < 0 || userSelection > 5) {
                console.log("Invalid selection. Try again.");
                return this.performThrows();
            }

            const userThrow = (userSelection + throwData.number) % 6;
            console.log(`Your selection: ${userSelection}`);
            console.log(`My selection (modulo 6): ${userThrow}`);

            this.checkWinner(userThrow);
        });
    }

    checkWinner(userThrow) {
        const computerThrow = this.computerDice.roll();
        console.log(`My roll is: ${computerThrow}`);

        if (userThrow > computerThrow) {
            console.log("\nYou win!");
        } else if (userThrow < computerThrow) {
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
        
                this.dice = this.originalDiceConfigs.map(config => new Dice(config.split(',').map(Number)));
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
        console.log("To ensure fairness, dice are selected and throws are generated using cryptographic randomness.");
        console.log("After selecting your dice, you roll them, and the results are compared.");
        console.log("You can choose the dice by selecting a number from 0..5 after they have been shuffled.");
        this.start();
    }
}


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

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

// Fair Random Generator
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

// Calculate probabilities (example logic, adjust for real probabilities)
function calculateProbabilities(dice) {
    const size = dice.length;
    const probabilities = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (i === j) probabilities[i][j] = "-";
            else {
                const userWins = dice[i].values.filter(x => dice[j].values.filter(y => x > y).length).length;
                probabilities[i][j] = (userWins / dice[j].values.length).toFixed(4);
            }
        }
    }
    return probabilities;
}

// Render help table
function renderHelpTable(diceConfigs) {
    console.log("Probability of the user winning based on dice selection:");

    const probabilities = calculateProbabilities(diceConfigs);

    const headerRow = ["User Dice vs."].concat(diceConfigs.map(d => d.values.join(",")));
    const divider = "+".concat(headerRow.map(h => "-".repeat(h.length + 2)).join("+"), "+");

    console.log(divider);
    console.log("| " + headerRow.map(h => h.padEnd(16)).join(" | ") + " |");
    console.log(divider);

    diceConfigs.forEach((dice, i) => {
        const row = [dice.values.join(",")].concat(
            probabilities[i].map(p => (p === "-" ? p : (p * 100).toFixed(2) + "%"))
        );
        console.log("| " + row.map(cell => cell.padEnd(16)).join(" | ") + " |");
        console.log(divider);
    });

    console.log("\nLegend:");
    console.log("- '-' indicates the same dice, so no valid comparison can be made.");
    console.log("- Percentages represent the likelihood of the user winning against the computer.");
}

// Game logic
class NonTransitiveDiceGame {
    constructor(diceConfigs) {
        if (diceConfigs.length < 3) {
            throw new Error("At least three dice configurations are required.");
        }
        // Store the original dice configurations to reset them after each game
        this.originalDiceConfigs = diceConfigs;
        this.dice = diceConfigs.map(config => new Dice(config.split(',').map(Number)));
    }

    start() {
        console.log("\nWelcome to the Non-Transitive Dice Game!");

        // Display help table with probabilities
        renderHelpTable(this.dice);

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
        console.log("\nChoose your dice:");
        this.dice.forEach((d, i) => console.log(`${i} - ${d.values.join(',')}`));

        process.stdin.once('data', (data) => {
            const input = parseInt(data.toString().trim(), 10);
            if (isNaN(input) || input < 0 || input >= this.dice.length) {
                console.log("Invalid selection. Try again.");
                return this.userSelectDice();
            }

            this.userDice = this.dice[input];
            console.log(`You chose the dice: [${this.userDice.values.join(',')}]`);

            this.dice.splice(input, 1);
            this.computerDice = this.dice[crypto.randomInt(this.dice.length)];
            console.log(`I chose the dice: [${this.computerDice.values.join(',')}]`);

            this.performThrows();
        });
    }

    computerSelectDice() {
        const computerChoice = crypto.randomInt(this.dice.length);
        this.computerDice = this.dice[computerChoice];
        console.log(`I chose the dice: [${this.computerDice.values.join(',')}]`);

        this.dice.splice(computerChoice, 1);
        this.userSelectDice();
    }

    performThrows() {
        console.log("\nIt's time to roll the dice!");

        const userRoll = this.userDice.roll();
        const computerRoll = this.computerDice.roll();

        console.log(`\nYour roll is: ${userRoll}`);
        console.log(`My roll is: ${computerRoll}`);

        if (userRoll > computerRoll) {
            console.log("\nYou win!");
        } else if (userRoll < computerRoll) {
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
                // Re-initialize dice to the original configurations and restart the game
                this.dice = this.originalDiceConfigs.map(config => new Dice(config.split(',').map(Number)));
                this.start();  // Restart the game
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

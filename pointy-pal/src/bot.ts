import {Client, Message} from "discord.js";
import {Command} from "./structs/command";
import { CourseManager } from "./services/CourseManager";

export class Bot
{

    private client : Client = new Client();
    private courseManager! : CourseManager;

    public listen(): Promise<string>
    {
        
        this.client.on('ready', () => {
            console.log(`Logged in as ${"Somebody!"}!`);
            //for(let guild in this.client.guilds){
            //    console.log(`Connected to:`);
            //}
            this.courseManager = new CourseManager(this.client);
            return;
        });

        this.client.on('message', (msg : Message) => {
            console.log(`Message received: ${msg.content}`);

            let command: Command = this.parseInput(msg.content);
            if (!command.instruction)
            {
                console.log("Message was not a command.");
                return;
            }

            command.user = msg.author
            command.channel = msg.channel

            console.log(`Message was a command!`);
            console.log(`\tUser: ${command.user.tag}`);
            console.log(`\tChannel: ${command.channel.id}`)
            console.log(`\tInstruction: ${command.instruction}`);
            console.log(`\tArguments: ${command.arguments}`);

            let success : boolean = false;

            switch (command.instruction)
            {
                case "add-class":
                    success = this.courseManager.command(command);
                    break;

                case "remove-class":
                    success = this.courseManager.command(command);
                    break;

                default:
                    console.log(`Instruction ${command.instruction} was not recognized.`);
                    success = false;

            }

            if (success)
            {
                msg.channel.send(`${command.user.toString()}'s command recognized! Changes have been made.`)
            }
            else
            {
                msg.channel.send(`${command.user.toString()}'s message was recognized as a command, but no changes have been made.`)
            }

        })

        return this.client.login(process.env.TOKEN)
    }

    private parseInput(input : string) : Command {
        let result: Command = {} as any;

        let regexp : RegExp = new RegExp("^!pal\s*$");
        // Return an empty command if the result wasn't a command
        if (regexp.exec(input))
        {
            let tokens: string[] = input.split(' ');

            // Shift the !pal tag from the tokens
            tokens.shift();

            // If no other arguments were given, interpret it as a help request
            if (tokens.length == 0) {
                result.instruction = "help";
                return result;
            }
            // Set the instruction to the first token, then remove the token
            result.instruction = tokens[0];
            tokens.shift();
            // Set the arguments to the rest of the tokens
            result.arguments = tokens;
        }
        return result;
    }

}
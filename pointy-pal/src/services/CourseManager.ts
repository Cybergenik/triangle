import {PermissionOverwrites, Role, GuildChannel, CategoryChannel, User, Client, ChannelData, Guild, PermissionOverwriteOptions, TextChannel} from "discord.js"
import {Command} from "../structs/command";
import fs from 'fs';

export class CourseManager
{

    private departments : string[];
    private commandGuild! : Guild;
    private commandChannel! : GuildChannel;

    constructor(client : Client)
    {
        let text : string = fs.readFileSync("./resources/departments.txt", "utf8");
        this.departments = text.split('\n');
        console.log(`CourseManager: Departments Loaded (${this.departments.length} departments)`);
        let guildId : string = String(process.env.GUILD_ID);
        client.guilds.fetch(guildId).then((guild : Guild) => {

            this.commandGuild = guild;

            let channelId : string = String(process.env.COURSE_MANAGEMENT_ID);
            this.commandChannel = <GuildChannel>this.commandGuild.channels.cache.get(channelId);

            console.log("CourseManager Initialized!")
            console.log(`\tGuild: ${this.commandGuild.name}`)
            console.log(`\tCommand Channel: ${this.commandChannel.name}`)

        }).catch((error) => {

            throw new Error("CourseManager could not load guild!")

        })

    }

    public command(command : Command) : boolean
    {
        let changes : number = 0;

        if (command.channel.id == this.commandChannel.id) {
            switch (command.instruction) {

                case "add-class":
                    changes = this.addCourses(command.user, command.arguments)
                    break;

                case "remove-class":
                    changes = this.removeCourses(command.user, command.arguments)
                    break;
            }
            console.log(`Changes made: ${changes}`)
            return changes > 0;
        }
        console.log("Message was not in the correct channel.")
        return false;
    }

    private validateCourse(course: string) : boolean
    {
        // Use Regular Expression to split courses into alpha and numeric character groups
        // e.g. BUS1010 = ['BUS', '1010']
        let parts: string[] = course.match(/[a-z]+|[^a-z]+/gi) || [];
        
        console.log(`Course parts: ${parts}`);

        //if parts isn't length 2 & course number isn't 4 letters && departments contains course, return true
        return (parts.length == 2 && parts[1].length == 4 && this.departments.includes(parts[0].toUpperCase()));
    }

    private addCourse(user : User, course: string) : number
    {
        console.log(`Adding ${user.tag} to course ${course}`);

        let isValid : boolean = this.validateCourse(course);
        console.log(`\tValidity of ${course}: ${isValid}`)

        // If it's not valid, return zero changes
        if (!isValid)
        {
            return 0;
        }

        // Determine the names for the three necessary channels
        let textChatName = course.toLowerCase();
        let voiceChatName = course.toUpperCase();
        let departmentChatName = (<string[]>course.match(/[a-z]+|[^a-z]+/gi))[0].toLowerCase();
        let departmentCatName : string = departmentChatName.toUpperCase();

        // Attempt to find department CategoryChannel;
        let departmentCat: GuildChannel | undefined = this.commandGuild.channels.cache.find((channel : GuildChannel) => {
            return channel.name === departmentCatName;
        });

        if (departmentCat && departmentCat?.type != "category")
        {
            throw Error(`Deparment category ${departmentCat?.name} was not a valid CategoryChannel`)
        }
        
        if (!departmentCat)
        {

            console.log(`Department ${departmentCatName} did not exist - creating!`)

            this.commandGuild.channels.create(departmentCatName, {
                "type": "category"
            }).then((channel: GuildChannel) => {

                let everyoneRole : Role | undefined = this.commandGuild.roles.cache.get(this.commandGuild.id);
                let botRole      : Role | undefined = this.commandGuild.roles.cache.get(process.env.BOT_ROLE_ID!);
                let facultyRole  : Role | undefined = this.commandGuild.roles.cache.get(process.env.FACULTY_ROLE_ID!);

                channel.updateOverwrite(everyoneRole!, {VIEW_CHANNEL: false});
                channel.updateOverwrite(botRole!, {VIEW_CHANNEL: true});
                channel.updateOverwrite(facultyRole!, {MANAGE_MESSAGES: true});
                
                this.createCourseChannels(user, channel, textChatName, voiceChatName, departmentChatName);

            });
        }
        else
        {
            this.createCourseChannels(user, departmentCat, textChatName, voiceChatName, departmentChatName);
        }

        return 1;

    }

    private createCourseChannels(user : User, departmentCat: GuildChannel, textChatName: string, voiceChatName: string, departmentChatName: string)
    {


        let channels = [
            [departmentChatName,    "text",     <CategoryChannel>departmentCat],
            [textChatName,          "text",     <CategoryChannel>departmentCat],
            [voiceChatName,         "voice",    <CategoryChannel>departmentCat],
        ];

        for (let channelDetail of channels)
        {

            console.log(`\tAttempting to add user to ${channelDetail[0]}`)

            let name : string = channelDetail[0] as string;
            let type : "text" | "voice" = channelDetail[1] as "text" | "voice";
            let cat : CategoryChannel = channelDetail[2] as CategoryChannel;

            // CHECK IF CHANNEL EXISTS
            let channel : GuildChannel | undefined = cat.children.find((channel : GuildChannel) => {
                //console.log(`Comparing ${channel.name} to ${name}`);
                return channel.name === name;
            });

            if (!channel)
            {
                console.log(`\t${channelDetail[0]} did not exist! Creating...`);

                // this.createChannel(
                //     <string>channelDetail[0],
                //     <"text" | "voice">channelDetail[1], 
                //     <CategoryChannel>channelDetail[2]
                // ).then((channel : GuildChannel) => {
                //     this.addUserToChannelView(user, channel);
                // });

                this.commandGuild.channels.create(name, {
                    "type": type

                }).then((channel: GuildChannel) => {
                    
                    channel.setParent(cat).then(() => {

                        // TODO: Eventually add support for matching parent channel permissions.
                        // channel.lockPermissions().then(() => {

                            channel.updateOverwrite(user.id, {VIEW_CHANNEL: true});

                            if (channel.type == "text")
                            {
                                let textChannel : TextChannel = <TextChannel>channel;

                                textChannel.send(
                                    `Hey ${user.toString()}! It looks like you're the first one in ${textChannel.toString()}! Be sure to invite classmates to <http://discord.utahtriangle.org> - the more, the merrier, after all!`,
                                );

                                textChannel.send({
                                    files: ['https://raw.githubusercontent.com/Spelkington/triangle/master/pointy-pal/images/onNewClassChannel.png']
                                });

                            }

                        //});

                    });


                });

                // I would like to have a channel by now!

            }
            else
            {
                channel.updateOverwrite(user.id, {VIEW_CHANNEL: true});
            }


        }
    }

    private addCourses(user: User, courses: string[]) : number
    {

        let changes = 0

        // TODO: Properly sanitize multi input. Until then, only add the first course.
        // for (let course of courses) {
        //     changes += this.addCourse(user, course);
        // }


        if (courses.length < 1)
        {
            return changes;
        }

        changes += this.addCourse(user, courses[0])

        return changes;
    }

    private removeCourse(user : User, course: string) : number
    {
        console.log(`Adding ${user.tag} to course ${course}`);

        return 1;
    }

    private removeCourses(user : User, courses : string[]) : number
    {

        let changes = 0

        for (let course of courses) {
            changes += this.removeCourse(user, course);
        }

        return changes;
    }

}

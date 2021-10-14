import { Client, Intents } from "discord.js";

const bot_token = process.env.DISCORD_TOKEN;

let channelId;
const init = () => {
    const myIntents = new Intents();
    myIntents.add(32767);
    const client = new Client({ intents: myIntents });
    client.login(bot_token);
    // client.on("ready", (client) => {
    //     console.log(client.channels.cache.first);
    //     const ChannelWantSend = client.channels.cache.find(
    //         (channel) => channel.name === "general"
    //     );
    //     ChannelWantSend.send("hello");
    // });
    console.log("discord bot logged in.");
    const prefix = "!sh ";
    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.split(" ");
        if (args.length === 1) {
            message.reply("invalid command");
        }

        if (args[1] === "sub") {
            message.reply("subscribed");
            channelId = message.channelId;
        }

        if (args[1] === "unsub") {
            message.reply("unsubscribed");
            channelId = undefined;
        }
    });

    return client;
};

const sendMessage = (client, message) => {
    if (!channelId) {
        console.log("No channel id");
        return;
    }
    client.channels.cache.get(channelId).send(message);
};

export { sendMessage, init };

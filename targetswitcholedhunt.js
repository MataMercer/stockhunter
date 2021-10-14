import fetch from "node-fetch";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig.js";
import { sendMessage, init } from "./discordbot.js";

const callAPI = async (apiAddress) => {
    const res = await fetch(apiAddress);
    const jsonResponse = await res.json();
    return jsonResponse;
};

const getLocationsList = (jsonResponse) => {
    return jsonResponse.products[0].locations;
};

const simplifyLocation = (location) => {
    return {
        id: location.location_id,
        store_name: location.store_name,
        distance: location.distance,
        available_stock: location.location_available_to_promise_quantity,
        stockhistory: [],
    };
};

const getTimeStamp = () => {
    return {
        timeStampRaw: new Date(),
        timeStampReadable: new Date().toString(),
    };
};

const checkStock = async ({ apiAddress, productName }) => {
    db.push(`/${productName}/locations`, {}, false);
    const timeStamp = getTimeStamp();
    try {
        const jsonResponse = await callAPI(apiAddress);
        const locations = [...getLocationsList(jsonResponse)];
        const simplifiedLocations = locations.map((l) => simplifyLocation(l));
        let numUpdates = 0;
        simplifiedLocations.forEach((sl) => {
            const slPath = `/${productName}/locations/${sl.id}`;
            db.push(slPath, sl, false);
            if (
                db.getData(`${slPath}/stockhistory`).length === 0 ||
                db.getData(`${slPath}/stockhistory[-1]`).available_stock !==
                    sl.available_stock
            ) {
                db.push(
                    `${slPath}/stockhistory`,
                    [{ available_stock: sl.available_stock, timeStamp }],
                    false
                );
                numUpdates++;
            }
        });

        //handle stock is 0 and no longer on location list anymore.
        let existingLocations = db.getData(`/${productName}/locations`);
        let blacklist = {};
        simplifiedLocations.forEach((sl) => {
            if (existingLocations[sl.id]) {
                blacklist[sl.id] = true;
            }
        });
        for (let key in existingLocations) {
            if (key in blacklist) {
                continue;
            }
            if (existingLocations[key].available_stock === 0) {
                continue;
            }
            let el = existingLocations[key];
            el.available_stock = 0;
            const elPath = `/${productName}/locations/${el.id}`;
            db.push(`${elPath}`, el);
            db.push(
                `${elPath}/stockhistory`,
                [{ available_stock: 0, timeStamp }],
                false
            );
            numUpdates++;
        }

        if (numUpdates > 0) {
            let discordjson = {};
            for (let key in existingLocations) {
                discordjson[key] = {
                    store_name: existingLocations[key].store_name,
                    distance: existingLocations[key].distance,
                    stock: existingLocations[key].available_stock,
                };
            }
            const _msgs = JSON.stringify(discordjson, null, 2);
            sendMessage(client, "```json\n" + _msgs + "\n```");
        }
        db.push(`/${productName}/checks`, [{ timeStamp, numUpdates }], false);
    } catch (ex) {
        console.log(ex);
        db.push(`/errors`, [{ error: ex.toString(), timeStamp }], false);
    }
    db.save();
};

console.log("starting up...");
const db = new JsonDB(new Config("myDataBase", false, true, "/"));
const client = init();
const main = async () => {
    const testAddress =
        "https://api.target.com/fulfillment_aggregator/v1/fiats/77464002?key=ff457966e64d5e877fdbad070f276d18ecec4a01&nearby=92649&limit=5&requested_quantity=1&radius=25&include_only_available_stores=true";

    const whiteSwitchOledProduct = {
        productName: "whiteSwitchOled",
        apiAddress:
            "https://api.target.com/fulfillment_aggregator/v1/fiats/83887639?key=ff457966e64d5e877fdbad070f276d18ecec4a01&nearby=92649&limit=5&requested_quantity=1&radius=25&include_only_available_stores=true",
    };

    const redBlueSwitchOledProduct = {
        productName: "redBlueSwitchOled",
        apiAddress:
            "https://api.target.com/fulfillment_aggregator/v1/fiats/83887640?key=ff457966e64d5e877fdbad070f276d18ecec4a01&nearby=92649&limit=5&requested_quantity=1&radius=25&include_only_available_stores=true",
    };

    const normieSwitchProduct = {
        productName: "normieSwitch",
        apiAddress: testAddress,
    };

    checkStock(whiteSwitchOledProduct);
    checkStock(redBlueSwitchOledProduct);

    // checkStock(normieSwitchProduct);
};

setInterval(main, 60000);
// main();

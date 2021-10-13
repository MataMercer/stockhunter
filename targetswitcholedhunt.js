import fetch from "node-fetch";
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig.js';

const callAPI = async (apiAddress) => {
  const res = await fetch(apiAddress);
  const jsonResponse = await res.json();
  return jsonResponse;
}

const getLocationsList = (jsonResponse) => {
  return jsonResponse.products[0].locations;
}

const simplifyLocation = (location) => {
  return {
    id: location.location_id,
    store_name: location.store_name,
    distance: location.distance,
    available_stock: location.location_available_to_promise_quantity,
    stockhistory: []
  }
}

const main = async () => {
  const db = new JsonDB(new Config("myDataBase", false, true, '/'));

  const timeStamp = {
    timeStampRaw: new Date(), 
    timeStampReadable: new Date().toString()
  }

  try{

    const apiAddressWhite = 'https://api.target.com/fulfillment_aggregator/v1/fiats/83887639?key=ff457966e64d5e877fdbad070f276d18ecec4a01&nearby=92649&limit=5&requested_quantity=1&radius=50&include_only_available_stores=true';
    const apiAddressRedBlue = 'https://api.target.com/fulfillment_aggregator/v1/fiats/83887640?key=ff457966e64d5e877fdbad070f276d18ecec4a01&nearby=92649&limit=5&requested_quantity=1&radius=50&include_only_available_stores=true'
    const testAddress = 'https://api.target.com/fulfillment_aggregator/v1/fiats/77464002?key=ff457966e64d5e877fdbad070f276d18ecec4a01&nearby=92649&limit=5&requested_quantity=1&radius=50&include_only_available_stores=true';
    const jsonResponseWhite = await callAPI(apiAddressWhite);
    const jsonResponseRedBlue = await callAPI(apiAddressRedBlue);
    const locations = [...getLocationsList(jsonResponseWhite)];
    const isEmpty = locations.length === 0; 
    let numUpdates = 0;
    if(!isEmpty){
    locations.forEach(l => {
      const sl = simplifyLocation(l);
      db.push(`/${sl.id}`, sl, false);
      if(db.getData(`/${sl.id}/stockhistory`).length === 0){
        db.push(`/${sl.id}/stockhistory`, [{available_stock: sl.available_stock, timeStamp}], false);
        numUpdates++;
      }
      else if(db.getData(`/${sl.id}/stockhistory[-1]`).available_stock !== sl.available_stock){
        db.push(`/${sl.id}/stockhistory`, [{available_stock: sl.available_stock, timeStamp}], false);
        numUpdates++;
      }
    })
    db.push(`/checks`, [{timeStamp, numUpdates}], false);
    }else{
      console.log('All locations are empty.');
    }
  }catch(ex){
    console.log(ex);
    db.push(`/errors`, [{error: ex.toString(), timeStamp}],false)
  } 
    db.save();
}

setInterval(main, 60000);
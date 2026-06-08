import { Db, MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let client: MongoClient;
let dB: Db;
const dbName = "Final";
export const connectToMongoDB = async () => {
  try {

    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      throw new Error("MONGO_URL no está definida en el .env");
    }
    client = new MongoClient(mongoUrl);
    await client.connect();
    dB = client.db(dbName);
    console.log("Estás conectado a MongoDB en la base Final");
  
  } catch (err) {

    console.log("Error del mondongo baby: ", err);
  }
};

export const getDB = (): Db => dB;

export const closeMongoDB = async () => {
  try {
    if (client) {
      await client.close();
    }
  } catch (err) {
    console.log("Error cerrando el mondongo baby: ", err);
  }
};
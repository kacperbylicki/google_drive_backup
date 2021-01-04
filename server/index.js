import express from 'express';
import '@babel/polyfill';
import cron from 'node-cron';
import moment from 'moment';
import dotenv from 'dotenv';

import { 
    authAndUpload
} from './middleware/index.js';

dotenv.config();

const server = express();
const PORT = process.env.PORT;

// '30 01 * * 1' - every monday at 1:30AM
cron.schedule('30 01 * * 1', () => {
    const date = moment().format('YYYY-MM-DDTHH:mm:ss');
    console.log(`Processing Google Drive backup at: ${ date } \n`);

    authAndUpload();
});

server.listen(PORT, () => {
    console.log(`Backup server is running on port: ${ PORT } \n`)
});

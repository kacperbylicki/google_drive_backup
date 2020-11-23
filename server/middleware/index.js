import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config();

const CRED_PATH = process.env.CREDENTIALS_PATH;
const TOKEN_PATH = process.env.TOKEN_PATH;
const SCOPES = ['https://www.googleapis.com/auth/drive'];

//Log errors function
const outputError = ( message ) => {
    console.error( message );
}

//Get access oAuth2 token function
const getAccessToken = ( oAuth2Client, callback ) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
      
    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', ( code ) => {
      rl.close();

      oAuth2Client.getToken(code, ( error, token ) => {
        const setTokenFile = (callback) => {
            oAuth2Client.setCredentials(token);

            // token path may look like: ./server/secret/token.json
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (error) => {
                if (error) return outputError(error);
                console.log(`Token stored to: ${ TOKEN_PATH }`);
            });

            callback(oAuth2Client);
        };

        // return Error message or run function that writes token file and setting oAuth Client.
        return error ? outputError(`Error retriving token: ${ error }`) : setTokenFile(callback);
      });
    });
};

//Google Drive credentials authorization function
const authorize = ( credentials, callback ) => {
    const {
        web: { 
            client_secret, client_id, redirect_uris 
        } 
    } = credentials;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    fs.readFile(TOKEN_PATH, ( error, token ) => {
        const setAuthCredentials = ( callback ) => {
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        }

        return error ? getAccessToken(oAuth2Client, callback) : setAuthCredentials(callback);         
    });
};

//Google Drive backup uploading function
const uploadBackup = ( auth ) => {
    const date = moment().format('DD.MM.YYYY');

    const fileMetadata = {
        name: `CDNOptima_${ date }`
    }

    const media = {
        mimeType: 'application/x-7z-compressed',
        body: fs.createReadStream(`./backup/CDNOptima_${ date }.7z`)
    };

    const drive = google.drive({ version: 'v3', auth });

    drive.files.create(
        {
          resource: fileMetadata,
          media: media,
        },
        
        // Log error or inserted file ID.
        (error, file) => {
            error ? console.error(error) : console.log(file.data.id);
        }
    );
};

const filterFilesByDate = files => files.filter(
    file => moment(file.createdTime) < moment().subtract(3, 'months')
);

const deleteBackupOlderThanThreeMonths = ( auth ) => {
    const drive = google.drive({ version: 'v3', auth });

    drive.files.list(
        {
            pageSize: 10,
            fields: 'nextPageToken, files(id, createdTime)',
        }, 
        
        //Log error or delete file/files, by their ID stored in array. 
        (error , res) => {
            if ( error ) return outputError(`The API returned an error: ${ error }`);
            const files = filterFilesByDate(res.data.files);

            if (files.length) files.map(file => drive.files.delete({ fileId: file.id }));
        }
    );
};

//Authorizating and uploading function;
export const authAndUpload = () => {
    /* Credentials path may look like: ./server/secret/credentials.json, 
    Credentials are generated from GCP Google Drive API module at GCP site */

    fs.readFile(CRED_PATH, ( error, content ) => {
        if ( error ) return outputError(`Error loading secret: ${ error }`);

        authorize(JSON.parse(content), uploadBackup);
        authorize(JSON.parse(content), deleteBackupOlderThanThreeMonths);
    });
};

